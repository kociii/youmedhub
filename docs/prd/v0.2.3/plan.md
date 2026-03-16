# v0.2.3 开发计划

> 存储方案重构：从自建 OSS 迁移至阿里云百炼临时存储

---

## 版本状态

```
v0.2.3 ⏳ 规划中
```

**版本目标**：
- 简化架构，移除自建 OSS 依赖
- 减少运维成本（无需 OSS Bucket、RAM 角色、Vercel Serverless）
- 降低用户配置复杂度

---

## 版本规划

```
v0.2.3-alpha  ──▶  v0.2.3-beta  ──▶  v0.2.3-stable
     │                 │                  │
     │                 │                  └── 验证完成
     │                 │
     │                 └── API 调用适配 + 旧代码清理
     │
     └── 上传模块重构 + 基础测试
```

---

## v0.2.3-alpha：上传模块重构

### 阶段目标

完成百炼临时存储上传模块，实现视频/图片文件上传。

### 前置依赖

- 阿里云百炼 API Key（已有）
- 目标模型名称（如 `qwen-vl-max`）

### 任务清单

#### 1. 项目准备

- [ ] 创建 `docs/prd/v0.2.3/` 目录
- [ ] 创建 PRD / Design / Plan 文档

#### 2. 上传模块开发

- [ ] 创建 `src/api/dashscope-upload.ts`
  - [ ] 定义类型接口（`UploadPolicy`, `UploadOptions`, `UploadResult`）
  - [ ] 实现 `getUploadPolicy()` - 获取上传凭证
  - [ ] 实现 `uploadFileToOSS()` - 表单上传文件
  - [ ] 实现 `uploadToDashScope()` - 主函数（含进度回调）
  - [ ] 实现 `validateFile()` - 文件验证
  - [ ] 实现 `formatFileSize()` - 文件大小格式化

#### 3. 修改现有上传接口

- [ ] 修改 `src/api/temporaryFile.ts`
  - [ ] 保留接口兼容（`TemporaryFileResponse`, `UploadProgressCallback`）
  - [ ] 改为调用 `uploadToDashScope()`
  - [ ] 添加新函数用于提交时上传（非选择时上传）

#### 4. 修改状态管理

- [ ] 修改 `src/composables/useVideoAnalysis.ts`
  - [ ] 分离 `videoFile`（本地文件）和 `videoUrl`（OSS URL）
  - [ ] 修改 `localVideoUrl` 使用本地 blob URL
  - [ ] 移除文件选择时的自动上传逻辑
  - [ ] 添加提交时的上传逻辑
  - [ ] 图片上传同理修改

#### 5. 修改提交逻辑

- [ ] 修改分析提交函数
  - [ ] 检查 `videoUrl` 是否存在，不存在则先上传
  - [ ] 上传完成后使用 `oss://` URL 调用 AI

#### 6. 测试上传功能

- [ ] 测试视频上传（10MB）
- [ ] 测试视频上传（50MB）
- [ ] 测试图片上传
- [ ] 测试上传进度回调
- [ ] 测试错误处理（网络失败、文件过大等）

### 验收标准

- [ ] 选择文件后本地预览正常（使用本地 URL）
- [ ] 提交时才触发上传
- [ ] 视频上传成功并返回 `oss://` URL
- [ ] 图片上传成功并返回 `oss://` URL
- [ ] 上传进度显示正常
- [ ] 文件验证正常（格式、大小）
- [ ] 切换模型后重新上传（文件与模型绑定）

---

## v0.2.3-beta：API 调用适配 + 旧代码清理

### 阶段目标

完成 AI API 调用的 Header 适配，清理旧 OSS 代码。

### 任务清单

#### 1. API 调用适配

- [ ] 修改 `src/lib/openai-client.ts`
  - [ ] 在 `streamChat()` 函数添加 `X-DashScope-OssResourceResolve: enable` Header
  - [ ] 在 `chat()` 函数添加 `X-DashScope-OssResourceResolve: enable` Header
  - [ ] 添加错误识别逻辑（`InvalidParameter.DataInspection`）

#### 2. 测试分析功能

- [ ] 测试视频分析（使用 `oss://` URL）
  - [ ] 正常分析流程
  - [ ] 思考模式
  - [ ] 流式输出
- [ ] 测试图片分析（使用 `oss://` URL）
- [ ] 测试错误处理（缺少 Header 的场景）

#### 3. 旧代码清理

- [ ] 删除 `api/oss-sts.ts` 文件
- [ ] 更新 `package.json` - 移除 `ali-oss` 依赖
- [ ] 运行 `npm uninstall ali-oss`
- [ ] 更新 `package-lock.json`

#### 4. 环境变量清理

- [ ] 更新 `.env.example`
  - [ ] 移除 `VITE_ALIYUN_OSS_REGION`
  - [ ] 移除 `VITE_ALIYUN_OSS_BUCKET`
  - [ ] 移除 `VITE_ALIYUN_ACCESS_KEY_ID`
  - [ ] 移除 `VITE_ALIYUN_ACCESS_KEY_SECRET`
- [ ] 更新本地 `.env` 文件
- [ ] 更新 Vercel 环境变量（生产环境）
  - [ ] 移除 `ALIYUN_ROLE_ARN`

#### 5. 文档更新

- [ ] 更新 `CLAUDE.md`
  - [ ] 更新"业务依赖"表格（移除 `ali-oss`）
  - [ ] 更新"项目架构"说明（移除 OSS 相关）
  - [ ] 更新"AI 提供商架构"说明（添加临时存储说明）
- [ ] 更新 `README.md`（如有需要）

### 验收标准

- [ ] 视频分析正常（使用 `oss://` URL）
- [ ] 图片分析正常（使用 `oss://` URL）
- [ ] `ali-oss` 依赖已移除
- [ ] `api/oss-sts.ts` 已删除
- [ ] `npm run build` 通过

---

## v0.2.3-stable：验证与发布

### 阶段目标

完成全量功能验证，准备版本发布。

### 任务清单

#### 1. 全量功能验证

- [ ] 视频上传 + 分析（完整流程）
- [ ] 图片上传 + 分析
- [ ] 思考模式
- [ ] 流式输出
- [ ] 收藏功能
- [ ] 导出功能
- [ ] 登录/注册
- [ ] 路由切换

#### 2. 部署验证

- [ ] 本地构建通过 `npm run build`
- [ ] Vercel 预览部署成功
- [ ] 线上功能验证

#### 3. 版本发布

- [ ] 更新 `package.json` 版本号 `0.2.3`
- [ ] 创建 Git 标签 `v0.2.3`
- [ ] 更新 CHANGELOG
- [ ] 合并到 main 分支
- [ ] 生产环境部署

### 验收标准

- [ ] 所有核心功能正常工作
- [ ] Vercel 部署成功
- [ ] 线上验证通过

---

## 环境变量清单

### 开发环境 `.env`

```env
# Supabase（保留）
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# 阿里云百炼（保留）
VITE_DASHSCOPE_API_KEY=sk-xxx

# OSS 相关变量（移除）
# VITE_ALIYUN_OSS_REGION=oss-cn-beijing
# VITE_ALIYUN_OSS_BUCKET=xxx
# VITE_ALIYUN_ACCESS_KEY_ID=xxx
# VITE_ALIYUN_ACCESS_KEY_SECRET=xxx
```

### Vercel 生产环境

| 变量 | 操作 | 说明 |
|------|------|------|
| `VITE_SUPABASE_URL` | 保留 | Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | 保留 | Supabase Key |
| `VITE_DASHSCOPE_API_KEY` | 保留 | 百炼 API Key |
| `ALIYUN_ROLE_ARN` | **删除** | 不再需要 STS |

---

## 文件变更清单

### 新建文件

| 文件 | 说明 |
|------|------|
| `src/api/dashscope-upload.ts` | 百炼临时存储上传封装 |
| `docs/prd/v0.2.3/prd.md` | PRD 文档 |
| `docs/prd/v0.2.3/design.md` | 设计文档 |
| `docs/prd/v0.2.3/plan.md` | 开发计划 |

### 修改文件

| 文件 | 说明 |
|------|------|
| `src/lib/openai-client.ts` | 添加 `X-DashScope-OssResourceResolve` Header |
| `src/api/temporaryFile.ts` | 改为调用 `dashscope-upload.ts` |
| `package.json` | 移除 `ali-oss` 依赖 |
| `CLAUDE.md` | 更新存储方案说明 |
| `.env.example` | 移除 OSS 相关环境变量 |

### 删除文件

| 文件 | 说明 |
|------|------|
| `api/oss-sts.ts` | Vercel Serverless Function（STS 凭证） |

---

## 里程碑

```
[ ] v0.2.3-alpha  ──  上传模块重构完成
[ ] v0.2.3-beta   ──  API 适配 + 旧代码清理完成
[ ] v0.2.3-stable ──  验证完成，版本发布
```

---

## 新增模块清单

| 模块 | 路径 | 功能 |
|------|------|------|
| dashscope-upload | `src/api/dashscope-upload.ts` | 百炼临时存储上传 |

---

## 回归测试清单

### 核心功能

- [ ] 视频上传
- [ ] 视频分析
- [ ] 图片上传
- [ ] 图片分析
- [ ] 思考模式
- [ ] 流式输出
- [ ] 收藏功能
- [ ] 导出功能

### 用户功能

- [ ] 邮箱注册/登录
- [ ] GitHub OAuth 登录
- [ ] 个人中心
- [ ] 收藏列表

### 部署

- [ ] 本地构建
- [ ] Vercel 部署
- [ ] 线上验证