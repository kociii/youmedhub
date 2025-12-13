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
  status: 'active' | 'inactive'
}

const models = ref<AIModel[]>([])
const dialogOpen = ref(false)
const editingModel = ref<AIModel>()

const loadConfig = async () => {
  try {
    const { data } = await adminRequest.get('/api/system/models')
    models.value = data.models.map((m: any) => ({
      ...m,
      status: m.has_key ? 'active' : 'inactive'
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
        thinking_params: model.thinking_params
      })
    } else {
      await adminRequest.post('/api/system/models', {
        name: model.name,
        provider: model.provider,
        api_key: model.api_key,
        base_url: model.base_url,
        prompt: model.prompt,
        thinking_params: model.thinking_params
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
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-gray-900">AI 模型管理</h1>
        <p class="text-sm text-gray-500 mt-1">配置和管理您的 AI 模型</p>
      </div>
      <Button @click="handleAdd" class="bg-blue-600 text-white hover:bg-blue-700">
        <Plus class="w-4 h-4 mr-2" />
        新增模型
      </Button>
    </div>

    <div class="bg-white rounded-lg border border-gray-200">
      <table class="w-full">
        <thead class="border-b border-gray-200">
          <tr>
            <th class="text-left px-6 py-3 text-sm font-medium text-gray-700">模型名称</th>
            <th class="text-left px-6 py-3 text-sm font-medium text-gray-700">提供商</th>
            <th class="text-left px-6 py-3 text-sm font-medium text-gray-700">Base URL</th>
            <th class="text-left px-6 py-3 text-sm font-medium text-gray-700">状态</th>
            <th class="text-right px-6 py-3 text-sm font-medium text-gray-700">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="model in models" :key="model.id" class="border-b border-gray-100 hover:bg-gray-50">
            <td class="px-6 py-4 text-sm font-medium text-gray-900">{{ model.name }}</td>
            <td class="px-6 py-4 text-sm text-gray-600">{{ model.provider }}</td>
            <td class="px-6 py-4 text-sm text-gray-600 truncate max-w-xs">{{ model.base_url }}</td>
            <td class="px-6 py-4">
              <span v-if="model.has_key" class="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
                <CheckCircle class="w-3 h-3" />
                已配置
              </span>
              <span v-else class="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-500 text-xs rounded-full">
                <XCircle class="w-3 h-3" />
                未配置
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <div class="flex gap-2 justify-end">
                <Button @click="handleEdit(model)" class="text-sm bg-gray-100 text-gray-700 hover:bg-gray-200">
                  <Edit class="w-3 h-3 mr-1" />
                  编辑
                </Button>
                <Button @click="handleDelete(model)" class="text-sm bg-red-50 text-red-600 hover:bg-red-100">
                  <Trash2 class="w-3 h-3 mr-1" />
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
