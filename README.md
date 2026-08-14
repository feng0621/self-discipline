# FORMA｜自律健身

每日状态驱动的自适应健身应用。FORMA 会结合睡眠、能量、酸痛、心情、可用时间和器材，为用户调整当日训练强度与时长。

## 已实现

- Supabase 邮箱密码登录、注册与 Magic Link
- 用户数据 RLS 隔离和私有进度照片 Storage
- 每日准备度评分与自适应训练建议
- 入门、进阶、强化三档训练
- 动作教学、替换、逐组计时和组间休息
- 身体数据、饮水、额外运动与训练记录云端同步
- 12 周计划、训练阶段和身体趋势界面
- Canvas 动态星空、低性能设备降级和减少动态效果支持
- 响应式移动端与 PWA 安装
- GitHub Actions 类型、Lint 和构建检查

## 技术栈

- React 19 / TypeScript
- Vinext / Vite / Cloudflare Workers
- Supabase Auth、Postgres、RLS、Storage
- 原生 Canvas 动画与 CSS 动效

## 架构

项目采用 Feature Slice 分层：路由入口位于 `app/`，认证和健身产品模块位于 `features/`，Supabase 客户端位于 `infrastructure/`，跨功能 PWA 能力位于 `shared/`。数据库访问统一经过 Fitness Repository，自适应训练规则保持为无框架依赖的纯领域函数。完整说明见 `ARCHITECTURE.md`。

视觉系统采用 Quiet Orbit 方向：高级编辑感、训练仪器精度与克制的动态轨道。设计令牌、原创图标和动效规范见 `DESIGN_SYSTEM.md`。

## 本地运行

复制环境变量：

```bash
cp .env.example .env.local
```

填写 Supabase URL 和 publishable key，然后：

```bash
pnpm install
pnpm dev
```

## 数据库

迁移文件位于 `supabase/migrations`。生产项目已经包含核心记录、自适应训练、动作库、模板、进度、成就和提醒数据结构。任何密钥都不应提交到 GitHub。

## 隐私

用户训练记录只允许本人访问。进度照片存储在私有 Bucket 中，并按用户 ID 分目录隔离。
