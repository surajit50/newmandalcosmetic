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
    const category = searchParams.get('category')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: any = {}
    
    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }
    
    if (category && category !== 'all') {
      where.category = category
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.expense.count({ where })
    ])

    // Calculate totals by category
    const categoryTotals = await prisma.expense.groupBy({
      by: ['category'],
      where,
      _sum: {
        amount: true
      }
    })

    const grandTotal = categoryTotals.reduce((sum, c) => sum + (c._sum.amount || 0), 0)

    return NextResponse.json({ 
      expenses, 
      total, 
      page, 
      totalPages: Math.ceil(total / limit),
      categoryTotals: categoryTotals.map(c => ({ _id: c.category, total: c._sum.amount })),
      grandTotal
    })
  } catch (error) {
    console.error('Expenses GET error:', error)
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

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the expense
      const expense = await tx.expense.create({
        data: {
          category: body.category,
          description: body.description || null,
          amount,
          paymentMode: body.paymentMode || 'CASH',
          date: new Date(body.date || new Date()),
          createdBy: session.user.id,
        },
      })

      // 2. Get the latest cashbook entry for balance
      const lastEntry = await tx.cashbook.findFirst({
        orderBy: { createdAt: 'desc' },
      })
      const previousBalance = lastEntry?.newBalance || 0
      const newBalance = previousBalance - amount

      // 3. Add to cashbook
      await tx.cashbook.create({
        data: {
          type: 'EXPENSE',
          category: body.category,
          amount,
          previousBalance,
          newBalance,
          paymentMode: body.paymentMode || 'CASH',
          referenceType: 'EXPENSE',
          referenceId: expense.id,
          description: body.description || null,
          date: new Date(body.date || new Date()),
          createdBy: session.user.id,
        },
      })

      return expense
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Expense POST error:', error)
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 })
  }
}
