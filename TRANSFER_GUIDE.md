# 换电脑打开说明

## 需要准备

- Node.js 22.13 或更高版本
- npm（安装 Node.js 时会自带）

## 打开项目

1. 解压 ZIP 文件。
2. 使用终端进入解压后的 `fitness-app` 文件夹。
3. 安装依赖：

   ```bash
   npm install
   ```

4. 复制环境变量示例：

   macOS / Linux：

   ```bash
   cp .env.example .env.local
   ```

   Windows PowerShell：

   ```powershell
   Copy-Item .env.example .env.local
   ```

5. 打开 `.env.local`，填写 Supabase publishable/anon key。详细步骤见 `SUPABASE_SETUP.md`。
6. 启动应用：

   ```bash
   npm run dev
   ```

7. 浏览器打开终端中显示的本地地址。

## 检查项目

```bash
npm test
```

ZIP 不包含 `node_modules`、构建缓存、Git 历史或本机环境变量；这些内容无需迁移，依赖会由 `npm install` 重新生成。
