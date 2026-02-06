<script setup lang="ts">
import { ref } from 'vue'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Settings } from 'lucide-vue-next'

const { apiKey, setApiKey } = useVideoAnalysis()
const open = ref(false)
const inputKey = ref(apiKey.value)

function handleSave() {
  setApiKey(inputKey.value.trim())
  open.value = false
}

function handleOpen() {
  inputKey.value = apiKey.value
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button variant="outline" size="sm" @click="handleOpen">
        <Settings class="mr-2 h-4 w-4" />
        API Key 设置
      </Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>API Key 设置</DialogTitle>
        <DialogDescription>
          输入阿里云百炼 API Key，Key 仅保存在浏览器本地。
        </DialogDescription>
      </DialogHeader>
      <div class="space-y-2">
        <label class="text-sm font-medium">阿里云百炼 API Key</label>
        <Input
          v-model="inputKey"
          type="password"
          placeholder="sk-xxxxxxxxxxxxxxxxxxxx"
        />
      </div>
      <DialogFooter>
        <Button variant="outline" @click="open = false">取消</Button>
        <Button @click="handleSave">保存</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
