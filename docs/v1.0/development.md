# 开发文档 (Development Docs) - 析见 (YouMedHub)

## 1. 技术栈 (Tech Stack)

### 1.1 前端 (Frontend)
*   **Framework**: Vue 3 (Composition API)
*   **Language**: TypeScript
*   **Build Tool**: Vite
*   **State Management**: Pinia (用于管理 User Auth, Credits, Analysis Tasks)
*   **Styling**: Tailwind CSS
*   **UI Components**: Shadcn-vue / Ai-elements-vue
*   **HTTP Client**: Axios / Fetch
*   **Video Player**: Video.js 或原生 HTML5 Video API (需封装组件以支持 seekTo 功能)

### 1.2 后端 (Backend)
*   **Framework**: FastAPI (Python 3.10+)
*   **Database**: PostgreSQL
*   **ORM**: SQLAlchemy (Async) + Pydantic (Schema Validation)
*   **Authentication**: OAuth2 with Password (Bearer JWT)
*   **AI Integration**: OpenAI SDK / LangChain (适配多模型)
*   **File Handling**: `python-multipart` (上传), `aiofiles`
*   **File Upload**: 阿里云 OSS 直传
    *   **Method**: 前端直传（使用 STS 临时凭证）
    *   **Flow**:
        1. 前端请求 `GET /oss/sts-token` 获取临时凭证
        2. 前端使用 OSS SDK 直传文件到阿里云 OSS
        3. 获得文件 URL 后调用分析接口
    *   **Advantages**:
        - 减轻后端压力
        - 上传速度更快
        - 支持更大文件
        - 文件存储更可靠

## 2. 数据库设计 (Database Schema)

### 2.1 Users Table (`users`)
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | Integer (PK) | 用户ID |
| `username` | String | 用户名 (Unique) |
| `email` | String | 邮箱 (Unique, Optional) |
| `hashed_password` | String | 加密密码 |
| `credits` | Integer | 当前剩余点数 (Default: 0) |
| `invite_code` | String | 专属邀请码 (Unique) |
| `invited_by` | Integer (FK) | 邀请人ID (Nullable) |
| `created_at` | DateTime | 注册时间 |

### 2.2 Credit Logs Table (`credit_logs`)
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | Integer (PK) | 日志ID |
| `user_id` | Integer (FK) | 关联用户 |
| `type` | Enum | 类型: `register`, `invite`, `recharge`, `consume` |
| `amount` | Integer | 变动数量 (+/-) |
| `description` | String | 描述 (e.g., "分析视频消耗", "邀请奖励") |
| `created_at` | DateTime | 发生时间 |

### 2.3 Analysis Records Table (`analysis_records`)
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | Integer (PK) | 记录ID |
| `user_id` | Integer (FK) | 关联用户 |
| `video_url` | String | 视频链接 (tmpfile.link) |
| `video_meta` | JSON | 视频元数据 (时长, 大小, 文件名) |
| `script_result` | JSON | AI生成的脚本数据 (List of Scenes) |
| `status` | Enum | `pending`, `processing`, `completed`, `failed` |
| `cost` | Integer | 实际消耗点数 |
| `created_at` | DateTime | 创建时间 |

### 2.4 System Configs Table (`system_configs`)
| Column | Type | Description |
| :--- | :--- | :--- |
| `key` | String (PK) | 配置键 (e.g., `AI_PROVIDER`, `AI_API_KEY`) |
| `value` | String | 配置值 |

## 3. API 接口规划 (API Endpoints)

### 3.1 Auth (`/api/auth`)
*   `POST /register`: 注册 (参数: username, password, invite_code)
*   `POST /login`: 登录 (返回 Access Token)
*   `GET /me`: 获取当前用户信息 (含 credits)

### 3.2 Credits (`/api/credits`)
*   `GET /logs`: 获取点数变动记录
*   `POST /recharge`: 模拟充值 (Admin/Dev only for MVP)

### 3.3 Analysis (`/api/analysis`)
*   `POST /stream`: 流式分析视频 ✅
    *   Input: `{ "video_url": "...", "model_id": "...", "enable_thinking": false }`
    *   Output: SSE 流式响应 `data: {"type": "content|thinking|done", "data": "..."}`
*   `POST /upload`: 上传视频文件 (已废弃，改用 OSS 直传)
*   `POST /estimate`: 预估视频消耗点数 (参数: duration)
*   `GET /tasks`: 获取任务列表 (历史记录)
*   `GET /tasks/{id}`: 获取特定任务详情及结果

### 3.4 OSS (`/oss`)
*   `GET /sts-token`: 获取 OSS STS 临时凭证 ✅
    *   Output: `{ "accessKeyId": "...", "accessKeySecret": "...", "securityToken": "...", "bucket": "...", "region": "..." }`

### 3.5 System (`/api/system`)
*   `GET /config`: 获取公开配置 (如费率)
*   `POST /config`: 修改系统配置 (Admin only)

## 4. 版本计划 (Roadmap)

### v0.1 (Frontend MVP & Mock)
*   **策略**: **Frontend First**。优先搭建前端界面与交互，使用 Mock 数据模拟后端响应。
*   **功能**:
    *   界面搭建：三栏布局，中栏上传/播放切换，右栏表格。
    *   交互实现：视频上传预览，表格 Hover 视频片段预览。
    *   Mock Data：模拟 `/upload` 返回 URL，模拟 `/create` 返回分析结果脚本。

### v0.2 (Backend Integration) ✅
*   **策略**: 实现后端 API 并替换 Mock 数据。
*   **功能**:
    *   ✅ 集成阿里云 OSS 实现文件上传（替代 tmpfile.link）
    *   ✅ 集成智谱、阿里云、OpenAI 多模型支持
    *   ✅ 实现流式分析接口
    *   ✅ 统一 AI 提供者架构

### v0.3 (User System)
*   **目标**: 实现用户注册/登录系统。
*   **功能**:
    *   数据库设计与实现（PostgreSQL + SQLAlchemy）
    *   用户注册接口
    *   用户登录接口（JWT 认证）
    *   用户信息查询接口
    *   前端注册/登录页面
    *   路由守卫和状态管理

### v0.4 (Task Management)
*   **目标**: 实现任务持久化和历史记录。
*   **功能**:
    *   分析任务数据表设计
    *   任务列表和详情接口
    *   历史记录查询
    *   数据隔离（按用户）

### v1.0 (Credits & Commercial)
*   **目标**: 引入权益系统，完成商业化闭环。
*   **功能**:
    *   点数系统 (Credits) 实现。
    *   邀请机制。
    *   后台管理配置。
    *   导出 Excel 功能。
