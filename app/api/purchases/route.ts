import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const supplierId = searchParams.get('supplierId')
    
    const where: any = {}
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }
    if (supplierId) where.supplierId = supplierId

    const purchases = await prisma.purchase.findMany({
      where,
      include: {
        supplier: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json(purchases)
  } catch (error) {
    console.error('Purchases GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === 'CASHIER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    
    const result = await prisma.$transaction(async (tx) => {
      // 1. Generate purchase invoice number
      const count = await tx.purchase.count()
      const invoiceNumber = `PUR/${new Date().getFullYear() % 100}-${(new Date().getFullYear() + 1) % 100}/${(count + 1).toString().padStart(4, '0')}`

      // 2. Calculate totals
      const subtotal = body.items.reduce((sum: number, item: any) => sum + (item.purchasePrice * item.quantity), 0)
      const totalGst = body.items.reduce((sum: number, item: any) => sum + (item.purchasePrice * item.quantity * (item.gstRate / 100)), 0)
      const grandTotal = subtotal + totalGst
      const paidAmount = parseFloat(body.paidAmount) || 0
      const dueAmount = grandTotal - paidAmount

      const supplier = await tx.supplier.findUnique({ where: { id: body.supplierId } })
      if (!supplier) throw new Error('Supplier not found')

      // 3. Create Purchase
      const purchase = await tx.purchase.create({
        data: {
          invoiceNumber,
          supplierId: body.supplierId,
          subtotal,
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
              purchasePrice: item.purchasePrice,
              gstRate: item.gstRate,
              gstAmount: item.purchasePrice * item.quantity * (item.gstRate / 100),
              total: item.purchasePrice * item.quantity * (1 + item.gstRate / 100),
            }))
          }
        },
        include: { items: true }
      })

      // 4. Update Stock and prices
      for (const item of body.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } })
        if (!product) throw new Error(`Product ${item.productName} not found`)

        const previousStock = product.currentStock
        const newStock = previousStock + item.quantity

        await tx.product.update({
          where: { id: item.productId },
          data: { 
            currentStock: newStock,
            purchasePrice: item.purchasePrice // Update purchase price based on last purchase
          },
        })

        await tx.stockTransaction.create({
          data: {
            productId: item.productId,
            productName: item.productName,
            type: 'IN',
            quantity: item.quantity,
            previousStock,
            newStock,
            referenceType: 'PURCHASE',
            referenceId: purchase.id,
            createdBy: session.user.id,
          },
        })
      }

      // 5. Update Supplier Due
      await tx.supplier.update({
        where: { id: body.supplierId },
        data: {
          totalPurchases: { increment: grandTotal },
          totalDue: { increment: dueAmount },
        },
      })

      // 6. Update Cashbook
      if (paidAmount > 0) {
        const lastEntry = await tx.cashbook.findFirst({
          orderBy: { createdAt: 'desc' },
        })
        const previousBalance = lastEntry?.newBalance || 0
        
        await tx.cashbook.create({
          data: {
            type: 'EXPENSE',
            category: 'PURCHASE',
            amount: paidAmount,
            previousBalance,
            newBalance: previousBalance - paidAmount,
            paymentMode: body.paymentMode || 'CASH',
            referenceType: 'PURCHASE',
            referenceId: purchase.id,
            description: `Purchase: ${invoiceNumber}`,
            createdBy: session.user.id,
          },
        })
      }

      return purchase
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Purchases POST error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create purchase' }, { status: 500 })
  }
}
