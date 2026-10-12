# Family Table

A weekly family meal planner for your phone: quick recipes, adults and children portions, a shopping list grouped by shop aisle (with Southampton shop tips), your own recipes and photos, and optional new recipe ideas.

Built with React + Vite. Runs free on Vercel.

## Put it online (no terminal needed)

### 1. Upload to your personal GitHub
1. Sign in to **github.com with your personal account** (not your work one).
2. Click **+ → New repository**, name it `family-table`, choose **Private**, click **Create repository**.
3. On the new repo page click **uploading an existing file**.
4. Open the `family-table` folder in Finder, select everything **except** `node_modules` and `dist`, and drag it into the browser.
   - Hidden files: press `Cmd + Shift + .` in Finder to see `.gitignore`, and include it.
5. Click **Commit changes**.

### 2. Deploy on Vercel
1. Go to **vercel.com** and **Continue with GitHub** using the same personal GitHub account.
2. **Add New → Project**, pick `family-table`, click **Import**, then **Deploy** (the settings are detected automatically).
3. You get a link like `https://family-table-xxxx.vercel.app`. The app works now, saving on each phone.

### 3. Turn on family sync (free)
1. In your Vercel project open **Storage → Create Database → Upstash (Redis) → Continue**, pick the **Free** plan and a region near the UK (e.g. London or Frankfurt), then **Create**.
2. When asked, **Connect** it to the `family-table` project (all environments).
3. Go to **Deployments**, open the ⋯ menu on the latest one and click **Redeploy**.
4. Open the app: tap **Start our family plan**, then **Family & backup** (people icon, top right) → **Share invite link** and send it to your family.

### 4. Turn on "New idea" (optional, free tier)
1. Go to **aistudio.google.com** with a personal Google account → **Get API key → Create API key**, and copy it.
2. In Vercel: **Settings → Environment Variables** → add `GEMINI_API_KEY` with that key → **Save**.
3. **Redeploy** again. The ✨ New idea box appears when you tap a meal.

Note: on Google's free tier, Google may use what you send (meal requests) to improve its products. Only meal details are sent.

### 5. Add it to your phone's home screen
- **iPhone (Safari):** Share → **Add to Home Screen**
- **Android (Chrome):** ⋮ → **Add to Home screen** / **Install app**

## Making changes later
Edit files on GitHub (or upload new versions). Vercel redeploys automatically on every change.

## Run on your computer (optional)
```bash
npm install
npm run dev
```
Family sync and new ideas only work on the Vercel site, unless you use `npx vercel dev`.

## What's where
- `src/data.js`: the built-in recipes and Southampton shop tips
- `src/plan.js`: shopping list maths, portions (children = half a portion)
- `src/useFamilyPlan.js`: saving on the phone and syncing with the family
- `api/`: small server functions on Vercel (plan, photos, new ideas)
