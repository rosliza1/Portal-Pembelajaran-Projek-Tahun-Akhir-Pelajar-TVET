'use client'
/* eslint-disable react-hooks/static-components, react-hooks/set-state-in-effect */

import { useEffect, useState, useMemo } from 'react'
import { useAuth, api } from '@/lib/store'
import { ROLE_LABELS, initials, avatarColor, timeAgo, NOTIF_TYPE_COLORS } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { AiAssistant } from './ai-assistant'
import {
  Zap, LayoutDashboard, FolderKanban, BookOpen, FileText, CalendarClock, ClipboardCheck,
  Wrench, Bell, Search, Users, Archive, ScrollText, LogOut, Menu, ChevronRight,
  GraduationCap, Building2, ShieldCheck, UserCircle, Settings, Sparkles, X, Check, PanelTop,
} from 'lucide-react'

type ViewId =
  | 'dashboard' | 'projects' | 'logbook' | 'documents' | 'milestones'
  | 'evaluations' | 'rubrics' | 'equipment' | 'repository' | 'ai-history'
  | 'users' | 'audit-logs' | 'notifications' | 'profile' | 'analytics'

interface NavItem { id: ViewId; label: string; icon: any; roles: string[]; badge?: string }
interface Notif { id: string; title: string; message: string; type: string; category: string; isRead: boolean; createdAt: string; actionUrl?: string | null }

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['STUDENT', 'SUPERVISOR', 'PANEL', 'INSTITUTION_ADMIN', 'JTM_ADMIN', 'DEVOPS'] },
  { id: 'projects', label: 'Projek Saya', icon: FolderKanban, roles: ['STUDENT'] },
  { id: 'projects', label: 'Projek Seliaan', icon: FolderKanban, roles: ['SUPERVISOR', 'PANEL'] },
  { id: 'projects', label: 'Semua Projek', icon: FolderKanban, roles: ['INSTITUTION_ADMIN', 'JTM_ADMIN', 'DEVOPS'] },
  { id: 'logbook', label: 'Log Mingguan', icon: BookOpen, roles: ['STUDENT', 'SUPERVISOR'] },
  { id: 'documents', label: 'Dokumen', icon: FileText, roles: ['STUDENT', 'SUPERVISOR', 'PANEL'] },
  { id: 'milestones', label: 'Milestone & Viva', icon: CalendarClock, roles: ['STUDENT', 'SUPERVISOR', 'PANEL', 'INSTITUTION_ADMIN'] },
  { id: 'evaluations', label: 'Penilaian Rubrik', icon: ClipboardCheck, roles: ['STUDENT', 'SUPERVISOR', 'PANEL'] },
  { id: 'rubrics', label: 'Templat Rubrik', icon: ScrollText, roles: ['JTM_ADMIN', 'INSTITUTION_ADMIN', 'SUPERVISOR', 'PANEL', 'STUDENT'] },
  { id: 'equipment', label: 'Inventori Makmal', icon: Wrench, roles: ['STUDENT', 'SUPERVISOR', 'INSTITUTION_ADMIN', 'JTM_ADMIN'] },
  { id: 'repository', label: 'Repositori Arkib', icon: Archive, roles: ['STUDENT', 'SUPERVISOR', 'PANEL', 'INSTITUTION_ADMIN', 'JTM_ADMIN', 'DEVOPS'] },
  { id: 'ai-history', label: 'Sejarah AI', icon: Sparkles, roles: ['STUDENT', 'SUPERVISOR'] },
  { id: 'analytics', label: 'Analitik Kebangsaan', icon: PanelTop, roles: ['JTM_ADMIN', 'INSTITUTION_ADMIN'] },
  { id: 'users', label: 'Pengurusan Pengguna', icon: Users, roles: ['INSTITUTION_ADMIN', 'JTM_ADMIN', 'DEVOPS'] },
  { id: 'audit-logs', label: 'Jejak Audit', icon: ScrollText, roles: ['JTM_ADMIN', 'INSTITUTION_ADMIN', 'DEVOPS'] },
  { id: 'notifications', label: 'Notifikasi', icon: Bell, roles: ['STUDENT', 'SUPERVISOR', 'PANEL', 'INSTITUTION_ADMIN', 'JTM_ADMIN', 'DEVOPS'] },
  { id: 'profile', label: 'Profil Saya', icon: UserCircle, roles: ['STUDENT', 'SUPERVISOR', 'PANEL', 'INSTITUTION_ADMIN', 'JTM_ADMIN', 'DEVOPS'] },
]

export function AppShell({ children, activeView, onNavigate }: { children: React.ReactNode; activeView: ViewId; onNavigate: (v: ViewId) => void }) {
  const { user, logout } = useAuth()
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [mobileNav, setMobileNav] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  const navItems = useMemo(() => NAV.filter((n) => user && n.roles.includes(user.role)), [user])
  const unreadCount = notifs.filter((n) => !n.isRead).length

  const loadNotifs = async () => {
    const r = await api<Notif[]>('/api/notifications?limit=15')
    if (r.success && r.data) setNotifs(r.data)
  }

  useEffect(() => {
    if (user) loadNotifs()
    const t = setInterval(() => { if (user) loadNotifs() }, 60000)
    return () => clearInterval(t)
  }, [user])

  async function markAllRead() {
    await api('/api/notifications/read', { method: 'POST', body: JSON.stringify({}) })
    setNotifs((n) => n.map((x) => ({ ...x, isRead: true })))
    toast.success('Semua notifikasi ditanda sebagai dibaca')
  }

  async function markOneRead(id: string) {
    await api('/api/notifications/read', { method: 'POST', body: JSON.stringify({ id }) })
    setNotifs((n) => n.map((x) => x.id === id ? { ...x, isRead: true } : x))
  }

  if (!user) return null

  const roleIcon = { STUDENT: GraduationCap, SUPERVISOR: Users, PANEL: ShieldCheck, INSTITUTION_ADMIN: Building2, JTM_ADMIN: ShieldCheck, DEVOPS: Settings }[user.role]

  function NavList() {
    return (
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = activeView === item.id
          return (
            <button
              key={item.id + item.label}
              onClick={() => { onNavigate(item.id); setMobileNav(false) }}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all w-full text-left',
                active ? 'glass-button font-semibold' : 'text-slate-300 hover:bg-white/8 hover:text-white'
              )}
            >
              <Icon className="h-4.5 w-4.5 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
              {item.id === 'notifications' && unreadCount > 0 && (
                <span className="ml-auto text-[10px] bg-rose-500 text-white rounded-full h-4 min-w-4 px-1 flex items-center justify-center">{unreadCount}</span>
              )}
            </button>
          )
        })}
      </nav>
    )
  }

  function Sidebar() {
    return (
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center">
              <Zap className="h-5 w-5 text-amber-300" fill="currentColor" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 font-medium tracking-wide leading-tight">JABATAN TENAGA MANUSIA</p>
              <p className="text-sm font-bold text-white leading-tight truncate">Portal FYP TVET</p>
            </div>
          </div>
        </div>
        {/* User card */}
        <div className="px-3 py-3 border-b border-white/8">
          <div className="glass rounded-lg p-3 flex items-center gap-3">
            <div className={cn('h-10 w-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-semibold text-sm flex-shrink-0', avatarColor(user.fullName))}>
              {initials(user.fullName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{user.fullName}</p>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                {(() => { const RI = roleIcon; return <RI className="h-3 w-3" /> })()}
                {ROLE_LABELS[user.role]}
              </p>
            </div>
          </div>
        </div>
        {/* Nav */}
        <ScrollArea className="flex-1 px-3 py-3">
          <NavList />
        </ScrollArea>
        {/* Footer */}
        <div className="px-3 py-3 border-t border-white/8">
          <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-rose-300 hover:bg-rose-500/10 transition w-full">
            <LogOut className="h-4 w-4" /> Log Keluar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 glass-nav border-b border-white/8">
        <div className="flex items-center justify-between px-4 lg:px-6 h-16">
          <div className="flex items-center gap-3">
            {/* Mobile nav trigger */}
            <Sheet open={mobileNav} onOpenChange={setMobileNav}>
              <SheetTrigger asChild>
                <button className="lg:hidden glass p-2 rounded-lg text-slate-200">
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 bg-transparent border-0">
                <div className="glass-strong h-full">
                  <Sidebar />
                </div>
              </SheetContent>
            </Sheet>
            <div className="hidden md:flex items-center gap-2">
              <h1 className="text-lg font-bold text-white">
                {navItems.find((n) => n.id === activeView)?.label || 'Dashboard'}
              </h1>
              <ChevronRight className="h-4 w-4 text-slate-500" />
              <span className="text-xs text-slate-400">Portal FYP TVET</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
              <DropdownMenuTrigger asChild>
                <button className="relative glass p-2.5 rounded-lg text-slate-200 hover:bg-white/10 transition">
                  <Bell className="h-4.5 w-4.5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 text-[9px] bg-rose-500 text-white rounded-full h-4 min-w-4 px-1 flex items-center justify-center animate-pulse">{unreadCount}</span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0 glass-strong border-white/15">
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                  <span className="text-sm font-semibold text-white">Notifikasi</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-[11px] text-sky-300 hover:text-sky-200">Tanda semua dibaca</button>
                  )}
                </div>
                <ScrollArea className="h-[360px]">
                  {notifs.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-400">Tiada notifikasi</div>
                  ) : notifs.map((n) => (
                    <div key={n.id} className={cn('px-3 py-2.5 border-b border-white/5 hover:bg-white/5 cursor-pointer', !n.isRead && 'bg-sky-500/5')} onClick={() => markOneRead(n.id)}>
                      <div className="flex items-start gap-2">
                        {!n.isRead && <span className="h-2 w-2 rounded-full bg-sky-400 mt-1.5 flex-shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <p className={cn('text-xs font-semibold', n.isRead ? 'text-slate-300' : 'text-white')}>{n.title}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-slate-500 mt-1">{timeAgo(n.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
                <button onClick={() => { onNavigate('notifications'); setNotifOpen(false) }} className="w-full text-center text-xs text-sky-300 hover:text-sky-200 py-2 border-t border-white/10">
                  Lihat semua notifikasi
                </button>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 glass rounded-lg pl-1.5 pr-3 py-1.5 hover:bg-white/10 transition">
                  <div className={cn('h-7 w-7 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-semibold', avatarColor(user.fullName))}>
                    {initials(user.fullName)}
                  </div>
                  <span className="hidden md:inline text-xs text-slate-200 max-w-[120px] truncate">{user.fullName.split(' ')[0]}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 glass-strong border-white/15">
                <div className="px-3 py-2 border-b border-white/10">
                  <p className="text-sm font-semibold text-white truncate">{user.fullName}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                  <Badge className="mt-1.5 text-[10px]">{ROLE_LABELS[user.role]}</Badge>
                </div>
                <DropdownMenuItem onClick={() => onNavigate('profile')} className="text-slate-200 hover:bg-white/10 cursor-pointer">
                  <UserCircle className="h-4 w-4 mr-2" /> Profil Saya
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onNavigate('notifications')} className="text-slate-200 hover:bg-white/10 cursor-pointer">
                  <Bell className="h-4 w-4 mr-2" /> Notifikasi
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={logout} className="text-rose-300 hover:bg-rose-500/10 cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" /> Log Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Body: sidebar + main */}
      <div className="flex-1 flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-64 flex-shrink-0 glass-nav border-r border-white/8 sticky top-16 h-[calc(100vh-4rem)]">
          <Sidebar />
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 lg:p-6">
          <div className="max-w-7xl mx-auto animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>

      {/* Footer (sticky bottom) */}
      <footer className="mt-auto glass-nav border-t border-white/8 px-4 lg:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
          <p>© 2026 Jabatan Tenaga Manusia (JTM), KESUMA • Portal FYP TVET v1.0</p>
          <p className="flex items-center gap-2">
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
            Sistem Dilindungi RBAC • PDPA 2010 • TLS 1.3
          </p>
        </div>
      </footer>

      {/* AI Assistant floating */}
      <AiAssistant />
    </div>
  )
}

export type { ViewId }
