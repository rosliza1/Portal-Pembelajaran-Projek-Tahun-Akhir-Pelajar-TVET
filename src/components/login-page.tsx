'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, api, type AppUser } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Zap, GraduationCap, Users, ShieldCheck, Building2, Sparkles, Lock, Mail, User as UserIcon, BookOpen, ChevronRight, CheckCircle2 } from 'lucide-react'

const DEMO_ACCOUNTS = [
  { role: 'Pelajar', email: 'pelajar1@jtm.gov.my', icon: GraduationCap, color: 'from-indigo-500 to-purple-500' },
  { role: 'Penyelia', email: 'nurul.huda@jtm.gov.my', icon: Users, color: 'from-teal-500 to-emerald-500' },
  { role: 'Panel Penilai', email: 'panel1@jtm.gov.my', icon: ShieldCheck, color: 'from-sky-500 to-blue-500' },
  { role: 'Pentadbir Institusi', email: 'admin.bangi@jtm.gov.my', icon: Building2, color: 'from-amber-500 to-orange-500' },
  { role: 'Pentadbir JTM Pusat', email: 'admin.jtm@jtm.gov.my', icon: ShieldCheck, color: 'from-violet-500 to-fuchsia-500' },
]

export function LoginPage() {
  const router = useRouter()
  const { user, fetchMe, loading } = useAuth()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [regForm, setRegForm] = useState({ fullName: '', email: '', password: '', phone: '', institutionId: '', programId: '', session: '2025/2026' })
  const [institutions, setInstitutions] = useState<{ id: string; name: string }[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [showPw, setShowPw] = useState(false)

  useEffect(() => { fetchMe() }, [fetchMe])
  useEffect(() => { if (!loading && user) router.replace('/') }, [user, loading, router])
  useEffect(() => {
    api('/api/institutions').then((r) => { if (r.success && r.data) setInstitutions(r.data) })
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!loginForm.email || !loginForm.password) { toast.error('Sila isi emel dan kata laluan'); return }
    setSubmitting(true)
    const r = await api<AppUser>('/api/auth/login', { method: 'POST', body: JSON.stringify(loginForm) })
    setSubmitting(false)
    if (r.success && r.data) {
      useAuth.getState().setUser(r.data)
      toast.success(`Selamat datang, ${r.data.fullName}!`)
      router.replace('/')
    } else {
      toast.error(r.error || 'Log masuk gagal')
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!regForm.fullName || !regForm.email || !regForm.password) { toast.error('Sila lengkapkan borang'); return }
    setSubmitting(true)
    const r = await api<AppUser>('/api/auth/register', { method: 'POST', body: JSON.stringify(regForm) })
    setSubmitting(false)
    if (r.success && r.data) {
      useAuth.getState().setUser(r.data)
      toast.success('Pendaftaran berjaya! Selamat datang.')
      router.replace('/')
    } else {
      toast.error(r.error || 'Pendaftaran gagal')
    }
  }

  function quickLogin(email: string) {
    setLoginForm({ email, password: 'Portal@2026' })
    setTab('login')
    toast.info(`Akaun demo dimuat • Kata laluan: Portal@2026`)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-20 h-96 w-96 rounded-full bg-teal-500/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-20 left-1/3 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <header className="relative z-10 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl glass-strong flex items-center justify-center shadow-lg">
            <Zap className="h-6 w-6 text-amber-300" fill="currentColor" />
          </div>
          <div>
            <p className="text-xs text-slate-300 font-medium tracking-wide">JABATAN TENAGA MANUSIA</p>
            <p className="text-sm font-bold text-white">Portal FYP TVET</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Sistem Aktif • PRD-JTM-TVET-FYP-2026-v1.0
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
          <div className="hidden lg:flex flex-col gap-6 pr-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs text-slate-200 w-fit">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Platform Digital Bersepadu TVET Malaysia
            </div>
            <h1 className="text-5xl font-bold leading-tight">
              Portal Pembelajaran<br />
              <span className="text-gradient">Projek Tahun Akhir</span><br />
              Pelajar TVET
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed">
              Sistem bersepadu untuk pengurusan Projek Tahun Akhir (FYP) bidang{' '}
              <span className="text-indigo-300 font-semibold">Elektrik Kuasa</span> dan{' '}
              <span className="text-teal-300 font-semibold">Penyejukbekuan & Penyamanan Udara (RAC)</span>{' '}
              di bawah Jabatan Tenaga Manusia (JTM).
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: BookOpen, title: '10 Modul Bersepadu', desc: 'Cadangan, Log, Dokumen, Penilaian' },
                { icon: Sparkles, title: 'Pembantu AI GLM', desc: 'Sokongan pembelajaran 24/7' },
                { icon: ShieldCheck, title: 'Keselamatan RBAC', desc: 'Audit trail & PDPA 2010' },
                { icon: CheckCircle2, title: 'Rubrik Digital Seragam', desc: 'Penilaian telus merentas IPT' },
              ].map((f, i) => (
                <div key={i} className="glass-card p-4 flex gap-3 animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500/30 to-teal-500/30 flex items-center justify-center flex-shrink-0">
                    <f.icon className="h-4 w-4 text-sky-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{f.title}</p>
                    <p className="text-xs text-slate-400">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6 md:p-8 shadow-2xl">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-white">Selamat Kembali</h2>
              <p className="text-sm text-slate-400 mt-1">Log masuk ke akaun anda untuk meneruskan</p>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="grid w-full grid-cols-2 glass mb-6 h-10">
                <TabsTrigger value="login" className="data-[state=active]:glass-strong text-slate-200">Log Masuk</TabsTrigger>
                <TabsTrigger value="register" className="data-[state=active]:glass-strong text-slate-200">Daftar Baharu</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-200 text-sm">Emel</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input type="email" className="glass-input pl-10 h-11" placeholder="nama@jtm.gov.my" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-200 text-sm">Kata Laluan</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input type={showPw ? 'text' : 'password'} className="glass-input pl-10 pr-12 h-11" placeholder="••••••••" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200">{showPw ? 'Sembunyi' : 'Lihat'}</button>
                    </div>
                  </div>
                  <Button type="submit" disabled={submitting} className="glass-button w-full h-11 font-semibold">
                    {submitting ? 'Sedang log masuk...' : 'Log Masuk'}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </form>

                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="text-xs text-slate-400 mb-3 text-center">Akaun Demo (klik untuk log masuk pantas)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {DEMO_ACCOUNTS.map((acc) => (
                      <button key={acc.email} onClick={() => quickLogin(acc.email)} className="flex items-center gap-3 p-2.5 rounded-lg glass hover:bg-white/10 transition-all text-left group">
                        <div className={`h-8 w-8 rounded-md bg-gradient-to-br ${acc.color} flex items-center justify-center flex-shrink-0`}>
                          <acc.icon className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{acc.role}</p>
                          <p className="text-[10px] text-slate-400 truncate">{acc.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 text-center mt-3">Kata laluan semua akaun demo: <span className="font-mono text-amber-300">Portal@2026</span></p>
                </div>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-slate-200 text-sm">Nama Penuh</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input className="glass-input pl-10 h-11" value={regForm.fullName} onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-slate-200 text-sm">Emel</Label>
                      <Input type="email" className="glass-input h-11" value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-200 text-sm">Telefon</Label>
                      <Input className="glass-input h-11" value={regForm.phone} onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })} placeholder="+601x-xxx xxxx" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-200 text-sm">Kata Laluan</Label>
                    <Input type="password" className="glass-input h-11" value={regForm.password} onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} required placeholder="Min 8 aksara, huruf besar/kecil & nombor" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-slate-200 text-sm">Institusi</Label>
                      <Select value={regForm.institutionId} onValueChange={(v) => setRegForm({ ...regForm, institutionId: v })}>
                        <SelectTrigger className="glass-input h-11"><SelectValue placeholder="Pilih institusi" /></SelectTrigger>
                        <SelectContent>{institutions.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-200 text-sm">Program</Label>
                      <Select value={regForm.programId} onValueChange={(v) => setRegForm({ ...regForm, programId: v })}>
                        <SelectTrigger className="glass-input h-11"><SelectValue placeholder="Pilih program" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="p1">Elektrik Kuasa</SelectItem>
                          <SelectItem value="p2">RAC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" disabled={submitting} className="glass-button w-full h-11 font-semibold">
                    {submitting ? 'Mendaftar...' : 'Daftar Akaun Pelajar'}
                  </Button>
                  <p className="text-xs text-slate-400 text-center">Pendaftaran untuk pelajar TVET sahaja. Penyelia & pentadbir diwujudkan oleh JTM Pusat.</p>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <footer className="relative z-10 mt-auto px-6 py-4 glass-nav border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <p>© 2026 Jabatan Tenaga Manusia (JTM), Kementerian Sumber Manusia. Hak cipta terpelihara.</p>
          <p>SULIT — Untuk Kegunaan Pembangunan Sistem | PDPA 2010 • MS IEC 60364</p>
        </div>
      </footer>
    </div>
  )
}
