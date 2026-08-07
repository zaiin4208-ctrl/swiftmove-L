export type CardScheme =
  | "VISA"
  | "MASTERCARD"
  | "AMEX"
  | "DISCOVER"
  | "MADA"
  | "JCB"
  | "DINERS"
  | "UNIONPAY";

type LocalBinRecord = {
  name: string;
  country: string;
  alpha2?: string;
  language?: string;
  level?: string;
  type?: string;
  currency?: string;
  scheme?: CardScheme;
};

const MADA_BINS = [
  "508160",
  "508161",
  "508162",
  "508163",
  "508164",
  "508165",
  "508166",
  "508167",
  "508168",
  "508169",
  "529415",
  "529416",
  "529417",
  "529418",
  "529419",
  "535825",
  "535826",
  "535827",
  "535828",
  "535829",
  "543357",
  "543358",
  "543359",
  "549760",
  "549761",
  "549762",
  "549763",
  "585265",
  "585266",
  "585267",
  "585268",
  "604906",
  "636120",
];

const LOCAL_BIN_DATABASE: Record<string, LocalBinRecord> = {
  "508160": {
    name: "البنك الأهلي التجاري (NCB)",
    country: "SAUDI ARABIA",
    alpha2: "SA",
    language: "ar",
    type: "DEBIT",
    currency: "SAR",
    scheme: "MADA",
  },
  "529415": {
    name: "مصرف الراجحي",
    country: "SAUDI ARABIA",
    alpha2: "SA",
    language: "ar",
    type: "DEBIT",
    currency: "SAR",
    scheme: "MADA",
  },
  "535825": {
    name: "بنك الرياض",
    country: "SAUDI ARABIA",
    alpha2: "SA",
    language: "ar",
    type: "DEBIT",
    currency: "SAR",
    scheme: "MADA",
  },
  "543357": {
    name: "بنك ساب",
    country: "SAUDI ARABIA",
    alpha2: "SA",
    language: "ar",
    type: "DEBIT",
    currency: "SAR",
    scheme: "MADA",
  },
  "604906": {
    name: "بنك البلاد",
    country: "SAUDI ARABIA",
    alpha2: "SA",
    language: "ar",
    type: "DEBIT",
    currency: "SAR",
    scheme: "MADA",
  },
  "636120": {
    name: "بنك الجزيرة",
    country: "SAUDI ARABIA",
    alpha2: "SA",
    language: "ar",
    type: "DEBIT",
    currency: "SAR",
    scheme: "MADA",
  },
  "411111": {
    name: "Visa",
    country: "International",
    alpha2: "INT",
    language: "en",
    type: "CREDIT",
    scheme: "VISA",
  },
  "400000": {
    name: "Visa",
    country: "International",
    alpha2: "INT",
    language: "en",
    type: "CREDIT",
    scheme: "VISA",
  },
  "510000": {
    name: "Mastercard",
    country: "International",
    alpha2: "INT",
    language: "en",
    type: "CREDIT",
    scheme: "MASTERCARD",
  },
  "543210": {
    name: "Mastercard",
    country: "International",
    alpha2: "INT",
    language: "en",
    type: "CREDIT",
    scheme: "MASTERCARD",
  },
};

export function normalizeCardNumber(value?: string | null): string {
  return (value || "").replace(/\D/g, "");
}

function lookupBinRecord(bin: string): LocalBinRecord | null {
  if (!bin) return null;
  if (LOCAL_BIN_DATABASE[bin]) return LOCAL_BIN_DATABASE[bin];

  const partialBin = bin.slice(0, 4);
  for (const [key, value] of Object.entries(LOCAL_BIN_DATABASE)) {
    if (key.startsWith(partialBin)) {
      return value;
    }
  }

  return null;
}

export function detectCardScheme(value?: string | null): CardScheme | null {
  const cleanNumber = normalizeCardNumber(value);
  if (!cleanNumber) return null;

  for (const bin of MADA_BINS) {
    if (cleanNumber.startsWith(bin)) {
      return "MADA";
    }
  }

  if (/^4/.test(cleanNumber)) return "VISA";
  if (
    /^5[1-5]/.test(cleanNumber) ||
    /^2(22[1-9]|2[3-9]|[3-6]|7[01]|720)/.test(cleanNumber)
  ) {
    return "MASTERCARD";
  }
  if (/^3[47]/.test(cleanNumber)) return "AMEX";
  if (/^6011|^622[1-9]|^64[4-9]|^65/.test(cleanNumber)) return "DISCOVER";
  if (/^35[2-8]/.test(cleanNumber)) return "JCB";
  if (/^3[068]|^30[0-5]/.test(cleanNumber)) return "DINERS";
  if (/^62/.test(cleanNumber)) return "UNIONPAY";

  return null;
}

export function getCardTypeLabel(
  value?: string | CardScheme | null,
): string | null {
  if (!value) return null;

  const scheme =
    typeof value === "string" && /\d/.test(value)
      ? detectCardScheme(value)
      : (String(value).toUpperCase() as CardScheme);

  switch (scheme) {
    case "VISA":
      return "Visa";
    case "MASTERCARD":
      return "Mastercard";
    case "AMEX":
      return "Amex";
    case "DISCOVER":
      return "Discover";
    case "MADA":
      return "Mada";
    case "JCB":
      return "JCB";
    case "DINERS":
      return "Diners";
    case "UNIONPAY":
      return "UnionPay";
    default:
      return null;
  }
}

export function inferCardMeta(cardNumber?: string | null) {
  const cleanNumber = normalizeCardNumber(cardNumber);
  if (!cleanNumber) return null;

  const bin = cleanNumber.slice(0, 6);
  const record = lookupBinRecord(bin);
  const scheme = record?.scheme || detectCardScheme(cleanNumber);
  const typeLabel = getCardTypeLabel(scheme);
  const bankCountry =
    record?.country || (scheme === "MADA" ? "SAUDI ARABIA" : "");
  const alpha2 =
    record?.alpha2 || (bankCountry === "SAUDI ARABIA" ? "SA" : "");
  const language =
    record?.language || (bankCountry === "SAUDI ARABIA" ? "ar" : "en");
  const paymentType = record?.type || (scheme === "MADA" ? "DEBIT" : "");
  const currency =
    record?.currency || (bankCountry === "SAUDI ARABIA" ? "SAR" : "");
  const bankName =
    record?.name || (scheme === "MADA" ? "بنك سعودي" : typeLabel || "");

  return {
    cleanNumber,
    bin,
    scheme,
    typeLabel,
    level: record?.level || "",
    bankName,
    bankCountry,
    alpha2,
    language,
    paymentType,
    currency,
  };
}

export function buildBinLookupResponse(cardNumber?: string | null) {
  const meta = inferCardMeta(cardNumber);
  if (!meta?.bin) return null;

  return {
    BIN: {
      valid: Boolean(meta.scheme || meta.bankName),
      number: Number(meta.bin),
      scheme: meta.scheme || "",
      brand: meta.scheme || "",
      type: meta.paymentType || "",
      level: meta.level || "",
      currency: meta.currency || "",
      issuer: {
        name: meta.bankName || "",
      },
      country: {
        country: meta.bankCountry || "غير معروف",
        alpha2: meta.alpha2 || "--",
        language: meta.language || "en",
      },
    },
  };
}
