<script setup lang="ts">
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-vue-next'

const { videoFile, videoUrl, resetAll } = useVideoAnalysis()
</script>

<template>
  <Card class="overflow-hidden">
    <video
      :src="videoUrl"
      controls
      class="w-full rounded-t-lg"
    />
    <div class="flex items-center justify-between px-3 py-2">
      <span class="truncate text-sm text-muted-foreground">
        {{ videoFile?.name }}
      </span>
      <Button variant="ghost" size="icon" class="h-7 w-7 shrink-0" @click="resetAll">
        <X class="h-4 w-4" />
      </Button>
    </div>
  </Card>
</template>
