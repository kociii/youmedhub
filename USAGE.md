# 使用 shadcn-vue 组件

## 添加组件

使用 shadcn-vue CLI 添加你需要的组件：

```bash
# 添加 Button 组件
npx shadcn-vue@latest add button

# 添加 Card 组件
npx shadcn-vue@latest add card

# 添加 Input 组件
npx shadcn-vue@latest add input

# 查看所有可用组件
npx shadcn-vue@latest add
```

## 使用组件

添加组件后，它们会被放置在 `src/components/ui/` 目录下。你可以在你的 Vue 组件中导入使用：

```vue
<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>卡片标题</CardTitle>
      <CardDescription>卡片描述</CardDescription>
    </CardHeader>
    <CardContent>
      <Button>点击我</Button>
    </CardContent>
  </Card>
</template>
```

## 自定义主题

你可以在 `src/style.css` 中修改 CSS 变量来自定义主题颜色：

```css
:root {
  --primary: 221.2 83.2% 53.3%;  /* 修改主色调 */
  --radius: 0.5rem;               /* 修改圆角大小 */
  /* ... 其他变量 */
}
```

## 暗色模式

项目已配置暗色模式支持。在根元素添加 `dark` 类即可切换：

```vue
<script setup lang="ts">
import { ref } from 'vue'

const isDark = ref(false)

function toggleDark() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark')
}
</script>

<template>
  <button @click="toggleDark">
    切换暗色模式
  </button>
</template>
```
