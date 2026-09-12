# API 文档

所有接口返回 JSON。金额字段中 `*Usd` 为美元、`*Cny` 为人民币。日期入参接受 `YYYY-MM-DD` 或 ISO 字符串。

## 鉴权说明

- **管理接口**：`/api/admin/**` 需携带登录后下发的 `vps_session` Cookie；未授权返回 `401 {"error":"未授权，请先登录"}`。
- **客户接口**：`/api/customer/**` 需携带 `vps_customer_session`；客户归属只从会话读取，跨客户资源按不存在处理。
- `/view/**` 不再提供公开数据；付款凭证也要求管理员或所属客户会话。
- 浏览器内由同源 `fetch` 自动带 Cookie；命令行用 `curl -b cookie.txt`。

---

## 鉴权

### POST `/api/auth/login` — 登录
请求体：
```json
{ "password": "管理密码" }
```
响应：`200 { "ok": true }` 并下发 `vps_session` Cookie；密码错误 `401 { "error": "密码错误" }`。

### DELETE `/api/auth/login` — 退出
响应：`200 { "ok": true }`，清除 Cookie。

### POST `/api/customer/auth/login` — 客户登录
请求 `{ "username": "customer-a", "password": "..." }`。用户名大小写不敏感；成功下发独立客户 Cookie，并返回 `mustChangePassword`。账号停用或凭据错误统一返回 401。

### PATCH `/api/customer/auth/password` — 客户修改密码
请求 `{ "currentPassword": "...", "newPassword": "..." }`。新密码 8–128 字符；成功清除首次改密状态、递增会话版本并重新签发 Cookie。

### DELETE `/api/customer/auth/login` — 客户退出
清除客户 Cookie，不影响同一浏览器中的管理员会话。

---

## 客户门户与凭证

客户页面为 `/customer`、`/customer/users`、`/customer/vps/{id}`。旧 `/view` 和 `/view/{id}` 均跳转 `/customer/login`；`GET /api/public/vps` 保持删除。

### GET `/api/files/{name}` — 按归属读取上传截图
管理员可读取任何仍被业务记录引用的凭证；客户只能读取自己 VPS、续费、充值或收款记录引用的凭证。未登录、跨客户、无业务引用、非法文件名或文件不存在均返回 404。

## 管理 — 上传

### POST `/api/admin/upload` — 上传付款截图
鉴权保护。`multipart/form-data`，字段 `file`（图片）。仅允许 PNG/JPG/WEBP/GIF、≤5MB；保存到 `data/uploads/<随机串>.<ext>`。响应 `201 { "name": "<文件名>" }`；类型/大小不符 `400`。返回的 `name` 可存入 VPS、续费、充值或收款记录的 `paymentProof` 字段。

---

## 管理 — VPS

### GET `/api/admin/vps` — 列表
按到期时间升序，含 `_count.vpnNodes` 与 `_count.renewals`。

### POST `/api/admin/vps` — 新增
请求体（`name` / `customerId` / `purchaseDate` / `expiryDate` 必填，其余可选）。**`customerId` 为必填**（VPS 必须关联客户，缺失返回 `400「请选择所属客户」`）；`providerId` 取自提供商列表；**已无 `clientPaymentCny`**（收款改到收款台账）：
```json
{
  "name": "香港-01",
  "customerId": "ckCustomerId",
  "providerId": "ckProviderId",
  "cpu": "1 vCPU", "ram": "1 GB", "disk": "25 GB SSD",
  "bandwidth": "2 TB/月", "region": "香港",
  "ipAddress": "203.0.113.10", "os": "Ubuntu 24.04",
  "purchaseDate": "2026-05-21",
  "expiryDate": "2026-07-20",
  "purchaseCostUsd": 6,
  "purchasePaidCny": 44,
  "paymentProof": "ab12cd34.png",
  "notes": "搭建 SS"
}
```
`paymentProof` 为 `POST /api/admin/upload` 返回的文件名（可选）。响应：`201` 新建对象。缺必填或日期非法返回 `400`。`PATCH /api/admin/vps/{id}` 请求体同此。续费 `POST /api/admin/vps/{id}/renew` 同理已移除 `clientPaymentCny`、可带 `paymentProof`。

**计费类型字段**：`billingType`(`term`默认 / `auto`)。
- `term`：`expiryDate` 必填（按上例）；可带 `termPeriod`(`monthly`默认/`quarterly`/`yearly`，购买周期，前端按购买时间自动推算到期）。
- `auto`：忽略 `expiryDate`（存 null）；可带 `autoCycle`(`hourly`/`monthly`默认/`quarterly`/`yearly`)、`cyclePriceUsd`(周期费用，仅展示)。**余额改为客户级共享**，不再有单台 `balanceAmount`。

**节点字段**：`subscribeUrl`（订阅链接，可选）。

### POST `/api/admin/vps/{id}/renew` — 续费（仅 term）
对 `auto` 类型返回 `400`，对已永久下线服务器返回 `409`。自动续费余额改在客户页面充值。

### POST `/api/admin/vps/{id}/offline` — 永久下线
将运行中 VPS 更新为 `status=stopped` 并写入 `stoppedAt`。重复调用返回 `409`；不提供恢复接口。下线保留历史财务和分配，但停止余额未来消耗与到期提醒。

### GET `/api/admin/vps/{id}` — 详情
含 `renewals`（按续费时间倒序）与 `vpnNodes`（按创建时间正序）。不存在返回 `404`。

### PATCH `/api/admin/vps/{id}` — 编辑
请求体同 POST，全量字段，不能通过此接口修改运行状态。若 VPS 节点仍有终端用户分配，改派客户返回 `409`。

### DELETE `/api/admin/vps/{id}` — 删除
级联删除其续费记录与节点。返回 `200 { "ok": true }`。

---

## 管理 — 续费

### POST `/api/admin/vps/{id}/renew` — 续费
请求体（`newExpiry` 必填）：
```json
{
  "newExpiry": "2026-08-20",
  "renewDate": "2026-07-15",
  "costUsd": 6,
  "paidCny": 44,
  "paymentProof": "ab12cd34.png",
  "notes": "月付续费"
}
```
行为：新增一条续费记录并把该 VPS 的 `expiryDate` 更新为 `newExpiry`（同一事务）。永久下线后不能续费。
- 校验：`newExpiry` 必须晚于当前到期时间，否则 `400`。
- `renewDate` 省略时取当前时间。
响应：`201` 续费记录对象。

### DELETE `/api/admin/renewals/{id}` — 删除续费记录
仅删除该历史记录，**不改动所属 VPS 的当前到期时间**（如需调整请用 PATCH `/api/admin/vps/{id}` 修改 `expiryDate`）。返回 `200 { "ok": true }`，不存在返回 `404`。

---

## 管理 — VPN 节点

### POST `/api/admin/nodes` — 新增节点
请求体（`vpsId` / `name` / `protocol` 必填）：
```json
{
  "vpsId": "ckxxx",
  "name": "HK-SS-01",
  "protocol": "Shadowsocks",
  "address": "203.0.113.10",
  "port": 8388,
  "config": "加密: aes-256-gcm",
  "enabled": true
}
```
- `address` 留空时默认取所属 VPS 的 `ipAddress`。
- 对应 VPS 不存在返回 `404`。
响应：`201` 新建节点对象。

### PATCH `/api/admin/nodes/{id}` — 编辑节点
请求体（`name` / `protocol` 必填）同新增（不含 `vpsId`）。返回 `200`。

### DELETE `/api/admin/nodes/{id}` — 删除节点
返回 `200 { "ok": true }`，不存在返回 `404`。

---

## 管理 — 提供商

- `GET /api/admin/providers` — 列表（含 `_count.vpsServers`）
- `POST /api/admin/providers` — 新增 `{ name }`，名称唯一；重复返回 `409`
- `PATCH /api/admin/providers/{id}` — 重命名 `{ name }`
- `DELETE /api/admin/providers/{id}` — 删除（引用它的 VPS providerId 置空）

## 管理 — 客户

- `GET /api/admin/customers` — 列表（含 `_count.vpsServers / payments`）
- `POST /api/admin/customers` — 新增 `{ name, note? }`，名称唯一
- `GET /api/admin/customers/{id}` — 详情（含名下 VPS、收款记录、充值记录）
- `PATCH /api/admin/customers/{id}` — 编辑 `{ name, note? }`
- `DELETE /api/admin/customers/{id}` — 删除（账号、终端用户、分配和台账级联删除，名下 VPS customerId 置空）

### 客户登录账号

- `POST /api/admin/customers/{id}/account` — 创建 `{ username, password }`；每客户最多一个，用户名全局唯一。
- `PATCH /api/admin/customers/{id}/account` — 修改 `{ username?, enabled? }` 并使旧客户会话失效。
- `POST /api/admin/customers/{id}/account/reset-password` — `{ password }`，重置后客户再次登录必须改密。

### 终端用户与节点分配

- 管理员：`POST /api/admin/customers/{customerId}/users`、`PATCH /api/admin/customer-users/{id}`。
- 客户：`POST /api/customer/users`、`PATCH /api/customer/users/{id}`；客户归属固定取会话。
- 分配：`POST .../users/{id}/nodes`，请求 `{ nodeId }`；解除：`DELETE .../users/{id}/nodes/{nodeId}`。管理员路径使用 `/api/admin/customer-users` 前缀，客户路径使用 `/api/customer/users`。
- 新分配要求用户启用、节点启用且 VPS 运行中；重复分配返回 409。停用/禁用/下线不自动删除已有关系。

## 管理 — 收款记录

- `POST /api/admin/payments` — 新增 `{ customerId, amountCny, payDate?, note?, paymentProof? }`（payDate 省略取当前；paymentProof 为收款截图文件名）
- `PATCH /api/admin/payments/{id}` — 编辑 `{ amountCny, payDate?, note?, paymentProof? }`（payDate 省略沿用原值；不存在返回 `404`）
- `DELETE /api/admin/payments/{id}` — 删除收款记录

## 管理 — 客户充值（客户级共享余额）

- `POST /api/admin/recharges` — 新增 `{ customerId, amountUsd, paidCny?, balanceAfter?, rechargeDate?, note?, paymentProof? }`（rechargeDate 省略取当前）。`amountUsd` 计入总成本、`paidCny` 计入总实付/结算；`balanceAfter` 为充值后服务商实际余额，客户当前共享余额取最近一条。
- `PATCH /api/admin/recharges/{id}` — 编辑 `{ amountUsd, paidCny?, balanceAfter?, rechargeDate?, note?, paymentProof? }`（rechargeDate 省略沿用原值；不存在返回 `404`）
- `DELETE /api/admin/recharges/{id}` — 删除充值记录

## 管理 — 到期推送设置

- `GET /api/admin/notify-settings` — 读取设置。未初始化时返回默认值 `{ id:"default", enabled:false, botToken:null, daysAhead:5, siteBaseUrl:null }`（不落库）。
- `PUT /api/admin/notify-settings` — 保存 `{ enabled, botToken?, daysAhead, siteBaseUrl? }`（单例 upsert）。校验：
  - `daysAhead` 需在 `1~365`，否则 `400`
  - `siteBaseUrl` 需以 `http://` 或 `https://` 开头，否则 `400`
  - `enabled=true` 时 `botToken` 与 `siteBaseUrl` 必填，否则 `400`（避免启用后 cron 静默跳过）

## 管理 — 推送收件人

- `GET /api/admin/notify-recipients` — 列表。`?customerId={id}` 取该客户专属收件人；`?customerId=global` 取全局收件人；不传取全部。
- `POST /api/admin/notify-recipients` — 新增 `{ chatId, label?, customerId?, enabled? }`。
  - 带 `customerId` = 该客户专属收件人（只收自己服务器的到期提醒）；不带 = 全局收件人（收所有客户的提醒）
  - `chatId` 必须匹配 `^-?\d+$`（群组为负数），否则 `400`；同一归属下重复返回 `400`；`customerId` 指向不存在的客户返回 `400`
- `PATCH /api/admin/notify-recipients/{id}` — 编辑 `{ label?, enabled? }`（不存在返回 `404`）
- `DELETE /api/admin/notify-recipients/{id}` — 删除（不存在返回 `404`）

## 管理 — 手动触发推送

### POST `/api/admin/notify-test`

一个端点两种用途，按有无 `customerId` 区分：

- **不带 body / 不带 `customerId`**（设置页「立即检查并推送」）：走 `runExpiryNotify({ force: true })`，正常判定到期客户，**忽略当天去重**并覆盖当天的 `NotifyLog`。返回体同下方 cron 端点。
- **带 `{ customerId }`**（客户详情页「发送测试推送」）：走 `sendTestNotify(customerId)`，直接给该客户发一条测试消息。
  - **不判断是否真的到期**，**不写 `NotifyLog`**（不影响当天正式推送的去重），**不要求推送总开关已启用**（方便先测通再启用），但仍需已配置 Bot Token 与站点地址。
  - 收件人 = 该客户专属 + 全局，按 chat_id 去重。
  - 文案带 `【测试消息】` 前缀，避免客户误以为真的到期。
  - 缺配置/客户不存在/无收件人时返回 `400` 与明确的 `error` 文案。

  ```jsonc
  // 200
  { "ok": true, "customer": "客户A", "sent": 2, "failed": 0, "errors": [] }
  // 400
  { "ok": false, "error": "未配置 Bot Token，请先到设置页填写并保存", "sent": 0, "failed": 0, "errors": [] }
  ```

## 定时任务 — 到期推送

### GET/POST `/api/cron/expiry-notify`

**不在 middleware 保护范围内**（middleware 只匹配 `/admin/**` 与 `/api/admin/**`），由服务器 crontab 调用，凭 `CRON_SECRET` 自行鉴权。

| 情况 | 响应 |
| --- | --- |
| 未配置 `CRON_SECRET` 环境变量 | `503 {"error":"未配置 CRON_SECRET，端点已禁用"}` |
| secret 不匹配 | `401 {"error":"未授权"}` |
| 通过 | `200` + 执行结果 |

凭证可放请求头 `X-Cron-Secret: xxx` 或查询串 `?secret=xxx`。

执行结果结构：

```jsonc
{
  "ok": true,
  "skipped": "推送未启用",           // 仅未执行时出现（未启用/缺配置/无收件人/无到期客户/当天已推）
  "customers": 2,                    // 实际推送的客户数
  "sent": 3,                         // 成功送达的消息数
  "failed": 0,
  "results": [
    { "customer": "客户A", "detail": "香港-01 剩 3 天", "sent": 2, "failed": 0 }
  ]
}
```

**推送规则**（实现见 `src/lib/notify.ts`）：

- 判定：只处理运行中的服务器；`term` 用 `daysUntil(expiryDate) <= daysAhead`，`auto` 用 `estimateSharedBalance()` 的 `daysRemaining <= daysAhead`。
- 收件人：**该客户专属收件人 + 全局收件人**，同一 chat_id 只发一次；该客户既无专属收件人也无全局收件人时跳过。
- 消息文案：`您有服务器即将到期，详情查看{链接}，请确认并及时支付账单续费处理`。客户专属收件人使用 `/customer`，全局收件人使用 `/admin/customers/{id}`；同 chat_id 重复时客户专属身份优先。
  以 `parse_mode=HTML` 发送，链接包在 `<a href="…">…</a>` 里并关掉了预览（`disable_web_page_preview`）。
  **不能发纯文本**：Telegram 的自动链接识别遇到中文全角逗号不截断，会把 URL 后面的「，请确认并及时…」一起吞进链接，客户点开打不开。文本里的 `& < >` 需转义（`buildMessage` 已处理）。
- 按客户合并：一个客户一条消息，无论名下几台服务器到期。
- 去重：同一客户同一天只推一次（`NotifyLog` 的 `@@unique([customerId, notifyDate])`）。
- 送达：逐个 chat_id 串行调 `https://api.telegram.org/bot{token}/sendMessage`，10s 超时；单个失败不影响其余，错误汇总写入 `NotifyLog.error`。

## 字段校验规则（`src/lib/validate.ts`）

| 规则 | 说明 |
| --- | --- |
| 字符串 | 去首尾空格；可选字符串空串归一为 `null` |
| 金额 | 非数字或负数归一为 `0` |
| 端口 | 空或非法归一为 `null` |
| 日期 | `YYYY-MM-DD` 按本地 00:00 解析；非法返回 `null`（必填项则报 400） |
| VPS 状态 | 新建固定为 `active`；只能通过永久下线接口改为 `stopped` |
| 客户用户名 | NFKC 归一化后 3–64 字符，不含空白/控制字符，大小写不敏感且全局唯一 |
| 客户密码 | 8–128 字符，scrypt + 随机盐存储 |
