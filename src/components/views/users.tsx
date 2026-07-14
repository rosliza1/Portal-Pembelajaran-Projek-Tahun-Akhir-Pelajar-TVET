'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth, api, type Role } from '@/lib/store'
import { ROLE_LABELS, initials, avatarColor, timeAgo } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Users as UsersIcon, UserPlus, Upload, Search, MoreHorizontal, Pencil, Power,
  ScrollText, Loader2, Mail, Building2, Filter, X, CheckCircle2, AlertCircle,
} from 'lucide-react'
import {
  GlassCard, GlassSection, StatCard, EmptyState, GradientButton,
} from '@/components/glass-ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'

interface UserRow {
  id: string
  email: string
  fullName: string
  role: Role
  phone?: string | null
  avatarUrl?: string | null
  institutionId?: string | null
  programId?: string | null
  session?: string | null
  isActive: boolean
  lastLoginAt?: string | null
  createdAt?: string | null
  institution?: { id: string; name: string; code: string } | null
  program?: { id: string; name: string; code: string; field: string } | null
}

interface Institution {
  id: string
  name: string
  code: string
  type: string
  state: string
}

const ROLE_OPTIONS: Role[] = ['STUDENT', 'SUPERVISOR', 'PANEL', 'INSTITUTION_ADMIN', 'JTM_ADMIN', 'DEVOPS']

// Roles that INSTITUTION_ADMIN cannot create/assign
const RESTRICTED_FOR_INST_ADMIN: Role[] = ['JTM_ADMIN', 'DEVOPS']

export function UsersView() {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [instFilter, setInstFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<UserRow | null>(null)
  const [saving, setSaving] = useState(false)

  const isAdmin = user && ['INSTITUTION_ADMIN', 'JTM_ADMIN', 'DEVOPS'].includes(user.role)
  const isJtm = user && ['JTM_ADMIN', 'DEVOPS'].includes(user.role)

  // Load institutions for JTM admin
  useEffect(() => {
    if (!user || !isJtm) return
    api<Institution[]>('/api/institutions').then((r) => {
      if (r.success && r.data) setInstitutions(r.data)
    })
  }, [user, isJtm])

  // Load users whenever role/institution filter changes
  useEffect(() => {
    if (!user) return
    const params = new URLSearchParams()
    if (roleFilter !== 'all') params.set('role', roleFilter)
    if (isJtm && instFilter !== 'all') params.set('institutionId', instFilter)
    api<UserRow[]>(`/api/users${params.size ? `?${params.toString()}` : ''}`).then((r) => {
      if (r.success && r.data) setUsers(r.data)
      else if (r.error) toast.error(r.error)
      setLoading(false)
    })
  }, [user, roleFilter, instFilter, isJtm])

  // Filtered list (client-side search by name/email)
  const filtered = useMemo(() => {
    if (!search.trim()) return users
    const q = search.toLowerCase()
    return users.filter((u) =>
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    )
  }, [users, search])

  // Stats
  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.isActive).length,
    students: users.filter((u) => u.role === 'STUDENT').length,
    supervisors: users.filter((u) => u.role === 'SUPERVISOR').length,
  }), [users])

  // Roles allowed to be assigned by current user
  const assignableRoles = useMemo<Role[]>(() => {
    if (!user) return []
    if (user.role === 'INSTITUTION_ADMIN') {
      return ROLE_OPTIONS.filter((r) => !RESTRICTED_FOR_INST_ADMIN.includes(r))
    }
    return ROLE_OPTIONS
  }, [user])

  async function reloadUsers() {
    const params = new URLSearchParams()
    if (roleFilter !== 'all') params.set('role', roleFilter)
    if (isJtm && instFilter !== 'all') params.set('institutionId', instFilter)
    const r = await api<UserRow[]>(`/api/users${params.size ? `?${params.toString()}` : ''}`)
    if (r.success && r.data) setUsers(r.data)
  }

  async function handleCreate(form: any) {
    setSaving(true)
    const r = await api('/api/users', { method: 'POST', body: JSON.stringify(form) })
    setSaving(false)
    if (r.success) {
      toast.success(`Pengguna ${form.fullName} dicipta. Kata laluan lalai: Portal@2026`)
      setCreateOpen(false)
      reloadUsers()
    } else {
      toast.error(r.error || 'Gagal mencipta pengguna')
    }
  }

  async function handleBulk(rows: any[]) {
    setSaving(true)
    const r = await api('/api/users', { method: 'POST', body: JSON.stringify({ users: rows }) })
    setSaving(false)
    if (r.success && r.data) {
      const { created, errors } = r.data
      if (created?.length) toast.success(`${created.length} pengguna berjaya dicipta.`)
      if (errors?.length) toast.error(`${errors.length} rekod gagal: ${errors[0]?.error || 'ralat'}`)
      setBulkOpen(false)
      reloadUsers()
    } else {
      toast.error(r.error || 'Import pukal gagal')
    }
  }

  async function handleEdit(form: any) {
    if (!editTarget) return
    setSaving(true)
    const r = await api(`/api/users/${editTarget.id}`, { method: 'PATCH', body: JSON.stringify(form) })
    setSaving(false)
    if (r.success) {
      toast.success('Pengguna dikemas kini')
      setEditTarget(null)
      reloadUsers()
    } else {
      toast.error(r.error || 'Gagal mengemas kini')
    }
  }

  async function toggleActive(u: UserRow) {
    const r = await api(`/api/users/${u.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !u.isActive }),
    })
    if (r.success) {
      toast.success(u.isActive ? 'Pengguna dinyahaktifkan' : 'Pengguna diaktifkan')
      reloadUsers()
    } else {
      toast.error(r.error || 'Gagal menukar status')
    }
  }

  if (!user || !isAdmin) {
    return (
      <GlassCard>
        <EmptyState
          icon={<UsersIcon className="h-6 w-6 text-slate-400" />}
          title="Akses Dinafikikan"
          description="Hanya pentadbir institusi, JTM, atau DevOps boleh mengurus pengguna."
        />
      </GlassCard>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Pengurusan Pengguna</h2>
          <p className="text-sm text-slate-400 mt-1">
            Urus akaun pengguna, peranan, dan institusi. Kata laluan lalai: <code className="text-teal-300">Portal@2026</code>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <GradientButton onClick={() => setBulkOpen(true)}>
            <Upload className="h-4 w-4" /> Import Pukal CSV
          </GradientButton>
          <GradientButton onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4" /> Tambah Pengguna
          </GradientButton>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Jumlah Pengguna" value={stats.total} icon={<UsersIcon className="h-5 w-5 text-white" />} gradient="from-indigo-500/40 to-purple-500/40" />
        <StatCard label="Pengguna Aktif" value={stats.active} icon={<CheckCircle2 className="h-5 w-5 text-white" />} gradient="from-emerald-500/40 to-teal-500/40" />
        <StatCard label="Pelajar" value={stats.students} icon={<UsersIcon className="h-5 w-5 text-white" />} gradient="from-sky-500/40 to-blue-500/40" />
        <StatCard label="Penyelia" value={stats.supervisors} icon={<UsersIcon className="h-5 w-5 text-white" />} gradient="from-amber-500/40 to-orange-500/40" />
      </div>

      {/* Filters + Table */}
      <GlassSection
        title="Senarai Pengguna"
        subtitle={`${filtered.length} rekod dipaparkan`}
        icon={<UsersIcon className="h-4 w-4 text-indigo-300" />}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cari nama / emel…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 w-56 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-44 bg-white/5 border-white/10 text-white">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                <SelectValue placeholder="Peranan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Peranan</SelectItem>
                {assignableRoles.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isJtm && (
              <Select value={instFilter} onValueChange={setInstFilter}>
                <SelectTrigger className="w-48 bg-white/5 border-white/10 text-white">
                  <Building2 className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                  <SelectValue placeholder="Institusi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Institusi</SelectItem>
                  {institutions.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        }
      >
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-300">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<UsersIcon className="h-5 w-5 text-slate-400" />}
            title="Tiada pengguna dijumpai"
            description="Cuba ubah penapis atau tambah pengguna baru."
          />
        ) : (
          <div className="max-h-[560px] overflow-y-auto custom-scroll -mx-2">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-slate-400 text-xs uppercase tracking-wide">Pengguna</TableHead>
                  <TableHead className="text-slate-400 text-xs uppercase tracking-wide">Peranan</TableHead>
                  <TableHead className="text-slate-400 text-xs uppercase tracking-wide">Institusi / Program</TableHead>
                  <TableHead className="text-slate-400 text-xs uppercase tracking-wide">Status</TableHead>
                  <TableHead className="text-slate-400 text-xs uppercase tracking-wide">Log Masuk Terakhir</TableHead>
                  <TableHead className="text-right text-slate-400 text-xs uppercase tracking-wide">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id} className="border-white/5">
                    <TableCell>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn('h-9 w-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-semibold flex-shrink-0', avatarColor(u.fullName))}>
                          {initials(u.fullName)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{u.fullName}</p>
                          <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {u.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={u.role} />
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <p className="text-slate-200 truncate max-w-[180px]">{u.institution?.name || '—'}</p>
                        <p className="text-slate-500 truncate max-w-[180px]">{u.program?.name || '—'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.isActive ? (
                        <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">Aktif</Badge>
                      ) : (
                        <Badge className="bg-rose-500/15 text-rose-300 border-rose-500/30">Tidak Aktif</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-400">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : 'Belum pernah'}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="glass p-1.5 rounded-md text-slate-300 hover:bg-white/10">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 glass-strong border-white/15">
                          <DropdownMenuLabel className="text-slate-300 text-xs">Tindakan</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setEditTarget(u)} className="text-slate-200 hover:bg-white/10 cursor-pointer">
                            <Pencil className="h-4 w-4 mr-2" /> Kemaskini
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleActive(u)} className="text-slate-200 hover:bg-white/10 cursor-pointer">
                            <Power className="h-4 w-4 mr-2" /> {u.isActive ? 'Nyahaktif' : 'Aktifkan'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem onClick={() => toast.info('Lihat jejak audit untuk pengguna ini')} className="text-slate-200 hover:bg-white/10 cursor-pointer">
                            <ScrollText className="h-4 w-4 mr-2" /> Lihat Jejak Audit
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </GlassSection>

      {/* Create Dialog */}
      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        saving={saving}
        institutions={institutions}
        assignableRoles={assignableRoles}
        defaultInstitutionId={user.institutionId || undefined}
        isJtm={!!isJtm}
      />

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        onSubmit={handleBulk}
        saving={saving}
        institutions={institutions}
        isJtm={!!isJtm}
        defaultInstitutionId={user.institutionId || undefined}
      />

      {/* Edit Dialog */}
      <EditUserDialog
        target={editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
        onSubmit={handleEdit}
        saving={saving}
        institutions={institutions}
        assignableRoles={assignableRoles}
        isJtm={!!isJtm}
      />
    </div>
  )
}

function RoleBadge({ role }: { role: Role }) {
  const cls: Record<Role, string> = {
    STUDENT: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    SUPERVISOR: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
    PANEL: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    INSTITUTION_ADMIN: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    JTM_ADMIN: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    DEVOPS: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  }
  return <Badge variant="outline" className={cn('text-[11px]', cls[role])}>{ROLE_LABELS[role]}</Badge>
}

// ============= CREATE DIALOG =============
function CreateUserDialog({
  open, onOpenChange, onSubmit, saving, institutions, assignableRoles, defaultInstitutionId, isJtm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSubmit: (form: any) => void
  saving: boolean
  institutions: Institution[]
  assignableRoles: Role[]
  defaultInstitutionId?: string
  isJtm: boolean
}) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    role: 'STUDENT' as Role,
    institutionId: defaultInstitutionId || '',
    programId: '',
    phone: '',
    session: '',
  })

  function submit() {
    if (!form.fullName.trim() || !form.email.trim()) {
      toast.error('Nama dan emel diperlukan')
      return
    }
    onSubmit({
      ...form,
      programId: form.programId || undefined,
      institutionId: form.institutionId || undefined,
      session: form.session || undefined,
      phone: form.phone || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/15 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">Tambah Pengguna Baharu</DialogTitle>
          <DialogDescription className="text-slate-400">
            Akaun akan dicipta dengan kata laluan lalai <code className="text-teal-300">Portal@2026</code>.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-slate-300 text-xs">Nama Penuh *</Label>
            <Input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              placeholder="cth. Ahmad bin Ali"
            />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-slate-300 text-xs">Emel *</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              placeholder="ahmad.ali@institusi.gov.my"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Peranan *</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
              <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assignableRoles.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Telefon</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              placeholder="012-3456789"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Institusi</Label>
            {isJtm ? (
              <Select value={form.institutionId} onValueChange={(v) => setForm({ ...form, institutionId: v })}>
                <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Pilih institusi" />
                </SelectTrigger>
                <SelectContent>
                  {institutions.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                disabled
                value={institutions.find((i) => i.id === defaultInstitutionId)?.name || 'Institusi anda'}
                className="bg-white/5 border-white/10 text-slate-400"
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Sesi / Kohort</Label>
            <Input
              value={form.session}
              onChange={(e) => setForm({ ...form, session: e.target.value })}
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              placeholder="2025/2026"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" className="text-slate-300 hover:bg-white/5">Batal</Button>
          </DialogClose>
          <GradientButton onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Cipta Pengguna
          </GradientButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============= BULK IMPORT DIALOG =============
function BulkImportDialog({
  open, onOpenChange, onSubmit, saving, institutions, isJtm, defaultInstitutionId,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSubmit: (rows: any[]) => void
  saving: boolean
  institutions: Institution[]
  isJtm: boolean
  defaultInstitutionId?: string
}) {
  const [mode, setMode] = useState<'csv' | 'form'>('form')
  const [csv, setCsv] = useState('')
  const [rows, setRows] = useState<any[]>(
    Array.from({ length: 3 }, () => ({ fullName: '', email: '', role: 'STUDENT' as Role, institutionCode: '' }))
  )

  const defaultInstCode = useMemo(
    () => institutions.find((i) => i.id === defaultInstitutionId)?.code || '',
    [institutions, defaultInstitutionId]
  )

  function parseCsv(): any[] {
    return csv
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [fullName, email, role, institutionCode] = line.split(',').map((s) => s?.trim())
        return {
          fullName,
          email,
          role: (role as Role) || 'STUDENT',
          institutionCode: institutionCode || defaultInstCode || undefined,
        }
      })
      .filter((r) => r.fullName && r.email)
  }

  function submit() {
    if (mode === 'csv') {
      const parsed = parseCsv()
      if (parsed.length === 0) {
        toast.error('CSV kosong atau tidak sah')
        return
      }
      onSubmit(parsed)
    } else {
      const valid = rows.filter((r) => r.fullName.trim() && r.email.trim())
      if (valid.length === 0) {
        toast.error('Isi sekurang-kurangnya satu baris yang lengkap')
        return
      }
      const mapped = valid.map((r) => ({
        fullName: r.fullName,
        email: r.email,
        role: r.role,
        institutionId: institutions.find((i) => i.code === (r.institutionCode || defaultInstCode))?.id || defaultInstitutionId,
      }))
      onSubmit(mapped)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/15 text-white sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">Import Pukal Pengguna</DialogTitle>
          <DialogDescription className="text-slate-400">
            Tambah berbilang pengguna sekaligus. Kata laluan lalai <code className="text-teal-300">Portal@2026</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setMode('form')}
            className={cn('px-3 py-1.5 rounded-md text-xs font-medium', mode === 'form' ? 'glass-button' : 'glass text-slate-300')}
          >
            Borang Berbilang Baris
          </button>
          <button
            onClick={() => setMode('csv')}
            className={cn('px-3 py-1.5 rounded-md text-xs font-medium', mode === 'csv' ? 'glass-button' : 'glass text-slate-300')}
          >
            Tampal CSV
          </button>
        </div>

        {mode === 'csv' ? (
          <div className="space-y-2">
            <Label className="text-slate-300 text-xs">
              Format: <code className="text-teal-300">fullName,email,role,institutionCode</code>
            </Label>
            <Textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={8}
              placeholder={'Ahmad bin Ali,ahmad@inst.gov.my,STUDENT,ILPMS\nSiti binti Omar,siti@inst.gov.my,SUPERVISOR,ILPMS'}
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 font-mono text-xs"
            />
          </div>
        ) : (
          <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scroll">
            {rows.map((r, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  <Label className="text-[10px] text-slate-400">Nama</Label>
                  <Input
                    value={r.fullName}
                    onChange={(e) => {
                      const next = [...rows]; next[idx] = { ...r, fullName: e.target.value }; setRows(next)
                    }}
                    className="bg-white/5 border-white/10 text-white text-xs h-8"
                    placeholder="Nama penuh"
                  />
                </div>
                <div className="col-span-4">
                  <Label className="text-[10px] text-slate-400">Emel</Label>
                  <Input
                    value={r.email}
                    onChange={(e) => {
                      const next = [...rows]; next[idx] = { ...r, email: e.target.value }; setRows(next)
                    }}
                    className="bg-white/5 border-white/10 text-white text-xs h-8"
                    placeholder="emel@inst.gov.my"
                  />
                </div>
                <div className="col-span-3">
                  <Label className="text-[10px] text-slate-400">Peranan</Label>
                  <Select
                    value={r.role}
                    onValueChange={(v) => {
                      const next = [...rows]; next[idx] = { ...r, role: v as Role }; setRows(next)
                    }}
                  >
                    <SelectTrigger className="w-full bg-white/5 border-white/10 text-white text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STUDENT">Pelajar</SelectItem>
                      <SelectItem value="SUPERVISOR">Penyelia</SelectItem>
                      <SelectItem value="PANEL">Panel</SelectItem>
                      {isJtm ? <SelectItem value="INSTITUTION_ADMIN">Pentadbir Institusi</SelectItem> : null}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1">
                  {rows.length > 1 && (
                    <button
                      onClick={() => setRows(rows.filter((_, i) => i !== idx))}
                      className="glass p-1.5 rounded-md text-rose-300 hover:bg-rose-500/10"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {isJtm && (
                  <div className="col-span-12">
                    <Input
                      value={r.institutionCode}
                      onChange={(e) => {
                        const next = [...rows]; next[idx] = { ...r, institutionCode: e.target.value }; setRows(next)
                      }}
                      className="bg-white/5 border-white/10 text-white text-xs h-8"
                      placeholder="Kod Institusi (cth. ILPMS) — kosongkan untuk guna lalai"
                    />
                  </div>
                )}
              </div>
            ))}
            {rows.length < 5 && (
              <button
                onClick={() => setRows([...rows, { fullName: '', email: '', role: 'STUDENT', institutionCode: '' }])}
                className="text-xs text-sky-300 hover:text-sky-200 mt-1"
              >
                + Tambah baris
              </button>
            )}
          </div>
        )}

        <div className="glass rounded-md p-2.5 flex items-start gap-2 text-xs text-slate-400">
          <AlertCircle className="h-4 w-4 text-amber-300 flex-shrink-0 mt-0.5" />
          <span>Setiap pengguna akan dihantar kata laluan lalai. Pastikan mereka menukar kata laluan selepas log masuk pertama.</span>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" className="text-slate-300 hover:bg-white/5">Batal</Button>
          </DialogClose>
          <GradientButton onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Import Pengguna
          </GradientButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============= EDIT DIALOG =============
function EditUserDialog({
  target, onOpenChange, onSubmit, saving, institutions, assignableRoles, isJtm,
}: {
  target: UserRow | null
  onOpenChange: (o: boolean) => void
  onSubmit: (form: any) => void
  saving: boolean
  institutions: Institution[]
  assignableRoles: Role[]
  isJtm: boolean
}) {
  const [lastTargetId, setLastTargetId] = useState<string | null>(null)
  const [form, setForm] = useState<any>({})

  if (target && lastTargetId !== target.id) {
    setLastTargetId(target.id)
    setForm({
      fullName: target.fullName,
      phone: target.phone || '',
      role: target.role,
      institutionId: target.institutionId || '',
      session: target.session || '',
      isActive: target.isActive,
    })
  }

  if (!target) return null

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/15 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Kemaskini Pengguna</DialogTitle>
          <DialogDescription className="text-slate-400">{target.email}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-slate-300 text-xs">Nama Penuh</Label>
            <Input
              value={form.fullName || ''}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Peranan</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assignableRoles.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Telefon</Label>
            <Input
              value={form.phone || ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-slate-300 text-xs">Institusi</Label>
            {isJtm ? (
              <Select value={form.institutionId} onValueChange={(v) => setForm({ ...form, institutionId: v })}>
                <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Pilih institusi" />
                </SelectTrigger>
                <SelectContent>
                  {institutions.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                disabled
                value={institutions.find((i) => i.id === target.institutionId)?.name || 'Institusi pengguna'}
                className="bg-white/5 border-white/10 text-slate-400"
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Sesi</Label>
            <Input
              value={form.session || ''}
              onChange={(e) => setForm({ ...form, session: e.target.value })}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Switch
              checked={!!form.isActive}
              onCheckedChange={(c) => setForm({ ...form, isActive: c })}
            />
            <Label className="text-slate-300 text-xs">Akaun Aktif</Label>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" className="text-slate-300 hover:bg-white/5">Batal</Button>
          </DialogClose>
          <GradientButton onClick={() => onSubmit(form)} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Simpan
          </GradientButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
