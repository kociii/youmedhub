# v0.2.1 实施计划

## 需求 5：精简分析控制 + Token 移位

- [x] 5.1 精简 AnalysisControl.vue — 移除 Card 包裹、移除 Token Badge、移除 Badge/Card 导入
- [x] 5.2 ResultToolbar.vue — 新增 tokenUsage 解构、导入 Badge、在导出按钮左侧显示 Token

## 需求 4：优化分镜表格

- [x] 4.1 ScriptTable.vue — 序号列 TableHead + TableCell 添加 text-center
- [x] 4.2 ScriptTable.vue — 景别+运镜合并为 1 列，纵向排列两个色彩 Badge
- [x] 4.3 ScriptTable.vue — 定义 getShotTypeColor / getCameraMovementColor 辅助函数
- [x] 4.4 ScriptTable.vue — 开始+结束+时长合并为 1 列「时间」
- [x] 4.5 ScriptTable.vue — 视频预览列宽 w-40 → w-48，TableCell 添加 max-h-[300px]
- [x] 4.6 VideoSegmentPlayer.vue — 视频 h-20 w-32 object-cover → max-h-[260px] w-full object-contain

## 验证

- [x] npm run build 通过（TypeScript + Vite）
