import { create } from 'zustand'
import type { WatchedCompany } from '@/hooks/useWatchList'

interface AppUser {
  id: string
  email: string
}

interface AppState {
  // Auth
  user: AppUser | null
  isAuthenticated: boolean
  isSupabaseEnabled: boolean
  setUser: (user: AppUser | null) => void
  setSupabaseEnabled: (enabled: boolean) => void

  // UI
  authModalOpen: boolean
  watchListOpen: boolean
  historySidebarOpen: boolean
  setAuthModalOpen: (open: boolean) => void
  setWatchListOpen: (open: boolean) => void
  setHistorySidebarOpen: (open: boolean) => void
  toggleHistorySidebar: () => void
  toggleWatchList: () => void

  // Watch List
  watchedDomains: WatchedCompany[]
  setWatchedDomains: (domains: WatchedCompany[]) => void
  addWatch: (entry: WatchedCompany) => void
  removeWatch: (id: string) => void
  isWatching: (domain: string) => boolean

  // Usage
  usage: Record<string, number>
  quotas: Record<string, number>
  usageEnabled: boolean
  setUsage: (usage: Record<string, number>) => void
  setQuotas: (quotas: Record<string, number>) => void
  setUsageEnabled: (enabled: boolean) => void
  canUse: (type: string) => boolean
  incrementUsage: (type: string) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // Auth
  user: null,
  isAuthenticated: false,
  isSupabaseEnabled: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setSupabaseEnabled: (enabled) => set({ isSupabaseEnabled: enabled }),

  // UI
  authModalOpen: false,
  watchListOpen: false,
  historySidebarOpen: false,
  setAuthModalOpen: (open) => set({ authModalOpen: open }),
  setWatchListOpen: (open) => set({ watchListOpen: open }),
  setHistorySidebarOpen: (open) => set({ historySidebarOpen: open }),
  toggleHistorySidebar: () => set((s) => ({ historySidebarOpen: !s.historySidebarOpen })),
  toggleWatchList: () => set((s) => ({ watchListOpen: !s.watchListOpen })),

  // Watch List
  watchedDomains: [],
  setWatchedDomains: (domains) => set({ watchedDomains: domains }),
  addWatch: (entry) =>
    set((s) => {
      if (s.watchedDomains.some((w) => w.domain === entry.domain)) return s
      return { watchedDomains: [entry, ...s.watchedDomains] }
    }),
  removeWatch: (id) =>
    set((s) => ({ watchedDomains: s.watchedDomains.filter((w) => w.id !== id) })),
  isWatching: (domain) => get().watchedDomains.some((w) => w.domain === domain),

  // Usage
  usage: { researches: 0, comparisons: 0, discovers: 0, talents: 0 },
  quotas: { researches: 10, comparisons: 3, discovers: 5, talents: 5 },
  usageEnabled: false,
  setUsage: (usage) => set({ usage }),
  setQuotas: (quotas) => set({ quotas }),
  setUsageEnabled: (enabled) => set({ usageEnabled: enabled }),
  canUse: (type) => {
    const s = get()
    if (!s.usageEnabled) return true
    return (s.usage[type] ?? 0) < (s.quotas[type] ?? Infinity)
  },
  incrementUsage: (type) =>
    set((s) => ({
      usage: { ...s.usage, [type]: (s.usage[type] ?? 0) + 1 },
    })),
}))
