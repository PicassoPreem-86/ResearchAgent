import { useState, useCallback, useEffect } from 'react'
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Header } from '@/components/Header'
import { AuthModal } from '@/components/AuthModal'
import { SearchInput } from '@/components/SearchInput'
import { ResearchProgress } from '@/components/ResearchProgress'
import { ResultsPanel } from '@/components/ResultsPanel'
import { BulkMode } from '@/components/BulkMode'
import { BulkProgress } from '@/components/BulkProgress'
import { BulkResults } from '@/components/BulkResults'
import { ComparisonInput } from '@/components/ComparisonInput'
import { ComparisonProgress } from '@/components/ComparisonProgress'
import { ComparisonResults } from '@/components/ComparisonResults'
import { DiscoverInput } from '@/components/DiscoverInput'
import { DiscoverProgress } from '@/components/DiscoverProgress'
import { DiscoverResults } from '@/components/DiscoverResults'
import { TalentInput } from '@/components/TalentInput'
import { TalentProgress } from '@/components/TalentProgress'
import { TalentResults } from '@/components/TalentResults'
import { HistorySidebar } from '@/components/HistorySidebar'
import { WelcomeModal } from '@/components/WelcomeModal'
import { PostResearchNudge } from '@/components/PostResearchNudge'
import { useResearch } from '@/hooks/useResearch'
import { useBulkResearch } from '@/hooks/useBulkResearch'
import { useComparison } from '@/hooks/useComparison'
import { useDiscover } from '@/hooks/useDiscover'
import { useTalent } from '@/hooks/useTalent'
import { useHistory } from '@/hooks/useHistory'
import { useOnboarding } from '@/hooks/useOnboarding'
import { useAuth } from '@/hooks/useAuth'
import { useUsage } from '@/hooks/useUsage'
import { useWatchList } from '@/hooks/useWatchList'
import { WatchList } from '@/components/WatchList'
import { EXAMPLE_REPORT } from '@/data/exampleReport'
import { Search, Layers, Swords, Crosshair, UserSearch } from 'lucide-react'
import { ErrorState } from '@/components/ErrorState'
import type { ProspectReport } from '@/types/prospect'

type AppMode = 'single' | 'compare' | 'bulk' | 'discover' | 'talent'

const MODE_ROUTES: Record<AppMode, string> = {
  single: '/research',
  compare: '/compare',
  discover: '/discover',
  talent: '/talent',
  bulk: '/bulk',
}

function useCurrentMode(): AppMode {
  const location = useLocation()
  const path = location.pathname
  if (path.startsWith('/compare')) return 'compare'
  if (path.startsWith('/discover')) return 'discover'
  if (path.startsWith('/talent')) return 'talent'
  if (path.startsWith('/bulk')) return 'bulk'
  if (path.startsWith('/research')) return 'single'
  return 'single'
}

function ModeSelector({ mode, onModeSwitch }: { mode: AppMode; onModeSwitch: (m: AppMode) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="flex justify-center mb-6"
    >
      <div className="relative max-w-full">
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-gray-950 to-transparent pointer-events-none z-10 sm:hidden" />
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-gray-950 to-transparent pointer-events-none z-10 sm:hidden" />
        <div className="overflow-x-auto scrollbar-hide sm:overflow-visible" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            {([
              { key: 'single' as AppMode, icon: Search, label: 'Research', tooltip: 'Deep-dive on a single company' },
              { key: 'compare' as AppMode, icon: Swords, label: 'Compare', tooltip: 'Side-by-side analysis of 2-5 companies' },
              { key: 'discover' as AppMode, icon: Crosshair, label: 'Discover', tooltip: 'Find lookalike companies or match your ICP' },
              { key: 'talent' as AppMode, icon: UserSearch, label: 'Talent', tooltip: 'Recruiting intel with candidate outreach' },
              { key: 'bulk' as AppMode, icon: Layers, label: 'Bulk', tooltip: 'Research dozens of domains at once' },
            ] as const).map(({ key, icon: Icon, label, tooltip }) => (
              <div key={key} className="relative group/mode">
                <button
                  onClick={() => onModeSwitch(key)}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                    mode === key
                      ? 'bg-white/[0.08] text-white/80 shadow-sm'
                      : 'text-white/30 hover:text-white/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 rounded-lg bg-gray-900 border border-white/[0.08] text-[11px] text-white/50 whitespace-nowrap opacity-0 group-hover/mode:opacity-100 transition-opacity duration-200 pointer-events-none z-50 shadow-xl hidden sm:block">
                  {tooltip}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function SingleResearchRoute({
  progress,
  report,
  error,
  isResearching,
  scrapeLog,
  startResearch,
  resetSingle,
  loadedReport,
  setLoadedReport,
  isExampleReport,
  handleResetFromResults,
  handleLoadExample,
  handleModeSwitch,
  recordResearch,
  isWatching,
  onWatch,
  onUnwatch,
}: {
  progress: ReturnType<typeof useResearch>['progress']
  report: ProspectReport | null
  error: string | null
  isResearching: boolean
  scrapeLog: ReturnType<typeof useResearch>['scrapeLog']
  startResearch: (domain: string) => void
  resetSingle: () => void
  loadedReport: ProspectReport | null
  setLoadedReport: (r: ProspectReport | null) => void
  isExampleReport: boolean
  handleResetFromResults: () => void
  handleLoadExample: () => void
  handleModeSwitch: (m: AppMode) => void
  recordResearch: () => void
  isWatching?: boolean
  onWatch?: (domain: string) => Promise<void>
  onUnwatch?: (domain: string) => Promise<void>
}) {
  const { domain } = useParams<{ domain: string }>()
  const navigate = useNavigate()
  const { history } = useHistory()

  const activeReport = loadedReport || report

  // Track completed research for post-research nudges
  useEffect(() => {
    if (progress.stage === 'complete' && report) {
      recordResearch()
    }
  }, [progress.stage, report, recordResearch])

  // Navigate to /research/{domain} when research completes
  useEffect(() => {
    if (progress.stage === 'complete' && report) {
      const d = report.company.domain
      navigate(`/research/${encodeURIComponent(d)}`, { replace: true })
    }
  }, [progress.stage, report, navigate])

  // Handle direct URL navigation to /research/:domain
  useEffect(() => {
    if (domain && !loadedReport && !report && !isResearching) {
      const found = history.find(
        (r) => r.company.domain.toLowerCase() === domain.toLowerCase()
      )
      if (found) {
        setLoadedReport(found)
      } else {
        startResearch(domain)
      }
    }
    // Only run when domain or history changes, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, history.length])

  const showInput = progress.stage === 'idle' && !loadedReport && !domain
  const showProgress = isResearching
  const showResults = (progress.stage === 'complete' && report) || loadedReport
  const showError = progress.stage === 'error' && !loadedReport

  return (
    <AnimatePresence mode="wait">
      {showInput && (
        <motion.div
          key="input"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-center min-h-[calc(100vh-12rem)]"
        >
          <SearchInput onSearch={startResearch} isLoading={false} onLoadExample={handleLoadExample} />
        </motion.div>
      )}

      {showProgress && (
        <motion.div
          key="progress"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-center min-h-[calc(100vh-10rem)]"
        >
          <ResearchProgress progress={progress} scrapeLog={scrapeLog} />
        </motion.div>
      )}

      {showResults && activeReport && (
        <motion.div
          key="results"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="pt-4"
        >
          {isExampleReport && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-4xl mx-auto mb-6"
            >
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-brand-500/8 border border-brand-500/15">
                <span className="text-xs text-brand-300/70">
                  This is an example report for stripe.com — research your own company to get started
                </span>
                <motion.button
                  onClick={handleResetFromResults}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors ml-4 shrink-0"
                >
                  Try it yourself →
                </motion.button>
              </div>
            </motion.div>
          )}
          <ResultsPanel
            report={activeReport}
            onReset={handleResetFromResults}
            isWatching={isWatching}
            onWatch={onWatch}
            onUnwatch={onUnwatch}
          />
          {!isExampleReport && (
            <PostResearchNudge
              companyDomain={activeReport.company.domain}
              onSwitchMode={(newMode) => handleModeSwitch(newMode)}
            />
          )}
        </motion.div>
      )}

      {showError && (
        <ErrorState key="error" title="Research failed" error={error} onRetry={() => {
          resetSingle()
          navigate('/research')
        }} />
      )}
    </AnimatePresence>
  )
}

function CompareRoute({
  comparison,
  handleResetFromResults,
  handleReset,
}: {
  comparison: ReturnType<typeof useComparison>
  handleResetFromResults: () => void
  handleReset: () => void
}) {
  const showInput = comparison.progress.stage === 'idle' && !comparison.report
  const showProgress = comparison.isComparing
  const showResults = comparison.progress.stage === 'complete' && comparison.report
  const showError = comparison.progress.stage === 'error'

  return (
    <AnimatePresence mode="wait">
      {showInput && (
        <motion.div
          key="compare-input"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-center min-h-[calc(100vh-12rem)]"
        >
          <ComparisonInput onCompare={comparison.startComparison} isLoading={false} />
        </motion.div>
      )}

      {showProgress && (
        <motion.div
          key="compare-progress"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-center min-h-[calc(100vh-10rem)]"
        >
          <ComparisonProgress message={comparison.progress.message} progress={comparison.progress.progress} />
        </motion.div>
      )}

      {showResults && comparison.report && (
        <motion.div
          key="compare-results"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="pt-4"
        >
          <ComparisonResults report={comparison.report} onReset={handleResetFromResults} />
        </motion.div>
      )}

      {showError && (
        <ErrorState key="compare-error" title="Comparison failed" error={comparison.error} onRetry={handleReset} />
      )}
    </AnimatePresence>
  )
}

function DiscoverRoute({
  discover,
  handleResetFromResults,
  handleReset,
  handleResearchFromDiscover,
}: {
  discover: ReturnType<typeof useDiscover>
  handleResetFromResults: () => void
  handleReset: () => void
  handleResearchFromDiscover: (domain: string) => void
}) {
  const showInput = discover.progress.stage === 'idle' && !discover.results
  const showProgress = discover.isSearching
  const showResults = discover.progress.stage === 'complete' && discover.results
  const showError = discover.progress.stage === 'error'

  return (
    <AnimatePresence mode="wait">
      {showInput && (
        <motion.div
          key="discover-input"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-center min-h-[calc(100vh-12rem)]"
        >
          <DiscoverInput
            onSearchLookalike={discover.discoverLookalike}
            onSearchICP={discover.discoverByICP}
            onSaveICP={discover.saveICP}
            loadICP={discover.loadICP}
            isLoading={false}
          />
        </motion.div>
      )}

      {showProgress && (
        <motion.div
          key="discover-progress"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-center min-h-[calc(100vh-10rem)]"
        >
          <DiscoverProgress
            message={discover.progress.message}
            progress={discover.progress.progress}
          />
        </motion.div>
      )}

      {showResults && discover.results && (
        <motion.div
          key="discover-results"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="pt-4"
        >
          <DiscoverResults
            results={discover.results}
            onReset={handleResetFromResults}
            onResearchDomain={handleResearchFromDiscover}
          />
        </motion.div>
      )}

      {showError && (
        <ErrorState key="discover-error" title="Discovery failed" error={discover.error} onRetry={handleReset} />
      )}
    </AnimatePresence>
  )
}

function TalentRoute({
  talent,
  handleResetFromResults,
  handleReset,
}: {
  talent: ReturnType<typeof useTalent>
  handleResetFromResults: () => void
  handleReset: () => void
}) {
  const showInput = talent.progress.stage === 'idle' && !talent.talentReport
  const showProgress = talent.isSearching
  const showResults = talent.progress.stage === 'complete' && talent.talentReport
  const showError = talent.progress.stage === 'error'

  return (
    <AnimatePresence mode="wait">
      {showInput && (
        <motion.div
          key="talent-input"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-center min-h-[calc(100vh-12rem)]"
        >
          <TalentInput onSearch={talent.searchTalent} isLoading={false} />
        </motion.div>
      )}

      {showProgress && (
        <motion.div
          key="talent-progress"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-center min-h-[calc(100vh-10rem)]"
        >
          <TalentProgress
            message={talent.progress.message}
            progress={talent.progress.progress}
          />
        </motion.div>
      )}

      {showResults && talent.talentReport && (
        <motion.div
          key="talent-results"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="pt-4"
        >
          <TalentResults
            report={talent.talentReport}
            onReset={handleResetFromResults}
          />
        </motion.div>
      )}

      {showError && (
        <ErrorState key="talent-error" title="Candidate search failed" error={talent.error} onRetry={handleReset} />
      )}
    </AnimatePresence>
  )
}

function BulkRoute({
  bulk,
  handleResetFromResults,
}: {
  bulk: ReturnType<typeof useBulkResearch>
  handleResetFromResults: () => void
}) {
  const showInput = !bulk.isProcessing && !bulk.isComplete
  const showProgress = bulk.isProcessing
  const showResults = bulk.isComplete

  return (
    <AnimatePresence mode="wait">
      {showInput && (
        <motion.div
          key="bulk-input"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-center min-h-[calc(100vh-12rem)]"
        >
          <BulkMode onStartBulk={bulk.startBulk} isLoading={false} />
        </motion.div>
      )}

      {showProgress && (
        <motion.div
          key="bulk-progress"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-center min-h-[calc(100vh-10rem)]"
        >
          <BulkProgress
            domainResults={bulk.domainResults}
            currentIndex={bulk.currentIndex}
            total={bulk.total}
            message={bulk.message}
          />
        </motion.div>
      )}

      {showResults && (
        <motion.div
          key="bulk-results"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="pt-4"
        >
          <BulkResults
            domainResults={bulk.domainResults}
            onExportCsv={bulk.exportCsv}
            onReset={handleResetFromResults}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function App() {
  const navigate = useNavigate()
  const mode = useCurrentMode()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [loadedReport, setLoadedReport] = useState<ProspectReport | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const { progress, report, error, isResearching, scrapeLog, startResearch, reset: resetSingle } = useResearch()
  const bulk = useBulkResearch()
  const comparison = useComparison()
  const discover = useDiscover()
  const talent = useTalent()
  const { history, isLoading: historyLoading, refresh: refreshHistory, deleteReport: deleteHistoryReport } = useHistory()
  const { hasSeenWelcome, recordResearch } = useOnboarding()
  const auth = useAuth()
  const usageTracker = useUsage(auth.user?.id)
  const watchList = useWatchList(auth.user?.id)
  const [showWelcome, setShowWelcome] = useState(!hasSeenWelcome)
  const [isExampleReport, setIsExampleReport] = useState(false)
  const [watchListOpen, setWatchListOpen] = useState(false)

  const handleReset = useCallback(() => {
    resetSingle()
    bulk.reset()
    comparison.reset()
    discover.reset()
    talent.reset()
    setLoadedReport(null)
    setIsExampleReport(false)
  }, [resetSingle, bulk, comparison, discover, talent])

  const handleLoadExample = useCallback(() => {
    handleReset()
    setLoadedReport(EXAMPLE_REPORT)
    setIsExampleReport(true)
    navigate('/research/stripe.com')
  }, [handleReset, navigate])

  const handleModeSwitch = useCallback((newMode: AppMode) => {
    handleReset()
    navigate(MODE_ROUTES[newMode])
  }, [handleReset, navigate])

  const handleLoadReport = useCallback((r: ProspectReport) => {
    handleReset()
    setLoadedReport(r)
    navigate(`/research/${encodeURIComponent(r.company.domain)}`)
  }, [handleReset, navigate])

  const handleResetFromResults = useCallback(() => {
    handleReset()
    refreshHistory()
    navigate(MODE_ROUTES[mode])
  }, [handleReset, refreshHistory, navigate, mode])

  const handleResearchFromDiscover = useCallback((domain: string) => {
    discover.reset()
    navigate('/research')
    // Small delay so route mounts before starting research
    setTimeout(() => startResearch(domain), 50)
  }, [discover, navigate, startResearch])

  // Determine if we're on an input screen (for showing mode selector)
  const showSingleInput = mode === 'single' && progress.stage === 'idle' && !loadedReport
  const showBulkInput = mode === 'bulk' && !bulk.isProcessing && !bulk.isComplete
  const showCompareInput = mode === 'compare' && comparison.progress.stage === 'idle' && !comparison.report
  const showDiscoverInput = mode === 'discover' && discover.progress.stage === 'idle' && !discover.results
  const showTalentInput = mode === 'talent' && talent.progress.stage === 'idle' && !talent.talentReport
  const showModeSelector = showSingleInput || showBulkInput || showCompareInput || showDiscoverInput || showTalentInput

  return (
    <div className="min-h-screen relative">
      {showWelcome && (
        <WelcomeModal
          onDismiss={() => setShowWelcome(false)}
          onTryExample={() => {
            setShowWelcome(false)
            handleLoadExample()
          }}
        />
      )}

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-brand-600/[0.07] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-600/[0.04] rounded-full blur-[100px]" />
      </div>

      <Header
        onToggleHistory={() => {
          refreshHistory()
          setHistoryOpen(!historyOpen)
        }}
        historyCount={history.length}
        user={auth.user}
        isAuthEnabled={auth.isSupabaseEnabled}
        onSignInClick={() => setShowAuthModal(true)}
        onSignOut={auth.signOut}
        usage={usageTracker.enabled ? usageTracker.usage : undefined}
        quotas={usageTracker.enabled ? usageTracker.quotas : undefined}
        usageLabel={usageTracker.enabled ? usageTracker.getUsageLabel() : undefined}
        watchCount={watchList.watched.length}
        onToggleWatchList={() => setWatchListOpen(!watchListOpen)}
      />

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSignIn={auth.signInWithEmail}
          onSignUp={auth.signUpWithEmail}
          onGoogleSignIn={auth.signInWithGoogle}
          onMagicLink={auth.signInWithMagicLink}
        />
      )}

      <WatchList
        isOpen={watchListOpen}
        onClose={() => setWatchListOpen(false)}
        watched={watchList.watched}
        onRemove={(id) => watchList.removeFromWatchList(id)}
        onViewReport={(domain) => {
          setWatchListOpen(false)
          navigate(`/research/${encodeURIComponent(domain)}`)
        }}
      />

      <HistorySidebar
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={history}
        isLoading={historyLoading}
        onLoadReport={handleLoadReport}
        onDeleteReport={deleteHistoryReport}
      />

      <main className="relative z-10 px-4 sm:px-6 pt-24 pb-16">
        <AnimatePresence>
          {showModeSelector && (
            <ModeSelector mode={mode} onModeSwitch={handleModeSwitch} />
          )}
        </AnimatePresence>

        <Routes>
          <Route
            path="/"
            element={
              <AnimatePresence mode="wait">
                <motion.div
                  key="home-input"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="flex items-center justify-center min-h-[calc(100vh-12rem)]"
                >
                  <SearchInput onSearch={(domain) => {
                    startResearch(domain)
                    navigate('/research')
                  }} isLoading={false} onLoadExample={handleLoadExample} />
                </motion.div>
              </AnimatePresence>
            }
          />
          <Route
            path="/research/:domain?"
            element={
              <SingleResearchRoute
                progress={progress}
                report={report}
                error={error}
                isResearching={isResearching}
                scrapeLog={scrapeLog}
                startResearch={startResearch}
                resetSingle={resetSingle}
                loadedReport={loadedReport}
                setLoadedReport={setLoadedReport}
                isExampleReport={isExampleReport}
                handleResetFromResults={handleResetFromResults}
                handleLoadExample={handleLoadExample}
                handleModeSwitch={handleModeSwitch}
                recordResearch={recordResearch}
                isWatching={watchList.isWatching((loadedReport || report)?.company?.domain ?? '')}
                onWatch={(d) => watchList.addToWatchList(d)}
                onUnwatch={async (d) => {
                  const item = watchList.watched.find((w) => w.domain === d)
                  if (item) await watchList.removeFromWatchList(item.id)
                }}
              />
            }
          />
          <Route
            path="/compare"
            element={
              <CompareRoute
                comparison={comparison}
                handleResetFromResults={handleResetFromResults}
                handleReset={handleReset}
              />
            }
          />
          <Route
            path="/discover"
            element={
              <DiscoverRoute
                discover={discover}
                handleResetFromResults={handleResetFromResults}
                handleReset={handleReset}
                handleResearchFromDiscover={handleResearchFromDiscover}
              />
            }
          />
          <Route
            path="/talent"
            element={
              <TalentRoute
                talent={talent}
                handleResetFromResults={handleResetFromResults}
                handleReset={handleReset}
              />
            }
          />
          <Route
            path="/bulk"
            element={
              <BulkRoute
                bulk={bulk}
                handleResetFromResults={handleResetFromResults}
              />
            }
          />
          {/* Catch-all: redirect to home */}
          <Route path="*" element={<CatchAll />} />
        </Routes>
      </main>
    </div>
  )
}

function CatchAll() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate('/', { replace: true })
  }, [navigate])
  return null
}
