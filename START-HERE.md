# START HERE — Map Reporting App (Frontend Team)

Read this whole document once before you touch anything. It tells you **what to do,
where to do it, and how you'll know it worked**. No React code in here — you'll ask
for that step by step.

---

## 0. Two-minute understanding

**What the app is:** one shared map. People drop a pin on a location, say what's
happening there, maybe add a photo. Everyone else opens the map and sees the pins.

**Who builds what:**

| Team | Builds | You do NOT build this |
|---|---|---|
| **Frontend (you)** | Every screen the user sees: home, map page, forms, cards, news, events, mobile layout | — |
| **Maps Team** | The Google Map itself, pins on it, the mini-map, GPS | No Google Maps API, no coordinates maths |
| **Backend Team** | Firebase database + photo storage | No database, no login, no server |

**Your real job in one line:** build the screens, then *plug in* what the other two
teams hand you.

---

## The one big idea (understand this and the project becomes easy)

Your teammates will change their code. If you write Firebase calls inside your pages,
every change breaks 20 files. So you build **two seams** — two places where the outside
world plugs in:

1. **One map component.** Every screen uses the same `<MapView />`. Today it's a
   placeholder you own; later it becomes the Maps Team's Google Map. One file swapped,
   whole site upgraded.

2. **One data file.** No page ever talks to Firebase directly. Every page asks
   `src/services/api.js` for data. Later that one file's insides become Firebase calls.
   Pages never change.

Everything below is arranged so you never have to redo work.

---

## PART A — Setup (do this once, about 30 minutes)

### A1. Install VS Code
- **What:** the editor where you write all the files.
- **Where:** download from `code.visualstudio.com` → install with all default options.
- **Worked if:** you can open VS Code and see a welcome screen.

Optional but helpful extensions (click the squares icon on the left sidebar, search, install):
- **ES7+ React/Redux snippets** — typing shortcuts for React code
- **Prettier** — auto-formats your code so it looks neat
- **Simple React Snippets**

### A2. Install Node.js
- **What:** Node lets your computer *run* JavaScript outside a browser. `npm` comes
  with it and it downloads the small libraries your project uses.
- **Where:** `nodejs.org` → download the big green **LTS** button (not "Current") →
  install with all defaults.
- **Important:** after installing, **close and reopen VS Code** if it was already open.

### A3. Check it worked
- **Where:** open VS Code → press `` Ctrl + ` `` (the key left of the 1) to open the
  **terminal** at the bottom. A terminal is where you type commands; the editor is
  where you type code. Different places.
- **Type:** `node -v` then Enter, then `npm -v` then Enter.
- **Worked if:** you see two version numbers like `v20.20.2` and `10.8.2`. If you see
  "not recognized", Node didn't install — redo A2 and restart VS Code.

### A4. Get the project folder onto your computer
Two ways. Pick one:

- **Option 1 (faster):** download the `map-reporting-app` folder from this workspace
  and put it somewhere easy like `Documents\map-reporting-app`.
- **Option 2 (you learn more):** create the folder and files yourself as we go through
  the steps. I'll tell you exactly which file to create and where, whenever you ask.

Either way the result is the same folder. Option 2 is recommended if this is for a
college submission and you need to explain your own code.

### A5. Open the project in VS Code
- **Where:** VS Code → **File → Open Folder** → select the `map-reporting-app` folder.
- **Never** open a single file on its own. Always open the whole folder, or the
  terminal will be in the wrong place and commands will fail.
- **Worked if:** the left sidebar shows `index.html`, `package.json` and a `src` folder.

Learn these three parts of the VS Code window — you'll live in them:

```
+-------------------------------------------------------+
|  Explorer (left)   |   Editor (middle)                |
|  your files        |   the file you're typing in      |
|                    |                                  |
|--------------------+----------------------------------|
|  Terminal (bottom) — commands go here                 |
+-------------------------------------------------------+
```

### A6. Install and run the app
- **Where:** the terminal at the bottom of VS Code.
- **Do:**
  1. First install the libraries (only once, takes a minute):
     `npm install`
  2. Then start the site:
     `npm run dev`
  3. It prints a link like `http://localhost:5173`. Hold **Ctrl** and click it, or type
     it in your browser.
- **Worked if:** the browser shows the Map Reporting App home page.
- **Leaving it running:** keep this terminal busy — that's the live site. To stop it,
  click the terminal and press `Ctrl + C`. To start again later, just `npm run dev`.

### A7. Put it on GitHub (do this now, not at the end)
- **Why:** your team needs the code, and you need a safe copy. Commit **after finishing
  each step below**, so you always have a working version to fall back to.
- **Do:** create a GitHub account → create an empty repository → connect your folder.
- I'll give you the exact Git commands when you reach this point — just ask.

---

## PART B — Where everything lives

This is the answer to "where do I write it". Once you know this map, you'll never be lost.

```
map-reporting-app/
│
├── index.html                 the single HTML page (React fills it). Rarely touched.
├── package.json               lists libraries + the npm commands. Don't edit by hand.
├── vite.config.js             dev-server settings. Ignore it.
│
└── src/
    ├── main.jsx               starts React. Touched once, then never again.
    ├── App.jsx                the shell: navbar + footer + the list of pages
    │
    ├── pages/                 ONE FILE PER SCREEN
    │   Home, MapPage, Reports, ReportDetails, ReportPage, News, Events, NotFound
    │
    ├── components/            REUSABLE UI PIECES
    │   Navbar, Footer, MapView, MiniMap, ReportCard, ReportForm,
    │   NewsCard, EventCard, ReportFilters, Badge, Loader, EmptyState, PageHeader
    │
    ├── services/              *** EVERYTHING THAT TALKS TO THE BACKEND ***
    │   api.js                 <-- Backend Team plugs Firebase in HERE
    │   photoUpload.js         <-- photo upload lives HERE
    │   storage.js             tiny helper
    │
    ├── hooks/                 shared data-loading logic (used by several pages)
    ├── data/                  dummy data while the backend isn't ready
    ├── utils/                 small helper functions (dates, coordinates, constants)
    └── styles/                the CSS. index.css is the main one.
```

**Rule of thumb — ask yourself:**
- "Can the user **see** it?" → `pages/` (one whole screen) or `components/` (a piece)
- "Is it **data** from the backend?" → `services/`
- "Is it a small **helper**?" → `utils/`
- "Is it **CSS**?" → `styles/`

**Is it a page or a component?** A page is something with a URL you can visit
(`/news`). A component is something used *inside* pages. `News` is a page;
`NewsCard` is a component used by the News page, the Home page, and later maybe
a search page.

---

## PART C — Build order

Do the steps in order. **Run the app after every step and look at the browser before
moving on.** If something breaks, the problem is in the step you just did.

| # | Step | Where you write | Done when |
|---|---|---|---|
| 1 | Create the project | root folder | `npm run dev` shows a page |
| 2 | Layout: navbar, footer, shell | `App.jsx`, `components/Navbar.jsx`, `Footer.jsx` | You can click between pages, header stays on top |
| 3 | Build the pages with dummy data | `pages/*`, `data/sampleData.js` | All 6 pages have content, no blank screens |
| 4 | Build reusable components | `components/*` | Cards/forms appear, and are reused on 2+ pages |
| 5 | Connect the Maps Team | `components/MapView.jsx` (one file) | Real Google Map with pins |
| 6 | Connect the Backend Team | `services/api.js` (one file) | Data comes from Firebase, not dummy file |
| 7 | Add photos | `services/photoUpload.js`, form | Submitted report shows its photo |
| 8 | Make it responsive | `styles/index.css` | Looks right at 375px, 768px, 1280px |
| 9 | Test the full flow | everywhere | The full click-through below passes |

**Step 2–4 are the biggest chunk. Steps 5 and 6 are the smallest** — that's the point
of the two seams. If Step 5 or 6 feels big, you built it wrong; come back to me.

### Testing widths for Step 8
Drag your browser window narrow, or press `F12` → click the phone/tablet icon:
- **375px** (phone): navbar collapses to a hamburger, cards stack in one column
- **768px** (tablet): two columns
- **1280px** (laptop): full layout

---

## PART D — The two contracts (this is your protection)

Before the Maps and Backend teams write anything, send them this. If you don't agree
on the names now, you'll be rewriting your pages in the last week.

### D1. What you need from the **Maps Team**

One component, accepting exactly these props:

| Prop | Meaning |
|---|---|
| `reports` | array of reports; each has `lat` and `lng` — they draw the pins |
| `selectedLocation` | `{ lat, lng }` or nothing — they show the chosen pin |
| `onMapClick` | they call this with `(lat, lng)` when the user picks a point |
| `onMarkerClick` | they call this with the report when a pin is clicked |
| `activeId` | which pin to highlight |
| `height` | how tall the map box should be |

Plus:
- a **MiniMap** component that takes one `lat` and `lng` (for the details page)
- **Google Maps API key** — ask who creates it and who pays attention to the billing
  limit. Never paste the key into a file you commit to GitHub.
- The one thing to be firm about: **`onMapClick` must give you the latitude and
  longitude.** If their component hides the coordinates inside itself, your report
  form can't work.

### D2. What you need from the **Backend Team**

Six functions. Ask them to fill these in inside your `services/api.js` — you've
already set the names up:

| Function | You give it | You get back |
|---|---|---|
| `getReports()` | nothing | list of all reports |
| `getReportById(id)` | one report's id | that one report |
| `createReport(input)` | the filled form + lat/lng | the saved report, with its new id |
| `getNews()` | nothing | list of news items |
| `getEvents()` | nothing | list of events |
| `uploadReportPhoto(file)` | the photo file | a photo URL |

And this exact report shape — every report object has these 11 fields:

`id`, `title`, `type`, `description`, `lat`, `lng`, `locationName`, `photoUrl`,
`status`, `reportedBy`, `reportedAt`

- `type` is one of: Complaint, Incident, Announcement, Event, Other
- `status` is one of: Unverified, In Progress, Resolved, Verified
- `lat`/`lng` are numbers. `reportedAt` is a date-time text.

**Send them this message:** *"Frontend is done and running with dummy data. I have
one file, `src/services/api.js`, with these 6 function names. Please fill in the
Firebase code inside these functions — don't rename them, and return objects with
these 11 fields. Then I swap nothing and everything works."*

### What you send them instead of asking
You need to hand the Maps Team a list of reports with lat/lng, and you need to hand
the Backend Team the report form values. Both come from the same shape. That's why
one contract covers both.

---

## PART E — The full test (Step 9)

Click through this on your own laptop **and** on a phone before you submit:

1. Open the website → home page loads, no blank screen
2. Click **Map** → the map shows pins
3. Click a pin → the report information appears
4. Click **Create Report** → the form opens
5. Click a point on the map → the pin drops, coordinates show
6. Type a title + description, choose a type, add a photo
7. Click **Submit** → you're taken to the new report
8. Go back to the map → your new pin is there
9. Open **Reports** → search for your report's title → it's found
10. Open **News** and **Events** → cards show, dates look right
11. Shrink the window to phone size → nothing overflows, navbar becomes a hamburger
12. Open it on an actual phone on the same Wi-Fi → still works

If steps 1–4 pass but 5–8 fail, the problem is the map/backend connection, not your pages.

---

## PART F — When it goes wrong (it will, and that's normal)

| What you see | What's actually wrong | Fix |
|---|---|---|
| Blank white page | A JavaScript error stopped React | Press `F12` → **Console** tab → read the red line. It names the file. |
| `'npm' is not recognized` | Node not installed, or VS Code was open during install | Reinstall Node, fully close and reopen VS Code |
| `Cannot find module './X'` | A file path or filename is misspelled, or the file is in the wrong folder | Check the import path matches the real file, including capital letters |
| `Port 5173 is in use` | You already have the app running in another terminal | Use the new link it prints, or close the old terminal |
| Changes don't show up | You edited a file but the browser is stale | Save the file (`Ctrl + S`), then refresh. `npm run dev` reloads by itself. |
| Everything broke after one edit | You changed too much at once | `Ctrl + Z` a few times until it works again, then change one thing |

**The golden rule of a broken app:** read the red error message in the console from
the **bottom up**, and fix only the first one. Ninety percent of beginner errors are
a misspelled filename or a missing comma.

---

## PART G — What to do right now

1. Do **A1, A2, A3** — install VS Code and Node, verify with `node -v`.
2. Do **A4, A5** — get the folder, open it in VS Code.
3. Do **A6** — `npm install`, then `npm run dev`, and look at the page in your browser.

Then come back and say **"step 1"** and I'll walk you through creating the project
files one at a time, telling you exactly which file to open and what goes in it.

---

### A note on what's already built

To save you time, I've already written the code for **Steps 1–4** into this workspace
folder. Two things are still missing and I'll finish them when you ask:

- `src/pages/ReportPage.jsx`, `News.jsx`, `Events.jsx`, `NotFound.jsx`
- `src/styles/index.css` (the stylesheet — without it the app runs but looks plain)

So you have two paths:

- **Understand-then-copy:** follow the steps, and copy each finished file from this
  workspace when you reach it. Faster, and you still learn the structure.
- **Type-it-yourself:** tell me "step 1" and I'll give you one file at a time and
  explain what each line does. Slower, but you'll be able to answer any question your
  faculty asks.

### One decision to make

The project is set up with **Vite**. It's the modern standard, starts in one second,
and creates far fewer files to get lost in.

If your college requires **Create React App** (many tutorials and lab manuals still
say `npx create-react-app`), tell me and I'll switch it — the step order and every
file's purpose stay exactly the same, only the setup commands change.

---

*Frontend Team · Map Reporting App · Maps Team handles Google Maps · Backend Team handles Firebase*
