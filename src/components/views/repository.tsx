'use client'

import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/store'
import { GlassCard, EmptyState, GradientButton, FieldBadge } from '@/components/glass-ui'
import { formatDate } from '@/lib/ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Loader2, Archive, Search, FileText, Building2, Award, Lock, Eye,
} from 'lucide-react'

interface RepoProject {
  id: string
  title: string
  field: string
  scope: string
  objectives: string
  completedAt: string
  similarityScore?: number
  avgFinalScore?: number | null
  institution?: { name: string; code: string } | null
  program?: { name: string; code: string; field: string } | null
  student?: { user: { fullName: string; email: string } } | null
  supervisor?: { user: { fullName: string; email: string } } | null
}
interface Institution { id: string; name: string; code: string }

export function RepositoryView() {
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<RepoProject[]>([])
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [search, setSearch] = useState('')
  const [fieldFilter, setFieldFilter] = useState('ALL')
  const [yearFilter, setYearFilter] = useState('ALL')
  const [instFilter, setInstFilter] = useState('ALL')
  const [abstract, setAbstract] = useState<RepoProject | null>(null)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (fieldFilter !== 'ALL') params.set('field', fieldFilter)
    if (yearFilter !== 'ALL') params.set('year', yearFilter)
    if (instFilter !== 'ALL') params.set('institutionId', instFilter)
    const r = await api<RepoProject[]>(`/api/repository?${params.toString()}`)
    if (r.success && r.data) setProjects(r.data)
    setLoading(false)
  }

  useEffect(() => {
    api<Institution[]>('/api/institutions').then((r) => {
      if (r.success && r.data) setInstitutions(r.data)
    })
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(load, 350)
    return () => clearTimeout(t)
  }, [search, fieldFilter, yearFilter, instFilter])

  const years = useMemo(() => {
    const ys = new Set<number>()
    projects.forEach((p) => {
      if (p.completedAt) ys.add(new Date(p.completedAt).getFullYear())
    })
    return Array.from(ys).sort((a, b) => b - a)
  }, [projects])

  return (
    <div className="space-y-6">
      <GlassCard className="animate-fade-in-up">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Archive className="h-5 w-5 text-teal-300" /> Repositori Arkib Projek</h2>
        <p className="text-sm text-slate-400 mt-1">Cari projek selesai sebagai rujukan (FR-24). Laporan penuh memerlukan kebenaran institusi (FR-25).</p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari tajuk, skop, objektif..." className="glass-input pl-9" />
          </div>
          <Select value={fieldFilter} onValueChange={setFieldFilter}>
            <SelectTrigger className="glass-input w-full"><SelectValue placeholder="Bidang" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Bidang</SelectItem>
              <SelectItem value="Elektrik Kuasa">Elektrik Kuasa</SelectItem>
              <SelectItem value="RAC">RAC</SelectItem>
            </SelectContent>
          </Select>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="glass-input w-full"><SelectValue placeholder="Tahun" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Tahun</SelectItem>
              {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {institutions.length > 0 && (
          <div className="mt-2">
            <Select value={instFilter} onValueChange={setInstFilter}>
              <SelectTrigger className="glass-input w-full md:w-72"><SelectValue placeholder="Institusi" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Institusi</SelectItem>
                {institutions.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </GlassCard>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-400" /></div>
      ) : projects.length === 0 ? (
        <GlassCard><EmptyState icon={<Archive className="h-7 w-7 text-slate-400" />} title="Tiada projek arkib" description="Cuba ubah penapis carian." /></GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => (
            <GlassCard key={p.id} className="animate-fade-in-up flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <FieldBadge field={p.field} />
                {p.avgFinalScore != null && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                    <Award className="h-3 w-3" /> {p.avgFinalScore}
                  </span>
                )}
              </div>
              <h3 className="text-base font-semibold text-white line-clamp-2 mb-1">{p.title}</h3>
              <p className="text-xs text-slate-400 line-clamp-3 mb-3 flex-1">{p.scope || 'Tiada abstrak'}</p>
              <div className="space-y-1 text-[11px] text-slate-400 mb-3">
                <p className="flex items-center gap-1.5"><Building2 className="h-3 w-3" /> {p.institution?.name || '-'}</p>
                <p><span className="text-slate-500">Pelajar:</span> {p.student?.user?.fullName || '-'}</p>
                <p><span className="text-slate-500">Disahkan:</span> {p.completedAt ? formatDate(p.completedAt) : '-'}</p>
              </div>
              <GradientButton onClick={() => setAbstract(p)} className="w-full">
                <Eye className="h-4 w-4" /> Lihat Abstrak
              </GradientButton>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Abstract dialog */}
      <Dialog open={!!abstract} onOpenChange={(o) => !o && setAbstract(null)}>
        <DialogContent className="glass-strong border-white/15 max-w-2xl max-h-[90vh] overflow-y-auto">
          {abstract && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white text-xl flex items-center gap-2"><FileText className="h-5 w-5 text-indigo-300" /> {abstract.title}</DialogTitle>
                <DialogDescription className="text-slate-400">
                  {abstract.field} • {abstract.institution?.name || '-'} • {abstract.completedAt ? formatDate(abstract.completedAt) : '-'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <InfoTile label="Pelajar" value={abstract.student?.user?.fullName || '-'} sub={abstract.student?.user?.email} />
                  <InfoTile label="Penyelia" value={abstract.supervisor?.user?.fullName || '-'} sub={abstract.supervisor?.user?.email} />
                  <InfoTile label="Program" value={abstract.program?.name || '-'} sub={abstract.program?.code} />
                  <InfoTile label="Purata Markah" value={abstract.avgFinalScore != null ? String(abstract.avgFinalScore) : '-'} sub="penilaian laporan akhir" />
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-300 mb-1.5">Abstrak (Skop)</p>
                  <div className="glass rounded-lg p-3 text-sm text-slate-200 whitespace-pre-wrap">{abstract.scope || '-'}</div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-300 mb-1.5">Objektif</p>
                  <div className="glass rounded-lg p-3 text-sm text-slate-200 whitespace-pre-wrap">{abstract.objectives || '-'}</div>
                </div>

                <div className="glass rounded-lg p-3 border-l-2 border-amber-400 flex items-start gap-2">
                  <Lock className="h-4 w-4 text-amber-300 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-300">
                    <span className="font-semibold text-amber-300">Akses Terhad (FR-25):</span> Laporan penuh memerlukan kebenaran institusi.
                    Sila hubungi penyelia atau pentadbir institusi untuk akses dokumen penuh.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setAbstract(null)} className="text-slate-300">Tutup</Button>
                <Button onClick={() => toast.success('Permintaan akses dihantar (demo)')} className="glass-button">
                  <Lock className="h-4 w-4" /> Minta Akses Penuh
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
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
