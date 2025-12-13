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
  thinking_params: ''
})

const showKey = ref(false)

watch(() => props.model, (newModel) => {
  if (newModel) {
    form.value = { ...newModel }
  } else {
    form.value = { id: '', name: '', provider: '', api_key: '', base_url: '', prompt: '', thinking_params: '' }
  }
}, { immediate: true })

const handleSave = () => {
  emit('save', form.value)
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="emit('close')">
    <div class="bg-white rounded-lg w-full max-w-md p-6 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900">{{ model ? '编辑模型' : '新增模型' }}</h2>
        <button @click="emit('close')" class="text-gray-400 hover:text-gray-600">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">模型名称</label>
          <input v-model="form.name" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">提供商</label>
          <input v-model="form.provider" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">API Key</label>
          <div class="relative">
            <input v-model="form.api_key" :type="showKey ? 'text' : 'password'" class="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none" />
            <button @click="showKey = !showKey" class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <Eye v-if="!showKey" class="w-4 h-4" />
              <EyeOff v-else class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
          <input v-model="form.base_url" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">提示词</label>
          <textarea v-model="form.prompt" rows="4" placeholder="为该模型配置专属提示词..." class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"></textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">思考模式参数（JSON 格式）</label>
          <textarea v-model="form.thinking_params" rows="3" placeholder='例如 Qwen: {"enable_thinking": true}&#10;例如 GLM: {"thinking": {"type": "enabled"}}' class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none font-mono text-xs"></textarea>
        </div>
      </div>

      <div class="flex gap-2 pt-4">
        <Button @click="emit('close')" class="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200">取消</Button>
        <Button @click="handleSave" class="flex-1 bg-blue-600 text-white hover:bg-blue-700">保存</Button>
      </div>
    </div>
  </div>
</template>
