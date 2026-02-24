<script setup lang="ts">
import { ref } from 'vue'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const { dashscopeApiKey, arkApiKey, setDashscopeApiKey, setArkApiKey } = useVideoAnalysis()

const dashscopeInput = ref(dashscopeApiKey.value)
const arkInput = ref(arkApiKey.value)
const saved = ref(false)

function handleSave() {
  setDashscopeApiKey(dashscopeInput.value.trim())
  setArkApiKey(arkInput.value.trim())
  saved.value = true
  setTimeout(() => {
    saved.value = false
  }, 2000)
}
</script>

<template>
  <div class="mx-auto max-w-md">
    <h1 class="text-2xl font-semibold">设置</h1>
    <p class="mt-2 text-muted-foreground">
      配置 API Key，Key 仅保存在浏览器本地
    </p>

    <div class="mt-8 space-y-6">
      <!-- 阿里百炼 API Key -->
      <div class="space-y-2">
        <label class="text-sm font-medium">阿里百炼 API Key</label>
        <Input
          v-model="dashscopeInput"
          type="password"
          placeholder="sk-xxxxxxxxxxxxxxxxxxxx"
        />
        <p class="text-xs text-muted-foreground">
          获取地址：
          <a
            href="https://dashscope.console.aliyun.com/apiKey"
            target="_blank"
            class="text-primary hover:underline"
          >
            dashscope.console.aliyun.com
          </a>
        </p>
      </div>

      <!-- 火山引擎 ARK API Key -->
      <div class="space-y-2">
        <label class="text-sm font-medium">火山引擎 ARK API Key</label>
        <Input
          v-model="arkInput"
          type="password"
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        />
        <p class="text-xs text-muted-foreground">
          获取地址：
          <a
            href="https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey"
            target="_blank"
            class="text-primary hover:underline"
          >
            console.volcengine.com
          </a>
        </p>
      </div>

      <!-- 保存按钮 -->
      <Button class="w-full" @click="handleSave">
        {{ saved ? '已保存' : '保存设置' }}
      </Button>
    </div>
  </div>
</template>
