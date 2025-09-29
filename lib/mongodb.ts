import { MongoClient, Db } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local')
}

interface GlobalWithMongo {
  mongo: {
    conn: MongoClient | null
    promise: Promise<MongoClient> | null
  }
}

declare const global: GlobalWithMongo

let cached = global.mongo

if (!cached) {
  cached = global.mongo = { conn: null, promise: null }
}

async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cached.conn) {
    return {
      client: cached.conn,
      db: cached.conn.db()
    }
  }

  if (!cached.promise) {
    const opts = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }

    cached.promise = MongoClient.connect(MONGODB_URI!, opts)
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return {
    client: cached.conn,
    db: cached.conn.db()
  }
}

export default connectToDatabase