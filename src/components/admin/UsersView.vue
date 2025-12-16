<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { adminRequest } from '@/utils/request'
import { messageManager } from '@/utils/message'
import { Search, Edit2, Save, X, Plus, Wallet, Trash2 } from 'lucide-vue-next'

interface User {
  id: number
  username: string
  email: string
  credits: number
  is_admin: boolean
  created_at: string
  updated_at?: string
}

const users = ref<User[]>([])
const loading = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const totalPages = ref(1)
const pageSize = 10
const editingId = ref<number | null>(null)
const editingData = ref<{ username: string; email: string }>({ username: '', email: '' })
const adjustingCreditsId = ref<number | null>(null)
const creditsDialog = ref(false)
const creditsForm = ref({ credits: 0, reason: '' })

const fetchUsers = async (page = 1) => {
  loading.value = true
  try {
    const params: any = { skip: (page - 1) * pageSize, limit: pageSize }
    if (searchQuery.value) {
      params.search = searchQuery.value
    }

    const response = await adminRequest.get('/api/admin/users', { params })
    users.value = response.data.items || response.data
    totalPages.value = Math.ceil((response.data.total || users.value.length) / pageSize)
    currentPage.value = page
  } catch (error: any) {
    console.error('获取用户列表失败:', error)
    messageManager.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  fetchUsers(1)
}

const startEdit = (user: User) => {
  editingId.value = user.id
  editingData.value = {
    username: user.username,
    email: user.email
  }
}

const cancelEdit = () => {
  editingId.value = null
  editingData.value = { username: '', email: '' }
}

const saveEdit = async (userId: number) => {
  try {
    const updateData: any = {}
    if (editingData.value.username) updateData.username = editingData.value.username
    if (editingData.value.email) updateData.email = editingData.value.email

    if (Object.keys(updateData).length === 0) {
      messageManager.warning('没有修改内容')
      return
    }

    await adminRequest.put(`/api/admin/users/${userId}`, updateData)
    messageManager.success('用户信息更新成功')
    editingId.value = null
    fetchUsers(currentPage.value)
  } catch (error: any) {
    console.error('更新用户失败:', error)
    messageManager.error(error.response?.data?.detail || '更新用户失败')
  }
}

const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

const openCreditsDialog = (user: User) => {
  adjustingCreditsId.value = user.id
  creditsForm.value = {
    credits: user.credits,
    reason: ''
  }
  creditsDialog.value = true
}

const closeCreditsDialog = () => {
  creditsDialog.value = false
  adjustingCreditsId.value = null
  creditsForm.value = { credits: 0, reason: '' }
}

const saveCredits = async () => {
  if (!adjustingCreditsId.value) return

  try {
    await adminRequest.post(`/api/admin/users/${adjustingCreditsId.value}/adjust-credits`, {
      credits: creditsForm.value.credits,
      reason: creditsForm.value.reason
    })
    messageManager.success('点数调整成功')
    closeCreditsDialog()
    fetchUsers(currentPage.value)
  } catch (error: any) {
    console.error('调整点数失败:', error)
    messageManager.error(error.response?.data?.detail || '调整点数失败')
  }
}

const deleteUser = async (userId: number) => {
  if (!confirm('确定要删除这个用户吗？此操作不可恢复。')) return

  try {
    await adminRequest.delete(`/api/admin/users/${userId}`)
    messageManager.success('用户删除成功')
    fetchUsers(currentPage.value)
  } catch (error: any) {
    console.error('删除用户失败:', error)
    messageManager.error(error.response?.data?.detail || '删除用户失败')
  }
}

onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <div class="p-8 max-w-7xl mx-auto space-y-8">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">用户管理</h1>
        <p class="text-sm text-gray-500 mt-1">管理系统中的所有用户</p>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="relative max-w-md">
      <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        v-model="searchQuery"
        @keyup.enter="handleSearch"
        type="text"
        placeholder="搜索用户名或邮箱..."
        class="w-full pl-10 pr-12 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
      />
      <Button @click="handleSearch" size="sm" class="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 px-3 text-xs bg-gray-900 hover:bg-gray-800">
        搜索
      </Button>
    </div>

    <!-- 用户列表 -->
    <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-50/50 border-b border-gray-200">
          <tr>
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">用户名</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">邮箱</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">点数</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">角色</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
            <th class="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-if="loading" class="text-center">
            <td colspan="6" class="px-6 py-12">
              <div class="text-gray-500">加载中...</div>
            </td>
          </tr>
          <tr v-else-if="users.length === 0" class="text-center">
            <td colspan="6" class="px-6 py-12">
              <div class="text-gray-500">暂无用户数据</div>
            </td>
          </tr>
          <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50/50 transition-colors">
            <td class="px-6 py-4 text-sm font-medium text-gray-900">
              <template v-if="editingId === user.id">
                <input
                  v-model="editingData.username"
                  type="text"
                  class="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                />
              </template>
              <span v-else>{{ user.username }}</span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-600">
              <template v-if="editingId === user.id">
                <input
                  v-model="editingData.email"
                  type="email"
                  class="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                />
              </template>
              <span v-else>{{ user.email }}</span>
            </td>
            <td class="px-6 py-4">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="user.credits >= 10 ? 'bg-green-50 text-green-700 border border-green-200/50' : 'bg-yellow-50 text-yellow-700 border border-yellow-200/50'">
                <Wallet class="w-3 h-3 mr-1" />
                {{ user.credits }}
              </span>
            </td>
            <td class="px-6 py-4">
              <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium" :class="user.is_admin ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-gray-100 text-gray-700 border border-gray-200'">
                {{ user.is_admin ? '管理员' : '普通用户' }}
              </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500 font-mono text-xs">{{ formatDate(user.created_at) }}</td>
            <td class="px-6 py-4 text-right">
              <div class="flex gap-2 justify-end">
                <template v-if="editingId === user.id">
                  <Button @click="saveEdit(user.id)" size="sm" class="h-8 text-xs bg-gray-900 hover:bg-gray-800">
                    <Save class="w-3 h-3 mr-1" />
                    保存
                  </Button>
                  <Button @click="cancelEdit" variant="outline" size="sm" class="h-8 text-xs border-gray-200 hover:bg-gray-50">
                    <X class="w-3 h-3 mr-1" />
                    取消
                  </Button>
                </template>
                <template v-else>
                  <Button @click="openCreditsDialog(user)" variant="outline" size="sm" class="h-8 text-xs border-gray-200 hover:bg-gray-50">
                    <Wallet class="w-3 h-3 mr-1" />
                    点数
                  </Button>
                  <Button @click="startEdit(user)" variant="outline" size="sm" class="h-8 text-xs border-gray-200 hover:bg-gray-50 hover:text-gray-900">
                    <Edit2 class="w-3 h-3" />
                  </Button>
                  <Button @click="deleteUser(user.id)" variant="ghost" size="sm" class="h-8 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50">
                    <Trash2 class="w-3 h-3" />
                  </Button>
                </template>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="bg-white rounded-lg border border-gray-200 shadow-sm px-6 py-3">
      <div class="flex items-center justify-between">
        <div class="text-sm text-gray-500">
          显示第 {{ (currentPage - 1) * pageSize + 1 }} 到 {{ Math.min(currentPage * pageSize, users.length) }} 条，共 {{ users.length }} 条
        </div>
        <div class="flex gap-2">
          <Button
            @click="fetchUsers(currentPage - 1)"
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
            @click="fetchUsers(currentPage + 1)"
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

    <!-- 点数调整弹窗 -->
    <div v-if="creditsDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" @click.self="closeCreditsDialog">
      <div class="bg-white rounded-xl w-full max-w-md p-6 space-y-6 shadow-2xl border border-gray-100 transform transition-all">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">调整用户点数</h2>
          <button @click="closeCreditsDialog" class="text-gray-400 hover:text-gray-600 transition-colors">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">点数</label>
            <input
              v-model.number="creditsForm.credits"
              type="number"
              class="w-full rounded-md border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:bg-white outline-none transition-all"
              placeholder="输入新的点数"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">调整原因</label>
            <textarea
              v-model="creditsForm.reason"
              rows="3"
              class="w-full rounded-md border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:bg-white outline-none resize-none transition-all"
              placeholder="请输入调整原因..."
            ></textarea>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <Button variant="outline" @click="closeCreditsDialog" class="border-gray-200 hover:bg-gray-50 text-gray-700">
            取消
          </Button>
          <Button @click="saveCredits" class="bg-gray-900 text-white hover:bg-gray-800 shadow-sm">
            确认调整
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>