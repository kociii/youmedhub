<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Plus, Edit, CheckCircle, XCircle, Trash2 } from 'lucide-vue-next'
import ModelDialog from './ModelDialog.vue'
import { adminRequest } from '@/utils/request'

interface AIModel {
  id: string
  name: string
  provider: string
  api_key: string
  base_url: string
  prompt: string
  thinking_params: string
  has_key: boolean
  is_active: boolean
}

const models = ref<AIModel[]>([])
const dialogOpen = ref(false)
const editingModel = ref<AIModel>()

const loadConfig = async () => {
  try {
    const { data } = await adminRequest.get('/api/system/models')
    models.value = data.models.map((m: any) => ({
      ...m,
      has_key: !!m.api_key,
      is_active: m.is_active ?? true
    }))
  } catch (e) {
    console.error('加载配置失败', e)
  }
}

const handleAdd = () => {
  editingModel.value = undefined
  dialogOpen.value = true
}

const handleEdit = (model: AIModel) => {
  editingModel.value = { ...model }
  dialogOpen.value = true
}

const handleSave = async (model: AIModel) => {
  try {
    if (editingModel.value) {
      await adminRequest.put(`/api/system/models/${model.id}`, {
        name: model.name,
        provider: model.provider,
        api_key: model.api_key,
        base_url: model.base_url,
        prompt: model.prompt,
        thinking_params: model.thinking_params,
        is_active: model.is_active
      })
    } else {
      await adminRequest.post('/api/system/models', {
        name: model.name,
        provider: model.provider,
        api_key: model.api_key,
        base_url: model.base_url,
        prompt: model.prompt,
        thinking_params: model.thinking_params,
        is_active: model.is_active
      })
    }
    dialogOpen.value = false
    await loadConfig()
  } catch (e: any) {
    alert(e.response?.data?.detail || '保存失败')
  }
}

const handleDelete = async (model: AIModel) => {
  if (!confirm(`确定要删除模型 ${model.name} 吗？`)) return

  try {
    await adminRequest.delete(`/api/system/models/${model.id}`)
    await loadConfig()
  } catch (e: any) {
    alert(e.response?.data?.detail || '删除失败')
  }
}

onMounted(loadConfig)
</script>

<template>
  <div class="p-8 max-w-7xl mx-auto space-y-8">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">AI 模型</h1>
        <p class="text-sm text-gray-500 mt-1">配置和管理您的 AI 模型接口</p>
      </div>
      <Button @click="handleAdd" class="bg-gray-900 text-white hover:bg-gray-800 shadow-sm transition-all">
        <Plus class="w-4 h-4 mr-2" />
        新增模型
      </Button>
    </div>

    <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-50/50 border-b border-gray-200">
          <tr>
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">模型名称</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">提供商</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Base URL</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">API Key</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">激活状态</th>
            <th class="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="model in models" :key="model.id" class="hover:bg-gray-50/50 transition-colors">
            <td class="px-6 py-4 text-sm font-medium text-gray-900">{{ model.name }}</td>
            <td class="px-6 py-4 text-sm text-gray-600">
              <span class="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-xs font-medium text-gray-700 border border-gray-200">
                {{ model.provider }}
              </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500 font-mono text-xs truncate max-w-xs">{{ model.base_url }}</td>
            <td class="px-6 py-4">
              <span v-if="model.has_key" class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200/50">
                <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                已配置
              </span>
              <span v-else class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                <span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                未配置
              </span>
            </td>
            <td class="px-6 py-4">
              <span v-if="model.is_active" class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/50">
                <CheckCircle class="w-3 h-3" />
                已启用
              </span>
              <span v-else class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                <XCircle class="w-3 h-3" />
                已禁用
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <div class="flex gap-2 justify-end">
                <Button @click="handleEdit(model)" variant="outline" size="sm" class="h-8 text-xs border-gray-200 hover:bg-gray-50 hover:text-gray-900">
                  编辑
                </Button>
                <Button @click="handleDelete(model)" variant="ghost" size="sm" class="h-8 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50">
                  删除
                </Button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ModelDialog :open="dialogOpen" :model="editingModel" @close="dialogOpen = false" @save="handleSave" />
  </div>
</template>
