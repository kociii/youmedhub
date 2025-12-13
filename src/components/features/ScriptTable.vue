<script setup lang="ts">
import { useAnalysisStore } from '@/stores/analysis'
import { storeToRefs } from 'pinia'
import { Download, Copy, PlayCircle } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const store = useAnalysisStore()
const { segments } = storeToRefs(store)

const handlePlaySegment = (startTime: string) => {
  console.log('Play segment at', startTime)
  // In a real app, this would seek the video player
}
</script>

<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
    <div class="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
      <h2 class="font-semibold text-slate-700">分析结果 ({{ segments.length }} 个片段)</h2>
      <div class="flex gap-2">
        <Button variant="outline" size="sm" class="gap-2">
          <Copy class="w-4 h-4" />
          复制全部
        </Button>
        <Button variant="outline" size="sm" class="gap-2">
          <Download class="w-4 h-4" />
          导出 Excel
        </Button>
      </div>
    </div>

    <div class="flex-1 overflow-auto">
      <table class="w-full text-sm text-left">
        <thead class="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10">
          <tr>
            <th class="px-4 py-3 w-24">时间轴</th>
            <th class="px-4 py-3 w-1/4">画面描述</th>
            <th class="px-4 py-3 w-1/4">口播内容</th>
            <th class="px-4 py-3">音频/备注</th>
            <th class="px-4 py-3 w-16">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-if="segments.length === 0">
            <td colspan="5" class="px-4 py-8 text-center text-slate-400">
              暂无分析数据，请先开始分析
            </td>
          </tr>
          <tr 
            v-for="segment in segments" 
            :key="segment.id"
            class="hover:bg-blue-50/50 transition-colors group"
          >
            <td class="px-4 py-3 font-mono text-slate-500">
              {{ segment.startTime }} - {{ segment.endTime }}
            </td>
            <td class="px-4 py-3 text-slate-700">
              {{ segment.visual }}
            </td>
            <td class="px-4 py-3 text-slate-700 font-medium">
              {{ segment.content }}
            </td>
            <td class="px-4 py-3 text-slate-500">
              {{ segment.audio }}
            </td>
            <td class="px-4 py-3">
              <Button 
                variant="ghost" 
                size="icon" 
                class="h-8 w-8 text-slate-400 hover:text-blue-500"
                @click="handlePlaySegment(segment.startTime)"
              >
                <PlayCircle class="w-4 h-4" />
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
