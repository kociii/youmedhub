<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { useAnalysisStore } from '@/stores/analysis'
import { storeToRefs } from 'pinia'
import { Loader2, ChevronsUpDown } from 'lucide-vue-next'
import userRequest from '@/utils/request'
import { uploadToOSS } from '@/services/oss'

const props = defineProps<{
  buttonOnly?: boolean
}>()

const store = useAnalysisStore()
const { isAnalyzing, progress, videoUrl, videoFile, rawResponse, selectedModel, enableThinking } = storeToRefs(store)

interface AvailableModel {
  id: string
  name: string
  provider: string
}

const availableModels = ref<AvailableModel[]>([])

const loadAvailableModels = async () => {
  try {
    const { data } = await userRequest.get('/api/system/models/available')
    availableModels.value = data.models
    if (data.models.length > 0 && !selectedModel.value) {
      selectedModel.value = data.models[0].id
    }
  } catch (e) {
    console.error('加载可用模型失败', e)
  }
}

const handleAnalyze = async () => {
  if (!videoFile.value || !selectedModel.value) return

  store.isAnalyzing = true
  store.progress = 0
  store.segments = []
  store.rawResponse = ''

  try {
    // 1. 上传视频到 OSS
    const uploadedVideoUrl = await uploadToOSS(videoFile.value, (percent) => {
      store.progress = Math.min(percent * 0.3, 30) // 上传占 30% 进度
    })

    // 2. 使用上传后的 URL 进行 AI 分析
    const response = await fetch('http://localhost:8000/api/analysis/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_url: uploadedVideoUrl,
        model_id: selectedModel.value,
        enable_thinking: enableThinking.value
      })
    })

    if (!response.ok) {
      throw new Error('分析请求失败')
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('无法读取响应流')

    const decoder = new TextDecoder()
    let buffer = ''
    let fullContent = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))

            if (data.error) {
              alert('分析失败: ' + data.error)
              store.isAnalyzing = false
              return
            }

            if (data.type === 'content') {
              fullContent += data.data
              store.rawResponse = fullContent
              store.progress = Math.min(30 + store.progress + 2, 95)
            } else if (data.type === 'done') {
              store.progress = 100
              store.rawResponse = data.data
              console.log('AI 完整返回:', data.data)
            }
          } catch (e) {
            console.error('解析流数据失败', e)
          }
        }
      }
    }
  } catch (e: any) {
    console.error('分析失败', e)
    alert('分析失败: ' + (e.message || '未知错误'))
  } finally {
    store.isAnalyzing = false
  }
}

onMounted(loadAvailableModels)
</script>

<template>
  <div v-if="buttonOnly">
    <Button
      class="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="!videoFile || isAnalyzing || availableModels.length === 0"
      @click="handleAnalyze"
    >
      <Loader2 v-if="isAnalyzing" class="w-4 h-4 animate-spin" />
      <span v-if="isAnalyzing">{{ progress < 10 ? '上传中...' : `分析中 ${progress}%` }}</span>
      <span v-else>开始分析</span>
    </Button>
  </div>

  <div v-else class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">AI 模型</label>
      <div class="relative">
        <select
          v-model="selectedModel"
          :disabled="availableModels.length === 0"
          class="w-full rounded-lg border border-gray-300 pl-3 pr-10 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none"
        >
          <option v-if="availableModels.length === 0" value="">暂无可用模型</option>
          <option v-for="model in availableModels" :key="model.id" :value="model.id">
            {{ model.name }} - {{ model.provider }}
          </option>
        </select>
        <ChevronsUpDown class="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>
      <p v-if="availableModels.length === 0" class="text-xs text-gray-500 mt-1">
        请先在管理后台配置 AI 模型
      </p>
    </div>

    <div>
      <label class="flex items-center justify-between">
        <span class="text-sm text-gray-700">启用思考模式</span>
        <button
          type="button"
          role="switch"
          :aria-checked="enableThinking"
          @click="enableThinking = !enableThinking"
          :class="[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            enableThinking ? 'bg-blue-600' : 'bg-gray-200'
          ]"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              enableThinking ? 'translate-x-6' : 'translate-x-1'
            ]"
          />
        </button>
      </label>
    </div>
  </div>
</template>
