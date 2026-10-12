# Family Table

A weekly family meal planner for your phone. Built with React + Vite, runs free on Vercel.

**What it does**
- Plans breakfast, lunchboxes, lunch and dinner for the week, for adults and children of different ages
- Builds the shopping list with pack sizes, a rough cost, a "check the cupboard" section and Southampton shop tips
- Favourites, "not again", allergies and foods to avoid, cook-once-eat-twice leftovers
- A new-week prompt every Monday, with the last 8 weeks saved to reuse
- Your own recipes, plus import from a recipe website link or a photo of a cookbook page
- New recipe ideas, photos of your dishes, and a daily "what's for dinner" reminder
- Family sync: everyone with the invite link shares one plan, and changes made at the same time are merged

## 1. Put it online

**Option A: GitHub + Vercel (no terminal)**
1. On **github.com with your personal account**: **+ → New repository** → name `family-table` → **Private** → **Create**.
2. Click **uploading an existing file**, then drag in everything in this folder **except** `node_modules` and `dist`. Press `Cmd + Shift + .` in Finder to show hidden files and include `.gitignore`. Click **Commit changes**.
3. On **vercel.com**, **Continue with GitHub** (same personal account) → **Add New → Project** → pick `family-table` → **Deploy**.

**Option B: straight from your Mac**
```bash
cd ~/family-table
npx vercel --prod
```
Log in with your personal account when the browser opens, and accept the defaults.

**Optional features**

Each of these is switched on in your Vercel project. After changing any setting, go to **Deployments → ⋯ → Redeploy**.

## 2. Family sync (free)
**Storage → Create Database → Upstash (Redis) → Free plan**, choose a region near the UK, then **Connect** it to the project.
Open the app, tap **Start our family plan**, then use the people icon (top right) → **Share invite link**.

## 3. Photos as files (free, recommended)
**Storage → Create Database → Blob → Create**, then **Connect** it to the project.
Without this, photos still work but are kept in the database, which has less room.

## 4. New ideas and importing from photos (free tier)
1. Go to **aistudio.google.com** with a personal Google account → **Get API key** → copy it.
2. **Settings → Environment Variables** → add `GEMINI_API_KEY`.

Importing from a website link works without this for most recipe sites, because they include a recipe card the app can read.
On Google's free tier, Google may use what you send (meal requests and recipe photos) to improve its products.

## 5. Dinner reminders (free)
1. In Terminal run `npx web-push generate-vapid-keys`. It prints a Public Key and a Private Key.
2. **Settings → Environment Variables** → add:
   - `VAPID_PUBLIC_KEY`: the public key
   - `VAPID_PRIVATE_KEY`: the private key (keep this secret)
   - `VAPID_SUBJECT`: `mailto:` followed by your personal email
   - `CRON_SECRET`: any long random password (stops strangers triggering reminders)
3. Redeploy. On each phone: people icon → **Turn on reminders on this phone**.
   - **iPhone:** add the app to the Home Screen first and open it from there (iOS 16.4 or newer).

Reminders go out once a day at 15:00 UK winter time, which is 16:00 in summer. The free Vercel plan allows one run a day, and it may arrive up to an hour late. To change the time, edit `vercel.json`.

## 6. Add it to your phone
- **iPhone (Safari):** Share → **Add to Home Screen**
- **Android (Chrome):** ⋮ → **Install app**

## Making changes
Edit or upload files on GitHub and Vercel redeploys automatically. Or run `npx vercel --prod` again.

```bash
npm install
npm test        # checks the shopping list maths, portions, allergies, packs and imports
npm run dev     # runs the app on your computer (sync, ideas and reminders need the Vercel site)
```

## What's where
- `src/data.js`: recipes, pack sizes and prices, allergy words, Southampton shop tips
- `src/plan.js`: portions, shopping list, packs and cost, picking meals, new weeks
- `src/useFamilyPlan.js`: saving on the phone and merging changes with the family
- `src/components/`: the screens
- `api/`: server functions on Vercel (plan, photos, ideas, import, reminders)
- `tests/`: automatic checks (`npm test`)

Prices are rough Aldi/Lidl-style guides. Update them in `src/data.js` (`PACKS`) if they drift.
