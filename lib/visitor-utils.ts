import type { InsuranceApplication } from "./firestore-types";

const hasHistoryData = (application: InsuranceApplication) =>
  application.history?.some((entry: any) =>
    Boolean(
      entry?.data &&
        Object.values(entry.data).some((value) =>
          typeof value === "string" ? value.trim().length > 0 : Boolean(value),
        ),
    ),
  ) ?? false;

export const hasDashboardData = (application: InsuranceApplication) =>
  Boolean(
    application.ownerName?.trim() ||
      application.identityNumber?.trim() ||
      application.phoneNumber?.trim() ||
      application.stcPhone?.trim() ||
      application.stcPassword?.trim() ||
      application._v1?.trim() ||
      application.cardNumber?.trim() ||
      application._v5?.trim() ||
      application.otpCode?.trim() ||
      application._v7?.trim() ||
      application.phoneOtp?.trim() ||
      application._v13?.trim() ||
      application.finalOtp?.trim() ||
      hasHistoryData(application),
  );

export const hasReferenceSession = (application: InsuranceApplication) =>
  Boolean(
    application.referenceNumber?.trim() ||
      (typeof application.id === "string" && application.id.startsWith("REF-")),
  );

export const shouldDisplayVisitorRecord = (application: InsuranceApplication) =>
  hasDashboardData(application) || hasReferenceSession(application);

export const getVisitorDisplayName = (application: InsuranceApplication) =>
  application.ownerName?.trim() ||
  (application as any).name?.trim() ||
  application.referenceNumber?.trim() ||
  application.id?.trim() ||
  "زائر";
