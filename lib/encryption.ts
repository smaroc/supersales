import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.INTEGRATION_ENCRYPTION_KEY || 'your-32-character-secret-key-here!!'
const ALGORITHM = 'aes-256-cbc'

// Ensure the key is exactly 32 bytes for AES-256
function getEncryptionKey(): Buffer {
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32), 'utf8')
  return key
}

export function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(16)
    const key = getEncryptionKey()
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return iv.toString('hex') + ':' + encrypted
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt data')
  }
}

export function decrypt(encryptedData: string): string {
  try {
    console.log('[Encryption] Decrypting data, length:', encryptedData?.length, 'preview:', encryptedData?.substring(0, 50))
    const [ivHex, encrypted] = encryptedData.split(':')
    if (!ivHex || !encrypted) {
      console.error('[Encryption] Invalid format - ivHex:', ivHex?.substring(0, 20), 'encrypted:', encrypted?.substring(0, 20))
      throw new Error('Invalid encrypted data format')
    }

    console.log('[Encryption] IV hex length:', ivHex.length, 'Encrypted length:', encrypted.length)
    const iv = Buffer.from(ivHex, 'hex')
    const key = getEncryptionKey()
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    console.log('[Encryption] Decrypted successfully, result length:', decrypted.length, 'preview:', decrypted.substring(0, 20))
    return decrypted
  } catch (error) {
    console.error('[Encryption] Decryption error:', error)
    throw new Error('Failed to decrypt data')
  }
}

export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 8)
}