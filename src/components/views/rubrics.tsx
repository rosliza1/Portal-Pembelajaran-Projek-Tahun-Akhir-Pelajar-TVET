'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth, api } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  ScrollText, Plus, Pencil, Eye, Loader2, Trash2, AlertTriangle, CheckCircle2,
  FileText, Layers, Award, Percent, GripVertical,
} from 'lucide-react'
import {
  GlassCard, GlassSection, StatCard, EmptyState, GradientButton, FieldBadge,
} from '@/components/glass-ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'

interface Criterion {
  key: string
  label: string
  maxScore: number
  weight: number
}

interface Rubric {
  id: string
  name: string
  field: 'Elektrik Kuasa' | 'RAC' | 'Both'
  evalType: 'supervisor_progress' | 'panel_viva' | 'final_report'
  criteria: Criterion[]
  totalWeight: number
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

const EVAL_TYPE_LABELS: Record<string, string> = {
  supervisor_progress: 'Kemajuan Penyelia',
  panel_viva: 'Viva Panel',
  final_report: 'Laporan Akhir',
}

const EVAL_TYPE_COLORS: Record<string, string> = {
  supervisor_progress: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  panel_viva: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  final_report: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
}

const FIELD_OPTIONS = ['Both', 'Elektrik Kuasa', 'RAC'] as const
const EVAL_OPTIONS = ['supervisor_progress', 'panel_viva', 'final_report'] as const

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

export function RubricsView() {
  const { user } = useAuth()
  const [rubrics, setRubrics] = useState<Rubric[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [viewTarget, setViewTarget] = useState<Rubric | null>(null)
  const [editTarget, setEditTarget] = useState<Rubric | null>(null)

  const canManage = user && ['JTM_ADMIN', 'DEVOPS'].includes(user.role)
  const canView = user && ['JTM_ADMIN', 'INSTITUTION_ADMIN', 'SUPERVISOR', 'PANEL', 'STUDENT', 'DEVOPS'].includes(user.role)

  function reload() {
    api<Rubric[]>('/api/rubrics').then((r) => {
      if (r.success && r.data) setRubrics(r.data)
      else if (r.error) toast.error(r.error)
      setLoading(false)
    })
  }

  useEffect(() => {
    if (!user) return
    reload()
  }, [user])

  // Stats
  const stats = useMemo(() => ({
    total: rubrics.length,
    active: rubrics.filter((r) => r.isActive).length,
    criteria: rubrics.reduce((sum, r) => sum + (r.criteria?.length || 0), 0),
    avgWeight: rubrics.length > 0 ? Math.round(rubrics.reduce((s, r) => s + (r.totalWeight || 0), 0) / rubrics.length) : 0,
  }), [rubrics])

  if (!user || !canView) {
    return (
      <GlassCard>
        <EmptyState
          icon={<ScrollText className="h-6 w-6 text-slate-400" />}
          title="Akses Dinafikikan"
          description="Anda tiada kebenaran untuk melihat templat rubrik."
        />
      </GlassCard>
    )
  }

  async function toggleActive(r: Rubric) {
    const r2 = await api(`/api/rubrics/${r.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !r.isActive }),
    })
    if (r2.success) {
      toast.success(r.isActive ? 'Rubrik dinyahaktifkan' : 'Rubrik diaktifkan')
      reload()
    } else {
      toast.error(r2.error || 'Gagal menukar status')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Templat Rubrik Penilaian</h2>
          <p className="text-sm text-slate-400 mt-1">
            Templat kriteria penilaian untuk kemajuan, viva, dan laporan akhir projek FYP.
          </p>
        </div>
        {canManage && (
          <GradientButton onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Cipta Templat Rubrik
          </GradientButton>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Jumlah Templat" value={stats.total} icon={<ScrollText className="h-5 w-5 text-white" />} gradient="from-indigo-500/40 to-purple-500/40" />
        <StatCard label="Rubrik Aktif" value={stats.active} icon={<CheckCircle2 className="h-5 w-5 text-white" />} gradient="from-emerald-500/40 to-teal-500/40" />
        <StatCard label="Jumlah Kriteria" value={stats.criteria} icon={<Layers className="h-5 w-5 text-white" />} gradient="from-sky-500/40 to-blue-500/40" />
        <StatCard label="Purata Berat" value={`${stats.avgWeight}%`} icon={<Percent className="h-5 w-5 text-white" />} gradient="from-amber-500/40 to-orange-500/40" />
      </div>

      {/* Rubric cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat templat rubrik…
        </div>
      ) : rubrics.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon={<ScrollText className="h-5 w-5 text-slate-400" />}
            title="Tiada templat rubrik"
            description={canManage ? 'Cipta templat pertama anda menggunakan butang di atas.' : 'Belum ada rubrik yang ditakrifkan oleh JTM.'}
            action={canManage ? <GradientButton onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Cipta Rubrik</GradientButton> : undefined}
          />
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rubrics.map((r) => (
            <GlassCard key={r.id} className="flex flex-col gap-3 hover:bg-white/5 transition">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500/30 to-teal-500/30 flex items-center justify-center flex-shrink-0">
                    <Award className="h-4 w-4 text-amber-300" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">{r.name}</h3>
                    <p className="text-[10px] text-slate-500">Dicipta {new Date(r.createdAt).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
                {canManage && (
                  <Switch checked={r.isActive} onCheckedChange={() => toggleActive(r)} />
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <FieldBadge field={r.field === 'Both' ? 'Elektrik Kuasa' : r.field} />
                {r.field === 'Both' && <Badge variant="outline" className="text-[10px] bg-white/5 text-slate-300 border-white/15">+ RAC</Badge>}
                <Badge variant="outline" className={cn('text-[10px]', EVAL_TYPE_COLORS[r.evalType])}>
                  {EVAL_TYPE_LABELS[r.evalType]}
                </Badge>
                {!r.isActive && (
                  <Badge variant="outline" className="text-[10px] bg-rose-500/15 text-rose-300 border-rose-500/30">Tidak Aktif</Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="glass rounded-md p-2">
                  <p className="text-slate-400 text-[10px]">Kriteria</p>
                  <p className="text-white font-semibold">{r.criteria?.length || 0}</p>
                </div>
                <div className="glass rounded-md p-2">
                  <p className="text-slate-400 text-[10px]">Jumlah Berat</p>
                  <p className={cn('font-semibold', r.totalWeight === 100 ? 'text-emerald-300' : 'text-amber-300')}>{r.totalWeight}%</p>
                </div>
              </div>

              {/* Criteria preview */}
              <div className="text-[11px] text-slate-400 space-y-1">
                {(r.criteria || []).slice(0, 3).map((c, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="truncate max-w-[180px]">{c.label}</span>
                    <span className="text-slate-500">{c.weight}%</span>
                  </div>
                ))}
                {(r.criteria?.length || 0) > 3 && (
                  <p className="text-[10px] text-slate-500 italic">+ {(r.criteria.length || 0) - 3} kriteria lagi</p>
                )}
              </div>

              <div className="flex gap-2 mt-auto pt-2 border-t border-white/10">
                <Button size="sm" variant="ghost" className="text-slate-300 hover:bg-white/5 flex-1" onClick={() => setViewTarget(r)}>
                  <Eye className="h-3.5 w-3.5 mr-1.5" /> Lihat
                </Button>
                {canManage && (
                  <Button size="sm" variant="ghost" className="text-slate-300 hover:bg-white/5 flex-1" onClick={() => setEditTarget(r)}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Kemaskini
                  </Button>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* View Dialog */}
      <ViewRubricDialog rubric={viewTarget} onClose={() => setViewTarget(null)} />

      {/* Create Dialog */}
      {createOpen && (
        <RubricFormDialog
          key="create"
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSave={async (form) => {
            const r = await api('/api/rubrics', { method: 'POST', body: JSON.stringify(form) })
            if (r.success) {
              toast.success('Rubrik dicipta')
              setCreateOpen(false)
              reload()
            } else {
              toast.error(r.error || 'Gagal mencipta rubrik')
            }
          }}
        />
      )}

      {/* Edit Dialog */}
      {editTarget && (
        <RubricFormDialog
          key={`edit-${editTarget.id}`}
          rubric={editTarget}
          open={!!editTarget}
          onOpenChange={(o) => !o && setEditTarget(null)}
          onSave={async (form) => {
            if (!editTarget) return
            const r = await api(`/api/rubrics/${editTarget.id}`, { method: 'PATCH', body: JSON.stringify(form) })
            if (r.success) {
              toast.success('Rubrik dikemas kini')
              setEditTarget(null)
              reload()
            } else {
              toast.error(r.error || 'Gagal mengemas kini')
            }
          }}
        />
      )}
    </div>
  )
}

// ============= VIEW DIALOG =============
function ViewRubricDialog({ rubric, onClose }: { rubric: Rubric | null; onClose: () => void }) {
  if (!rubric) return null
  return (
    <Dialog open={!!rubric} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong border-white/15 text-white sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-300" /> {rubric.name}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {EVAL_TYPE_LABELS[rubric.evalType]} • {rubric.field}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 mb-2">
          <FieldBadge field={rubric.field === 'Both' ? 'Elektrik Kuasa' : rubric.field} />
          {rubric.field === 'Both' && <Badge variant="outline" className="text-[10px] bg-white/5 text-slate-300 border-white/15">+ RAC</Badge>}
          <Badge variant="outline" className={cn('text-[10px]', EVAL_TYPE_COLORS[rubric.evalType])}>{EVAL_TYPE_LABELS[rubric.evalType]}</Badge>
          {rubric.isActive
            ? <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-300 border-emerald-500/30">Aktif</Badge>
            : <Badge variant="outline" className="text-[10px] bg-rose-500/15 text-rose-300 border-rose-500/30">Tidak Aktif</Badge>}
        </div>

        <div className="max-h-[50vh] overflow-y-auto custom-scroll">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-slate-400 text-xs uppercase">Kunci</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase">Label Kriteria</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase text-right">Markah Maks</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase text-right">Berat (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rubric.criteria || []).map((c, i) => (
                <TableRow key={i} className="border-white/5">
                  <TableCell><code className="text-[11px] text-teal-300">{c.key}</code></TableCell>
                  <TableCell><span className="text-sm text-slate-200">{c.label}</span></TableCell>
                  <TableCell className="text-right text-slate-200">{c.maxScore}</TableCell>
                  <TableCell className="text-right text-slate-200">{c.weight}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between glass rounded-md p-2.5">
          <span className="text-xs text-slate-400">Jumlah Berat</span>
          <span className={cn('text-sm font-semibold', rubric.totalWeight === 100 ? 'text-emerald-300' : 'text-amber-300')}>
            {rubric.totalWeight}%
          </span>
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

// ============= FORM DIALOG (Create / Edit) =============
function RubricFormDialog({
  open, onOpenChange, onSave, rubric,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSave: (form: any) => Promise<void>
  rubric?: Rubric | null
}) {
  const isEdit = !!rubric
  const [name, setName] = useState(rubric?.name || '')
  const [field, setField] = useState<typeof FIELD_OPTIONS[number]>(rubric?.field || 'Both')
  const [evalType, setEvalType] = useState<typeof EVAL_OPTIONS[number]>(rubric?.evalType || 'supervisor_progress')
  const [criteria, setCriteria] = useState<Criterion[]>(
    rubric?.criteria?.length
      ? rubric.criteria.map((c) => ({ ...c }))
      : [{ key: '', label: '', maxScore: 100, weight: 100 }]
  )
  const [saving, setSaving] = useState(false)

  const totalWeight = useMemo(() => criteria.reduce((s, c) => s + (Number(c.weight) || 0), 0), [criteria])
  const weightValid = totalWeight === 100

  function updateCriterion(idx: number, patch: Partial<Criterion>) {
    const next = [...criteria]
    next[idx] = { ...next[idx], ...patch }
    if (patch.label !== undefined) next[idx].key = slugify(patch.label)
    setCriteria(next)
  }

  function addCriterion() {
    setCriteria([...criteria, { key: '', label: '', maxScore: 100, weight: 0 }])
  }

  function removeCriterion(idx: number) {
    if (criteria.length === 1) {
      toast.error('Sekurang-kurangnya satu kriteria diperlukan')
      return
    }
    setCriteria(criteria.filter((_, i) => i !== idx))
  }

  async function submit() {
    if (!name.trim()) { toast.error('Nama rubrik diperlukan'); return }
    const validCriteria = criteria.filter((c) => c.label.trim() && c.key)
    if (validCriteria.length === 0) { toast.error('Sekurang-kurangnya satu kriteria diperlukan'); return }
    if (!weightValid) {
      toast.error(`Jumlah berat mesti 100% (semasa: ${totalWeight}%)`)
      return
    }
    setSaving(true)
    await onSave({
      name: name.trim(),
      field,
      evalType,
      criteria: validCriteria.map((c) => ({
        key: c.key || slugify(c.label),
        label: c.label.trim(),
        maxScore: Number(c.maxScore) || 100,
        weight: Number(c.weight) || 0,
      })),
      totalWeight,
    })
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/15 text-white sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-indigo-300" />
            {isEdit ? 'Kemaskini Templat Rubrik' : 'Cipta Templat Rubrik'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Tentukan kriteria penilaian, markah maksimum, dan pemberat untuk setiap kriteria.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-3 space-y-1.5">
            <Label className="text-slate-300 text-xs">Nama Rubrik *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cth. Rubrik Laporan Akhir EK"
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Bidang *</Label>
            <Select value={field} onValueChange={(v) => setField(v as typeof FIELD_OPTIONS[number])}>
              <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_OPTIONS.map((f) => (
                  <SelectItem key={f} value={f}>{f === 'Both' ? 'Kedua-dua Bidang' : f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-slate-300 text-xs">Jenis Penilaian *</Label>
            <Select value={evalType} onValueChange={(v) => setEvalType(v as typeof EVAL_OPTIONS[number])}>
              <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVAL_OPTIONS.map((e) => (
                  <SelectItem key={e} value={e}>{EVAL_TYPE_LABELS[e]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Criteria editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-slate-300 text-xs">Kriteria Penilaian</Label>
            <button onClick={addCriterion} className="text-xs text-sky-300 hover:text-sky-200 flex items-center gap-1">
              <Plus className="h-3 w-3" /> Tambah Kriteria
            </button>
          </div>
          <div className="max-h-[300px] overflow-y-auto custom-scroll space-y-2">
            {criteria.map((c, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end glass rounded-md p-2">
                <div className="col-span-1 flex justify-center pb-2">
                  <GripVertical className="h-4 w-4 text-slate-500" />
                </div>
                <div className="col-span-5">
                  <Label className="text-[10px] text-slate-400">Label Kriteria</Label>
                  <Input
                    value={c.label}
                    onChange={(e) => updateCriterion(idx, { label: e.target.value })}
                    placeholder="cth. Kualiti Penulisan"
                    className="bg-white/5 border-white/10 text-white text-xs h-8"
                  />
                  {c.key && <p className="text-[9px] text-teal-300 mt-0.5 font-mono">kunci: {c.key}</p>}
                </div>
                <div className="col-span-2">
                  <Label className="text-[10px] text-slate-400">Markah Maks</Label>
                  <Input
                    type="number"
                    value={c.maxScore}
                    onChange={(e) => updateCriterion(idx, { maxScore: Number(e.target.value) })}
                    className="bg-white/5 border-white/10 text-white text-xs h-8"
                  />
                </div>
                <div className="col-span-3">
                  <Label className="text-[10px] text-slate-400">Berat (%)</Label>
                  <Input
                    type="number"
                    value={c.weight}
                    onChange={(e) => updateCriterion(idx, { weight: Number(e.target.value) })}
                    className="bg-white/5 border-white/10 text-white text-xs h-8"
                  />
                </div>
                <div className="col-span-1 flex justify-center pb-1.5">
                  <button
                    onClick={() => removeCriterion(idx)}
                    className="glass p-1.5 rounded-md text-rose-300 hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Total weight warning */}
          <div className={cn(
            'flex items-center justify-between glass rounded-md p-2.5',
            weightValid ? 'border-emerald-500/30' : 'border-amber-500/30'
          )}>
            <div className="flex items-center gap-2">
              {weightValid
                ? <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                : <AlertTriangle className="h-4 w-4 text-amber-300" />}
              <span className={cn('text-xs', weightValid ? 'text-emerald-300' : 'text-amber-300')}>
                {weightValid
                  ? 'Jumlah berat sah (100%)'
                  : `Jumlah berat mesti 100% (semasa: ${totalWeight}%)`}
              </span>
            </div>
            <span className={cn('text-sm font-bold', weightValid ? 'text-emerald-300' : 'text-amber-300')}>
              {totalWeight}%
            </span>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" className="text-slate-300 hover:bg-white/5">Batal</Button>
          </DialogClose>
          <GradientButton onClick={submit} disabled={saving || !weightValid}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isEdit ? 'Simpan Perubahan' : 'Cipta Rubrik'}
          </GradientButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
