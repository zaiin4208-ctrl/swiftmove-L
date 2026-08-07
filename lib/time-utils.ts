/**
 * Convert timestamp to Arabic "time ago" format
 * @param timestamp - Date object or Firestore timestamp
 * @returns Arabic string like "منذ 5 ثوانٍ" or "منذ دقيقتين"
 */
export function getTimeAgo(timestamp: Date | any): string {
  let date: Date
  
  // Handle Firestore timestamp
  if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
    date = timestamp.toDate()
  } else if (timestamp instanceof Date) {
    date = timestamp
  } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    date = new Date(timestamp)
  } else {
    return 'منذ لحظات'
  }
  
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  // Seconds
  if (diffSeconds < 60) {
    if (diffSeconds <= 1) return 'الآن'
    if (diffSeconds === 2) return 'منذ ثانيتين'
    if (diffSeconds <= 10) return `منذ ${diffSeconds} ثوانٍ`
    return `منذ ${diffSeconds} ثانية`
  }
  
  // Minutes
  if (diffMinutes < 60) {
    if (diffMinutes === 1) return 'منذ دقيقة'
    if (diffMinutes === 2) return 'منذ دقيقتين'
    if (diffMinutes <= 10) return `منذ ${diffMinutes} دقائق`
    return `منذ ${diffMinutes} دقيقة`
  }
  
  // Hours
  if (diffHours < 24) {
    if (diffHours === 1) return 'منذ ساعة'
    if (diffHours === 2) return 'منذ ساعتين'
    if (diffHours <= 10) return `منذ ${diffHours} ساعات`
    return `منذ ${diffHours} ساعة`
  }
  
  // Days
  if (diffDays === 1) return 'منذ يوم'
  if (diffDays === 2) return 'منذ يومين'
  if (diffDays <= 10) return `منذ ${diffDays} أيام`
  if (diffDays <= 30) return `منذ ${diffDays} يوم`
  
  // Months
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths === 1) return 'منذ شهر'
  if (diffMonths === 2) return 'منذ شهرين'
  if (diffMonths <= 10) return `منذ ${diffMonths} أشهر`
  if (diffMonths < 12) return `منذ ${diffMonths} شهر`
  
  // Years
  const diffYears = Math.floor(diffDays / 365)
  if (diffYears === 1) return 'منذ سنة'
  if (diffYears === 2) return 'منذ سنتين'
  return `منذ ${diffYears} سنوات`
}
