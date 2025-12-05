import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { COLLECTIONS, Product } from '@/lib/types'
import { ObjectId } from 'mongodb'
import { getAuthorizedUser } from '@/app/actions/users'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { currentUser } = await getAuthorizedUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const resolvedParams = await params
    const { db } = await connectToDatabase()

    const product = await db
      .collection<Product>(COLLECTIONS.PRODUCTS)
      .findOne({
        _id: new ObjectId(resolvedParams.id),
        organizationId: currentUser.organizationId
      })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ product: JSON.parse(JSON.stringify(product)) })
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const resolvedParams = await params
    const { db } = await connectToDatabase()

    // Check if product exists and belongs to user's organization
    const existingProduct = await db
      .collection<Product>(COLLECTIONS.PRODUCTS)
      .findOne({
        _id: new ObjectId(resolvedParams.id),
        organizationId: currentUser.organizationId
      })

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const updateData = {
      name,
      description,
      price: Number(price),
      currency,
      category,
      isActive: isActive !== undefined ? isActive : true,
      updatedAt: new Date()
    }

    const result = await db
      .collection<Product>(COLLECTIONS.PRODUCTS)
      .findOneAndUpdate(
        { _id: new ObjectId(resolvedParams.id), organizationId: currentUser.organizationId },
        { $set: updateData },
        { returnDocument: 'after' }
      )

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to update product' },
        { status: 500 }
      )
    }

    return NextResponse.json({ product: JSON.parse(JSON.stringify(result)) })
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { currentUser } = await getAuthorizedUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const resolvedParams = await params
    const { db } = await connectToDatabase()

    // Check if product exists and belongs to user's organization
    const existingProduct = await db
      .collection<Product>(COLLECTIONS.PRODUCTS)
      .findOne({
        _id: new ObjectId(resolvedParams.id),
        organizationId: currentUser.organizationId
      })

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const result = await db
      .collection<Product>(COLLECTIONS.PRODUCTS)
      .deleteOne({
        _id: new ObjectId(resolvedParams.id),
        organizationId: currentUser.organizationId
      })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to delete product' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Product deleted successfully' })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}