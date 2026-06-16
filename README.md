# VPS 采购与 VPN 节点管理系统

帮客户采购 VPS、搭建 VPN 服务的集中记录与展示工具。

## 功能

- **VPS 资产管理**：记录提供商、配置（CPU/内存/硬盘/带宽/地区/IP/系统）、购买时间、到期时间。
- **续费**：一键续费并延长到期时间，保留完整续费历史。
- **财务记录**：每笔采购/续费记录三个金额 —— 采购成本（USD）、实际付款（CNY）、客户收款（CNY）；后台自动汇总并计算利润（收款 − 实付）。
- **VPN 节点**：每台 VPS 下可记录多个节点（协议/地址/端口/配置），节点归属对应 VPS。
- **公开展示页**（无需登录）：客户可直接查看所有 VPS 的有效期（购买/到期时间、剩余天数彩色徽章）与可用 VPN 节点，**不展示任何金额**。
- **管理后台**：单管理员密码登录，进行 VPS 增删改、续费、节点管理与财务查看。

## 技术栈

Next.js 14（App Router + TypeScript）· Prisma + SQLite · Tailwind CSS。前后端一体，单进程部署。

## 本地开发

```bash
npm install
cp .env.example .env.local      # 修改 ADMIN_PASSWORD、SESSION_SECRET
# Prisma CLI 读取根目录 .env 的 DATABASE_URL（已内置 file:./dev.db）
npx prisma migrate dev          # 初始化数据库
npm run seed                    # 可选：写入示例数据
npm run dev                     # 默认 http://localhost:3000
```

- 公开页：`/`
- 管理后台：`/admin`（首次访问跳转 `/login`，输入 `ADMIN_PASSWORD`）

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | SQLite 文件路径，如 `file:./prod.db` |
| `ADMIN_PASSWORD` | 管理后台登录密码（请用强密码） |
| `SESSION_SECRET` | 会话签名密钥，建议 `openssl rand -hex 32` |
| `PORT` | 监听端口，默认 `3000`（`npm run start` 时生效） |

> 说明：根目录 `.env` 同时被 Prisma CLI 与应用读取，生产环境把四个变量都放 `.env` 即可（最简单）。开发时也可用 `.env.local` 覆盖。

## 部署到 Ubuntu（快速）

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs git
git clone https://github.com/zane-rl/vpsbuyapp.git && cd vpsbuyapp
ADMIN_PASSWORD='你的强密码' bash deploy/bootstrap.sh        # 生成 .env → 装依赖 → 迁移 → 构建
sudo npm i -g pm2 && pm2 start npm --name vpsbuyapp -- run start && pm2 save && pm2 startup
sudo ufw allow 3000/tcp || true
# 浏览器打开 http://<服务器IP>:3000/login
```

**更新到最新代码**（含数据库迁移）：`cd ~/vpsbuyapp && bash deploy/update.sh`。

完整步骤、更新、systemd、Nginx+HTTPS、备份与排查见 **[docs/06-部署文档.md](docs/06-部署文档.md)**。

> 关键顺序：`npm ci` 的 postinstall 会 `prisma generate`，依赖 `DATABASE_URL`，所以**先有 `.env` 再装依赖**（`bootstrap.sh` 已处理）。数据为 `prisma/prod.db` 与 `data/uploads/`，都需可写并备份。
