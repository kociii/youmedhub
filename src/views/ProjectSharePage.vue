<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '@/lib/supabase'
import type { ProjectCanvasNode, ProjectCanvasState } from '@/projects/types'

const route = useRoute()
const loading = ref(true)
const title = ref('')
const summary = ref('')
const payload = ref<Record<string, unknown>>({})
const nodes = ref<ProjectCanvasNode[]>([])
const viewport = ref({ x: 40, y: 40, zoom: 1 })
const errorMessage = ref('')

const shareToken = computed(() => String(route.params.token || ''))

async function loadSharedProject() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data, error } = await supabase
      .from('project_shares')
      .select('title, summary, share_payload, is_enabled, expires_at')
      .eq('share_token', shareToken.value)
      .maybeSingle()

    if (error) throw error
    if (!data || !data.is_enabled) {
      errorMessage.value = '分享链接不可用'
      return
    }

    if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) {
      errorMessage.value = '分享链接已过期'
      return
    }

    title.value = data.title || '项目分享'
    summary.value = data.summary || ''
    payload.value = (data.share_payload as Record<string, unknown>) || {}

    const canvasState = (payload.value.canvasState as ProjectCanvasState | undefined) || undefined
    nodes.value = canvasState?.nodes || []
    viewport.value = canvasState?.viewport || { x: 40, y: 40, zoom: 1 }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '读取分享失败'
  } finally {
    loading.value = false
  }
}

function getNodeStyle(node: ProjectCanvasNode) {
  return {
    left: `${node.x}px`,
    top: `${node.y}px`,
    width: `${node.width}px`,
    minHeight: `${node.height}px`,
  }
}

const canvasStyle = computed(() => ({
  transform: `translate(${viewport.value.x}px, ${viewport.value.y}px) scale(${viewport.value.zoom})`,
  transformOrigin: '0 0',
}))

onMounted(loadSharedProject)
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-muted/20 p-6">
    <div class="w-full max-w-6xl rounded-lg border bg-card p-6">
      <div v-if="loading" class="text-center text-muted-foreground">正在加载分享...</div>
      <div v-else-if="errorMessage" class="text-center text-destructive">{{ errorMessage }}</div>
      <div v-else>
        <h1 class="text-xl font-semibold">{{ title }}</h1>
        <p class="mt-2 text-sm text-muted-foreground">{{ summary || '暂无分享说明' }}</p>

        <div class="mt-6 h-[70vh] overflow-hidden rounded-md border bg-muted/30">
          <div class="relative h-full w-full overflow-hidden">
            <div class="absolute inset-0 bg-[radial-gradient(circle,_rgba(148,163,184,0.35)_1px,_transparent_1px)] bg-[size:20px_20px]" />

            <div class="absolute left-0 top-0 h-full w-full" :style="canvasStyle">
              <article
                v-for="node in nodes"
                :key="node.id"
                class="absolute rounded-lg border bg-card p-3 shadow-sm"
                :style="getNodeStyle(node)"
              >
                <template v-if="node.type === 'script'">
                  <div class="text-sm font-medium">
                    脚本 #{{ String(node.data.sequenceNumber || '-') }}
                  </div>
                  <div class="mt-1 text-xs text-muted-foreground">
                    {{ node.data.shotType || '未标注景别' }} · {{ node.data.cameraMovement || '未标注运镜' }}
                  </div>
                  <div class="mt-2 line-clamp-3 text-xs">{{ node.data.visualContent || '无画面内容' }}</div>
                  <div class="mt-2 line-clamp-2 text-xs text-muted-foreground">
                    口播：{{ node.data.voiceover || '无口播' }}
                  </div>
                </template>

                <template v-else-if="node.type === 'note'">
                  <div class="text-sm font-medium">NOTE</div>
                  <p class="mt-2 text-xs text-muted-foreground">
                    {{ String(node.data.content || '空白便签') }}
                  </p>
                </template>

                <template v-else-if="node.type === 'text'">
                  <div class="text-sm font-medium">{{ node.data.title || '文本卡片' }}</div>
                  <div class="mt-1 text-[11px] text-muted-foreground">格式：{{ node.data.format }}</div>
                  <div class="mt-2 whitespace-pre-wrap text-xs">{{ node.data.content || '暂无内容' }}</div>
                </template>

                <template v-else-if="node.type === 'image'">
                  <div class="text-sm font-medium">{{ node.data.title || '图片卡片' }}</div>
                  <div class="mt-1 text-[11px] text-muted-foreground">
                    {{ node.data.asset.url || node.data.asset.objectKey || '未设置图片资源' }}
                  </div>
                  <div class="mt-2 text-xs">{{ node.data.caption || '暂无说明' }}</div>
                </template>

                <template v-else-if="node.type === 'video'">
                  <div class="text-sm font-medium">{{ node.data.title || '视频卡片' }}</div>
                  <div class="mt-1 text-[11px] text-muted-foreground">
                    {{ node.data.asset.url || node.data.asset.objectKey || '未设置视频资源' }}
                  </div>
                  <div class="mt-2 text-xs">{{ node.data.caption || '暂无说明' }}</div>
                </template>

                <template v-else-if="node.type === 'ai_call'">
                  <div class="text-sm font-medium">{{ node.data.title }}</div>
                  <div class="mt-2 text-[11px] text-muted-foreground">
                    模型：{{ node.data.config.modelCategory }} · {{ node.data.config.modelId || '未配置' }}
                  </div>
                  <div class="mt-1 text-[11px] text-muted-foreground">
                    输出类型：{{ node.data.config.outputType }}
                  </div>
                  <div class="mt-1 text-[11px] text-muted-foreground">
                    状态：{{ node.data.result.status }}
                  </div>
                  <pre class="mt-2 whitespace-pre-wrap break-words rounded border bg-muted/20 p-2 text-xs">{{ typeof node.data.result.content === 'string' ? node.data.result.content : JSON.stringify(node.data.result.content, null, 2) }}</pre>
                </template>
              </article>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
