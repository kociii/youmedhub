<script setup lang="ts">
import Header from '@/components/layout/Header.vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import UploadZone from '@/components/features/UploadZone.vue'
import VideoPlayer from '@/components/features/VideoPlayer.vue'
import ConfigPanel from '@/components/features/ConfigPanel.vue'
import ScriptTable from '@/components/features/ScriptTable.vue'
import { useAnalysisStore } from '@/stores/analysis'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

const store = useAnalysisStore()
const { videoUrl } = storeToRefs(store)
const router = useRouter()

const handleNavigate = (page: string) => {
  router.push(`/${page}`)
}
</script>

<template>
  <div class="flex flex-col h-screen w-screen bg-gray-50 overflow-hidden font-sans">
    <Header />

    <div class="flex flex-1 overflow-hidden">
      <Sidebar class="hidden md:flex" @navigate="handleNavigate" />

      <main class="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div class="w-full lg:w-[450px] flex flex-col border-r border-gray-200 bg-white">
          <div class="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
            <div class="space-y-2">
              <h2 class="text-base md:text-lg font-semibold text-gray-800">上传视频</h2>
              <UploadZone v-if="!videoUrl" />
              <VideoPlayer v-else />
            </div>

            <div>
              <ConfigPanel />
            </div>
          </div>

          <div class="p-4 bg-white">
            <ConfigPanel :button-only="true" />
          </div>
        </div>

        <div class="flex-1 p-4 md:p-6 bg-gray-50 overflow-hidden">
          <ScriptTable />
        </div>
      </main>
    </div>
  </div>
</template>
