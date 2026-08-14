# Supabase 配置

项目地址已经配置为 `https://eilcbburpfsvlxdhhodz.supabase.co`。

1. 在 Supabase 的 SQL Editor 中运行 `supabase/migrations/202608140001_initial_schema.sql`。
2. 在 Project Settings → API Keys 中复制 Publishable key（旧界面中叫 anon key）。
3. 复制 `.env.example` 为 `.env.local`，填入 Publishable key。
4. 不要把 `.env.local` 或 service role key 提交到 GitHub。

数据库包含用户资料、身体记录、正式训练、动作完成情况和额外运动五类数据，并已开启 Row Level Security，登录用户只能访问自己的记录。
