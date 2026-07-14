'use client'

import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/store'
import { GlassCard, EmptyState, GradientButton } from '@/components/glass-ui'
import { NOTIF_TYPE_COLORS, timeAgo, formatDate } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Loader2, Bell, CheckCheck, Info, AlertTriangle, CheckCircle2, CalendarClock,
  MessageSquare, ShieldAlert,
} from 'lucide-react'

interface Notif {
  id: string
  title: string
  message: string
  type: string
  category: string
  isRead: boolean
  createdAt: string
  actionUrl?: string | null
}

const TYPE_ICONS: Record<string, any> = {
  INFO: Info,
  SUCCESS: CheckCircle2,
  WARNING: AlertTriangle,
  DANGER: ShieldAlert,
  DEADLINE: CalendarClock,
  APPROVAL: CheckCircle2,
  COMMENT: MessageSquare,
}

const TYPE_LABELS: Record<string, string> = {
  INFO: 'Maklumat',
  SUCCESS: 'Berjaya',
  WARNING: 'Amaran',
  DANGER: 'Bahaya',
  DEADLINE: 'Tamat Tempoh',
  APPROVAL: 'Kelulusan',
  COMMENT: 'Komen',
}

export function NotificationsView() {
  const [loading, setLoading] = useState(true)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [markingAll, setMarkingAll] = useState(false)

  async function load() {
    setLoading(true)
    const r = await api<Notif[]>('/api/notifications?limit=200')
    if (r.success && r.data) setNotifs(r.data)
    setLoading(false)
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [])

  const filtered = useMemo(() => {
    return notifs.filter((n) => typeFilter === 'ALL' || n.type === typeFilter)
  }, [notifs, typeFilter])

  const unreadCount = notifs.filter((n) => !n.isRead).length

  async function markAllRead() {
    setMarkingAll(true)
    const r = await api('/api/notifications/read', { method: 'POST', body: JSON.stringify({}) })
    setMarkingAll(false)
    if (r.success) {
      setNotifs((ns) => ns.map((n) => ({ ...n, isRead: true })))
      toast.success('Semua notifikasi ditanda sebagai dibaca')
    } else toast.error(r.error || 'Gagal')
  }

  async function markOneRead(n: Notif) {
    if (n.isRead) return
    await api('/api/notifications/read', { method: 'POST', body: JSON.stringify({ id: n.id }) })
    setNotifs((ns) => ns.map((x) => x.id === n.id ? { ...x, isRead: true } : x))
  }

  const types = Array.from(new Set(notifs.map((n) => n.type)))

  return (
    <div className="space-y-6">
      <GlassCard className="animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2"><Bell className="h-5 w-5 text-teal-300" /> Notifikasi</h2>
            <p className="text-sm text-slate-400 mt-1">
              {notifs.length} jumlah • <span className="text-amber-300">{unreadCount} belum dibaca</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="glass-input w-full md:w-44"><SelectValue placeholder="Penapis" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Jenis</SelectItem>
                {types.map((t) => <SelectItem key={t} value={t}>{TYPE_LABELS[t] || t}</SelectItem>)}
              </SelectContent>
            </Select>
            {unreadCount > 0 && (
              <GradientButton onClick={markAllRead} disabled={markingAll}>
                {markingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
                Tanda Semua Dibaca
              </GradientButton>
            )}
          </div>
        </div>
      </GlassCard>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-400" /></div>
      ) : filtered.length === 0 ? (
        <GlassCard><EmptyState icon={<Bell className="h-7 w-7 text-slate-400" />} title="Tiada notifikasi" description="Anda semua telah kekal." /></GlassCard>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const Icon = TYPE_ICONS[n.type] || Info
            const colorCls = NOTIF_TYPE_COLORS[n.type] || 'text-slate-300'
            return (
              <GlassCard
                key={n.id}
                className={cn('animate-fade-in-up cursor-pointer hover:bg-white/12 transition', !n.isRead && 'border-l-2 border-l-sky-400')}
                onClick={() => markOneRead(n)}
              >
                <div className="flex items-start gap-3">
                  <div className={cn('h-9 w-9 rounded-lg glass flex items-center justify-center flex-shrink-0', colorCls)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {!n.isRead && <span className="h-2 w-2 rounded-full bg-sky-400 flex-shrink-0" />}
                      <p className={cn('text-sm font-semibold truncate', n.isRead ? 'text-slate-300' : 'text-white')}>{n.title}</p>
                      <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full ml-auto', colorCls, 'bg-white/5')}>
                        {TYPE_LABELS[n.type] || n.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-slate-500 mt-1.5">
                      {timeAgo(n.createdAt)} • {formatDate(n.createdAt, true)} • {n.category}
                    </p>
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
