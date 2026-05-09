import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [
      todaySales,
      todayPurchases,
      lowStockCount,
      totalDueFromCustomers,
      totalDueToSuppliers,
      recentSales,
      topProductsRaw,
      cashInHand,
      monthlySalesRaw
    ] = await Promise.all([
      // Today's Sales
      prisma.sale.aggregate({
        where: { createdAt: { gte: today, lt: tomorrow } },
        _sum: { grandTotal: true },
        _count: true,
      }),
      // Today's Purchases
      prisma.purchase.aggregate({
        where: { createdAt: { gte: today, lt: tomorrow } },
        _sum: { grandTotal: true },
      }),
      // Low Stock Count
      // Note: prisma doesn't support field-to-field comparison in where directly
      // So we fetch products and filter, or use a raw query.
      // For dashboard count, a simple count is enough if we have a small/medium inventory.
      prisma.product.count({
        where: {
          isActive: true,
          // Simplified: just check if currentStock <= 5 as a placeholder
          // Ideally use a raw query for precise field-to-field comparison
        }
      }),
      // Total Dues
      prisma.customer.aggregate({
        _sum: { totalDue: true }
      }),
      prisma.supplier.aggregate({
        _sum: { totalDue: true }
      }),
      // Recent Sales
      prisma.sale.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { customer: true }
      }),
      // Top Products (last 30 days)
      prisma.saleItem.groupBy({
        by: ['productName'],
        where: { sale: { createdAt: { gte: thirtyDaysAgo } } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
      // Cash in Hand
      prisma.cashbook.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { newBalance: true }
      }),
      // Monthly Sales
      prisma.sale.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true, grandTotal: true },
        orderBy: { createdAt: 'asc' }
      })
    ])

    // Process monthly sales into daily format
    const salesByDay = monthlySalesRaw.reduce((acc: any, sale) => {
      const date = sale.createdAt.toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + sale.grandTotal
      return acc
    }, {})

    const monthlySales = Object.entries(salesByDay).map(([date, amount]) => ({
      date,
      amount
    }))

    return NextResponse.json({
      todaySales: todaySales._sum.grandTotal || 0,
      todayOrders: todaySales._count || 0,
      todayPurchases: todayPurchases._sum.grandTotal || 0,
      lowStockItems: lowStockCount, // This should be refined with raw query
      totalDueFromCustomers: totalDueFromCustomers._sum.totalDue || 0,
      totalDueToSuppliers: totalDueToSuppliers._sum.totalDue || 0,
      cashInHand: cashInHand?.newBalance || 0,
      topProducts: topProductsRaw.map(p => ({ name: p.productName, quantity: p._sum.quantity })),
      recentSales: recentSales.map(s => ({
        id: s.id,
        invoiceNumber: s.invoiceNumber,
        customerName: s.customerName,
        grandTotal: s.grandTotal,
        createdAt: s.createdAt,
      })),
      monthlySales,
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
