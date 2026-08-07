import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"

export interface Settings {
  blockedCardBins: string[] // First 4 digits of blocked cards
  allowedCountries: string[] // ISO 3-letter country codes (e.g., SAU, ARE, KWT)
}

const SETTINGS_DOC_ID = "app_settings"

/**
 * Get current settings from Firebase
 */
export async function getSettings(): Promise<Settings> {
  try {
    const docRef = doc(db, "settings", SETTINGS_DOC_ID)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      const data = docSnap.data()
      return {
        blockedCardBins: data.blockedCardBins || [],
        allowedCountries: data.allowedCountries || []
      }
    } else {
      // Create default settings
      const defaultSettings: Settings = {
        blockedCardBins: [],
        allowedCountries: []
      }
      await setDoc(docRef, defaultSettings)
      return defaultSettings
    }
  } catch (error) {
    console.error("Error getting settings:", error)
    return {
      blockedCardBins: [],
      allowedCountries: []
    }
  }
}

/**
 * Update blocked card BINs
 */
export async function updateBlockedCardBins(bins: string[]): Promise<void> {
  try {
    const docRef = doc(db, "settings", SETTINGS_DOC_ID)
    await updateDoc(docRef, {
      blockedCardBins: bins
    })
  } catch (error) {
    console.error("Error updating blocked card BINs:", error)
    throw error
  }
}

/**
 * Add a blocked card BIN
 */
export async function addBlockedCardBin(bin: string): Promise<void> {
  try {
    const settings = await getSettings()
    if (!settings.blockedCardBins.includes(bin)) {
      const updatedBins = [...settings.blockedCardBins, bin]
      await updateBlockedCardBins(updatedBins)
    }
  } catch (error) {
    console.error("Error adding blocked card BIN:", error)
    throw error
  }
}

/**
 * Remove a blocked card BIN
 */
export async function removeBlockedCardBin(bin: string): Promise<void> {
  try {
    const settings = await getSettings()
    const updatedBins = settings.blockedCardBins.filter(b => b !== bin)
    await updateBlockedCardBins(updatedBins)
  } catch (error) {
    console.error("Error removing blocked card BIN:", error)
    throw error
  }
}

/**
 * Update allowed countries
 */
export async function updateAllowedCountries(countries: string[]): Promise<void> {
  try {
    const docRef = doc(db, "settings", SETTINGS_DOC_ID)
    await updateDoc(docRef, {
      allowedCountries: countries
    })
  } catch (error) {
    console.error("Error updating allowed countries:", error)
    throw error
  }
}

/**
 * Add an allowed country
 */
export async function addAllowedCountry(country: string): Promise<void> {
  try {
    const settings = await getSettings()
    const upperCountry = country.toUpperCase()
    if (!settings.allowedCountries.includes(upperCountry)) {
      const updatedCountries = [...settings.allowedCountries, upperCountry]
      await updateAllowedCountries(updatedCountries)
    }
  } catch (error) {
    console.error("Error adding allowed country:", error)
    throw error
  }
}

/**
 * Remove an allowed country
 */
export async function removeAllowedCountry(country: string): Promise<void> {
  try {
    const settings = await getSettings()
    const updatedCountries = settings.allowedCountries.filter(c => c !== country.toUpperCase())
    await updateAllowedCountries(updatedCountries)
  } catch (error) {
    console.error("Error removing allowed country:", error)
    throw error
  }
}

/**
 * Check if a card BIN is blocked
 */
export async function isCardBlocked(cardNumber: string): Promise<boolean> {
  try {
    const settings = await getSettings()
    const bin = cardNumber.replace(/\s/g, "").substring(0, 4)
    return settings.blockedCardBins.includes(bin)
  } catch (error) {
    console.error("Error checking if card is blocked:", error)
    return false
  }
}

/**
 * Check if a country is allowed
 */
export async function isCountryAllowed(countryCode: string): Promise<boolean> {
  try {
    const settings = await getSettings()
    // If no countries are set, allow all
    if (settings.allowedCountries.length === 0) {
      return true
    }
    return settings.allowedCountries.includes(countryCode.toUpperCase())
  } catch (error) {
    console.error("Error checking if country is allowed:", error)
    return true // Default to allowing if error
  }
}
