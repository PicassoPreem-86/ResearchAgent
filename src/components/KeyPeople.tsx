import { motion } from 'framer-motion'
import type { KeyPerson } from '@/types/prospect'

interface KeyPeopleProps {
  people: KeyPerson[]
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function KeyPeople({ people }: KeyPeopleProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {people.map((person, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.06 }}
          className="glass glass-hover p-4 flex items-start gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-600/10 border border-brand-500/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-brand-300">{getInitials(person.name)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white/80 truncate">{person.name}</div>
            <div className="text-xs text-brand-300/60 font-medium mb-1">{person.role}</div>
            <p className="text-xs text-white/35 leading-relaxed">{person.context}</p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
