# 历史记录功能开发计划

## 一、需求分析

### 1.1 核心需求

- ✅ 历史记录保存在浏览器中（无账户体系）
- ✅ 视频保存本地路径（远程路径24小时自动删除）
- ✅ 保存AI分析结果（包括结构化数据和Markdown）
- ✅ 能够切换显示不同的历史记录

### 1.2 数据存储需求

需要保存的数据包括：

- 视频文件句柄（FileSystemHandle，用于从本地文件系统读取）
- 视频元数据（文件名、大小、时长、格式）
- AI分析结果（VideoAnalysisResponse）
- Markdown原始内容
- Token使用统计（TokenUsage）
- 分析时间戳
- 使用的AI模型

**注意**：视频文件不存储在浏览器中，而是通过文件句柄从本地文件系统读取

## 二、技术方案

### 2.1 存储方案选择

**方案A：IndexedDB + File System Access API（推荐）**

- ✅ IndexedDB存储元数据和文件句柄（轻量）
- ✅ File System Access API保存文件句柄，从本地文件系统读取
- ✅ 不占用浏览器存储空间
- ✅ 支持结构化数据
- ❌ 需要浏览器支持File System Access API（Chrome/Edge）
- ❌ 文件句柄可能失效（用户移动/删除文件）

**方案B：localStorage + File System Access API**

- ✅ localStorage存储元数据（轻量）
- ✅ File System Access API保存文件句柄
- ❌ localStorage大小限制（5-10MB）
- ❌ 需要维护两套存储逻辑

**最终选择：IndexedDB + File System Access API**

- 统一存储方案，便于管理
- 不存储视频文件，节省空间
- 通过文件句柄从本地文件系统读取
- 如果文件句柄失效，提示用户重新选择文件

### 2.2 数据结构设计

```typescript
interface HistoryRecord {
  id: string;                    // 唯一ID（时间戳+随机字符串）
  timestamp: string;              // ISO时间戳
  videoName: string;             // 视频文件名
  videoSize: number;              // 视频文件大小（字节）
  videoDuration: string;          // 视频时长（MM:SS格式）
  videoFormat: string;            // 视频格式（MP4等）
  fileHandle: FileSystemFileHandle | null;  // 文件句柄（存储在IndexedDB）
  model: string;                  // AI模型名称
  analysisResult: VideoAnalysisResponse;  // 分析结果
  markdownContent: string;        // Markdown原始内容
  tokenUsage: TokenUsage | null;  // Token使用统计
}
```

**注意**：

- `fileHandle` 使用 File System Access API 保存
- 如果文件句柄失效（文件被移动/删除），需要用户重新选择文件
- 文件句柄可以序列化存储到IndexedDB（使用 `structuredClone` 或 `serialize` 方法）

### 2.3 功能模块划分

#### 模块1：IndexedDB存储工具 (`src/utils/historyStorage.ts`)

- `initHistoryDB()` - 初始化数据库
- `saveHistoryRecord(record, fileHandle)` - 保存历史记录（包含文件句柄）
- `getAllHistoryRecords()` - 获取所有历史记录（按时间倒序，不包含文件句柄）
- `getHistoryRecordById(id)` - 根据ID获取记录（包含文件句柄）
- `getVideoFileFromHandle(fileHandle)` - 从文件句柄读取视频文件
- `deleteHistoryRecord(id)` - 删除历史记录
- `clearAllHistory()` - 清空所有历史记录
- `getHistoryCount()` - 获取历史记录数量
- `isFileSystemAccessSupported()` - 检查浏览器是否支持File System Access API

#### 模块2：历史记录组件 (`src/components/HistoryView.vue`)

- 历史记录列表展示
- 记录卡片（显示视频缩略图、文件名、时间、场景数等）
- 切换显示功能
- 删除记录功能
- 空状态提示

#### 模块3：VideoAnalyzer组件增强

- 分析完成后自动保存到历史记录
- 从历史记录加载视频和分析结果
- 历史记录标签页集成

## 三、开发步骤

### 阶段1：存储层开发（2-3小时）

1. ✅ 创建 `src/utils/historyStorage.ts`
   - 实现IndexedDB初始化
   - 实现CRUD操作
   - 处理文件句柄的序列化和存储
   - 实现从文件句柄读取视频文件
   - 处理文件句柄失效的情况

### 阶段2：类型定义（0.5小时）

1. ✅ 扩展 `src/types/video.ts`
   - 添加 `HistoryRecord` 接口定义

### 阶段3：UI组件开发（3-4小时）

1. ✅ 创建 `src/components/HistoryView.vue`
   - 历史记录列表UI
   - 记录卡片设计
   - 加载状态处理
   - 空状态展示

2. ✅ 修改 `src/components/VideoAnalyzer.vue`
   - 集成历史记录保存逻辑
   - 集成HistoryView组件
   - 实现从历史记录加载功能
   - 实现切换显示功能

### 阶段4：功能完善（1-2小时）

1. ✅ 视频缩略图生成（可选，使用canvas截取第一帧）
2. ✅ 历史记录搜索/筛选（可选）
3. ✅ 批量删除功能（可选）
4. ✅ 存储空间管理（清理旧记录）

### 阶段5：测试与优化（1小时）

1. ✅ 测试各种视频格式
2. ✅ 测试存储容量限制
3. ✅ 测试数据迁移（如果数据结构变更）
4. ✅ 性能优化（大量记录时的加载）

## 四、实现细节

### 4.1 File System Access API 使用说明

**获取文件句柄**:

```typescript
// 用户选择文件时
const [fileHandle] = await window.showOpenFilePicker({
  types: [{
    description: '视频文件',
    accept: { 'video/*': ['.mp4', '.mov', '.avi', '.webm', '.mkv'] }
  }],
  multiple: false
});

// 获取File对象
const file = await fileHandle.getFile();
```

**保存文件句柄到IndexedDB**:

- FileSystemFileHandle 可以使用 `structuredClone` 序列化
- 或者使用 IndexedDB 的 `put` 方法直接存储（支持结构化克隆）

**从文件句柄读取文件**:

```typescript
// 从IndexedDB读取文件句柄后
const file = await fileHandle.getFile();
const url = URL.createObjectURL(file);
```

**文件句柄失效检测**:

```typescript
try {
  const file = await fileHandle.getFile();
} catch (error) {
  if (error.name === 'NotFoundError') {
    // 文件句柄失效，提示用户重新选择
  }
}
```

### 4.2 IndexedDB数据库设计

**数据库名称**: `youmedhub_history`
**版本**: 1
**对象存储**:

- `records`: 主存储，keyPath为`id`
  - 索引: `timestamp` (用于排序)

### 4.2 视频文件处理

**存储方式**:

- 使用 File System Access API 获取文件句柄
- 将文件句柄序列化后存储到IndexedDB
- 读取时从文件句柄获取File对象，创建ObjectURL用于播放

**文件句柄获取流程**:

1. 用户选择文件时，使用 `window.showOpenFilePicker()` 获取文件句柄
2. 保存文件句柄到IndexedDB（需要序列化）
3. 读取时从文件句柄获取File对象

**注意事项**:

- 需要管理ObjectURL的生命周期（使用后revoke）
- 文件句柄可能失效（文件被移动/删除），需要错误处理
- 如果文件句柄失效，提示用户重新选择文件
- File System Access API 仅在Chrome/Edge等浏览器支持，需要降级方案

### 4.3 历史记录加载流程

1. 用户点击历史记录项
2. 从IndexedDB读取完整记录（包含文件句柄）
3. 尝试从文件句柄读取视频文件
4. 如果文件句柄失效：
   - 提示用户文件可能已被移动或删除
   - 提供重新选择文件的选项
   - 如果用户重新选择，更新文件句柄
5. 如果成功读取：
   - 从File对象创建ObjectURL
   - 设置videoUrl和analysisResult
   - 切换到"当前结果"标签页
   - 显示分析结果

### 4.4 UI/UX设计要点

**历史记录列表**:

- 卡片式布局，每张卡片显示：
  - 视频缩略图（第一帧或占位图）
  - 视频文件名
  - 分析时间（相对时间，如"2小时前"）
  - 场景数量
  - Token使用统计（可选）
- 点击卡片加载该记录
- 悬停显示删除按钮

**切换显示**:

- 在历史记录标签页选择记录
- 自动切换到"当前结果"标签页
- 显示加载状态

## 五、潜在问题与解决方案

### 5.1 存储空间限制

**问题**: 浏览器IndexedDB有存储限制
**解决**:

- 添加存储空间检查
- 提供清理旧记录功能
- 显示存储使用情况

### 5.2 文件句柄失效

**问题**: 文件可能被移动、重命名或删除，导致文件句柄失效
**解决**:

- 捕获文件读取错误
- 提示用户文件不可用
- 提供重新选择文件的选项
- 如果用户重新选择，更新文件句柄

### 5.3 浏览器兼容性

**问题**: File System Access API 仅在部分浏览器支持（Chrome/Edge）
**解决**:

- 检测浏览器支持情况
- 不支持时使用降级方案：
  - 提示用户使用支持的浏览器
  - 或使用传统文件选择器（但无法保存文件句柄）

### 5.4 跨浏览器兼容性

**问题**: IndexedDB在不同浏览器中可能有差异
**解决**:

- 使用成熟的IndexedDB封装库（如idb）
- 添加降级方案（localStorage仅存储元数据）

### 5.5 数据迁移

**问题**: 未来可能需要修改数据结构
**解决**:

- 使用版本号管理数据库
- 实现数据迁移逻辑

## 六、开发优先级

### P0（必须实现）

1. IndexedDB存储工具
2. File System Access API集成
3. 文件句柄的保存和读取
4. 历史记录保存功能
5. 历史记录列表展示
6. 从历史记录加载功能（包含文件句柄处理）
7. 切换显示功能
8. 文件句柄失效的错误处理

### P1（重要功能）

1. 删除历史记录
2. 视频缩略图（从文件句柄读取第一帧）
3. 文件句柄失效时的友好提示
4. 浏览器兼容性检测和提示

### P2（可选功能）

1. 历史记录搜索
2. 批量删除
3. 导出历史记录
4. 数据统计（总分析次数、总Token使用等）

## 七、开发时间估算

- 阶段1（存储层）: 3-4小时（包含File System Access API集成）
- 阶段2（类型定义）: 0.5小时
- 阶段3（UI组件）: 3-4小时
- 阶段4（功能完善）: 1-2小时
- 阶段5（测试优化）: 1小时

**总计**: 8.5-11.5小时

## 八、验收标准

1. ✅ 分析完成后自动保存到历史记录（包含文件句柄）
2. ✅ 历史记录列表正确显示所有记录
3. ✅ 点击历史记录可以从本地文件系统读取视频并显示分析结果
4. ✅ 视频可以正常播放（从本地文件系统读取）
5. ✅ 文件句柄失效时能正确处理并提示用户
6. ✅ 可以删除历史记录
7. ✅ 浏览器兼容性检测和提示正常
8. ✅ 不支持File System Access API时的降级方案
