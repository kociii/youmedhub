<script setup lang="ts">
import Sidebar from '@/components/layout/Sidebar.vue'
import UploadZone from '@/components/features/UploadZone.vue'
import VideoPlayer from '@/components/features/VideoPlayer.vue'
import ConfigPanel from '@/components/features/ConfigPanel.vue'
import ScriptTable from '@/components/features/ScriptTable.vue'
import { useAnalysisStore } from '@/stores/analysis'
import { storeToRefs } from 'pinia'

const store = useAnalysisStore()
const { videoUrl } = storeToRefs(store)
</script>

<template>
  <div class="flex h-screen w-screen bg-slate-50 overflow-hidden font-sans">
    <!-- Left Sidebar -->
    <Sidebar />

    <!-- Main Content -->
    <main class="flex-1 flex overflow-hidden">
      <!-- Middle Column: Preview & Config -->
      <div class="w-[450px] flex flex-col border-r border-slate-200 bg-white p-6 gap-6 overflow-y-auto">
        <div class="space-y-2">
          <h2 class="text-lg font-semibold text-slate-800">视频源</h2>
          <UploadZone v-if="!videoUrl" />
          <VideoPlayer v-else />
        </div>

        <div class="flex-1">
          <ConfigPanel />
        </div>
      </div>

      <!-- Right Column: Results -->
      <div class="flex-1 p-6 bg-slate-50/50 overflow-hidden">
        <ScriptTable />
      </div>
    </main>
  </div>
</template>
