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
    const type = searchParams.get('type') || 'customers'
    
    if (type === 'customers') {
      const customers = await prisma.customer.findMany({
        where: {
          isActive: true,
          totalDue: { gt: 0 }
        },
        orderBy: { totalDue: 'desc' }
      })
      return NextResponse.json(customers.map(c => ({ ...c, type: 'customers' })))
    } else {
      const suppliers = await prisma.supplier.findMany({
        where: {
          isActive: true,
          totalDue: { gt: 0 }
        },
        orderBy: { totalDue: 'desc' }
      })
      return NextResponse.json(suppliers.map(s => ({ ...s, type: 'suppliers' })))
    }
  } catch (error) {
    console.error('Dues GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch dues' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { type, partyId, amount, paymentMode, notes } = body
    
    if (!type || !partyId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const paymentAmount = parseFloat(amount)

    const result = await prisma.$transaction(async (tx) => {
      let partyName = ''
      let previousDue = 0

      // 1. Update party due
      if (type === 'customer') {
        const party = await tx.customer.findUnique({ where: { id: partyId } })
        if (!party) throw new Error('Customer not found')
        partyName = party.name
        previousDue = party.totalDue

        await tx.customer.update({
          where: { id: partyId },
          data: { totalDue: { decrement: paymentAmount } }
        })
      } else {
        const party = await tx.supplier.findUnique({ where: { id: partyId } })
        if (!party) throw new Error('Supplier not found')
        partyName = party.name
        previousDue = party.totalDue

        await tx.supplier.update({
          where: { id: partyId },
          data: { totalDue: { decrement: paymentAmount } }
        })
      }

      // 2. Update Cashbook
      const lastEntry = await tx.cashbook.findFirst({ orderBy: { createdAt: 'desc' } })
      const previousBalance = lastEntry?.newBalance || 0
      const cashbookType = type === 'customer' ? 'INCOME' : 'EXPENSE'
      const newBalance = cashbookType === 'INCOME' 
        ? previousBalance + paymentAmount 
        : previousBalance - paymentAmount

      await tx.cashbook.create({
        data: {
          type: cashbookType,
          category: type === 'customer' ? 'CUSTOMER_DUE' : 'SUPPLIER_DUE',
          amount: paymentAmount,
          previousBalance,
          newBalance,
          paymentMode: paymentMode || 'CASH',
          referenceType: type === 'customer' ? 'CUSTOMER_DUE' : 'SUPPLIER_DUE',
          referenceId: partyId,
          description: `Due Payment from ${partyName}. ${notes || ''}`,
          createdBy: session.user.id,
        }
      })

      return { success: true, partyName, newDue: previousDue - paymentAmount }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Dues POST error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to process payment' }, { status: 500 })
  }
}
