# STR Analyzer — Deployment Guide

Multi-user STR property analysis app. Deployed at `str.alexcomery.com`.

---

## Prerequisites

- A [Supabase](https://supabase.com) account (free)
- A [Google Cloud](https://console.cloud.google.com) account (free)
- A [Vercel](https://vercel.com) account (free)
- This repo pushed to GitHub

---

## Step 1 — Push to GitHub

```bash
cd ~/Claude/str-analyzer-app
git init
git add .
git commit -m "Initial commit"
gh repo create str-analyzer-app --public --push
```
(Or create the repo at github.com manually and push.)

---

## Step 2 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**, name it `str-analyzer`, pick US West
3. Wait ~2 minutes for it to spin up
4. Go to **SQL Editor** and paste the contents of `supabase/schema.sql`, then click **Run**
5. Go to **Project Settings > API** and copy:
   - **Project URL** (your `NEXT_PUBLIC_SUPABASE_URL`)
   - **anon public key** (your `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

---

## Step 3 — Enable Google OAuth in Supabase

1. In Supabase, go to **Authentication > Providers > Google**, toggle it **on**
2. Get a Google OAuth Client ID and Secret:

   a. Go to [console.cloud.google.com](https://console.cloud.google.com)
   b. Create a project, go to **APIs & Services > Credentials > Create Credentials > OAuth Client ID**
   c. Application type: **Web application**
   d. Add these **Authorized redirect URIs**:
      - `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
      - `https://str.alexcomery.com/auth/callback`
      - `http://localhost:3000/auth/callback`
   e. Copy the **Client ID** and **Client Secret** back into Supabase

3. In Supabase **Auth > URL Configuration**:
   - **Site URL:** `https://str.alexcomery.com`
   - **Redirect URLs:** add `https://str.alexcomery.com/**`

---

## Step 4 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) > **Add New Project**
2. Import the `str-analyzer-app` GitHub repo
3. Click **Deploy** (Vercel auto-detects Next.js)
4. Go to **Settings > Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Redeploy** to apply

---

## Step 5 — Connect str.alexcomery.com

1. In Vercel: project > **Settings > Domains**, add `str.alexcomery.com`
2. Vercel gives you a CNAME record:
   - **Name:** `str`
   - **Value:** `cname.vercel-dns.com`
3. In your domain registrar's DNS settings, add that CNAME record
4. Wait 5–15 minutes for DNS to propagate

---

## Step 6 — Seed Your Existing Properties

1. Sign in to the app at `str.alexcomery.com`
2. In Supabase **SQL Editor** run:
   ```sql
   SELECT id FROM auth.users WHERE email = 'alexcomery@gmail.com';
   ```
3. Copy your UUID
4. Open `supabase/seed-alex.sql`, replace `YOUR_USER_UUID_HERE` with your UUID
5. Run the file in the SQL Editor

---

## Local Development

```bash
cp .env.local.example .env.local
# Fill in the two Supabase values

npm run dev
# Open http://localhost:3000
```

---

## Tech Stack

- **Frontend/Backend:** Next.js 14 (App Router), TypeScript, Tailwind
- **Auth + DB:** Supabase (PostgreSQL + RLS + Google OAuth)
- **Hosting:** Vercel
- **Domain:** str.alexcomery.com via CNAME to Vercel
