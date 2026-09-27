# Firebase Setup — what to do

**Status:** the code is already written. This document is only about the Firebase website (the console) and 3 terminal commands.

Everything in the app works **without** Firebase — it runs on demo data. So you can do these steps slowly and nothing will break in the meantime. If the `.env` file is missing or wrong, the app quietly falls back to demo data instead of crashing.

**Time needed:** about 45 minutes.

---

## Quick version

```
1.  Create a Firebase project                    (console, 5 min)
2.  Create the Firestore database                (console, 3 screens, 5 min)
3.  Paste the security rules                     (console, 2 min)
4.  Get the 6 config values                      (console, 2 min)
5.  Put them in a .env file                      (terminal, 5 min)
6.  Install the firebase library                 (terminal, 1 min)
7.  npm run seed                                 (terminal, 1 min)
8.  Test it                                      (browser, 10 min)
```

Steps 1–4 are on **console.firebase.google.com**. Steps 5–7 are in **VS Code**. Step 8 is your browser.

---

## Step 1 — Create the Firebase project

1. Go to **console.firebase.google.com** — sign in with your Google account
2. Click **Create a project** (or **Add project**)
3. **Project name:** `map-reporting-app` — Firebase will add a random suffix, that's fine
4. Google Analytics: **turn it OFF**. You don't need it and it's an extra step
5. Click **Create project**, wait, then **Continue**

> **You do NOT need to add a credit card.** Everything below runs on the free Spark plan. Ignore any "Upgrade" prompts.

## Step 2 — Create the Firestore database

1. In the left menu, click **Build** → **Firestore Database**
2. Click **Create database**

   Firebase now asks this in **3 screens**:

   **Screen 1 — Select edition**
   - Choose **Standard edition**. (It's usually already selected.)
   - ⚠️ **Not Enterprise edition.** Enterprise is for MongoDB-style pipelines and heavy
     analytics. It costs more and you don't need it.
   - You cannot change this afterwards — there is no upgrade path — so pick correctly now.
   - Click **Next**

   **Screen 2 — Database ID & location**
   - **Database ID:** leave it as **`(default)`**. This matters — the app assumes the
     default database. A custom ID means the code would need changing.
   - **Location:** pick **`asia-south1` (Mumbai)** if it's offered, otherwise the nearest
     one to you. This is permanent too.
   - Click **Next**

   **Screen 3 — Configure**
   - If it asks about **security rules**, choose **Production mode** (not Test mode).
     You'll paste the real rules in Step 3. If it doesn't ask, no problem.
   - Click **Create** / **Enable**

3. Wait about a minute. You'll land on an empty **Data** page.

That's correct — the collections are empty because you fill them in Step 7.

## Step 3 — Paste the security rules

1. On the Firestore page, click the **Rules** tab (top, next to Data / Indexes / Rules)
2. **Select all the text in the box and delete it**
3. Paste this exactly:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /reports/{reportId} {
      allow read: if true;
      allow create: if request.resource.data.title is string
                    && request.resource.data.title.size() > 0
                    && request.resource.data.title.size() <= 120
                    && request.resource.data.lat is number
                    && request.resource.data.lng is number;
      allow update, delete: if false;
    }

    match /reportPhotos/{photoId} {
      allow read: if true;
      allow create: if request.resource.data.dataUrl is string;
      allow update, delete: if false;
    }

    match /news/{id} {
      allow read: if true;
      allow write: if false;
    }

    match /events/{id} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

4. Click **Publish**

**What this does:** anyone can read reports and add a new one. Nobody can edit or delete an existing report. News and events can only be edited by you, from the console.

> There is no login in this app, so anyone with the link can post a report. For a college project that's fine. Just don't store anything private.

## Step 3b — Open the rules for a minute (temporary!)

> **Do this only while running the setup script in Step 7.** Put the normal rules back afterwards.

The rules in Step 3 are the *correct rules for the finished app*: nobody but you can write news or events. But that also blocks the setup script from loading them in. So for one minute we open everything, load the data, then lock it again.

1. Go back to **Firestore Database → Rules**
2. Replace everything with this **temporary** version:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

3. Click **Publish**
4. Run `npm run seed` (Step 7)
5. ⚠️ **Come back here, paste the Step 3 rules again, and click Publish.**

**Why this is safe:** it's a fresh database you're filling with demo data, and the window is one minute. Just don't leave it open — `allow read, write: if true` means literally anyone on the internet could edit your database.

---

## Step 4 — Get the 6 config values

1. Click the **gear icon** (top left, next to Project Overview) → **Project settings**
2. Scroll down to **Your apps**
3. Click the **web icon** `</>` (it looks like angle brackets)
4. **App nickname:** `frontend` — do NOT tick Firebase Hosting
5. Click **Register app**
6. It shows you a box of code. You need the values inside `firebaseConfig`:

```
apiKey:            "AIzaSy............"
authDomain:        "map-reporting-app-xxxxx.firebaseapp.com"
projectId:         "map-reporting-app-xxxxx"
storageBucket:     "map-reporting-app-xxxxx.firebasestorage.app"
messagingSenderId: "123456789012"
appId:             "1:123456789012:web:abc123..."
```

**Leave this tab open** — you'll copy these in the next step. Click **Continue to console** if it asks.

## Step 5 — Put them in a `.env` file

In VS Code, in the project folder:

1. Find the file **`.env.example`** in the file list
2. **Right-click it → Copy**, then **right-click the empty space below → Paste**
3. Rename the copy to exactly **`.env`** — nothing before the dot, nothing after "env"

   > If Windows says you can't start a filename with a dot, that's fine — just create a new file called `.env` instead.

4. Open `.env` and paste your 6 values after the `=` signs. It should look like this:

```bash
VITE_FIREBASE_API_KEY=AIzaSy...paste-your-own...
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...paste-your-own...
VITE_FIREBASE_APP_ID=...paste-your-own...
```

**Rules for this file:**
- ⚠️ Every name must start with `VITE_` — without it the browser can't read the value
- No quotes around the values
- No spaces around the `=`
- Save with `Ctrl + S`

> `.env` is in `.gitignore`, so it never goes to GitHub. That's correct — it's your private configuration.

## Step 6 — Install the firebase library

In the VS Code terminal (`` Ctrl + ` ``):

```bash
npm install firebase
```

One command, takes about 30 seconds.

## Step 7 — Fill the database with the demo data

Without this, your map will be empty, because the app will be reading from a database that has nothing in it.

```bash
npm run seed
```

That copies the 8 reports, 5 news items and 5 events into Firestore.

**Make sure you've done Step 3b first** (opened the rules), otherwise this stops after the reports with `PERMISSION_DENIED` — news and events are write-protected by the normal rules.

**Safe to run more than once.** It counts what's already in each collection and only fills the empty ones, so if it stops halfway just run it again — you won't get duplicates.

You should see:

```
🔥 Connecting to Firebase project: map-reporting-app-c9f15
📋 Adding reports...   8/8 reports  ✅
📰 Adding news...      5/5 news items  ✅
🎉 Adding events...    5/5 events  ✅
============================================
  Done!
============================================
```

**If it fails**, the error message tells you which of the three likely causes it is — no Firestore database, wrong rules, or wrong `.env` values.

**Check it worked:** go back to the Firebase console → Firestore → Data. You should see a `reports` collection with 8 documents. Click one to see its fields.

## Step 8 — Test the app

Start the site:

```bash
npm run dev
```

Open the link it prints, then check these five things:

| # | What to do | What should happen |
|---|---|---|
| 1 | Open the map page | 8 pins, real map |
| 2 | Click **+ Create Report**, click a point on the map, fill in a title and description, click **Submit Report** | You land on the new report's page |
| 3 | Go to the **Firebase console → Firestore → Data** | Your new document is in `reports`, with a real id |
| 4 | Press **F5** on the report page | The report is still there |
| 5 | Open **News** and **Events** | The 5 items each, from the database |

**How to tell it's really using Firebase:** open the browser console (`F12`) and look for:

```
🔥 Firebase connected to project: map-reporting-app-c9f15
```

If instead you see `No Firebase settings found (.env missing)`, your `.env` file isn't being picked up — check it's named exactly `.env` and in the same folder as `package.json`. **Restart the dev server after editing `.env`** (`Ctrl + C`, then `npm run dev`) — it only reads it at startup.

---

## Putting the config on the live website

Your GitHub Pages site will keep working on demo data until you do this. To make the live site use your real database:

1. Go to your repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add **6 secrets**, one at a time, using these exact names and your values from Step 4:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

4. Go to the **Actions** tab → **Deploy to GitHub Pages** → **Re-run all jobs**

The workflow file already passes these into the build — you don't need to edit any code.

> If a secret name has a typo, that value arrives empty at build time. The site would then fall back to demo data — annoying, but not broken.

---

## What the code does now (only if you're curious)

Two files:

| File | Job |
|---|---|
| `src/services/firebase.js` | Reads `.env`, opens the connection. If `.env` is missing, it sets a flag instead of crashing |
| `src/services/api.js` | The 6 functions every page calls. Each one checks the flag: Firebase configured → use Firestore, otherwise → use demo data |

So there is one code path for the real app and one for the demo, and the app can't break from a missing config.

```
getReports()              -> all reports
getReportById(id)         -> one report (also fetches its photo)
createReport(input)       -> saves a new report
getNews()                 -> all news
getEvents()               -> all events
uploadReportPhoto(file)   -> a photo as text
```

### Where photos are stored, and why

Photos go in a separate collection called `reportPhotos`, not inside the report itself.

The app shrinks every photo to a maximum of 900px wide before saving — roughly 100–200 KB as text. If that lived inside the report document, loading **the map** would download every photo just to draw the pins, and the map would become slow. Keeping them separate means the map stays fast, and only the report details page (which loads one report) pulls a photo.

**Why not Firebase Cloud Storage?** Since October 2024 it requires the paid Blaze plan with a credit card on file. Firestore's free tier does the job without one. If you ever upgrade, you'd change `src/services/photoUpload.js` and nothing else.

---

## If something goes wrong

| What you see | What it means | Fix |
|---|---|---|
| Map shows demo pins even after setup | `.env` not being read | Must be named exactly `.env`, in the same folder as `package.json`. Restart with `Ctrl + C` then `npm run dev` |
| `Missing or insufficient permissions` | Rules not published | Redo Step 3, click **Publish** |
| `npm run seed` says "no .env file found" | `.env` missing or misnamed | Step 5 |
| `npm run seed` stops with `PERMISSION_DENIED` | The normal rules block writing news/events | Do Step 3b, run the seed, then put the normal rules back |
| Map shows 16 pins / Reports shows 16 rows | The seed ran twice and added a second copy of each report | Firestore console → Data → the **⋮** next to `reports` → **Delete collection**. Then run `npm run seed` once more. This needs **no rule changes** — the normal rules allow *creating* reports, and news/events are skipped because they already have data |
| Empty map after setup | Database is empty | Run `npm run seed` |
| `Invalid Date` on a report | A Firestore document with a bad date | Delete that document in the console |
| Pins in the wrong place | `lat`/`lng` saved as text not numbers | In the console, check one document: they must be numbers, not `"17.38"` |
| "Failed to resolve import firebase/app" | Library not installed | `npm install firebase` |
| Worked, then broke after editing code | Something in `api.js` | `git checkout src/services/api.js` to restore the working version |

**Reading errors:** open the browser console with **F12**, and read from the **bottom up**. Fix only the first error.

---

*Frontend Team · Map Reporting App*
