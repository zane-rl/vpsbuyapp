# API 文档

所有接口返回 JSON。金额字段中 `*Usd` 为美元、`*Cny` 为人民币。日期入参接受 `YYYY-MM-DD` 或 ISO 字符串。

## 鉴权说明

- **公开接口**：`/api/public/**` 无需登录。
- **管理接口**：`/api/admin/**` 需携带登录后下发的 `vps_session` Cookie；未授权返回 `401 {"error":"未授权，请先登录"}`。
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

---

## 公开页

无公开列表 API。客户专属页 `/view/<客户ID>`（服务端组件直接读库渲染，无需登录、只读该客户数据）。裸 `/view` 重定向到登录。**已删除** `GET /api/public/vps`（曾返回所有客户 VPS）。

### GET `/api/files/{name}` — 读取上传的截图（公开）
无需登录，按文件名（不可猜的随机串 + 图片扩展名）返回图片字节。`name` 不匹配 `^[a-zA-Z0-9]+\.(png|jpg|jpeg|webp|gif)$` 或文件不存在 → `404`。供后台与客户专属页 `<img>` 引用。

## 管理 — 上传

### POST `/api/admin/upload` — 上传付款截图
鉴权保护。`multipart/form-data`，字段 `file`（图片）。仅允许 PNG/JPG/WEBP/GIF、≤5MB；保存到 `data/uploads/<随机串>.<ext>`。响应 `201 { "name": "<文件名>" }`；类型/大小不符 `400`。返回的 `name` 存入 VPS / 续费的 `paymentProof` 字段。

---

## 管理 — VPS

### GET `/api/admin/vps` — 列表
按到期时间升序，含 `_count.vpnNodes` 与 `_count.renewals`。

### POST `/api/admin/vps` — 新增
请求体（`name` / `purchaseDate` / `expiryDate` 必填，其余可选）。`customerId`/`providerId` 取自客户、提供商列表；**已无 `clientPaymentCny`**（收款改到收款台账）：
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
  "status": "active",
  "notes": "搭建 SS"
}
```
`paymentProof` 为 `POST /api/admin/upload` 返回的文件名（可选）。响应：`201` 新建对象。缺必填或日期非法返回 `400`。`PATCH /api/admin/vps/{id}` 请求体同此。续费 `POST /api/admin/vps/{id}/renew` 同理已移除 `clientPaymentCny`、可带 `paymentProof`。

**计费类型字段**：`billingType`(`term`默认 / `auto`)。
- `term`：`expiryDate` 必填（按上例）。
- `auto`：忽略 `expiryDate`（存 null）；可带 `autoCycle`(`hourly`/`monthly`默认/`yearly`)、`cyclePriceUsd`(周期费用)、`balanceAmount`(USD)。

**节点字段**：`subscribeUrl`（订阅链接，可选）。

### POST `/api/admin/vps/{id}/renew` — 续费（仅 term）
对 `auto` 类型返回 `400「自动续费类型无固定到期，请使用更新余额/充值」`。

### POST `/api/admin/vps/{id}/balance` — 更新余额/充值（仅 auto）
请求体 `{ topupUsd?, paidCny?, balanceAfter, logDate?, paymentProof?, note? }`（余额账户按 USD，另记当时实付 CNY）。事务：新增 `VpsBalanceLog` + 更新 VPS 当前余额。对 `term` 返回 `400`。其中 `paidCny` 计入总实付成本/客户结算。
### DELETE `/api/admin/balance-logs/{id}` — 删除余额/充值记录
仅删历史，不改当前余额。

### GET `/api/admin/vps/{id}` — 详情
含 `renewals`（按续费时间倒序）与 `vpnNodes`（按创建时间正序）。不存在返回 `404`。

### PATCH `/api/admin/vps/{id}` — 编辑
请求体同 POST，全量字段。返回 `200` 更新后对象。

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
  "clientPaymentCny": 80,
  "notes": "月付续费"
}
```
行为：新增一条续费记录并把该 VPS 的 `expiryDate` 更新为 `newExpiry`（同一事务），状态置为 `active`。
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
- `GET /api/admin/customers/{id}` — 详情（含名下 VPS、收款记录）
- `PATCH /api/admin/customers/{id}` — 编辑 `{ name, note? }`
- `DELETE /api/admin/customers/{id}` — 删除（收款级联删，名下 VPS customerId 置空）

## 管理 — 收款记录

- `POST /api/admin/payments` — 新增 `{ customerId, amountCny, payDate?, note?, paymentProof? }`（payDate 省略取当前；paymentProof 为收款截图文件名）
- `DELETE /api/admin/payments/{id}` — 删除收款记录

## 字段校验规则（`src/lib/validate.ts`）

| 规则 | 说明 |
| --- | --- |
| 字符串 | 去首尾空格；可选字符串空串归一为 `null` |
| 金额 | 非数字或负数归一为 `0` |
| 端口 | 空或非法归一为 `null` |
| 日期 | `YYYY-MM-DD` 按本地 00:00 解析；非法返回 `null`（必填项则报 400） |
| status | 仅 `stopped` 识别为停用，其余归一为 `active` |
