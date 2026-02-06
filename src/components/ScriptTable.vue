<script setup lang="ts">
import { computed } from 'vue'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import VideoSegmentPlayer from '@/components/VideoSegmentPlayer.vue'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import { Clock } from 'lucide-vue-next'

const { scriptItems, videoUrl } = useVideoAnalysis()

const shotTypeColor = 'bg-blue-100 text-blue-700'
const cameraMovementColor = 'bg-amber-100 text-amber-700'

function cleanBr(value: string): string {
  return value.replace(/<br\s*\/?>/gi, '\n')
}

const processedItems = computed(() =>
  scriptItems.value.map(item => ({
    ...item,
    visualContent: cleanBr(item.visualContent),
    shootingGuide: cleanBr(item.shootingGuide),
    onScreenText: cleanBr(item.onScreenText),
    voiceover: cleanBr(item.voiceover),
    audio: cleanBr(item.audio),
  }))
)
</script>

<template>
  <div class="rounded-md border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead class="w-12 text-center text-xs">序号</TableHead>
          <TableHead class="w-24 text-center text-xs">景别/运镜</TableHead>
          <TableHead class="min-w-[160px] text-xs">画面内容</TableHead>
          <TableHead class="min-w-[160px] text-xs">拍摄指导</TableHead>
          <TableHead class="min-w-[100px] text-xs">画面文案/花字</TableHead>
          <TableHead class="min-w-[100px] text-xs">口播/台词</TableHead>
          <TableHead class="min-w-[80px] text-xs">音效/BGM</TableHead>
          <TableHead class="w-28 text-center text-xs">时间</TableHead>
          <TableHead class="w-48 text-center text-xs">视频预览</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="item in processedItems" :key="item.sequenceNumber">
          <TableCell class="text-center font-medium">{{ item.sequenceNumber }}</TableCell>
          <TableCell>
            <div class="flex flex-col items-center gap-1">
              <span :class="['inline-block rounded px-1.5 py-0.5 text-xs font-medium', shotTypeColor]">
                {{ item.shotType }}
              </span>
              <span :class="['inline-block rounded px-1.5 py-0.5 text-xs font-medium', cameraMovementColor]">
                {{ item.cameraMovement }}
              </span>
            </div>
          </TableCell>
          <TableCell class="text-xs whitespace-pre-line">{{ item.visualContent }}</TableCell>
          <TableCell class="text-xs whitespace-pre-line">{{ item.shootingGuide }}</TableCell>
          <TableCell class="text-xs whitespace-pre-line">{{ item.onScreenText }}</TableCell>
          <TableCell class="text-xs whitespace-pre-line">{{ item.voiceover }}</TableCell>
          <TableCell class="text-xs whitespace-pre-line">{{ item.audio }}</TableCell>
          <TableCell class="text-xs">
            <div class="flex flex-col items-center gap-0.5">
              <span>{{ item.startTime }}-{{ item.endTime }}</span>
              <span class="flex items-center gap-0.5 text-muted-foreground">
                <Clock class="h-3 w-3" />
                {{ item.duration }}
              </span>
            </div>
          </TableCell>
          <TableCell class="max-h-[300px] text-center">
            <VideoSegmentPlayer
              :src="videoUrl"
              :start-time="item.startTime"
              :end-time="item.endTime"
            />
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
