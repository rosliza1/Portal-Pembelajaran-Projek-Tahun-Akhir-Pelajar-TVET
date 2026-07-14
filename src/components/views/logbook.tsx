'use client'

import { useEffect, useState } from 'react'
import { useAuth, api } from '@/lib/store'
import { GlassCard, GlassSection, StatusBadge, EmptyState, GradientButton } from '@/components/glass-ui'
import { STATUS_LABELS, formatDate } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Loader2, BookOpen, Plus, CheckCircle2, XCircle, Clock, AlertTriangle,
  ChevronDown, Calendar, User, FileText,
} from 'lucide-react'

interface Project { id: string; title: string; field: string }
interface LogbookEntry {
  id: string
  weekNumber: number
  tasksDone: string
  hoursWorked: number
  issuesFaced?: string | null
  status: string
  createdAt: string
  signedOffAt?: string | null
  supervisorComment?: string | null
  student?: { id: string; fullName: string; email: string }
}

export function LogbookView() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [entries, setEntries] = useState<LogbookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [signoffEntry, setSignoffEntry] = useState<LogbookEntry | null>(null)
  const [signoffOpen, setSignoffOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
    (async () => {
      setLoading(true)
      const r = await api<LogbookEntry[]>(`/api/logbook?projectId=${selectedProject}`)
      if (r.success && r.data) setEntries(r.data)
      setLoading(false)
    })()
  }, [selectedProject])

  async function signoff(action: 'signoff' | 'reject') {
    if (!signoffEntry) return
    setSubmitting(true)
    const r = await api(`/api/logbook/${signoffEntry.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action, supervisorComment: comment || null }),
    })
    setSubmitting(false)
    if (r.success) {
      toast.success(r.message || 'Tindakan berjaya')
      setSignoffOpen(false)
      setSignoffEntry(null)
      setComment('')
      // refresh
      const rr = await api<LogbookEntry[]>(`/api/logbook?projectId=${selectedProject}`)
      if (rr.success && rr.data) setEntries(rr.data)
    } else {
      toast.error(r.error || 'Gagal')
    }
  }

  if (!user) return null
  const isStudent = user.role === 'STUDENT'
  const isSupervisor = user.role === 'SUPERVISOR'

  return (
    <div className="space-y-6">
      <GlassCard className="animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white flex items-center gap-2"><BookOpen className="h-5 w-5 text-teal-300" /> Log Mingguan</h2>
            <p className="text-sm text-slate-400 mt-1">Entri logbook disahkan oleh penyelia.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="glass-input w-full md:w-72"><SelectValue placeholder="Pilih projek..." /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
            {isStudent && (
              <GradientButton onClick={() => setCreateOpen(true)} disabled={!selectedProject}>
                <Plus className="h-4 w-4" /> Tambah Log Mingguan
              </GradientButton>
            )}
          </div>
        </div>
      </GlassCard>

      {!selectedProject ? (
        <GlassCard><EmptyState icon={<BookOpen className="h-7 w-7 text-slate-400" />} title="Pilih projek" description="Sila pilih projek untuk melihat entri logbook." /></GlassCard>
      ) : loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-400" /></div>
      ) : entries.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon={<BookOpen className="h-7 w-7 text-slate-400" />}
            title="Tiada entri logbook"
            description={isStudent ? 'Mula tambah entri log mingguan pertama anda.' : 'Pelajar belum menambah sebarang entri.'}
            action={isStudent && <GradientButton onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Tambah Log</GradientButton>}
          />
        </GlassCard>
      ) : (
        <div className="relative pl-8">
          {/* Vertical timeline line */}
          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500/60 via-teal-500/40 to-transparent" />
          <div className="space-y-4">
            {entries.map((e) => (
              <div key={e.id} className="relative animate-fade-in-up">
                {/* Timeline node */}
                <div className={cn('absolute -left-[1.35rem] top-4 h-5 w-5 rounded-full border-2 border-white/20 flex items-center justify-center',
                  e.status === 'SIGNED_OFF' ? 'bg-emerald-500' : e.status === 'REJECTED' ? 'bg-rose-500' : 'bg-amber-500')}>
                  <span className="text-[9px] text-white font-bold">{e.weekNumber}</span>
                </div>
                <GlassCard className="ml-2 hover:bg-white/12 transition">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-white">Minggu {e.weekNumber}</h3>
                        <StatusBadge status={e.status} label={STATUS_LABELS[e.status] || e.status} />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {formatDate(e.createdAt, true)}
                        {e.student && <> • <User className="h-3 w-3" /> {e.student.fullName}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="glass px-2 py-1 rounded-full text-slate-200">{e.hoursWorked} jam</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Tugasan Selesai</p>
                      <p className="text-sm text-slate-200 whitespace-pre-wrap">{e.tasksDone}</p>
                    </div>
                    {e.issuesFaced && (
                      <div className="glass rounded-lg p-2.5 border-l-2 border-amber-400">
                        <p className="text-[10px] uppercase tracking-wide text-amber-300 mb-0.5">Isu Dihadapi</p>
                        <p className="text-sm text-slate-200">{e.issuesFaced}</p>
                      </div>
                    )}
                    {e.supervisorComment && (
                      <div className="glass rounded-lg p-2.5 border-l-2 border-sky-400">
                        <p className="text-[10px] uppercase tracking-wide text-sky-300 mb-0.5">Komen Penyelia</p>
                        <p className="text-sm text-slate-200">{e.supervisorComment}</p>
                        <p className="text-[10px] text-slate-500 mt-1">Disahkan {e.signedOffAt ? formatDate(e.signedOffAt, true) : '-'}</p>
                      </div>
                    )}
                  </div>

                  {isSupervisor && e.status === 'PENDING' && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                      <Button size="sm" onClick={() => { setSignoffEntry(e); setComment(''); setSignoffOpen(true); setSignoffEntry(e) }} className="glass-button h-8">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> Sahkan
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => { setSignoffEntry(e); setSignoffOpen(true); setSignoffEntry(e) }} className="h-8">
                        <XCircle className="h-3.5 w-3.5" /> Tolak
                      </Button>
                    </div>
                  )}
                </GlassCard>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create entry dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="glass-strong border-white/15 max-w-lg">
          <CreateLogbookEntry
            projectId={selectedProject}
            existingWeeks={entries.map((e) => e.weekNumber)}
            onClose={() => setCreateOpen(false)}
            onCreated={() => {
              setCreateOpen(false)
              ;(async () => {
                const r = await api<LogbookEntry[]>(`/api/logbook?projectId=${selectedProject}`)
                if (r.success && r.data) setEntries(r.data)
              })()
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Sign-off dialog */}
      <Dialog open={signoffOpen} onOpenChange={setSignoffOpen}>
        <DialogContent className="glass-strong border-white/15 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Sahkan Entri Logbook</DialogTitle>
            <DialogDescription className="text-slate-400">
              Minggu {signoffEntry?.weekNumber} — Tambah komen penyelia (pilihan untuk sah, wajib untuk tolak).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {signoffEntry && (
              <div className="glass rounded-lg p-3">
                <p className="text-[10px] uppercase text-slate-500 mb-1">Tugasan</p>
                <p className="text-sm text-slate-200 whitespace-pre-wrap">{signoffEntry.tasksDone}</p>
              </div>
            )}
            <div>
              <Label className="text-slate-300 text-xs">Komen Penyelia</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tulis komen tentang kemajuan pelajar..."
                rows={4}
                className="glass-input mt-1.5"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="ghost" onClick={() => setSignoffOpen(false)} className="text-slate-300">Batal</Button>
            <Button
              variant="destructive"
              disabled={submitting || !comment.trim()}
              onClick={() => signoff('reject')}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Tolak
            </Button>
            <Button
              disabled={submitting}
              onClick={() => signoff('signoff')}
              className="glass-button"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 text-emerald-300" />} Sahkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CreateLogbookEntry({ projectId, existingWeeks, onClose, onCreated }: { projectId: string; existingWeeks: number[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ weekNumber: 1, tasksDone: '', hoursWorked: 0, issuesFaced: '' })
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (!form.tasksDone.trim()) { toast.error('Tugasan diperlukan'); return }
    if (existingWeeks.includes(Number(form.weekNumber))) { toast.error(`Entri minggu ${form.weekNumber} sudah wujud`); return }
    setSubmitting(true)
    const r = await api('/api/logbook', {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        weekNumber: Number(form.weekNumber),
        tasksDone: form.tasksDone,
        hoursWorked: Number(form.hoursWorked),
        issuesFaced: form.issuesFaced || null,
      }),
    })
    setSubmitting(false)
    if (r.success) {
      toast.success(r.message || 'Entri dicipta')
      onCreated()
    } else {
      toast.error(r.error || 'Gagal')
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-white flex items-center gap-2"><Plus className="h-5 w-5 text-teal-300" /> Entri Log Mingguan</DialogTitle>
        <DialogDescription className="text-slate-400">Lengkapkan tugasan dan isu yang dihadapi minggu ini.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-slate-300 text-xs">Minggu #</Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={form.weekNumber}
              onChange={(e) => setForm((f) => ({ ...f, weekNumber: Number(e.target.value) }))}
              className="glass-input mt-1.5"
            />
          </div>
          <div>
            <Label className="text-slate-300 text-xs">Jam Bekerja</Label>
            <Input
              type="number"
              min={0}
              max={168}
              step="0.5"
              value={form.hoursWorked}
              onChange={(e) => setForm((f) => ({ ...f, hoursWorked: Number(e.target.value) }))}
              className="glass-input mt-1.5"
            />
          </div>
        </div>
        <div>
          <Label className="text-slate-300 text-xs">Tugasan Selesai *</Label>
          <Textarea
            value={form.tasksDone}
            onChange={(e) => setForm((f) => ({ ...f, tasksDone: e.target.value }))}
            placeholder="cth: Membina litar kawalan DOL, menguji pemula Star-Delta..."
            rows={5}
            className="glass-input mt-1.5"
          />
        </div>
        <div>
          <Label className="text-slate-300 text-xs">Isu Dihadapi</Label>
          <Textarea
            value={form.issuesFaced}
            onChange={(e) => setForm((f) => ({ ...f, issuesFaced: e.target.value }))}
            placeholder="Kosongkan jika tiada."
            rows={3}
            className="glass-input mt-1.5"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose} className="text-slate-300">Batal</Button>
        <Button onClick={submit} disabled={submitting} className="glass-button">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Simpan Entri
        </Button>
      </DialogFooter>
    </>
  )
}
