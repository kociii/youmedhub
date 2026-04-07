# v0.3.1 开发计划

> 项目编辑增强

---

## 已完成审查

已参考：

- `src/App.vue`
- `src/router/index.ts`
- `src/components/layout/AppLayout.vue`
- `src/components/layout/AppMenu.vue`
- `src/components/ResultToolbar.vue`

### 审查结论

- 主壳层与项目画布页应继续分离。
- 项目列表已在上版建立，本版重点增强编辑器能力。

---

## 版本目标

- 增加 `text` / `image` 节点
- 增加属性栏
- 增加撤销重做
- 接入 OSS 文件上传

---

## 任务分解

| 任务 | 状态 | 预计时间 |
|------|------|----------|
| 增加 `text` / `image` 节点 | ⏳ | 1d |
| 增加属性栏与基础表单 | ⏳ | 1d |
| 增加节点缩放与多选 | ⏳ | 1d |
| 增加撤销/重做 | ⏳ | 1d |
| 接入阿里云 OSS 文件上传与元数据回写 | ⏳ | 1d |

---

## 里程碑

- **M1**：画布支持更多节点类型
- **M2**：画布具备编辑辅助能力
- **M3**：图片等项目资源统一走阿里云 OSS
