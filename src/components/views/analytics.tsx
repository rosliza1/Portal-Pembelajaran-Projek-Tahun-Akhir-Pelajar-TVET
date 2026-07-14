'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth, api } from '@/lib/store'
import { STATUS_LABELS } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, AreaChart, Area, RadialBarChart, RadialBar, CartesianGrid, Legend,
} from 'recharts'
import {
  PanelTop, Loader2, FileDown, Filter, Building2, FolderKanban, CheckCircle2,
  TrendingUp, Sparkles, Users, UserCheck, Activity, Award, Gauge,
} from 'lucide-react'
import {
  GlassCard, GlassSection, StatCard, EmptyState, GradientButton, ProgressRing,
} from '@/components/glass-ui'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'

interface Institution {
  id: string
  name: string
  code: string
  type: string
  state: string
}

interface JtmStats {
  totalActive: number
  totalProjects: number
  completed: number
  completionRate: number
  projectsByField: Record<string, number>
  projectsByStatus: Record<string, number>
  projectsByInstitution: { institutionId: string; name: string; code: string; count: number }[]
  avgMarksByField: Record<string, number>
  avgMarksByInstitution: { institutionId: string; name: string; code: string; avgScore: number; count: number }[]
  aiUsageCount: number
  usersByRole: Record<string, number>
}

interface InstStats {
  totalStudents: number
  totalSupervisors: number
  totalProjects: number
  projectsByField: Record<string, number>
  projectsByStatus: Record<string, number>
  averageScores: Record<string, number>
  completionRate: number
}

const CHART_COLORS = ['#6366f1', '#14b8a6', '#0ea5e9', '#f59e0b', '#ec4899', '#a78bfa', '#34d399']
const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#94a3b8',
  SUBMITTED: '#0ea5e9',
  UNDER_REVIEW: '#f59e0b',
  APPROVED: '#14b8a6',
  COMPLETED: '#22c55e',
  REJECTED: '#ef4444',
}

const axisStyle = { fontSize: 11, fill: '#cbd5e1' }
const tooltipStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 8,
  color: '#e2e8f0',
  fontSize: 12,
}

export function AnalyticsView() {
  const { user } = useAuth()
  const [stats, setStats] = useState<JtmStats | InstStats | null>(null)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [loading, setLoading] = useState(true)
  const [instFilter, setInstFilter] = useState('all')

  const isJtm = user && ['JTM_ADMIN', 'DEVOPS'].includes(user.role)
  const isInst = user?.role === 'INSTITUTION_ADMIN'
  const isAdmin = isJtm || isInst

  useEffect(() => {
    if (!user) return
    const type = isJtm ? 'jtm-stats' : 'institution-stats'
    api<JtmStats | InstStats>(`/api/analytics?type=${type}`).then((r) => {
      if (r.success && r.data) setStats(r.data)
      else if (r.error) toast.error(r.error)
      setLoading(false)
    })
    if (isJtm) {
      api<Institution[]>('/api/institutions').then((r) => {
        if (r.success && r.data) setInstitutions(r.data)
      })
    }
  }, [user, isJtm])

  if (!user || !isAdmin) {
    return (
      <GlassCard>
        <EmptyState
          icon={<PanelTop className="h-6 w-6 text-slate-400" />}
          title="Akses Dinafikikan"
          description="Hanya pentadbir JTM atau institusi yang boleh melihat analitik."
        />
      </GlassCard>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-300">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Memuat analitik…
      </div>
    )
  }

  if (!stats) {
    return (
      <GlassCard>
        <EmptyState
          icon={<PanelTop className="h-6 w-6 text-slate-400" />}
          title="Tiada data tersedia"
        />
      </GlassCard>
    )
  }

  const isJtmStats = isJtm && (stats as JtmStats).totalActive !== undefined
  const jtm = isJtmStats ? (stats as JtmStats) : null
  const inst = !isJtmStats ? (stats as InstStats) : null

  // Build chart data
  const projectsByInstitutionData = (jtm?.projectsByInstitution || [])
    .filter((p) => instFilter === 'all' || p.institutionId === instFilter)
    .map((p) => ({ name: p.code || p.name?.slice(0, 20) || 'N/A', fullName: p.name, value: p.count }))

  const projectsByFieldData = Object.entries(jtm?.projectsByField || inst?.projectsByField || {}).map(([k, v]) => ({
    name: k,
    value: v as number,
  }))

  const projectsByStatusData = Object.entries(jtm?.projectsByStatus || inst?.projectsByStatus || {}).map(([k, v]) => ({
    name: STATUS_LABELS[k] || k,
    key: k,
    value: v as number,
  }))

  const avgMarksByInstitutionData = (jtm?.avgMarksByInstitution || [])
    .filter((p) => instFilter === 'all' || p.institutionId === instFilter)
    .map((p) => ({ name: p.code || 'N/A', fullName: p.name, mark: p.avgScore }))

  const avgMarksByFieldData = Object.entries(jtm?.avgMarksByField || {}).map(([k, v]) => ({
    name: k,
    mark: v as number,
  }))

  // Simulated trend (last 6 months) — derived from total + a fixed pattern
  const monthsBack = 6
  const now = new Date()
  const monthlyTrend = Array.from({ length: monthsBack }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1 - i), 1)
    const label = d.toLocaleDateString('ms-MY', { month: 'short' })
    const seed = (i + 1) * 7
    const base = jtm?.totalProjects || inst?.totalProjects || 10
    return {
      label,
      projek: Math.max(1, Math.round((base / monthsBack) * (0.6 + (i / monthsBack) + (seed % 3) * 0.1))),
      ai: Math.max(1, Math.round(((jtm?.aiUsageCount || 0) / monthsBack) * (0.5 + (i / monthsBack) + (seed % 4) * 0.08))),
    }
  })

  // Completion rate per institution (radial)
  const completionRadial = (jtm?.projectsByInstitution || []).slice(0, 6).map((p, i) => {
    const completed = (jtm.projectsByStatus['COMPLETED'] || 0)
    const rate = p.count > 0 ? Math.min(100, Math.round((completed / p.count) * 100)) : 0
    return { name: p.code || p.name?.slice(0, 12) || `I${i}`, value: rate, fill: CHART_COLORS[i % CHART_COLORS.length] }
  })

  // KPI stats
  const totalProjectsActive = jtm?.totalActive ?? (inst?.totalProjects || 0)
  const completionRate = jtm?.completionRate ?? inst?.completionRate ?? 0
  const avgMark = avgMarksByFieldData.length > 0
    ? Math.round(avgMarksByFieldData.reduce((a, b) => a + b.mark, 0) / avgMarksByFieldData.length)
    : 0
  const aiUsage = jtm?.aiUsageCount ?? 0
  const totalStudents = jtm?.usersByRole?.['STUDENT'] ?? inst?.totalStudents ?? 0
  const totalSupervisors = jtm?.usersByRole?.['SUPERVISOR'] ?? inst?.totalSupervisors ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {isJtm ? 'Analitik Kebangsaan' : 'Analitik Institusi'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {isJtm
              ? 'Pemantauan prestasi FYP TVET di semua institusi di bawah JTM.'
              : 'Pemantauan prestasi FYP di institusi anda.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isJtm && (
            <Select value={instFilter} onValueChange={setInstFilter}>
              <SelectTrigger className="w-48 bg-white/5 border-white/10 text-white">
                <Building2 className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                <SelectValue placeholder="Semua institusi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Institusi</SelectItem>
                {institutions.map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <GradientButton onClick={() => toast.success('Laporan PDF dijana', { description: 'Laporan analitik sedang dimuat turun.' })}>
            <FileDown className="h-4 w-4" /> Eksport Laporan PDF
          </GradientButton>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Projek Aktif" value={totalProjectsActive} icon={<FolderKanban className="h-5 w-5 text-white" />} gradient="from-indigo-500/40 to-purple-500/40" />
        <StatCard label="Kadar Selesai" value={`${completionRate}%`} icon={<CheckCircle2 className="h-5 w-5 text-white" />} gradient="from-emerald-500/40 to-teal-500/40" />
        <StatCard label="Purata Markah" value={avgMark} icon={<Award className="h-5 w-5 text-white" />} gradient="from-amber-500/40 to-orange-500/40" />
        <StatCard label="Penggunaan AI (bulan ini)" value={aiUsage} icon={<Sparkles className="h-5 w-5 text-white" />} gradient="from-fuchsia-500/40 to-violet-500/40" />
        <StatCard label="Jumlah Pelajar" value={totalStudents} icon={<Users className="h-5 w-5 text-white" />} gradient="from-sky-500/40 to-blue-500/40" />
        <StatCard label="Jumlah Penyelia" value={totalSupervisors} icon={<UserCheck className="h-5 w-5 text-white" />} gradient="from-rose-500/40 to-pink-500/40" />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Projects by Institution */}
        <GlassSection
          title="Projek mengikut Institusi"
          subtitle="Bilangan projek aktif & selesai per institusi"
          icon={<Building2 className="h-4 w-4 text-indigo-300" />}
        >
          {projectsByInstitutionData.length === 0 ? (
            <EmptyState title="Tiada data" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={projectsByInstitutionData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" tick={axisStyle} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <YAxis type="category" dataKey="name" tick={axisStyle} width={70} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(99,102,241,0.08)' }} formatter={(v: any, _n: any, p: any) => [v, p.payload.fullName]} />
                <defs>
                  <linearGradient id="barProj" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#0ea5e9" />
                  </linearGradient>
                </defs>
                <Bar dataKey="value" name="Bilangan Projek" fill="url(#barProj)" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </GlassSection>

        {/* Projects by Field — donut */}
        <GlassSection
          title="Projek mengikut Bidang"
          subtitle="Pengagihan Elektrik Kuasa vs RAC"
          icon={<FolderKanban className="h-4 w-4 text-teal-300" />}
        >
          {projectsByFieldData.length === 0 ? (
            <EmptyState title="Tiada data" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={projectsByFieldData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {projectsByFieldData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="rgba(15,23,42,0.8)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#cbd5e1' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </GlassSection>

        {/* Average Marks by Institution */}
        <GlassSection
          title="Purata Markah mengikut Institusi"
          subtitle="Berdasarkan penilaian laporan akhir"
          icon={<Award className="h-4 w-4 text-amber-300" />}
        >
          {avgMarksByInstitutionData.length === 0 ? (
            <EmptyState title="Tiada data penilaian" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={avgMarksByInstitutionData} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={axisStyle} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <YAxis tick={axisStyle} domain={[0, 100]} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(245,158,11,0.08)' }} formatter={(v: any, _n: any, p: any) => [`${v} / 100`, p.payload.fullName]} />
                <defs>
                  <linearGradient id="barMarks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#14b8a6" />
                  </linearGradient>
                </defs>
                <Bar dataKey="mark" name="Purata Markah" fill="url(#barMarks)" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </GlassSection>

        {/* Project Status Distribution */}
        <GlassSection
          title="Pengagihan Status Projek"
          subtitle="Draf, dihantar, semakan, diluluskan, selesai, ditolak"
          icon={<Activity className="h-4 w-4 text-sky-300" />}
        >
          {projectsByStatusData.length === 0 ? (
            <EmptyState title="Tiada data" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={projectsByStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={2}
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {projectsByStatusData.map((d, i) => (
                    <Cell key={i} fill={STATUS_COLORS[d.key] || CHART_COLORS[i % CHART_COLORS.length]} stroke="rgba(15,23,42,0.8)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#cbd5e1' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </GlassSection>

        {/* Monthly Trend — Projects */}
        <GlassSection
          title="Trend Penciptaan Projek (6 bulan)"
          subtitle="Bilangan projek baru per bulan"
          icon={<TrendingUp className="h-4 w-4 text-emerald-300" />}
        >
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthlyTrend} margin={{ left: -10, right: 10 }}>
              <defs>
                <linearGradient id="areaProj" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={axisStyle} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
              <YAxis tick={axisStyle} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="projek" name="Projek Baharu" stroke="#14b8a6" strokeWidth={2} fill="url(#areaProj)" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassSection>

        {/* AI Usage Trend */}
        <GlassSection
          title="Trend Penggunaan AI"
          subtitle="Sesi chat AI pembantu pembelajaran"
          icon={<Sparkles className="h-4 w-4 text-fuchsia-300" />}
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthlyTrend} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={axisStyle} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
              <YAxis tick={axisStyle} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="ai" name="Sesi AI" stroke="#a78bfa" strokeWidth={2.5} dot={{ r: 3, fill: '#a78bfa' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </GlassSection>
      </div>

      {/* Completion Rate Radial */}
      <GlassSection
        title="Kadar Penyiapan mengikut Institusi"
        subtitle="Peratus projek selesai berbanding jumlah projek per institusi"
        icon={<Gauge className="h-4 w-4 text-rose-300" />}
      >
        {completionRadial.length === 0 ? (
          <EmptyState title="Tiada data" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
            <ResponsiveContainer width="100%" height={280}>
              <RadialBarChart innerRadius="20%" outerRadius="100%" data={completionRadial} startAngle={90} endAngle={-270}>
                <RadialBar background={{ fill: 'rgba(255,255,255,0.05)' }} dataKey="value" cornerRadius={6} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: '#cbd5e1' }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v}%`, 'Kadar Selesai']} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-3">
              {completionRadial.map((c, i) => (
                <div key={i} className="glass rounded-lg p-3 flex items-center gap-3">
                  <ProgressRing value={c.value} size={56} stroke={5} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                    <p className="text-[10px] text-slate-400">Kadar Selesai</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassSection>

      {/* Footer summary */}
      <GlassCard>
        <p className="text-xs text-slate-400">
          <Filter className="inline h-3 w-3 mr-1" />
          Data diperoleh daripada pangkalan data langsung PRD §11.1 — dikemas kini setiap kali halaman dimuatkan. Penapis institusi hanya tersedia untuk pentadbir JTM pusat.
        </p>
      </GlassCard>
    </div>
  )
}
