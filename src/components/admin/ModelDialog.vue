<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { X, Eye, EyeOff } from 'lucide-vue-next'

interface AIModel {
  id: string
  name: string
  provider: string
  api_key: string
  base_url: string
  prompt: string
  thinking_params: string
  is_active: boolean
}

const props = defineProps<{
  open: boolean
  model?: AIModel
}>()

const emit = defineEmits<{
  close: []
  save: [model: AIModel]
}>()

const form = ref<AIModel>({
  id: '',
  name: '',
  provider: '',
  api_key: '',
  base_url: '',
  prompt: '',
  thinking_params: '',
  is_active: true
})

const showKey = ref(false)

watch(() => props.model, (newModel) => {
  if (newModel) {
    form.value = { ...newModel }
  } else {
    form.value = { id: '', name: '', provider: '', api_key: '', base_url: '', prompt: '', thinking_params: '', is_active: true }
  }
}, { immediate: true })

const handleSave = () => {
  emit('save', form.value)
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" @click.self="emit('close')">
    <div class="bg-white rounded-xl w-full max-w-md p-6 space-y-6 shadow-2xl border border-gray-100 transform transition-all">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900">{{ model ? '编辑模型' : '新增模型' }}</h2>
        <button @click="emit('close')" class="text-gray-400 hover:text-gray-600 transition-colors">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">模型名称</label>
          <input v-model="form.name" type="text" class="w-full rounded-md border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:bg-white outline-none transition-all" placeholder="例如：Qwen-Max" />
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">提供商</label>
          <div class="relative">
            <select v-model="form.provider" class="w-full appearance-none rounded-md border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:bg-white outline-none transition-all">
              <option value="">请选择提供商</option>
              <option value="aliyun">阿里云 (Qwen)</option>
              <option value="智谱">智谱 (GLM)</option>
            </select>
            <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">API Key</label>
          <div class="relative">
            <input v-model="form.api_key" :type="showKey ? 'text' : 'password'" class="w-full rounded-md border border-gray-200 bg-gray-50/50 px-3 py-2 pr-10 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:bg-white outline-none transition-all font-mono" placeholder="sk-..." />
            <button @click="showKey = !showKey" class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <Eye v-if="!showKey" class="w-4 h-4" />
              <EyeOff v-else class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Base URL</label>
          <input v-model="form.base_url" type="text" class="w-full rounded-md border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:bg-white outline-none transition-all font-mono" placeholder="https://..." />
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">提示词</label>
          <textarea v-model="form.prompt" rows="4" placeholder="为该模型配置专属提示词..." class="w-full rounded-md border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:bg-white outline-none resize-none transition-all"></textarea>
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">思考模式参数（JSON）</label>
          <textarea v-model="form.thinking_params" rows="3" placeholder='例如 Qwen: {"enable_thinking": true}' class="w-full rounded-md border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs font-mono focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:bg-white outline-none resize-none transition-all"></textarea>
        </div>

        <div>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              v-model="form.is_active"
              class="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900 focus:ring-1"
            />
            <span class="text-sm font-medium text-gray-700">启用此模型</span>
          </label>
          <p class="mt-1 text-xs text-gray-500">禁用的模型不会出现在前端的模型选择列表中</p>
        </div>
      </div>

      <div class="flex justify-end gap-3 pt-2">
        <Button variant="outline" @click="emit('close')" class="border-gray-200 hover:bg-gray-50 text-gray-700">取消</Button>
        <Button @click="handleSave" class="bg-gray-900 text-white hover:bg-gray-800 shadow-sm">保存配置</Button>
      </div>
    </div>
  </div>
</template>
