// Shared UI helpers — labels, badges, status mapping
import { Role } from '@/lib/store'

export const ROLE_LABELS: Record<Role, string> = {
  STUDENT: 'Pelajar',
  SUPERVISOR: 'Penyelia',
  PANEL: 'Panel Penilai',
  INSTITUTION_ADMIN: 'Pentadbir Institusi',
  JTM_ADMIN: 'Pentadbir JTM Pusat',
  DEVOPS: 'DevOps',
}

export const ROLE_ICONS: Record<Role, string> = {
  STUDENT: 'GraduationCap',
  SUPERVISOR: 'Users',
  PANEL: 'ClipboardCheck',
  INSTITUTION_ADMIN: 'Building2',
  JTM_ADMIN: 'ShieldCheck',
  DEVOPS: 'Server',
}

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draf',
  SUBMITTED: 'Dihantar',
  UNDER_REVIEW: 'Dalam Semakan',
  APPROVED: 'Diluluskan',
  REJECTED: 'Ditolak',
  COMPLETED: 'Selesai',
  PENDING: 'Menunggu',
  SIGNED_OFF: 'Disahkan',
  AVAILABLE: 'Tersedia',
  BOOKED: 'Ditempah',
  UNDER_MAINTENANCE: 'Dalam Penyelenggaraan',
  RETIRED: 'Tersara',
  UPLOADED: 'Dimuat Naik',
  REVIEWED: 'Disemak',
  IN_PROGRESS: 'Sedang Berjalan',
  OVERDUE: 'Tertunggak',
  RETURNED: 'Dipulangkan',
  CANCELLED: 'Dibatalkan',
}

export const NOTIF_TYPE_COLORS: Record<string, string> = {
  INFO: 'text-sky-300',
  SUCCESS: 'text-emerald-300',
  WARNING: 'text-amber-300',
  DANGER: 'text-rose-300',
  DEADLINE: 'text-orange-300',
  APPROVAL: 'text-violet-300',
  COMMENT: 'text-cyan-300',
}

export function statusClass(status: string): string {
  const s = status.toLowerCase()
  return `status-${s}`
}

export function formatDate(d: string | Date | null | undefined, withTime = false): string {
  if (!d) return '-'
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return '-'
  const opts: Intl.DateTimeFormatOptions = withTime
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' }
  return date.toLocaleDateString('ms-MY', opts)
}

export function timeAgo(d: string | Date | null | undefined): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'baru saja'
  if (mins < 60) return `${mins} minit lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} hari lalu`
  return formatDate(date)
}

export function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

export function avatarColor(name: string): string {
  const colors = [
    'from-indigo-500 to-purple-500',
    'from-teal-500 to-emerald-500',
    'from-sky-500 to-blue-500',
    'from-amber-500 to-orange-500',
    'from-rose-500 to-pink-500',
    'from-violet-500 to-fuchsia-500',
  ]
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return colors[Math.abs(h) % colors.length]
}
