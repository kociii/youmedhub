# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

**重要：始终用中文回复用户。**

## 开发命令

```bash
npm run dev      # 启动开发服务器
npm run build    # 类型检查并构建生产版本
npm run preview  # 预览生产构建
```

## 架构

**技术栈**: Vue 3 + TypeScript + Vite + Pinia + Tailwind CSS v4

**状态管理**: Pinia store 位于 `src/stores/analysis.ts`，管理：
- 视频上传状态 (`videoUrl`)
- 分析进度跟踪 (`isAnalyzing`, `progress`)
- 脚本片段数据 (`segments`, `currentSegmentId`)

**布局结构**: 单页应用，固定三栏布局：
1. 左侧：侧边栏导航
2. 中间 (450px)：视频上传/播放器 + 配置面板
3. 右侧：脚本分析结果表格

**组件组织**:
- `src/components/layout/` - 布局组件 (Sidebar)
- `src/components/features/` - 功能组件 (UploadZone, VideoPlayer, ConfigPanel, ScriptTable, VideoSegmentPlayer)
- `src/components/ui/` - 可复用 UI 组件 (基于 radix-vue)

**路径别名**: `@/` 映射到 `src/`

## 样式

使用 **Tailwind CSS v4**，CSS 配置位于 `src/style.css`：
- 通过 `@theme` 指令使用 oklch 颜色的自定义颜色系统
- 设计令牌：`--color-background`, `--color-primary`, `--color-border` 等
- 通过 `@media (prefers-color-scheme: dark)` 实现暗色模式
- 无 `tailwind.config.js` 文件（v4 仅使用 CSS 配置）

## 构建工具

使用 `rolldown-vite@7.2.5`（Vite 替代品），在 package.json overrides 中指定。
