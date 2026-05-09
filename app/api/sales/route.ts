import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateInvoiceNumber } from "@/lib/types";

type PaymentMode = "CASH" | "UPI" | "CARD" | "BANK";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: "No items found" },
        { status: 400 }
      );
    }

    // ===============================
    // SETTINGS
    // ===============================

    const settings = await prisma.settings.findFirst();

    if (!settings) {
      throw new Error("Settings not found");
    }

    const updatedSettings =
      await prisma.settings.update({
        where: {
          id: settings.id,
        },
        data: {
          currentInvoiceNumber: {
            increment: 1,
          },
        },
      });

    const invoiceNumber =
      generateInvoiceNumber(
        updatedSettings.invoicePrefix,
        updatedSettings.currentInvoiceNumber
      );

    // ===============================
    // TOTALS
    // ===============================

    const subtotal = body.items.reduce(
      (sum: number, item: any) =>
        sum +
        item.sellingPrice * item.quantity,
      0
    );

    const totalDiscount =
      body.items.reduce(
        (sum: number, item: any) =>
          sum + (item.discount || 0),
        0
      );

    const lineItems = body.items.map(
      (item: any) => {
        const inclusive =
          item.sellingPrice *
            item.quantity -
          (item.discount || 0);

        const taxable =
          inclusive /
          (1 + item.gstRate / 100);

        const gstAmount =
          inclusive - taxable;

        return {
          ...item,
          gstAmount,
          total: inclusive,
        };
      }
    );

    const totalGst =
      lineItems.reduce(
        (sum: number, item: any) =>
          sum + item.gstAmount,
        0
      );

    const grandTotal =
      subtotal - totalDiscount;

    const paidAmount =
      parseFloat(body.paidAmount) ||
      grandTotal;

    const dueAmount =
      grandTotal - paidAmount;

    // ===============================
    // PRODUCT VALIDATION
    // ===============================

    const productIds = body.items.map(
      (item: any) => item.productId
    );

    const products =
      await prisma.product.findMany({
        where: {
          id: {
            in: productIds,
          },
        },
      });

    for (const item of body.items) {
      const product = products.find(
        (p) => p.id === item.productId
      );

      if (!product) {
        throw new Error(
          `${item.productName} not found`
        );
      }

      if (
        product.currentStock <
        item.quantity
      ) {
        throw new Error(
          `Insufficient stock for ${item.productName}`
        );
      }
    }

    // ===============================
    // PAYMENT MODE FIX
    // ===============================

    const paymentModeMap: Record<
      string,
      PaymentMode
    > = {
      CASH: "CASH",
      UPI: "UPI",
      CARD: "CARD",
      BANK: "BANK",
    };

    const paymentMode =
      paymentModeMap[
        String(
          body.paymentMode || "CASH"
        ).toUpperCase()
      ] || "CASH";

    // ===============================
    // PAYMENT STATUS
    // ===============================

    const getPaymentStatus = (
      due: number,
      paid: number
    ) => {
      if (due <= 0) return "PAID";
      if (paid > 0) return "PARTIAL";
      return "DUE";
    };

    // ===============================
    // CREATE SALE
    // ===============================

    const sale =
      await prisma.sale.create({
        data: {
          invoiceNumber,

          customerId:
            body.customerId || null,

          customerName:
            body.customerName ||
            "Walk-in Customer",

          customerPhone:
            body.customerPhone || null,

          subtotal,
          totalDiscount,
          totalGst,
          grandTotal,

          paidAmount,
          dueAmount,

          paymentStatus:
            getPaymentStatus(
              dueAmount,
              paidAmount
            ) as
              | "PAID"
              | "PARTIAL"
              | "DUE",

          paymentMode,

          notes: body.notes || "",

          createdBy:
            session.user.id,

          items: {
            create: lineItems.map(
              (item: any) => ({
                productId:
                  item.productId,
                productName:
                  item.productName,
                quantity:
                  item.quantity,
                mrp: item.mrp,
                sellingPrice:
                  item.sellingPrice,
                discount:
                  item.discount || 0,
                gstRate:
                  item.gstRate,
                gstAmount:
                  item.gstAmount,
                total: item.total,
              })
            ),
          },
        },

        include: {
          items: true,
        },
      });

    // ===============================
    // UPDATE STOCK
    // ===============================

    await Promise.all(
      body.items.map(
        async (item: any) => {
          const product =
            products.find(
              (p) =>
                p.id ===
                item.productId
            );

          if (!product) return;

          const previousStock =
            product.currentStock;

          const newStock =
            previousStock -
            item.quantity;

          await prisma.product.update({
            where: {
              id: item.productId,
            },
            data: {
              currentStock:
                newStock,
            },
          });

          await prisma.stockTransaction.create(
            {
              data: {
                productId:
                  item.productId,
                productName:
                  item.productName,
                type: "OUT",
                quantity:
                  item.quantity,
                previousStock,
                newStock,
                referenceType:
                  "SALE",
                referenceId:
                  sale.id,
                createdBy:
                  session.user.id,
              },
            }
          );
        }
      )
    );

    // ===============================
    // CUSTOMER UPDATE
    // ===============================

    if (body.customerId) {
      await prisma.customer.update({
        where: {
          id: body.customerId,
        },
        data: {
          totalPurchases: {
            increment:
              grandTotal,
          },
          totalDue: {
            increment:
              dueAmount > 0
                ? dueAmount
                : 0,
          },
        },
      });
    }

    // ===============================
    // CASHBOOK ENTRY
    // ===============================

    if (paidAmount > 0) {
      let previousBalance = 0;

      try {
        const lastEntries =
          await prisma.cashbook.findMany({
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          });

        const lastEntry =
          lastEntries[0];

        previousBalance =
          lastEntry?.newBalance || 0;
      } catch (error) {
        console.error(
          "Cashbook fetch error:",
          error
        );
      }

      await prisma.cashbook.create({
        data: {
          type: "INCOME",
          category: "SALE",
          amount: paidAmount,
          previousBalance,

          newBalance:
            previousBalance +
            paidAmount,

          paymentMode,

          referenceType: "SALE",

          referenceId: sale.id,

          description: `Sale: ${invoiceNumber}`,

          createdBy:
            session.user.id,
        },
      });
    }

    return NextResponse.json(sale);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create sale",
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest
) {
  const session =
    await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(
      request.url
    );

    const search =
      searchParams.get("search") || "";

    const limit = parseInt(
      searchParams.get("limit") || "50"
    );

    const page = parseInt(
      searchParams.get("page") || "1"
    );

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        {
          invoiceNumber: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          customerName: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    const [sales, total] =
      await Promise.all([
        prisma.sale.findMany({
          where,
          include: {
            items: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: limit,
        }),

        prisma.sale.count({
          where,
        }),
      ]);

    return NextResponse.json({
      sales,
      total,
      page,
      totalPages: Math.ceil(
        total / limit
      ),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to fetch sales",
      },
      { status: 500 }
    );
  }
}
