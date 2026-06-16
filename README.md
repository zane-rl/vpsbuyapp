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

> 说明：Prisma CLI 只读取根目录的 `.env`（仅需 `DATABASE_URL`）；应用运行时的密钥放 `.env.local`（开发）或 systemd / `.env.production`（生产）。

## 部署到 Ubuntu 24.04

```bash
# 1. 安装 Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. 拉取代码到 /opt/vpsbuyapp 并安装依赖
cd /opt/vpsbuyapp
npm ci

# 3. 配置环境变量（任选其一）
#    a) 写入 systemd 单元的 Environment=（见 deploy/vpsbuyapp.service）
#    b) 新建 .env.production 并在 service 里用 EnvironmentFile= 引用
echo 'DATABASE_URL="file:./prod.db"' > .env       # 供 Prisma CLI 使用

# 4. 迁移数据库并构建
npx prisma migrate deploy
npm run build

# 5. 配置进程守护（systemd）
sudo cp deploy/vpsbuyapp.service /etc/systemd/system/
sudo nano /etc/systemd/system/vpsbuyapp.service   # 修改 PORT/密码/密钥/路径
sudo systemctl daemon-reload
sudo systemctl enable --now vpsbuyapp
sudo systemctl status vpsbuyapp
```

服务将监听 `PORT` 指定端口（默认 3000）。如需对外用 80/443 + HTTPS，参考 `deploy/nginx.conf.example` 配置 Nginx 反向代理，并用 `certbot` 申请证书。

### 数据备份

数据全部存于 `DATABASE_URL` 指向的 SQLite 文件（如 `/opt/vpsbuyapp/prod.db`），定期复制该文件即可备份。

## 修改密码 / 端口

- 改密码：编辑 systemd 单元里的 `ADMIN_PASSWORD`，`systemctl restart vpsbuyapp`。
- 改端口：编辑 `PORT`，重启服务（如有 Nginx 同步修改 `proxy_pass`）。
