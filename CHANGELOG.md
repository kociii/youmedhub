# 更新日志

## [0.2.0] - 2025-11-24

### ✨ 新增

- **Token 使用统计**
  - 实时显示输入/输出/总计 Token 使用量
  - 支持 OpenAI 协议 stream_options 获取 Token 信息
  - 界面显示在分析结果表头旁

- **流式 Markdown 输出**
  - AI 分析结果流式显示，所见即所得
  - 支持 Markdown 表格实时渲染
  - 可切换原始 Markdown 和表格视图

- **文本换行支持**
  - 表格和 Markdown 中 `<br>` 标签自动转换为换行
  - 口播、画面文案等长文本支持多行显示

- **表格优化**
  - 标题行吸顶固定（sticky positioning）
  - 优化列宽布局，提升数据浏览体验

- **本地缓存功能**（开发环境）
  - 自动保存分析结果到本地
  - 方便调试和测试

### 🔧 技术改进

- 提取 AI 提示词到独立文件 `src/prompts/videoAnalysis.ts`
- 新增 `src/utils/localCache.ts` 本地缓存工具
- 添加 TokenUsage 类型定义
- 优化代码结构，提高可维护性

### 🐛 修复

- 修复视频片段时间计算错误问题
  - 改用数组索引而非 sequenceNumber 进行时间累加
  - 确保片段时间正确按顺序计算
  - 添加类型安全检查

## [0.1.1] - 2025-11-22

### ✨ 新增

- 视频片段实时预览功能
  - 鼠标悬停表格中的"视频片段"单元格即可播放对应时间段
  - 自动循环播放当前片段
  - 显示片段时长标识

- 关键帧截图功能
  - 手动截取单个关键帧
  - 一键批量截取所有关键帧
  - 点击截图预览大图
  - 使用 Canvas API 实现轻量级截图

### 📝 文档

- 更新 README.md，添加新功能说明
- 新增 CAPTURE_FEATURE.md，详细记录截图和视频片段功能实现

### 🔧 技术改进

- 新增 `src/utils/videoCapture.ts` 工具模块
  - 时间字符串解析：支持 MM:SS、HH:MM:SS、MM:SS:FF 格式
  - Canvas 截图功能
  - 批量关键帧截取

- 新增组件
  - `VideoSegmentPlayer.vue`：视频片段播放器
  - `KeyframeView.vue`：关键帧截图视图

## [0.1.0] - 2025-11-21

### ✨ 初始发布

- AI 视频分析功能
- 脚本拆解表格展示
- JSON/CSV 导出
- API Key 管理
