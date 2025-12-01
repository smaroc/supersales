'use server'

import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { Product, COLLECTIONS } from '@/lib/types'
import { ObjectId } from 'mongodb'
import { getAuthorizedUser } from './users'
import { revalidatePath } from 'next/cache'

/**
 * Get all products for the user's organization
 */
export async function getAllProducts(): Promise<Product[]> {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const { currentUser } = await getAuthorizedUser()
    if (!currentUser) {
      throw new Error('User not found')
    }

    const { db } = await connectToDatabase()

    const products = await db
      .collection<Product>(COLLECTIONS.PRODUCTS)
      .find({ organizationId: currentUser.organizationId })
      .sort({ createdAt: -1 })
      .toArray()

    return JSON.parse(JSON.stringify(products))
  } catch (error) {
    console.error('Error fetching products:', error)
    throw new Error('Failed to fetch products')
  }
}

/**
 * Create a new product
 */
export async function createProduct(productData: {
  name: string
  description?: string
  price: number
  currency: string
  category?: string
  isActive: boolean
}): Promise<Product> {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const { currentUser } = await getAuthorizedUser()
    if (!currentUser) {
      throw new Error('User not found')
    }

    const { db } = await connectToDatabase()

    const product: Omit<Product, '_id'> = {
      organizationId: currentUser.organizationId,
      name: productData.name,
      description: productData.description,
      price: productData.price,
      currency: productData.currency,
      category: productData.category,
      isActive: productData.isActive,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db.collection<Product>(COLLECTIONS.PRODUCTS).insertOne(product)
    const createdProduct = await db
      .collection<Product>(COLLECTIONS.PRODUCTS)
      .findOne({ _id: result.insertedId })

    if (!createdProduct) {
      throw new Error('Failed to create product')
    }

    // Revalidate the products page
    revalidatePath('/dashboard/products')

    return JSON.parse(JSON.stringify(createdProduct))
  } catch (error) {
    console.error('Error creating product:', error)
    throw new Error('Failed to create product')
  }
}

/**
 * Update an existing product
 */
export async function updateProduct(
  productId: string,
  productData: {
    name: string
    description?: string
    price: number
    currency: string
    category?: string
    isActive: boolean
  }
): Promise<Product> {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const { currentUser } = await getAuthorizedUser()
    if (!currentUser) {
      throw new Error('User not found')
    }

    const { db } = await connectToDatabase()

    // Check if product exists and belongs to user's organization
    const existingProduct = await db
      .collection<Product>(COLLECTIONS.PRODUCTS)
      .findOne({
        _id: new ObjectId(productId),
        organizationId: currentUser.organizationId
      })

    if (!existingProduct) {
      throw new Error('Product not found')
    }

    const updateData = {
      name: productData.name,
      description: productData.description,
      price: productData.price,
      currency: productData.currency,
      category: productData.category,
      isActive: productData.isActive,
      updatedAt: new Date()
    }

    const result = await db
      .collection<Product>(COLLECTIONS.PRODUCTS)
      .findOneAndUpdate(
        { _id: new ObjectId(productId), organizationId: currentUser.organizationId },
        { $set: updateData },
        { returnDocument: 'after' }
      )

    if (!result) {
      throw new Error('Failed to update product')
    }

    // Revalidate the products page
    revalidatePath('/dashboard/products')

    return JSON.parse(JSON.stringify(result))
  } catch (error) {
    console.error('Error updating product:', error)
    throw new Error('Failed to update product')
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(productId: string): Promise<void> {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const { currentUser } = await getAuthorizedUser()
    if (!currentUser) {
      throw new Error('User not found')
    }

    const { db } = await connectToDatabase()

    // Check if product exists and belongs to user's organization
    const existingProduct = await db
      .collection<Product>(COLLECTIONS.PRODUCTS)
      .findOne({
        _id: new ObjectId(productId),
        organizationId: currentUser.organizationId
      })

    if (!existingProduct) {
      throw new Error('Product not found')
    }

    const result = await db
      .collection<Product>(COLLECTIONS.PRODUCTS)
      .deleteOne({
        _id: new ObjectId(productId),
        organizationId: currentUser.organizationId
      })

    if (result.deletedCount === 0) {
      throw new Error('Failed to delete product')
    }

    // Revalidate the products page
    revalidatePath('/dashboard/products')
  } catch (error) {
    console.error('Error deleting product:', error)
    throw new Error('Failed to delete product')
  }
}

/**
 * Get a specific product by ID
 */
export async function getProductById(productId: string): Promise<Product | null> {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const { currentUser } = await getAuthorizedUser()
    if (!currentUser) {
      throw new Error('User not found')
    }

    const { db } = await connectToDatabase()

    const product = await db
      .collection<Product>(COLLECTIONS.PRODUCTS)
      .findOne({
        _id: new ObjectId(productId),
        organizationId: currentUser.organizationId
      })

    return product ? JSON.parse(JSON.stringify(product)) : null
  } catch (error) {
    console.error('Error fetching product:', error)
    throw new Error('Failed to fetch product')
  }
}