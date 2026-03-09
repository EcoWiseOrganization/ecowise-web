# EcoWise - Carbon Footprint Management Platform

EcoWise is a web platform that helps individuals and organizations measure, analyze, and reduce their carbon footprint. Built with Next.js 16 and Supabase.

## Tech Stack

| Category           | Technology                              |
| ------------------ | --------------------------------------- |
| **Framework**      | Next.js 16 (App Router)                 |
| **Language**       | TypeScript                              |
| **UI**             | React 19, Tailwind CSS 4, MUI Icons     |
| **Authentication** | Supabase Auth (Email/Password + Google) |
| **Database**       | Supabase (PostgreSQL)                   |
| **HTTP Client**    | Axios                                   |
| **Email**          | Nodemailer (SMTP)                       |

## Architecture

The project follows a modular architecture with clear separation of concerns:

```
Page (UI) → Hook (State + Logic) → Service (API / Server Action)
```

| Layer       | Responsibility                                 | Location          |
| ----------- | ---------------------------------------------- | ----------------- |
| **Page**    | Render UI, handle user interaction              | `app/**/page.tsx` |
| **Hook**    | Manage state, orchestrate logic, call services  | `hooks/`          |
| **Service** | API calls (client) & server actions (server)    | `services/`       |
| **Lib**     | Supabase clients, utilities                     | `lib/`            |
| **Type**    | Shared TypeScript interfaces & types            | `types/`          |

## Project Structure

```
src/
├── app/
│   ├── (public)/                        # Landing page
│   │   └── _components/                 # HeroSection, PricingSection, ...
│   │
│   ├── (auth)/                          # Authentication flows
│   │   ├── _components/                 # AuthLayout, AuthImage, OtpInput, ...
│   │   ├── login/
│   │   ├── register/
│   │   │   ├── verify/                  # OTP verification
│   │   │   └── success/
│   │   ├── forgot-password/
│   │   │   ├── verify/                  # OTP verification
│   │   │   ├── reset/                   # New password
│   │   │   └── success/
│   │   └── callback/                    # OAuth callback
│   │
│   ├── (dashboard)/                     # Protected area
│   │   ├── _components/                 # Shared: Sidebar, cards, charts, ...
│   │   ├── _data/                       # Mock data
│   │   ├── (individual)/               # User dashboard
│   │   │   ├── _config/menu.ts
│   │   │   ├── _components/
│   │   │   └── dashboard/
│   │   │       ├── reports/
│   │   │       ├── assets/
│   │   │       ├── targets/
│   │   │       ├── settings/
│   │   │       └── help/
│   │   ├── admin/                       # Admin dashboard
│   │   │   ├── _config/menu.ts
│   │   │   ├── _components/            # PageHeader, StatsCard, UserTable
│   │   │   ├── users/
│   │   │   └── settings/
│   │   └── organization/               # Organization dashboard (planned)
│   │
│   └── api/auth/                        # API routes
│       ├── send-otp/
│       ├── verify-otp/
│       └── forgot-password/
│           ├── send-otp/
│           ├── verify-otp/
│           └── reset/
│
├── components/
│   ├── shared/                          # Header, Footer
│   └── ui/                              # ScrollReveal, ...
│
├── hooks/                               # Custom hooks
│   ├── useAuth.ts
│   ├── useRegisterForm.ts
│   ├── useVerifyOtp.ts
│   ├── useForgotPassword.ts
│   ├── useForgotPasswordVerify.ts
│   └── useResetPassword.ts
│
├── services/                            # API & server actions
│   ├── auth.actions.ts                  # Server actions (login, register, OAuth)
│   ├── auth.service.ts                  # Client HTTP calls (OTP, reset)
│   ├── user.service.ts                  # User CRUD operations
│   └── event.service.ts                 # Event operations
│
├── lib/
│   ├── utils.ts
│   └── supabase/
│       ├── client.ts                    # Browser client
│       ├── server.ts                    # Server client
│       ├── admin.ts                     # Admin client (service role)
│       └── middleware.ts                # Middleware client
│
├── types/
│   ├── api.types.ts                     # API response types
│   ├── business.types.ts                # Domain models
│   └── database.types.ts               # Supabase generated types
│
├── constants/
│   └── navigation.ts                    # Nav items config
│
└── store/                               # State management (planned)
```

## Modules

### Public Module (`app/(public)/`)

Landing page with scroll-reveal animations:

- Hero section with CTA
- Partners bar & stats
- Services overview & step-by-step guide
- Pricing plans
- Mobile app promotion

### Auth Module (`app/(auth)/`)

Complete authentication system:

- Email/Password login & registration
- Google OAuth (Sign in with Google)
- OTP email verification (registration & forgot password)
- Forgot password flow: Email → OTP → Reset → Success
- Animated page transitions
- Role-based redirect (user → `/dashboard`, admin → `/admin`)

### Dashboard Module (`app/(dashboard)/`)

Protected area with role-based access:

#### Individual Dashboard (`(individual)/dashboard/`)

- Carbon footprint overview (Scope 1, 2, 3)
- Emission hotspots analysis
- Net zero progress tracking
- Intensity metrics & reporting compliance
- Reports, Assets, Targets, Settings, Help pages

#### Admin Dashboard (`admin/`)

- User management (list, stats, actions)
- Admin settings
- Stats overview cards

#### Organization Dashboard (`organization/`) — Planned

### Services Module (`services/`)

| File                | Type            | Description                          |
| ------------------- | --------------- | ------------------------------------ |
| `auth.actions.ts`   | Server Actions  | Login, register, OAuth, logout       |
| `auth.service.ts`   | Client HTTP     | OTP send/verify, password reset      |
| `user.service.ts`   | Client HTTP     | User CRUD, admin operations          |
| `event.service.ts`  | Client HTTP     | Event operations                     |

### Supabase Module (`lib/supabase/`)

| Client         | Usage                                    |
| -------------- | ---------------------------------------- |
| `client.ts`    | Browser-side queries (public/auth pages) |
| `server.ts`    | Server Components & Route Handlers       |
| `admin.ts`     | Privileged operations (service role key) |
| `middleware.ts` | Session refresh in middleware            |

## Database Schema

| Table                | Key Columns                                                              |
| -------------------- | ------------------------------------------------------------------------ |
| `users`              | id, email, full_name, user_name, is_admin, status, green_points         |
| `otp_verifications`  | email, otp_code, expires_at                                              |

## Getting Started

### Prerequisites

- Node.js 18+
- npm / yarn / pnpm / bun

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_email_password
```

### Installation & Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Author

Nguyen Vu Dang Khanh x Nguyen Dang Khoi
