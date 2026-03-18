<script setup lang="ts">
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { HistoryRecordItem } from './HistoryList.vue'

const props = defineProps<{
  record: HistoryRecordItem | null
}>()

const emit = defineEmits<{
  (e: 'continue', id: string): void
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

const actionDescription = computed(() => {
  if (!props.record) {
    return '左侧选择一条记录后，可在这里查看详情、继续处理或后续接入收藏/导出能力。'
  }

  if (props.record.status === 'failed') {
    return '失败记录会在后续阶段接入更完整的错误详情和重试入口。'
  }

  return '当前先接入继续处理入口，收藏与导出将在后续真实历史数据接入后联动。'
})

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <Card class="h-full min-h-[420px]">
    <CardHeader>
      <CardTitle>{{ props.record ? props.record.title : '历史详情' }}</CardTitle>
      <CardDescription>
        {{ actionDescription }}
      </CardDescription>
    </CardHeader>

    <CardContent v-if="props.record" class="space-y-5">
      <div class="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{{ modeLabelMap[props.record.mode] }}</Badge>
        <Badge :variant="props.record.status === 'failed' ? 'destructive' : 'outline'">
          {{ statusLabelMap[props.record.status] }}
        </Badge>
        <Badge variant="outline">{{ props.record.model }}</Badge>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="rounded-lg border bg-muted/30 p-4">
          <div class="text-xs text-muted-foreground">创建时间</div>
          <div class="mt-2 text-sm font-medium">{{ formatDate(props.record.createdAt) }}</div>
        </div>
        <div class="rounded-lg border bg-muted/30 p-4">
          <div class="text-xs text-muted-foreground">分镜数量</div>
          <div class="mt-2 text-sm font-medium">{{ props.record.shotCount }} 个</div>
        </div>
      </div>

      <div>
        <div class="text-sm font-medium">输入摘要</div>
        <p class="mt-2 rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
          {{ props.record.summary }}
        </p>
      </div>

      <Separator />

      <div class="flex flex-wrap gap-3">
        <Button @click="emit('continue', props.record.id)">继续处理</Button>
        <Button variant="outline" disabled>收藏（待接入）</Button>
        <Button variant="outline" disabled>导出（待接入）</Button>
      </div>
    </CardContent>

    <CardContent v-else class="flex h-[320px] items-center justify-center">
      <div class="max-w-sm text-center text-sm text-muted-foreground">
        历史详情区域已预留完成。后续接入真实历史数据后，这里会展示输入摘要、结果预览、分镜结构和继续处理入口。
      </div>
    </CardContent>
  </Card>
</template>
