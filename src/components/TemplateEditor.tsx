import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Save, Trash2, Copy, Loader2 } from 'lucide-react'
import type { ResearchTemplate, TemplateConfig } from '@/hooks/useTemplates'

const FOCUS_AREAS = [
  { key: 'overview', label: 'Company Overview' },
  { key: 'swot', label: 'SWOT Analysis' },
  { key: 'competitive', label: 'Competitive Landscape' },
  { key: 'financials', label: 'Financial Analysis' },
  { key: 'hiring', label: 'Hiring & Team' },
  { key: 'risk', label: 'Risk Assessment' },
  { key: 'outreach', label: 'Personalized Outreach' },
]

interface TemplateEditorProps {
  isOpen: boolean
  onClose: () => void
  templates: ResearchTemplate[]
  onSave: (name: string, config: TemplateConfig) => Promise<void>
  onUpdate: (id: string, name: string, config: TemplateConfig) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onDuplicate: (template: ResearchTemplate) => Promise<void>
  onSelect: (templateId: string) => void
}

export function TemplateEditor({
  isOpen,
  onClose,
  templates,
  onSave,
  onUpdate,
  onDelete,
  onDuplicate,
  onSelect,
}: TemplateEditorProps) {
  const [editing, setEditing] = useState<ResearchTemplate | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [name, setName] = useState('')
  const [focusAreas, setFocusAreas] = useState<string[]>([])
  const [customPrompt, setCustomPrompt] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const startCreate = () => {
    setEditing(null)
    setIsCreating(true)
    setName('')
    setFocusAreas(['overview', 'swot', 'competitive'])
    setCustomPrompt('')
  }

  const startEdit = (t: ResearchTemplate) => {
    setEditing(t)
    setIsCreating(true)
    setName(t.name)
    setFocusAreas([...t.config.focusAreas])
    setCustomPrompt(t.config.customPrompt)
  }

  const cancelEdit = () => {
    setEditing(null)
    setIsCreating(false)
  }

  const toggleFocus = (key: string) => {
    setFocusAreas((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  const handleSave = async () => {
    if (!name.trim() || focusAreas.length === 0) return
    setIsSaving(true)
    try {
      const config: TemplateConfig = {
        focusAreas,
        customPrompt: customPrompt.trim(),
        sectionOrder: focusAreas,
      }
      if (editing) {
        await onUpdate(editing.id, name.trim(), config)
      } else {
        await onSave(name.trim(), config)
      }
      cancelEdit()
    } finally {
      setIsSaving(false)
    }
  }

  const customTemplates = templates.filter((t) => t.isCustom)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-x-4 top-[10%] bottom-[10%] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg sm:max-h-[80vh] bg-gray-950 border border-white/[0.08] rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h2 className="text-sm font-semibold text-white/80">
                {isCreating ? (editing ? 'Edit Template' : 'New Template') : 'Research Templates'}
              </h2>
              <button
                onClick={isCreating ? cancelEdit : onClose}
                className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                {isCreating ? (
                  <motion.div
                    key="editor"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    {/* Name */}
                    <div>
                      <label className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-1.5 block">
                        Template Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="My Custom Template"
                        className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder:text-white/20 outline-none focus:border-brand-500/30 transition-all"
                        autoFocus
                      />
                    </div>

                    {/* Focus areas */}
                    <div>
                      <label className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-2 block">
                        Focus Areas
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {FOCUS_AREAS.map(({ key, label }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleFocus(key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              focusAreas.includes(key)
                                ? 'bg-brand-500/15 border border-brand-500/25 text-brand-300'
                                : 'bg-white/[0.03] border border-white/[0.06] text-white/30 hover:text-white/50'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom prompt */}
                    <div>
                      <label className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-1.5 block">
                        Custom Instructions (optional)
                      </label>
                      <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="Always include market size estimates, focus on enterprise customers..."
                        rows={3}
                        className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder:text-white/20 outline-none focus:border-brand-500/30 transition-all resize-none"
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="list"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-1.5"
                  >
                    {/* Default templates */}
                    <p className="text-[10px] text-white/20 uppercase tracking-wider font-semibold mb-2">
                      Built-in Templates
                    </p>
                    {templates
                      .filter((t) => !t.isCustom)
                      .map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all group"
                        >
                          <button
                            onClick={() => {
                              onSelect(t.id)
                              onClose()
                            }}
                            className="text-sm text-white/60 hover:text-white/80 font-medium"
                          >
                            {t.name}
                          </button>
                          <button
                            onClick={() => onDuplicate(t)}
                            className="p-1 rounded text-white/15 hover:text-white/40 opacity-0 group-hover:opacity-100 transition-all"
                            title="Duplicate"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                    {/* Custom templates */}
                    {customTemplates.length > 0 && (
                      <>
                        <p className="text-[10px] text-white/20 uppercase tracking-wider font-semibold mb-2 mt-4">
                          Custom Templates
                        </p>
                        {customTemplates.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all group"
                          >
                            <button
                              onClick={() => {
                                onSelect(t.id)
                                onClose()
                              }}
                              className="text-sm text-white/60 hover:text-white/80 font-medium"
                            >
                              {t.name}
                            </button>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button
                                onClick={() => startEdit(t)}
                                className="p-1 rounded text-white/15 hover:text-white/40"
                                title="Edit"
                              >
                                <Save className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => onDuplicate(t)}
                                className="p-1 rounded text-white/15 hover:text-white/40"
                                title="Duplicate"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => onDelete(t.id)}
                                className="p-1 rounded text-white/15 hover:text-red-400"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between">
              {isCreating ? (
                <>
                  <button
                    onClick={cancelEdit}
                    className="text-xs text-white/30 hover:text-white/50 transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    onClick={handleSave}
                    disabled={!name.trim() || focusAreas.length === 0 || isSaving}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-500 rounded-xl text-xs font-semibold text-white shadow-lg shadow-brand-600/25 disabled:opacity-40 transition-all"
                  >
                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    {editing ? 'Update' : 'Save Template'}
                  </motion.button>
                </>
              ) : (
                <>
                  <span className="text-[10px] text-white/15">
                    {templates.length} templates
                  </span>
                  <motion.button
                    onClick={startCreate}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-500 rounded-xl text-xs font-semibold text-white shadow-lg shadow-brand-600/25 transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    New Template
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
