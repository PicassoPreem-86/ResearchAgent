import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download,
  FileJson,
  FileText,
  FileSpreadsheet,
  ClipboardCopy,
  Copy,
  ChevronDown,
  Loader2,
} from 'lucide-react'
import type { ProspectReport } from '@/types/prospect'
import {
  reportToJson,
  reportToMarkdown,
  reportToCSV,
  reportToExecutiveSummary,
  copyToClipboard,
  downloadFile,
} from '@/utils/exportFormatters'

interface ExportMenuProps {
  report: ProspectReport
  onExportPdf: () => void
  isExporting: boolean
  onToast: (message: string, variant?: 'success' | 'error') => void
}

export function ExportMenu({ report, onExportPdf, isExporting, onToast }: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, close])

  const handleExportJson = () => {
    const json = reportToJson(report)
    downloadFile(json, `${report.company.domain}-research.json`, 'application/json')
    onToast('JSON downloaded')
    close()
  }

  const handleExportMarkdown = () => {
    const md = reportToMarkdown(report)
    downloadFile(md, `${report.company.domain}-research.md`, 'text/markdown')
    onToast('Markdown downloaded')
    close()
  }

  const handleExportCSV = () => {
    const csv = reportToCSV(report)
    downloadFile(csv, `${report.company.domain}-research.csv`, 'text/csv')
    onToast('CSV downloaded')
    close()
  }

  const handleCopyFull = async () => {
    try {
      const md = reportToMarkdown(report)
      await copyToClipboard(md)
      onToast('Report copied to clipboard')
    } catch {
      onToast('Failed to copy', 'error')
    }
    close()
  }

  const handleCopySummary = async () => {
    try {
      const summary = reportToExecutiveSummary(report)
      await copyToClipboard(summary)
      onToast('Summary copied to clipboard')
    } catch {
      onToast('Failed to copy', 'error')
    }
    close()
  }

  const options = [
    { label: 'Export PDF', icon: Download, action: () => { onExportPdf(); close() }, loading: isExporting },
    { label: 'Export JSON', icon: FileJson, action: handleExportJson },
    { label: 'Export Markdown', icon: FileText, action: handleExportMarkdown },
    { label: 'Export CSV', icon: FileSpreadsheet, action: handleExportCSV },
    { label: 'Copy as Markdown', icon: ClipboardCopy, action: handleCopyFull },
    { label: 'Copy Executive Summary', icon: Copy, action: handleCopySummary },
  ]

  return (
    <div className="relative" ref={menuRef}>
      <motion.button
        onClick={() => setOpen(prev => !prev)}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xs font-medium text-white/50 hover:text-white/70 hover:bg-white/[0.1] transition-all"
      >
        {isExporting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        <span>Export</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-white/[0.08] bg-[#1a1a2e]/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50"
          >
            {options.map((opt, i) => (
              <button
                key={i}
                onClick={opt.action}
                disabled={opt.loading}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-all duration-150 disabled:opacity-40"
              >
                {opt.loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <opt.icon className="w-3.5 h-3.5" />
                )}
                <span>{opt.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
