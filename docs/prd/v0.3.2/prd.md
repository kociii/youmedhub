# v0.3.2 项目连线、导出与项目内 AI

## 版本概述

v0.3.2 在前两版可用的基础上，补齐“连接关系、成果导出和项目内生成能力”，让项目从个人整理空间升级为可复用的生产工作台。

| 需求 | 描述 | 优先级 | 相关文档 |
|------|------|--------|----------|
| F1 | 节点连线系统 | P0 | design.md / dev.md |
| F2 | 项目版本快照与正式保存 | P0 | plan.md / dev.md |
| F3 | 导出能力：JSON / PNG / Excel | P1 | design.md / dev.md |
| F4 | 项目内 AI：分镜图 / 视频片段 | P1 | prd.md / dev.md |
| F5 | 文件存储统一走阿里云 OSS | P0 | dev.md |
| F6 | 项目公开分享 | P0 | design.md / dev.md |
| F7 | 画布浅色 / 暗黑模式 | P1 | design.md / dev.md |
| F8 | 节点可连线规则：`note` 不参与连线 | P0 | design.md / dev.md |

---

## 当前基线（承接 v0.3.1）

### 参考文件

- `src/router/index.ts`
- `src/components/layout/AppLayout.vue`
- `src/components/ResultToolbar.vue`
- `src/composables/useVideoAnalysis.ts`
- `src/views/ProjectCanvasPage.vue`
- `src/projects/types.ts`

### 结论

- 画布打开链路与本地编辑能力已经在前两版建立。
- 云端、导出、AI 都是“可选增强”，不应再反向压缩前两版范围。
- 当前节点类型已经扩展到 `text / image / video / script / ai_call / note`。
- 其中 `note` 节点应保持为注释节点，不参与连线。

---

## 本版本增量

- 增加节点连线与关系表达。
- 增加导出与分享能力。
- 基于脚本节点触发图片/视频生成。
- 所有媒体文件统一上传至阿里云 OSS；Supabase 只保存项目结构、快照与文件元数据。
- 支持生成公开分享链接，外部用户可只读访问项目分享页。
- 项目内所有 AI 请求统一走阿里云百炼接口，使用一个 API Key 管理多种能力（文本、结构化 JSON、图片提示、视频提示等）。
- 增加画布浅色 / 暗黑模式切换。
- 明确连线规则：便签节点不支持连线，但仍支持编辑和缩放。

### AI 调用卡片（强约束）

`ai_call` 卡片需要在配置时明确“输出结果类型”，系统按类型渲染结果卡片底部输出区。

必填字段：

1. `model_id`
2. `prompt_template`
3. `input_bindings`
4. `output_type`

`output_type` 枚举：

1. `text`
2. `markdown`
3. `json`
4. `image`
5. `video`
6. `script`

交互要求：

1. AI 执行按钮在卡片头部操作区。
2. 输出结果固定显示在该卡片下半区，不跳转外部页面。
3. 输出区需显示状态：`idle` / `running` / `success` / `error`。
4. 同一卡片保留最近一次执行结果和执行时间。

---

## 非目标

- 不引入协同编辑。
- 不在本版解决移动端复杂编辑体验。
- 不支持匿名访客直接进入编辑态。
