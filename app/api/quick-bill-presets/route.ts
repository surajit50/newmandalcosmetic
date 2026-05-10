import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET – fetch all presets (used by POS)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const presets = await prisma.quickBillPreset.findMany({
      select: {
        id: true,
        label: true,
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(presets);
  } catch (error) {
    console.error("GET quick-bill-presets error:", error);
    return NextResponse.json({ error: "Failed to fetch presets" }, { status: 500 });
  }
}

// POST – create a new preset (admin/manager only)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { label, items } = body;

    if (!label || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Label and items (array) are required" }, { status: 400 });
    }

    const cleanedItems = items.map((item: any) => ({
      productId: String(item.productId).trim(),
      quantity: Number(item.quantity),
    }));

    for (const item of cleanedItems) {
      if (!item.productId || isNaN(item.quantity) || item.quantity <= 0) {
        return NextResponse.json({ error: "Each item must have a valid productId and quantity > 0" }, { status: 400 });
      }
    }

    const preset = await prisma.quickBillPreset.create({
      data: {
        label: label.trim(),
        items: cleanedItems,
        createdBy: session.user.id,
      },
    });

    return NextResponse.json(preset, { status: 201 });
  } catch (error) {
    console.error("POST quick-bill-presets error:", error);
    return NextResponse.json({ error: "Failed to create preset" }, { status: 500 });
  }
}

// PATCH – update an existing preset (admin/manager only)
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, label, items } = body;

    if (!id || !label || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "ID, label, and items array are required" }, { status: 400 });
    }

    const cleanedItems = items.map((item: any) => ({
      productId: String(item.productId).trim(),
      quantity: Number(item.quantity),
    }));

    for (const item of cleanedItems) {
      if (!item.productId || isNaN(item.quantity) || item.quantity <= 0) {
        return NextResponse.json({ error: "Each item must have a valid productId and quantity > 0" }, { status: 400 });
      }
    }

    const updated = await prisma.quickBillPreset.update({
      where: { id },
      data: {
        label: label.trim(),
        items: cleanedItems,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH quick-bill-presets error:", error);
    return NextResponse.json({ error: "Failed to update preset" }, { status: 500 });
  }
}

// DELETE – delete a preset (admin/manager only)
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing preset ID" }, { status: 400 });

    await prisma.quickBillPreset.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE quick-bill-presets error:", error);
    return NextResponse.json({ error: "Failed to delete preset" }, { status: 500 });
  }
}
