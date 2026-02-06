<script setup lang="ts">
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import VideoSegmentPlayer from '@/components/VideoSegmentPlayer.vue'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'

const { scriptItems, videoUrl } = useVideoAnalysis()
</script>

<template>
  <div class="rounded-md border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead class="w-12">序号</TableHead>
          <TableHead class="w-16">景别</TableHead>
          <TableHead class="w-16">运镜</TableHead>
          <TableHead class="min-w-[160px]">画面内容</TableHead>
          <TableHead class="min-w-[160px]">拍摄指导</TableHead>
          <TableHead class="min-w-[100px]">画面文案/花字</TableHead>
          <TableHead class="min-w-[100px]">口播/台词</TableHead>
          <TableHead class="min-w-[80px]">音效/BGM</TableHead>
          <TableHead class="w-16">开始</TableHead>
          <TableHead class="w-16">结束</TableHead>
          <TableHead class="w-14">时长</TableHead>
          <TableHead class="w-40">视频预览</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="item in scriptItems" :key="item.sequenceNumber">
          <TableCell class="font-medium">{{ item.sequenceNumber }}</TableCell>
          <TableCell>{{ item.shotType }}</TableCell>
          <TableCell>{{ item.cameraMovement }}</TableCell>
          <TableCell class="text-xs">{{ item.visualContent }}</TableCell>
          <TableCell class="text-xs">{{ item.shootingGuide }}</TableCell>
          <TableCell class="text-xs">{{ item.onScreenText }}</TableCell>
          <TableCell class="text-xs">{{ item.voiceover }}</TableCell>
          <TableCell class="text-xs">{{ item.audio }}</TableCell>
          <TableCell class="text-xs">{{ item.startTime }}</TableCell>
          <TableCell class="text-xs">{{ item.endTime }}</TableCell>
          <TableCell class="text-xs">{{ item.duration }}</TableCell>
          <TableCell>
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
