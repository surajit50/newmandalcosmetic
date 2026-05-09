import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { generateInvoiceNumber } from '@/lib/types'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const customerId = searchParams.get('customerId')
    
    const where: any = {}
    
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }
    
    if (customerId) {
      where.customerId = customerId
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        customer: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json(sales)
  } catch (error) {
    console.error('Sales GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get settings and increment invoice number
      const settings = await tx.settings.findFirst()
      if (!settings) throw new Error('Settings not found')

      const updatedSettings = await tx.settings.update({
        where: { id: settings.id },
        data: { currentInvoiceNumber: { increment: 1 } },
      })

      const invoiceNumber = generateInvoiceNumber(
        updatedSettings.invoicePrefix,
        updatedSettings.currentInvoiceNumber
      )

      // 2. Calculate totals and prepare items
      const subtotal = body.items.reduce((sum: number, item: any) => sum + (item.sellingPrice * item.quantity), 0)
      const totalDiscount = body.items.reduce((sum: number, item: any) => sum + (item.discount || 0), 0)
      const totalGst = body.items.reduce((sum: number, item: any) => {
        const taxable = (item.sellingPrice * item.quantity) - (item.discount || 0)
        return sum + (taxable * (item.gstRate / 100))
      }, 0)
      const grandTotal = subtotal - totalDiscount + totalGst
      const paidAmount = parseFloat(body.paidAmount) || grandTotal
      const dueAmount = grandTotal - paidAmount

      // 3. Create Sale
      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          customerId: body.customerId || null,
          customerName: body.customerName || 'Walk-in Customer',
          customerPhone: body.customerPhone || null,
          subtotal,
          totalDiscount,
          totalGst,
          grandTotal,
          paidAmount,
          dueAmount,
          paymentStatus: dueAmount <= 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'DUE',
          paymentMode: body.paymentMode || 'CASH',
          notes: body.notes || '',
          createdBy: session.user.id,
          items: {
            create: body.items.map((item: any) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              mrp: item.mrp,
              sellingPrice: item.sellingPrice,
              discount: item.discount || 0,
              gstRate: item.gstRate,
              gstAmount: ((item.sellingPrice * item.quantity) - (item.discount || 0)) * (item.gstRate / 100),
              total: ((item.sellingPrice * item.quantity) - (item.discount || 0)) * (1 + item.gstRate / 100),
            })),
          },
        },
        include: { items: true },
      })

      // 4. Update Stock and create transactions
      const productIds = body.items.map((item: any) => item.productId)
      const products = await tx.product.findMany({
        where: { id: { in: productIds } }
      })

      for (const item of body.items) {
        const product = products.find(p => p.id === item.productId)
        if (!product) throw new Error(`Product ${item.productName} not found`)

        const previousStock = product.currentStock
        const newStock = previousStock - item.quantity

        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: newStock },
        })

        await tx.stockTransaction.create({
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
      }

      // 5. Update Customer Due
      if (body.customerId && dueAmount > 0) {
        await tx.customer.update({
          where: { id: body.customerId },
          data: {
            totalPurchases: { increment: grandTotal },
            totalDue: { increment: dueAmount },
          },
        })
      }

      // 6. Update Cashbook
      const lastEntry = await tx.cashbook.findFirst({
        orderBy: { createdAt: 'desc' },
      })
      const previousBalance = lastEntry?.newBalance || 0
      
      if (paidAmount > 0) {
        await tx.cashbook.create({
          data: {
            type: 'INCOME',
            category: 'SALE',
            amount: paidAmount,
            previousBalance,
            newBalance: previousBalance + paidAmount,
            paymentMode: body.paymentMode || 'CASH',
            referenceType: 'SALE',
            referenceId: sale.id,
            description: `Sale: ${invoiceNumber}`,
            createdBy: session.user.id,
          },
        })
      }

      return sale
    }, {
      maxWait: 15000, // Wait up to 15s for connection
      timeout: 20000, // Allow up to 25s for transaction execution
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Sales POST error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create sale' }, { status: 500 })
  }
}
