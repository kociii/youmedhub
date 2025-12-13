<script setup lang="ts">
import { 
  PlusCircle, 
  History, 
  User, 
  Settings, 
  LogOut 
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const navItems = [
  { icon: PlusCircle, label: '新建任务', active: true },
  { icon: History, label: '历史记录', active: false },
  { icon: User, label: '个人中心', active: false },
  { icon: Settings, label: '设置', active: false },
]
</script>

<template>
  <div class="flex flex-col h-full bg-slate-900 text-white w-64 border-r border-slate-800">
    <div class="p-6">
      <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        YouMedHub
      </h1>
      <p class="text-xs text-slate-400 mt-1">AI 视频脚本分析平台</p>
    </div>

    <nav class="flex-1 px-4 space-y-2">
      <Button
        v-for="item in navItems"
        :key="item.label"
        variant="ghost"
        :class="[
          'w-full justify-start gap-3 text-slate-300 hover:text-white hover:bg-slate-800',
          item.active ? 'bg-slate-800 text-white' : ''
        ]"
      >
        <component :is="item.icon" class="w-5 h-5" />
        {{ item.label }}
      </Button>
    </nav>

    <div class="p-4 border-t border-slate-800">
      <div class="bg-slate-800/50 rounded-lg p-4 mb-4">
        <div class="text-sm text-slate-400 mb-2">剩余权益</div>
        <div class="flex items-end gap-1">
          <span class="text-2xl font-bold text-blue-400">85</span>
          <span class="text-xs text-slate-500 mb-1">/ 100 点</span>
        </div>
        <div class="w-full bg-slate-700 h-1.5 rounded-full mt-2">
          <div class="bg-blue-500 h-1.5 rounded-full" style="width: 85%"></div>
        </div>
      </div>
      
      <Button variant="ghost" class="w-full justify-start gap-3 text-slate-400 hover:text-red-400 hover:bg-slate-800/50">
        <LogOut class="w-5 h-5" />
        退出登录
      </Button>
    </div>
  </div>
</template>
