# YouMedHub

基于 Vue 3 + Vite + TypeScript + Tailwind CSS + shadcn-vue 的现代化 Web 应用。

## 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
- **Vite 6** - 下一代前端构建工具
- **TypeScript** - JavaScript 的超集
- **Tailwind CSS** - 实用优先的 CSS 框架
- **shadcn-vue** - 高质量的 Vue 组件库

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 添加 shadcn-vue 组件

使用 shadcn-vue CLI 添加组件：

```bash
npx shadcn-vue@latest add button
npx shadcn-vue@latest add card
# ... 其他组件
```

## 项目结构

```
.
├── src/
│   ├── components/     # Vue 组件
│   │   └── ui/        # shadcn-vue 组件
│   ├── lib/           # 工具函数
│   ├── App.vue        # 根组件
│   ├── main.ts        # 应用入口
│   └── style.css      # 全局样式
├── public/            # 静态资源
├── index.html         # HTML 模板
└── vite.config.ts     # Vite 配置
```
