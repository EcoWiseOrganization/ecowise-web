# EcoWise - Carbon Footprint Management Platform

EcoWise is a web platform that helps individuals and organizations measure, analyze, and reduce their carbon footprint. Built with Next.js 16 and Supabase.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **UI:** React 19, Tailwind CSS 4, MUI Icons
- **Authentication:** Supabase Auth (Email/Password + Google OAuth)
- **Database:** Supabase (PostgreSQL)
- **Email:** Nodemailer (OTP verification)

## Project Structure

```
src/
├── app/
│   ├── (public)/              # Landing page sections
│   │   └── _components/       # HeroSection, ServicesSection, PricingSection, ...
│   ├── (auth)/                # Authentication pages
│   │   ├── login/
│   │   ├── register/
│   │   │   ├── verify/        # OTP verification
│   │   │   └── success/
│   │   ├── forgot-password/
│   │   │   ├── verify/        # OTP verification
│   │   │   ├── reset/         # New password
│   │   │   └── success/
│   │   ├── callback/          # OAuth callback
│   │   └── _components/       # AuthLayout, AuthImage, OtpInput, ...
│   ├── (dashboard)/           # Protected dashboard area
│   │   ├── _components/       # Sidebar, cards, charts, ...
│   │   ├── _data/             # Mock data
│   │   └── (individual)/dashboard/
│   │       ├── reports/
│   │       ├── assets/
│   │       ├── targets/
│   │       ├── settings/
│   │       └── help/
│   └── api/auth/              # API routes (OTP send/verify, forgot password)
├── components/
│   ├── shared/                # Header, Footer
│   └── ui/                    # ScrollReveal, ...
├── hooks/                     # useAuth, useRegisterForm, useVerifyOtp, ...
├── services/                  # auth.actions.ts (server), auth.service.ts (client)
├── lib/supabase/              # Supabase clients (browser, server, admin, middleware)
├── types/                     # TypeScript type definitions
└── constants/                 # Navigation constants
```

## Architecture

The project follows a modular architecture with clear separation of concerns:

- **Page (UI)** - React components that render the interface
- **Hook (State + Logic)** - Custom hooks that manage state and orchestrate logic
- **Service (API)** - Centralized API calls and server actions

```
Page → Hook → Service
```

## Features

### Landing Page
- Hero section with CTA
- Partners bar, stats, services overview
- Step-by-step guide, pricing plans
- Mobile app promotion section
- Scroll-reveal animations

### Authentication
- Email/Password login & registration
- Google OAuth (Sign in with Google)
- OTP email verification for registration
- Forgot password flow (Email -> OTP -> Reset -> Success)
- Animated page transitions

### Dashboard
- Carbon footprint overview (Scope 1, 2, 3)
- Emission hotspots analysis
- Net zero progress tracking
- Intensity metrics
- Reporting compliance status
- Recent data entries
- Sidebar navigation

## Getting Started

### Prerequisites

- Node.js 18+
- npm / yarn / pnpm / bun

### Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_email_password
```

### Database Setup

Create the following tables in Supabase:

```sql
-- OTP verifications for registration
CREATE TABLE otp_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Team

EcoWise - SP26 / EXE1201
