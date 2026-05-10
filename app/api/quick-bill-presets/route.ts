import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // adjust import path if needed

// GET – fetch all presets
export async function GET() {
  try {
    const presets = await prisma.quickBillPreset.findMany({
      select: {
        id: true,
        label: true,
        items: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(presets);
  } catch (error) {
    console.error("GET quick-bill-presets error:", error);
    return NextResponse.json(
      { error: "Failed to fetch presets" },
      { status: 500 }
    );
  }
}

// POST – create a new preset
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { label, items, createdBy } = body;

    // Basic validation
    if (!label || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Label and items (array) are required" },
        { status: 400 }
      );
    }

    // Validate each item has productId and quantity
    for (const item of items) {
      if (!item.productId || typeof item.quantity !== "number" || item.quantity <= 0) {
        return NextResponse.json(
          { error: "Each item must have a valid productId and quantity > 0" },
          { status: 400 }
        );
      }
    }

    // In a real app, `createdBy` would come from authenticated session.
    // Here we accept a userId from the request body (or use a default).
    const userId = createdBy || "DEFAULT_ADMIN_ID"; // Replace with actual admin user ID

    const preset = await prisma.quickBillPreset.create({
      data: {
        label,
        items: items, // stored as Json array
        createdBy: userId,
      },
    });

    return NextResponse.json(preset, { status: 201 });
  } catch (error) {
    console.error("POST quick-bill-presets error:", error);
    return NextResponse.json(
      { error: "Failed to create preset" },
      { status: 500 }
    );
  }
}
