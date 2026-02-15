import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, Send, Minus, X, Square, Pencil, Eye, ClipboardCopy } from 'lucide-react'
import type { OutreachEmail } from '@/types/prospect'
import { copyToClipboard } from '@/utils/exportFormatters'

interface EmailPreviewProps {
  email: OutreachEmail
  emails?: OutreachEmail[]
  recipientDomain?: string
  onToast?: (message: string, variant?: 'success' | 'error') => void
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200 bg-white/[0.05] hover:bg-white/[0.1] text-white/40 hover:text-white/60"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-emerald-400" />
          <span className="text-emerald-400">Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          <span>{label}</span>
        </>
      )}
    </button>
  )
}

export function EmailPreview({ email, emails, recipientDomain, onToast }: EmailPreviewProps) {
  const allEmails = emails && emails.length > 0 ? emails : [email]
  const [activeIndex, setActiveIndex] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [editedSubject, setEditedSubject] = useState('')
  const [editedBody, setEditedBody] = useState('')
  const [isModified, setIsModified] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const currentEmail = allEmails[activeIndex] || allEmails[0]

  // Reset when variant changes
  useEffect(() => {
    setEditedSubject(currentEmail.subject)
    setEditedBody(currentEmail.body)
    setIsModified(false)
    setIsEditing(false)
  }, [activeIndex, currentEmail.subject, currentEmail.body])

  const activeSubject = isModified ? editedSubject : currentEmail.subject
  const activeBody = isModified ? editedBody : currentEmail.body

  const handleEdit = () => {
    if (!isEditing) {
      setEditedSubject(activeSubject)
      setEditedBody(activeBody)
    }
    setIsEditing(!isEditing)
  }

  const handleSubjectChange = (val: string) => {
    setEditedSubject(val)
    setIsModified(true)
  }

  const handleBodyChange = (val: string) => {
    setEditedBody(val)
    setIsModified(true)
  }

  // Auto-resize textarea
  useEffect(() => {
    if (bodyRef.current && isEditing) {
      bodyRef.current.style.height = 'auto'
      bodyRef.current.style.height = bodyRef.current.scrollHeight + 'px'
    }
  }, [editedBody, isEditing])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="rounded-2xl overflow-hidden border border-white/[0.08] bg-[#1a1a2e]/80 backdrop-blur-xl shadow-2xl"
    >
      {/* Variant tabs */}
      {allEmails.length > 1 && (
        <div className="flex items-center gap-1 px-4 pt-3 pb-0">
          {allEmails.map((e, i) => (
            <motion.button
              key={i}
              onClick={() => setActiveIndex(i)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                i === activeIndex
                  ? 'bg-brand-500/20 border border-brand-500/30 text-brand-300'
                  : 'bg-white/[0.03] border border-white/[0.06] text-white/30 hover:text-white/50'
              }`}
            >
              {e.variant || `Variant ${i + 1}`}
            </motion.button>
          ))}
        </div>
      )}

      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/[0.03] border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          <span className="text-xs text-white/30 ml-2 font-medium">New Message</span>
          {isModified && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-300/70 font-semibold uppercase tracking-wider"
            >
              Modified
            </motion.span>
          )}
          {currentEmail.tone && (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300/60 font-semibold uppercase tracking-wider">
              {currentEmail.tone}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            onClick={handleEdit}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`p-1.5 rounded-md transition-all duration-200 ${
              isEditing
                ? 'bg-brand-500/20 text-brand-400'
                : 'bg-white/[0.04] text-white/25 hover:text-white/50'
            }`}
          >
            {isEditing ? <Eye className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
          </motion.button>
          <div className="flex items-center gap-1">
            <Minus className="w-3.5 h-3.5 text-white/20" />
            <Square className="w-3 h-3 text-white/20" />
            <X className="w-3.5 h-3.5 text-white/20" />
          </div>
        </div>
      </div>

      {/* Email header fields */}
      <div className="px-3 sm:px-5 pt-4 space-y-2.5 border-b border-white/[0.04] pb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xs text-white/25 w-10 sm:w-12 text-right shrink-0">To</span>
          <span className="text-sm text-white/50 truncate">prospect@{recipientDomain || 'company.com'}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xs text-white/25 w-10 sm:w-12 text-right shrink-0">Subject</span>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text"
                value={editedSubject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="flex-1 text-sm text-white/80 font-medium bg-transparent outline-none border-b border-brand-500/30 pb-0.5"
              />
            ) : (
              <span className="text-sm text-white/80 font-medium truncate">{activeSubject}</span>
            )}
            <CopyButton text={activeSubject} label="Copy" />
          </div>
        </div>
      </div>

      {/* Email body */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`body-${activeIndex}-${isEditing}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="px-3 sm:px-5 py-4 sm:py-5"
        >
          <div className="relative">
            {isEditing ? (
              <textarea
                ref={bodyRef}
                value={editedBody}
                onChange={(e) => handleBodyChange(e.target.value)}
                className="w-full text-sm text-white/60 leading-[1.8] whitespace-pre-wrap font-light bg-transparent outline-none resize-none border border-brand-500/20 rounded-lg p-3 min-h-[200px]"
              />
            ) : (
              <div className="text-sm text-white/60 leading-[1.8] whitespace-pre-wrap font-light">
                {activeBody}
              </div>
            )}
            <div className="flex justify-end mt-4">
              <CopyButton text={activeBody} label="Copy body" />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Send bar */}
      <div className="flex items-center justify-between px-3 sm:px-5 py-3 bg-white/[0.02] border-t border-white/[0.04]">
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-500 rounded-lg text-xs font-semibold text-white shadow-lg shadow-brand-600/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </motion.button>
        </div>
        <motion.button
          onClick={async () => {
            const fullEmail = `Subject: ${activeSubject}\n\n${activeBody}`
            try {
              await copyToClipboard(fullEmail)
              onToast?.('Email copied to clipboard')
            } catch {
              onToast?.('Failed to copy', 'error')
            }
          }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-white/40 hover:text-white/60 transition-all duration-200"
        >
          <ClipboardCopy className="w-3.5 h-3.5" />
          <span>Copy email</span>
        </motion.button>
      </div>

      {/* Personalization notes */}
      {currentEmail.personalizationNotes.length > 0 && (
        <div className="px-3 sm:px-5 py-4 bg-brand-500/[0.04] border-t border-brand-500/10">
          <div className="text-[10px] text-brand-300/50 uppercase tracking-wider font-semibold mb-2.5">
            Personalization Notes
          </div>
          <div className="space-y-1.5">
            {currentEmail.personalizationNotes.map((note, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-brand-400/40 mt-1.5 shrink-0" />
                <span className="text-xs text-brand-200/40 leading-relaxed">{note}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
