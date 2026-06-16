import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  // 清空（仅用于演示初始化）
  await prisma.vpnNode.deleteMany();
  await prisma.vpsRenewal.deleteMany();
  await prisma.vpsServer.deleteMany();
  await prisma.customerPayment.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.provider.deleteMany();

  // 提供商
  const [vultr, bwg, doProvider] = await Promise.all([
    prisma.provider.create({ data: { name: "Vultr" } }),
    prisma.provider.create({ data: { name: "搬瓦工 BandwagonHost" } }),
    prisma.provider.create({ data: { name: "DigitalOcean" } }),
  ]);

  // 客户
  const customerA = await prisma.customer.create({ data: { name: "客户A", note: "长期合作" } });
  const customerB = await prisma.customer.create({ data: { name: "客户B" } });

  // 客户A：两台 VPS（统一付款场景）
  const v1 = await prisma.vpsServer.create({
    data: {
      name: "香港-01",
      customerId: customerA.id,
      providerId: vultr.id,
      cpu: "1 vCPU",
      ram: "1 GB",
      disk: "25 GB SSD",
      bandwidth: "2 TB/月",
      region: "香港",
      ipAddress: "203.0.113.10",
      os: "Ubuntu 24.04",
      purchaseDate: daysFromNow(-25),
      expiryDate: daysFromNow(35),
      purchaseCostUsd: 6,
      purchasePaidCny: 44,
      status: "active",
      notes: "搭建 SS + V2Ray",
      vpnNodes: {
        create: [
          { name: "HK-SS-01", protocol: "Shadowsocks", address: "203.0.113.10", port: 8388, config: "加密: aes-256-gcm", subscribeUrl: "https://sub.example.com/s/hk-ss-01" },
          { name: "HK-V2Ray-01", protocol: "V2Ray", address: "hk1.example.com", port: 443, config: "ws + tls, path: /ray", subscribeUrl: "https://sub.example.com/s/hk-v2ray-01" },
        ],
      },
    },
  });

  await prisma.vpsServer.create({
    data: {
      name: "日本-01",
      customerId: customerA.id,
      providerId: bwg.id,
      cpu: "2 vCPU",
      ram: "2 GB",
      disk: "40 GB SSD",
      bandwidth: "1 TB/月",
      region: "日本东京",
      ipAddress: "203.0.113.20",
      os: "Debian 12",
      purchaseDate: daysFromNow(-360),
      expiryDate: daysFromNow(5),
      purchaseCostUsd: 49.99,
      purchasePaidCny: 360,
      status: "active",
      notes: "年付套餐，临近到期需提醒续费",
      vpnNodes: {
        create: [{ name: "JP-Trojan-01", protocol: "Trojan", address: "jp1.example.com", port: 443 }],
      },
    },
  });

  // 客户A 的续费记录（针对香港-01）
  await prisma.vpsRenewal.create({
    data: {
      vpsId: v1.id,
      previousExpiry: daysFromNow(5),
      newExpiry: daysFromNow(35),
      costUsd: 6,
      paidCny: 44,
      notes: "月付续费 1 个月",
    },
  });

  // 客户A 的统一收款（两笔）
  await prisma.customerPayment.createMany({
    data: [
      { customerId: customerA.id, amountCny: 500, payDate: daysFromNow(-20), note: "首次统一付款（覆盖香港-01、日本-01）" },
      { customerId: customerA.id, amountCny: 80, payDate: daysFromNow(-2), note: "续费付款" },
    ],
  });

  // 客户B：一台已过期 VPS
  await prisma.vpsServer.create({
    data: {
      name: "美国-01",
      customerId: customerB.id,
      providerId: doProvider.id,
      cpu: "1 vCPU",
      ram: "1 GB",
      disk: "25 GB SSD",
      bandwidth: "1 TB/月",
      region: "美国旧金山",
      ipAddress: "203.0.113.30",
      os: "Ubuntu 22.04",
      purchaseDate: daysFromNow(-400),
      expiryDate: daysFromNow(-10),
      purchaseCostUsd: 6,
      purchasePaidCny: 43,
      status: "stopped",
      notes: "已过期，等待客户确认是否续费",
    },
  });

  await prisma.customerPayment.create({
    data: { customerId: customerB.id, amountCny: 70, payDate: daysFromNow(-390), note: "首次付款" },
  });

  // 客户A：一台自动续费 VPS（按小时扣费，无固定到期，余额由客户级共享充值）
  await prisma.vpsServer.create({
    data: {
      name: "新加坡-按量-01",
      customerId: customerA.id,
      providerId: vultr.id,
      billingType: "auto",
      autoCycle: "hourly",
      cyclePriceUsd: 0.018,
      cpu: "1 vCPU",
      ram: "1 GB",
      disk: "25 GB SSD",
      bandwidth: "按量计费",
      region: "新加坡",
      ipAddress: "203.0.113.40",
      os: "Ubuntu 24.04",
      purchaseDate: daysFromNow(-15),
      expiryDate: null,
      purchaseCostUsd: 10,
      purchasePaidCny: 72,
      status: "active",
      notes: "按小时自动续费，余额不足会停机",
    },
  });

  // 客户A：客户级充值（共享给名下自动续费 VPS），当前余额取最近一条 balanceAfter
  await prisma.customerRecharge.createMany({
    data: [
      { customerId: customerA.id, amountUsd: 10, paidCny: 72, balanceAfter: 10, rechargeDate: daysFromNow(-15), note: "首次充值" },
      { customerId: customerA.id, amountUsd: 5, paidCny: 36, balanceAfter: 12.5, rechargeDate: daysFromNow(-2), note: "补充余额" },
    ],
  });

  console.log("✅ 种子数据已写入");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
