<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Sparkles, FileText } from 'lucide-vue-next'

const router = useRouter()

function goToAnalyze() {
  router.push('/analyze')
}

function goToCreate() {
  router.push('/create')
}
</script>

<template>
  <div class="flex h-full items-center justify-center">
    <div class="max-w-lg text-center">
      <h1 class="text-3xl font-bold">欢迎使用 YouMedHub</h1>
      <p class="mt-4 text-muted-foreground">
        视频脚本智能分析工具，快速生成分镜脚本
      </p>

      <div class="mt-8 grid grid-cols-2 gap-4">
        <!-- 视频脚本解析 -->
        <div class="rounded-lg border bg-card p-6 text-left transition-colors hover:bg-muted/50">
          <Sparkles class="h-8 w-8 text-primary" />
          <h3 class="mt-4 font-semibold">视频脚本解析</h3>
          <p class="mt-2 text-sm text-muted-foreground">
            上传视频，AI 自动分析生成分镜脚本
          </p>
          <Button class="mt-4 w-full" @click="goToAnalyze">
            开始解析
          </Button>
        </div>

        <!-- 脚本生成 -->
        <div class="rounded-lg border bg-card p-6 text-left transition-colors hover:bg-muted/50">
          <FileText class="h-8 w-8 text-primary" />
          <h3 class="mt-4 font-semibold">脚本生成</h3>
          <p class="mt-2 text-sm text-muted-foreground">
            从零创建或参考已有内容生成视频脚本
          </p>
          <Button class="mt-4 w-full" variant="outline" @click="goToCreate">
            开始生成
          </Button>
        </div>
      </div>

      <div class="mt-8 text-sm text-muted-foreground">
        <p>支持模型：阿里百炼 Qwen3.5 / 火山引擎 Doubao</p>
      </div>
    </div>
  </div>
</template>
