# CLAUDE.md

本文件为 Claude Code 提供项目上下文和开发指引。

## 技术栈

- **Vue 3.5** - 使用 Composition API 和 `<script setup>` 语法
- **Vite 7.3** - 构建工具和开发服务器
- **TypeScript 5.7** - 启用严格模式
- **Tailwind CSS 3.4** - 使用 CSS 变量主题系统
- **shadcn-vue** - 基于 radix-vue 的组件库（New York 风格）

### 业务依赖

- `ali-oss` - 阿里云 OSS 浏览器直传
- `markstream-vue` - Markdown 流式渲染（AI 输出实时展示）
- `xlsx` - Excel 导出
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
- shadcn-vue 组件别名：`@/components`、`@/lib/utils`、`@/components/ui`

### 目录结构

```
src/
├── api/
│   ├── temporaryFile.ts       # 阿里云 OSS 上传（STS 临时凭证 / 本地直传）
│   └── videoAnalysis.ts       # 百炼 API 调用（流式 SSE + Markdown 表格解析）
├── assets/                    # Logo 等静态资源
├── components/
│   ├── ui/                    # shadcn-vue 组件（button/card/tabs/table/dialog/input/progress/badge/separator）
│   ├── ApiKeyDialog.vue       # F5 API Key 配置弹窗
│   ├── VideoUploader.vue      # F1 拖拽/点击上传
│   ├── VideoPreview.vue       # F1 视频预览播放器
│   ├── AnalysisControl.vue    # F2 分析控制面板
│   ├── LeftPanel.vue          # 左侧面板容器
│   ├── RightPanel.vue         # 右侧主区域容器
│   ├── ResultToolbar.vue      # F3 模式切换 + F4 导出按钮
│   ├── MarkdownView.vue       # F3 Markdown 流式渲染（markstream-vue）
│   ├── ScriptTable.vue        # F3 分镜脚本表格
│   └── VideoSegmentPlayer.vue # F3 行内视频片段播放器
├── composables/
│   └── useVideoAnalysis.ts    # 全局状态管理（ref 单例模式，无需 Pinia）
├── lib/
│   └── utils.ts               # cn() 类名合并函数
├── prompts/
│   └── videoAnalysis.ts       # AI 提示词（分镜拍摄脚本分析）
├── types/
│   └── video.ts               # VideoScriptItem / AnalysisStatus / TokenUsage 类型
├── utils/
│   ├── exportExcel.ts         # Excel 导出
│   └── videoCapture.ts        # 时间解析（parseTimeToSeconds）
├── App.vue                    # 根组件（顶部栏 + 左右分栏布局）
├── main.ts                    # 应用入口
├── env.d.ts                   # 环境变量类型声明
└── style.css                  # Tailwind 指令 + CSS 变量主题
api/
└── oss-sts.ts                 # Vercel Serverless Function（STS 临时凭证）
```

### 状态管理

使用 `src/composables/useVideoAnalysis.ts` 管理全局状态，基于 Vue 3 模块级 `ref` + `computed` 单例模式（状态和计算属性均定义在模块顶层，函数仅返回引用）：

- `videoFile` / `videoUrl` / `uploadProgress` - 视频上传状态
- `analysisStatus` / `markdownContent` / `scriptItems` / `tokenUsage` - AI 分析状态
- `viewMode` - 展示模式切换（markdown / table）
- `apiKey` - API Key（localStorage 持久化）

### 数据类型

`VideoScriptItem` 包含 11 个字段，与 AI 提示词输出格式严格对应：
序号、景别、运镜、画面内容、拍摄指导（shootingGuide）、画面文案/花字、口播/台词、音效/BGM、开始时间、结束时间、时长

### 环境变量

- 前端变量使用 `VITE_` 前缀，通过 `import.meta.env` 读取
- 后端变量（Vercel Serverless）通过 `process.env` 读取
- 本地开发：`.env` 文件（已 gitignore）
- 生产环境：Vercel 项目设置中配置
- 模板文件：`.env.example`

### 主题系统

- 主题变量定义在 `src/style.css` 的 `:root` 和 `.dark` 中
- 使用 HSL 颜色值（如 `--primary: 0 0% 9%`）
- Tailwind 配置在 `tailwind.config.js` 中扩展了主题颜色

### shadcn-vue 集成

配置文件：`components.json`

- 风格：New York
- 基础颜色：neutral
- 使用 CSS 变量
- 组件通过 CLI 添加：`npx shadcn-vue@latest add <component>`

## 开发规范

- 使用 Composition API 和 `<script setup lang="ts">` 语法
- 组件使用 TypeScript
- 样式使用 Tailwind CSS 工具类
- 使用 `cn()` 函数合并条件类名
- 部署目标：Vercel（`api/` 目录自动识别为 Serverless Functions）

## v0.2.0 审查修复记录

以下问题已在代码审查中修复：

### 已修复

1. **模型名称错误**：`AnalysisControl.vue` 中 `'qwen-vl-flash' as any` → `'qwen3-vl-flash'`，与 `AIModel` 类型定义一致
2. **SSE 流截断**：`videoAnalysis.ts` 中 SSE 解析增加 buffer 机制，防止跨 chunk 数据丢失
3. **computed 重复创建**：`useVideoAnalysis.ts` 中 `hasVideo`/`hasResult`/`isAnalyzing` 提升到模块顶层
4. **DEBUG 日志清理**：`videoAnalysis.ts` 中移除所有 `[DEBUG]` console.log
5. **死代码清理**：删除 `localCache.ts`（未使用）；`videoCapture.ts` 精简为仅保留 `parseTimeToSeconds`
6. **时间解析歧义**：`parseTimeToSeconds` 三段式统一按 HH:MM:SS 处理，移除 MM:SS:FF 歧义分支
7. **VideoSegmentPlayer 懒加载**：改为首次点击才创建 `<video>` 元素，避免表格行数多时同时加载大量视频
8. **alert() 移除**：`AnalysisControl.vue` 改为内联错误提示（`errorMessage` ref）
9. **catch 类型安全**：`catch (e: any)` → `catch (e)` + `instanceof Error` 类型守卫
10. **文件格式校验统一**：`temporaryFile.ts` 的 `validateVideoFile` 与 UI 一致，仅允许 mp4/mov
11. **exportExcel 参数类型**：移除不必要的 `undefined` 联合类型

### 已知限制与后续注意事项

- **AI 模型名称**：当前硬编码为 `qwen3-vl-flash`，如需切换模型应通过 `AIModel` 类型约束，不要用 `as any` 绕过
- **SSE 流解析**：已实现 buffer 机制，但如果 API 返回非标准 SSE 格式仍可能出问题，修改时需保留 buffer 逻辑
- **全局状态单例**：`useVideoAnalysis` 的 ref/computed 定义在模块顶层，新增状态或计算属性时也应放在模块顶层，不要放在函数内部
- **VideoSegmentPlayer**：当前每个激活的播放器仍会创建独立 video 元素，如果未来表格行数非常多（50+）且用户同时激活多个，可考虑共享单个 video 元素
- **OSS 客户端配置**：`temporaryFile.ts` 中 `clientConfig` 仍使用 `any` 类型，后续可替换为 `ali-oss` 提供的类型
- **主 chunk 体积**：构建产物 `index.js` 约 1.5MB（gzip 477KB），主要来自 `ali-oss` 和 `markstream-vue`，后续可通过 `manualChunks` 拆分或动态 import 优化
