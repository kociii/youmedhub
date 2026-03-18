<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import LocaleSettingsCard from '@/components/settings/LocaleSettingsCard.vue'
import ApiKeyGuideCard from '@/components/settings/ApiKeyGuideCard.vue'
import FeedbackPanel from '@/components/settings/FeedbackPanel.vue'
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 class="text-2xl font-semibold">设置</h1>
          <p class="mt-2 text-sm text-muted-foreground">
            先完成 v0.2.5 的设置页骨架：语言设置、API Key 引导和功能反馈分区已经接好，后续继续联动真实业务能力。
          </p>
        </div>
        <Badge variant="secondary" class="w-fit">页面骨架阶段</Badge>
      </div>

      <LocaleSettingsCard />
      <ApiKeyGuideCard />
      <FeedbackPanel />
    </div>
  </div>
</template>
