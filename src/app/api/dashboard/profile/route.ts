import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";

export async function GET() {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = await prisma.store.findUnique({
    where: { id: session.user.storeId },
  });

  return NextResponse.json({ store });
}

export async function PATCH(request: Request) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const store = await prisma.store.update({
    where: { id: session.user.storeId },
    data: {
      ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
      ...(body.logo !== undefined ? { logo: body.logo || null } : {}),
      ...(body.description !== undefined ? { description: body.description || null } : {}),
      ...(body.phone !== undefined ? { phone: body.phone || null } : {}),
      ...(body.email !== undefined ? { email: body.email || null } : {}),
      ...(body.address !== undefined ? { address: body.address || null } : {}),
      ...(body.city !== undefined ? { city: body.city || null } : {}),
      ...(body.currency !== undefined ? { currency: String(body.currency) } : {}),
      ...(body.taxRate !== undefined ? { taxRate: Number(body.taxRate) } : {}),
      ...(body.lowStockThreshold !== undefined
        ? { lowStockThreshold: Number(body.lowStockThreshold) }
        : {}),
    },
  });

  return NextResponse.json({ store });
}
