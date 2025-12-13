# 设计文档 (Design Docs) - 析见 (YouMedHub)

## 1. 界面架构 (UI Architecture)

采用 **三栏式布局 (Three-Column Layout)**。

```ascii
+-----------------------------------------------------------------------+
|  Header: Logo | User Profile (Credits: 100) | [Buy Credits] | Logout  |
+-----------------------------------------------------------------------+
|          |                                    |                       |
|  Nav     |   Configuration & Preview          |      Workspace        |
|  Bar     |   (Middle Column)                  |      (Right Column)   |
|          |                                    |                       |
| [ New  ] | +--------------------------------+ | +-------------------+ |
| [ Task ] | |  [ State: Upload / Player ]    | | |  Script Table     | |
|          | |                                | | |                   | |
| [ Hist ] | |  [ Upload Button ]             | | |                   | |
| [ ory  ] | |  (Drag & Drop)                 | | |                   | |
|          | |           OR                   | | |                   | |
| [ User ] | |  [ Video Player ]              | | |                   | |
| [ Ctr  ] | |  (Main Preview)                | | |                   | |
|          | +--------------------------------+ | |                   | |
| [ Sett ] |                                    | |                   | |
| [ ings ] | +--------------------------------+ | |                   | |
|          | |  Settings                      | | |                   | |
|          | |  Model: GPT-4o                 | | |                   | |
|          | |  Prompt: [Edit]                | | |                   | |
|          | |  Cost: 15 Credits              | | |                   | |
|          | |  [ Start Analyze ]             | | |                   | |
|          | +--------------------------------+ | +-------------------+ |
|          |                                    |                       |
+----------+------------------------------------+-----------------------+
```

## 2. 交互流程 (Interaction Flow)

### 2.1 核心分析流程
1.  **Upload**:
    *   中栏默认显示 "上传区域"。
    *   用户拖拽或选择文件。
    *   上传成功后，中栏变为 **视频播放器**，加载本地预览或上传后的 URL。
2.  **Analyze**:
    *   用户点击 "开始分析"。
    *   前端调用上传接口获取 URL (如尚未上传)，提交任务。
3.  **Result**:
    *   右侧栏加载 "Script Table"。

### 2.2 结果展示与预览 (Result & Preview)
*   **Script Table**:
    *   显示列：序号, 时间段, 画面, 台词, 景别, 运镜, **视频预览**。
*   **Video Preview (Last Column)**:
    *   **Display**: 显示该片段的静态缩略图或播放图标。
    *   **Hover Interaction**:
        *   鼠标悬停在单元格上。
        *   单元格内（或浮层）自动播放对应时间段 (`startTime` ~ `endTime`) 的视频。
        *   **Implementation**: 复用原视频源，通过 HTML5 Video API (`currentTime`) 控制播放范围，循环播放该片段。**不进行后端切片**。

## 3. 组件划分 (Component Breakdown)

### 3.1 Layout Components
*   `AppLayout`: 全局三栏布局容器。
*   `Sidebar`: 左侧导航菜单。
*   `Header`: 顶部用户信息栏。

### 3.2 Feature Components
*   **UploadZone**:
    *   Props: `maxSize`, `accept`.
    *   Events: `onFileSelected`, `onUploadSuccess`.
*   **ConfigPanel**:
    *   包含模型选择、提示词输入框、费用预估展示。
*   **VideoPlayer**:
    *   Props: `src`, `poster`.
    *   Expose: `seekTo(time)`, `getCurrentTime()`.
*   **ScriptTable**:
    *   Props: `data` (Array of ScriptItem).
    *   Events: `onRowClick(item)`.
    *   Features: 单元格可编辑，支持导出。

## 4. 样式规范 (Design System)
*   **Color Palette**:
    *   Primary: Indigo-600 (品牌色)
    *   Background: Slate-50 (整体背景)
    *   Surface: White (卡片背景)
    *   Text: Slate-900 (主标题), Slate-600 (正文)
*   **Typography**:
    *   Font: Inter / System UI
*   **Spacing**: Tailwind default spacing scale (4px base).
