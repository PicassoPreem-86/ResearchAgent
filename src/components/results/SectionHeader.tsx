interface SectionHeaderProps {
  icon: React.ElementType
  title: string
  accent?: string
}

export function SectionHeader({ icon: Icon, title, accent }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
        <Icon className={`w-4 h-4 ${accent || 'text-white/40'}`} />
      </div>
      <h3 className="text-base font-semibold text-white/80">{title}</h3>
    </div>
  )
}
