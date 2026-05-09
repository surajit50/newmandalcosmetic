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
    const type = searchParams.get('type') // INCOME, EXPENSE
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: any = {}
    
    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(new Date(endDate).setHours(23, 59, 59, 999))
    }
    
    if (type && type !== 'all') {
      where.type = type.toUpperCase()
    }

    const [entries, total] = await Promise.all([
      prisma.cashbook.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.cashbook.count({ where })
    ])

    // Calculate summary using groupBy
    const summary = await prisma.cashbook.groupBy({
      by: ['type'],
      where,
      _sum: {
        amount: true
      }
    })

    const totalIncome = summary.find(s => s.type === 'INCOME')?._sum.amount || 0
    const totalExpense = summary.find(s => s.type === 'EXPENSE')?._sum.amount || 0
    const currentBalance = entries[0]?.newBalance || 0

    return NextResponse.json({ 
      entries, 
      total, 
      page, 
      totalPages: Math.ceil(total / limit),
      summary: {
        totalIncome,
        totalExpense,
        netAmount: totalIncome - totalExpense,
        currentBalance
      }
    })
  } catch (error) {
    console.error('Cashbook API error:', error)
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
    const amount = parseFloat(body.amount)
    const type = body.type.toUpperCase() // INCOME or EXPENSE

    const result = await prisma.$transaction(async (tx) => {
      // Get last balance
      const lastEntry = await tx.cashbook.findFirst({
        orderBy: { createdAt: 'desc' }
      })
      const previousBalance = lastEntry?.newBalance || 0

      const newBalance = type === 'INCOME' 
        ? previousBalance + amount
        : previousBalance - amount

      const entry = await tx.cashbook.create({
        data: {
          type,
          category: body.category || 'Manual Entry',
          amount,
          previousBalance,
          newBalance,
          paymentMode: body.paymentMode || 'CASH',
          description: body.description || '',
          date: new Date(body.date || new Date()),
          createdBy: session.user.id,
        }
      })

      return entry
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Cashbook POST error:', error)
    return NextResponse.json({ error: 'Failed to create cashbook entry' }, { status: 500 })
  }
}
