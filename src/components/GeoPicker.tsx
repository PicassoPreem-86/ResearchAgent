import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, ChevronDown, X, Search, Navigation, Loader2 } from 'lucide-react'
import type { GeoTarget } from '@/types/prospect'

interface GeoPickerProps {
  value: GeoTarget
  onChange: (value: GeoTarget) => void
  disabled?: boolean
  accent?: 'brand' | 'cyan'
}

interface LocationSuggestion {
  label: string
  type: 'city' | 'state' | 'country' | 'region'
  detail?: string
}

const POPULAR_LOCATIONS: LocationSuggestion[] = [
  // US Cities
  { label: 'New York City, NY', type: 'city', detail: 'United States' },
  { label: 'San Francisco, CA', type: 'city', detail: 'United States' },
  { label: 'Los Angeles, CA', type: 'city', detail: 'United States' },
  { label: 'Chicago, IL', type: 'city', detail: 'United States' },
  { label: 'Austin, TX', type: 'city', detail: 'United States' },
  { label: 'Seattle, WA', type: 'city', detail: 'United States' },
  { label: 'Boston, MA', type: 'city', detail: 'United States' },
  { label: 'Denver, CO', type: 'city', detail: 'United States' },
  { label: 'Miami, FL', type: 'city', detail: 'United States' },
  { label: 'Atlanta, GA', type: 'city', detail: 'United States' },
  { label: 'Dallas, TX', type: 'city', detail: 'United States' },
  { label: 'Portland, OR', type: 'city', detail: 'United States' },
  { label: 'Nashville, TN', type: 'city', detail: 'United States' },
  { label: 'San Diego, CA', type: 'city', detail: 'United States' },
  { label: 'Phoenix, AZ', type: 'city', detail: 'United States' },
  { label: 'Minneapolis, MN', type: 'city', detail: 'United States' },
  { label: 'Raleigh, NC', type: 'city', detail: 'United States' },
  { label: 'Salt Lake City, UT', type: 'city', detail: 'United States' },
  { label: 'Washington, DC', type: 'city', detail: 'United States' },
  { label: 'Philadelphia, PA', type: 'city', detail: 'United States' },
  { label: 'Detroit, MI', type: 'city', detail: 'United States' },
  { label: 'Houston, TX', type: 'city', detail: 'United States' },
  // US States
  { label: 'California', type: 'state', detail: 'United States' },
  { label: 'Texas', type: 'state', detail: 'United States' },
  { label: 'New York', type: 'state', detail: 'United States' },
  { label: 'Florida', type: 'state', detail: 'United States' },
  { label: 'Illinois', type: 'state', detail: 'United States' },
  { label: 'Washington', type: 'state', detail: 'United States' },
  { label: 'Massachusetts', type: 'state', detail: 'United States' },
  { label: 'Colorado', type: 'state', detail: 'United States' },
  { label: 'Georgia', type: 'state', detail: 'United States' },
  { label: 'North Carolina', type: 'state', detail: 'United States' },
  { label: 'Virginia', type: 'state', detail: 'United States' },
  { label: 'Pennsylvania', type: 'state', detail: 'United States' },
  { label: 'Oregon', type: 'state', detail: 'United States' },
  { label: 'Tennessee', type: 'state', detail: 'United States' },
  { label: 'Arizona', type: 'state', detail: 'United States' },
  { label: 'Ohio', type: 'state', detail: 'United States' },
  { label: 'Michigan', type: 'state', detail: 'United States' },
  { label: 'Minnesota', type: 'state', detail: 'United States' },
  { label: 'Utah', type: 'state', detail: 'United States' },
  { label: 'Maryland', type: 'state', detail: 'United States' },
  // Canada
  { label: 'Toronto, ON', type: 'city', detail: 'Canada' },
  { label: 'Vancouver, BC', type: 'city', detail: 'Canada' },
  { label: 'Montreal, QC', type: 'city', detail: 'Canada' },
  // Europe
  { label: 'London', type: 'city', detail: 'United Kingdom' },
  { label: 'Berlin', type: 'city', detail: 'Germany' },
  { label: 'Paris', type: 'city', detail: 'France' },
  { label: 'Amsterdam', type: 'city', detail: 'Netherlands' },
  { label: 'Dublin', type: 'city', detail: 'Ireland' },
  { label: 'Stockholm', type: 'city', detail: 'Sweden' },
  { label: 'Munich', type: 'city', detail: 'Germany' },
  { label: 'Zurich', type: 'city', detail: 'Switzerland' },
  { label: 'Barcelona', type: 'city', detail: 'Spain' },
  { label: 'Lisbon', type: 'city', detail: 'Portugal' },
  // Asia Pacific
  { label: 'Singapore', type: 'city', detail: 'Singapore' },
  { label: 'Tokyo', type: 'city', detail: 'Japan' },
  { label: 'Sydney', type: 'city', detail: 'Australia' },
  { label: 'Bangalore', type: 'city', detail: 'India' },
  { label: 'Seoul', type: 'city', detail: 'South Korea' },
  { label: 'Mumbai', type: 'city', detail: 'India' },
  // Latin America
  { label: 'São Paulo', type: 'city', detail: 'Brazil' },
  { label: 'Mexico City', type: 'city', detail: 'Mexico' },
  // Middle East
  { label: 'Tel Aviv', type: 'city', detail: 'Israel' },
  { label: 'Dubai', type: 'city', detail: 'UAE' },
  // Countries
  { label: 'United States', type: 'country' },
  { label: 'United Kingdom', type: 'country' },
  { label: 'Canada', type: 'country' },
  { label: 'Germany', type: 'country' },
  { label: 'France', type: 'country' },
  { label: 'India', type: 'country' },
  { label: 'Australia', type: 'country' },
  { label: 'Japan', type: 'country' },
  { label: 'Brazil', type: 'country' },
  { label: 'Israel', type: 'country' },
  { label: 'Netherlands', type: 'country' },
  { label: 'Sweden', type: 'country' },
  { label: 'Switzerland', type: 'country' },
  { label: 'Ireland', type: 'country' },
  { label: 'Spain', type: 'country' },
  { label: 'South Korea', type: 'country' },
  { label: 'Mexico', type: 'country' },
]

const TYPE_ICONS: Record<string, string> = {
  city: '📍',
  state: '🏛',
  country: '🌐',
  region: '🗺',
}

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&zoom=10`,
      { headers: { 'User-Agent': 'ResearchAgent/1.0' } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const addr = data.address
    if (!addr) return null
    const city = addr.city || addr.town || addr.village || addr.municipality || ''
    const state = addr.state || ''
    const country = addr.country || ''
    if (city && state && (addr.country_code === 'us' || addr.country_code === 'ca')) {
      return `${city}, ${state}`
    }
    if (city && country) {
      return `${city}, ${country}`
    }
    return city || state || country || null
  } catch {
    return null
  }
}

export function GeoPicker({ value, onChange, disabled, accent = 'brand' }: GeoPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus()
    }
  }, [open])

  const addLocation = useCallback((label: string) => {
    if (!label.trim()) return
    const trimmed = label.trim()
    if (allSelections.includes(trimmed)) return
    onChange({ ...value, metros: [...value.metros, trimmed] })
    setSearch('')
  }, [value, onChange, allSelections])

  const removeSelection = useCallback((label: string) => {
    onChange({
      regions: value.regions.filter((x) => x !== label),
      countries: value.countries.filter((x) => x !== label),
      metros: value.metros.filter((x) => x !== label),
    })
  }, [value, onChange])

  const handleUseMyLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocError('Geolocation not supported')
      return
    }
    setLocating(true)
    setLocError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const locationName = await reverseGeocode(pos.coords.latitude, pos.coords.longitude)
        setLocating(false)
        if (locationName) {
          addLocation(locationName)
        } else {
          setLocError('Could not detect location')
        }
      },
      () => {
        setLocating(false)
        setLocError('Location access denied')
      },
      { timeout: 10000 }
    )
  }, [addLocation])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const trimmed = search.trim()
      if (trimmed) {
        // Check if there's an exact match in filtered results first
        const match = filtered.find(
          (s) => s.label.toLowerCase() === trimmed.toLowerCase()
        )
        addLocation(match ? match.label : trimmed)
      }
    }
  }

  const filtered = search.trim()
    ? POPULAR_LOCATIONS.filter((loc) => {
        const q = search.toLowerCase()
        return (
          loc.label.toLowerCase().includes(q) ||
          (loc.detail && loc.detail.toLowerCase().includes(q))
        )
      }).slice(0, 12)
    : []

  const showSuggestions = search.trim().length > 0

  const accentClasses = accent === 'cyan'
    ? { tag: 'bg-cyan-500/15 border-cyan-500/25 text-cyan-300', tagClose: 'text-cyan-300/50 hover:text-cyan-300' }
    : { tag: 'bg-brand-500/15 border-brand-500/25 text-brand-300', tagClose: 'text-brand-300/50 hover:text-brand-300' }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <div
        onClick={() => !disabled && setOpen(!open)}
        className={`glass p-3 flex flex-wrap items-center gap-1.5 min-h-[42px] cursor-pointer transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/[0.03]'
        }`}
      >
        {allSelections.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-white/20">
            <MapPin className="w-4 h-4 shrink-0" />
            <span>Search for a city, state, or country...</span>
          </div>
        ) : (
          <>
            {allSelections.map((label) => (
              <motion.span
                key={label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
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

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -4, scaleY: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full left-0 right-0 mt-1 glass border border-white/[0.08] rounded-xl shadow-2xl shadow-black/40 origin-top overflow-hidden"
          >
            {/* Search input + Use my location */}
            <div className="p-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 mb-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a city, state, or country..."
                    className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white placeholder:text-white/20 outline-none focus:border-white/[0.12] transition-colors"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={locating}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white/40 hover:text-white/60 hover:bg-white/[0.07] transition-all shrink-0 disabled:opacity-40"
                >
                  {locating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Navigation className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">My location</span>
                </button>
              </div>
              {locError && (
                <div className="text-[10px] text-red-400/70 px-1">{locError}</div>
              )}
              {search.trim() && (
                <div className="text-[10px] text-white/20 px-1">
                  Press Enter to add "{search.trim()}" as a custom location
                </div>
              )}
            </div>

            {/* Results / suggestions */}
            <div className="max-h-[260px] overflow-y-auto p-1.5">
              {showSuggestions ? (
                <>
                  {filtered.length > 0 ? (
                    filtered.map((loc) => {
                      const isAlreadySelected = allSelections.includes(loc.label)
                      return (
                        <button
                          key={loc.label}
                          type="button"
                          onClick={() => addLocation(loc.label)}
                          disabled={isAlreadySelected}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
                            isAlreadySelected
                              ? 'opacity-30 cursor-not-allowed'
                              : 'hover:bg-white/[0.04]'
                          }`}
                        >
                          <span className="text-xs shrink-0">{TYPE_ICONS[loc.type]}</span>
                          <div className="min-w-0">
                            <span className="text-xs text-white/60">{loc.label}</span>
                            {loc.detail && (
                              <span className="text-[10px] text-white/20 ml-1.5">{loc.detail}</span>
                            )}
                          </div>
                          <span className="text-[10px] text-white/15 ml-auto shrink-0 capitalize">{loc.type}</span>
                        </button>
                      )
                    })
                  ) : (
                    <div className="px-3 py-4 text-center">
                      <p className="text-xs text-white/30 mb-1">No matches found</p>
                      <p className="text-[10px] text-white/20">Press Enter to add "{search.trim()}" anyway</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Popular locations when no search query */}
                  <div className="text-[10px] text-white/20 uppercase tracking-wider font-semibold px-3 py-1.5">Popular cities</div>
                  {POPULAR_LOCATIONS.filter((l) => l.type === 'city').slice(0, 16).map((loc) => {
                    const isAlreadySelected = allSelections.includes(loc.label)
                    return (
                      <button
                        key={loc.label}
                        type="button"
                        onClick={() => addLocation(loc.label)}
                        disabled={isAlreadySelected}
                        className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-left transition-colors ${
                          isAlreadySelected
                            ? 'opacity-30 cursor-not-allowed'
                            : 'hover:bg-white/[0.04]'
                        }`}
                      >
                        <MapPin className="w-3 h-3 text-white/15 shrink-0" />
                        <span className="text-xs text-white/50">{loc.label}</span>
                        {loc.detail && (
                          <span className="text-[10px] text-white/15 ml-auto">{loc.detail}</span>
                        )}
                      </button>
                    )
                  })}
                  <div className="text-[10px] text-white/20 uppercase tracking-wider font-semibold px-3 py-1.5 mt-1">US States</div>
                  {POPULAR_LOCATIONS.filter((l) => l.type === 'state').slice(0, 10).map((loc) => {
                    const isAlreadySelected = allSelections.includes(loc.label)
                    return (
                      <button
                        key={loc.label}
                        type="button"
                        onClick={() => addLocation(loc.label)}
                        disabled={isAlreadySelected}
                        className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-left transition-colors ${
                          isAlreadySelected
                            ? 'opacity-30 cursor-not-allowed'
                            : 'hover:bg-white/[0.04]'
                        }`}
                      >
                        <span className="text-[10px] shrink-0">🏛</span>
                        <span className="text-xs text-white/50">{loc.label}</span>
                      </button>
                    )
                  })}
                  <div className="text-[10px] text-white/20 uppercase tracking-wider font-semibold px-3 py-1.5 mt-1">Countries</div>
                  {POPULAR_LOCATIONS.filter((l) => l.type === 'country').slice(0, 8).map((loc) => {
                    const isAlreadySelected = allSelections.includes(loc.label)
                    return (
                      <button
                        key={loc.label}
                        type="button"
                        onClick={() => addLocation(loc.label)}
                        disabled={isAlreadySelected}
                        className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-left transition-colors ${
                          isAlreadySelected
                            ? 'opacity-30 cursor-not-allowed'
                            : 'hover:bg-white/[0.04]'
                        }`}
                      >
                        <span className="text-[10px] shrink-0">🌐</span>
                        <span className="text-xs text-white/50">{loc.label}</span>
                      </button>
                    )
                  })}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
