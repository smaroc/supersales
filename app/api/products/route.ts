import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { COLLECTIONS, Product } from '@/lib/types'
import { getAuthorizedUser } from '@/app/actions/users'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { currentUser } = await getAuthorizedUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { db } = await connectToDatabase()

    const products = await db
      .collection<Product>(COLLECTIONS.PRODUCTS)
      .find({ organizationId: currentUser.organizationId })
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json({ products: JSON.parse(JSON.stringify(products)) })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { currentUser } = await getAuthorizedUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, description, price, currency, category, isActive } = body

    if (!name || !price || !currency) {
      return NextResponse.json(
        { error: 'Name, price, and currency are required' },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()

    const product: Omit<Product, '_id'> = {
      organizationId: currentUser.organizationId,
      name,
      description,
      price: Number(price),
      currency,
      category,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db.collection<Product>(COLLECTIONS.PRODUCTS).insertOne(product)
    const createdProduct = await db
      .collection<Product>(COLLECTIONS.PRODUCTS)
      .findOne({ _id: result.insertedId })

    if (!createdProduct) {
      return NextResponse.json(
        { error: 'Failed to create product' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { product: JSON.parse(JSON.stringify(createdProduct)) },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}