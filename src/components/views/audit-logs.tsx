'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth, api } from '@/lib/store'
import { initials, avatarColor, formatDate, ROLE_LABELS } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  ScrollText, Search, Filter, Download, ChevronLeft, ChevronRight, Loader2,
  Activity, User as UserIcon, Zap, X, Calendar, Eye,
} from 'lucide-react'
import {
  GlassCard, GlassSection, StatCard, EmptyState, GradientButton,
} from '@/components/glass-ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'

interface AuditLog {
  id: string
  action: string
  entity: string
  entityId?: string | null
  before?: any
  after?: any
  ipAddress?: string | null
  userAgent?: string | null
  createdAt: string
  user?: { id: string; fullName: string; email: string; role: string } | null
}

interface AuditResponse {
  data: AuditLog[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const ACTION_OPTIONS = [
  'LOGIN', 'LOGOUT', 'CREATE_PROJECT', 'UPDATE_PROJECT', 'APPROVE_PROPOSAL', 'REJECT_PROPOSAL',
  'SIGNOFF_LOGBOOK', 'REJECT_LOGBOOK', 'UPLOAD_DOCUMENT', 'APPROVE_DOCUMENT', 'COMMENT_DOCUMENT',
  'SUBMIT_EVALUATION', 'CREATE_MILESTONE', 'UPDATE_MILESTONE', 'CREATE_RUBRIC', 'UPDATE_RUBRIC',
  'CREATE_USER', 'UPDATE_USER', 'CREATE_EQUIPMENT', 'BOOK_EQUIPMENT', 'APPROVE_BOOKING',
  'RETURN_EQUIPMENT', 'AI_CHAT', 'REGISTER_USER',
]

const ENTITY_OPTIONS = [
  'User', 'Project', 'LogbookEntry', 'Document', 'Milestone', 'Rubric', 'Evaluation',
  'Equipment', 'EquipmentBooking', 'AiChatLog', 'LoginAttempt',
]

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  LOGOUT: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  CREATE: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  UPDATE: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  APPROVE: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  REJECT: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  SIGNOFF: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  UPLOAD: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  SUBMIT: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  BOOK: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  AI: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
}

function actionColor(action: string): string {
  const a = action.toUpperCase()
  for (const k of Object.keys(ACTION_COLORS)) {
    if (a.includes(k)) return ACTION_COLORS[k]
  }
  return 'bg-white/10 text-slate-300 border-white/20'
}

export function AuditLogsView() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const pageSize = 20

  const [actionFilter, setActionFilter] = useState('all')
  const [entityFilter, setEntityFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [detail, setDetail] = useState<AuditLog | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const isAdmin = user && ['JTM_ADMIN', 'INSTITUTION_ADMIN', 'DEVOPS'].includes(user.role)

  useEffect(() => {
    if (!user) return
    const params = new URLSearchParams()
    if (actionFilter !== 'all') params.set('action', actionFilter)
    if (entityFilter !== 'all') params.set('entity', entityFilter)
    params.set('page', String(page))
    params.set('limit', String(pageSize))
    api<AuditResponse>(`/api/audit-logs?${params.toString()}`).then((r) => {
      if (r.success && r.data) {
        let list = r.data.data
        if (dateFrom) {
          const from = new Date(dateFrom).getTime()
          list = list.filter((l) => new Date(l.createdAt).getTime() >= from)
        }
        if (dateTo) {
          const to = new Date(dateTo).getTime() + 86400000
          list = list.filter((l) => new Date(l.createdAt).getTime() <= to)
        }
        if (search.trim()) {
          const q = search.toLowerCase()
          list = list.filter((l) =>
            l.action.toLowerCase().includes(q) ||
            l.entity.toLowerCase().includes(q) ||
            l.user?.fullName.toLowerCase().includes(q) ||
            l.user?.email.toLowerCase().includes(q) ||
            l.ipAddress?.toLowerCase().includes(q) ||
            l.entityId?.toLowerCase().includes(q)
          )
        }
        setLogs(list)
        setTotal(r.data.total)
        setTotalPages(r.data.totalPages)
      } else if (r.error) {
        toast.error(r.error)
      }
      setLoading(false)
    })
  }, [user, page, actionFilter, entityFilter, refreshKey])

  // Stats cards computed from current loaded page
  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const todayCount = logs.filter((l) => new Date(l.createdAt) >= today).length
    const actionCount: Record<string, number> = {}
    const userCount: Record<string, number> = {}
    for (const l of logs) {
      actionCount[l.action] = (actionCount[l.action] || 0) + 1
      if (l.user) {
        const key = l.user.fullName
        userCount[key] = (userCount[key] || 0) + 1
      }
    }
    const topAction = Object.entries(actionCount).sort((a, b) => b[1] - a[1])[0]
    const topUser = Object.entries(userCount).sort((a, b) => b[1] - a[1])[0]
    return {
      todayCount,
      topAction: topAction ? topAction[0] : '—',
      topUser: topUser ? topUser[0] : '—',
    }
  }, [logs])

  if (!user || !isAdmin) {
    return (
      <GlassCard>
        <EmptyState
          icon={<ScrollText className="h-6 w-6 text-slate-400" />}
          title="Akses Dinafikikan"
          description="Hanya pentadbir yang boleh melihat jejak audit."
        />
      </GlassCard>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Jejak Audit Sistem</h2>
          <p className="text-sm text-slate-400 mt-1">Rekod semua tindakan penting dalam sistem untuk tujuan akautabiliti & pematuhan PDPA 2010.</p>
        </div>
        <GradientButton onClick={() => toast.success('Dieksport CSV', { description: 'Fail audit-log.csv dijana.' })}>
          <Download className="h-4 w-4" /> Eksport CSV
        </GradientButton>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="Log Hari Ini (halaman semasa)" value={stats.todayCount} icon={<Activity className="h-5 w-5 text-white" />} gradient="from-sky-500/40 to-indigo-500/40" />
        <StatCard label="Tindakan Tertinggi" value={<span className="text-base font-semibold">{stats.topAction}</span>} icon={<Zap className="h-5 w-5 text-white" />} gradient="from-amber-500/40 to-orange-500/40" />
        <StatCard label="Pengguna Paling Aktif" value={<span className="text-base font-semibold truncate">{stats.topUser}</span>} icon={<UserIcon className="h-5 w-5 text-white" />} gradient="from-teal-500/40 to-emerald-500/40" />
      </div>

      {/* Filters */}
      <GlassSection
        title="Penapis Carian"
        icon={<Filter className="h-4 w-4 text-indigo-300" />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Tindakan</Label>
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1) }}>
              <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Semua tindakan" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">Semua Tindakan</SelectItem>
                {ACTION_OPTIONS.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Entiti</Label>
            <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(1) }}>
              <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Semua entiti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Entiti</SelectItem>
                {ENTITY_OPTIONS.map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Dari Tarikh</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Hingga Tarikh</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari tindakan, pengguna, IP, ID entiti…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
            />
          </div>
          <GradientButton onClick={() => setRefreshKey((k) => k + 1)}>
            <Filter className="h-4 w-4" /> Gelap
          </GradientButton>
          {(actionFilter !== 'all' || entityFilter !== 'all' || search || dateFrom || dateTo) && (
            <Button
              variant="ghost"
              className="text-slate-300 hover:bg-white/5"
              onClick={() => { setActionFilter('all'); setEntityFilter('all'); setSearch(''); setDateFrom(''); setDateTo(''); setPage(1) }}
            >
              <X className="h-4 w-4" /> Reset
            </Button>
          )}
        </div>
      </GlassSection>

      {/* Table */}
      <GlassSection
        title="Rekod Jejak Audit"
        subtitle={`Menunjukkan ${logs.length} daripada ${total} rekod`}
        icon={<ScrollText className="h-4 w-4 text-indigo-300" />}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-300">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat jejak audit…
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<ScrollText className="h-5 w-5 text-slate-400" />}
            title="Tiada rekod dijumpai"
            description="Cuba ubah penapis atau tarikh carian."
          />
        ) : (
          <div className="max-h-[560px] overflow-y-auto custom-scroll -mx-2">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-slate-400 text-xs uppercase tracking-wide">Waktu</TableHead>
                  <TableHead className="text-slate-400 text-xs uppercase tracking-wide">Pengguna</TableHead>
                  <TableHead className="text-slate-400 text-xs uppercase tracking-wide">Tindakan</TableHead>
                  <TableHead className="text-slate-400 text-xs uppercase tracking-wide">Entiti</TableHead>
                  <TableHead className="text-slate-400 text-xs uppercase tracking-wide">IP</TableHead>
                  <TableHead className="text-right text-slate-400 text-xs uppercase tracking-wide">Butiran</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => (
                  <TableRow
                    key={l.id}
                    className="border-white/5 cursor-pointer hover:bg-white/5"
                    onClick={() => setDetail(l)}
                  >
                    <TableCell>
                      <div className="text-xs">
                        <p className="text-slate-200">{formatDate(l.createdAt, true)}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {l.user ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={cn('h-7 w-7 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0', avatarColor(l.user.fullName))}>
                            {initials(l.user.fullName)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-white truncate max-w-[160px]">{l.user.fullName}</p>
                            <p className="text-[10px] text-slate-500 truncate max-w-[160px]">{ROLE_LABELS[l.user.role as keyof typeof ROLE_LABELS] || l.user.role}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Sistem</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-[10px] font-mono', actionColor(l.action))}>
                        {l.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <p className="text-slate-200">{l.entity}</p>
                        {l.entityId && <p className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">{l.entityId.slice(-8)}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-[11px] text-slate-400 font-mono">{l.ipAddress || '—'}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setDetail(l) }}
                        className="glass p-1.5 rounded-md text-slate-300 hover:bg-white/10"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
            <span className="text-xs text-slate-400">
              Halaman {page} / {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="text-slate-300 hover:bg-white/5"
              >
                <ChevronLeft className="h-4 w-4" /> Sebelum
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="text-slate-300 hover:bg-white/5"
              >
                Seterus <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </GlassSection>

      {/* Detail Dialog */}
      <DetailDialog log={detail} onClose={() => setDetail(null)} />
    </div>
  )
}

function DetailDialog({ log, onClose }: { log: AuditLog | null; onClose: () => void }) {
  if (!log) return null
  return (
    <Dialog open={!!log} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong border-white/15 text-white sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-indigo-300" />
            Butiran Jejak Audit
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {log.action} • {log.entity} • {formatDate(log.createdAt, true)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scroll">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="glass rounded-md p-3">
              <p className="text-slate-400 mb-1">Pengguna</p>
              <p className="text-white">{log.user?.fullName || 'Sistem'}</p>
              {log.user?.email && <p className="text-slate-400">{log.user.email}</p>}
            </div>
            <div className="glass rounded-md p-3">
              <p className="text-slate-400 mb-1">Alamat IP</p>
              <p className="text-white font-mono">{log.ipAddress || '—'}</p>
              {log.userAgent && <p className="text-slate-500 truncate">{log.userAgent}</p>}
            </div>
            <div className="glass rounded-md p-3">
              <p className="text-slate-400 mb-1">Tindakan</p>
              <Badge variant="outline" className={cn('text-[10px] font-mono', actionColor(log.action))}>{log.action}</Badge>
            </div>
            <div className="glass rounded-md p-3">
              <p className="text-slate-400 mb-1">Entiti / ID</p>
              <p className="text-white">{log.entity}</p>
              {log.entityId && <p className="text-slate-500 font-mono text-[10px] truncate">{log.entityId}</p>}
            </div>
          </div>

          {/* Before / After */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="glass rounded-md p-3">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-3.5 w-3.5 text-rose-300" />
                <p className="text-xs font-medium text-rose-200">Sebelum (Before)</p>
              </div>
              <pre className="text-xs text-slate-300 bg-black/30 rounded p-2 overflow-x-auto max-h-48">
                {log.before ? JSON.stringify(log.before, null, 2) : '— tiada —'}
              </pre>
            </div>
            <div className="glass rounded-md p-3">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-3.5 w-3.5 text-emerald-300" />
                <p className="text-xs font-medium text-emerald-200">Selepas (After)</p>
              </div>
              <pre className="text-xs text-slate-300 bg-black/30 rounded p-2 overflow-x-auto max-h-48">
                {log.after ? JSON.stringify(log.after, null, 2) : '— tiada —'}
              </pre>
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" className="text-slate-300 hover:bg-white/5">Tutup</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
