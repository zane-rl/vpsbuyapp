import { formatDate } from "@/lib/dates";

export type VpsFormData = {
  id?: string;
  name: string;
  customerId: string;
  providerId: string;
  billingType: string; // "term" | "auto"
  termPeriod: string; // term 购买周期 "monthly" | "quarterly" | "yearly"
  autoCycle: string; // "hourly" | "monthly" | "quarterly" | "yearly"（auto 时）
  cyclePriceUsd: string; // auto 周期费用（USD，仅展示）
  cpu: string;
  ram: string;
  disk: string;
  bandwidth: string;
  region: string;
  ipAddress: string;
  os: string;
  purchaseDate: string; // YYYY-MM-DD
  expiryDate: string; // term 必填，auto 为空
  purchaseCostUsd: string;
  purchasePaidCny: string;
  paymentProof: string;
  status: string;
  notes: string;
};

/** 把数据库记录转换为表单初始值（可在服务端组件调用） */
export function toFormData(v: any): VpsFormData {
  return {
    id: v.id,
    name: v.name ?? "",
    customerId: v.customerId ?? "",
    providerId: v.providerId ?? "",
    billingType: v.billingType ?? "term",
    termPeriod: v.termPeriod ?? "monthly",
    autoCycle: v.autoCycle ?? "monthly",
    cyclePriceUsd: v.cyclePriceUsd == null ? "" : String(v.cyclePriceUsd),
    cpu: v.cpu ?? "",
    ram: v.ram ?? "",
    disk: v.disk ?? "",
    bandwidth: v.bandwidth ?? "",
    region: v.region ?? "",
    ipAddress: v.ipAddress ?? "",
    os: v.os ?? "",
    purchaseDate: v.purchaseDate ? formatDate(v.purchaseDate) : "",
    expiryDate: v.expiryDate ? formatDate(v.expiryDate) : "",
    purchaseCostUsd: String(v.purchaseCostUsd ?? 0),
    purchasePaidCny: String(v.purchasePaidCny ?? 0),
    paymentProof: v.paymentProof ?? "",
    status: v.status ?? "active",
    notes: v.notes ?? "",
  };
}
