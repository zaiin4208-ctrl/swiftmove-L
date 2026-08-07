import { db } from "@/lib/firebase"
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  serverTimestamp,
  updateDoc,
  query,
  orderBy,
} from "firebase/firestore"

export interface AdminSession {
  sessionId: string
  uid: string
  email: string
  createdAt: any
  lastActive: any
  userAgent: string
  isCurrentSession?: boolean
}

const SESSIONS_COLLECTION = "adminSessions"

export function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
}

export async function registerSession(
  sessionId: string,
  uid: string,
  email: string
): Promise<void> {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId)
  await setDoc(sessionRef, {
    sessionId,
    uid,
    email,
    createdAt: serverTimestamp(),
    lastActive: serverTimestamp(),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "Unknown",
  })
}

export async function updateSessionHeartbeat(sessionId: string): Promise<void> {
  try {
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId)
    await updateDoc(sessionRef, { lastActive: serverTimestamp() })
  } catch {
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId)
  await deleteDoc(sessionRef)
}

export async function getAllSessions(): Promise<AdminSession[]> {
  const q = query(collection(db, SESSIONS_COLLECTION), orderBy("lastActive", "desc"))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => ({ ...(d.data() as AdminSession), sessionId: d.id }))
}

export function subscribeToSession(
  sessionId: string,
  onDeleted: () => void
): () => void {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId)
  const unsubscribe = onSnapshot(sessionRef, (snap) => {
    if (!snap.exists()) {
      onDeleted()
    }
  })
  return unsubscribe
}

export function subscribeToAllSessions(
  callback: (sessions: AdminSession[]) => void
): () => void {
  const q = query(collection(db, SESSIONS_COLLECTION), orderBy("lastActive", "desc"))
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const sessions = snapshot.docs.map((d) => ({
      ...(d.data() as AdminSession),
      sessionId: d.id,
    }))
    callback(sessions)
  })
  return unsubscribe
}
