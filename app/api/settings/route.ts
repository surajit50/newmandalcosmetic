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
    let settings = await prisma.settings.findFirst()
    
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          shopName: 'New Mandal Cosmetic',
          address: 'Trimohini, Hili, Dakshin Dinajpur',
          phone: 'XXXXX XXXXX',
          gstin: 'XXXXXX',
          invoicePrefix: 'NMC',
          currentInvoiceNumber: 1000,
        }
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const settings = await prisma.settings.findFirst()
    
    if (!settings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 })
    }

    const updated = await prisma.settings.update({
      where: { id: settings.id },
      data: {
        shopName: body.shopName,
        address: body.address,
        phone: body.phone,
        email: body.email,
        gstin: body.gstin,
        invoicePrefix: body.invoicePrefix,
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Settings PUT error:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
