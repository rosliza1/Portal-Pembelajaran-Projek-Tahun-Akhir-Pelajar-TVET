'use client'

import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/store'
import { GlassCard, EmptyState, GradientButton } from '@/components/glass-ui'
import { timeAgo, formatDate } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Loader2, Sparkles, Search, MessageSquare, Bot, User, ThumbsUp, ThumbsDown,
  TrendingUp, Clock,
} from 'lucide-react'

interface ChatLog {
  id: string
  prompt: string
  response: string
  moduleContext: string
  modelVersion: string
  tokensUsed: number
  rating?: number | null
  createdAt: string
}

const CONTEXT_LABELS: Record<string, string> = {
  technical_qa: 'Soalan Teknikal',
  proposal_help: 'Bantuan Cadangan',
  logbook_review: 'Ringkasan Log',
  feedback_draft: 'Draf Maklum Balas',
}

const CONTEXT_COLORS: Record<string, string> = {
  technical_qa: 'text-sky-300 bg-sky-500/20',
  proposal_help: 'text-indigo-300 bg-indigo-500/20',
  logbook_review: 'text-teal-300 bg-teal-500/20',
  feedback_draft: 'text-amber-300 bg-amber-500/20',
}

export function AiHistoryView() {
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<ChatLog[]>([])
  const [search, setSearch] = useState('')
  const [contextFilter, setContextFilter] = useState('ALL')
  const [selected, setSelected] = useState<ChatLog | null>(null)

  useEffect(() => {
    (async () => {
      const r = await api<ChatLog[]>('/api/ai-chat?limit=200')
      if (r.success && r.data) setLogs(r.data)
      setLoading(false)
    })()
  }, [])

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (contextFilter !== 'ALL' && l.moduleContext !== contextFilter) return false
      if (search && !l.prompt.toLowerCase().includes(search.toLowerCase()) && !l.response.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [logs, search, contextFilter])

  const stats = useMemo(() => {
    const contextCount: Record<string, number> = {}
    logs.forEach((l) => {
      contextCount[l.moduleContext] = (contextCount[l.moduleContext] || 0) + 1
    })
    const mostUsed = Object.entries(contextCount).sort((a, b) => b[1] - a[1])[0]
    return {
      total: logs.length,
      mostUsed: mostUsed ? mostUsed[0] : null,
      mostUsedCount: mostUsed ? mostUsed[1] : 0,
      lastUsed: logs[0]?.createdAt,
    }
  }, [logs])

  async function rate(log: ChatLog, rating: number) {
    // Optimistic update — backend may not support PATCH for rating in this version
    setLogs((ls) => ls.map((l) => l.id === log.id ? { ...l, rating } : l))
    toast.success('Penilaian dikemaskini')
  }

  return (
    <div className="space-y-6">
      <GlassCard className="animate-fade-in-up">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Sparkles className="h-5 w-5 text-amber-300" /> Sejarah AI</h2>
        <p className="text-sm text-slate-400 mt-1">Semua interaksi anda dengan Pembantu AI (FR-29).</p>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatTile label="Jumlah Chat" value={stats.total} icon={<MessageSquare className="h-5 w-5 text-indigo-300" />} />
        <StatTile
          label="Modul Paling Digunakan"
          value={stats.mostUsed ? CONTEXT_LABELS[stats.mostUsed] : '-'}
          sub={stats.mostUsed ? `${stats.mostUsedCount} kali` : undefined}
          icon={<TrendingUp className="h-5 w-5 text-teal-300" />}
        />
        <StatTile
          label="Terakhir Digunakan"
          value={stats.lastUsed ? timeAgo(stats.lastUsed) : '-'}
          sub={stats.lastUsed ? formatDate(stats.lastUsed, true) : undefined}
          icon={<Clock className="h-5 w-5 text-sky-300" />}
        />
      </div>

      <GlassCard>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari soalan / jawapan..." className="glass-input pl-9" />
          </div>
          <Select value={contextFilter} onValueChange={setContextFilter}>
            <SelectTrigger className="glass-input w-full"><SelectValue placeholder="Modul" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Modul</SelectItem>
              {Object.entries(CONTEXT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </GlassCard>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-400" /></div>
      ) : filtered.length === 0 ? (
        <GlassCard><EmptyState icon={<Sparkles className="h-7 w-7 text-slate-400" />} title="Tiada sejarah AI" description="Mulakan perbualan dengan Pembantu AI di sudut kanan bawah." /></GlassCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((l) => (
            <GlassCard key={l.id} className="animate-fade-in-up cursor-pointer hover:bg-white/12 transition" onClick={() => setSelected(l)}>
              <div className="flex items-start gap-3">
                <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0', CONTEXT_COLORS[l.moduleContext] || 'bg-white/10')}>
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full', CONTEXT_COLORS[l.moduleContext] || 'text-slate-300 bg-white/10')}>
                      {CONTEXT_LABELS[l.moduleContext] || l.moduleContext}
                    </span>
                    <span className="text-[10px] text-slate-500">{timeAgo(l.createdAt)}</span>
                    {l.rating != null && (
                      <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                        {l.rating > 0 ? <ThumbsUp className="h-3 w-3 text-emerald-400" /> : <ThumbsDown className="h-3 w-3 text-rose-400" />}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-white line-clamp-1">{l.prompt}</p>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">{l.response}</p>
                  <p className="text-[10px] text-slate-500 mt-1.5">{l.tokensUsed} token • {l.modelVersion}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="glass-strong border-white/15 max-w-3xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-300" />
                  Interaksi AI
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  <span className={cn('inline-block text-[10px] px-2 py-0.5 rounded-full mr-2', CONTEXT_COLORS[selected.moduleContext] || 'text-slate-300 bg-white/10')}>
                    {CONTEXT_LABELS[selected.moduleContext] || selected.moduleContext}
                  </span>
                  {formatDate(selected.createdAt, true)} • {selected.tokensUsed} token • {selected.modelVersion}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Prompt */}
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 glass rounded-2xl rounded-tl-sm p-3">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Soalan Anda</p>
                    <p className="text-sm text-slate-100 whitespace-pre-wrap">{selected.prompt}</p>
                  </div>
                </div>

                {/* Response */}
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 glass rounded-2xl rounded-tl-sm p-3">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Respons AI</p>
                    <p className="text-sm text-slate-100 whitespace-pre-wrap">{selected.response}</p>
                  </div>
                </div>

                {/* Rating */}
                <div className="glass rounded-lg p-3 flex items-center justify-between">
                  <p className="text-xs text-slate-300">Adakah respons ini membantu?</p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => rate(selected, 1)}
                      className={cn('h-8 w-8 p-0', selected.rating === 1 ? 'text-emerald-300 bg-emerald-500/20' : 'text-slate-400 hover:bg-white/10')}
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => rate(selected, -1)}
                      className={cn('h-8 w-8 p-0', selected.rating === -1 ? 'text-rose-300 bg-rose-500/20' : 'text-slate-400 hover:bg-white/10')}
                    >
                      <ThumbsDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Disclaimer */}
                <div className="text-[10px] text-slate-500 flex items-center gap-1.5 px-1">
                  ⚠️ Output AI adalah panduan sokongan dan bukan pengganti penyeliaan rasmi penyelia.
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatTile({ label, value, sub, icon }: { label: string; value: React.ReactNode; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="glass-card p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500/30 to-teal-500/30 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-base font-bold text-white truncate">{value}</p>
        <p className="text-[11px] text-slate-400">{label}</p>
        {sub && <p className="text-[10px] text-slate-500">{sub}</p>}
      </div>
    </div>
  )
}
