# YouMedHub 部署指南

## 临时文件服务 CORS 配置

本应用使用 tmpfile.link 作为临时文件存储服务，以支持大文件（最大 100MB）的视频分析。

### 开发环境

开发环境已配置 Vite 代理，无需额外设置即可正常工作。

**Vite 代理配置** ([vite.config.ts](vite.config.ts:15-23)):
```typescript
proxy: {
  '/api/tmpfile': {
    target: 'https://tmpfile.link',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/tmpfile/, '/api'),
  },
}
```

### 生产环境

生产环境需要配置反向代理来解决 CORS 跨域问题。

#### 方案 1: Nginx 反向代理（推荐）

在 Nginx 配置中添加以下内容：

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # 前端静态文件
    location / {
        root /path/to/dist;
        try_files $uri $uri/ /index.html;
    }

    # tmpfile.link API 代理
    location /api/tmpfile/ {
        proxy_pass https://tmpfile.link/api/;
        proxy_set_header Host tmpfile.link;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 允许大文件上传
        client_max_body_size 100M;

        # 超时设置
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

#### 方案 2: Node.js 后端代理

创建简单的 Express 代理服务器：

```javascript
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// 静态文件服务
app.use(express.static('dist'));

// tmpfile.link API 代理
app.use('/api/tmpfile', createProxyMiddleware({
  target: 'https://tmpfile.link',
  changeOrigin: true,
  pathRewrite: {
    '^/api/tmpfile': '/api',
  },
}));

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

#### 方案 3: Vercel/Netlify 配置

**Vercel** (`vercel.json`):
```json
{
  "rewrites": [
    {
      "source": "/api/tmpfile/:path*",
      "destination": "https://tmpfile.link/api/:path*"
    }
  ]
}
```

**Netlify** (`netlify.toml`):
```toml
[[redirects]]
  from = "/api/tmpfile/*"
  to = "https://tmpfile.link/api/:splat"
  status = 200
  force = true
```

### 备用方案

如果无法配置反向代理，应用会自动降级到以下备用方案：

1. **小文件（< 8MB）**: 使用 base64 编码直接传输
2. **大文件（> 8MB）**: 提示用户：
   - 压缩视频到 8MB 以下
   - 使用在线视频 URL 直接分析（推荐）

### 环境变量

可选配置（参见 `.env.example`）：

```bash
# DashScope API Key（可在 UI 中配置）
VITE_DASHSCOPE_API_KEY=sk-xxx
```

### 测试部署

1. 构建生产版本：
```bash
pnpm build
```

2. 预览生产构建：
```bash
pnpm preview
```

3. 测试文件上传：
   - 上传一个 10MB 以内的测试视频
   - 检查浏览器控制台确认使用正确的 API 路径
   - 验证视频分析功能正常

### 故障排查

**上传失败 - CORS 错误**
- 检查反向代理配置是否正确
- 确认 `client_max_body_size` 设置足够大
- 查看服务器错误日志

**上传失败 - 超时错误**
- 增加代理超时时间设置
- 检查网络连接质量
- 尝试使用较小的测试文件

**备用方案激活**
- 确认这是预期行为（文件小于 8MB）
- 如果需要支持大文件，必须配置反向代理

## 相关文档

- tmpfile.link 官方文档：https://tmpfile.link/index-zh
- DashScope API 文档：https://help.aliyun.com/zh/model-studio/
