# OurDiary 💕

> A modern, private, playful relationship web application built for exactly two partners. Capture relationship milestones, travel along the animated toy train journey, share memories, exchange wax-sealed time-capsule letters, and keep private notes.

---

## 🌟 Architecture & Operating Modes

OurDiary operates in two distinct, seamlessly supported modes:

1. **Local Demo Mode (Default, Zero-Setup)**:
   - If no external database or Cloudinary keys are supplied, OurDiary runs locally using rich mock data and browser `localStorage`.
   - Includes a **Simulated Profile Switcher** (Alex / Maya) allowing you to test dual viewpoints, private notes isolation, the animated SVG toy train journey, and monthly calendar immediately.
   - **No accounts, credit cards, or external services are needed** to explore all features.

2. **Connected Cloud Mode (Production-Ready)**:
   - Uses **Supabase PostgreSQL** with strict **Row Level Security (RLS)**.
   - Uses **Supabase Auth** with invite-only onboarding for exactly two approved partners.
   - Uses **Cloudinary** with short-lived **Server-Signed Uploads** (`/api/media/sign-upload`) and server-managed asset lifecycle.
   - Uses **Supabase Realtime** to sync shared memories, events, and notes across both partners' devices.

---

## 🚀 Quick Start (Local Demo Mode)

To run the app immediately in local demo mode:

```bash
# 1. Install dependencies
npm install

# 2. Run the security & authorization test suite
npm test

# 3. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

- Visit [`/login`](http://localhost:3000/login) and click **"Sign in as Alex"** or **"Sign in as Maya"** to test simulated profile switching.
- On any memory detail page, create a **Private Note** under Alex. Switch profiles to Maya and observe that Alex's private note is completely inaccessible.

---

## 🔒 Owner Setup Guide: Connecting Supabase & Cloudinary

When you are ready to connect real cloud services so both partners can log in from their own phones or laptops:

### Step 1: Environment Variables Setup

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Open `.env.local`. **Never commit `.env.local` to Git.** (It is already included in `.gitignore`).

---

### Step 2: Supabase Project Setup

1. Create a free account at [Supabase.com](https://supabase.com) and click **"New Project"**.
2. **Find API Credentials**:
   - In your Supabase Dashboard, navigate to **Project Settings** (gear icon) -> **API**.
   - Copy **Project URL** into `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`.
   - Copy **Project API Keys -> anon / public** into `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`.
3. **Apply Database Migrations**:
   - Go to the **SQL Editor** in your Supabase Dashboard.
   - Open and copy the contents of [`supabase/migrations/20261014000001_initial_schema.sql`](supabase/migrations/20261014000001_initial_schema.sql). Paste it into the SQL Editor and click **Run**.
   - Next, open and copy [`supabase/migrations/20261014000002_rls_policies.sql`](supabase/migrations/20261014000002_rls_policies.sql). Paste it into the SQL Editor and click **Run**.
4. **Configure Authentication & Redirects**:
   - In Supabase Dashboard, go to **Authentication** -> **URL Configuration**.
   - Set **Site URL** to `http://localhost:3000` (or your production Vercel URL).
   - Under **Redirect URLs**, add `http://localhost:3000/**`.
5. **Lock Down Signups (Invite-Only)**:
   - Once both you and your partner have created your accounts via [`/onboarding`](http://localhost:3000/onboarding), go to **Authentication** -> **Providers** -> **Email**.
   - Turn **OFF** the toggle for **"Enable Signup"**. This prevents any third-party from creating an account on your private couple space.

---

### Step 3: Cloudinary Setup (Media Storage)

1. Create a free account at [Cloudinary.com](https://cloudinary.com).
2. **Find API Credentials**:
   - In the Cloudinary Console Dashboard, locate **Product Environment Credentials**:
   - Copy **Cloud Name** into `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`.
   - Copy **API Key** into `CLOUDINARY_API_KEY` (Server-only).
   - Copy **API Secret** into `CLOUDINARY_API_SECRET` (Server-only).
3. **Upload Security**:
   - OurDiary uses **Server-Signed Uploads** (`/api/media/sign-upload`).
   - Unsigned uploads are never used. The API Key and Secret are strictly server-side and never exposed to the client browser.

---

## 🛡️ Security & Privacy Architecture

- **Strict Row Level Security (RLS)**: RLS is enabled on all 10 tables (`profiles`, `couples`, `couple_members`, `memories`, `memory_media`, `memory_notes`, `memory_reactions`, `events`, `letters`, `bucket_items`).
- **Private Notes Isolation**: `memory_notes` uses a dedicated policy:
  ```sql
  (visibility = 'shared' AND public.can_access_memory(memory_id)) OR
  (visibility = 'private' AND author_id = auth.uid())
  ```
  Private notes are never returned in database queries, API responses, or Realtime broadcasts to the partner.
- **Strict 2-Partner Limit**: A database trigger on `couple_members` (`enforce_max_two_members`) blocks any 3rd user from joining a couple space.
- **Time-Capsule Privacy**: Letters sealed with future `unlock_at` dates cannot be read by the recipient until the unlock timestamp has passed.

---

## 🧪 Testing & Verification

Run the automated verification suite:

```bash
# Run unit & authorization tests
npm test

# Run Next.js production build verification
npm run build
```

### Verification Report
- **Unit & Security Tests**: All 6 tests passing (Private notes isolation, external user rejection, time-capsule unlock dates, couple 2-user limit, signed upload authorization, RLS migration integrity).
- **Build**: `next build` compiles and prerenders all routes cleanly with exit code 0.
