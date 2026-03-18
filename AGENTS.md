# AGENTS.md

## 通用约束

- Always respond in Chinese-simplified.

## 版本规划与界面设计约束

- 在编写任何版本规划、PRD、界面设计文档、页面改版方案之前，必须先审查当前已实现代码，不能凭空假设现有页面结构。
- 至少审查以下文件或对应替代文件：
  - `src/App.vue`
  - `src/router/index.ts`
  - `src/components/layout/AppLayout.vue`
  - `src/components/layout/AppMenu.vue`
  - 相关 `src/views/*.vue`
  - 相关业务组件与 composables
- 文档中必须明确区分：
  - 当前已实现结构
  - 本版本的增量调整
- 如果代码现状与旧文档冲突，以代码现状为准，并同步修正文档。

## 当前项目的布局基线

- 当前桌面端主壳层是“左侧菜单 + 条件配置栏 + 主内容区”的三栏结构。
- `analyze` 和 `create` 路由共用工作台框架：
  - 左侧由命名视图提供配置区
  - 右侧为 `RightPanel` 结果区
- 生成页当前是单面板信息流，不再按旧版 Tabs 结构规划。
- 设置页当前较轻量，后续扩展应优先在现有页面上增量重构。

## 文档更新要求

- 更新 `docs/prd` 下版本文档时，要在 `plan.md`、`design.md` 或 `dev.md` 中记录本次审查结论。
- 若设计依赖现有 UI 或交互，需在文档中写明参考了哪些现有文件。
