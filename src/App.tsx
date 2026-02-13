import { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Header } from '@/components/Header'
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
import { useResearch } from '@/hooks/useResearch'
import { useBulkResearch } from '@/hooks/useBulkResearch'
import { useComparison } from '@/hooks/useComparison'
import { useDiscover } from '@/hooks/useDiscover'
import { useTalent } from '@/hooks/useTalent'
import { useHistory } from '@/hooks/useHistory'
import { AlertCircle, RotateCcw, Search, Layers, Swords, Crosshair, UserSearch } from 'lucide-react'
import type { ProspectReport } from '@/types/prospect'

type AppMode = 'single' | 'compare' | 'bulk' | 'discover' | 'talent'

export default function App() {
  const [mode, setMode] = useState<AppMode>('single')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [loadedReport, setLoadedReport] = useState<ProspectReport | null>(null)
  const { progress, report, error, isResearching, scrapeLog, startResearch, reset: resetSingle } = useResearch()
  const bulk = useBulkResearch()
  const comparison = useComparison()
  const discover = useDiscover()
  const talent = useTalent()
  const { history, isLoading: historyLoading, refresh: refreshHistory, deleteReport: deleteHistoryReport } = useHistory()

  const activeReport = loadedReport || report

  const showSingleInput = mode === 'single' && progress.stage === 'idle' && !loadedReport
  const showBulkInput = mode === 'bulk' && !bulk.isProcessing && !bulk.isComplete
  const showCompareInput = mode === 'compare' && comparison.progress.stage === 'idle' && !comparison.report
  const showDiscoverInput = mode === 'discover' && discover.progress.stage === 'idle' && !discover.results
  const showTalentInput = mode === 'talent' && talent.progress.stage === 'idle' && !talent.talentReport
  const showInput = showSingleInput || showBulkInput || showCompareInput || showDiscoverInput || showTalentInput
  const showProgress = mode === 'single' && isResearching
  const showBulkProgress = mode === 'bulk' && bulk.isProcessing
  const showCompareProgress = mode === 'compare' && comparison.isComparing
  const showDiscoverProgress = mode === 'discover' && discover.isSearching
  const showTalentProgress = mode === 'talent' && talent.isSearching
  const showResults = mode === 'single' && ((progress.stage === 'complete' && report) || loadedReport)
  const showBulkResults = mode === 'bulk' && bulk.isComplete
  const showCompareResults = mode === 'compare' && comparison.progress.stage === 'complete' && comparison.report
  const showDiscoverResults = mode === 'discover' && discover.progress.stage === 'complete' && discover.results
  const showTalentResults = mode === 'talent' && talent.progress.stage === 'complete' && talent.talentReport
  const showError = mode === 'single' && progress.stage === 'error' && !loadedReport
  const showCompareError = mode === 'compare' && comparison.progress.stage === 'error'
  const showDiscoverError = mode === 'discover' && discover.progress.stage === 'error'
  const showTalentError = mode === 'talent' && talent.progress.stage === 'error'

  const handleReset = useCallback(() => {
    resetSingle()
    bulk.reset()
    comparison.reset()
    discover.reset()
    talent.reset()
    setLoadedReport(null)
  }, [resetSingle, bulk, comparison, discover, talent])

  const handleModeSwitch = (newMode: AppMode) => {
    handleReset()
    setMode(newMode)
  }

  const handleLoadReport = useCallback((r: ProspectReport) => {
    handleReset()
    setMode('single')
    setLoadedReport(r)
  }, [handleReset])

  const handleResetFromResults = useCallback(() => {
    handleReset()
    refreshHistory()
  }, [handleReset, refreshHistory])

  const handleResearchFromDiscover = useCallback((domain: string) => {
    discover.reset()
    setMode('single')
    startResearch(domain)
  }, [discover, startResearch])

  return (
    <div className="min-h-screen relative">
      {/* Background ambient gradient */}
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
        {/* Mode toggle - only shown on input screens */}
        <AnimatePresence>
          {showInput && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex justify-center mb-6"
            >
              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <button
                  onClick={() => handleModeSwitch('single')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    mode === 'single'
                      ? 'bg-white/[0.08] text-white/80 shadow-sm'
                      : 'text-white/30 hover:text-white/50'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  Research
                </button>
                <button
                  onClick={() => handleModeSwitch('compare')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    mode === 'compare'
                      ? 'bg-white/[0.08] text-white/80 shadow-sm'
                      : 'text-white/30 hover:text-white/50'
                  }`}
                >
                  <Swords className="w-3.5 h-3.5" />
                  Compare
                </button>
                <button
                  onClick={() => handleModeSwitch('discover')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    mode === 'discover'
                      ? 'bg-white/[0.08] text-white/80 shadow-sm'
                      : 'text-white/30 hover:text-white/50'
                  }`}
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  Discover
                </button>
                <button
                  onClick={() => handleModeSwitch('talent')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    mode === 'talent'
                      ? 'bg-white/[0.08] text-white/80 shadow-sm'
                      : 'text-white/30 hover:text-white/50'
                  }`}
                >
                  <UserSearch className="w-3.5 h-3.5" />
                  Talent
                </button>
                <button
                  onClick={() => handleModeSwitch('bulk')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    mode === 'bulk'
                      ? 'bg-white/[0.08] text-white/80 shadow-sm'
                      : 'text-white/30 hover:text-white/50'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Bulk
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {showSingleInput && (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="flex items-center justify-center min-h-[calc(100vh-12rem)]"
            >
              <SearchInput onSearch={startResearch} isLoading={false} />
            </motion.div>
          )}

          {showCompareInput && (
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

          {showDiscoverInput && (
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

          {showTalentInput && (
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

          {showBulkInput && (
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

          {showCompareProgress && (
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

          {showDiscoverProgress && (
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

          {showTalentProgress && (
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

          {showBulkProgress && (
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

          {showResults && activeReport && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="pt-4"
            >
              <ResultsPanel report={activeReport} onReset={handleResetFromResults} />
            </motion.div>
          )}

          {showCompareResults && comparison.report && (
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

          {showDiscoverResults && discover.results && (
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

          {showTalentResults && talent.talentReport && (
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

          {showBulkResults && (
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

          {showError && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-center justify-center min-h-[calc(100vh-10rem)]"
            >
              <div className="text-center max-w-md">
                <div className="inline-flex p-4 rounded-2xl bg-red-500/10 border border-red-500/20 mb-5">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-white/90 mb-2">Research failed</h2>
                <p className="text-sm text-white/40 mb-6">{error || 'Something went wrong. Please try again.'}</p>
                <motion.button
                  onClick={handleReset}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm font-medium text-white/60 hover:text-white/80 hover:bg-white/[0.1] transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  Try again
                </motion.button>
              </div>
            </motion.div>
          )}

          {showCompareError && (
            <motion.div
              key="compare-error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-center justify-center min-h-[calc(100vh-10rem)]"
            >
              <div className="text-center max-w-md">
                <div className="inline-flex p-4 rounded-2xl bg-red-500/10 border border-red-500/20 mb-5">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-white/90 mb-2">Comparison failed</h2>
                <p className="text-sm text-white/40 mb-6">{comparison.error || 'Something went wrong. Please try again.'}</p>
                <motion.button
                  onClick={handleReset}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm font-medium text-white/60 hover:text-white/80 hover:bg-white/[0.1] transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  Try again
                </motion.button>
              </div>
            </motion.div>
          )}

          {showDiscoverError && (
            <motion.div
              key="discover-error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-center justify-center min-h-[calc(100vh-10rem)]"
            >
              <div className="text-center max-w-md">
                <div className="inline-flex p-4 rounded-2xl bg-red-500/10 border border-red-500/20 mb-5">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-white/90 mb-2">Discovery failed</h2>
                <p className="text-sm text-white/40 mb-6">{discover.error || 'Something went wrong. Please try again.'}</p>
                <motion.button
                  onClick={handleReset}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm font-medium text-white/60 hover:text-white/80 hover:bg-white/[0.1] transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  Try again
                </motion.button>
              </div>
            </motion.div>
          )}

          {showTalentError && (
            <motion.div
              key="talent-error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-center justify-center min-h-[calc(100vh-10rem)]"
            >
              <div className="text-center max-w-md">
                <div className="inline-flex p-4 rounded-2xl bg-red-500/10 border border-red-500/20 mb-5">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-white/90 mb-2">Talent search failed</h2>
                <p className="text-sm text-white/40 mb-6">{talent.error || 'Something went wrong. Please try again.'}</p>
                <motion.button
                  onClick={handleReset}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm font-medium text-white/60 hover:text-white/80 hover:bg-white/[0.1] transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  Try again
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
