<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Sparkles,
  FileText,
  Video,
  Layers,
  Zap,
  Shield,
  ArrowRight,
  Play,
  Copy,
  Heart,
  Download,
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

function goToSettings() {
  router.push('/settings')
}

function goToLogin() {
  router.push('/login')
}
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="max-w-4xl mx-auto p-6 space-y-12">
      <!-- Hero Section -->
      <div class="text-center pt-8">
        <h1 class="text-4xl font-bold tracking-tight">
          YouMedHub
        </h1>
        <p class="mt-4 text-xl text-muted-foreground">
          视频脚本智能分析工具，一键生成分镜拍摄脚本
        </p>

        <!-- CTA Buttons -->
        <div class="mt-8 flex justify-center gap-4">
          <Button size="lg" @click="goToAnalyze">
            <Play class="mr-2 h-5 w-5" />
            开始拆解
          </Button>
          <Button size="lg" variant="outline" @click="goToCreate">
            <Sparkles class="mr-2 h-5 w-5" />
            生成脚本
          </Button>
        </div>

        <!-- Auth hint -->
        <div v-if="!auth.isAuthenticated.value" class="mt-4 text-sm text-muted-foreground">
          <Button variant="link" class="p-0 h-auto" @click="goToLogin">
            登录后可保存脚本到云端
            <ArrowRight class="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      <!-- Core Features -->
      <div class="space-y-4">
        <h2 class="text-2xl font-semibold text-center">核心功能</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- 拆解脚本 -->
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
              <CardDescription class="text-sm">
                上传短视频，AI 自动分析画面内容，生成分镜拍摄脚本。支持景别、运镜、台词、音效等 11 个维度的详细分析。
              </CardDescription>
              <Button variant="ghost" class="mt-4 p-0 h-auto group-hover:text-primary">
                立即体验
                <ArrowRight class="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </CardContent>
          </Card>

          <!-- 脚本生成 -->
          <Card class="group cursor-pointer transition-shadow hover:shadow-md" @click="goToCreate">
            <CardHeader>
              <div class="flex items-center gap-3">
                <div class="p-2 bg-primary/10 rounded-lg">
                  <Sparkles class="h-6 w-6 text-primary" />
                </div>
                <CardTitle class="text-lg">脚本生成</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription class="text-sm">
                从零创作或参考已有脚本风格，快速生成全新的分镜脚本。支持多种视频风格和时长设置。
              </CardDescription>
              <Button variant="ghost" class="mt-4 p-0 h-auto group-hover:text-primary">
                开始创作
                <ArrowRight class="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <!-- Workflow -->
      <div class="space-y-4">
        <h2 class="text-2xl font-semibold text-center">使用流程</h2>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="flex flex-col items-center text-center p-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
              1
            </div>
            <h3 class="mt-4 font-medium">上传视频</h3>
            <p class="mt-2 text-sm text-muted-foreground">
              支持常见视频格式，最大 100MB
            </p>
          </div>
          <div class="flex flex-col items-center text-center p-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
              2
            </div>
            <h3 class="mt-4 font-medium">AI 分析</h3>
            <p class="mt-2 text-sm text-muted-foreground">
              逐帧识别镜头切换，提取关键信息
            </p>
          </div>
          <div class="flex flex-col items-center text-center p-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
              3
            </div>
            <h3 class="mt-4 font-medium">查看结果</h3>
            <p class="mt-2 text-sm text-muted-foreground">
              表格或 Markdown 格式查看脚本
            </p>
          </div>
          <div class="flex flex-col items-center text-center p-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
              4
            </div>
            <h3 class="mt-4 font-medium">导出/收藏</h3>
            <p class="mt-2 text-sm text-muted-foreground">
              导出 Excel 或保存到云端
            </p>
          </div>
        </div>
      </div>

      <!-- Additional Features -->
      <div class="space-y-4">
        <h2 class="text-2xl font-semibold text-center">更多功能</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="flex items-center gap-3 p-4 rounded-lg border">
            <Copy class="h-5 w-5 text-muted-foreground" />
            <div>
              <div class="font-medium text-sm">参考生成</div>
              <div class="text-xs text-muted-foreground">基于已有脚本风格</div>
            </div>
          </div>
          <div class="flex items-center gap-3 p-4 rounded-lg border">
            <Heart class="h-5 w-5 text-muted-foreground" />
            <div>
              <div class="font-medium text-sm">云端收藏</div>
              <div class="text-xs text-muted-foreground">随时随地访问</div>
            </div>
          </div>
          <div class="flex items-center gap-3 p-4 rounded-lg border">
            <Download class="h-5 w-5 text-muted-foreground" />
            <div>
              <div class="font-medium text-sm">Excel 导出</div>
              <div class="text-xs text-muted-foreground">一键下载表格</div>
            </div>
          </div>
          <div class="flex items-center gap-3 p-4 rounded-lg border">
            <Layers class="h-5 w-5 text-muted-foreground" />
            <div>
              <div class="font-medium text-sm">分镜预览</div>
              <div class="text-xs text-muted-foreground">逐段回看视频</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Coming Soon -->
      <div class="space-y-4">
        <h2 class="text-2xl font-semibold text-center">即将推出</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card class="opacity-80">
            <CardHeader>
              <div class="flex items-center gap-3">
                <div class="p-2 bg-muted rounded-lg">
                  <ImagePlus class="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle class="text-lg">分镜图生成</CardTitle>
                  <span class="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">规划中</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription class="text-sm">
                基于分镜脚本自动生成对应的分镜图片，支持批量生成、多版本管理和一键重新生成。
              </CardDescription>
            </CardContent>
          </Card>

          <Card class="opacity-80">
            <CardHeader>
              <div class="flex items-center gap-3">
                <div class="p-2 bg-muted rounded-lg">
                  <Film class="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle class="text-lg">视频生成</CardTitle>
                  <span class="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">规划中</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription class="text-sm">
                基于分镜脚本和分镜图自动生成视频片段，支持单片段生成和完整视频合成。
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>

      <!-- Tech Stack -->
      <div class="space-y-4">
        <h2 class="text-2xl font-semibold text-center">技术支持</h2>
        <div class="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          <div class="flex items-center gap-2">
            <Zap class="h-4 w-4" />
            <span>阿里百炼 Qwen3.5</span>
          </div>
          <div class="flex items-center gap-2">
            <Shield class="h-4 w-4" />
            <span>Supabase 认证</span>
          </div>
          <div class="flex items-center gap-2">
            <FileText class="h-4 w-4" />
            <span>流式 Markdown</span>
          </div>
        </div>
      </div>

      <!-- Footer CTA -->
      <div class="text-center pb-8">
        <p class="text-muted-foreground mb-4">准备好开始了吗？</p>
        <div class="flex justify-center gap-4">
          <Button @click="goToAnalyze">
            <Play class="mr-2 h-4 w-4" />
            拆解脚本
          </Button>
          <Button variant="outline" @click="goToSettings">
            配置 API Key
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
