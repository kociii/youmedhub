<template>
  <Transition
    name="message"
    @enter="onEnter"
    @leave="onLeave"
  >
    <div
      v-if="show"
      :class="[
        'fixed top-4 right-4 z-50 max-w-sm w-full p-4 rounded-lg shadow-lg',
        typeClasses[type],
        borderClasses[type]
      ]"
    >
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <CheckCircle v-if="type === 'success'" class="w-6 h-6" />
          <XCircle v-else-if="type === 'error'" class="w-6 h-6" />
          <AlertCircle v-else-if="type === 'warning'" class="w-6 h-6" />
          <Info v-else class="w-6 h-6" />
        </div>
        <div class="ml-3 w-0 flex-1">
          <p class="text-sm font-medium">{{ title }}</p>
          <p v-if="message" class="mt-1 text-sm opacity-90">{{ message }}</p>
        </div>
        <div class="ml-4 flex-shrink-0 flex">
          <button
            @click="close"
            class="inline-flex opacity-75 hover:opacity-100 transition-opacity"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-vue-next'

const props = defineProps<{
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}>()

const emit = defineEmits<{
  close: []
}>()

const show = ref(true)

const typeClasses = computed(() => {
  switch (props.type) {
    case 'success':
      return 'bg-green-50 text-green-800'
    case 'error':
      return 'bg-red-50 text-red-800'
    case 'warning':
      return 'bg-yellow-50 text-yellow-800'
    default:
      return 'bg-blue-50 text-blue-800'
  }
})

const borderClasses = computed(() => {
  switch (props.type) {
    case 'success':
      return 'border-green-200'
    case 'error':
      return 'border-red-200'
    case 'warning':
      return 'border-yellow-200'
    default:
      return 'border-blue-200'
  }
})

const close = () => {
  show.value = false
  setTimeout(() => {
    emit('close')
  }, 300)
}

const onEnter = (el: Element) => {
  (el as HTMLElement).style.maxHeight = '0'
  requestAnimationFrame(() => {
    (el as HTMLElement).style.maxHeight = (el as HTMLElement).scrollHeight + 'px'
    ;(el as HTMLElement).style.transition = 'max-height 0.3s ease-out'
  })
}

const onLeave = (el: Element) => {
  (el as HTMLElement).style.maxHeight = '0'
  ;(el as HTMLElement).style.transition = 'max-height 0.3s ease-in'
}

// 自动关闭
if (props.duration) {
  setTimeout(close, props.duration)
}
</script>

<style scoped>
.message-enter-active,
.message-leave-active {
  transition: all 0.3s ease;
}

.message-enter-from,
.message-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>