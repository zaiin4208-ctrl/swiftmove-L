# Emad BeCare Dashboard

## Overview
A Next.js dashboard application with Firebase integration for real-time data management. The app features visitor tracking, analytics, and user authentication.

## Tech Stack
- **Framework**: Next.js 15.5.x
- **Language**: TypeScript
- **Styling**: Tailwind CSS 3.4 with tailwindcss-animate
- **Database**: Firebase/Firestore
- **Authentication**: Firebase Auth
- **Analytics**: Google Analytics Data API

## Project Structure
```
app/
├── api/analytics/    # Analytics API routes
├── login/           # Login page
├── page.tsx         # Main dashboard
└── layout.tsx       # Root layout with globals
components/          # React components
├── dashboard-header.tsx
├── protected-route.tsx
├── settings-modal.tsx
├── visitor-*.tsx    # Visitor-related components
lib/
├── firebase/        # Firebase configuration
├── auth-context.tsx # Authentication context
└── *.ts            # Utility functions
```

## Development
- **Dev Server**: `npm run dev` (runs on port 5000)
- **Build**: `npm run build`
- **Start**: `npm run start`

## Configuration
- Next.js configured with `allowedDevOrigins` for Replit proxy support
- PostCSS configured with tailwindcss and autoprefixer

## Recent Changes
- 2026-02-06: Added PDF generation for visitors
  - Added html2pdf.js for PDF generation with Arabic RTL support
  - Created lib/generate-pdf.ts with beautiful styled PDF template
  - Added "تحميل PDF" button in visitor details header
  - PDF includes all visitor sections: basic info, vehicle, insurance offer, payment/card history, OTP, PIN, phone, Nafad, Rajhi, metadata
  - Encrypted fields are decrypted before inclusion in PDF
- 2026-01-09: Initial Replit setup
  - Downgraded Next.js 16 to 15 for better stability (Turbopack compatibility)
  - Downgraded Tailwind CSS 4 to 3.4 for compatibility with existing config
  - Removed duplicate config files (next.config.js, postcss.config.js)
  - Added tailwindcss-animate package
  - Configured allowedDevOrigins for Replit proxy
