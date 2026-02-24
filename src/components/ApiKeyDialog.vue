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

const { dashscopeApiKey, arkApiKey, setDashscopeApiKey, setArkApiKey } = useVideoAnalysis()
const open = ref(false)
const inputDashscopeKey = ref(dashscopeApiKey.value)
const inputArkKey = ref(arkApiKey.value)

function handleSave() {
  setDashscopeApiKey(inputDashscopeKey.value.trim())
  setArkApiKey(inputArkKey.value.trim())
  open.value = false
}

function handleOpen() {
  inputDashscopeKey.value = dashscopeApiKey.value
  inputArkKey.value = arkApiKey.value
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
          输入 API Key，Key 仅保存在浏览器本地。
        </DialogDescription>
      </DialogHeader>
      <div class="space-y-4">
        <div class="space-y-2">
          <label class="text-sm font-medium">阿里百炼 API Key</label>
          <Input
            v-model="inputDashscopeKey"
            type="password"
            placeholder="sk-xxxxxxxxxxxxxxxxxxxx"
          />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium">火山引擎 ARK API Key</label>
          <Input
            v-model="inputArkKey"
            type="password"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="open = false">取消</Button>
        <Button @click="handleSave">保存</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
