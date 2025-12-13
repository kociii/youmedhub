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
*   **Database**: SQLite (轻量级，易于部署)
*   **ORM**: SQLAlchemy (Async) + Pydantic (Schema Validation)
*   **Authentication**: OAuth2 with Password (Bearer JWT)
*   **AI Integration**: OpenAI SDK / LangChain (适配多模型)
*   **File Handling**: `python-multipart` (上传), `aiofiles`
*   **External Upload Service**: `tmpfile.link`
    *   **Endpoint**: `https://tmpfile.link/api/upload`
    *   **Method**: `POST`
    *   **Format**: `multipart/form-data` (field: `file`)
    *   **Response**: JSON (`downloadLink` used for analysis)
    *   **Limit**: Max 100MB per file (Anonymous), 7 days retention.

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
*   `POST /upload`: 上传视频文件 (独立接口)
    *   Input: `file` (Multipart)
    *   Output: `{ "url": "...", "meta": {...} }`
*   `POST /estimate`: 预估视频消耗点数 (参数: duration)
*   `POST /create`: 创建分析任务
    *   Input: `{ "video_url": "...", "model": "...", "prompt": "..." }`
    *   Process: 扣费 -> 启动异步任务
*   `GET /tasks`: 获取任务列表 (历史记录)
*   `GET /tasks/{id}`: 获取特定任务详情及结果

### 3.4 System (`/api/system`)
*   `GET /config`: 获取公开配置 (如费率)
*   `POST /config`: 修改系统配置 (Admin only)

## 4. 版本计划 (Roadmap)

### v0.1 (Frontend MVP & Mock)
*   **策略**: **Frontend First**。优先搭建前端界面与交互，使用 Mock 数据模拟后端响应。
*   **功能**:
    *   界面搭建：三栏布局，中栏上传/播放切换，右栏表格。
    *   交互实现：视频上传预览，表格 Hover 视频片段预览。
    *   Mock Data：模拟 `/upload` 返回 URL，模拟 `/create` 返回分析结果脚本。

### v0.2 (Backend Integration)
*   **策略**: 实现后端 API 并替换 Mock 数据。
*   **功能**:
    *   集成 `tmpfile.link` 实现真实上传。
    *   集成 OpenAI SDK 实现真实视频分析。
    *   数据库持久化。

### v0.5 (User System)
*   **目标**: 支持多用户与数据隔离。
*   **功能**:
    *   完整的注册/登录流程。
    *   数据库持久化用户信息。
    *   历史记录功能。

### v1.0 (Credits & Commercial)
*   **目标**: 引入权益系统，完成商业化闭环。
*   **功能**:
    *   点数系统 (Credits) 实现。
    *   邀请机制。
    *   后台管理配置。
    *   导出 Excel 功能。
