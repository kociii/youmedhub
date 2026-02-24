<script setup lang="ts">
import { ref } from 'vue'
import { useFavorites, type SaveFavoriteParams } from '@/composables/useFavorites'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  data: Omit<SaveFavoriteParams, 'title' | 'description'> | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': [id: string]
}>()

const { saveFavorite } = useFavorites()

const title = ref('')
const description = ref('')
const loading = ref(false)
const error = ref('')

// 重置表单
function resetForm() {
  title.value = ''
  description.value = ''
  error.value = ''
}

// 提交保存
async function handleSubmit() {
  if (!props.data) return

  if (!title.value.trim()) {
    error.value = '请输入标题'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const result = await saveFavorite({
      ...props.data,
      title: title.value.trim(),
      description: description.value.trim(),
    })
    emit('saved', result.id)
    emit('update:open', false)
    resetForm()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '保存失败'
  } finally {
    loading.value = false
  }
}

// 关闭时重置
function handleOpenChange(open: boolean) {
  emit('update:open', open)
  if (!open) {
    resetForm()
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>保存脚本</DialogTitle>
        <DialogDescription>
          将当前分析结果保存到收藏夹
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <div class="space-y-2">
          <Label for="title">标题</Label>
          <Input
            id="title"
            v-model="title"
            placeholder="输入脚本标题"
            maxlength="100"
          />
        </div>

        <div class="space-y-2">
          <Label for="description">描述（可选）</Label>
          <Textarea
            id="description"
            v-model="description"
            placeholder="添加描述或备注"
            rows="3"
            maxlength="500"
          />
        </div>

        <div v-if="error" class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {{ error }}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="handleOpenChange(false)">
          取消
        </Button>
        <Button @click="handleSubmit" :disabled="loading">
          <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
          保存
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
