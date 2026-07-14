'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAuth, api } from '@/lib/store'
import { GlassCard, GlassSection, EmptyState, GradientButton, StatusBadge, ProgressRing } from '@/components/glass-ui'
import { ROLE_LABELS, formatDate } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { toast } from 'sonner'
import {
  Loader2, ClipboardCheck, Download, Award, FileText, Send, CheckCircle2,
  TrendingUp, MessageSquare,
} from 'lucide-react'

interface Project {
  id: string
  title: string
  field: string
  status: string
  student?: { user: { fullName: string } }
  supervisor?: { user: { fullName: string } }
}
interface Rubric {
  id: string
  name: string
  field: string
  evalType: string
  criteria: Array<{ key: string; label: string; maxScore: number; weight: number }>
  totalWeight: number
}
interface Evaluation {
  id: string
  evalType: string
  totalScore: number
  comments?: string | null
  submittedAt: string
  criterionScores: Record<string, number>
  evaluator: { fullName: string; role: string }
  rubric: { name: string; criteria: any[] }
}

const EVAL_TYPE_LABELS: Record<string, string> = {
  supervisor_progress: 'Kemajuan Penyelia',
  panel_viva: 'Viva Panel',
  final_report: 'Laporan Akhir',
}

export function EvaluationsView() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [rubrics, setRubrics] = useState<Rubric[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [evaluateOpen, setEvaluateOpen] = useState(false)
  const [evaluatingProject, setEvaluatingProject] = useState<Project | null>(null)

  useEffect(() => {
    (async () => {
      const [p, r] = await Promise.all([
        api<Project[]>('/api/projects?limit=100'),
        api<Rubric[]>('/api/rubrics'),
      ])
      if (p.success && p.data) setProjects(p.data)
      if (r.success && r.data) setRubrics(r.data)
      setLoading(false)
    })()
  }, [])

  useEffect(() => {
    if (!selectedProject) return
    ;(async () => {
      const r = await api<Evaluation[]>(`/api/evaluations?projectId=${selectedProject}`)
      if (r.success && r.data) setEvaluations(r.data)
    })()
  }, [selectedProject])

  if (!user) return null
  const isStudent = user.role === 'STUDENT'
  const canEvaluate = ['SUPERVISOR', 'PANEL', 'INSTITUTION_ADMIN', 'JTM_ADMIN'].includes(user.role)

  return (
    <div className="space-y-6">
      <GlassCard className="animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-teal-300" /> Penilaian Rubrik</h2>
            <p className="text-sm text-slate-400 mt-1">
              {isStudent ? 'Lihat penilaian diterima untuk projek anda.' : 'Nilai projek menggunakan rubrik standard JTM.'}
            </p>
          </div>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="glass-input w-full md:w-72"><SelectValue placeholder="Pilih projek..." /></SelectTrigger>
            <SelectContent>
              {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </GlassCard>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-400" /></div>
      ) : !selectedProject ? (
        <GlassCard><EmptyState icon={<ClipboardCheck className="h-7 w-7 text-slate-400" />} title="Pilih projek" /></GlassCard>
      ) : isStudent ? (
        <StudentEvaluations evaluations={evaluations} />
      ) : canEvaluate ? (
        <EvaluatorView
          project={projects.find((p) => p.id === selectedProject) || null}
          evaluations={evaluations}
          rubrics={rubrics}
          onOpenEvaluate={(p) => { setEvaluatingProject(p); setEvaluateOpen(true) }}
        />
      ) : null}

      {evaluateOpen && evaluatingProject && (
        <EvaluateDialog
          project={evaluatingProject}
          rubrics={rubrics}
          onClose={() => setEvaluateOpen(false)}
          onSubmitted={() => {
            setEvaluateOpen(false)
            ;(async () => {
              const r = await api<Evaluation[]>(`/api/evaluations?projectId=${selectedProject}`)
              if (r.success && r.data) setEvaluations(r.data)
            })()
          }}
        />
      )}
    </div>
  )
}

function StudentEvaluations({ evaluations }: { evaluations: Evaluation[] }) {
  if (evaluations.length === 0) {
    return (
      <GlassCard>
        <EmptyState icon={<Award className="h-7 w-7 text-slate-400" />} title="Tiada penilaian lagi" description="Penilaian anda akan dipaparkan di sini selepas dihantar oleh penyelia/panel." />
      </GlassCard>
    )
  }
  return (
    <div className="space-y-4">
      {evaluations.map((e) => {
        const maxPossible = e.rubric?.criteria?.reduce((s, c) => s + c.maxScore, 0) || 100
        const percent = Math.round((e.totalScore / maxPossible) * 100)
        return (
          <GlassCard key={e.id} className="animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              <div className="flex flex-col items-center justify-center md:w-32 flex-shrink-0">
                <ProgressRing value={percent} size={80} label={`${e.totalScore}/${maxPossible}`} />
                <p className="text-[10px] text-slate-400 mt-1">{EVAL_TYPE_LABELS[e.evalType] || e.evalType}</p>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-white">{e.rubric?.name || 'Rubrik'}</h3>
                  <Button size="sm" variant="ghost" onClick={() => toast.success('Dieksport ke PDF (demo)')} className="text-slate-300 hover:bg-white/10 h-7 text-xs">
                    <Download className="h-3.5 w-3.5" /> Eksport PDF
                  </Button>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dinilai oleh {e.evaluator?.fullName || '-'} ({ROLE_LABELS[e.evaluator?.role as keyof typeof ROLE_LABELS] || e.evaluator?.role}) • {formatDate(e.submittedAt, true)}
                </p>

                <div className="mt-3 space-y-1.5">
                  {e.rubric?.criteria?.map((c: any) => (
                    <div key={c.key} className="flex items-center justify-between glass rounded px-2.5 py-1.5">
                      <span className="text-xs text-slate-300">{c.label}</span>
                      <span className="text-xs font-semibold text-white">{e.criterionScores?.[c.key] ?? 0} / {c.maxScore}</span>
                    </div>
                  ))}
                </div>

                {e.comments && (
                  <div className="mt-3 glass rounded-lg p-2.5 border-l-2 border-sky-400">
                    <p className="text-[10px] uppercase tracking-wide text-sky-300 mb-0.5">Komen Penilai</p>
                    <p className="text-sm text-slate-200">{e.comments}</p>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        )
      })}
    </div>
  )
}

function EvaluatorView({ project, evaluations, rubrics, onOpenEvaluate }: {
  project: Project | null
  evaluations: Evaluation[]
  rubrics: Rubric[]
  onOpenEvaluate: (p: Project) => void
}) {
  if (!project) return null
  return (
    <>
      <GlassCard className="animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-white truncate">{project.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {project.student?.user?.fullName || '-'} • Penyelia: {project.supervisor?.user?.fullName || '-'}
            </p>
          </div>
          <GradientButton onClick={() => onOpenEvaluate(project)} disabled={rubrics.length === 0}>
            <ClipboardCheck className="h-4 w-4" /> Hantar Penilaian Baharu
          </GradientButton>
        </div>
        {rubrics.length === 0 && <p className="text-xs text-amber-300 mt-2">⚠️ Tiada rubrik aktif. Hubungi pentadbir JTM.</p>}
      </GlassCard>

      {evaluations.length === 0 ? (
        <GlassCard>
          <EmptyState icon={<ClipboardCheck className="h-7 w-7 text-slate-400" />} title="Tiada penilaian dihantar" description="Hantar penilaian pertama untuk projek ini." />
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {evaluations.map((e) => (
            <GlassCard key={e.id} className="animate-fade-in-up">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{e.rubric?.name || 'Rubrik'}</p>
                  <p className="text-[11px] text-slate-400">{EVAL_TYPE_LABELS[e.evalType] || e.evalType} • {formatDate(e.submittedAt, true)}</p>
                </div>
                <span className="text-base font-bold text-emerald-300">{e.totalScore}</span>
              </div>
              {e.comments && <p className="text-xs text-slate-300 mt-2 pt-2 border-t border-white/10">{e.comments}</p>}
            </GlassCard>
          ))}
        </div>
      )}
    </>
  )
}

function EvaluateDialog({ project, rubrics, onClose, onSubmitted }: {
  project: Project
  rubrics: Rubric[]
  onClose: () => void
  onSubmitted: () => void
}) {
  const [rubricId, setRubricId] = useState<string>('')
  const [evalType, setEvalType] = useState<string>('supervisor_progress')
  const [scores, setScores] = useState<Record<string, number>>({})
  const [comments, setComments] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectedRubric = useMemo(() => rubrics.find((r) => r.id === rubricId), [rubrics, rubricId])
  const filteredRubrics = useMemo(() => rubrics.filter((r) => r.evalType === evalType), [rubrics, evalType])

  // Auto-select first rubric when type changes
  useEffect(() => {
    if (filteredRubrics.length > 0 && !filteredRubrics.find((r) => r.id === rubricId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRubricId(filteredRubrics[0].id)
    }
  }, [filteredRubrics, rubricId])

  // Reset scores when rubric changes
  useEffect(() => {
    if (selectedRubric) {
      const init: Record<string, number> = {}
      for (const c of selectedRubric.criteria) init[c.key] = 0
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScores(init)
    }
  }, [selectedRubric])

  const totalScore = useMemo(() => {
    if (!selectedRubric) return 0
    return selectedRubric.criteria.reduce((s, c) => s + (scores[c.key] || 0), 0)
  }, [selectedRubric, scores])

  const maxPossible = useMemo(() => selectedRubric?.criteria.reduce((s, c) => s + c.maxScore, 0) || 100, [selectedRubric])
  const percent = Math.round((totalScore / maxPossible) * 100)

  async function submit() {
    if (!rubricId || !selectedRubric) { toast.error('Pilih rubrik'); return }
    setSubmitting(true)
    const r = await api('/api/evaluations', {
      method: 'POST',
      body: JSON.stringify({
        projectId: project.id,
        rubricId,
        criterionScores: scores,
        evalType,
        comments: comments || null,
      }),
    })
    setSubmitting(false)
    if (r.success) {
      toast.success(r.message || 'Penilaian dihantar')
      onSubmitted()
    } else toast.error(r.error || 'Gagal')
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong border-white/15 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-teal-300" /> Penilaian Rubrik</DialogTitle>
          <DialogDescription className="text-slate-400">{project.title} — {project.student?.user?.fullName || '-'}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Left: criteria inputs */}
          <div className="md:col-span-2 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-300 text-xs">Jenis Penilaian</Label>
                <Select value={evalType} onValueChange={setEvalType}>
                  <SelectTrigger className="glass-input w-full mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(EVAL_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300 text-xs">Rubrik</Label>
                <Select value={rubricId} onValueChange={setRubricId}>
                  <SelectTrigger className="glass-input w-full mt-1.5"><SelectValue placeholder="Pilih rubrik..." /></SelectTrigger>
                  <SelectContent>
                    {filteredRubrics.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedRubric ? (
              <div className="space-y-2.5">
                {selectedRubric.criteria.map((c) => {
                  const v = scores[c.key] || 0
                  return (
                    <div key={c.key} className="glass rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-white">{c.label}</p>
                          <p className="text-[10px] text-slate-400">Berat: {c.weight}% • Maks: {c.maxScore}</p>
                        </div>
                        <span className="text-sm font-bold text-teal-300">{v} / {c.maxScore}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Slider
                          value={[v]}
                          max={c.maxScore}
                          step={1}
                          onValueChange={(vals) => setScores((s) => ({ ...s, [c.key]: vals[0] }))}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          min={0}
                          max={c.maxScore}
                          value={v}
                          onChange={(e) => setScores((s) => ({ ...s, [c.key]: Math.min(c.maxScore, Math.max(0, Number(e.target.value) || 0)) }))}
                          className="glass-input w-16"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="glass rounded-lg p-6 text-center text-sm text-slate-400">Pilih jenis penilaian dan rubrik.</div>
            )}

            <div>
              <Label className="text-slate-300 text-xs">Komen Penilai</Label>
              <Textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Komen keseluruhan tentang prestasi pelajar..." rows={3} className="glass-input mt-1.5" />
            </div>
          </div>

          {/* Right: sticky total */}
          <div className="md:col-span-1">
            <div className="md:sticky md:top-2 glass-card p-5 text-center">
              <p className="text-xs text-slate-400 mb-3">Jumlah Skor</p>
              <div className="flex justify-center"><ProgressRing value={percent} size={120} stroke={10} label={`${totalScore}/${maxPossible}`} /></div>
              <p className="text-2xl font-bold text-white mt-3">{totalScore}</p>
              <p className="text-xs text-slate-400 mt-1">daripada {maxPossible} ({percent}%)</p>
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">Kriteria Dinilai</p>
                <p className="text-xs text-slate-300">{selectedRubric ? `${selectedRubric.criteria.filter((c) => (scores[c.key] || 0) > 0).length}/${selectedRubric.criteria.length} diisi` : '-'}</p>
              </div>
              <Button onClick={submit} disabled={submitting || !rubricId} className="glass-button w-full mt-4">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Hantar Penilaian
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
