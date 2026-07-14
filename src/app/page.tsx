'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/store'
import { LoginPage } from '@/components/login-page'
import { AppShell, type ViewId } from '@/components/app-shell'
import { DashboardView } from '@/components/views/dashboard'
import { ProjectsView } from '@/components/views/projects'
import { LogbookView } from '@/components/views/logbook'
import { DocumentsView } from '@/components/views/documents'
import { MilestonesView } from '@/components/views/milestones'
import { EvaluationsView } from '@/components/views/evaluations'
import { RubricsView } from '@/components/views/rubrics'
import { EquipmentView } from '@/components/views/equipment'
import { RepositoryView } from '@/components/views/repository'
import { AiHistoryView } from '@/components/views/ai-history'
import { UsersView } from '@/components/views/users'
import { AuditLogsView } from '@/components/views/audit-logs'
import { NotificationsView } from '@/components/views/notifications'
import { ProfileView } from '@/components/views/profile'
import { AnalyticsView } from '@/components/views/analytics'

export default function Home() {
  const { user, loading, fetchMe } = useAuth()
  const [view, setView] = useState<ViewId>('dashboard')

  useEffect(() => { fetchMe() }, [fetchMe])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-indigo-400/30 border-t-indigo-400 animate-spin" />
          <p className="text-slate-300">Memuat Portal FYP TVET...</p>
        </div>
      </div>
    )
  }

  if (!user) return <LoginPage />

  function renderView() {
    switch (view) {
      case 'dashboard': return <DashboardView onNavigate={setView} />
      case 'projects': return <ProjectsView />
      case 'logbook': return <LogbookView />
      case 'documents': return <DocumentsView />
      case 'milestones': return <MilestonesView />
      case 'evaluations': return <EvaluationsView />
      case 'rubrics': return <RubricsView />
      case 'equipment': return <EquipmentView />
      case 'repository': return <RepositoryView />
      case 'ai-history': return <AiHistoryView />
      case 'users': return <UsersView />
      case 'audit-logs': return <AuditLogsView />
      case 'notifications': return <NotificationsView />
      case 'profile': return <ProfileView />
      case 'analytics': return <AnalyticsView />
      default: return <DashboardView onNavigate={setView} />
    }
  }

  return (
    <AppShell activeView={view} onNavigate={setView}>
      {renderView()}
    </AppShell>
  )
}
