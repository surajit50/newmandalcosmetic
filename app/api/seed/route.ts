import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import prisma from '@/lib/prisma'

export async function POST() {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@mandalcosmetic.com' }
    })
    
    if (existingAdmin) {
      return NextResponse.json({ message: 'Database already seeded' }, { status: 200 })
    }

    // Create admin user
    const hashedPassword = await hash('admin123', 12)
    await prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin@mandalcosmetic.com',
        password: hashedPassword,
        role: 'ADMIN',
        phone: '9876543210',
        isActive: true,
      }
    })

    // Create default categories
    const categories = [
      { name: 'Cosmetics', description: 'Beauty and cosmetic products' },
      { name: 'Skincare', description: 'Skin care products' },
      { name: 'Haircare', description: 'Hair care products' },
      { name: 'Grocery', description: 'General grocery items' },
      { name: 'Personal Care', description: 'Personal hygiene products' },
    ]

    await prisma.category.createMany({
      data: categories
    })

    // Create shop settings
    await prisma.settings.create({
      data: {
        shopName: 'New Mandal Cosmetic',
        address: 'Main Market, Your City',
        phone: '9876543210',
        email: 'contact@mandalcosmetic.com',
        gstin: '',
        invoicePrefix: 'INV',
        currentInvoiceNumber: 1000,
      }
    })

    return NextResponse.json({ 
      message: 'Database seeded successfully',
      admin: {
        email: 'admin@mandalcosmetic.com',
        password: 'admin123'
      }
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Failed to seed database' }, { status: 500 })
  }
}
