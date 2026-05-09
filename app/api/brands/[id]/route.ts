import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    
    const brand = await prisma.brand.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description || null,
      },
    })

    return NextResponse.json(brand)
  } catch (error) {
    console.error('Brand PUT error:', error)
    return NextResponse.json({ error: 'Failed to update brand' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    
    // Check if brand has products
    const productCount = await prisma.product.count({
      where: { brandId: id, isActive: true }
    })
    
    if (productCount > 0) {
      return NextResponse.json({ error: 'Cannot delete brand with associated products' }, { status: 400 })
    }

    await prisma.brand.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ message: 'Brand deleted successfully' })
  } catch (error) {
    console.error('Brand DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete brand' }, { status: 500 })
  }
}
