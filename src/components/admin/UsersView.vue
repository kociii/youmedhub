<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { adminRequest } from '@/utils/request'
import { messageManager } from '@/utils/message'
import { Search, Edit2, Save, X } from 'lucide-vue-next'

interface User {
  id: number
  username: string
  email: string
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
    <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
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
    </div>

    <!-- 用户列表 -->
    <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-50/50 border-b border-gray-200">
          <tr>
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">用户名</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">邮箱</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">更新时间</th>
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
            <td class="px-6 py-4 text-sm text-gray-600 font-mono">{{ user.id }}</td>
            <td class="px-6 py-4 text-sm">
              <template v-if="editingId === user.id">
                <input
                  v-model="editingData.username"
                  type="text"
                  class="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                />
              </template>
              <span v-else class="font-medium text-gray-900">{{ user.username }}</span>
            </td>
            <td class="px-6 py-4 text-sm">
              <template v-if="editingId === user.id">
                <input
                  v-model="editingData.email"
                  type="email"
                  class="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                />
              </template>
              <span v-else class="text-gray-600">{{ user.email }}</span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500 font-mono text-xs">{{ formatDate(user.created_at) }}</td>
            <td class="px-6 py-4 text-sm text-gray-500 font-mono text-xs">{{ formatDate(user.updated_at) }}</td>
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
                  <Button @click="startEdit(user)" variant="outline" size="sm" class="h-8 text-xs border-gray-200 hover:bg-gray-50 hover:text-gray-900">
                    <Edit2 class="w-3 h-3 mr-1" />
                    编辑
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
  </div>
</template>