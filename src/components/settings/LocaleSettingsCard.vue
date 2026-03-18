<script setup lang="ts">
import { computed } from 'vue'
import { Globe2, Languages } from 'lucide-vue-next'
import { useSettings, type AppLocale } from '@/composables/useSettings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const settings = useSettings()

const uiLocale = computed({
  get: () => settings.uiLocale.value,
  set: (value: AppLocale) => settings.setUiLocale(value),
})

const aiLocale = computed({
  get: () => settings.aiLocale.value,
  set: (value: AppLocale) => settings.setAiLocale(value),
})
</script>

<template>
  <Card>
    <CardHeader>
      <div class="flex items-center gap-3">
        <div class="rounded-lg bg-primary/10 p-2 text-primary">
          <Languages class="h-5 w-5" />
        </div>
        <div>
          <CardTitle>语言设置</CardTitle>
          <CardDescription>
            页面骨架阶段先接入语言偏好的本地持久化，后续再联动全局文案和 AI 输出语言。
          </CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent class="grid gap-4 md:grid-cols-2">
      <div class="space-y-2 rounded-lg border p-4">
        <div class="flex items-center gap-2 text-sm font-medium">
          <Globe2 class="h-4 w-4 text-muted-foreground" />
          界面语言
        </div>
        <Select v-model="uiLocale">
          <SelectTrigger>
            <SelectValue placeholder="选择界面语言" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="option in settings.localeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </SelectItem>
          </SelectContent>
        </Select>
        <p class="text-xs text-muted-foreground">
          {{ settings.localeOptions.find(item => item.value === uiLocale)?.description }}
        </p>
      </div>

      <div class="space-y-2 rounded-lg border p-4">
        <div class="flex items-center gap-2 text-sm font-medium">
          <Languages class="h-4 w-4 text-muted-foreground" />
          AI 回复语言
        </div>
        <Select v-model="aiLocale">
          <SelectTrigger>
            <SelectValue placeholder="选择 AI 回复语言" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="option in settings.localeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </SelectItem>
          </SelectContent>
        </Select>
        <p class="text-xs text-muted-foreground">
          后续分析与生成请求会根据这里的设置自动追加输出语言约束。
        </p>
      </div>
    </CardContent>
  </Card>
</template>
