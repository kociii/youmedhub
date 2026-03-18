<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Option {
  label: string
  value: string
}

const props = defineProps<{
  searchQuery: string
  mode: string
  status: string
  timeRange: string
  sortBy: string
}>()

const emit = defineEmits<{
  (e: 'update:searchQuery', value: string): void
  (e: 'update:mode', value: string): void
  (e: 'update:status', value: string): void
  (e: 'update:timeRange', value: string): void
  (e: 'update:sortBy', value: string): void
}>()

const modeOptions: Option[] = [
  { label: '全部模式', value: 'all' },
  { label: '视频拆解', value: 'analyze' },
  { label: '从零创作', value: 'create' },
  { label: '参考生成', value: 'reference' },
]

const statusOptions: Option[] = [
  { label: '全部状态', value: 'all' },
  { label: '成功', value: 'success' },
  { label: '失败', value: 'failed' },
  { label: '处理中', value: 'pending' },
]

const timeRangeOptions: Option[] = [
  { label: '全部时间', value: 'all' },
  { label: '最近 7 天', value: '7d' },
  { label: '最近 30 天', value: '30d' },
  { label: '最近 90 天', value: '90d' },
]

const sortOptions: Option[] = [
  { label: '按时间倒序', value: 'latest' },
  { label: '按时间正序', value: 'oldest' },
]
</script>

<template>
  <div class="space-y-4 rounded-lg border bg-card p-4">
    <div class="relative">
      <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        :model-value="props.searchQuery"
        placeholder="搜索标题、输入摘要或模型..."
        class="pl-9"
        @update:model-value="emit('update:searchQuery', String($event))"
      />
    </div>

    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Select :model-value="props.mode" @update:model-value="emit('update:mode', String($event))">
        <SelectTrigger>
          <SelectValue placeholder="全部模式" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="option in modeOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </SelectItem>
        </SelectContent>
      </Select>

      <Select :model-value="props.status" @update:model-value="emit('update:status', String($event))">
        <SelectTrigger>
          <SelectValue placeholder="全部状态" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="option in statusOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </SelectItem>
        </SelectContent>
      </Select>

      <Select :model-value="props.timeRange" @update:model-value="emit('update:timeRange', String($event))">
        <SelectTrigger>
          <SelectValue placeholder="全部时间" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="option in timeRangeOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </SelectItem>
        </SelectContent>
      </Select>

      <Select :model-value="props.sortBy" @update:model-value="emit('update:sortBy', String($event))">
        <SelectTrigger>
          <SelectValue placeholder="按时间倒序" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="option in sortOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
</template>
