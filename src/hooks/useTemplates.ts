import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export interface ResearchTemplate {
  id: string
  name: string
  config: TemplateConfig
  isDefault: boolean
  isCustom: boolean
}

export interface TemplateConfig {
  focusAreas: string[]
  customPrompt: string
  sectionOrder: string[]
}

const DEFAULT_TEMPLATES: ResearchTemplate[] = [
  {
    id: 'general',
    name: 'General',
    config: {
      focusAreas: ['overview', 'swot', 'competitive', 'financials', 'hiring', 'outreach'],
      customPrompt: '',
      sectionOrder: ['overview', 'swot', 'competitive', 'financials', 'hiring', 'outreach'],
    },
    isDefault: true,
    isCustom: false,
  },
  {
    id: 'investor',
    name: 'Investor DD',
    config: {
      focusAreas: ['financials', 'competitive', 'swot', 'risk', 'overview'],
      customPrompt: 'Focus on financial metrics, unit economics, market size, and investment risk factors.',
      sectionOrder: ['overview', 'financials', 'competitive', 'swot', 'risk'],
    },
    isDefault: true,
    isCustom: false,
  },
  {
    id: 'competitive',
    name: 'Competitive',
    config: {
      focusAreas: ['competitive', 'swot', 'overview'],
      customPrompt: 'Deep competitive analysis: positioning, differentiation, market share, and strategic moves.',
      sectionOrder: ['competitive', 'swot', 'overview'],
    },
    isDefault: true,
    isCustom: false,
  },
  {
    id: 'partnership',
    name: 'Partnership',
    config: {
      focusAreas: ['overview', 'competitive', 'outreach'],
      customPrompt: 'Evaluate partnership potential: synergies, integration points, and strategic fit.',
      sectionOrder: ['overview', 'competitive', 'outreach'],
    },
    isDefault: true,
    isCustom: false,
  },
  {
    id: 'sales',
    name: 'Sales',
    config: {
      focusAreas: ['overview', 'hiring', 'outreach', 'swot'],
      customPrompt: 'Focus on sales-relevant insights: pain points, buying triggers, and personalized outreach.',
      sectionOrder: ['overview', 'swot', 'hiring', 'outreach'],
    },
    isDefault: true,
    isCustom: false,
  },
]

export function useTemplates(userId?: string) {
  const [customTemplates, setCustomTemplates] = useState<ResearchTemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const enabled = isSupabaseConfigured() && !!userId

  const allTemplates = [...DEFAULT_TEMPLATES, ...customTemplates]

  const refresh = useCallback(async () => {
    if (!enabled || !supabase) return
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('icp_profiles')
        .select('id, name, icp_data, created_at')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Use icp_profiles table with a naming convention for templates
      // Templates are stored with name prefixed "template:"
      setCustomTemplates(
        (data ?? [])
          .filter((d) => d.name.startsWith('template:'))
          .map((d) => ({
            id: d.id,
            name: d.name.replace('template:', ''),
            config: d.icp_data as unknown as TemplateConfig,
            isDefault: false,
            isCustom: true,
          }))
      )
    } finally {
      setIsLoading(false)
    }
  }, [enabled, userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const saveTemplate = useCallback(
    async (name: string, config: TemplateConfig) => {
      if (!supabase || !userId) return
      const { error } = await supabase
        .from('icp_profiles')
        .insert({
          user_id: userId,
          name: `template:${name}`,
          icp_data: config as unknown as Record<string, unknown>,
        })
      if (error) throw new Error(error.message)
      await refresh()
    },
    [supabase, userId, refresh]
  )

  const updateTemplate = useCallback(
    async (id: string, name: string, config: TemplateConfig) => {
      if (!supabase) return
      const { error } = await supabase
        .from('icp_profiles')
        .update({
          name: `template:${name}`,
          icp_data: config as unknown as Record<string, unknown>,
        })
        .eq('id', id)
      if (error) throw new Error(error.message)
      await refresh()
    },
    [supabase, refresh]
  )

  const deleteTemplate = useCallback(
    async (id: string) => {
      if (!supabase) return
      const { error } = await supabase
        .from('icp_profiles')
        .delete()
        .eq('id', id)
      if (error) throw new Error(error.message)
      await refresh()
    },
    [supabase, refresh]
  )

  const duplicateTemplate = useCallback(
    async (template: ResearchTemplate) => {
      await saveTemplate(`${template.name} (copy)`, { ...template.config })
    },
    [saveTemplate]
  )

  return {
    templates: allTemplates,
    customTemplates,
    defaultTemplates: DEFAULT_TEMPLATES,
    isLoading,
    enabled,
    refresh,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
  }
}
