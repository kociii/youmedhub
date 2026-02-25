<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import { useFavorites } from '@/composables/useFavorites'
import { AVAILABLE_MODELS } from '@/config/models'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Brain, Sparkles, FileText, ChevronDown, ChevronUp } from 'lucide-vue-next'

const va = useVideoAnalysis()
const favorites = useFavorites()

// 创作参数
const topic = ref('')
const additionalNotes = ref('')

// 参考来源
const referenceSource = ref<'input' | 'favorite'>('input')
const referenceScript = ref('')
const selectedFavoriteId = ref('')

// 是否展开参考脚本
const isScriptExpanded = ref(false)

// 初始化：检查是否有待引用的参考脚本
onMounted(() => {
  favorites.loadFavorites()

  if (va.pendingReference.value) {
    referenceScript.value = va.pendingReference.value
    referenceSource.value = 'input'
    // 清除待引用状态
    va.clearPendingReference()
  }
})

// 本地计算属性
const enableThinkingModel = computed({
  get: () => va.enableThinking.value,
  set: (val: boolean) => { va.enableThinking.value = val }
})

// 模型选择
const selectedModelId = computed({
  get: () => va.selectedModel.value?.id || 'qwen3.5-flash',
  set: (val: string) => {
    const model = AVAILABLE_MODELS.find(m => m.id === val)
    if (model) {
      va.setSelectedModel(model)
    }
  }
})

// 选中的收藏
const selectedFavorite = computed(() => {
  if (!selectedFavoriteId.value) return null
  return favorites.favorites.value.find(f => f.id === selectedFavoriteId.value)
})

// 参考脚本预览
const referencePreview = computed(() => {
  if (referenceSource.value === 'favorite' && selectedFavorite.value) {
    return selectedFavorite.value.raw_markdown?.slice(0, 500) + '...'
  }
  if (referenceSource.value === 'input' && referenceScript.value) {
    return referenceScript.value.slice(0, 500) + (referenceScript.value.length > 500 ? '...' : '')
  }
  return ''
})

// 从收藏加载
function loadFromFavorite() {
  if (selectedFavorite.value) {
    referenceScript.value = selectedFavorite.value.raw_markdown || ''
  }
}

// 检查是否可以生成
const canGenerate = computed(() => {
  const hasTopic = topic.value.trim().length >= 2
  const hasReference = referenceSource.value === 'input'
    ? referenceScript.value.trim().length >= 50
    : !!selectedFavoriteId.value
  return hasTopic && hasReference && va.currentApiKey.value
})

// 暴露给父组件
defineExpose({
  canGenerate,
  getParams: () => ({
    topic: topic.value,
    additionalNotes: additionalNotes.value,
    referenceScript: referenceSource.value === 'favorite' && selectedFavorite.value
      ? selectedFavorite.value.raw_markdown
      : referenceScript.value,
  }),
})
</script>

<template>
  <div class="space-y-4">
    <!-- 主题输入 -->
    <div class="space-y-2">
      <Label for="topic" class="flex items-center gap-2">
        <Sparkles class="h-4 w-4" />
        新主题
      </Label>
      <Input
        id="topic"
        v-model="topic"
        placeholder="例如：分享一个健身增肌的小技巧"
        maxlength="100"
      />
      <p class="text-xs text-muted-foreground">
        描述你想创作的新主题（风格将参考已有脚本）
      </p>
    </div>

    <!-- 参考来源选择 -->
    <div class="space-y-2">
      <Label class="flex items-center gap-2">
        <FileText class="h-4 w-4" />
        参考脚本来源
      </Label>
      <div class="flex gap-2">
        <Button
          :variant="referenceSource === 'input' ? 'default' : 'outline'"
          size="sm"
          @click="referenceSource = 'input'"
        >
          手动输入
        </Button>
        <Button
          :variant="referenceSource === 'favorite' ? 'default' : 'outline'"
          size="sm"
          @click="referenceSource = 'favorite'"
        >
          从收藏选择
        </Button>
      </div>
    </div>

    <!-- 手动输入参考脚本 -->
    <div v-if="referenceSource === 'input'" class="space-y-2">
      <Label for="reference">参考脚本</Label>
      <Textarea
        id="reference"
        v-model="referenceScript"
        placeholder="粘贴已有的分镜脚本（Markdown 表格格式）..."
        rows="6"
        maxlength="10000"
      />
      <p class="text-xs text-muted-foreground">
        粘贴一份你满意的脚本，AI 将学习其风格
      </p>
    </div>

    <!-- 从收藏选择 -->
    <div v-else class="space-y-2">
      <Label>选择收藏脚本</Label>
      <Select v-model="selectedFavoriteId" @update:model-value="loadFromFavorite">
        <SelectTrigger>
          <SelectValue placeholder="选择一个收藏的脚本" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="item in favorites.favorites.value"
            :key="item.id"
            :value="item.id"
          >
            {{ item.title }}
          </SelectItem>
        </SelectContent>
      </Select>
      <p v-if="favorites.favorites.value.length === 0" class="text-xs text-muted-foreground">
        暂无收藏脚本，请先收藏一些脚本
      </p>
    </div>

    <!-- 参考脚本预览 -->
    <div v-if="referencePreview" class="space-y-2">
      <div class="flex items-center justify-between">
        <Label class="text-muted-foreground text-xs">参考脚本预览</Label>
        <Button
          variant="ghost"
          size="sm"
          class="h-6 px-2"
          @click="isScriptExpanded = !isScriptExpanded"
        >
          {{ isScriptExpanded ? '收起' : '展开' }}
          <ChevronUp v-if="isScriptExpanded" class="h-3 w-3 ml-1" />
          <ChevronDown v-else class="h-3 w-3 ml-1" />
        </Button>
      </div>
      <div
        class="rounded-md bg-muted/50 p-3 text-xs font-mono overflow-auto"
        :class="isScriptExpanded ? 'max-h-64' : 'max-h-20'"
      >
        <pre class="whitespace-pre-wrap text-muted-foreground">{{ referencePreview }}</pre>
      </div>
    </div>

    <!-- 补充说明 -->
    <div class="space-y-2">
      <Label for="notes">补充说明（可选）</Label>
      <Textarea
        id="notes"
        v-model="additionalNotes"
        placeholder="例如：需要保留原脚本的快节奏剪辑风格..."
        rows="2"
        maxlength="500"
      />
    </div>

    <!-- 模型选择 + 思考模式 -->
    <div class="flex items-center gap-3">
      <!-- 模型选择 -->
      <Select v-model="selectedModelId">
        <SelectTrigger class="h-8 w-auto min-w-[140px]">
          <SelectValue placeholder="选择模型" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="model in AVAILABLE_MODELS"
            :key="model.id"
            :value="model.id"
          >
            {{ model.name }}
          </SelectItem>
        </SelectContent>
      </Select>

      <!-- 分隔线 -->
      <div class="w-px h-6 bg-border" />

      <!-- 思考模式 -->
      <div class="flex items-center gap-2">
        <Brain class="h-4 w-4 text-muted-foreground" />
        <Switch v-model:checked="enableThinkingModel" />
      </div>
    </div>

    <!-- API Key 状态提示 -->
    <div v-if="!va.currentApiKey.value" class="rounded-md bg-muted p-3 text-xs text-muted-foreground">
      请先配置阿里百炼 API Key
    </div>
  </div>
</template>
