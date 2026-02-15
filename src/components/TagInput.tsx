import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'

const ACCENT_STYLES = {
  brand: {
    tag: 'bg-brand-500/15 border-brand-500/25 text-brand-300',
    close: 'text-brand-300/50 hover:text-brand-300',
  },
  cyan: {
    tag: 'bg-cyan-500/15 border-cyan-500/25 text-cyan-300',
    close: 'text-cyan-300/50 hover:text-cyan-300',
  },
} as const

interface TagInputProps {
  tags: string[]
  onAdd: (tag: string) => void
  onRemove: (index: number) => void
  placeholder: string
  accent?: 'brand' | 'cyan'
}

export function TagInput({ tags, onAdd, onRemove, placeholder, accent = 'brand' }: TagInputProps) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const styles = ACCENT_STYLES[accent]

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const trimmed = input.trim().replace(/,$/, '')
      if (trimmed && !tags.includes(trimmed)) {
        onAdd(trimmed)
        setInput('')
      }
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onRemove(tags.length - 1)
    }
  }

  return (
    <div
      className="glass p-3 flex flex-wrap items-center gap-1.5 min-h-[42px] cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag, i) => (
        <motion.span
          key={tag}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium ${styles.tag}`}
        >
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemove(i)
            }}
            className={`transition-colors ${styles.close}`}
          >
            <X className="w-3 h-3" />
          </button>
        </motion.span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="bg-transparent text-sm text-white placeholder:text-white/20 outline-none flex-1 min-w-[80px] py-0.5"
      />
    </div>
  )
}
