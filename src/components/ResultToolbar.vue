<script setup lang="ts">
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import { exportToExcel } from '@/utils/exportExcel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { FileSpreadsheet, FileText, Table2 } from 'lucide-vue-next'

const { viewMode, scriptItems, hasResult, tokenUsage } = useVideoAnalysis()
</script>

<template>
  <div class="flex h-12 shrink-0 items-center gap-2 border-b px-4">
    <span class="text-sm font-medium text-muted-foreground">分析结果</span>

    <Separator orientation="vertical" class="mx-1 h-5" />

    <div v-if="hasResult" class="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        :class="viewMode === 'markdown' ? 'bg-accent' : ''"
        @click="viewMode = 'markdown'"
      >
        <FileText class="mr-1.5 h-4 w-4" />
        原始内容
      </Button>
      <Button
        variant="ghost"
        size="sm"
        :class="viewMode === 'table' ? 'bg-accent' : ''"
        @click="viewMode = 'table'"
      >
        <Table2 class="mr-1.5 h-4 w-4" />
        分镜表格
      </Button>
    </div>

    <div class="flex-1" />

    <div v-if="tokenUsage" class="flex items-center gap-2">
      <Badge variant="secondary" class="text-xs">
        输入 {{ tokenUsage.prompt_tokens.toLocaleString() }}
      </Badge>
      <Badge variant="secondary" class="text-xs">
        输出 {{ tokenUsage.completion_tokens.toLocaleString() }}
      </Badge>
    </div>

    <Button
      v-if="hasResult && scriptItems.length"
      variant="outline"
      size="sm"
      @click="exportToExcel(scriptItems)"
    >
      <FileSpreadsheet class="mr-1.5 h-4 w-4" />
      导出 Excel
    </Button>
  </div>
</template>
