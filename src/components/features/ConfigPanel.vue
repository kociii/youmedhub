<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Button } from '@/components/ui/button'
import { useAnalysisStore } from '@/stores/analysis'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { Loader2, ChevronsUpDown } from 'lucide-vue-next'
import userRequest from '@/utils/request'
import { uploadToOSS } from '@/services/oss'

const props = defineProps<{
  buttonOnly?: boolean
}>()

const store = useAnalysisStore()
const userStore = useUserStore()
const { isAnalyzing, progress, videoUrl, videoFile, selectedModel, enableThinking } = storeToRefs(store)

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

// 存储待分析的信息，用于登录后重试
let pendingAnalysis: (() => Promise<void>) | null = null

// 监听登录成功事件
const handleLoginSuccess = () => {
  if (pendingAnalysis) {
    pendingAnalysis()
    pendingAnalysis = null
  }
}

onMounted(() => {
  document.addEventListener('loginSuccess', handleLoginSuccess)
})

onUnmounted(() => {
  document.removeEventListener('loginSuccess', handleLoginSuccess)
})

const handleAnalyze = async () => {
  // 立即禁用按钮，防止重复点击
  if (isAnalyzing.value) {
    console.log('分析正在进行中，忽略重复点击')
    return
  }

  // 1. 首先检查基本条件
  if (!videoFile.value) {
    alert('请先选择视频文件')
    return
  }

  if (!selectedModel.value) {
    alert('请先选择AI模型')
    return
  }

  // 立即设置分析状态为true，禁用按钮
  isAnalyzing.value = true

  // 定义实际的分析逻辑
  const doAnalysis = async () => {
    // 重新检查用户点数（登录状态可能已更新）
    if (userStore.user && userStore.user.credits < 5) {
      alert(`点数不足！当前点数：${userStore.user.credits}，需要：5点数。请充值后再使用分析功能。`)
      // 重置状态
      isAnalyzing.value = false
      return
    }

    try {
      // 1. 上传视频到 OSS
      const uploadedVideoUrl = await uploadToOSS(videoFile.value, (percent) => {
        // 通过store更新进度（如果store有的话）
        store.setProgress?.(Math.min(percent * 0.3, 30)) // 上传占 30% 进度
      })

      // 2. 设置视频URL并使用store的分析方法
      store.setVideoUrl(uploadedVideoUrl)

      // 3. 调用store的分析方法处理流式响应
      // 注意：store.startAnalysis 负责处理错误和重置状态
      await store.startAnalysis()
    } catch (e: any) {
      console.error('分析失败', e)
      alert('分析失败: ' + (e.message || '未知错误'))
      // store.startAnalysis 的 catch 块已经处理了状态重置
      // 这里不需要重复设置 isAnalyzing.value = false
    }
  }

  // 2. 检查用户是否登录，如果没有token就弹出登录框
  if (!userStore.token) {
    // 重置状态（因为还没有真正开始分析）
    isAnalyzing.value = false
    // 存储待分析操作，触发登录弹窗
    pendingAnalysis = doAnalysis
    document.dispatchEvent(new CustomEvent('showLoginModal'))
    return
  }

  // 3. 验证token有效性，如果无效就弹出登录框
  try {
    await userStore.fetchMe()
  } catch (error) {
    // token无效，清除并弹出登录框
    userStore.logout()
    // 重置状态
    isAnalyzing.value = false
    pendingAnalysis = doAnalysis
    document.dispatchEvent(new CustomEvent('showLoginModal'))
    return
  }

  // 4. 执行分析
  await doAnalysis()
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
          @click="store.enableThinking = !enableThinking"
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
