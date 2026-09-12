import { prisma } from "./db";

export class CustomerUserError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export type ManagedUserInput = {
  name: string;
  contact: string | null;
  note: string | null;
  enabled?: boolean;
};

/** 新增终端用户；客户归属由调用方的已认证上下文提供。 */
export async function createManagedUser(customerId: string, input: ManagedUserInput) {
  if (!input.name) throw new CustomerUserError("请填写用户姓名", 400);
  const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } });
  if (!customer) throw new CustomerUserError("未找到该客户", 404);
  return prisma.customerManagedUser.create({
    data: {
      customerId,
      name: input.name,
      contact: input.contact,
      note: input.note,
      enabled: input.enabled !== false,
    },
  });
}

/** 编辑或启停终端用户；不提供硬删除，以保留现有分配关系。 */
export async function updateManagedUser(customerId: string, userId: string, input: ManagedUserInput) {
  if (!input.name) throw new CustomerUserError("请填写用户姓名", 400);
  const existing = await prisma.customerManagedUser.findFirst({ where: { id: userId, customerId } });
  if (!existing) throw new CustomerUserError("未找到该终端用户", 404);
  return prisma.customerManagedUser.update({
    where: { id: userId },
    data: {
      name: input.name,
      contact: input.contact,
      note: input.note,
      enabled: input.enabled !== false,
    },
  });
}

/** 建立当前节点分配，同时集中校验租户、用户、节点和 VPS 可用状态。 */
export async function assignNode(customerId: string, userId: string, nodeId: string) {
  const [user, node] = await Promise.all([
    prisma.customerManagedUser.findFirst({ where: { id: userId, customerId } }),
    prisma.vpnNode.findFirst({
      where: { id: nodeId, vps: { customerId } },
      include: { vps: { select: { status: true } } },
    }),
  ]);
  if (!user || !node) throw new CustomerUserError("未找到终端用户或 VPN 节点", 404);
  if (!user.enabled) throw new CustomerUserError("已停用的终端用户不能新增节点", 409);
  if (!node.enabled) throw new CustomerUserError("已禁用的 VPN 节点不能分配", 409);
  if (node.vps.status !== "active") throw new CustomerUserError("已下线服务器的节点不能分配", 409);

  const existing = await prisma.vpnNodeAssignment.findUnique({
    where: { managedUserId_vpnNodeId: { managedUserId: userId, vpnNodeId: nodeId } },
  });
  if (existing) throw new CustomerUserError("该节点已经分配给此用户", 409);

  return prisma.vpnNodeAssignment.create({ data: { managedUserId: userId, vpnNodeId: nodeId } });
}

/** 解除当前分配；即使用户或节点已不可用也允许清理。 */
export async function unassignNode(customerId: string, userId: string, nodeId: string) {
  const assignment = await prisma.vpnNodeAssignment.findFirst({
    where: {
      managedUserId: userId,
      vpnNodeId: nodeId,
      managedUser: { customerId },
      vpnNode: { vps: { customerId } },
    },
  });
  if (!assignment) throw new CustomerUserError("未找到该节点分配", 404);
  await prisma.vpnNodeAssignment.delete({
    where: { managedUserId_vpnNodeId: { managedUserId: userId, vpnNodeId: nodeId } },
  });
}
