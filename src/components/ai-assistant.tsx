'use client'

import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, Send, X, MessageSquare, Loader2, Bot, User, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatMsg { id?: string; role: 'user' | 'ai'; content: string; context?: string; createdAt?: string }

const CONTEXTS = [
  { value: 'technical_qa', label: 'Soalan Teknikal', desc: 'Litar 3-fasa, beban penyejukan, keselamatan' },
  { value: 'proposal_help', label: 'Bantuan Cadangan', desc: 'Skop, objektif, BOM projek' },
  { value: 'logbook_review', label: 'Ringkasan Log', desc: 'Ringkasan kemajuan mingguan' },
  { value: 'feedback_draft', label: 'Draf Maklum Balas', desc: 'Penjanaan ulasan rubrik' },
]

const SUGGESTED = [
  'Bagaimana mengira beban penyejukan bilik 20m²?',
  'Perbezaan pemula DOL dan Star-Delta?',
  'Piawaian keselamatan elektrik di Malaysia?',
  'Bantu tulis objektif projek kawalan motor PLC',
]

export function AiAssistant({ projectId, context: fixedContext, compact }: { projectId?: string; context?: string; compact?: boolean }) {
  const [open, setOpen] = useState(compact ? true : false)
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'ai', content: 'Assalamualaikum & Salam sejahtera! 👋 Saya Pembantu Pembelajaran TVET. Saya boleh bantu anda dengan soalan teknikal Elektrik Kuasa & RAC, semakan cadangan projek, ringkasan log, dan draf maklum balas. Apa yang boleh saya bantu hari ini?' },
  ])
  const [input, setInput] = useState('')
  const [context, setContext] = useState(fixedContext || 'technical_qa')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send(text?: string) {
    const prompt = (text ?? input).trim()
    if (!prompt || loading) return
    setError(null)
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: prompt, context }])
    setLoading(true)
    const r = await api<{ response: string; logId: string }>('/api/ai-chat', {
      method: 'POST',
      body: JSON.stringify({ prompt, moduleContext: context, projectId }),
    })
    setLoading(false)
    if (r.success && r.data) {
      setMessages((m) => [...m, { role: 'ai', content: r.data!.response, context, createdAt: new Date().toISOString() }])
    } else {
      setError(r.error || 'Pembantu AI tidak dapat dihubungi.')
      setMessages((m) => [...m, { role: 'ai', content: '⚠️ Maaf, saya tidak dapat memproses soalan anda sekarang. Sila hubungi penyelia anda terus untuk bantuan.', context }])
    }
  }

  if (!open && !compact) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 glass-button h-14 px-5 rounded-full flex items-center gap-2 shadow-2xl animate-pulse-glow"
        aria-label="Buka Pembantu AI"
      >
        <Sparkles className="h-5 w-5" />
        <span className="font-semibold">Pembantu AI</span>
      </button>
    )
  }

  return (
    <div className={cn('flex flex-col glass-strong overflow-hidden', compact ? 'h-[500px]' : 'fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-3rem)] rounded-2xl shadow-2xl')}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-to-r from-indigo-600/40 to-teal-600/40">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white flex items-center gap-1.5">
              Pembantu AI <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/20">GLM-4.6</span>
            </p>
            <p className="text-[10px] text-slate-200">Pembantu Pembelajaran TVET</p>
          </div>
        </div>
        {!compact && (
          <button onClick={() => setOpen(false)} className="text-slate-300 hover:text-white p-1 rounded hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Context selector */}
      {!fixedContext && (
        <div className="px-3 py-2 border-b border-white/10 flex gap-1 overflow-x-auto no-scrollbar">
          {CONTEXTS.map((c) => (
            <button
              key={c.value}
              onClick={() => setContext(c.value)}
              title={c.desc}
              className={cn('text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap transition', context === c.value ? 'glass-button' : 'glass text-slate-300 hover:bg-white/10')}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={cn('flex gap-2 animate-fade-in-up', m.role === 'user' && 'flex-row-reverse')}>
            <div className={cn('h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0', m.role === 'ai' ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-indigo-500 to-teal-500')}>
              {m.role === 'ai' ? <Bot className="h-3.5 w-3.5 text-white" /> : <User className="h-3.5 w-3.5 text-white" />}
            </div>
            <div className={cn('max-w-[80%] rounded-2xl px-3.5 py-2 text-sm', m.role === 'ai' ? 'glass text-slate-100 rounded-tl-sm' : 'glass-button text-white rounded-tr-sm')}>
              <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center"><Bot className="h-3.5 w-3.5 text-white" /></div>
            <div className="glass rounded-2xl px-4 py-2.5 flex items-center gap-2 text-slate-300">
              <Loader2 className="h-3 w-3 animate-spin" /> Menjana jawapan...
            </div>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-xs text-amber-300 px-2">
            <AlertTriangle className="h-3 w-3" /> {error}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Suggested prompts */}
      {messages.length <= 1 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
          {SUGGESTED.map((s) => (
            <button key={s} onClick={() => send(s)} className="text-[10px] px-2.5 py-1 rounded-full glass text-slate-300 hover:bg-white/10 hover:text-white transition text-left">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <div className="px-3 py-1.5 text-[9px] text-slate-400 border-t border-white/5 bg-black/20">
        ⚠️ Output AI adalah panduan sokongan dan bukan pengganti penyeliaan rasmi penyelia.
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10 flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Taip soalan anda..."
          className="glass-input min-h-[40px] max-h-[100px] resize-none text-sm"
          rows={1}
        />
        <Button onClick={() => send()} disabled={loading || !input.trim()} className="glass-button h-10 w-10 p-0 flex-shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
