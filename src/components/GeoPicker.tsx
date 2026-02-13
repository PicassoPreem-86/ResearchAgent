import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, ChevronDown, ChevronRight, X, Globe } from 'lucide-react'
import type { GeoTarget } from '@/types/prospect'

interface GeoPickerProps {
  value: GeoTarget
  onChange: (value: GeoTarget) => void
  disabled?: boolean
  accent?: 'brand' | 'cyan'
}

interface GeoNode {
  label: string
  type: 'region' | 'country' | 'metro'
  children?: GeoNode[]
}

const GEO_TREE: GeoNode[] = [
  {
    label: 'North America',
    type: 'region',
    children: [
      {
        label: 'United States',
        type: 'country',
        children: [
          { label: 'San Francisco Bay Area', type: 'metro' },
          { label: 'New York City', type: 'metro' },
          { label: 'Los Angeles', type: 'metro' },
          { label: 'Seattle', type: 'metro' },
          { label: 'Austin', type: 'metro' },
          { label: 'Boston', type: 'metro' },
          { label: 'Chicago', type: 'metro' },
          { label: 'Denver', type: 'metro' },
          { label: 'Miami', type: 'metro' },
        ],
      },
      {
        label: 'Canada',
        type: 'country',
        children: [
          { label: 'Toronto', type: 'metro' },
          { label: 'Vancouver', type: 'metro' },
        ],
      },
      { label: 'Mexico', type: 'country' },
    ],
  },
  {
    label: 'Europe',
    type: 'region',
    children: [
      {
        label: 'United Kingdom',
        type: 'country',
        children: [{ label: 'London', type: 'metro' }],
      },
      {
        label: 'Germany',
        type: 'country',
        children: [
          { label: 'Berlin', type: 'metro' },
          { label: 'Munich', type: 'metro' },
        ],
      },
      {
        label: 'France',
        type: 'country',
        children: [{ label: 'Paris', type: 'metro' }],
      },
      {
        label: 'Netherlands',
        type: 'country',
        children: [{ label: 'Amsterdam', type: 'metro' }],
      },
      {
        label: 'Sweden',
        type: 'country',
        children: [{ label: 'Stockholm', type: 'metro' }],
      },
      {
        label: 'Switzerland',
        type: 'country',
        children: [{ label: 'Zurich', type: 'metro' }],
      },
      {
        label: 'Ireland',
        type: 'country',
        children: [{ label: 'Dublin', type: 'metro' }],
      },
      { label: 'Spain', type: 'country' },
      { label: 'Italy', type: 'country' },
      { label: 'Poland', type: 'country' },
    ],
  },
  {
    label: 'Asia Pacific',
    type: 'region',
    children: [
      {
        label: 'India',
        type: 'country',
        children: [
          { label: 'Bangalore', type: 'metro' },
          { label: 'Mumbai', type: 'metro' },
        ],
      },
      { label: 'China', type: 'country' },
      {
        label: 'Japan',
        type: 'country',
        children: [{ label: 'Tokyo', type: 'metro' }],
      },
      {
        label: 'South Korea',
        type: 'country',
        children: [{ label: 'Seoul', type: 'metro' }],
      },
      {
        label: 'Singapore',
        type: 'country',
        children: [{ label: 'Singapore', type: 'metro' }],
      },
      {
        label: 'Australia',
        type: 'country',
        children: [{ label: 'Sydney', type: 'metro' }],
      },
      { label: 'Indonesia', type: 'country' },
      { label: 'Taiwan', type: 'country' },
    ],
  },
  {
    label: 'Latin America',
    type: 'region',
    children: [
      {
        label: 'Brazil',
        type: 'country',
        children: [{ label: 'São Paulo', type: 'metro' }],
      },
      { label: 'Argentina', type: 'country' },
      { label: 'Colombia', type: 'country' },
      { label: 'Chile', type: 'country' },
    ],
  },
  {
    label: 'Middle East & Africa',
    type: 'region',
    children: [
      {
        label: 'Israel',
        type: 'country',
        children: [{ label: 'Tel Aviv', type: 'metro' }],
      },
      {
        label: 'United Arab Emirates',
        type: 'country',
        children: [{ label: 'Dubai', type: 'metro' }],
      },
      { label: 'Saudi Arabia', type: 'country' },
      { label: 'South Africa', type: 'country' },
      { label: 'Nigeria', type: 'country' },
      { label: 'Kenya', type: 'country' },
      { label: 'Egypt', type: 'country' },
    ],
  },
]

function getListForType(type: 'region' | 'country' | 'metro', geo: GeoTarget): string[] {
  if (type === 'region') return geo.regions
  if (type === 'country') return geo.countries
  return geo.metros
}

function setListForType(
  type: 'region' | 'country' | 'metro',
  geo: GeoTarget,
  list: string[]
): GeoTarget {
  if (type === 'region') return { ...geo, regions: list }
  if (type === 'country') return { ...geo, countries: list }
  return { ...geo, metros: list }
}

export function GeoPicker({ value, onChange, disabled, accent = 'brand' }: GeoPickerProps) {
  const [open, setOpen] = useState(false)
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set())
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)

  const allSelections = [...value.metros, ...value.countries, ...value.regions]

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const isSelected = (label: string, type: 'region' | 'country' | 'metro') => {
    return getListForType(type, value).includes(label)
  }

  const toggle = (label: string, type: 'region' | 'country' | 'metro') => {
    const list = getListForType(type, value)
    const next = list.includes(label)
      ? list.filter((x) => x !== label)
      : [...list, label]
    onChange(setListForType(type, value, next))
  }

  const removeSelection = (label: string) => {
    if (value.regions.includes(label)) {
      onChange({ ...value, regions: value.regions.filter((x) => x !== label) })
    } else if (value.countries.includes(label)) {
      onChange({ ...value, countries: value.countries.filter((x) => x !== label) })
    } else {
      onChange({ ...value, metros: value.metros.filter((x) => x !== label) })
    }
  }

  const toggleRegionExpand = (label: string) => {
    setExpandedRegions((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  const toggleCountryExpand = (label: string) => {
    setExpandedCountries((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  const accentClasses = accent === 'cyan'
    ? { tag: 'bg-cyan-500/15 border-cyan-500/25 text-cyan-300', tagClose: 'text-cyan-300/50 hover:text-cyan-300', check: 'bg-cyan-500 border-cyan-500' }
    : { tag: 'bg-brand-500/15 border-brand-500/25 text-brand-300', tagClose: 'text-brand-300/50 hover:text-brand-300', check: 'bg-brand-500 border-brand-500' }

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => !disabled && setOpen(!open)}
        className={`glass p-3 flex flex-wrap items-center gap-1.5 min-h-[42px] cursor-pointer transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/[0.03]'
        }`}
      >
        {allSelections.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-white/20">
            <MapPin className="w-4 h-4 shrink-0" />
            <span>Select regions, countries, or metros...</span>
          </div>
        ) : (
          <>
            {allSelections.map((label) => (
              <motion.span
                key={label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium ${accentClasses.tag}`}
              >
                {label}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeSelection(label)
                  }}
                  className={`${accentClasses.tagClose} transition-colors`}
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.span>
            ))}
          </>
        )}
        <ChevronDown
          className={`w-4 h-4 text-white/20 ml-auto shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -4, scaleY: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full left-0 right-0 mt-1 glass border border-white/[0.08] rounded-xl shadow-2xl shadow-black/40 max-h-[320px] overflow-y-auto origin-top"
          >
            <div className="p-1.5">
              {GEO_TREE.map((region) => (
                <div key={region.label}>
                  {/* Region row */}
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors">
                    <button
                      type="button"
                      onClick={() => toggleRegionExpand(region.label)}
                      className="p-0.5 text-white/30 hover:text-white/50 transition-colors"
                    >
                      {expandedRegions.has(region.label) ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(region.label, 'region')}
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                        isSelected(region.label, 'region')
                          ? `${accentClasses.check} border-transparent`
                          : 'border-white/20 hover:border-white/40'
                      }`}
                    >
                      {isSelected(region.label, 'region') && (
                        <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                    <Globe className="w-3.5 h-3.5 text-white/25" />
                    <span className="text-xs font-semibold text-white/70 tracking-wide uppercase">
                      {region.label}
                    </span>
                  </div>

                  {/* Countries under region */}
                  <AnimatePresence>
                    {expandedRegions.has(region.label) && region.children && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        {region.children.map((country) => (
                          <div key={country.label} className="pl-6">
                            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors">
                              {country.children && country.children.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => toggleCountryExpand(country.label)}
                                  className="p-0.5 text-white/30 hover:text-white/50 transition-colors"
                                >
                                  {expandedCountries.has(country.label) ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              ) : (
                                <div className="w-[22px]" />
                              )}
                              <button
                                type="button"
                                onClick={() => toggle(country.label, 'country')}
                                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                                  isSelected(country.label, 'country')
                                    ? `${accentClasses.check} border-transparent`
                                    : 'border-white/20 hover:border-white/40'
                                }`}
                              >
                                {isSelected(country.label, 'country') && (
                                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </button>
                              <span className="text-xs text-white/60">{country.label}</span>
                            </div>

                            {/* Metros under country */}
                            <AnimatePresence>
                              {expandedCountries.has(country.label) && country.children && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.15 }}
                                  className="overflow-hidden"
                                >
                                  {country.children.map((metro) => (
                                    <div
                                      key={metro.label}
                                      className="flex items-center gap-1.5 pl-12 pr-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
                                    >
                                      <button
                                        type="button"
                                        onClick={() => toggle(metro.label, 'metro')}
                                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                                          isSelected(metro.label, 'metro')
                                            ? `${accentClasses.check} border-transparent`
                                            : 'border-white/20 hover:border-white/40'
                                        }`}
                                      >
                                        {isSelected(metro.label, 'metro') && (
                                          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                          </svg>
                                        )}
                                      </button>
                                      <MapPin className="w-3 h-3 text-white/20" />
                                      <span className="text-xs text-white/50">{metro.label}</span>
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
