<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock3, FileText, WandSparkles } from 'lucide-vue-next'

export interface HistoryRecordItem {
  id: string
  title: string
  mode: 'analyze' | 'create' | 'reference'
  status: 'success' | 'failed' | 'pending'
  summary: string
  model: string
  createdAt: string
  shotCount: number
}

const props = defineProps<{
  records: HistoryRecordItem[]
  selectedId: string
}>()

const emit = defineEmits<{
  (e: 'select', id: string): void
}>()

const modeLabelMap: Record<HistoryRecordItem['mode'], string> = {
  analyze: '视频拆解',
  create: '从零创作',
  reference: '参考生成',
}

const statusLabelMap: Record<HistoryRecordItem['status'], string> = {
  success: '成功',
  failed: '失败',
  pending: '处理中',
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="space-y-3">
    <Card v-if="props.records.length === 0" class="border-dashed">
      <CardContent class="flex min-h-56 flex-col items-center justify-center gap-3 py-10 text-center text-muted-foreground">
        <FileText class="h-10 w-10 opacity-50" />
        <div>
          <p class="font-medium text-foreground">历史记录页骨架已就绪</p>
          <p class="mt-1 text-sm">当前还没有接入真实历史数据，后续生成结果会自动沉淀到这里。</p>
        </div>
      </CardContent>
    </Card>

    <button
      v-for="record in props.records"
      :key="record.id"
      class="w-full text-left"
      @click="emit('select', record.id)"
    >
      <Card :class="record.id === props.selectedId ? 'border-primary shadow-sm' : 'hover:bg-accent/40'" class="transition-colors">
        <CardHeader class="pb-3">
          <div class="flex items-start justify-between gap-3">
            <div class="space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{{ modeLabelMap[record.mode] }}</Badge>
                <Badge :variant="record.status === 'failed' ? 'destructive' : 'outline'">
                  {{ statusLabelMap[record.status] }}
                </Badge>
              </div>
              <CardTitle class="line-clamp-1 text-base">{{ record.title }}</CardTitle>
            </div>
            <Button variant="ghost" size="sm" class="pointer-events-none h-8 px-2 text-xs text-muted-foreground">
              查看详情
            </Button>
          </div>
        </CardHeader>
        <CardContent class="space-y-3">
          <p class="line-clamp-2 text-sm text-muted-foreground">{{ record.summary }}</p>
          <div class="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span class="inline-flex items-center gap-1">
              <WandSparkles class="h-3.5 w-3.5" />
              {{ record.model }}
            </span>
            <span>{{ record.shotCount }} 个分镜</span>
            <span class="inline-flex items-center gap-1">
              <Clock3 class="h-3.5 w-3.5" />
              {{ formatDate(record.createdAt) }}
            </span>
          </div>
        </CardContent>
      </Card>
    </button>
  </div>
</template>
