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
    const type = searchParams.get('type')
    const productId = searchParams.get('productId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    if (type === 'movements') {
      const where: any = {}
      if (productId) where.productId = productId
      
      const [movements, total] = await Promise.all([
        prisma.stockTransaction.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.stockTransaction.count({ where })
      ])
      
      return NextResponse.json({ movements, total, page, totalPages: Math.ceil(total / limit) })
    }

    if (type === 'low-stock') {
      const products = await prisma.product.findMany({
        where: {
          isActive: true,
          // Simplified filter, ideally use raw query for currentStock <= minStock
          currentStock: { lte: 5 }
        },
        include: { category: true, brand: true },
        orderBy: { currentStock: 'asc' }
      })
      
      return NextResponse.json({ products })
    }

    // Default: return stock summary
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { category: true, brand: true },
      orderBy: { name: 'asc' }
    })
    
    const summary = {
      totalValue: products.reduce((sum, p) => sum + (p.currentStock * p.purchasePrice), 0),
      totalItems: products.reduce((sum, p) => sum + p.currentStock, 0),
      lowStockCount: products.filter(p => p.currentStock <= p.minStock).length,
      totalProducts: products.length
    }
    
    return NextResponse.json({ products, summary })
  } catch (error) {
    console.error('Stock API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { productId, type, quantity, reason, adjustmentType } = body

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } })
      if (!product) throw new Error('Product not found')

      const previousStock = product.currentStock
      let newStock = previousStock

      if (type === 'adjustment') {
        if (['damage', 'wastage', 'expired', 'theft'].includes(adjustmentType)) {
          newStock = previousStock - Math.abs(quantity)
        } else if (adjustmentType === 'opening' || adjustmentType === 'correction') {
          newStock = quantity
        }
      } else if (type === 'stock-in') {
        newStock = previousStock + quantity
      } else if (type === 'stock-out') {
        newStock = previousStock - quantity
      }

      if (newStock < 0) throw new Error('Stock cannot be negative')

      // Update product
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { currentStock: newStock }
      })

      // Create transaction
      const transaction = await tx.stockTransaction.create({
        data: {
          productId,
          productName: product.name,
          type: newStock > previousStock ? 'IN' : 'OUT',
          quantity: Math.abs(newStock - previousStock),
          previousStock,
          newStock,
          referenceType: 'ADJUSTMENT',
          notes: `${adjustmentType || type}: ${reason || ''}`,
          createdBy: session.user.id,
        }
      })

      return { product: updatedProduct, transaction }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Stock POST error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update stock' }, { status: 500 })
  }
}
