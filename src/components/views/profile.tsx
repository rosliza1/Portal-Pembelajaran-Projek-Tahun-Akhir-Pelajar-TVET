'use client'

import { useEffect, useState } from 'react'
import { useAuth, api } from '@/lib/store'
import { GlassCard, GlassSection, GradientButton } from '@/components/glass-ui'
import { ROLE_LABELS, initials, avatarColor, formatDate } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Loader2, UserCircle, Save, Lock, ShieldCheck, Clock, Phone, Mail,
  Building2, GraduationCap, KeyRound, Smartphone, Calendar,
} from 'lucide-react'

export function ProfileView() {
  const { user, fetchMe } = useAuth()
  const [form, setForm] = useState({ fullName: '', phone: '', avatarUrl: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        fullName: user.fullName || '',
        phone: user.phone || '',
        avatarUrl: user.avatarUrl || '',
      })
    }
  }, [user])

  if (!user) return null

  async function save() {
    if (!form.fullName.trim()) { toast.error('Nama penuh diperlukan'); return }
    setSaving(true)
    const r = await api(`/api/users/${user!.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        fullName: form.fullName,
        phone: form.phone || null,
        avatarUrl: form.avatarUrl || null,
      }),
    })
    setSaving(false)
    if (r.success) {
      toast.success(r.message || 'Profil dikemas kini')
      await fetchMe()
    } else toast.error(r.error || 'Gagal')
  }

  const initial = initials(user.fullName)
  const avatarCls = avatarColor(user.fullName)

  return (
    <div className="space-y-6">
      {/* Header */}
      <GlassCard className="animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className={cn('h-20 w-20 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-2xl font-bold flex-shrink-0', avatarCls)}>
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white">{user.fullName}</h2>
            <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-0.5"><Mail className="h-3.5 w-3.5" /> {user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="text-[10px]">{ROLE_LABELS[user.role]}</Badge>
              {user.institution && <span className="text-xs text-slate-400 flex items-center gap-1"><Building2 className="h-3 w-3" /> {user.institution.name}</span>}
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: edit form */}
        <div className="lg:col-span-2 space-y-6">
          <GlassSection title="Maklumat Profil" subtitle="Kemas kini butiran peribadi" icon={<UserCircle className="h-5 w-5 text-indigo-300" />}>
            <div className="space-y-3">
              <div>
                <Label className="text-slate-300 text-xs">Nama Penuh *</Label>
                <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} className="glass-input mt-1.5" />
              </div>
              <div>
                <Label className="text-slate-300 text-xs">No. Telefon</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+60123456789" className="glass-input mt-1.5" />
              </div>
              <div>
                <Label className="text-slate-300 text-xs">URL Avatar</Label>
                <Input value={form.avatarUrl} onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))} placeholder="https://..." className="glass-input mt-1.5" />
              </div>
              <Button onClick={save} disabled={saving} className="glass-button">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Simpan Perubahan
              </Button>
            </div>
          </GlassSection>

          <GlassSection title="Tukar Kata Laluan" subtitle="Kemas kini kata laluan akaun" icon={<KeyRound className="h-5 w-5 text-amber-300" />}>
            <div className="space-y-3">
              <div>
                <Label className="text-slate-300 text-xs">Kata Laluan Lama</Label>
                <Input type="password" placeholder="••••••••" className="glass-input mt-1.5" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-300 text-xs">Kata Laluan Baharu</Label>
                  <Input type="password" placeholder="••••••••" className="glass-input mt-1.5" />
                </div>
                <div>
                  <Label className="text-slate-300 text-xs">Sahkan Kata Laluan</Label>
                  <Input type="password" placeholder="••••••••" className="glass-input mt-1.5" />
                </div>
              </div>
              <p className="text-[10px] text-slate-500">Polisi: minimum 8 aksara, huruf besar/kecil & nombor.</p>
              <Button variant="ghost" onClick={() => toast.info('Ciri tukar kata laluan akan tersedia tidak lama')} className="glass text-slate-300 hover:bg-white/10">
                <Lock className="h-4 w-4" /> Tukar Kata Laluan
              </Button>
            </div>
          </GlassSection>
        </div>

        {/* Right: read-only info + security */}
        <div className="space-y-6">
          <GlassSection title="Maklumat Akaun" icon={<UserCircle className="h-5 w-5 text-teal-300" />}>
            <div className="space-y-2">
              <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="Emel" value={user.email} />
              <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Telefon" value={user.phone || '-'} />
              <InfoRow icon={<Building2 className="h-3.5 w-3.5" />} label="Institusi" value={user.institution?.name || '-'} sub={user.institution?.code} />
              {user.program && <InfoRow icon={<GraduationCap className="h-3.5 w-3.5" />} label="Program" value={user.program.name} sub={user.program.code} />}
              {user.session && <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="Sesi" value={user.session} />}
              {user.student && <InfoRow icon={<GraduationCap className="h-3.5 w-3.5" />} label="No. Pendaftaran" value={user.student.registrationNo} />}
              {user.supervisor && <InfoRow icon={<ShieldCheck className="h-3.5 w-3.5" />} label="No. Kakitangan" value={user.supervisor.staffNo} />}
              {user.supervisor?.expertiseField && <InfoRow icon={<GraduationCap className="h-3.5 w-3.5" />} label="Bidang Kepakaran" value={user.supervisor.expertiseField} />}
            </div>
          </GlassSection>

          <GlassSection title="Keselamatan" subtitle="Status sesi & perlindungan akaun" icon={<ShieldCheck className="h-5 w-5 text-emerald-300" />}>
            <div className="space-y-2.5">
              <div className="glass rounded-lg p-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-4 w-4 text-emerald-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase text-slate-500">Log Masuk Terakhir</p>
                  <p className="text-xs text-white">Baru saja (sesi aktif)</p>
                </div>
              </div>
              <div className="glass rounded-lg p-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Smartphone className="h-4 w-4 text-amber-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase text-slate-500">MFA (Multi-Factor)</p>
                  <p className="text-xs text-white">Tidak diaktifkan</p>
                </div>
                <Badge variant="outline" className="text-[9px] text-amber-300 border-amber-500/40">Cadang Aktif</Badge>
              </div>
              <div className="glass rounded-lg p-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-sky-500/20 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-4 w-4 text-sky-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase text-slate-500">Tamat Sesi</p>
                  <p className="text-xs text-white">8 jam selepas log masuk</p>
                </div>
              </div>
              <div className="glass rounded-lg p-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="h-4 w-4 text-indigo-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase text-slate-500">Status Akaun</p>
                  <p className="text-xs text-emerald-300">Aktif</p>
                </div>
              </div>
            </div>
          </GlassSection>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="glass rounded-lg p-3 flex items-center gap-3">
      <div className="h-7 w-7 rounded bg-white/10 flex items-center justify-center text-slate-300 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-sm text-white truncate">{value}</p>
        {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
      </div>
    </div>
  )
}
