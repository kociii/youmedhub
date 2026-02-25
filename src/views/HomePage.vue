<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Sparkles,
  Video,
  ArrowRight,
  ImagePlus,
  Film,
} from 'lucide-vue-next'

const router = useRouter()
const auth = useAuth()

function goToAnalyze() {
  router.push('/analyze')
}

function goToCreate() {
  router.push('/create')
}

function goToLogin() {
  router.push('/login')
}
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="max-w-3xl mx-auto p-6 space-y-12">
      <!-- Hero -->
      <div class="text-center pt-12 pb-4">
        <h1 class="text-4xl font-bold tracking-tight">YouMedHub</h1>
        <p class="mt-3 text-lg text-muted-foreground">
          上传视频，AI 自动生成分镜脚本
        </p>

        <div v-if="!auth.isAuthenticated.value" class="mt-4 text-sm text-muted-foreground">
          <Button variant="link" class="p-0 h-auto" @click="goToLogin">
            登录后可保存脚本到云端
            <ArrowRight class="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      <!-- 核心功能 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card class="group cursor-pointer transition-shadow hover:shadow-md" @click="goToAnalyze">
          <CardHeader>
            <div class="flex items-center gap-3">
              <div class="p-2 bg-primary/10 rounded-lg">
                <Video class="h-6 w-6 text-primary" />
              </div>
              <CardTitle class="text-lg">拆解脚本</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              上传短视频，AI 自动生成包含景别、运镜、台词、音效等维度的分镜脚本。支持表格和 Markdown 双模式查看，可导出 Excel。
            </CardDescription>
            <Button variant="ghost" class="mt-3 p-0 h-auto group-hover:text-primary">
              开始拆解
              <ArrowRight class="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </CardContent>
        </Card>

        <Card class="group cursor-pointer transition-shadow hover:shadow-md" @click="goToCreate">
          <CardHeader>
            <div class="flex items-center gap-3">
              <div class="p-2 bg-primary/10 rounded-lg">
                <Sparkles class="h-6 w-6 text-primary" />
              </div>
              <CardTitle class="text-lg">生成脚本</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              从零创作或参考已有脚本风格，快速生成全新的分镜拍摄脚本。支持自定义视频类型、时长和风格。
            </CardDescription>
            <Button variant="ghost" class="mt-3 p-0 h-auto group-hover:text-primary">
              开始创作
              <ArrowRight class="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <!-- 即将推出 -->
      <div class="space-y-3">
        <h2 class="text-sm font-medium text-muted-foreground text-center">即将推出</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="flex items-center gap-3 p-4 rounded-lg border opacity-70">
            <ImagePlus class="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <div class="font-medium text-sm">分镜图生成</div>
              <div class="text-xs text-muted-foreground">基于脚本自动生成分镜图片</div>
            </div>
          </div>
          <div class="flex items-center gap-3 p-4 rounded-lg border opacity-70">
            <Film class="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <div class="font-medium text-sm">视频生成</div>
              <div class="text-xs text-muted-foreground">基于分镜图自动生成视频片段</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
