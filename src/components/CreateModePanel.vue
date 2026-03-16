<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { generateWithImages } from '@/api/analysis'
import { uploadToTemporaryFile } from '@/api/temporaryFile'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import { useFavorites } from '@/composables/useFavorites'
import { AVAILABLE_MODELS } from '@/config/models'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import ImageUploader from '@/components/ImageUploader.vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles, AlertTriangle, Brain } from 'lucide-vue-next'

const va = useVideoAnalysis()
const favorites = useFavorites()

interface VideoTypeConfig {
  key: string
  label: string
  template: string
  fields: Array<{ key: string; label: string }>
}

// 删除使用场景类，增加自定义
const videoTypes: VideoTypeConfig[] = [
  {
    key: 'free',
    label: '自定义',
    fields: [
      { key: 'requirement', label: '视频要求' },
    ],
    template: `## 视频要求

在此自由描述你的视频需求，包括：
- 产品/服务信息
- 目标受众
- 核心卖点
- 风格调性
- 时长要求
`,
  },
  {
    key: 'ecommerce',
    label: '电商头图类',
    fields: [
      { key: 'productName', label: '商品名称' },
      { key: 'heroSpec', label: '主打规格/型号' },
      { key: 'coreSellingPoint', label: '核心卖点' },
      { key: 'priceOffer', label: '价格/优惠信息' },
      { key: 'targetAudience', label: '目标人群' },
      { key: 'trustProof', label: '信任背书' },
      { key: 'cta', label: '行动号召' },
    ],
    template: `## 商品名称


## 主打规格/型号


## 核心卖点


## 价格/优惠信息


## 目标人群


## 信任背书


## 行动号召
`,
  },
  {
    key: 'sellingPoint',
    label: '卖点展示类',
    fields: [
      { key: 'sellingPoint1', label: '卖点 1' },
      { key: 'sellingPoint2', label: '卖点 2' },
      { key: 'sellingPoint3', label: '卖点 3' },
      { key: 'proofMethod', label: '证明方式' },
      { key: 'priority', label: '卖点优先级' },
      { key: 'objectionHandling', label: '常见疑虑处理' },
    ],
    template: `## 卖点 1


## 卖点 2


## 卖点 3


## 证明方式


## 卖点优先级


## 常见疑虑处理
`,
  },
  {
    key: 'unboxing',
    label: '开箱测评类',
    fields: [
      { key: 'unboxingHighlight', label: '开箱亮点' },
      { key: 'reviewDimensions', label: '测评维度' },
      { key: 'testScenario', label: '实测场景' },
      { key: 'prosCons', label: '优缺点' },
      { key: 'conclusion', label: '结论倾向' },
      { key: 'targetUserFit', label: '适配人群' },
    ],
    template: `## 开箱亮点


## 测评维度


## 实测场景


## 优缺点


## 结论倾向


## 适配人群
`,
  },
  {
    key: 'comparison',
    label: '对比种草类',
    fields: [
      { key: 'comparisonTarget', label: '对比对象' },
      { key: 'comparisonDimension', label: '对比维度' },
      { key: 'baselineRule', label: '对比标准' },
      { key: 'keyDifference', label: '关键差异' },
      { key: 'recommendReason', label: '推荐理由' },
      { key: 'applicableAudience', label: '适用人群' },
      { key: 'purchaseAdvice', label: '购买建议' },
    ],
    template: `## 对比对象


## 对比维度


## 对比标准


## 关键差异


## 推荐理由


## 适用人群


## 购买建议
`,
  },
]

const selectedVideoType = ref(videoTypes[0]?.key || '')
const requirementText = ref('')
const hasUserEdited = ref(false)

// 覆盖确认弹窗
const showOverwriteConfirm = ref(false)
const pendingVideoType = ref('')

// AI 优化
const aiOptimizing = ref(false)
const aiOptimizeError = ref('')

const duration = ref('')
const scriptCount = ref('1')

// 参考脚本 - 直接选择收藏
const selectedFavoriteId = ref('_none')

const selectedVideoTypeConfig = computed(() =>
  videoTypes.find(item => item.key === selectedVideoType.value) || null
)

const selectedFavorite = computed(() => {
  if (!selectedFavoriteId.value || selectedFavoriteId.value === '_none') return null
  return favorites.favorites.value.find(item => item.id === selectedFavoriteId.value) || null
})

const resolvedReferenceScript = computed(() => {
  return selectedFavorite.value?.raw_markdown?.trim() || ''
})

const scriptCountNumber = computed(() => {
  const num = Number.parseInt(scriptCount.value, 10)
  if (Number.isNaN(num)) return 1
  return Math.min(5, Math.max(1, num))
})

const selectedModelId = computed({
  get: () => va.selectedModel.value?.id || 'qwen3.5-flash',
  set: (val: string) => {
    const oldModelId = va.selectedModel.value?.id
    const model = AVAILABLE_MODELS.find(m => m.id === val)
    if (model) {
      va.setSelectedModel(model)
      // 如果模型变化且有已上传的文件，显示提示
      if (oldModelId && oldModelId !== val && va.imageUrls.value.length > 0) {
        modelChangeMessage.value = '已切换模型，图片与模型绑定，提交时将重新上传'
        setTimeout(() => {
          modelChangeMessage.value = ''
        }, 5000)
      }
    }
  },
})

// 思考模式开关
const enableThinking = computed({
  get: () => va.enableThinking.value,
  set: (val: boolean) => {
    va.enableThinking.value = val
  },
})

// 图片引用提示
const imageHint = computed(() => {
  const count = va.imageFiles.value.length
  if (count === 0) return ''
  const refs = Array.from({ length: count }, (_, i) => `@图${i + 1}`).join(' ')
  return `可使用 ${refs} 引用图片`
})

const canGenerate = computed(() => {
  if (!va.currentApiKey.value) return false
  const text = requirementText.value.trim()
  if (!text) return false
  const lines = text.split('\n').filter(line => line.trim() && !line.startsWith('##'))
  return lines.length > 0
})

// 模型切换提示
const modelChangeMessage = ref('')

function handleVideoTypeChange(typeKey: string) {
  if (typeKey === selectedVideoType.value) return

  if (hasUserEdited.value && requirementText.value.trim()) {
    pendingVideoType.value = typeKey
    showOverwriteConfirm.value = true
  } else {
    applyVideoType(typeKey)
  }
}

function applyVideoType(typeKey: string) {
  const config = videoTypes.find(item => item.key === typeKey)
  if (!config) return

  selectedVideoType.value = typeKey
  requirementText.value = config.template
  hasUserEdited.value = false
}

function confirmOverwrite() {
  showOverwriteConfirm.value = false
  applyVideoType(pendingVideoType.value)
  pendingVideoType.value = ''
}

function cancelOverwrite() {
  showOverwriteConfirm.value = false
  pendingVideoType.value = ''
}

function handleTextareaInput() {
  hasUserEdited.value = true
}

function parseTextToFields(text: string, fields: Array<{ key: string; label: string }>): Record<string, string> {
  const result: Record<string, string> = {}
  const lines = text.split('\n')
  let currentKey = ''
  let currentValue: string[] = []

  for (const line of lines) {
    const headerMatch = line.match(/^##\s*(.+)$/)
    if (headerMatch) {
      if (currentKey) {
        result[currentKey] = currentValue.join('\n').trim()
      }
      const headerLabel = headerMatch[1].trim()
      const field = fields.find(f => f.label === headerLabel)
      currentKey = field?.key || ''
      currentValue = []
    } else if (currentKey) {
      currentValue.push(line)
    }
  }

  if (currentKey) {
    result[currentKey] = currentValue.join('\n').trim()
  }

  return result
}

function buildAiOptimizePrompt(): string {
  const config = selectedVideoTypeConfig.value
  if (!config) return ''

  const currentFields = parseTextToFields(requirementText.value, config.fields)
  const fieldsDesc = config.fields
    .map(f => `- ${f.key}（${f.label}）：${currentFields[f.key] || '（未填写）'}`)
    .join('\n')

  const fieldLabels = config.fields.map(f => f.label).join('、')

  return `你是短视频商业脚本策划专家。请基于用户填写的内容进行优化，使其更加具体、可执行、有转化力。

要求：
1. 直接输出 Markdown 格式，不要输出解释或代码块标记。
2. 每个字段使用二级标题格式：## 字段名称
3. 字段内容紧跟在标题下方，空一行后写内容。
4. 必须覆盖所有字段：${fieldLabels}
5. 每个字段内容控制在 10-50 字，具体且可落地，避免空泛口号。
6. 如果原内容为空或不够具体，请根据视频类型补齐合理的建议内容。
7. 保持专业、简洁的表达风格。
8. 如果有参考图片，请结合图片内容进行优化。

视频类型：${config.label}
当前字段内容：
${fieldsDesc}

请直接输出优化后的 Markdown 内容：
`
}

async function handleAiOptimize() {
  if (!va.currentApiKey.value) {
    aiOptimizeError.value = '请先配置阿里百炼 API Key'
    return
  }
  if (!selectedVideoTypeConfig.value) {
    aiOptimizeError.value = '请先选择视频类型'
    return
  }

  aiOptimizing.value = true
  aiOptimizeError.value = ''

  // 用于收集流式输出
  let streamedContent = ''

  try {
    // 1. 上传图片到临时存储（如果有的话，与模型绑定）
    const uploadedImageUrls: string[] = []
    const model = va.selectedModel.value?.id || 'qwen3.5-flash'
    const apiKey = va.currentApiKey.value
    if (!apiKey) {
      throw new Error('请先配置阿里百炼 API Key')
    }
    for (let i = 0; i < va.imageFiles.value.length; i++) {
      const file = va.imageFiles.value[i]
      // 如果已经有 URL 了，直接使用
      if (va.imageUrls.value[i]) {
        uploadedImageUrls.push(va.imageUrls.value[i])
      } else {
        // 上传到百炼临时存储
        const result = await uploadToTemporaryFile(file, model, apiKey)
        uploadedImageUrls.push(result.downloadLink)
        // 保存 URL 避免重复上传
        va.imageUrls.value[i] = result.downloadLink
      }
    }

    // 2. 构建提示词
    const prompt = buildAiOptimizePrompt()

    // 3. 调用 AI（流式）- qwen3.5 系列支持多模态
    if (uploadedImageUrls.length > 0) {
      // 有图片，使用多模态 API
      await generateWithImages({
        apiKey: va.currentApiKey.value,
        model: 'qwen3.5-flash',
        prompt,
        imageUrls: uploadedImageUrls,
        onChunk: (chunk) => {
          streamedContent += chunk
          // 实时更新显示
          requirementText.value = streamedContent
        },
      })
    } else {
      // 无图片，使用普通流式 API
      const { generateText } = await import('@/api/analysis')
      await generateText({
        apiKey: va.currentApiKey.value,
        model: 'qwen3.5-flash',
        prompt,
        onChunk: (chunk) => {
          streamedContent += chunk
          // 实时更新显示
          requirementText.value = streamedContent
        },
      })
    }

    hasUserEdited.value = true
  } catch (error) {
    aiOptimizeError.value = error instanceof Error ? error.message : 'AI 优化失败，请重试'
  } finally {
    aiOptimizing.value = false
  }
}

onMounted(() => {
  favorites.loadFavorites()

  if (videoTypes[0]) {
    requirementText.value = videoTypes[0].template
  }

  if (va.pendingReference.value.trim()) {
    // 从收藏中选择匹配的脚本
    const matched = favorites.favorites.value.find(
      f => f.raw_markdown === va.pendingReference.value
    )
    if (matched) {
      selectedFavoriteId.value = matched.id
    }
    va.clearPendingReference()
  }
})

defineExpose({
  canGenerate,
  getParams: () => ({
    videoType: selectedVideoType.value,
    videoTypeLabel: selectedVideoTypeConfig.value?.label || '',
    requirementText: requirementText.value,
    duration: duration.value,
    referenceScript: resolvedReferenceScript.value,
    scriptCount: scriptCountNumber.value,
  }),
})
</script>

<template>
  <div class="space-y-4">
    <!-- 参考图片 - 放在最上方 -->
    <div class="space-y-2">
      <Label class="text-xs font-normal text-muted-foreground">参考图片</Label>
      <ImageUploader />
    </div>

    <!-- 视频类型选择 -->
    <div class="space-y-2">
      <Label class="text-xs font-normal text-muted-foreground">视频类型</Label>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="item in videoTypes"
          :key="item.key"
          type="button"
          class="px-2.5 py-1 text-xs font-normal rounded-md border transition-colors"
          :class="selectedVideoType === item.key
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-transparent hover:bg-accent hover:text-accent-foreground'"
          @click="handleVideoTypeChange(item.key)"
        >
          {{ item.label }}
        </button>
      </div>
    </div>

    <!-- 视频要求 -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <Label class="text-xs font-normal text-muted-foreground">视频要求</Label>
        <Button
          variant="ghost"
          size="sm"
          class="h-6 px-2 text-xs font-normal"
          :disabled="aiOptimizing || !va.currentApiKey.value"
          @click="handleAiOptimize"
        >
          <Loader2 v-if="aiOptimizing" class="mr-1 h-3 w-3 animate-spin" />
          <Sparkles v-else class="mr-1 h-3 w-3" />
          AI 优化
        </Button>
      </div>
      <Textarea
        v-model="requirementText"
        rows="10"
        class="font-mono text-sm"
        placeholder="在每个标题下方填写对应内容..."
        @input="handleTextareaInput"
      />
      <div class="flex items-center justify-between">
        <p v-if="imageHint" class="text-[10px] text-muted-foreground">
          {{ imageHint }}
        </p>
        <p v-else class="text-[10px] text-muted-foreground">
          在 ## 标题下方填写内容
        </p>
      </div>
      <p v-if="aiOptimizeError" class="text-xs text-destructive">
        {{ aiOptimizeError }}
      </p>
    </div>

    <!-- 参考脚本 - 直接下拉选择收藏 -->
    <div class="space-y-2">
      <Label class="text-xs font-normal text-muted-foreground">参考脚本（可选）</Label>
      <Select v-model="selectedFavoriteId">
        <SelectTrigger class="h-8">
          <SelectValue placeholder="选择收藏脚本作为参考" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_none">
            不使用参考
          </SelectItem>
          <SelectItem
            v-for="item in favorites.favorites.value"
            :key="item.id"
            :value="item.id"
          >
            {{ item.title }}
          </SelectItem>
        </SelectContent>
      </Select>
      <p v-if="favorites.favorites.value.length === 0" class="text-[10px] text-muted-foreground">
        暂无收藏脚本，请先在「拆解脚本」页面收藏
      </p>
    </div>

    <!-- 时长和数量 -->
    <div class="grid grid-cols-2 gap-3">
      <div class="space-y-2">
        <Label class="text-xs font-normal text-muted-foreground">目标时长</Label>
        <Input
          v-model="duration"
          type="text"
          placeholder="30 秒"
          class="h-8"
        />
      </div>

      <div class="space-y-2">
        <Label class="text-xs font-normal text-muted-foreground">脚本数量</Label>
        <div class="flex gap-1.5">
          <button
            v-for="n in 3"
            :key="n"
            type="button"
            class="flex-1 h-8 text-xs font-normal rounded-md border transition-colors"
            :class="scriptCount === String(n)
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-transparent hover:bg-accent hover:text-accent-foreground'"
            @click="scriptCount = String(n)"
          >
            {{ n }}
          </button>
        </div>
      </div>
    </div>

    <!-- 模型选择 + 思考模式（一行，各占 50%） -->
    <div class="space-y-2">
      <Label class="text-xs font-normal text-muted-foreground">模型选择</Label>
      <div class="flex items-center gap-3">
        <Select v-model="selectedModelId" class="flex-1">
          <SelectTrigger class="h-8 w-full">
            <SelectValue placeholder="选择模型" />
          </SelectTrigger>
          <SelectContent class="max-w-[50vw]">
            <SelectItem
              v-for="model in AVAILABLE_MODELS"
              :key="model.id"
              :value="model.id"
            >
              {{ model.name }}
            </SelectItem>
          </SelectContent>
        </Select>

        <!-- 思考模式按钮 -->
        <Button
          variant="outline"
          size="sm"
          class="h-8 gap-1.5 px-3 flex-1"
          :class="enableThinking && 'bg-purple-100 border-purple-300 hover:bg-purple-200'"
          :disabled="!va.currentApiKey.value"
          @click="enableThinking = !enableThinking"
        >
          <Brain class="h-4 w-4 text-purple-500" />
          <span class="text-purple-700">思考</span>
        </Button>
      </div>
    </div>

    <div v-if="modelChangeMessage" class="rounded-md bg-blue-500/10 p-2 text-[10px] text-blue-600">
      {{ modelChangeMessage }}
    </div>

    <div v-if="!va.currentApiKey.value" class="rounded-md bg-muted p-2 text-[10px] text-muted-foreground">
      请先配置阿里百炼 API Key
    </div>

    <!-- 覆盖确认弹窗 -->
    <AlertDialog :open="showOverwriteConfirm" @update:open="showOverwriteConfirm = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle class="flex items-center gap-2">
            <AlertTriangle class="h-5 w-5 text-yellow-500" />
            切换视频类型
          </AlertDialogTitle>
          <AlertDialogDescription>
            切换视频类型会覆盖当前填写的内容，确定要切换吗？
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="cancelOverwrite">取消</AlertDialogCancel>
          <AlertDialogAction @click="confirmOverwrite">确定切换</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
