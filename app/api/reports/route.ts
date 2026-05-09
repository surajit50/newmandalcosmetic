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
    const type = searchParams.get('type') || 'sales'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    const where: any = {}
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      }
    }

    if (type === 'sales') {
      const sales = await prisma.sale.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      })

      const summary = {
        totalSales: sales.reduce((sum, s) => sum + s.grandTotal, 0),
        totalGst: sales.reduce((sum, s) => sum + s.totalGst, 0),
        totalTransactions: sales.length,
        cashSales: sales.filter(s => s.paymentMode === 'CASH').reduce((sum, s) => sum + s.grandTotal, 0),
        upiSales: sales.filter(s => s.paymentMode === 'UPI').reduce((sum, s) => sum + s.grandTotal, 0),
        cardSales: sales.filter(s => s.paymentMode === 'CARD').reduce((sum, s) => sum + s.grandTotal, 0),
      }

      return NextResponse.json({ summary, data: sales })
    }

    if (type === 'stock') {
      const products = await prisma.product.findMany({
        where: { isActive: true },
        include: { category: true, brand: true },
      })

      const summary = {
        totalItems: products.length,
        totalStock: products.reduce((sum, p) => sum + p.currentStock, 0),
        totalValuation: products.reduce((sum, p) => sum + (p.currentStock * p.purchasePrice), 0),
        totalSellingValuation: products.reduce((sum, p) => sum + (p.currentStock * p.sellingPrice), 0),
        lowStockItems: products.filter(p => p.currentStock <= p.minStock).length,
      }

      return NextResponse.json({ summary, data: products })
    }

    if (type === 'gst') {
      const [sales, purchases] = await Promise.all([
        prisma.sale.findMany({ where, include: { items: true } }),
        prisma.purchase.findMany({ where, include: { items: true } }),
      ])

      const gstRates = [0, 5, 12, 18, 28]
      const gstBreakdown = gstRates.map(rate => {
        const salesItems = sales.flatMap(s => s.items.filter(i => i.gstRate === rate))
        const purchaseItems = purchases.flatMap(p => p.items.filter(i => i.gstRate === rate))
        
        const outputGst = salesItems.reduce((sum, i) => sum + i.gstAmount, 0)
        const inputGst = purchaseItems.reduce((sum, i) => sum + i.gstAmount, 0)
        
        return {
          rate,
          outputGst,
          inputGst,
          netGst: outputGst - inputGst,
          salesTaxable: salesItems.reduce((sum, i) => sum + (i.sellingPrice * i.quantity - i.discount), 0),
          purchaseTaxable: purchaseItems.reduce((sum, i) => sum + (i.purchasePrice * i.quantity), 0),
        }
      })

      return NextResponse.json({
        summary: {
          totalOutputGst: gstBreakdown.reduce((sum, r) => sum + r.outputGst, 0),
          totalInputGst: gstBreakdown.reduce((sum, r) => sum + r.inputGst, 0),
          netGstPayable: gstBreakdown.reduce((sum, r) => sum + r.netGst, 0),
        },
        data: gstBreakdown
      })
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
  } catch (error) {
    console.error('Reports error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
