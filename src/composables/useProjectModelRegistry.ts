import { computed, ref } from 'vue'
import { AVAILABLE_MODELS } from '@/config/models'
import type { AiModelCategory } from '@/projects/types'

export interface ProjectModelRegistryItem {
  id: string
  name: string
  provider: 'aliyun-bailian'
  category: AiModelCategory
  isEnabled: boolean
  description?: string
}

const PROJECT_MODEL_REGISTRY_STORAGE_KEY = 'project_model_registry'

function mapCapabilitiesToCategory(capabilities: Array<'video' | 'image' | 'text'>): AiModelCategory {
  if (capabilities.includes('text')) return 'text'
  if (capabilities.includes('image')) return 'image'
  return 'video'
}

function getDefaultRegistry(): ProjectModelRegistryItem[] {
  return AVAILABLE_MODELS.map(model => ({
    id: model.id,
    name: model.name,
    provider: 'aliyun-bailian',
    category: mapCapabilitiesToCategory(model.capabilities),
    isEnabled: true,
    description: model.description,
  }))
}

function parseStoredRegistry(raw: string | null): ProjectModelRegistryItem[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is ProjectModelRegistryItem => {
      return Boolean(
        item &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.category === 'string' &&
        typeof item.isEnabled === 'boolean',
      )
    })
  } catch {
    return []
  }
}

function mergeRegistry(defaults: ProjectModelRegistryItem[], overrides: ProjectModelRegistryItem[]) {
  const overrideMap = new Map(overrides.map(item => [item.id, item]))
  const merged = defaults.map(item => {
    const override = overrideMap.get(item.id)
    return override ? { ...item, ...override } : item
  })

  for (const override of overrides) {
    if (!merged.find(item => item.id === override.id)) {
      merged.push(override)
    }
  }

  return merged
}

const allModels = ref<ProjectModelRegistryItem[]>([])
const loaded = ref(false)

export function useProjectModelRegistry() {
  function loadRegistry() {
    const defaults = getDefaultRegistry()
    const fromStorage = parseStoredRegistry(localStorage.getItem(PROJECT_MODEL_REGISTRY_STORAGE_KEY))
    allModels.value = mergeRegistry(defaults, fromStorage)
    loaded.value = true
  }

  function ensureLoaded() {
    if (!loaded.value) {
      loadRegistry()
    }
  }

  function listModelsByCategory(category: AiModelCategory): ProjectModelRegistryItem[] {
    ensureLoaded()
    return allModels.value.filter(item => item.category === category && item.isEnabled)
  }

  function getModelById(modelId: string): ProjectModelRegistryItem | null {
    ensureLoaded()
    return allModels.value.find(item => item.id === modelId) || null
  }

  function isModelEnabled(modelId: string): boolean {
    const model = getModelById(modelId)
    return !!model?.isEnabled
  }

  const enabledModels = computed(() => allModels.value.filter(item => item.isEnabled))

  return {
    allModels,
    enabledModels,
    loadRegistry,
    listModelsByCategory,
    getModelById,
    isModelEnabled,
  }
}
