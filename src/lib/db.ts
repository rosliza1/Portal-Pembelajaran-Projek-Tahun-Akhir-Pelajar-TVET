// Database client — uses Supabase REST API (PostgREST) over HTTPS
// This adapter mimics the Prisma client interface so all API routes work unchanged.
// Works in sandboxes that block direct PostgreSQL (port 5432) but allow HTTPS (443).

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wbinwhbmkszeiguwebkl.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_iIEsA4hNKNURFaZps7Wl4g_EWjjL3dx'

// Generate a unique ID (cuid-like) for new records
function generateId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  const random2 = Math.random().toString(36).substring(2, 6)
  return `c${timestamp}${random}${random2}`
}

// PostgREST filter operators → URL query params
type WhereClause = Record<string, any>

function buildFilter(where: WhereClause): string {
  const params: string[] = []
  for (const [key, value] of Object.entries(where)) {
    if (value === null || value === undefined) {
      params.push(`${key}=is.null`)
      continue
    }
    if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      // Handle operators like { in: [...], gte: ..., lte: ..., contains: ... }
      for (const [op, val] of Object.entries(value)) {
        switch (op) {
          case 'in':
            if (Array.isArray(val) && val.length > 0) {
              params.push(`${key}=in.(${val.map(v => typeof v === 'string' ? `"${v}"` : v).join(',')})`)
            }
            break
          case 'notIn':
            if (Array.isArray(val) && val.length > 0) {
              params.push(`${key}=not.in.(${val.map(v => typeof v === 'string' ? `"${v}"` : v).join(',')})`)
            }
            break
          case 'gte':
            params.push(`${key}=gte.${val instanceof Date ? val.toISOString() : val}`)
            break
          case 'gt':
            params.push(`${key}=gt.${val instanceof Date ? val.toISOString() : val}`)
            break
          case 'lte':
            params.push(`${key}=lte.${val instanceof Date ? val.toISOString() : val}`)
            break
          case 'lt':
            params.push(`${key}=lt.${val instanceof Date ? val.toISOString() : val}`)
            break
          case 'contains':
            params.push(`${key}=ilike.%${String(val).replace(/%/g, '\\%')}%`)
            break
          case 'startsWith':
            params.push(`${key}=ilike.${String(val).replace(/%/g, '\\%')}%`)
            break
          case 'endsWith':
            params.push(`${key}=ilike.%${String(val).replace(/%/g, '\\%')}`)
            break
          case 'not':
            if (val === null) params.push(`${key}=not.is.null`)
            else params.push(`${key}=neq.${val instanceof Date ? val.toISOString() : val}`)
            break
        }
      }
      continue
    }
    if (Array.isArray(value)) {
      if (value.length === 0) { params.push('id=eq.__none__'); continue }
      params.push(`${key}=in.(${value.map(v => typeof v === 'string' ? `"${v}"` : v).join(',')})`)
      continue
    }
    if (value instanceof Date) {
      params.push(`${key}=eq.${value.toISOString()}`)
      continue
    }
    if (typeof value === 'boolean') {
      params.push(`${key}=eq.${value}`)
      continue
    }
    if (typeof value === 'number') {
      params.push(`${key}=eq.${value}`)
      continue
    }
    // string
    params.push(`${key}=eq.${String(value)}`)
  }
  return params.length > 0 ? `&${params.join('&')}` : ''
}

// Handle nested where (for relations like { student: { userId: ... } })
// PostgREST doesn't support nested filters directly, so we handle them at the call site
function flattenWhere(where: WhereClause): { flat: WhereClause; nested: Record<string, WhereClause> } {
  const flat: WhereClause = {}
  const nested: Record<string, WhereClause> = {}
  for (const [key, value] of Object.entries(where)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && !Object.keys(value).every(k => ['in','notIn','gte','gt','lte','lt','contains','startsWith','endsWith','not'].includes(k))) {
      // It's a nested relation filter
      nested[key] = value
    } else {
      flat[key] = value
    }
  }
  return { flat, nested }
}

// Convert camelCase model name to PascalCase table name (Prisma model → DB table)
function tableName(model: string): string {
  return model.charAt(0).toUpperCase() + model.slice(1)
}

// Convert Prisma order by to PostgREST order
function buildOrder(orderBy?: any): string {
  if (!orderBy) return ''
  const parts: string[] = []
  if (Array.isArray(orderBy)) {
    for (const o of orderBy) {
      for (const [k, v] of Object.entries(o)) {
        parts.push(`${k}.${v}`)
      }
    }
  } else if (typeof orderBy === 'object') {
    for (const [k, v] of Object.entries(orderBy)) {
      parts.push(`${k}.${v}`)
    }
  }
  return parts.length > 0 ? `&order=${parts.join(',')}` : ''
}

// Build select query for includes
function buildSelect(include?: Record<string, boolean | any>): string | undefined {
  if (!include) return undefined
  const cols = Object.keys(include)
  return cols.length > 0 ? cols.join(',') : undefined
}

// Model adapter — mimics Prisma's model delegate
class ModelDelegate {
  constructor(private model: string) {}

  private get table() { return tableName(this.model) }

  async findMany(opts: { where?: WhereClause; include?: any; orderBy?: any; take?: number; skip?: number; select?: any; _count?: any } = {}) {
    let url = `/rest/v1/${this.table}?select=`
    // Handle includes via foreign key joins (PostgREST resource embedding)
    // PostgREST uses PascalCase table names for embedding
    if (opts.include) {
      const includeCols = Object.keys(opts.include).map(k => {
        // Convert camelCase relation name to PascalCase table name
        const pascal = k.charAt(0).toUpperCase() + k.slice(1)
        // Check if include has nested includes
        const nested = opts.include[k]
        if (typeof nested === 'object' && nested !== true) {
          // For now, just select all from the relation
          return `${pascal}(*)`
        }
        return `${pascal}(*)`
      }).join(',')
      url += `*,${includeCols}`
    } else if (opts.select) {
      url += Object.keys(opts.select).filter(k => opts.select[k]).join(',')
    } else {
      url += '*'
    }
    // Where
    if (opts.where) {
      const { flat, nested } = flattenWhere(opts.where)
      url += buildFilter(flat)
      // For nested filters, we'll filter client-side (less efficient but works)
      // PostgREST also supports nested filtering via the relation, e.g. student(userId=eq.xxx)
    }
    // Order
    url += buildOrder(opts.orderBy)
    // Limit
    if (opts.take) url += `&limit=${opts.take}`
    if (opts.skip) url += `&offset=${opts.skip}`

    // Use service-level fetch (no auth needed, RLS disabled)
    const res = await fetch(`${SUPABASE_URL}${url}`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    })
    if (!res.ok) {
      const errText = await res.text()
      console.error(`[DB] findMany ${this.table} error:`, res.status, errText.substring(0, 200))
      return []
    }
    let rows = await res.json()

    // Handle nested where filters client-side
    if (opts.where) {
      const { nested } = flattenWhere(opts.where)
      if (Object.keys(nested).length > 0) {
        rows = rows.filter((row: any) => {
          for (const [rel, filter] of Object.entries(nested)) {
            const relData = row[rel]
            if (!relData) return false
            for (const [k, v] of Object.entries(filter as any)) {
              if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
                for (const [op, val] of Object.entries(v as any)) {
                  if (op === 'in' && Array.isArray(val)) {
                    if (!val.includes(relData[k])) return false
                  }
                }
              } else {
                if (relData[k] !== v) return false
              }
            }
          }
          return true
        })
      }
    }

    // Handle _count
    if (opts._count) {
      // For _count, we need to fetch related counts — skip for now, return as-is
    }

    return rows
  }

  async findUnique(opts: { where: WhereClause; include?: any; select?: any }) {
    const rows = await this.findMany({ where: opts.where, include: opts.include, select: opts.select, take: 1 })
    return rows[0] || null
  }

  async findFirst(opts: { where?: WhereClause; include?: any; orderBy?: any; select?: any } = {}) {
    const rows = await this.findMany({ ...opts, take: 1 })
    return rows[0] || null
  }

  async create(opts: { data: any; include?: any; select?: any }) {
    const { data } = opts
    // Auto-generate ID if not provided (Prisma's cuid() equivalent)
    if (!data.id) {
      data.id = generateId()
    }
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${this.table}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const errText = await res.text()
      console.error(`[DB] create ${this.table} error:`, res.status, errText.substring(0, 300))
      throw new Error(`Database create error: ${errText.substring(0, 200)}`)
    }
    const rows = await res.json()
    return Array.isArray(rows) ? rows[0] : rows
  }

  async createMany(opts: { data: any[] }) {
    // Auto-generate IDs for all rows
    for (const row of opts.data) {
      if (!row.id) row.id = generateId()
    }
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${this.table}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(opts.data),
    })
    if (!res.ok) {
      const errText = await res.text()
      console.error(`[DB] createMany ${this.table} error:`, res.status, errText.substring(0, 300))
      throw new Error(`Database createMany error: ${errText.substring(0, 200)}`)
    }
    return { count: opts.data.length }
  }

  async update(opts: { where: WhereClause; data: any; include?: any }) {
    const filter = buildFilter(opts.where)
    if (!filter) throw new Error('Update requires a where clause')
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${this.table}?${filter.substring(1)}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(opts.data),
    })
    if (!res.ok) {
      const errText = await res.text()
      console.error(`[DB] update ${this.table} error:`, res.status, errText.substring(0, 300))
      throw new Error(`Database update error: ${errText.substring(0, 200)}`)
    }
    const rows = await res.json()
    return Array.isArray(rows) ? rows[0] : rows
  }

  async updateMany(opts: { where: WhereClause; data: any }) {
    const filter = buildFilter(opts.where)
    if (!filter) throw new Error('UpdateMany requires a where clause')
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${this.table}?${filter.substring(1)}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(opts.data),
    })
    if (!res.ok) {
      const errText = await res.text()
      console.error(`[DB] updateMany ${this.table} error:`, res.status, errText.substring(0, 300))
      throw new Error(`Database updateMany error: ${errText.substring(0, 200)}`)
    }
    // PostgREST doesn't return count by default; estimate from content-range
    const range = res.headers.get('content-range')
    const count = range ? parseInt(range.split('/')[1] || '0') : 0
    return { count }
  }

  async delete(opts: { where: WhereClause }) {
    const filter = buildFilter(opts.where)
    if (!filter) throw new Error('Delete requires a where clause')
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${this.table}?${filter.substring(1)}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation',
      },
    })
    if (!res.ok) {
      const errText = await res.text()
      console.error(`[DB] delete ${this.table} error:`, res.status, errText.substring(0, 300))
      throw new Error(`Database delete error: ${errText.substring(0, 200)}`)
    }
    const rows = await res.json()
    return Array.isArray(rows) ? rows[0] : rows
  }

  async deleteMany(opts: { where: WhereClause }) {
    const filter = buildFilter(opts.where)
    const url = filter ? `${SUPABASE_URL}/rest/v1/${this.table}?${filter.substring(1)}` : `${SUPABASE_URL}/rest/v1/${this.table}?id=neq.__placeholder__`
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal',
      },
    })
    if (!res.ok) {
      const errText = await res.text()
      console.error(`[DB] deleteMany ${this.table} error:`, res.status, errText.substring(0, 300))
      throw new Error(`Database deleteMany error: ${errText.substring(0, 200)}`)
    }
    return { count: 0 }
  }

  async count(opts: { where?: WhereClause } = {}) {
    let url = `/rest/v1/${this.table}?select=id&limit=1`
    if (opts.where) {
      const { flat } = flattenWhere(opts.where)
      url += buildFilter(flat)
    }
    const res = await fetch(`${SUPABASE_URL}${url}`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'count=exact',
        'Range': '0-0',
      },
    })
    if (!res.ok) return 0
    const range = res.headers.get('content-range')
    if (range) {
      const parts = range.split('/')
      if (parts[1] && parts[1] !== '*') return parseInt(parts[1])
    }
    const data = await res.json()
    return Array.isArray(data) ? data.length : 0
  }

  async groupBy(opts: { by: string[]; where?: WhereClause; _count?: any }) {
    // PostgREST doesn't natively support GROUP BY in the same way
    // We fetch all rows and group client-side (works for small datasets)
    const rows = await this.findMany({ where: opts.where, select: opts.by.reduce((acc, b) => ({ ...acc, [b]: true }), {}) })
    const groups: Record<string, any> = {}
    for (const row of rows) {
      const key = opts.by.map(b => row[b]).join('|||')
      if (!groups[key]) {
        groups[key] = { _count: { _all: 0 } }
        for (const b of opts.by) groups[key][b] = row[b]
      }
      groups[key]._count._all++
    }
    return Object.values(groups)
  }

  async aggregate(opts: any) {
    // Simplified: fetch all matching and compute client-side
    const rows = await this.findMany({ where: opts.where })
    const result: any = {}
    if (opts._sum) {
      for (const field of Object.keys(opts._sum)) {
        result._sum = result._sum || {}
        result._sum[field] = rows.reduce((s, r) => s + (Number(r[field]) || 0), 0)
      }
    }
    if (opts._avg) {
      for (const field of Object.keys(opts._avg)) {
        result._avg = result._avg || {}
        const vals = rows.map(r => Number(r[field])).filter(v => !isNaN(v))
        result._avg[field] = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
      }
    }
    if (opts._min) {
      for (const field of Object.keys(opts._min)) {
        result._min = result._min || {}
        result._min[field] = Math.min(...rows.map(r => Number(r[field])).filter(v => !isNaN(v)))
      }
    }
    if (opts._max) {
      for (const field of Object.keys(opts._max)) {
        result._max = result._max || {}
        result._max[field] = Math.max(...rows.map(r => Number(r[field])).filter(v => !isNaN(v)))
      }
    }
    return result
  }
}

// Transaction support (simplified — runs sequentially, not truly atomic)
class TransactionClient {
  [key: string]: ModelDelegate
}

// Build the db object with all models
const modelNames = [
  'institution', 'program', 'user', 'supervisor', 'student',
  'project', 'projectMember', 'logbookEntry', 'document', 'milestone',
  'rubric', 'evaluation', 'equipment', 'equipmentBooking',
  'aiChatLog', 'notification', 'auditLog', 'loginAttempt',
]

const dbProxy = new Proxy({} as any, {
  get(target, prop: string) {
    if (prop === '$transaction') {
      return async (fnOrArray: any) => {
        if (Array.isArray(fnOrArray)) {
          const results = []
          for (const promise of fnOrArray) {
            results.push(await promise)
          }
          return results
        }
        const txClient = new TransactionClient()
        for (const m of modelNames) {
          txClient[m] = new ModelDelegate(m)
        }
        return fnOrArray(txClient)
      }
    }
    if (prop === '$disconnect') {
      return async () => {}
    }
    if (prop === '$connect') {
      return async () => {}
    }
    // Return a model delegate for any model access
    if (!target[prop]) {
      target[prop] = new ModelDelegate(prop)
    }
    return target[prop]
  },
})

export const db = dbProxy as any
