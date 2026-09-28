import { prisma } from "@/lib/prisma";

/** Generate next order number for a store, e.g. SP-0001 */
export async function generateOrderNumber(storeId: string): Promise<string> {
  const count = await prisma.order.count({ where: { storeId } });
  const next = count + 1;
  return `SP-${String(next).padStart(4, "0")}`;
}
