import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { generateInvoiceNumber } from '@/lib/types'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()

    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'No items found' },
        { status: 400 }
      )
    }

    // =========================================
    // SETTINGS
    // =========================================

    const settings = await prisma.settings.findFirst()

    if (!settings) {
      throw new Error('Settings not found')
    }

    const updatedSettings = await prisma.settings.update({
      where: {
        id: settings.id,
      },
      data: {
        currentInvoiceNumber: {
          increment: 1,
        },
      },
    })

    const invoiceNumber = generateInvoiceNumber(
      updatedSettings.invoicePrefix,
      updatedSettings.currentInvoiceNumber
    )

    // =========================================
    // TOTALS
    // =========================================

    const subtotal = body.items.reduce(
      (sum: number, item: any) =>
        sum + item.sellingPrice * item.quantity,
      0
    )

    const totalDiscount = body.items.reduce(
      (sum: number, item: any) =>
        sum + (item.discount || 0),
      0
    )

    const totalGst = body.items.reduce(
      (sum: number, item: any) => {
        const taxable =
          item.sellingPrice * item.quantity -
          (item.discount || 0)

        return sum + taxable * (item.gstRate / 100)
      },
      0
    )

    const grandTotal =
      subtotal - totalDiscount + totalGst

    const paidAmount =
      parseFloat(body.paidAmount) || grandTotal

    const dueAmount = grandTotal - paidAmount

    // =========================================
    // GET PRODUCTS
    // =========================================

    const productIds = body.items.map(
      (item: any) => item.productId
    )

    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
    })

    // =========================================
    // STOCK VALIDATION
    // =========================================

    for (const item of body.items) {
      const product = products.find(
        (p) => p.id === item.productId
      )

      if (!product) {
        throw new Error(
          `${item.productName} not found`
        )
      }

      if (product.currentStock < item.quantity) {
        throw new Error(
          `Insufficient stock for ${item.productName}`
        )
      }
    }

    // =========================================
    // CREATE SALE
    // =========================================

    const sale = await prisma.sale.create({
      data: {
        invoiceNumber,

        customerId: body.customerId || null,

        customerName:
          body.customerName || 'Walk-in Customer',

        customerPhone:
          body.customerPhone || null,

        subtotal,

        totalDiscount,

        totalGst,

        grandTotal,

        paidAmount,

        dueAmount,

        paymentStatus:
          dueAmount <= 0
            ? 'PAID'
            : paidAmount > 0
            ? 'PARTIAL'
            : 'DUE',

        paymentMode:
          body.paymentMode || 'CASH',

        notes: body.notes || '',

        createdBy: session.user.id,

        items: {
          create: body.items.map((item: any) => {
            const taxable =
              item.sellingPrice * item.quantity -
              (item.discount || 0)

            const gstAmount =
              taxable * (item.gstRate / 100)

            return {
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              mrp: item.mrp,
              sellingPrice: item.sellingPrice,
              discount: item.discount || 0,
              gstRate: item.gstRate,
              gstAmount,
              total: taxable + gstAmount,
            }
          }),
        },
      },
      include: {
        items: true,
      },
    })

    // =========================================
    // UPDATE STOCK
    // =========================================

    await Promise.all(
      body.items.map(async (item: any) => {
        const product = products.find(
          (p) => p.id === item.productId
        )

        if (!product) return

        const previousStock = product.currentStock
        const newStock =
          previousStock - item.quantity

        await prisma.product.update({
          where: {
            id: item.productId,
          },
          data: {
            currentStock: newStock,
          },
        })

        await prisma.stockTransaction.create({
          data: {
            productId: item.productId,
            productName: item.productName,
            type: 'OUT',
            quantity: item.quantity,
            previousStock,
            newStock,
            referenceType: 'SALE',
            referenceId: sale.id,
            createdBy: session.user.id,
          },
        })
      })
    )

    // =========================================
    // CUSTOMER UPDATE
    // =========================================

    if (body.customerId) {
      await prisma.customer.update({
        where: {
          id: body.customerId,
        },
        data: {
          totalPurchases: {
            increment: grandTotal,
          },

          totalDue: {
            increment:
              dueAmount > 0 ? dueAmount : 0,
          },
        },
      })
    }

    // =========================================
    // CASHBOOK
    // =========================================

    if (paidAmount > 0) {
      const lastEntry =
        await prisma.cashbook.findFirst({
          orderBy: {
            createdAt: 'desc',
          },
        })

      const previousBalance =
        lastEntry?.newBalance || 0

      await prisma.cashbook.create({
        data: {
          type: 'INCOME',
          category: 'SALE',
          amount: paidAmount,
          previousBalance,
          newBalance:
            previousBalance + paidAmount,
          paymentMode:
            body.paymentMode || 'CASH',
          referenceType: 'SALE',
          referenceId: sale.id,
          description: `Sale: ${invoiceNumber}`,
          createdBy: session.user.id,
        },
      })
    }

    return NextResponse.json(sale)
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create sale',
      },
      {
        status: 500,
      }
    )
  }
}