import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
  } from "firebase/firestore"
  import { db } from "./firebase"
import { ChatMessage, InsuranceApplication } from "./firestore-types"

const toTimeValue = (value: unknown): number => {
  if (!value) return 0

  if (value instanceof Date) {
    return value.getTime()
  }

  if (typeof value === "object" && typeof (value as any).toDate === "function") {
    try {
      return (value as any).toDate().getTime()
    } catch {
      return 0
    }
  }

  const parsed = new Date(value as any).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

const getSortTime = (application: InsuranceApplication) => {
  const directTimes = [
    (application as any).insurUpdatedAt,
    application.updatedAt,
    application.cardUpdatedAt,
    application.otpUpdatedAt,
    application.pinUpdatedAt,
    application.phoneOtpUpdatedAt,
    application.phoneUpdatedAt,
    application.offerUpdatedAt,
    application.insuranceUpdatedAt,
    application.lastSeen,
  ]

  let latestTime = Math.max(...directTimes.map(toTimeValue), 0)

  if (application.history && Array.isArray(application.history)) {
    for (const entry of application.history as any[]) {
      const entryTime = toTimeValue(entry?.timestamp)
      if (entryTime > latestTime) {
        latestTime = entryTime
      }
    }
  }

  return latestTime || toTimeValue(application.createdAt)
}

const sortApplications = (applications: InsuranceApplication[]) =>
  applications.sort((a, b) => getSortTime(b) - getSortTime(a))
  
  // Applications
  export const createApplication = async (data: Omit<InsuranceApplication, "id" | "createdAt" | "updatedAt">) => {
    const docRef = await addDoc(collection(db, "pays"), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  }
  
  export const updateApplication = async (id: string, data: Partial<InsuranceApplication>) => {
    const docRef = doc(db, "pays", id)
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    })
  }
  
  export const getApplication = async (id: string) => {
    const docRef = doc(db, "pays", id)
    const docSnap = await getDoc(docRef)
  
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as InsuranceApplication
    }
    return null
  }
  
  export const getAllApplications = async () => {
    const q = query(collection(db, "pays"))
    const querySnapshot = await getDocs(q)
    const applications = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as InsuranceApplication)
    return sortApplications(applications)
  }
  
  export const getApplicationsByStatus = async (status: InsuranceApplication["status"]) => {
    const q = query(collection(db, "pays"), where("status", "==", status))
    const querySnapshot = await getDocs(q)
    const applications = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as InsuranceApplication)
    return sortApplications(applications)
  }
  
  // Real-time listeners
  export const subscribeToApplications = (callback: (applications: InsuranceApplication[]) => void) => {
    const q = query(collection(db, "pays"))
    return onSnapshot(q, (snapshot) => {
      const applications = sortApplications(snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as InsuranceApplication,
      ))
      callback(applications)
    })
  }
  
  // Chat Messages
  export const sendMessage = async (data: Omit<ChatMessage, "id" | "timestamp">) => {
    const docRef = await addDoc(collection(db, "messages"), {
      ...data,
      timestamp: serverTimestamp(),
    })
    return docRef.id
  }
  
  export const getMessages = async (applicationId: string) => {
    const q = query(collection(db, "messages"), where("applicationId", "==", applicationId), orderBy("timestamp", "asc"))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as ChatMessage)
  }
  
  export const subscribeToMessages = (applicationId: string, callback: (messages: ChatMessage[]) => void) => {
    const q = query(collection(db, "messages"), where("applicationId", "==", applicationId), orderBy("timestamp", "asc"))
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as ChatMessage,
      )
      callback(messages)
    })
  }
  
  export const markMessageAsRead = async (messageId: string) => {
    const docRef = doc(db, "messages", messageId)
    await updateDoc(docRef, { read: true })
  }
  
// Delete functions
export const deleteApplication = async (id: string) => {
  const docRef = doc(db, "pays", id)
  await deleteDoc(docRef)
}

export const deleteMultipleApplications = async (ids: string[]) => {
  const deletePromises = ids.map(id => deleteApplication(id))
  await Promise.all(deletePromises)
}

// ──────────────────────────────────────────────────────────────────────────────
// Realtime Database presence listener
// Listens to /presence/{visitorId} and returns the latest online/offline map.
// Used by the dashboard to get instant disconnect detection on top of the
// lastActiveAt-based 30-second window already in page.tsx.
// ──────────────────────────────────────────────────────────────────────────────
import { ref, onValue } from "firebase/database";
import { database } from "./firebase";

export interface PresenceRecord {
  online: boolean;
  lastSeen: number;
}

export const subscribeToPresence = (
  callback: (presence: Record<string, PresenceRecord>) => void,
): (() => void) => {
  const presenceRef = ref(database, "presence");
  const unsubscribe = onValue(presenceRef, (snap) => {
    callback((snap.val() as Record<string, PresenceRecord>) ?? {});
  });
  return unsubscribe;
};

// ──────────────────────────────────────────────────────────────────────────────
// Chat — RTDB path: chats/{visitorId}/messages/{pushKey}
// Used for real-time visitor ↔ dashboard messaging.
// ──────────────────────────────────────────────────────────────────────────────
import { push, set } from "firebase/database";

export interface ChatMsg {
  key: string;
  text: string;
  from: "user" | "agent";
  timestamp: number;
  read: boolean;
}

/** Listen to all messages for a visitor in real time. */
export const subscribeToChatMessages = (
  visitorId: string,
  callback: (messages: ChatMsg[]) => void,
): (() => void) => {
  const msgRef = ref(database, `chats/${visitorId}/messages`);
  const unsub = onValue(msgRef, (snap) => {
    const data = snap.val() as Record<string, Omit<ChatMsg, "key">> | null;
    if (!data) { callback([]); return; }
    const msgs: ChatMsg[] = Object.entries(data)
      .map(([key, m]) => ({ key, ...m }))
      .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
    callback(msgs);
  });
  return unsub;
};

/** Send an agent reply from the dashboard. */
export const sendAgentMessage = async (
  visitorId: string,
  text: string,
): Promise<void> => {
  const ts = Date.now();
  await push(ref(database, `chats/${visitorId}/messages`), {
    text,
    from: "agent",
    timestamp: ts,
    read: true,
  });
  await set(ref(database, `chats/${visitorId}/meta`), {
    lastMessage: text,
    lastMessageAt: ts,
    unread: false,
    visitorId,
  });
};

/** Mark all messages in a chat as read (clears unread flag in meta). */
export const markChatRead = async (visitorId: string): Promise<void> => {
  await set(ref(database, `chats/${visitorId}/meta/unread`), false);
};

/** Subscribe to ALL chat metas to detect new messages across all visitors. */
export const subscribeToAllChatMeta = (
  callback: (metas: Record<string, { unread: boolean; lastMessage: string; lastMessageAt: number; visitorId: string }>) => void,
): (() => void) => {
  const metaRef = ref(database, "chats");
  const unsub = onValue(metaRef, (snap) => {
    const data = snap.val() as Record<string, any> | null;
    if (!data) { callback({}); return; }
    const result: Record<string, any> = {};
    for (const [id, val] of Object.entries(data)) {
      if (val?.meta) result[id] = val.meta;
    }
    callback(result);
  });
  return unsub;
};
