#!/usr/bin/env bash
# 一键部署脚本（在已 clone 的项目根目录执行）。
# 用法：
#   ADMIN_PASSWORD='你的强密码' bash deploy/bootstrap.sh
# 可选：PORT=3000  DB_FILE=prod.db
set -euo pipefail

cd "$(dirname "$0")/.."

PORT="${PORT:-3000}"
DB_FILE="${DB_FILE:-prod.db}"

# 1) 生成 .env（已存在则不覆盖）。Prisma 与应用都读取它。
if [ ! -f .env ]; then
  if [ -z "${ADMIN_PASSWORD:-}" ]; then
    echo "⚠️  未设置 ADMIN_PASSWORD 环境变量，临时用 'admin123'（请尽快改）。"
    ADMIN_PASSWORD="admin123"
  fi
  SECRET="$(openssl rand -hex 32 2>/dev/null || head -c32 /dev/urandom | xxd -p | tr -d '\n')"
  cat > .env <<EOF
DATABASE_URL="file:./${DB_FILE}"
ADMIN_PASSWORD="${ADMIN_PASSWORD}"
SESSION_SECRET="${SECRET}"
PORT=${PORT}
EOF
  echo "✅ 已生成 .env（PORT=${PORT}）"
else
  echo "ℹ️  .env 已存在，跳过生成"
fi

# 2) 安装依赖（postinstall 会 prisma generate，需要上一步的 .env）
npm ci

# 3) 应用数据库迁移
npx prisma migrate deploy

# 4) 生产构建
npm run build

echo ""
echo "✅ 部署就绪。启动方式任选其一："
echo "   前台试运行：  npm run start"
echo "   pm2 守护：    sudo npm i -g pm2 && pm2 start npm --name vpsbuyapp -- run start && pm2 save"
echo "   systemd：     见 deploy/vpsbuyapp.service"
echo ""
echo "   访问： http://<服务器IP>:${PORT}/login"
