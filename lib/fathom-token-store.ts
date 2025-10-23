import connectToDatabase from './mongodb'
import { COLLECTIONS, Integration } from './types'
import { ObjectId } from 'mongodb'
import { encrypt, decrypt } from './encryption'

export interface TokenStore {
  get(): Promise<{ token: string; refresh_token: string; expires: number } | undefined>
  set(token: string, refresh_token: string, expires: number): Promise<void>
}

export class MongoDBTokenStore implements TokenStore {
  private userId: ObjectId

  constructor(userId: ObjectId) {
    this.userId = userId
  }

  async get(): Promise<{ token: string; refresh_token: string; expires: number } | undefined> {
    console.log('[TokenStore] Getting tokens for user:', this.userId)

    try {
      const { db } = await connectToDatabase()
      const integration = await db.collection<Integration>(COLLECTIONS.INTEGRATIONS).findOne({
        userId: this.userId,
        platform: 'fathom'
      })

      if (!integration?.configuration?.oauthToken || !integration?.configuration?.oauthRefreshToken || !integration?.configuration?.oauthExpires) {
        console.log('[TokenStore] No tokens found')
        return undefined
      }

      // Decrypt and return tokens
      const token = decrypt(integration.configuration.oauthToken)
      const refresh_token = decrypt(integration.configuration.oauthRefreshToken)
      const expires = parseInt(integration.configuration.oauthExpires)

      console.log('[TokenStore] Tokens retrieved successfully, expires:', new Date(expires))
      return { token, refresh_token, expires }
    } catch (error: any) {
      console.error('[TokenStore] Error getting tokens:', error)
      return undefined
    }
  }

  async set(token: string, refresh_token: string, expires: number): Promise<void> {
    console.log('[TokenStore] Setting tokens for user:', this.userId)
    console.log('[TokenStore] Token expires:', new Date(expires))

    try {
      const { db } = await connectToDatabase()

      // Encrypt tokens before storing
      const encryptedToken = encrypt(token)
      const encryptedRefreshToken = encrypt(refresh_token)

      await db.collection<Integration>(COLLECTIONS.INTEGRATIONS).updateOne(
        {
          userId: this.userId,
          platform: 'fathom'
        },
        {
          $set: {
            'configuration.oauthToken': encryptedToken,
            'configuration.oauthRefreshToken': encryptedRefreshToken,
            'configuration.oauthExpires': expires.toString(),
            updatedAt: new Date()
          }
        }
      )

      console.log('[TokenStore] Tokens stored successfully')
    } catch (error: any) {
      console.error('[TokenStore] Error setting tokens:', error)
      throw error
    }
  }
}
