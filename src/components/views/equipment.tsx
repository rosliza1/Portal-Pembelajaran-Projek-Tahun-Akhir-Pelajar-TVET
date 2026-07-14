'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAuth, api } from '@/lib/store'
import { GlassCard, GlassSection, EmptyState, GradientButton, StatusBadge } from '@/components/glass-ui'
import { STATUS_LABELS, formatDate } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  Loader2, Wrench, Plus, Search, Calendar, CheckCircle2, XCircle, Package,
  Boxes, Clock, ArrowLeftRight,
} from 'lucide-react'

interface Equipment {
  id: string
  name: string
  code: string
  category: string
  specification?: string | null
  quantity: number
  availableQty: number
  status: string
  institution?: { name: string; code: string }
}
interface Booking {
  id: string
  bookingStart: string
  bookingEnd: string
  purpose: string
  status: string
  returnNotes?: string | null
  equipment: { id: string; name: string; code: string }
  student?: { id: string; fullName: string; email: string }
}
interface Project { id: string; title: string }

const CATEGORIES = ['Elektrik Kuasa', 'RAC', 'General']
const CATEGORY_LABELS: Record<string, string> = {
  'Elektrik Kuasa': 'Elektrik Kuasa',
  'RAC': 'RAC',
  'General': 'Umum',
}

export function EquipmentView() {
  const { user } = useAuth()
  const [tab, setTab] = useState('inventory')
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [bookingEquip, setBookingEquip] = useState<Equipment | null>(null)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])

  async function loadEquipment() {
    const r = await api<Equipment[]>('/api/equipment')
    if (r.success && r.data) setEquipment(r.data)
  }
  async function loadBookings() {
    const r = await api<Booking[]>('/api/equipment/bookings')
    if (r.success && r.data) setBookings(r.data)
  }
  useEffect(() => {
    (async () => {
      setLoading(true)
      await Promise.all([loadEquipment(), loadBookings()])
      if (user?.role === 'STUDENT') {
        const p = await api<Project[]>('/api/projects?limit=20')
        if (p.success && p.data) setProjects(p.data)
      }
      setLoading(false)
    })()
  }, [user])

  const filtered = useMemo(() => {
    return equipment.filter((e) => {
      if (categoryFilter !== 'ALL' && e.category !== categoryFilter) return false
      if (statusFilter !== 'ALL' && e.status !== statusFilter) return false
      if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.code.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [equipment, search, categoryFilter, statusFilter])

  async function bookingAction(b: Booking, action: 'approve' | 'reject' | 'return') {
    let returnNotes: string | null = null
    if (action === 'return') {
      returnNotes = window.prompt('Nota pemulangan:') || ''
      if (!returnNotes) return
    }
    const r = await api(`/api/equipment/bookings/${b.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action, ...(returnNotes ? { returnNotes } : {}) }),
    })
    if (r.success) {
      toast.success(r.message || 'Tindakan berjaya')
      await Promise.all([loadEquipment(), loadBookings()])
    } else toast.error(r.error || 'Gagal')
  }

  if (!user) return null
  const isStudent = user.role === 'STUDENT'
  const isAdmin = ['INSTITUTION_ADMIN', 'JTM_ADMIN', 'DEVOPS'].includes(user.role)

  return (
    <div className="space-y-6">
      <GlassCard className="animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white flex items-center gap-2"><Wrench className="h-5 w-5 text-amber-300" /> Inventori Makmal</h2>
            <p className="text-sm text-slate-400 mt-1">Tempah peralatan & uruskan inventori institusi.</p>
          </div>
          {isAdmin && (
            <GradientButton onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Peralatan Baharu
            </GradientButton>
          )}
        </div>
      </GlassCard>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="glass-card p-1">
          <TabsTrigger value="inventory" className="data-[state=active]:glass-button">Inventori</TabsTrigger>
          {isStudent && <TabsTrigger value="my-bookings" className="data-[state=active]:glass-button">Tempahan Saya</TabsTrigger>}
          {isAdmin && <TabsTrigger value="pending" className="data-[state=active]:glass-button">Tempahan Menunggu</TabsTrigger>}
        </TabsList>

        <TabsContent value="inventory" className="mt-4 space-y-4">
          {/* Filters */}
          <GlassCard>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama / kod..." className="glass-input pl-9" />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="glass-input w-full"><SelectValue placeholder="Kategori" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Kategori</SelectItem>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="glass-input w-full"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Status</SelectItem>
                  <SelectItem value="AVAILABLE">Tersedia</SelectItem>
                  <SelectItem value="BOOKED">Ditempah</SelectItem>
                  <SelectItem value="UNDER_MAINTENANCE">Dalam Penyelenggaraan</SelectItem>
                  <SelectItem value="RETIRED">Tersara</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </GlassCard>

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-400" /></div>
          ) : filtered.length === 0 ? (
            <GlassCard><EmptyState icon={<Wrench className="h-7 w-7 text-slate-400" />} title="Tiada peralatan" description={isAdmin ? 'Tambah peralatan pertama untuk inventori.' : 'Tiada peralatan sepadan dengan penapis.'} /></GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((e) => (
                <GlassCard key={e.id} className="animate-fade-in-up">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-white truncate">{e.name}</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">{e.code}</p>
                    </div>
                    <StatusBadge status={e.status} label={STATUS_LABELS[e.status] || e.status} />
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] glass px-2 py-0.5 rounded-full text-slate-300">{CATEGORY_LABELS[e.category] || e.category}</span>
                  </div>
                  {e.specification && <p className="text-xs text-slate-400 line-clamp-2 mb-3">{e.specification}</p>}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-300">
                      <Boxes className="h-3.5 w-3.5" /> Stok: {e.availableQty}/{e.quantity}
                    </div>
                    {e.institution && <span className="text-[10px] text-slate-500">{e.institution.code}</span>}
                  </div>
                  {isStudent && e.status === 'AVAILABLE' && e.availableQty > 0 && (
                    <GradientButton onClick={() => { setBookingEquip(e); setBookingOpen(true) }} className="w-full">
                      <Calendar className="h-4 w-4" /> Tempah
                    </GradientButton>
                  )}
                  {isStudent && (e.status !== 'AVAILABLE' || e.availableQty <= 0) && (
                    <p className="text-[11px] text-center text-slate-500">Tidak tersedia untuk tempahan</p>
                  )}
                </GlassCard>
              ))}
            </div>
          )}
        </TabsContent>

        {(isStudent || isAdmin) && (
          <TabsContent value={isStudent ? 'my-bookings' : 'pending'} className="mt-4">
            {bookings.length === 0 ? (
              <GlassCard><EmptyState icon={<Calendar className="h-7 w-7 text-slate-400" />} title="Tiada tempahan" /></GlassCard>
            ) : (
              <div className="space-y-3">
                {(isStudent ? bookings : bookings.filter((b) => b.status === 'PENDING')).length === 0 ? (
                  <GlassCard><EmptyState icon={<CheckCircle2 className="h-7 w-7 text-emerald-400" />} title="Tiada tempahan menunggu" description="Semua tempahan telah diproses." /></GlassCard>
                ) : (
                  (isStudent ? bookings : bookings.filter((b) => b.status === 'PENDING')).map((b) => (
                    <GlassCard key={b.id} className="animate-fade-in-up">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="h-10 w-10 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                            <Wrench className="h-5 w-5 text-indigo-300" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{b.equipment.name}</p>
                            <p className="text-[11px] text-slate-400">{b.equipment.code}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {formatDate(b.bookingStart, true)} → {formatDate(b.bookingEnd, true)}
                            </p>
                            <p className="text-xs text-slate-300 mt-1">{b.purpose}</p>
                            {b.returnNotes && <p className="text-[11px] text-slate-400 mt-1">Nota: {b.returnNotes}</p>}
                            {isAdmin && b.student && <p className="text-[10px] text-slate-500 mt-1">Pelajar: {b.student.fullName}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusBadge status={b.status} label={STATUS_LABELS[b.status] || b.status} />
                          {isAdmin && b.status === 'PENDING' && (
                            <>
                              <Button size="sm" onClick={() => bookingAction(b, 'approve')} className="glass-button h-8">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> Lulus
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => bookingAction(b, 'reject')} className="h-8">
                                <XCircle className="h-3.5 w-3.5" /> Tolak
                              </Button>
                            </>
                          )}
                          {isAdmin && b.status === 'APPROVED' && (
                            <Button size="sm" onClick={() => bookingAction(b, 'return')} className="glass-button h-8">
                              <ArrowLeftRight className="h-3.5 w-3.5" /> Pulangkan
                            </Button>
                          )}
                        </div>
                      </div>
                    </GlassCard>
                  ))
                )}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Booking dialog */}
      {bookingOpen && bookingEquip && (
        <BookingDialog
          equipment={bookingEquip}
          projects={projects}
          onClose={() => setBookingOpen(false)}
          onBooked={() => {
            setBookingOpen(false)
            loadBookings()
            setTab('my-bookings')
          }}
        />
      )}

      {/* Create equipment dialog */}
      {createOpen && (
        <CreateEquipmentDialog
          onClose={() => setCreateOpen(false)}
          onCreated={() => { setCreateOpen(false); loadEquipment() }}
        />
      )}
    </div>
  )
}

function BookingDialog({ equipment, projects, onClose, onBooked }: {
  equipment: Equipment
  projects: Project[]
  onClose: () => void
  onBooked: () => void
}) {
  const [form, setForm] = useState({ bookingStart: '', bookingEnd: '', purpose: '', projectId: '' })
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (!form.bookingStart || !form.bookingEnd || !form.purpose.trim()) {
      toast.error('Tarikh mula, tamat dan tujuan diperlukan')
      return
    }
    setSubmitting(true)
    const r = await api('/api/equipment/bookings', {
      method: 'POST',
      body: JSON.stringify({
        equipmentId: equipment.id,
        bookingStart: form.bookingStart,
        bookingEnd: form.bookingEnd,
        purpose: form.purpose,
        projectId: form.projectId || null,
      }),
    })
    setSubmitting(false)
    if (r.success) {
      toast.success(r.message || 'Tempahan dihantar')
      onBooked()
    } else toast.error(r.error || 'Gagal')
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong border-white/15 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2"><Calendar className="h-5 w-5 text-amber-300" /> Tempah Peralatan</DialogTitle>
          <DialogDescription className="text-slate-400">{equipment.name} ({equipment.code})</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-300 text-xs">Mula *</Label>
              <Input type="datetime-local" value={form.bookingStart} onChange={(e) => setForm((f) => ({ ...f, bookingStart: e.target.value }))} className="glass-input mt-1.5" />
            </div>
            <div>
              <Label className="text-slate-300 text-xs">Tamat *</Label>
              <Input type="datetime-local" value={form.bookingEnd} onChange={(e) => setForm((f) => ({ ...f, bookingEnd: e.target.value }))} className="glass-input mt-1.5" />
            </div>
          </div>
          <div>
            <Label className="text-slate-300 text-xs">Tujuan *</Label>
            <Textarea value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} placeholder="Untuk ujian litar kawalan motor..." rows={3} className="glass-input mt-1.5" />
          </div>
          {projects.length > 0 && (
            <div>
              <Label className="text-slate-300 text-xs">Projek Berkaitan (pilihan)</Label>
              <Select value={form.projectId} onValueChange={(v) => setForm((f) => ({ ...f, projectId: v }))}>
                <SelectTrigger className="glass-input w-full mt-1.5"><SelectValue placeholder="Pilih projek..." /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-slate-300">Batal</Button>
          <Button onClick={submit} disabled={submitting} className="glass-button">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
            Hantar Tempahan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreateEquipmentDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', code: '', category: 'Elektrik Kuasa', specification: '', quantity: 1 })
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (!form.name.trim() || !form.code.trim()) { toast.error('Nama dan kod diperlukan'); return }
    setSubmitting(true)
    const r = await api('/api/equipment', {
      method: 'POST',
      body: JSON.stringify({ ...form, quantity: Number(form.quantity) }),
    })
    setSubmitting(false)
    if (r.success) {
      toast.success(r.message || 'Peralatan dicipta')
      onCreated()
    } else toast.error(r.error || 'Gagal')
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong border-white/15 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2"><Package className="h-5 w-5 text-amber-300" /> Peralatan Baharu</DialogTitle>
          <DialogDescription className="text-slate-400">Tambah peralatan ke inventori institusi.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-slate-300 text-xs">Nama Peralatan *</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="cth: Multimeter Digital" className="glass-input mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-300 text-xs">Kod *</Label>
              <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="MMT-001" className="glass-input mt-1.5" />
            </div>
            <div>
              <Label className="text-slate-300 text-xs">Kategori</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger className="glass-input w-full mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-slate-300 text-xs">Kuantiti</Label>
            <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))} className="glass-input mt-1.5" />
          </div>
          <div>
            <Label className="text-slate-300 text-xs">Spesifikasi</Label>
            <Textarea value={form.specification} onChange={(e) => setForm((f) => ({ ...f, specification: e.target.value }))} placeholder="Spesifikasi teknikal..." rows={3} className="glass-input mt-1.5" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-slate-300">Batal</Button>
          <Button onClick={submit} disabled={submitting} className="glass-button">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Cipta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
