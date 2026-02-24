<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Mail, Github } from 'lucide-vue-next'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const auth = useAuth()

// 表单状态
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')
const activeTab = ref('login')

// 重置表单
function resetForm() {
  email.value = ''
  password.value = ''
  confirmPassword.value = ''
  error.value = ''
  success.value = ''
}

// 邮箱登录
async function handleLogin() {
  if (!email.value || !password.value) {
    error.value = '请填写邮箱和密码'
    return
  }

  loading.value = true
  error.value = ''

  try {
    await auth.signIn(email.value, password.value)
    emit('update:open', false)
    resetForm()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '登录失败'
  } finally {
    loading.value = false
  }
}

// 邮箱注册
async function handleRegister() {
  if (!email.value || !password.value || !confirmPassword.value) {
    error.value = '请填写所有字段'
    return
  }

  if (password.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致'
    return
  }

  if (password.value.length < 6) {
    error.value = '密码长度至少 6 位'
    return
  }

  loading.value = true
  error.value = ''

  try {
    await auth.signUp(email.value, password.value)
    success.value = '注册成功！请查收验证邮件'
  } catch (e) {
    error.value = e instanceof Error ? e.message : '注册失败'
  } finally {
    loading.value = false
  }
}

// GitHub 登录
async function handleGitHubLogin() {
  loading.value = true
  error.value = ''

  try {
    await auth.signInWithGitHub()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'GitHub 登录失败'
    loading.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>登录 / 注册</DialogTitle>
        <DialogDescription>
          登录以使用收藏功能
        </DialogDescription>
      </DialogHeader>

      <Tabs v-model="activeTab" class="w-full">
        <TabsList class="grid w-full grid-cols-2">
          <TabsTrigger value="login">登录</TabsTrigger>
          <TabsTrigger value="register">注册</TabsTrigger>
        </TabsList>

        <!-- 登录表单 -->
        <TabsContent value="login" class="space-y-4">
          <div class="space-y-2">
            <Label for="login-email">邮箱</Label>
            <Input
              id="login-email"
              v-model="email"
              type="email"
              placeholder="your@email.com"
              @keyup.enter="handleLogin"
            />
          </div>
          <div class="space-y-2">
            <Label for="login-password">密码</Label>
            <Input
              id="login-password"
              v-model="password"
              type="password"
              placeholder="••••••••"
              @keyup.enter="handleLogin"
            />
          </div>

          <Button
            class="w-full"
            @click="handleLogin"
            :disabled="loading"
          >
            <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
            <Mail v-else class="mr-2 h-4 w-4" />
            邮箱登录
          </Button>
        </TabsContent>

        <!-- 注册表单 -->
        <TabsContent value="register" class="space-y-4">
          <div class="space-y-2">
            <Label for="register-email">邮箱</Label>
            <Input
              id="register-email"
              v-model="email"
              type="email"
              placeholder="your@email.com"
            />
          </div>
          <div class="space-y-2">
            <Label for="register-password">密码</Label>
            <Input
              id="register-password"
              v-model="password"
              type="password"
              placeholder="至少 6 位"
            />
          </div>
          <div class="space-y-2">
            <Label for="register-confirm">确认密码</Label>
            <Input
              id="register-confirm"
              v-model="confirmPassword"
              type="password"
              placeholder="再次输入密码"
              @keyup.enter="handleRegister"
            />
          </div>

          <Button
            class="w-full"
            @click="handleRegister"
            :disabled="loading"
          >
            <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
            <Mail v-else class="mr-2 h-4 w-4" />
            邮箱注册
          </Button>
        </TabsContent>
      </Tabs>

      <!-- 分隔线 -->
      <div class="relative">
        <div class="absolute inset-0 flex items-center">
          <span class="w-full border-t" />
        </div>
        <div class="relative flex justify-center text-xs uppercase">
          <span class="bg-background px-2 text-muted-foreground">或</span>
        </div>
      </div>

      <!-- GitHub 登录 -->
      <Button
        variant="outline"
        class="w-full"
        @click="handleGitHubLogin"
        :disabled="loading"
      >
        <Github class="mr-2 h-4 w-4" />
        GitHub 登录
      </Button>

      <!-- 错误提示 -->
      <div v-if="error" class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        {{ error }}
      </div>

      <!-- 成功提示 -->
      <div v-if="success" class="rounded-md bg-green-500/10 p-3 text-sm text-green-600">
        {{ success }}
      </div>
    </DialogContent>
  </Dialog>
</template>
