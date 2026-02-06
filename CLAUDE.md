# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 技术栈

- **Vue 3.5.13** - 使用 Composition API 和 `<script setup>` 语法
- **Vite 7.3.1** - 构建工具和开发服务器
- **TypeScript 5.7.2** - 启用严格模式
- **Tailwind CSS 3.4.19** - 使用 CSS 变量主题系统
- **shadcn-vue** - 基于 radix-vue 的组件库（New York 风格）

### 核心依赖

- `radix-vue` - 无样式的可访问组件原语
- `class-variance-authority` - 组件变体管理
- `clsx` + `tailwind-merge` - 类名工具（通过 `cn()` 函数使用）
- `lucide-vue-next` - 图标库

## 开发命令

```bash
npm run dev      # 启动开发服务器
npm run build    # TypeScript 类型检查 + 生产构建
npm run preview  # 预览生产构建
```

## 项目架构

### 路径别名

- `@/` 映射到 `src/` 目录（在 vite.config.ts 和 tsconfig.json 中配置）
- shadcn-vue 组件别名：
  - `@/components` - 组件目录
  - `@/lib/utils` - 工具函数
  - `@/components/ui` - UI 组件

### 目录结构

```
src/
├── components/
│   └── ui/              # shadcn-vue 组件（通过 CLI 添加）
├── lib/
│   └── utils.ts         # cn() 类名合并函数
├── App.vue              # 根组件
├── main.ts              # 应用入口
└── style.css            # Tailwind 指令 + CSS 变量主题
```

### 主题系统

项目使用 Tailwind CSS 变量主题系统：

- 主题变量定义在 `src/style.css` 的 `:root` 和 `.dark` 中
- 使用 HSL 颜色值（如 `--primary: 0 0% 9%`）
- 支持暗色模式（通过 `dark` 类切换）
- Tailwind 配置在 `tailwind.config.js` 中扩展了主题颜色

### shadcn-vue 集成

配置文件：`components.json`

- 风格：New York
- 基础颜色：neutral
- 使用 CSS 变量
- 组件通过 CLI 添加：`npx shadcn-vue@latest add <component>`

### TypeScript 配置

- 严格模式启用
- 未使用的局部变量和参数检查
- Bundler 模块解析
- JSX 保留（由 Vue 处理）

## Vue 开发规范

- 使用 Composition API 和 `<script setup lang="ts">` 语法
- 组件使用 TypeScript
- 样式使用 Tailwind CSS 工具类
- 使用 `cn()` 函数合并条件类名
