import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface OnboardingState {
  hasSeenWelcome: boolean
  hasSeenLensHint: boolean
  hasSeenToneHint: boolean
  hasSeenContextHint: boolean
  completedResearchCount: number
  hasSeenPostResearchNudge: boolean
  dismissWelcome: () => void
  dismissLensHint: () => void
  dismissToneHint: () => void
  dismissContextHint: () => void
  recordResearch: () => void
  dismissPostResearchNudge: () => void
}

export const useOnboarding = create<OnboardingState>()(
  persist(
    (set) => ({
      hasSeenWelcome: false,
      hasSeenLensHint: false,
      hasSeenToneHint: false,
      hasSeenContextHint: false,
      completedResearchCount: 0,
      hasSeenPostResearchNudge: false,
      dismissWelcome: () => set({ hasSeenWelcome: true }),
      dismissLensHint: () => set({ hasSeenLensHint: true }),
      dismissToneHint: () => set({ hasSeenToneHint: true }),
      dismissContextHint: () => set({ hasSeenContextHint: true }),
      recordResearch: () => set((s) => ({ completedResearchCount: s.completedResearchCount + 1 })),
      dismissPostResearchNudge: () => set({ hasSeenPostResearchNudge: true }),
    }),
    { name: 'ra-onboarding' }
  )
)
