<script setup lang="ts">
import { ref } from 'vue'
import { MessageSquareMore } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface LocalFeedbackItem {
  id: string
  type: string
  title: string
  content: string
  createdAt: string
  status: string
}

const STORAGE_KEY = 'local_feedback_panel_records'

const feedbackType = ref('feature')
const title = ref('')
const content = ref('')
const expectedResult = ref('')
const contact = ref('')
const message = ref('')
const error = ref('')
const records = ref<LocalFeedbackItem[]>(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'))

function submitFeedback() {
  message.value = ''
  error.value = ''

  if (!title.value.trim() || !content.value.trim()) {
    error.value = '请至少填写标题和详细描述'
    return
  }

  const nextItem: LocalFeedbackItem = {
    id: `${Date.now()}`,
    type: feedbackType.value,
    title: title.value.trim(),
    content: content.value.trim(),
    createdAt: new Date().toISOString(),
    status: '本地示意已提交',
  }

  records.value.unshift(nextItem)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records.value))

  title.value = ''
  content.value = ''
  expectedResult.value = ''
  contact.value = ''
  message.value = '已先保存到浏览器本地，后续会接入真实反馈服务端能力。'
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <Card>
    <CardHeader>
      <div class="flex items-center gap-3">
        <div class="rounded-lg bg-primary/10 p-2 text-primary">
          <MessageSquareMore class="h-5 w-5" />
        </div>
        <div>
          <CardTitle>功能反馈</CardTitle>
          <CardDescription>
            先完成设置页反馈区域骨架，当前提交会保存在本地，后续接入真实反馈表和状态流转。
          </CardDescription>
        </div>
      </div>
    </CardHeader>

    <CardContent class="space-y-6">
      <div class="grid gap-4 lg:grid-cols-2">
        <div class="space-y-4 rounded-lg border p-4">
          <Select v-model="feedbackType">
            <SelectTrigger>
              <SelectValue placeholder="选择反馈类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="feature">功能需求</SelectItem>
              <SelectItem value="bug">问题反馈</SelectItem>
              <SelectItem value="idea">体验建议</SelectItem>
            </SelectContent>
          </Select>

          <Input v-model="title" placeholder="反馈标题，例如：希望历史记录支持再次生成" />

          <Textarea
            v-model="content"
            rows="5"
            placeholder="详细描述你的场景、问题或期望效果..."
          />

          <Textarea
            v-model="expectedResult"
            rows="3"
            placeholder="可选：你期望看到的结果或交互方式..."
          />

          <Input v-model="contact" placeholder="可选：联系方式（邮箱 / 微信 / Telegram）" />

          <Button @click="submitFeedback">提交反馈</Button>

          <p v-if="message" class="text-xs text-emerald-600">{{ message }}</p>
          <p v-if="error" class="text-xs text-destructive">{{ error }}</p>
        </div>

        <div class="space-y-3 rounded-lg border p-4">
          <div>
            <div class="text-sm font-medium">最近提交</div>
            <p class="mt-1 text-xs text-muted-foreground">
              这里先展示本地示意数据，后续接入登录态反馈历史和状态跟踪。
            </p>
          </div>

          <div v-if="records.length === 0" class="flex min-h-48 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            还没有本地反馈记录
          </div>

          <div v-else class="space-y-3">
            <div v-for="item in records.slice(0, 4)" :key="item.id" class="rounded-md border p-3">
              <div class="flex items-center justify-between gap-3">
                <div class="line-clamp-1 font-medium">{{ item.title }}</div>
                <span class="text-xs text-muted-foreground">{{ item.status }}</span>
              </div>
              <p class="mt-2 line-clamp-2 text-sm text-muted-foreground">{{ item.content }}</p>
              <div class="mt-2 text-xs text-muted-foreground">{{ formatDate(item.createdAt) }}</div>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
