import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";

const customerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().toLowerCase().email().optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export async function GET(request: Request) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").toLowerCase();
  const sort = searchParams.get("sort") ?? "createdAt";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;

  const where = {
    storeId: session.user.storeId,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q, mode: "insensitive" as const } },
            { city: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      include: {
        orders: {
          select: { total: true, status: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy:
        sort === "name"
          ? { name: order }
          : sort === "email"
            ? { email: order }
            : { createdAt: order },
      skip,
      take: limit,
    }),
  ]);

  const rows = customers.map((c) => {
    const completedOrders = c.orders.filter((o) => o.status === "COMPLETED" || o.status === "PROCESSING");
    const totalSpent = completedOrders.reduce((sum, o) => sum + o.total, 0);
    const orderCount = c.orders.length;
    const lastOrderAt = c.orders.length > 0 ? c.orders[0].createdAt : null;

    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      address: c.address,
      city: c.city,
      notes: c.notes,
      createdAt: c.createdAt,
      orderCount,
      totalSpent,
      lastOrderAt,
    };
  });

  return NextResponse.json({
    customers: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: Request) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = customerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
  }

  const customer = await prisma.customer.create({
    data: {
      storeId: session.user.storeId,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      city: parsed.data.city || null,
      notes: parsed.data.notes || null,
    },
  });

  return NextResponse.json({ customer }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, ...rest } = body as { id?: string } & Record<string, unknown>;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const existing = await prisma.customer.findFirst({
    where: { id, storeId: session.user.storeId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      ...(rest.name !== undefined ? { name: String(rest.name).trim() } : {}),
      ...(rest.phone !== undefined ? { phone: rest.phone ? String(rest.phone).trim() : null } : {}),
      ...(rest.email !== undefined
        ? { email: rest.email ? String(rest.email).trim().toLowerCase() : null }
        : {}),
      ...(rest.address !== undefined
        ? { address: rest.address ? String(rest.address).trim() : null }
        : {}),
      ...(rest.city !== undefined
        ? { city: rest.city ? String(rest.city).trim() : null }
        : {}),
      ...(rest.notes !== undefined ? { notes: rest.notes ? String(rest.notes) : null } : {}),
    },
  });

  return NextResponse.json({ customer });
}

export async function DELETE(request: Request) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const existing = await prisma.customer.findFirst({
    where: { id, storeId: session.user.storeId },
    include: { _count: { select: { orders: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing._count.orders > 0) {
    return NextResponse.json(
      { error: "Cannot delete customer with order history." },
      { status: 400 }
    );
  }

  await prisma.customer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
