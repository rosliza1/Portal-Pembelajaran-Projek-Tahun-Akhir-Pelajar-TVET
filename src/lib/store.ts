// Client-side auth store (Zustand)
import { create } from 'zustand'

export type Role = 'STUDENT' | 'SUPERVISOR' | 'PANEL' | 'INSTITUTION_ADMIN' | 'JTM_ADMIN' | 'DEVOPS'

export interface AppUser {
  id: string
  email: string
  fullName: string
  role: Role
  phone?: string | null
  avatarUrl?: string | null
  institutionId?: string | null
  programId?: string | null
  session?: string | null
  isActive: boolean
  institution?: { id: string; name: string; code: string; type: string; state: string } | null
  program?: { id: string; name: string; code: string; field: string } | null
  student?: { id: string; registrationNo: string; cohort: string | null; supervisorId: string | null; supervisor?: { user: { fullName: string; email: string } } | null } | null
  supervisor?: { id: string; staffNo: string; expertiseField: string | null; maxStudents: number } | null
}

interface AuthState {
  user: AppUser | null
  loading: boolean
  setUser: (u: AppUser | null) => void
  setLoading: (b: boolean) => void
  logout: () => Promise<void>
  fetchMe: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (u) => set({ user: u, loading: false }),
  setLoading: (b) => set({ loading: b }),
  logout: async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }) } catch {}
    set({ user: null })
  },
  fetchMe: async () => {
    try {
      const res = await fetch('/api/auth/me')
      const j = await res.json()
      if (j.success) set({ user: j.data, loading: false })
      else set({ user: null, loading: false })
    } catch {
      set({ user: null, loading: false })
    }
  },
}))

// API helper
export async function api<T = any>(url: string, opts: RequestInit = {}): Promise<{ success: boolean; data?: T; error?: string; message?: string }> {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    credentials: 'include',
  })
  try {
    return await res.json()
  } catch {
    return { success: false, error: 'Ralat rangkaian' }
  }
}
