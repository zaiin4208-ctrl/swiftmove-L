"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import { User, onAuthStateChanged } from "firebase/auth"
import { auth } from "./firebase"
import { useRouter } from "next/navigation"
import {
  generateSessionId,
  registerSession,
  updateSessionHeartbeat,
  deleteSession,
  subscribeToSession,
} from "./firebase/sessions"

const SESSION_STORAGE_KEY = "adminSessionId"

interface AuthContextType {
  user: User | null
  loading: boolean
  sessionId: string | null
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  sessionId: null,
  logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const router = useRouter()
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)
  const unsubscribeSessionRef = useRef<(() => void) | null>(null)
  const currentSessionIdRef = useRef<string | null>(null)

  const cleanupSession = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
    if (unsubscribeSessionRef.current) {
      unsubscribeSessionRef.current()
      unsubscribeSessionRef.current = null
    }
  }

  const startSession = async (firebaseUser: User) => {
    const existing = localStorage.getItem(SESSION_STORAGE_KEY)
    const sid = existing || generateSessionId()
    localStorage.setItem(SESSION_STORAGE_KEY, sid)
    currentSessionIdRef.current = sid
    setSessionId(sid)

    await registerSession(sid, firebaseUser.uid, firebaseUser.email || "")

    heartbeatRef.current = setInterval(() => {
      if (currentSessionIdRef.current) {
        updateSessionHeartbeat(currentSessionIdRef.current)
      }
    }, 60 * 1000)

    unsubscribeSessionRef.current = subscribeToSession(sid, async () => {
      cleanupSession()
      localStorage.removeItem(SESSION_STORAGE_KEY)
      currentSessionIdRef.current = null
      setSessionId(null)
      await auth.signOut()
      router.push("/login")
    })
  }

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        setLoading(false)
        await startSession(firebaseUser)
      } else {
        cleanupSession()
        setUser(null)
        setLoading(false)
        currentSessionIdRef.current = null
        setSessionId(null)
      }
    })

    return () => {
      unsubscribeAuth()
      cleanupSession()
    }
  }, [])

  const logout = async () => {
    try {
      const sid = currentSessionIdRef.current
      cleanupSession()
      if (sid) {
        localStorage.removeItem(SESSION_STORAGE_KEY)
        await deleteSession(sid)
      }
      currentSessionIdRef.current = null
      setSessionId(null)
      await auth.signOut()
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, sessionId, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
