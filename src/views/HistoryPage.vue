<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import HistoryFilters from '@/components/history/HistoryFilters.vue'
import HistoryList, { type HistoryRecordItem } from '@/components/history/HistoryList.vue'
import HistoryDetail from '@/components/history/HistoryDetail.vue'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import { Badge } from '@/components/ui/badge'

const router = useRouter()
const va = useVideoAnalysis()

const searchQuery = ref('')
const selectedMode = ref('all')
const selectedStatus = ref('all')
const selectedTimeRange = ref('all')
const selectedSort = ref('latest')
const selectedId = ref('')

const sessionRecord = computed<HistoryRecordItem[]>(() => {
  if (!va.hasResult.value || !va.markdownContent.value.trim()) {
    return []
  }

  const titleBase = va.analysisMode.value === 'analyze' ? '当前会话拆解结果' : '当前会话生成结果'
  const summary =
    va.generationInputSnapshot.value?.requirementSummary ||
    va.markdownContent.value.replace(/[#*`>-]/g, ' ').slice(0, 80) ||
    '当前结果摘要待接入真实历史记录后补全。'

  return [
    {
      id: 'session-preview',
      title: titleBase,
      mode: va.analysisMode.value,
      status: va.analysisStatus.value === 'error' ? 'failed' : 'success',
      summary,
      model: va.selectedModel.value?.name || 'qwen3.5-flash',
      createdAt: va.generationInputSnapshot.value?.submittedAt || new Date().toISOString(),
      shotCount: va.scriptItems.value.length,
    },
  ]
})

const filteredRecords = computed(() => {
  let records = [...sessionRecord.value]

  if (selectedMode.value !== 'all') {
    records = records.filter(record => record.mode === selectedMode.value)
  }

  if (selectedStatus.value !== 'all') {
    records = records.filter(record => record.status === selectedStatus.value)
  }

  if (selectedTimeRange.value !== 'all') {
    const now = Date.now()
    const days = Number.parseInt(selectedTimeRange.value.replace('d', ''), 10)
    if (!Number.isNaN(days)) {
      records = records.filter((record) => {
        const createdAt = new Date(record.createdAt).getTime()
        return now - createdAt <= days * 24 * 60 * 60 * 1000
      })
    }
  }

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.trim().toLowerCase()
    records = records.filter((record) => {
      return [record.title, record.summary, record.model].some(field => field.toLowerCase().includes(query))
    })
  }

  records.sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime()
    const bTime = new Date(b.createdAt).getTime()
    return selectedSort.value === 'oldest' ? aTime - bTime : bTime - aTime
  })

  if (!selectedId.value && records[0]) {
    selectedId.value = records[0].id
  }

  if (selectedId.value && !records.some(record => record.id === selectedId.value)) {
    selectedId.value = records[0]?.id || ''
  }

  return records
})

const selectedRecord = computed(() => {
  return filteredRecords.value.find(record => record.id === selectedId.value) || null
})

function handleContinue(recordId: string) {
  const record = filteredRecords.value.find(item => item.id === recordId)
  if (!record) return

  if (record.mode === 'analyze') {
    router.push('/analyze')
    return
  }

  router.push('/create')
}
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="mx-auto flex max-w-7xl flex-col gap-6 p-6">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 class="text-2xl font-semibold">历史记录</h1>
          <p class="mt-2 text-sm text-muted-foreground">
            先完成页面骨架与导航接入，后续将把拆解脚本、从零创作和参考生成的每次结果自动沉淀到这里。
          </p>
        </div>
        <Badge variant="secondary" class="w-fit">页面骨架阶段</Badge>
      </div>

      <HistoryFilters
        :search-query="searchQuery"
        :mode="selectedMode"
        :status="selectedStatus"
        :time-range="selectedTimeRange"
        :sort-by="selectedSort"
        @update:search-query="searchQuery = $event"
        @update:mode="selectedMode = $event"
        @update:status="selectedStatus = $event"
        @update:time-range="selectedTimeRange = $event"
        @update:sort-by="selectedSort = $event"
      />

      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <HistoryList
          :records="filteredRecords"
          :selected-id="selectedId"
          @select="selectedId = $event"
        />
        <HistoryDetail
          :record="selectedRecord"
          @continue="handleContinue"
        />
      </div>
    </div>
  </div>
</template>
