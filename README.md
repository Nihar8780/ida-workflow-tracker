# IDA × BizBuddy — Reel Work Tracker (PWA)

Track all 23 reels (13 BizBuddy + 10 Indian Digital Ads) through 5 stages:
Prompt Creation → Scene Creation → Google Flow Video Generation → Editing → Final Upload.

- Login and create-account with Supabase Auth (email + password)
- Progress saved per user in Supabase, with a local copy so it works offline
- Installable PWA (Android, desktop, iPhone)
- Plain HTML, CSS and JavaScript. No build step.

## Project structure

```
index.html              app shell (login screen + tracker)
css/styles.css          all styling
js/config.js            your Supabase URL + anon key  <-- edit this
js/data.js              the 23 reels and 5 stages
js/db.js                Supabase client, offline queue, sync
js/auth.js              login / sign up / sign out
js/app.js               screen logic, PWA install
sw.js                   service worker (offline)
manifest.webmanifest    PWA manifest
icons/                  app icons
supabase/schema.sql     database table + security rules
vercel.json             Vercel headers
```

## Setup

### 1. Supabase
1. Create a project at supabase.com.
2. Open **SQL Editor → New query**, paste `supabase/schema.sql`, click **Run**.
3. Open **Project Settings → API**. Copy the **Project URL** and the **anon public** key into `js/config.js`.
   Never use the `service_role` key.
4. Open **Authentication → Providers → Email**.
   - To let people log in right after signing up, turn **Confirm email** off.
   - To require email confirmation, leave it on.

### 2. GitHub
```bash
git init
git add .
git commit -m "Reel tracker PWA"
git branch -M main
git remote add origin https://github.com/YOUR-USER/YOUR-REPO.git
git push -u origin main
```

### 3. Vercel
1. Go to vercel.com → **Add New → Project** and import the GitHub repo.
2. Framework preset: **Other**. Leave build command and output directory empty.
3. Click **Deploy**. You get a URL like `https://your-app.vercel.app`.

### 4. Tell Supabase your live URL
In Supabase → **Authentication → URL Configuration**:
- **Site URL**: your Vercel URL
- **Redirect URLs**: add the same URL (and `http://localhost:3000` for local testing)

Without this, the confirmation email link will point to the wrong address.

### 5. Install as an app
- **Android / Chrome / Edge:** open the site and tap **Install app** (top right) or the browser's install option.
- **iPhone:** open in Safari → Share → **Add to Home Screen**.

## Run locally
Service workers need `http://localhost` or HTTPS, so don't open the file by double-clicking.
```bash
npx serve .
```

## Updating after you deploy
Change `CACHE_VERSION` in `sw.js` (for example `v1` → `v2`) so installed apps pick up the new files.
