'use client'

import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ReactNode, HTMLAttributes } from 'react'

// GlassCard — frosted glass container per PRD §10.1
export function GlassCard({ className, children, strong, ...props }: { className?: string; children: ReactNode; strong?: boolean } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(strong ? 'glass-strong' : 'glass-card', 'p-5', className)} {...props}>
      {children}
    </div>
  )
}

export function GlassSection({ title, subtitle, icon, action, children, className }: { title: string; subtitle?: string; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <GlassCard className={className}>
      <div className="flex items-start justify-between mb-4 gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {icon && <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500/30 to-teal-500/30 flex items-center justify-center flex-shrink-0">{icon}</div>}
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-white truncate">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </GlassCard>
  )
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const cls = `status-${status.toLowerCase().replace(/[^a-z]/g, '_')}`
  return <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', cls)}>{label || status}</span>
}

export function FieldBadge({ field }: { field: string }) {
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', field === 'Elektrik Kuasa' ? 'badge-ek' : 'badge-rac')}>{field}</span>
}

export function StatCard({ label, value, icon, gradient, hint, onClick }: { label: string; value: ReactNode; icon?: ReactNode; gradient?: string; hint?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cn('glass-card p-4 flex items-center gap-4', onClick && 'cursor-pointer')}>
      <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br', gradient || 'from-indigo-500/40 to-teal-500/40')}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-white leading-none">{value}</p>
        <p className="text-xs text-slate-400 mt-1">{label}</p>
        {hint && <p className="text-[10px] text-slate-500 mt-0.5">{hint}</p>}
      </div>
    </div>
  )
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="h-14 w-14 rounded-full glass flex items-center justify-center mb-3">{icon}</div>}
      <p className="text-sm font-medium text-slate-200">{title}</p>
      {description && <p className="text-xs text-slate-400 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function GradientButton({ children, className, ...props }: { children: ReactNode; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn('glass-button px-4 py-2 text-sm font-medium inline-flex items-center gap-2', className)} {...props}>
      {children}
    </button>
  )
}

export function ProgressRing({ value, size = 64, stroke = 6, label }: { value: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke="url(#gradRing)" strokeWidth={stroke} fill="none" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
        <defs>
          <linearGradient id="gradRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold text-white">{Math.round(value)}%</span>
        {label && <span className="text-[9px] text-slate-400">{label}</span>}
      </div>
    </div>
  )
}
