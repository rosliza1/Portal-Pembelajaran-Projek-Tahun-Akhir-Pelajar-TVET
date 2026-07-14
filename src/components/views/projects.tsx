'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAuth, api } from '@/lib/store'
import { GlassCard, GlassSection, StatusBadge, FieldBadge, EmptyState, GradientButton, ProgressRing } from '@/components/glass-ui'
import { STATUS_LABELS, formatDate } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { toast } from 'sonner'
import {
  Loader2, FolderKanban, Plus, Search, FileText, BookOpen, ClipboardCheck,
  AlertTriangle, CheckCircle2, XCircle, Send, ArrowRight, Target, ListChecks,
} from 'lucide-react'

interface Project {
  id: string
  title: string
  field: string
  status: string
  scope: string
  objectives: string
  rejectionReason?: string | null
  similarityScore?: number
  student?: { user: { fullName: string; email: string } }
  supervisor?: { user: { fullName: string; email: string } }
  institution?: { name: string; code: string }
  program?: { name: string; code: string }
  bomList?: string | null
  createdAt: string
  updatedAt: string
  _count?: { documents: number; logbookEntries: number; evaluations: number; milestones: number }
}

export function ProjectsView() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [fieldFilter, setFieldFilter] = useState<string>('ALL')
  const [selected, setSelected] = useState<Project | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [actioning, setActioning] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const r = await api<Project[]>('/api/projects?limit=100')
    if (r.success && r.data) setProjects(r.data)
    setLoading(false)
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [])

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false
      if (fieldFilter !== 'ALL' && p.field !== fieldFilter) return false
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [projects, search, statusFilter, fieldFilter])

  function openDetail(p: Project) {
    setSelected(p)
    setDetailOpen(true)
  }

  async function doAction(p: Project, action: 'submit' | 'approve' | 'reject' | 'complete') {
    let body: any = { action }
    if (action === 'reject') {
      const reason = window.prompt('Sebab penolakan:')
      if (!reason) return
      body.reason = reason
    }
    setActioning(p.id)
    const r = await api(`/api/projects/${p.id}`, { method: 'PATCH', body: JSON.stringify(body) })
    setActioning(null)
    if (r.success) {
      toast.success(r.message || 'Tindakan berjaya')
      setDetailOpen(false)
      load()
    } else {
      toast.error(r.error || 'Tindakan gagal')
    }
  }

  if (!user) return null
  const isStudent = user.role === 'STUDENT'
  const isSupervisor = user.role === 'SUPERVISOR'
  const canManage = ['INSTITUTION_ADMIN', 'JTM_ADMIN'].includes(user.role)

  return (
    <div className="space-y-6">
      <GlassCard className="animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-indigo-300" />
              {isStudent ? 'Projek Saya' : isSupervisor ? 'Projek Seliaan' : 'Semua Projek'}
            </h2>
            <p className="text-sm text-slate-400 mt-1">{filtered.length} projek dipaparkan</p>
          </div>
          {isStudent && (
            <GradientButton onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Cadangan Projek Baharu
            </GradientButton>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari tajuk projek..."
              className="glass-input pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="glass-input w-full"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Status</SelectItem>
              {Object.keys(STATUS_LABELS).filter((s) => ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED'].includes(s)).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={fieldFilter} onValueChange={setFieldFilter}>
            <SelectTrigger className="glass-input w-full"><SelectValue placeholder="Bidang" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Bidang</SelectItem>
              <SelectItem value="Elektrik Kuasa">Elektrik Kuasa</SelectItem>
              <SelectItem value="RAC">RAC</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </GlassCard>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-400" /></div>
      ) : filtered.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon={<FolderKanban className="h-7 w-7 text-slate-400" />}
            title="Tiada projek dijumpai"
            description={isStudent ? 'Cipta cadangan projek pertama anda untuk bermula.' : 'Tiada projek sepadan dengan penapis semasa.'}
            action={isStudent && <GradientButton onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Cipta Projek</GradientButton>}
          />
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <GlassCard key={p.id} className="animate-fade-in-up hover:bg-white/12 transition cursor-pointer" onClick={() => openDetail(p)}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="text-base font-semibold text-white line-clamp-2">{p.title}</h3>
                {(p.similarityScore ?? 0) > 60 && (
                  <span title="Skor persamaan tinggi dengan projek sedia ada" className="flex items-center gap-1 text-[10px] text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
                    <AlertTriangle className="h-3 w-3" /> {p.similarityScore}%
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mb-3">
                <FieldBadge field={p.field} />
                <StatusBadge status={p.status} label={STATUS_LABELS[p.status]} />
              </div>
              <p className="text-xs text-slate-400 line-clamp-2 mb-3">{p.scope || 'Tiada skop'}</p>
              <div className="space-y-1.5 text-[11px] text-slate-400 mb-3">
                <p><span className="text-slate-500">Pelajar:</span> {p.student?.user?.fullName || '-'}</p>
                <p><span className="text-slate-500">Penyelia:</span> {p.supervisor?.user?.fullName || '-'}</p>
              </div>
              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span>Kemajuan (logbook)</span>
                  <span>{Math.min(100, Math.round(((p._count?.logbookEntries || 0) / 14) * 100))}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-teal-500" style={{ width: `${Math.min(100, Math.round(((p._count?.logbookEntries || 0) / 14) * 100))}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {p._count?.documents || 0}</span>
                <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {p._count?.logbookEntries || 0}</span>
                <span className="flex items-center gap-1"><ClipboardCheck className="h-3 w-3" /> {p._count?.evaluations || 0}</span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="glass-strong border-white/15 max-w-3xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white text-xl">{selected.title}</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Dicipta {formatDate(selected.createdAt)} • Dikemas kini {formatDate(selected.updatedAt)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <FieldBadge field={selected.field} />
                  <StatusBadge status={selected.status} label={STATUS_LABELS[selected.status]} />
                  {(selected.similarityScore ?? 0) > 0 && (
                    <span className="text-[11px] text-slate-400">Persamaan: {selected.similarityScore}%</span>
                  )}
                </div>

                {selected.rejectionReason && (
                  <div className="glass rounded-lg p-3 border-l-2 border-rose-400">
                    <p className="text-xs font-semibold text-rose-300 mb-1">Sebab Penolakan</p>
                    <p className="text-sm text-slate-200">{selected.rejectionReason}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <InfoTile label="Pelajar" value={selected.student?.user?.fullName || '-'} sub={selected.student?.user?.email} />
                  <InfoTile label="Penyelia" value={selected.supervisor?.user?.fullName || '-'} sub={selected.supervisor?.user?.email} />
                  <InfoTile label="Institusi" value={selected.institution?.name || '-'} sub={selected.institution?.code} />
                  <InfoTile label="Program" value={selected.program?.name || '-'} sub={selected.program?.code} />
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-300 mb-1.5">Skop Projek</p>
                  <div className="glass rounded-lg p-3 text-sm text-slate-200 whitespace-pre-wrap">{selected.scope || '-'}</div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-300 mb-1.5">Objektif</p>
                  <div className="glass rounded-lg p-3 text-sm text-slate-200 whitespace-pre-wrap">{selected.objectives || '-'}</div>
                </div>

                {selected.bomList && (
                  <div>
                    <p className="text-xs font-semibold text-slate-300 mb-1.5">Bill of Materials (BOM)</p>
                    <BomTable bom={selected.bomList} />
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <CountTile label="Dokumen" value={selected._count?.documents || 0} icon={<FileText className="h-4 w-4" />} />
                  <CountTile label="Logbook" value={selected._count?.logbookEntries || 0} icon={<BookOpen className="h-4 w-4" />} />
                  <CountTile label="Penilaian" value={selected._count?.evaluations || 0} icon={<ClipboardCheck className="h-4 w-4" />} />
                </div>
              </div>

              <DialogFooter className="flex flex-wrap gap-2">
                {isStudent && (selected.status === 'DRAFT' || selected.status === 'REJECTED') && (
                  <Button onClick={() => doAction(selected, 'submit')} disabled={actioning === selected.id} className="glass-button">
                    {actioning === selected.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Hantar untuk Kelulusan
                  </Button>
                )}
                {isSupervisor && selected.status === 'SUBMITTED' && (
                  <>
                    <Button onClick={() => doAction(selected, 'approve')} disabled={actioning === selected.id} className="glass-button">
                      <CheckCircle2 className="h-4 w-4 text-emerald-300" /> Luluskan
                    </Button>
                    <Button onClick={() => doAction(selected, 'reject')} disabled={actioning === selected.id} variant="destructive">
                      <XCircle className="h-4 w-4" /> Tolak
                    </Button>
                  </>
                )}
                {canManage && selected.status === 'APPROVED' && (
                  <Button onClick={() => doAction(selected, 'complete')} disabled={actioning === selected.id} className="glass-button">
                    <CheckCircle2 className="h-4 w-4 text-teal-300" /> Tandakan Selesai
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {createOpen && <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={() => { setCreateOpen(false); load() }} />}
    </div>
  )
}

function InfoTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="glass rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-medium text-white truncate">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 truncate">{sub}</p>}
    </div>
  )
}

function CountTile({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="glass rounded-lg p-3 text-center">
      <div className="flex items-center justify-center gap-1.5 text-slate-400 text-[11px] mb-1">{icon}{label}</div>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  )
}

function BomTable({ bom }: { bom: string }) {
  let items: any[] = []
  try { items = JSON.parse(bom) } catch { items = [] }
  if (!Array.isArray(items) || items.length === 0) {
    return <div className="glass rounded-lg p-3 text-xs text-slate-400">BOM tidak tersedia atau format tidak sah.</div>
  }
  return (
    <div className="glass rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 hover:bg-transparent">
            <TableHead className="text-slate-300 text-xs">Item</TableHead>
            <TableHead className="text-slate-300 text-xs">Kuantiti</TableHead>
            <TableHead className="text-slate-300 text-xs">Harga Anggaran (RM)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((it, i) => (
            <TableRow key={i} className="border-white/5">
              <TableCell className="text-slate-200 text-sm">{it.name || it.item || '-'}</TableCell>
              <TableCell className="text-slate-300 text-sm">{it.qty || it.quantity || 1}</TableCell>
              <TableCell className="text-slate-300 text-sm">{it.price || it.cost || 0}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function CreateProjectDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '', field: 'Elektrik Kuasa', scope: '', objectives: '',
    bomItems: [{ name: '', qty: 1, price: 0 }],
    scheduleStart: '', scheduleEnd: '',
  })

  function setField(k: string, v: any) { setForm((f) => ({ ...f, [k]: v })) }
  function setBomItem(i: number, k: string, v: any) {
    setForm((f) => {
      const items = [...f.bomItems]
      items[i] = { ...items[i], [k]: v }
      return { ...f, bomItems: items }
    })
  }
  function addBomItem() { setForm((f) => ({ ...f, bomItems: [...f.bomItems, { name: '', qty: 1, price: 0 }] })) }
  function removeBomItem(i: number) { setForm((f) => ({ ...f, bomItems: f.bomItems.filter((_, j) => j !== i) })) }

  async function submit() {
    if (!form.title.trim() || !form.scope.trim()) {
      toast.error('Tajuk dan skop diperlukan')
      return
    }
    setSubmitting(true)
    const body: any = {
      title: form.title,
      field: form.field,
      scope: form.scope,
      objectives: form.objectives,
      bomList: form.bomItems.filter((b) => b.name),
    }
    if (form.scheduleStart) body.scheduleStart = form.scheduleStart
    if (form.scheduleEnd) body.scheduleEnd = form.scheduleEnd
    const r = await api('/api/projects', { method: 'POST', body: JSON.stringify(body) })
    setSubmitting(false)
    if (r.success) {
      toast.success(r.message || 'Cadangan projek dicipta')
      // reset
      setStep(1)
      setForm({ title: '', field: 'Elektrik Kuasa', scope: '', objectives: '', bomItems: [{ name: '', qty: 1, price: 0 }], scheduleStart: '', scheduleEnd: '' })
      onCreated()
    } else {
      toast.error(r.error || 'Gagal mencipta projek')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/15 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2"><Plus className="h-5 w-5 text-indigo-300" /> Cadangan Projek Baharu</DialogTitle>
          <DialogDescription className="text-slate-400">Lengkapkan maklumat cadangan projek anda mengikut templat JTM.</DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-between gap-2 py-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={cn('h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0', step >= s ? 'glass-button text-white' : 'glass text-slate-400')}>
                {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              <span className={cn('text-xs', step >= s ? 'text-white' : 'text-slate-500')}>
                {s === 1 ? 'Tajuk & Bidang' : s === 2 ? 'Skop & Objektif' : 'BOM & Jadual'}
              </span>
              {s < 3 && <div className={cn('flex-1 h-0.5 rounded', step > s ? 'bg-teal-500/60' : 'bg-white/10')} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300 text-xs">Tajuk Projek *</Label>
              <Input value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="cth: Sistem Kawalan Motor 3-Fasa Berasaskan PLC" className="glass-input mt-1.5" />
            </div>
            <div>
              <Label className="text-slate-300 text-xs">Bidang *</Label>
              <Select value={form.field} onValueChange={(v) => setField('field', v)}>
                <SelectTrigger className="glass-input w-full mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Elektrik Kuasa">Elektrik Kuasa</SelectItem>
                  <SelectItem value="RAC">Penyejukbekuan & Penyamanan Udara (RAC)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300 text-xs">Skop Projek *</Label>
              <Textarea value={form.scope} onChange={(e) => setField('scope', e.target.value)} placeholder="Huraikan skop projek secara terperinci..." rows={5} className="glass-input mt-1.5" />
            </div>
            <div>
              <Label className="text-slate-300 text-xs">Objektif</Label>
              <Textarea value={form.objectives} onChange={(e) => setField('objectives', e.target.value)} placeholder="Senaraikan objektif projek (satu per baris)..." rows={4} className="glass-input mt-1.5" />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-slate-300 text-xs">Bill of Materials (BOM)</Label>
                <Button size="sm" onClick={addBomItem} className="glass-button h-7 text-xs"><Plus className="h-3 w-3" /> Tambah Item</Button>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {form.bomItems.map((it, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-6">
                      <Input value={it.name} onChange={(e) => setBomItem(i, 'name', e.target.value)} placeholder="Nama komponen" className="glass-input" />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" value={it.qty} onChange={(e) => setBomItem(i, 'qty', parseInt(e.target.value) || 1)} placeholder="Kuantiti" className="glass-input" />
                    </div>
                    <div className="col-span-3">
                      <Input type="number" value={it.price} onChange={(e) => setBomItem(i, 'price', parseFloat(e.target.value) || 0)} placeholder="Harga (RM)" className="glass-input" />
                    </div>
                    <div className="col-span-1">
                      {form.bomItems.length > 1 && (
                        <Button size="sm" variant="ghost" onClick={() => removeBomItem(i)} className="text-rose-300 hover:bg-rose-500/10 h-9 w-9 p-0">
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-300 text-xs">Tarikh Mula</Label>
                <Input type="date" value={form.scheduleStart} onChange={(e) => setField('scheduleStart', e.target.value)} className="glass-input mt-1.5" />
              </div>
              <div>
                <Label className="text-slate-300 text-xs">Tarikh Tamat Anggaran</Label>
                <Input type="date" value={form.scheduleEnd} onChange={(e) => setField('scheduleEnd', e.target.value)} className="glass-input mt-1.5" />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <Button variant="ghost" onClick={() => step > 1 ? setStep(step - 1) : onOpenChange(false)} className="text-slate-300">
            {step === 1 ? 'Batal' : 'Sebelum'}
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} className="glass-button">
              Seterusnya <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={submitting} className="glass-button">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Cipta Cadangan
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
