import { formatDate } from "@/lib/dates";

export type VpsFormData = {
  id?: string;
  name: string;
  customerId: string;
  providerId: string;
  cpu: string;
  ram: string;
  disk: string;
  bandwidth: string;
  region: string;
  ipAddress: string;
  os: string;
  purchaseDate: string; // YYYY-MM-DD
  expiryDate: string;
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
    cpu: v.cpu ?? "",
    ram: v.ram ?? "",
    disk: v.disk ?? "",
    bandwidth: v.bandwidth ?? "",
    region: v.region ?? "",
    ipAddress: v.ipAddress ?? "",
    os: v.os ?? "",
    purchaseDate: formatDate(v.purchaseDate),
    expiryDate: formatDate(v.expiryDate),
    purchaseCostUsd: String(v.purchaseCostUsd ?? 0),
    purchasePaidCny: String(v.purchasePaidCny ?? 0),
    paymentProof: v.paymentProof ?? "",
    status: v.status ?? "active",
    notes: v.notes ?? "",
  };
}
