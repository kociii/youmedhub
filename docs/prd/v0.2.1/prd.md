# v0.2.1 UI 优化需求文档

## 需求 4：优化分镜表格

### 4.1 序号列文字居中

**文件**: `src/components/ScriptTable.vue`

- `<TableHead>` 和 `<TableCell>` 的序号列添加 `text-center` 类

### 4.2 时间列合并

**当前**: 开始、结束、时长 分为 3 列（3 个 `<TableHead>` + 3 个 `<TableCell>`）

**目标**: 合并为 1 列「时间」，单元格内纵向排列：

```
开始时间 - 结束时间
时长: xx
```

**修改**:
- 表头：删除「开始」「结束」「时长」3 列，新增 1 列「时间」
- 表体：合并为 1 个 `<TableCell>`，内部用 `<div>` 纵向排列

### 4.3 景别与运镜合并

**当前**: 景别、运镜 分为 2 列

**目标**: 合并为 1 列「景别/运镜」，单元格内纵向排列：

```
景别值
运镜值
```

**修改**:
- 表头：删除「景别」「运镜」2 列，新增 1 列「景别/运镜」
- 表体：合并为 1 个 `<TableCell>`，内部用 `<div>` 纵向排列

### 4.4 色彩标签

为景别和运镜值分别添加色彩 Badge 标签，便于视觉区分：

**景别色彩映射**（基于常见景别类型）:
- 远景/大远景 → 蓝色系
- 全景 → 青色系
- 中景 → 绿色系
- 近景 → 橙色系
- 特写/大特写 → 红色系
- 其他 → 灰色默认

**运镜色彩映射**（基于常见运镜方式）:
- 固定/静止 → 灰色系
- 推 → 蓝色系
- 拉 → 青色系
- 摇 → 绿色系
- 移 → 紫色系
- 跟 → 橙色系
- 其他 → 灰色默认

实现方式：使用内联 `style` 或 Tailwind 类为 Badge 设置不同的
`bg-*` / `text-*` 颜色。定义一个 `getColorClass(type, value)`
辅助函数，根据关键字匹配返回对应颜色类名。

### 4.5 合并后表格列结构

| 列 | 宽度 | 说明 |
|----|------|------|
| 序号 | w-12 | 居中显示 |
| 景别/运镜 | w-24 | 两行 Badge 标签 |
| 画面内容 | min-w-[160px] | 不变 |
| 拍摄指导 | min-w-[160px] | 不变 |
| 画面文案/花字 | min-w-[100px] | 不变 |
| 口播/台词 | min-w-[100px] | 不变 |
| 音效/BGM | min-w-[80px] | 不变 |
| 时间 | w-28 | 合并开始/结束/时长 |
| 视频预览 | w-48 | 等比缩放，居中显示 |

### 4.6 视频预览样式优化

**文件**: `src/components/VideoSegmentPlayer.vue` + `src/components/ScriptTable.vue`

**当前**: 视频固定 `h-20 w-32`（80px × 128px），使用 `object-cover` 裁切

**目标**: 视频等比例缩放展示，不裁切；表格单行最大高度 300px；视频在单元格内居中

**修改**:

1. **VideoSegmentPlayer.vue** — 视频元素样式调整：
   - 移除固定 `h-20 w-32` 和 `object-cover`
   - 改为 `max-h-[260px] w-full object-contain`，等比缩放不裁切
   - 外层容器添加 `items-center justify-center` 保持居中

2. **ScriptTable.vue** — 表格行高度约束：
   - 视频预览列的 `<TableCell>` 添加 `max-h-[300px]` 约束
   - 视频预览列宽度从 `w-40` 调整为 `w-48`，给等比缩放留更多空间

---

## 需求 5：精简分析控制 + Token 信息移至右侧

### 5.1 精简 AnalysisControl

**文件**: `src/components/AnalysisControl.vue`

**当前**: Card 容器内包含按钮 + 错误提示 + Token Badge

**目标**:
- 移除 `<Card>` 包裹，仅保留按钮 + 错误提示
- 移除 Token 显示部分（Badge）
- 按钮去掉 Card 背景，直接裸露在左侧面板中

修改后模板结构：
```vue
<template>
  <div class="space-y-2">
    <Button variant="outline" class="w-full" ...>
      ...
    </Button>
    <div v-if="error" class="text-xs text-destructive">...</div>
  </div>
</template>
```

不再需要导入 `Badge` 和 `Card` 组件。

### 5.2 Token 信息移至 ResultToolbar

**文件**: `src/components/ResultToolbar.vue`

在工具栏右侧（导出按钮左边）显示 Token 使用信息。

从 `useVideoAnalysis()` 额外解构 `tokenUsage`，在模板中添加：

```vue
<div v-if="tokenUsage" class="flex items-center gap-2">
  <Badge variant="secondary" class="text-xs">
    输入 {{ tokenUsage.prompt_tokens.toLocaleString() }}
  </Badge>
  <Badge variant="secondary" class="text-xs">
    输出 {{ tokenUsage.completion_tokens.toLocaleString() }}
  </Badge>
</div>
```

位置：放在 `<div class="flex-1" />` 之后、导出按钮之前。

需要新增导入 `Badge` 组件。

---

## 涉及文件清单

| 文件 | 修改内容 |
|------|----------|
| `src/components/ScriptTable.vue` | 序号居中；景别+运镜合并+色彩标签；时间三列合并；视频预览列宽度+高度约束 |
| `src/components/VideoSegmentPlayer.vue` | 视频等比缩放 + 居中 |
| `src/components/AnalysisControl.vue` | 移除 Card 和 Token Badge，仅保留按钮+错误提示 |
| `src/components/ResultToolbar.vue` | 新增 Token Badge 显示 |

## 验证方式

1. 分镜表格：序号居中；景别/运镜合并为一列且有色彩标签；时间合并为一列；视频等比缩放居中、单行不超过 300px
2. 左侧分析控制：仅一个 outline 按钮，无 Card 背景，无 Token 信息
3. 右侧工具栏：Token 信息显示在导出按钮左侧
4. `npm run build` 通过
