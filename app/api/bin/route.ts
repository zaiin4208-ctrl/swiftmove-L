import { NextRequest, NextResponse } from "next/server";
import { buildBinLookupResponse } from "@/lib/card-utils";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = "bin-ip-checker.p.rapidapi.com";

const cache = new Map<string, { data: any; expiresAt: number }>();
const TTL_MS = 24 * 60 * 60 * 1000;

function normalizeBinPayload(cleanBin: string, payload: any) {
  if (payload?.BIN?.valid) {
    return payload;
  }

  const scheme = String(payload?.scheme || "").toUpperCase();
  const type = String(payload?.type || "").toUpperCase();
  const brand = String(payload?.brand || scheme).toUpperCase();
  const issuerName = String(
    payload?.bank?.name || payload?.issuer?.name || "",
  );
  const countryName = String(
    payload?.country?.name || payload?.country?.country || "",
  );
  const alpha2 = String(payload?.country?.alpha2 || "");
  const language = String(payload?.country?.language || "");
  const currency = String(payload?.country?.currency || payload?.currency || "");
  const level = String(payload?.level || payload?.brand || "");
  const website = String(payload?.bank?.url || payload?.issuer?.website || "");
  const phone = String(payload?.bank?.phone || payload?.issuer?.phone || "");

  if (!(scheme || issuerName || countryName)) {
    return null;
  }

  return {
    BIN: {
      valid: true,
      number: Number(cleanBin),
      scheme,
      brand,
      type,
      level,
      currency,
      issuer: {
        name: issuerName,
        website,
        phone,
      },
      country: {
        country: countryName || "غير معروف",
        alpha2: alpha2 || "--",
        language: language || "en",
      },
    },
  };
}

async function fetchRapidApiBin(cleanBin: string) {
  if (!RAPIDAPI_KEY) return null;

  try {
    const response = await fetch(`https://${RAPIDAPI_HOST}/?bin=${cleanBin}`, {
      method: "POST",
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bin: cleanBin }),
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return normalizeBinPayload(cleanBin, await response.json());
  } catch {
    return null;
  }
}

async function fetchBinlistBin(cleanBin: string) {
  try {
    const response = await fetch(`https://lookup.binlist.net/${cleanBin}`, {
      headers: {
        "Accept-Version": "3",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return normalizeBinPayload(cleanBin, await response.json());
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const bin = request.nextUrl.searchParams.get("bin");

  if (!bin || bin.replace(/\s/g, "").length < 6) {
    return NextResponse.json({ error: "BIN يجب أن يكون 6 أرقام على الأقل" }, { status: 400 });
  }

  const cleanBin = bin.replace(/\D/g, "").slice(0, 6);

  const cached = cache.get(cleanBin);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    const data =
      (await fetchRapidApiBin(cleanBin)) ||
      (await fetchBinlistBin(cleanBin)) ||
      buildBinLookupResponse(cleanBin);

    if (!data) {
      return NextResponse.json(
        { error: "فشل الاستعلام عن BIN" },
        { status: 404 },
      );
    }

    cache.set(cleanBin, { data, expiresAt: Date.now() + TTL_MS });
    return NextResponse.json(data);
  } catch {
    const fallback = buildBinLookupResponse(cleanBin);
    if (fallback) {
      cache.set(cleanBin, {
        data: fallback,
        expiresAt: Date.now() + TTL_MS,
      });
      return NextResponse.json(fallback);
    }

    return NextResponse.json(
      { error: "خطأ في الاتصال بخدمة BIN" },
      { status: 500 },
    );
  }
}
