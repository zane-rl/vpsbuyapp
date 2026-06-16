#!/usr/bin/env bash
# 一键更新脚本（在已部署的项目根目录执行）：
#   拉取最新代码 → 装依赖 → 应用数据库迁移 → 构建 → 重启服务
# 用法：
#   cd ~/vpsbuyapp && bash deploy/update.sh
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> 1/5 拉取最新代码"
git pull

echo "==> 2/5 同步依赖"
npm ci

echo "==> 3/5 应用数据库迁移"
npx prisma migrate deploy

echo "==> 4/5 生产构建"
npm run build

echo "==> 5/5 重启服务"
if command -v pm2 >/dev/null 2>&1 && pm2 describe vpsbuyapp >/dev/null 2>&1; then
  pm2 restart vpsbuyapp
  echo "✅ 已通过 pm2 重启 vpsbuyapp"
elif systemctl list-unit-files 2>/dev/null | grep -q '^vpsbuyapp\.service'; then
  sudo systemctl restart vpsbuyapp
  echo "✅ 已通过 systemd 重启 vpsbuyapp"
else
  echo "⚠️ 未检测到 pm2 的 vpsbuyapp 进程或 systemd 单元，请手动启动：npm run start"
fi

echo "完成。验证： curl -I http://localhost:\${PORT:-3000}/login"
