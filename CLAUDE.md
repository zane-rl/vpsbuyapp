# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目定位

帮客户代购 VPS、搭 VPN 节点的记录与结算工具。单管理员后台 + 按客户分享的只读公开页。Next.js 14（App Router）+ Prisma/SQLite + Tailwind，前后端一体、单进程部署。全部界面文案为中文。

## 常用命令

```bash
npm run dev                        # 开发服务 http://localhost:3000
npm run build                      # 生产构建（内含 prisma generate）
npm run seed                       # 写入示例数据
npx prisma migrate dev --name xxx  # 改 schema 后新建并应用迁移
npx prisma migrate deploy          # 生产应用迁移
npx prisma studio                  # 可视化查看数据库
npm run test:e2e                   # Playwright E2E（无头）
npm run test:e2e:ui                # UI 模式单步调试
npx playwright test e2e/billing.spec.ts                    # 跑单个文件
npx playwright test -g "记收款"                             # 按用例名过滤
npx playwright install chromium    # 首次需装浏览器内核
```

无单元测试框架；`npm run lint` 依赖 `next lint`（未配置 eslint 时会交互式提示，一般不用）。

## 环境变量的两处读取（容易踩）

- **Prisma CLI 只读根目录 `.env`**，需要 `DATABASE_URL`（路径相对 `prisma/` 目录）。
- **应用运行时**读 `.env.local`（开发）/ `.env`（生产），需要 `ADMIN_PASSWORD`、`SESSION_SECRET`、可选 `PORT`。
- 两处 `DATABASE_URL` 必须一致。`postinstall` 会跑 `prisma generate`，所以**先有 `.env` 再 `npm ci`**。
- `CRON_SECRET` 未配置时 `/api/cron/expiry-notify` 直接返回 503（推送禁用）。本地 `.env.local` 里是 `dev-cron-secret`。
- E2E 默认密码 `md@123456`（见 `e2e/helpers.ts`，可用 `ADMIN_PASSWORD` 覆盖）。

## 架构要点

**鉴权**：`src/lib/auth.ts` 用 Web Crypto（`crypto.subtle`）做 HMAC-SHA256 签名 Cookie，因此同一份代码可跑在 Edge（`src/middleware.ts`）和 Node（route handler）。`middleware.ts` 拦截 `/admin/**` 与 `/api/admin/**`：接口返 401，页面跳 `/login`。**没有用户表**，只有单个 `ADMIN_PASSWORD` 常量比对。登录 Cookie 仅在 HTTPS（含 `X-Forwarded-Proto`）时加 `Secure`，避免 HTTP 部署登录后被打回。

**路由分区**：
- `/` → 重定向 `/admin`；`/view` → 重定向 `/login`（全局公开页已移除，避免暴露所有客户）。
- `/view/[customerId]`：**唯一的公开页**，靠 cuid 不可猜作为访问控制，不在 middleware 保护范围内。它展示金额（该客户口径的成本/实付/收款/差额），与后台同一套计算逻辑。页面核心是左右并排的「付款记录」（购买 + 续费 + 充值合并台账，表尾合计 = 总实付）与「收款记录」（表尾合计 = 总收款），供客户逐笔对账 —— 改动时务必保持两张表的表尾与顶部卡片同口径。
- `/api/cron/expiry-notify`：到期推送端点，**刻意不在 middleware 匹配范围内**，自行校验 `X-Cron-Secret`（或 `?secret=`）与 `CRON_SECRET`。由服务器 crontab 每天调用。
- `/api/files/[name]`：公开读取上传截图，靠随机文件名保护，路由内用正则限制 `随机串.扩展名` 防路径穿越。上传落盘在 `data/uploads/`（非 `public/`），需可写并备份。

**渲染约定**：列表/详情页是服务端组件，直接用 Prisma 读库渲染（`export const dynamic = "force-dynamic"`）；交互部分拆成 `"use client"` 组件走 `fetch` 调 `/api/admin/*`。**纯工具函数不要放在 `"use client"` 模块里**（服务端导入会得到 `xxx is not a function`），参见 `src/app/admin/vps/vpsFormData.ts` 这种拆法。

**共享 lib**：所有 DB 访问走 `src/lib/db.ts` 的 Prisma 单例；API 入参一律用 `src/lib/validate.ts`（`str/optStr/num/optNum/optInt/parseDate`）归一化；日期与到期徽章统一用 `src/lib/dates.ts`（`vpsValidity` 统一处理 term/auto 两种计费类型的展示）；金额格式化用 `src/lib/money.ts`。

## 领域模型（读代码前先懂这几条口径）

- **客户是结算单位**。VPS 挂客户，收款（`CustomerPayment`）与充值（`CustomerRecharge`）也挂客户，各自是独立台账 —— 一笔收款可覆盖多台 VPS。
- **两种计费类型**（`VpsServer.billingType`）：
  - `term` 固定期限：有 `expiryDate`，`termPeriod`(monthly/quarterly/yearly) 用于由购买时间推算到期；续费写 `VpsRenewal` 并更新 `expiryDate`。
  - `auto` 自动续费：无到期时间，靠**客户级共享余额**；`autoCycle` + `cyclePriceUsd` 只用于估算消耗。
  - 解析入口统一在 `src/lib/billing.ts` 的 `parseBilling()`，两类字段互斥置 null。
- **共享余额是估算值**，不是账面值：`estimateSharedBalance()` = 最近一次充值的 `balanceAfter` − Σ(各 auto VPS `cyclePriceUsd / cycleDays(autoCycle)` × 自 `max(充值日, 购买日)` 起的**整天数**)。同客户多台 auto VPS 共享同一个耗尽日。展示文案必须带「估算」，统一走 `src/app/BalanceEstimateLine.tsx`。
- **财务口径**（后台概览、客户详情、公开页三处必须一致）：
  - 总成本(USD) = VPS 采购成本 + 续费成本 + 充值 `amountUsd`
  - 总实付(CNY) = VPS 实付 + 续费实付 + 充值 `paidCny`
  - 总收款(CNY) = `CustomerPayment.amountCny` 之和；**差额 = 总收款 − 总实付**（正绿负红）
- **已弃用但保留的模型**：`VpsBalanceLog` 与 `VpsServer.balanceAmount`（余额已改客户级）。保留是为了不重建线上表，**应用层不要再引用**。
- **到期推送**（`src/lib/notify.ts`）：判定复用 `daysUntil()`（term）与 `estimateSharedBalance().daysRemaining`（auto），**不要另写时间/余额计算**。收件人两层：`NotifyRecipient.customerId` 有值 = 客户专属（客户详情页配置），为空 = 全局（设置页配置）；推送取「客户专属 + 全局」按 chat_id 去重。按客户合并成一条消息。去重靠 `NotifyLog` 的 `@@unique([customerId, notifyDate])`，后台手动触发传 `force` 走 upsert 覆盖。Bot Token / 提前天数 / **站点地址**都在 `NotifySetting` 单例行里 —— 站点地址必须显式配，因为 cron 从 localhost 调用取不到公网域名。`POST /api/admin/notify-test` 一个端点两用：带 `customerId` 走 `sendTestNotify`（客户详情页的测试按钮，不判到期、不写 `NotifyLog`、不要求总开关启用），不带则走 `runExpiryNotify({force:true})`。

## E2E 注意事项

`playwright.config.ts` 串行单 worker（读写同一 SQLite），复用已运行的 dev 服务、否则自动起。用例会真实写库并在结尾自我清理，名称用 `uniqueName()` 加时间戳后缀。

- VPS 详情页有多个含 `input[type="date"]` 的表单（续费/编辑），定位必须先 `page.locator("form", { hasText: ... })` 缩小范围。
- `waitForURL` 匹配详情页要排除 `/admin/vps/new` 自身：`/\/admin\/vps\/[^/]+$/.test(u.pathname) && !u.pathname.endsWith("/new")`。
- `e2e/notify.spec.ts` **不会真的调用 Telegram**：用随机假 chat_id，且推送保持「未启用」，只验证配置与鉴权路径。新增推送相关用例时保持这一点。
- 删客户不会级联删 VPS（`customerId` 是 `SetNull`），自建数据的用例要**先删 VPS 再删客户**。

## 仓库维护约定

**每次功能开发必须同步更新 `docs/` 下对应文档，并在 `docs/07-更新记录.md` 追加一条记录**（含改动原因、方案、涉及代码、文档同步项）。对应关系：需求 → `01`，架构/设计决策 → `02`，表结构 → `03`，接口 → `04`，开发约定/排查 → `05`，部署 → `06`。

改完功能后启动服务跑一遍 Playwright 回归再交付。

生产更新用 `bash deploy/update.sh`（git pull → npm ci → migrate deploy → build → pm2/systemd 重启）。
