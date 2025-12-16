<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { adminRequest } from '@/utils/request'
import { messageManager } from '@/utils/message'
import { Search, Eye, Clock, User, Bot, FileText, Calendar, Filter, Download } from 'lucide-vue-next'

interface Task {
  id: number  // 后端返回的是 number 类型
  user_id: number
  user_username: string
  user_email: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  input_data: {
    video_url?: string
    video_name?: string
    video_size?: number
    video_duration?: number
    model_id?: string
    enable_thinking?: string
    prompt?: string
  }
  result_data?: any
  created_at: string
  started_at?: string
  completed_at?: string
  duration_ms?: number
  error_message?: string
  credits_consumed: number
}

const tasks = ref<Task[]>([])
const loading = ref(false)
const searchQuery = ref('')
const statusFilter = ref<string>('all')
const currentPage = ref(1)
const totalPages = ref(1)
const pageSize = 20
const selectedTask = ref<Task | null>(null)
const showDetailDialog = ref(false)

// 状态选项
const statusOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '等待中' },
  { value: 'processing', label: '处理中' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '失败' }
]

// 状态颜色映射
const statusColors = {
  pending: 'bg-gray-100 text-gray-700',
  processing: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700'
}

// 状态标签映射
const statusLabels = {
  pending: '等待中',
  processing: '处理中',
  completed: '已完成',
  failed: '失败'
}

const fetchTasks = async (page = 1) => {
  loading.value = true
  try {
    const params: any = {
      skip: (page - 1) * pageSize,
      limit: pageSize
    }

    if (searchQuery.value) {
      params.search = searchQuery.value
    }

    if (statusFilter.value !== 'all') {
      params.status = statusFilter.value
    }

    const response = await adminRequest.get('/api/admin/tasks', { params })

    // 处理响应数据
    let responseData = response.data
    if (responseData && typeof responseData === 'object') {
      if (responseData.success === false) {
        // 如果响应格式为 {success: false, error: {...}}
        throw new Error(responseData.error?.message || '请求失败')
      }

      // 处理标准响应格式
      if (responseData.items) {
        tasks.value = responseData.items
        totalPages.value = Math.ceil((responseData.total || tasks.value.length) / pageSize)
      } else if (Array.isArray(responseData)) {
        // 如果直接返回数组
        tasks.value = responseData
        totalPages.value = Math.ceil(tasks.value.length / pageSize)
      } else {
        console.warn('未知的响应格式:', responseData)
        tasks.value = []
        totalPages.value = 0
      }
    } else {
      console.error('响应数据格式错误:', responseData)
      tasks.value = []
      totalPages.value = 0
    }

    currentPage.value = page
  } catch (error: any) {
    console.error('获取任务列表失败:', error)
    messageManager.error('获取任务列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  fetchTasks(1)
}

const handleFilter = () => {
  currentPage.value = 1
  fetchTasks(1)
}

const viewDetail = (task: Task) => {
  selectedTask.value = task
  showDetailDialog.value = true
}

const closeDetailDialog = () => {
  showDetailDialog.value = false
  selectedTask.value = null
}

const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

const formatDuration = (ms?: number) => {
  if (!ms) return '-'
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}小时${minutes % 60}分钟`
  } else if (minutes > 0) {
    return `${minutes}分钟${seconds % 60}秒`
  } else {
    return `${seconds}秒`
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return Clock
    case 'processing':
      return Bot
    case 'completed':
      return FileText
    case 'failed':
      return '❌'
    default:
      return FileText
  }
}

onMounted(() => {
  fetchTasks()
})
</script>

<template>
  <div class="p-8 max-w-7xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">AI 任务管理</h1>
        <p class="text-sm text-gray-500 mt-1">管理所有AI分析任务和历史记录</p>
      </div>
    </div>

    <!-- 搜索和筛选栏 -->
    <div class="flex items-center gap-4">
      <div class="flex-1 relative max-w-md">
        <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          v-model="searchQuery"
          @keyup.enter="handleSearch"
          type="text"
          placeholder="搜索用户名、邮箱或任务ID..."
          class="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
        />
      </div>

      <select
        v-model="statusFilter"
        @change="handleFilter"
        class="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
      >
        <option v-for="option in statusOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>

      <Button @click="handleSearch" size="sm" class="h-10 px-4 bg-gray-900 hover:bg-gray-800">
        <Filter class="w-4 h-4 mr-2" />
        筛选
      </Button>
    </div>

    <!-- 任务列表 -->
    <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50/50 border-b border-gray-200">
            <tr>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">任务信息</th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">用户</th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">时长</th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">消耗点数</th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
              <th class="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="loading" class="text-center">
              <td colspan="7" class="px-6 py-12">
                <div class="text-gray-500">加载中...</div>
              </td>
            </tr>
            <tr v-else-if="tasks.length === 0" class="text-center">
              <td colspan="7" class="px-6 py-12">
                <div class="text-gray-500">暂无任务数据</div>
              </td>
            </tr>
            <tr v-for="task in tasks" :key="task.id" class="hover:bg-gray-50/50 transition-colors">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <component :is="getStatusIcon(task.status)" class="w-5 h-5 text-gray-400" />
                  <div>
                    <div class="text-sm font-medium text-gray-900">#{{ task.id }}</div>
                    <div class="text-xs text-gray-500">ID: {{ task.id }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm">
                  <div class="font-medium text-gray-900">{{ task.user_username }}</div>
                  <div class="text-gray-500">{{ task.user_email }}</div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span :class="[
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  statusColors[task.status]
                ]">
                  {{ statusLabels[task.status] }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-600">
                {{ formatDuration(task.duration_ms) }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-600">
                {{ task.credits_consumed }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-500">
                {{ formatDate(task.created_at) }}
              </td>
              <td class="px-6 py-4 text-right">
                <Button @click="viewDetail(task)" variant="outline" size="sm" class="h-8 text-xs border-gray-200 hover:bg-gray-50">
                  <Eye class="w-3 h-3 mr-1" />
                  查看详情
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="bg-white rounded-lg border border-gray-200 shadow-sm px-6 py-3">
      <div class="flex items-center justify-between">
        <div class="text-sm text-gray-500">
          显示第 {{ (currentPage - 1) * pageSize + 1 }} 到 {{ Math.min(currentPage * pageSize, tasks.length) }} 条，共 {{ tasks.length }} 条
        </div>
        <div class="flex gap-2">
          <Button
            @click="fetchTasks(currentPage - 1)"
            :disabled="currentPage <= 1"
            variant="outline"
            size="sm"
            class="h-8 text-xs border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </Button>
          <span class="px-3 py-1 text-sm text-gray-600">
            {{ currentPage }} / {{ totalPages }}
          </span>
          <Button
            @click="fetchTasks(currentPage + 1)"
            :disabled="currentPage >= totalPages"
            variant="outline"
            size="sm"
            class="h-8 text-xs border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </Button>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <div v-if="showDetailDialog && selectedTask" class="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" @click.self="closeDetailDialog">
      <div class="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden p-6 space-y-6 shadow-2xl border border-gray-100 transform transition-all">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold text-gray-900">任务详情</h2>
          <button @click="closeDetailDialog" class="text-gray-400 hover:text-gray-600 transition-colors">
            <Eye class="w-6 h-6" />
          </button>
        </div>

        <div class="grid grid-cols-2 gap-6">
          <!-- 基本信息 -->
          <div class="space-y-4">
            <div>
              <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">基本信息</h3>
              <dl class="space-y-2">
                <div class="flex justify-between">
                  <dt class="text-sm text-gray-600">任务ID</dt>
                  <dd class="text-sm font-medium text-gray-900">{{ selectedTask.id }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-sm text-gray-600">状态</dt>
                  <dd>
                    <span :class="[
                      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                      statusColors[selectedTask.status]
                    ]">
                      {{ statusLabels[selectedTask.status] }}
                    </span>
                  </dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-sm text-gray-600">处理时长</dt>
                  <dd class="text-sm font-medium text-gray-900">{{ formatDuration(selectedTask.duration_ms) }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-sm text-gray-600">消耗点数</dt>
                  <dd class="text-sm font-medium text-gray-900">{{ selectedTask.credits_consumed }}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">时间记录</h3>
              <dl class="space-y-2">
                <div class="flex justify-between">
                  <dt class="text-sm text-gray-600">创建时间</dt>
                  <dd class="text-sm font-medium text-gray-900">{{ formatDate(selectedTask.created_at) }}</dd>
                </div>
                <div v-if="selectedTask.started_at" class="flex justify-between">
                  <dt class="text-sm text-gray-600">开始时间</dt>
                  <dd class="text-sm font-medium text-gray-900">{{ formatDate(selectedTask.started_at) }}</dd>
                </div>
                <div v-if="selectedTask.completed_at" class="flex justify-between">
                  <dt class="text-sm text-gray-600">完成时间</dt>
                  <dd class="text-sm font-medium text-gray-900">{{ formatDate(selectedTask.completed_at) }}</dd>
                </div>
              </dl>
            </div>
          </div>

          <!-- 用户信息 -->
          <div class="space-y-4">
            <div>
              <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">用户信息</h3>
              <dl class="space-y-2">
                <div class="flex justify-between">
                  <dt class="text-sm text-gray-600">用户名</dt>
                  <dd class="text-sm font-medium text-gray-900">{{ selectedTask.user_username }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-sm text-gray-600">邮箱</dt>
                  <dd class="text-sm font-medium text-gray-900">{{ selectedTask.user_email }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-sm text-gray-600">用户ID</dt>
                  <dd class="text-sm font-medium text-gray-900">{{ selectedTask.user_id }}</dd>
                </div>
              </dl>
            </div>

            <div v-if="selectedTask.error_message">
              <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">错误信息</h3>
              <div class="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p class="text-sm text-red-700">{{ selectedTask.error_message }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 输入数据 -->
        <div v-if="selectedTask.input_data">
          <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">提交内容</h3>
          <div class="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <pre class="text-sm text-gray-700 whitespace-pre-wrap">{{ JSON.stringify(selectedTask.input_data, null, 2) }}</pre>
          </div>
        </div>

        <!-- 结果数据 -->
        <div v-if="selectedTask.result_data">
          <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">AI回复结果</h3>
          <div class="p-4 bg-green-50 border border-green-200 rounded-lg">
            <pre class="text-sm text-gray-700 whitespace-pre-wrap">{{ JSON.stringify(selectedTask.result_data, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>