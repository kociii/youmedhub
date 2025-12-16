<script setup lang="ts">
import AdminLayout from '@/components/admin/AdminLayout.vue'
import AIModelsView from '@/components/admin/AIModelsView.vue'
import UsersView from '@/components/admin/UsersView.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const handleBackToMain = () => {
  router.push('/')
}
</script>

<template>
  <div class="h-screen w-screen overflow-hidden">
    <AdminLayout @back="handleBackToMain">
      <template #default="{ currentView }">
        <AIModelsView v-if="currentView === 'ai-models'" />
        <UsersView v-else-if="currentView === 'users'" />
        <div v-else class="p-6 text-center text-gray-400">功能开发中...</div>
      </template>
    </AdminLayout>
  </div>
</template>
