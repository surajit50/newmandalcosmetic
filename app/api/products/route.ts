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
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const lowStock = searchParams.get('lowStock')
    
    const where: any = { isActive: true }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ]
    }
    
    if (category) {
      where.categoryId = category
    }
    
    if (lowStock === 'true') {
      where.currentStock = {
        lte: prisma.product.fields.minStock
      }
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        brand: true,
      },
      orderBy: { name: 'asc' },
    })

    const formattedProducts = products.map(product => ({
      ...product,
      categoryName: product.category.name,
      brandName: product.brand?.name || 'No Brand',
    }))

    return NextResponse.json(formattedProducts)
  } catch (error) {
    console.error('Products GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    
    const product = await prisma.product.create({
      data: {
        name: body.name,
        barcode: body.barcode || null,
        categoryId: body.categoryId,
        brandId: body.brandId || null,
        unit: body.unit || 'pcs',
        gstRate: parseFloat(body.gstRate) || 0,
        hsnCode: body.hsnCode || null,
        purchasePrice: parseFloat(body.purchasePrice) || 0,
        sellingPrice: parseFloat(body.sellingPrice) || 0,
        mrp: parseFloat(body.mrp) || 0,
        wholesalePrice: parseFloat(body.wholesalePrice) || 0,
        currentStock: parseFloat(body.currentStock) || 0,
        minStock: parseFloat(body.minStock) || 5,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        batchNumber: body.batchNumber || null,
        image: body.image || null,
      },
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('Product POST error:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
