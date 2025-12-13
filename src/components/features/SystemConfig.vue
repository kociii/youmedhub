<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Save, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-vue-next'
import axios from 'axios'

interface AIModel {
  id: string
  name: string
  provider: string
  api_key: string
  base_url: string
  has_key: boolean
  status: 'active' | 'inactive'
}

const models = ref<AIModel[]>([
  {
    id: 'openai',
    name: 'OpenAI',
    provider: 'OpenAI',
    api_key: '',
    base_url: 'https://api.openai.com/v1',
    has_key: false,
    status: 'inactive'
  },
  {
    id: 'qwen',
    name: 'Qwen (DashScope)',
    provider: '阿里云百炼',
    api_key: '',
    base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    has_key: false,
    status: 'inactive'
  }
])

const showKeys = ref<Record<string, boolean>>({})

const activeModels = computed(() => models.value.filter(m => m.has_key))
const inactiveModels = computed(() => models.value.filter(m => !m.has_key))

const loadConfig = async () => {
  try {
    const { data } = await axios.get('http://localhost:8000/api/system/config')
    models.value[0].base_url = data.models.openai.base_url
    models.value[0].has_key = data.models.openai.has_key
    models.value[0].status = data.models.openai.has_key ? 'active' : 'inactive'

    models.value[1].base_url = data.models.qwen.base_url
    models.value[1].has_key = data.models.qwen.has_key
    models.value[1].status = data.models.qwen.has_key ? 'active' : 'inactive'
  } catch (e) {
    console.error('加载配置失败', e)
  }
}

const saveConfig = async () => {
  try {
    const config: Record<string, any> = {}
    models.value.forEach(model => {
      config[model.id] = {
        name: model.name,
        api_key: model.api_key,
        base_url: model.base_url
      }
    })

    await axios.post('http://localhost:8000/api/system/config', config)
    alert('配置已保存')
    await loadConfig()
  } catch (e) {
    alert('保存失败')
  }
}

const toggleKeyVisibility = (id: string) => {
  showKeys.value[id] = !showKeys.value[id]
}

onMounted(loadConfig)
</script>

<template>
  <div class="p-6 space-y-6 max-w-6xl mx-auto">
    <div>
      <h1 class="text-2xl font-semibold text-gray-900">AI 模型管理</h1>
      <p class="text-sm text-gray-500 mt-1">配置和管理您的 AI 模型</p>
    </div>

    <!-- 当前可用模型 -->
    <div class="bg-white rounded-lg border border-gray-200 p-6">
      <h2 class="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
        <CheckCircle class="w-5 h-5 text-green-500" />
        当前可用模型 ({{ activeModels.length }})
      </h2>

      <div v-if="activeModels.length === 0" class="text-center py-8 text-gray-400">
        暂无可用模型，请先配置 API Key
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="model in activeModels"
          :key="model.id"
          class="border border-green-200 bg-green-50 rounded-lg p-4"
        >
          <div class="flex items-start justify-between">
            <div>
              <h3 class="font-medium text-gray-900">{{ model.name }}</h3>
              <p class="text-sm text-gray-500">{{ model.provider }}</p>
            </div>
            <span class="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">已配置</span>
          </div>
          <div class="mt-3 text-xs text-gray-600">
            <div class="truncate">{{ model.base_url }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 模型配置 -->
    <div class="bg-white rounded-lg border border-gray-200 p-6">
      <h2 class="text-lg font-medium text-gray-900 mb-4">模型配置</h2>

      <div class="space-y-6">
        <div
          v-for="model in models"
          :key="model.id"
          class="border border-gray-200 rounded-lg p-4"
        >
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="font-medium text-gray-900">{{ model.name }}</h3>
              <p class="text-sm text-gray-500">{{ model.provider }}</p>
            </div>
            <div class="flex items-center gap-2">
              <CheckCircle v-if="model.has_key" class="w-5 h-5 text-green-500" />
              <XCircle v-else class="w-5 h-5 text-gray-300" />
            </div>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <div class="relative">
                <input
                  v-model="model.api_key"
                  :type="showKeys[model.id] ? 'text' : 'password'"
                  placeholder="sk-..."
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
                <button
                  @click="toggleKeyVisibility(model.id)"
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <Eye v-if="!showKeys[model.id]" class="w-4 h-4" />
                  <EyeOff v-else class="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
              <input
                v-model="model.base_url"
                type="text"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="mt-6 pt-6 border-t border-gray-200">
        <Button @click="saveConfig" class="bg-blue-600 hover:bg-blue-700 text-white">
          <Save class="w-4 h-4 mr-2" />
          保存所有配置
        </Button>
      </div>
    </div>
  </div>
</template>
