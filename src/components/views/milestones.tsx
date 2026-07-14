'use client'

import { useEffect, useState } from 'react'
import { useAuth, api } from '@/lib/store'
import { GlassCard, GlassSection, EmptyState, GradientButton, StatusBadge } from '@/components/glass-ui'
import { STATUS_LABELS, formatDate } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Loader2, CalendarClock, Plus, CheckCircle2, Clock, AlertTriangle,
  Flag, Calendar, Video,
} from 'lucide-react'

interface Project { id: string; title: string; field: string }
interface Milestone {
  id: string
  name: string
  stage: string
  dueDate: string
  status: string
  vivaSlot?: string | null
  completedAt?: string | null
  notes?: string | null
}

const STAGE_ORDER = ['PROPOSAL', 'PROGRESS_1', 'PROGRESS_2', 'VIVA', 'FINAL_SUBMISSION']
const STAGE_LABELS: Record<string, string> = {
  PROPOSAL: 'Cadangan',
  PROGRESS_1: 'Progress 1',
  PROGRESS_2: 'Progress 2',
  VIVA: 'Viva',
  FINAL_SUBMISSION: 'Penyerahan Akhir',
}

function daysUntil(date: string): number {
  const diff = new Date(date).getTime() - Date.now()
  return Math.ceil(diff / 86400000)
}

export function MilestonesView() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const r = await api<Project[]>('/api/projects?limit=100')
      if (r.success && r.data) {
        setProjects(r.data)
        if (r.data.length > 0) setSelectedProject(r.data[0].id)
      }
      setLoading(false)
    })()
  }, [])

  useEffect(() => {
    if (!selectedProject) return
    ;(async () => {
      setLoading(true)
      const r = await api<Milestone[]>(`/api/milestones?projectId=${selectedProject}`)
      if (r.success && r.data) setMilestones(r.data)
      setLoading(false)
    })()
  }, [selectedProject])

  async function markComplete(m: Milestone) {
    setUpdating(m.id)
    const r = await api(`/api/milestones/${m.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'COMPLETED' }),
    })
    setUpdating(null)
    if (r.success) {
      toast.success('Milestone ditandakan selesai')
      const rr = await api<Milestone[]>(`/api/milestones?projectId=${selectedProject}`)
      if (rr.success && rr.data) setMilestones(rr.data)
    } else toast.error(r.error || 'Gagal')
  }

  async function setVivaSlot(m: Milestone) {
    const slot = window.prompt('Slot Viva (YYYY-MM-DDTHH:MM):', m.vivaSlot ? m.vivaSlot.slice(0, 16) : '')
    if (!slot) return
    setUpdating(m.id)
    const r = await api(`/api/milestones/${m.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ vivaSlot: slot }),
    })
    setUpdating(null)
    if (r.success) {
      toast.success('Slot viva dikemaskini')
      const rr = await api<Milestone[]>(`/api/milestones?projectId=${selectedProject}`)
      if (rr.success && rr.data) setMilestones(rr.data)
    } else toast.error(r.error || 'Gagal: konflik jadual viva mungkin')
  }

  if (!user) return null
  const canManage = ['SUPERVISOR', 'INSTITUTION_ADMIN', 'JTM_ADMIN'].includes(user.role)
  const canCreate = ['INSTITUTION_ADMIN', 'JTM_ADMIN'].includes(user.role)

  const sorted = [...milestones].sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage))
  const nextPending = sorted.find((m) => m.status !== 'COMPLETED')

  return (
    <div className="space-y-6">
      <GlassCard className="animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white flex items-center gap-2"><CalendarClock className="h-5 w-5 text-sky-300" /> Milestone & Viva</h2>
            <p className="text-sm text-slate-400 mt-1">Jadual milestone projek & tempoh viva.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="glass-input w-full md:w-72"><SelectValue placeholder="Pilih projek..." /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
            {canCreate && (
              <GradientButton onClick={() => setCreateOpen(true)} disabled={!selectedProject}>
                <Plus className="h-4 w-4" /> Tambah Milestone
              </GradientButton>
            )}
          </div>
        </div>
      </GlassCard>

      {nextPending && (
        <GlassCard className="animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0',
              daysUntil(nextPending.dueDate) < 3 ? 'bg-rose-500/30' : 'bg-sky-500/20')}>
              {daysUntil(nextPending.dueDate) < 3 ? <AlertTriangle className="h-6 w-6 text-rose-300" /> : <Clock className="h-6 w-6 text-sky-300" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400">Milestone Akan Datang</p>
              <p className="text-base font-semibold text-white">{nextPending.name}</p>
              <p className="text-xs text-slate-400">Tamat tempoh {formatDate(nextPending.dueDate)}</p>
            </div>
            <div className={cn('text-2xl font-bold px-4 py-2 rounded-lg flex-shrink-0',
              daysUntil(nextPending.dueDate) < 3 ? 'bg-rose-500/20 text-rose-300' : 'bg-white/10 text-white')}>
              {daysUntil(nextPending.dueDate) < 0 ? 'TERTUNGGAK' : `${daysUntil(nextPending.dueDate)} hari`}
            </div>
          </div>
        </GlassCard>
      )}

      {!selectedProject ? (
        <GlassCard><EmptyState icon={<CalendarClock className="h-7 w-7 text-slate-400" />} title="Pilih projek" /></GlassCard>
      ) : loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-400" /></div>
      ) : milestones.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon={<CalendarClock className="h-7 w-7 text-slate-400" />}
            title="Tiada milestone"
            description={canCreate ? 'Tambah milestone pertama untuk projek ini.' : 'Milestone akan dicipta apabila projek diluluskan.'}
            action={canCreate && <GradientButton onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Tambah</GradientButton>}
          />
        </GlassCard>
      ) : (
        <GlassCard className="animate-fade-in-up">
          {/* Horizontal timeline */}
          <div className="overflow-x-auto pb-4">
            <div className="flex items-start gap-2 min-w-max px-2">
              {sorted.map((m, i) => {
                const isLast = i === sorted.length - 1
                const isCompleted = m.status === 'COMPLETED'
                const isOverdue = m.status === 'OVERDUE' || (m.status !== 'COMPLETED' && daysUntil(m.dueDate) < 0)
                return (
                  <div key={m.id} className="flex items-start">
                    <div className="flex flex-col items-center w-40 flex-shrink-0">
                      <div className={cn('h-10 w-10 rounded-full flex items-center justify-center border-2 transition',
                        isCompleted ? 'bg-emerald-500 border-emerald-400' : isOverdue ? 'bg-rose-500/30 border-rose-400' : 'bg-white/10 border-white/30')}>
                        {isCompleted ? <CheckCircle2 className="h-5 w-5 text-white" /> : <Flag className={cn('h-4 w-4', isOverdue ? 'text-rose-300' : 'text-slate-300')} />}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wide">{STAGE_LABELS[m.stage] || m.stage}</p>
                      <p className="text-xs font-semibold text-white text-center mt-0.5 line-clamp-1">{m.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(m.dueDate)}</p>
                      <div className="mt-1.5">
                        <StatusBadge status={isOverdue && m.status !== 'COMPLETED' ? 'OVERDUE' : m.status} label={isOverdue && m.status !== 'COMPLETED' ? STATUS_LABELS['OVERDUE'] : STATUS_LABELS[m.status] || m.status} />
                      </div>
                      {m.vivaSlot && (
                        <div className="mt-1.5 glass rounded px-2 py-1 flex items-center gap-1 text-[10px] text-purple-300">
                          <Video className="h-3 w-3" /> {formatDate(m.vivaSlot, true)}
                        </div>
                      )}
                      {canManage && m.status !== 'COMPLETED' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markComplete(m)}
                          disabled={updating === m.id}
                          className="mt-2 h-7 text-[10px] glass text-emerald-300 hover:bg-emerald-500/10"
                        >
                          {updating === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />} Selesai
                        </Button>
                      )}
                      {canManage && m.stage === 'VIVA' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setVivaSlot(m)}
                          disabled={updating === m.id}
                          className="mt-1 h-7 text-[10px] glass text-purple-300 hover:bg-purple-500/10"
                        >
                          <Calendar className="h-3 w-3" /> {m.vivaSlot ? 'Ubah Slot' : 'Set Viva'}
                        </Button>
                      )}
                    </div>
                    {!isLast && (
                      <div className={cn('h-0.5 w-8 mt-5 rounded flex-shrink-0', isCompleted ? 'bg-emerald-500/60' : 'bg-white/15')} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Viva schedule list for panel/supervisor */}
      {milestones.some((m) => m.vivaSlot) && (
        <GlassSection title="Jadual Viva" subtitle="Slot viva untuk projek ini" icon={<Video className="h-5 w-5 text-purple-300" />}>
          <div className="space-y-2">
            {milestones.filter((m) => m.vivaSlot).map((m) => (
              <div key={m.id} className="glass rounded-lg p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Video className="h-4 w-4 text-purple-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{m.name}</p>
                  <p className="text-[11px] text-slate-400">{formatDate(m.vivaSlot, true)}</p>
                </div>
                <StatusBadge status={m.status} label={STATUS_LABELS[m.status]} />
              </div>
            ))}
          </div>
        </GlassSection>
      )}

      {createOpen && (
        <CreateMilestoneDialog
          projectId={selectedProject}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false)
            ;(async () => {
              const r = await api<Milestone[]>(`/api/milestones?projectId=${selectedProject}`)
              if (r.success && r.data) setMilestones(r.data)
            })()
          }}
        />
      )}
    </div>
  )
}

function CreateMilestoneDialog({ projectId, onClose, onCreated }: { projectId: string; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', stage: 'PROGRESS_1', dueDate: '', vivaSlot: '' })
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (!form.name.trim() || !form.dueDate) { toast.error('Nama dan tarikh diperlukan'); return }
    setSubmitting(true)
    const body: any = { projectId, name: form.name, stage: form.stage, dueDate: form.dueDate }
    if (form.vivaSlot) body.vivaSlot = form.vivaSlot
    const r = await api('/api/milestones', { method: 'POST', body: JSON.stringify(body) })
    setSubmitting(false)
    if (r.success) {
      toast.success(r.message || 'Milestone dicipta')
      onCreated()
    } else toast.error(r.error || 'Gagal')
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong border-white/15 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2"><Plus className="h-5 w-5 text-sky-300" /> Tambah Milestone</DialogTitle>
          <DialogDescription className="text-slate-400">Tetapkan milestone baru untuk projek ini.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-slate-300 text-xs">Nama Milestone *</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="cth: Pembentangan Progress 1" className="glass-input mt-1.5" />
          </div>
          <div>
            <Label className="text-slate-300 text-xs">Peringkat (Stage) *</Label>
            <Select value={form.stage} onValueChange={(v) => setForm((f) => ({ ...f, stage: v }))}>
              <SelectTrigger className="glass-input w-full mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGE_ORDER.map((s) => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-slate-300 text-xs">Tarikh Tamat *</Label>
            <Input type="datetime-local" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className="glass-input mt-1.5" />
          </div>
          {form.stage === 'VIVA' && (
            <div>
              <Label className="text-slate-300 text-xs">Slot Viva (pilihan)</Label>
              <Input type="datetime-local" value={form.vivaSlot} onChange={(e) => setForm((f) => ({ ...f, vivaSlot: e.target.value }))} className="glass-input mt-1.5" />
              <p className="text-[10px] text-slate-500 mt-1">Sistem akan mengesan konflik jadual viva (±2 jam).</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-slate-300">Batal</Button>
          <Button onClick={submit} disabled={submitting} className="glass-button">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Cipta Milestone
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
