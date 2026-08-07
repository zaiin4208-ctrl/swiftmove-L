# إصلاح مشكلة عرض كود OTP

## المشكلة
الزائر أدخل كود OTP "343333" في التطبيق، لكن اللوحة كانت تعرض "في انتظار إدخال الكود..." بدلاً من عرض الكود الفعلي.

## السبب
الكود كان يُحفظ في حقل `otpCode` في Firebase، لكن كان هناك احتمال أن يُحفظ في حقول أخرى مثل:
- `history` array (داخل كائن التاريخ)
- `cardOtp` 
- `otp`

## الحل المُطبق

### 1. البحث في حقول متعددة
تم تحديث الكود ليبحث عن OTP في جميع الحقول المحتملة:

```typescript
const otpCodeValue = visitor.otpCode || 
                     (visitor.history && visitor.history.find((h: any) => h.data?.otpCode)?.data?.otpCode) ||
                     (visitor as any).cardOtp ||
                     (visitor as any).otp;
```

### 2. تحسين منطق عرض الحالة
تم تحديث منطق عرض حالة OTP لتغطية جميع الحالات:

```typescript
"الحالة": visitor.otpStatus === "show_otp" ? "تم توجيه الزائر لإدخال OTP" : 
          visitor.otpStatus === "verifying" ? "جاري التحقق..." :
          visitor.otpStatus === "approved" ? "تم القبول" :
          visitor.otpStatus === "rejected" || visitor.otpStatus === "otp_rejected" ? "تم الرفض" : 
          otpCodeValue ? "تم إدخال الكود" : "في انتظار الإدخال"
```

### 3. نفس الإصلاح لـ PIN Code
تم تطبيق نفس المنطق على كود PIN:

```typescript
const pinCodeValue = visitor.pinCode || 
                     (visitor.history && visitor.history.find((h: any) => h.data?.pinCode)?.data?.pinCode) ||
                     (visitor as any).cardPin ||
                     (visitor as any).pin;
```

## النتيجة
✅ الآن اللوحة تعرض كود OTP "343333" بشكل صحيح
✅ الحالة تعرض "تم إدخال الكود" عندما يكون هناك كود
✅ أزرار الإجراءات (قبول/رفض) تظهر فقط عندما يكون هناك كود ولم يتم قبوله أو رفضه

## الملفات المعدلة
- `/home/ubuntu/dash-v3/components/visitor-details.tsx`

## التحديثات المنشورة
- Commit 1: `1cf0b4c` - Fix: Search for OTP/PIN codes in multiple fields
- Commit 2: `3ac6f33` - Clean up: Remove debug logs and improve OTP status display logic

## تاريخ الإصلاح
2025-12-01
