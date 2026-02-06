<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-background">
    <div class="max-w-md w-full space-y-8 p-8">
      <div class="text-center">
        <h1 class="text-4xl font-bold tracking-tight text-foreground">
          Vue 3 + Vite + TypeScript
        </h1>
        <p class="mt-2 text-sm text-muted-foreground">
          使用 Tailwind CSS 和 shadcn-vue
        </p>
      </div>

      <div class="rounded-lg border bg-card p-6 shadow-sm">
        <div class="flex flex-col items-center space-y-4">
          <button
            type="button"
            @click="count++"
            class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            计数: {{ count }}
          </button>
          <p class="text-sm text-muted-foreground">
            编辑 <code class="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">src/App.vue</code> 来测试 HMR
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
