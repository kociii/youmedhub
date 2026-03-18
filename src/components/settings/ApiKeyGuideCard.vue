<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ExternalLink, KeyRound, ShieldCheck, Sparkles } from 'lucide-vue-next'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const { currentApiKey, setDashscopeApiKey } = useVideoAnalysis()

const draftKey = ref(currentApiKey.value)
const isEditing = ref(!currentApiKey.value)
const saveMessage = ref('')
const saveError = ref('')

watch(currentApiKey, (value) => {
  if (!isEditing.value) {
    draftKey.value = value
  }
})

const maskedKey = computed(() => {
  if (!currentApiKey.value) return ''
  if (currentApiKey.value.length <= 10) return currentApiKey.value
  return `${currentApiKey.value.slice(0, 4)}********${currentApiKey.value.slice(-4)}`
})

function handleSave() {
  const key = draftKey.value.trim()
  saveMessage.value = ''
  saveError.value = ''

  if (!key) {
    saveError.value = '请输入 API Key'
    return
  }

  if (!key.startsWith('sk-')) {
    saveError.value = 'API Key 格式看起来不正确，通常以 sk- 开头'
    return
  }

  setDashscopeApiKey(key)
  saveMessage.value = '已保存到浏览器本地，后续会补充真实可用性校验。'
  isEditing.value = false
}

function handleClear() {
  setDashscopeApiKey('')
  draftKey.value = ''
  saveMessage.value = '已清空本地保存的 API Key。'
  saveError.value = ''
  isEditing.value = true
}
</script>

<template>
  <Card>
    <CardHeader>
      <div class="flex items-center gap-3">
        <div class="rounded-lg bg-primary/10 p-2 text-primary">
          <KeyRound class="h-5 w-5" />
        </div>
        <div>
          <CardTitle>API Key 配置引导</CardTitle>
          <CardDescription>
            从“申请 → 粘贴 → 保存”先完成页面骨架，后续补充真实校验与跳转回流。
          </CardDescription>
        </div>
      </div>
    </CardHeader>

    <CardContent class="space-y-4">
      <div class="grid gap-3 md:grid-cols-3">
        <div class="rounded-lg border p-4">
          <div class="flex items-center gap-2 text-sm font-medium">
            <Sparkles class="h-4 w-4 text-muted-foreground" />
            Step 1
          </div>
          <p class="mt-2 text-sm text-muted-foreground">前往阿里云百炼控制台，进入 API Key 管理页面。</p>
          <Button class="mt-4 w-full" variant="outline" as-child>
            <a href="https://dashscope.console.aliyun.com/apiKey" target="_blank" rel="noreferrer">
              立即前往
              <ExternalLink class="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>

        <div class="rounded-lg border p-4">
          <div class="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck class="h-4 w-4 text-muted-foreground" />
            Step 2
          </div>
          <p class="mt-2 text-sm text-muted-foreground">创建或查看可用的百炼 API Key，复制后回到设置页。</p>
        </div>

        <div class="rounded-lg border p-4">
          <div class="flex items-center gap-2 text-sm font-medium">
            <KeyRound class="h-4 w-4 text-muted-foreground" />
            Step 3
          </div>
          <p class="mt-2 text-sm text-muted-foreground">粘贴到下方输入框并保存，当前仅保存在浏览器本地。</p>
        </div>
      </div>

      <div class="rounded-lg border p-4">
        <div class="mb-3 text-sm font-medium">阿里百炼 API Key</div>

        <div v-if="currentApiKey && !isEditing" class="space-y-3">
          <div class="rounded-md bg-muted px-3 py-2 font-mono text-sm">
            {{ maskedKey }}
          </div>
          <div class="flex flex-wrap gap-3">
            <Button variant="outline" @click="isEditing = true">重新编辑</Button>
            <Button variant="outline" @click="handleClear">清空</Button>
          </div>
        </div>

        <div v-else class="space-y-3">
          <Input
            v-model="draftKey"
            type="password"
            placeholder="sk-xxxxxxxxxxxxxxxxxxxx"
          />
          <div class="flex flex-wrap gap-3">
            <Button @click="handleSave">校验并保存</Button>
            <Button variant="outline" @click="draftKey = ''">清空输入</Button>
          </div>
        </div>

        <p v-if="saveMessage" class="mt-3 text-xs text-emerald-600">{{ saveMessage }}</p>
        <p v-if="saveError" class="mt-3 text-xs text-destructive">{{ saveError }}</p>
      </div>
    </CardContent>
  </Card>
</template>
