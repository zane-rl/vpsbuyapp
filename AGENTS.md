# Repository Guidelines

## 项目定位与目录结构

本项目是 VPS 代购、VPN 节点管理与客户结算工具，提供单管理员后台和独立账号登录的客户门户。技术栈为 Next.js 14 App Router、TypeScript、Prisma/SQLite 与 Tailwind CSS，采用前后端一体、单进程部署。全部界面文案使用中文。

- `src/app/`：页面、布局、交互组件和 Route Handler。
- `src/lib/`：鉴权、数据库、校验、日期、金额、计费和通知等共享逻辑。
- `prisma/`：数据模型、迁移与种子数据；`e2e/`：Playwright 测试。
- `docs/`：需求、设计、接口、开发和部署文档；`deploy/`：部署脚本及服务配置示例。
- `data/uploads/`：运行时上传文件，必须可写和备份，不得提交生成文件或 SQLite 数据库。

## 常用命令

```bash
npm run dev                        # 开发服务：http://localhost:3000
npm run build                      # 生产构建，内含 prisma generate
npm run start                      # 启动生产构建，读取 PORT
npm run seed                       # 写入示例数据
npx prisma migrate dev --name xxx  # 修改 schema 后创建并应用迁移
npx prisma migrate deploy          # 生产环境应用迁移
npx prisma studio                  # 查看或编辑数据库
npm run test:e2e                   # Playwright E2E（无头）
npm run test:e2e:ui                # Playwright UI 调试模式
npx playwright test e2e/billing.spec.ts  # 运行单个文件
npx playwright test -g "记收款"          # 按用例名过滤
npx playwright install chromium           # 首次安装浏览器内核
```

仓库没有单元测试框架和覆盖率门槛。`npm run lint` 依赖 `next lint`；未配置 ESLint 时会出现交互式提示，通常不作为验证命令。

## 环境变量与安全配置

- Prisma CLI 只读取根目录 `.env` 中的 `DATABASE_URL`，SQLite 路径相对 `prisma/`。
- 应用运行时读取 `.env.local`（开发）或 `.env`（生产），需要 `ADMIN_PASSWORD`、`SESSION_SECRET`，可选 `PORT`。两处 `DATABASE_URL` 必须一致。
- `postinstall` 会执行 `prisma generate`，因此必须先准备 `.env`，再执行 `npm ci`。从 `.env.example` 开始配置，禁止提交真实密钥。
- 未配置 `CRON_SECRET` 时，`/api/cron/expiry-notify` 返回 503。开发环境约定值为 `dev-cron-secret`。
- E2E 默认管理员密码是 `md@123456`，可通过 `ADMIN_PASSWORD` 覆盖。

## 编码风格与渲染约定

使用 strict TypeScript、两空格缩进、双引号和分号。React 组件及组件文件使用 PascalCase（如 `NotifySettings.tsx`），函数和变量使用 camelCase；遵循 `page.tsx`、`layout.tsx`、`route.ts` 等 Next.js 命名。代码注释与界面文案使用中文。

列表和详情页默认使用服务端组件，直接通过 Prisma 读库并按需声明 `export const dynamic = "force-dynamic"`。交互逻辑拆成 `"use client"` 组件，通过 `fetch` 调用 `/api/admin/*` 或 `/api/customer/*`。纯工具函数不得放入客户端模块，避免服务端导入后出现 `xxx is not a function`；参考 `src/app/admin/vps/vpsFormData.ts`。

数据库访问统一使用 `src/lib/db.ts` 的 Prisma 单例。API 入参使用 `src/lib/validate.ts` 的 `str`、`optStr`、`num`、`optNum`、`optInt`、`parseDate`。日期及到期状态使用 `src/lib/dates.ts`，其中 `vpsValidity` 统一处理 term/auto 展示；金额格式化使用 `src/lib/money.ts`。不得重复实现共享领域逻辑。

## 鉴权与路由边界

`src/lib/auth.ts` 使用 Web Crypto（`crypto.subtle`）对 Cookie 做 HMAC-SHA256 签名，兼容 Edge middleware 和 Node Route Handler。`src/middleware.ts` 分别保护管理员和客户路由：未授权 API 返回 401，页面跳转对应登录页。管理员仍只比对单个 `ADMIN_PASSWORD`；每个客户最多关联一个 `CustomerAccount`。两类会话使用不同 Cookie 并校验载荷类型，客户接口还要查库确认账号启用状态和 `sessionVersion`。登录 Cookie 仅在 HTTPS（包括 `X-Forwarded-Proto`）下设置 `Secure`，避免 HTTP 部署登录后被打回。

- `/` 重定向 `/admin`；`/view` 与 `/view/[customerId]` 均重定向 `/customer/login`。不得恢复任何免登录客户数据页。
- `/customer`、`/customer/users` 与 `/customer/vps/[id]` 只允许访问会话所属客户数据。服务器和财务只读；客户仅可修改自己的密码、终端用户及节点分配。
- 客户页面必须返回 `Cache-Control: no-store`。退出使用整页替换；`CustomerSessionGuard` 在初次加载、历史回退和 BFCache 恢复时调用 `/api/customer/auth/session` 复核会话，验证完成前不得展示缓存的客户数据。
- `/api/cron/expiry-notify` 故意不纳入 middleware，自行校验 `X-Cron-Secret` 或 `?secret=` 与 `CRON_SECRET`，供服务器 crontab 每日调用。
- `/api/files/[name]` 仅允许管理员或业务记录所属客户读取。必须同时保留业务归属反查和随机文件名正则校验；文件存放在 `data/uploads/`，而非 `public/`。

## 核心领域模型与计算口径

- **客户是结算单位**：VPS、`CustomerPayment` 收款和 `CustomerRecharge` 充值均挂客户。收款与充值是独立台账，一笔收款可覆盖多台 VPS。
- **固定期限 `term`**：具有 `expiryDate`；`termPeriod`（monthly/quarterly/yearly）用于从购买时间推算到期。续费写入 `VpsRenewal` 并更新 `expiryDate`。
- **自动续费 `auto`**：没有到期时间，依赖客户级共享余额；`autoCycle` 和 `cyclePriceUsd` 仅用于估算。统一通过 `src/lib/billing.ts` 的 `parseBilling()` 解析，两类字段必须互斥置 `null`。
- **永久下线**：只能通过专用接口把 VPS 置为 `stopped` 并写入 `stoppedAt`，不提供恢复。下线服务器不能续费，也不再进入到期通知或未来日均消耗。
- **共享余额是估算值**：`estimateSharedBalance()` 以最近充值的 `balanceAfter` 为基准。运行中 auto VPS 消耗到当前时间；下线 auto VPS 只计算到 `stoppedAt`，不退回历史消耗。同一客户的运行中 auto VPS 共享耗尽日。展示必须带“估算”，统一使用 `src/app/BalanceEstimateLine.tsx`。
- **财务口径必须三处一致**：后台概览、客户详情和客户门户都按以下公式计算：总成本 USD = VPS 采购成本 + 续费成本 + 充值 `amountUsd`；总实付 CNY = VPS 实付 + 续费实付 + 充值 `paidCny`；总收款 CNY = `CustomerPayment.amountCny` 之和；差额 = 总收款 − 总实付，正值绿色、负值红色。
- **账号与终端用户分离**：`CustomerAccount` 是每客户最多一个的登录身份；`CustomerManagedUser` 是客户自行维护、不能登录的 VPN 使用者。节点分配统一通过 `VpnNodeAssignment`，跨客户资源按不存在处理。
- **弃用模型**：`VpsBalanceLog` 和 `VpsServer.balanceAmount` 仅为避免重建线上表而保留，应用层不得再引用。

## 到期通知约束

到期判断统一复用 `src/lib/notify.ts`、`daysUntil()`（term）和 `estimateSharedBalance().daysRemaining`（auto），不得另写时间或余额算法。只检查运行中的服务器。`NotifyRecipient.customerId` 有值表示客户专属收件人，无值表示全局收件人；发送时合并两类并按 `chat_id` 去重，重复时客户专属身份优先，每个客户合并为一条消息。客户收件人链接到 `/customer`，全局收件人链接到 `/admin/customers/[id]`。

`NotifyLog` 通过 `@@unique([customerId, notifyDate])` 去重；后台强制触发传入 `force`，通过 upsert 覆盖。Bot Token、提前天数和站点地址保存在 `NotifySetting` 单例行；站点地址必须显式配置，因为 localhost cron 无法推断公网域名。Telegram 使用 `parse_mode=HTML`，链接必须写成 `<a href>`，否则中文标点及后续文字可能被并入 URL。

`POST /api/admin/notify-test` 有两种行为：带 `customerId` 时调用 `sendTestNotify`，不判断到期、不写 `NotifyLog`、不要求总开关启用；不带时调用 `runExpiryNotify({ force: true })`。

## Playwright 测试规范

测试文件命名为 `*.spec.ts`，共享工具放在 `e2e/helpers.ts`。`playwright.config.ts` 固定使用 Chromium、串行单 worker，因为用例共用 SQLite；测试复用已运行的开发服务，否则自动启动。用例会真实写库，使用 `uniqueName()` 生成带时间戳名称，并在结尾自行清理。

- VPS 详情页存在多个含 `input[type="date"]` 的表单，必须先用 `page.locator("form", { hasText: ... })` 缩小定位范围。
- 详情页 URL 匹配必须排除 `/admin/vps/new`：`/\/admin\/vps\/[^/]+$/.test(u.pathname) && !u.pathname.endsWith("/new")`。
- `e2e/notify.spec.ts` 不得真实调用 Telegram：使用随机假 `chat_id`，保持推送未启用，仅验证配置和鉴权路径。
- `e2e/customer-portal.spec.ts` 覆盖首次改密、租户隔离、终端用户节点分配、跨角色令牌隔离和永久下线后关系保留。
- `e2e/offline.spec.ts` 覆盖下线时间截断余额消耗，以及下线服务器排除到期通知。
- 删除客户不会级联删除 VPS（`customerId` 为 `SetNull`）；测试清理必须先删 VPS，再删客户。

提交前先运行受影响的 spec，再运行 `npm run test:e2e`；生产相关修改还需运行 `npm run build`。

## 提交、Pull Request 与文档维护

提交信息遵循现有 `type(scope):主题`，如 `feat(notify):增加到期提醒`、`fix(view):修正合计口径`。保持提交单一职责。Pull Request 应说明改动原因和行为、关联 issue、列出验证命令；界面修改附截图。

每次功能开发必须同步更新 `docs/` 对应文档，并在 `docs/07-更新记录.md` 记录改动原因、方案、涉及代码和文档同步项。映射为：需求 → `01`，架构/设计决策 → `02`，表结构 → `03`，接口 → `04`，开发约定/排查 → `05`，部署 → `06`。功能完成后启动服务并运行完整 Playwright 回归。

生产更新统一运行 `bash deploy/update.sh`，其流程为 git pull → npm ci → migrate deploy → build → pm2/systemd 重启。
