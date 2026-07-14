'use client'

import { useEffect, useState } from 'react'
import { useAuth, api } from '@/lib/store'
import { GlassCard, EmptyState, GradientButton, StatusBadge } from '@/components/glass-ui'
import { STATUS_LABELS, formatDate } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import {
  Loader2, FileText, Plus, Image as ImageIcon, Video, Upload, MessageSquare,
  CheckCircle2, File, Download, Clock,
} from 'lucide-react'

interface Project { id: string; title: string; field: string }
interface DocItem {
  id: string
  type: string
  title: string
  fileName: string
  filePath: string
  fileSize: number
  mimeType?: string | null
  version: number
  status: string
  createdAt: string
  reviewedAt?: string | null
  uploadedBy?: { id: string; fullName: string; email: string }
  comments?: any[]
}

const TYPE_LABELS: Record<string, string> = {
  PROPOSAL: 'Cadangan',
  DRAFT_CHAPTER: 'Draf Bab',
  FINAL_REPORT: 'Laporan Akhir',
  POSTER: 'Poster',
  VIDEO_DEMO: 'Video Demo',
  BOM: 'BOM',
}

function fileIcon(mime?: string | null) {
  if (!mime) return <File className="h-4 w-4 text-slate-300" />
  if (mime.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-sky-300" />
  if (mime.startsWith('video/')) return <Video className="h-4 w-4 text-purple-300" />
  if (mime === 'application/pdf') return <FileText className="h-4 w-4 text-rose-300" />
  return <File className="h-4 w-4 text-slate-300" />
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function DocumentsView() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [docs, setDocs] = useState<DocItem[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [commenting, setCommenting] = useState<DocItem | null>(null)
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    (async () => {
      const r = await api<Project[]>('/api/projects?limit=100')
      if (r.success && r.data) {
        setProjects(r.data)
        if (r.data.length > 0) setSelectedProject(r.data[0].id)
      }
      setLoading(false)
    })()
  }, [])

  useEffect(() => {
    if (!selectedProject) return
    ;(async () => {
      setLoading(true)
      const r = await api<DocItem[]>(`/api/documents?projectId=${selectedProject}`)
      if (r.success && r.data) setDocs(r.data)
      setLoading(false)
    })()
  }, [selectedProject])

  async function comment() {
    if (!commenting || !commentText.trim()) return
    setSubmitting(true)
    const r = await api(`/api/documents/${commenting.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'comment', comment: commentText }),
    })
    setSubmitting(false)
    if (r.success) {
      toast.success(r.message || 'Komen ditambah')
      setCommentOpen(false)
      setCommenting(null)
      setCommentText('')
      const rr = await api<DocItem[]>(`/api/documents?projectId=${selectedProject}`)
      if (rr.success && rr.data) setDocs(rr.data)
    } else toast.error(r.error || 'Gagal')
  }

  async function approve(doc: DocItem) {
    if (!confirm('Luluskan dokumen ini?')) return
    setSubmitting(true)
    const r = await api(`/api/documents/${doc.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'approve' }) })
    setSubmitting(false)
    if (r.success) {
      toast.success(r.message || 'Diluluskan')
      const rr = await api<DocItem[]>(`/api/documents?projectId=${selectedProject}`)
      if (rr.success && rr.data) setDocs(rr.data)
    } else toast.error(r.error || 'Gagal')
  }

  if (!user) return null
  const isStudent = user.role === 'STUDENT'
  const canReview = ['SUPERVISOR', 'INSTITUTION_ADMIN', 'JTM_ADMIN'].includes(user.role)

  return (
    <div className="space-y-6">
      <GlassCard className="animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white flex items-center gap-2"><FileText className="h-5 w-5 text-indigo-300" /> Pengurusan Dokumen</h2>
            <p className="text-sm text-slate-400 mt-1">Muat naik & semakan dokumen projek (maksimum 50MB).</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="glass-input w-full md:w-72"><SelectValue placeholder="Pilih projek..." /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
            {isStudent && (
              <GradientButton onClick={() => setCreateOpen(true)} disabled={!selectedProject}>
                <Plus className="h-4 w-4" /> Muat Naik Dokumen
              </GradientButton>
            )}
          </div>
        </div>
      </GlassCard>

      {!selectedProject ? (
        <GlassCard><EmptyState icon={<FileText className="h-7 w-7 text-slate-400" />} title="Pilih projek" /></GlassCard>
      ) : loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-400" /></div>
      ) : docs.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon={<FileText className="h-7 w-7 text-slate-400" />}
            title="Tiada dokumen"
            description={isStudent ? 'Muat naik dokumen pertama projek ini.' : 'Pelajar belum memuat naik dokumen.'}
            action={isStudent && <GradientButton onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Muat Naik</GradientButton>}
          />
        </GlassCard>
      ) : (
        <GlassCard className="animate-fade-in-up overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-slate-300 text-xs">Fail</TableHead>
                  <TableHead className="text-slate-300 text-xs">Jenis</TableHead>
                  <TableHead className="text-slate-300 text-xs">Versi</TableHead>
                  <TableHead className="text-slate-300 text-xs">Saiz</TableHead>
                  <TableHead className="text-slate-300 text-xs">Status</TableHead>
                  <TableHead className="text-slate-300 text-xs">Dimuat Naik</TableHead>
                  <TableHead className="text-slate-300 text-xs text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((d) => (
                  <TableRow key={d.id} className="border-white/5 hover:bg-white/5">
                    <TableCell>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-lg glass flex items-center justify-center flex-shrink-0">{fileIcon(d.mimeType)}</div>
                        <div className="min-w-0">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="text-sm font-medium text-white truncate max-w-[220px]">{d.title}</p>
                              </TooltipTrigger>
                              <TooltipContent><p>{d.title}</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <p className="text-[10px] text-slate-400 truncate">{d.fileName}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-xs text-slate-300">{TYPE_LABELS[d.type] || d.type}</span></TableCell>
                    <TableCell>
                      <span className="text-xs glass px-1.5 py-0.5 rounded text-slate-200">v{d.version}</span>
                    </TableCell>
                    <TableCell><span className="text-xs text-slate-300">{formatSize(d.fileSize)}</span></TableCell>
                    <TableCell><StatusBadge status={d.status} label={STATUS_LABELS[d.status] || d.status} /></TableCell>
                    <TableCell>
                      <p className="text-xs text-slate-300">{d.uploadedBy?.fullName || '-'}</p>
                      <p className="text-[10px] text-slate-500">{formatDate(d.createdAt, true)}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <a href={d.filePath} target="_blank" rel="noopener noreferrer" className="glass p-1.5 rounded text-slate-300 hover:bg-white/10" title="Muat turun / buka">
                          <Download className="h-3.5 w-3.5" />
                        </a>
                        {canReview && (
                          <>
                            <button onClick={() => { setCommenting(d); setCommentText(''); setCommentOpen(true) }} className="glass p-1.5 rounded text-sky-300 hover:bg-white/10" title="Komen">
                              <MessageSquare className="h-3.5 w-3.5" />
                            </button>
                            {d.status !== 'APPROVED' && (
                              <button onClick={() => approve(d)} disabled={submitting} className="glass p-1.5 rounded text-emerald-300 hover:bg-white/10" title="Luluskan">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </GlassCard>
      )}

      {/* Upload dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="glass-strong border-white/15 max-w-lg">
          <UploadDocumentDialog
            projectId={selectedProject}
            onClose={() => setCreateOpen(false)}
            onCreated={() => {
              setCreateOpen(false)
              ;(async () => {
                const r = await api<DocItem[]>(`/api/documents?projectId=${selectedProject}`)
                if (r.success && r.data) setDocs(r.data)
              })()
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Comment dialog */}
      <Dialog open={commentOpen} onOpenChange={setCommentOpen}>
        <DialogContent className="glass-strong border-white/15 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><MessageSquare className="h-5 w-5 text-sky-300" /> Tambah Komen</DialogTitle>
            <DialogDescription className="text-slate-400">{commenting?.title} (v{commenting?.version})</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {commenting?.comments && commenting.comments.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {commenting.comments.map((c: any, i: number) => (
                  <div key={c.id || i} className="glass rounded-lg p-2.5">
                    <p className="text-xs text-slate-200">{c.comment}</p>
                    <p className="text-[10px] text-slate-500 mt-1">— {c.userName} • {formatDate(c.at, true)}</p>
                  </div>
                ))}
              </div>
            )}
            <div>
              <Label className="text-slate-300 text-xs">Komen</Label>
              <Textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Tulis komen untuk pelajar..." rows={4} className="glass-input mt-1.5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCommentOpen(false)} className="text-slate-300">Batal</Button>
            <Button onClick={comment} disabled={submitting || !commentText.trim()} className="glass-button">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
              Hantar Komen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function UploadDocumentDialog({ projectId, onClose, onCreated }: { projectId: string; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    type: 'PROPOSAL',
    title: '',
    fileName: '',
    filePath: '',
    fileSize: 0,
    mimeType: 'application/pdf',
  })
  const [submitting, setSubmitting] = useState(false)

  function setField(k: string, v: any) { setForm((f) => ({ ...f, [k]: v })) }

  async function submit() {
    if (!form.title.trim() || !form.fileName.trim() || !form.filePath.trim()) {
      toast.error('Tajuk, nama fail dan URL fail diperlukan')
      return
    }
    if (form.fileSize > 50 * 1024 * 1024) {
      toast.error('Saiz fail melebihi 50MB')
      return
    }
    setSubmitting(true)
    const r = await api('/api/documents', {
      method: 'POST',
      body: JSON.stringify({ ...form, projectId, fileSize: Number(form.fileSize) }),
    })
    setSubmitting(false)
    if (r.success) {
      toast.success(r.message || 'Dokumen dimuat naik')
      onCreated()
    } else toast.error(r.error || 'Gagal')
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-white flex items-center gap-2"><Upload className="h-5 w-5 text-indigo-300" /> Muat Naik Dokumen</DialogTitle>
        <DialogDescription className="text-slate-400">Versi auto-dinaikkan jika tajuk & jenis sama wujud.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-slate-300 text-xs">Jenis Dokumen</Label>
            <Select value={form.type} onValueChange={(v) => setField('type', v)}>
              <SelectTrigger className="glass-input w-full mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-slate-300 text-xs">Saiz Fail (MB)</Label>
            <Input
              type="number"
              min={0}
              max={50}
              step="0.01"
              value={form.fileSize ? (form.fileSize / (1024 * 1024)).toFixed(2) : ''}
              onChange={(e) => setField('fileSize', Math.round(parseFloat(e.target.value || '0') * 1024 * 1024))}
              className="glass-input mt-1.5"
            />
          </div>
        </div>
        <div>
          <Label className="text-slate-300 text-xs">Tajuk *</Label>
          <Input value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="cth: Cadangan Projek v1" className="glass-input mt-1.5" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-slate-300 text-xs">Nama Fail *</Label>
            <Input value={form.fileName} onChange={(e) => setField('fileName', e.target.value)} placeholder="cadangan-v1.pdf" className="glass-input mt-1.5" />
          </div>
          <div>
            <Label className="text-slate-300 text-xs">Jenis MIME</Label>
            <Select value={form.mimeType} onValueChange={(v) => setField('mimeType', v)}>
              <SelectTrigger className="glass-input w-full mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="application/pdf">application/pdf</SelectItem>
                <SelectItem value="image/png">image/png</SelectItem>
                <SelectItem value="image/jpeg">image/jpeg</SelectItem>
                <SelectItem value="video/mp4">video/mp4</SelectItem>
                <SelectItem value="application/vnd.ms-excel">application/vnd.ms-excel</SelectItem>
                <SelectItem value="application/msword">application/msword</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-slate-300 text-xs">URL Fail (placeholder) *</Label>
          <Input value={form.filePath} onChange={(e) => setField('filePath', e.target.value)} placeholder="https://example.com/files/cadangan.pdf" className="glass-input mt-1.5" />
          <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Demo: gunakan URL awan sebagai pengganti storan fail sebenar.
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose} className="text-slate-300">Batal</Button>
        <Button onClick={submit} disabled={submitting} className="glass-button">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Muat Naik
        </Button>
      </DialogFooter>
    </>
  )
}
