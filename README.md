# food-diary-ai

A simple, short-term food diary app: log meals per day, track daily weight, view running calorie totals, and see historic trends on a line graph. Built mobile-first as a plain HTML/CSS/JS app backed by Firebase (Firestore + Google Sign-In), deployed via Firebase Hosting.

This README doubles as the implementation plan/checklist. Update the checkboxes as phases are completed.

## Decisions

- **Stack**: Plain HTML/CSS/JS, no build step/framework.
- **Storage**: Firestore (multi-device sync needed).
- **Auth**: Google Sign-In (Firebase Auth) so diary data is scoped to the user's Google account across devices.
- **Hosting**: Firebase Hosting using its default `*.web.app` URL; no custom domain registration is needed.
- **Firebase project**: `food-diary-built-with-ai`.
- **Graph library**: Chart.js (via CDN), toggle between Weight and Calories line graphs.
- **Layout**: mobile-first single layout (no separate desktop/mobile styling).
- **Editing**: meals and the daily weight can be edited/deleted after saving, not just added.

## Data model (Firestore)

- Collection path: `users/{uid}/days/{YYYY-MM-DD}` (doc ID = ISO date string)
- Doc shape:
  ```json
  {
    "weight": 81.9,
    "meals": [
      {
        "time": "08:30",
        "rows": [
          { "item": "Oatmeal", "calories": 300 },
          { "item": "Coffee", "calories": 50 }
        ]
      }
    ]
  }
  ```
- Meal display title ("Meal 1", "Meal 2", ...) is derived from array index, not stored.
- Weight values are recorded and displayed in kilograms.
- Rolling 7-day weight averages (current window and the window ending the previous day) are derived client-side from `weight` values across nearby day docs; not stored themselves.
- User settings doc: `users/{uid}/meta/settings` — `{ "includeCaloriesInCopy": true }` (defaults to `true` when absent); persists the "include calories" toggle for the Copy-as-JSON feature across devices.
- Security rules: only `request.auth.uid` matching the `{uid}` path segment can read/write, covering both the `days` docs and the `meta/settings` doc.

## Implementation plan

### Phase 0 — Firebase project setup (manual, guided)
- [x] Create Firebase project in the console (`food-diary-built-with-ai`)
- [x] Enable Firestore (production mode)
- [x] Enable Google sign-in provider in Authentication
- [x] Register a Web App to get the config snippet
- [x] Enable Firebase Hosting (use the default `*.web.app` URL); `firebase init` (Firestore + Hosting) run, generating `.firebaserc`, `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `index.html`, `404.html`
- [x] Save the Firebase config into `js/firebase-config.js`

### Phase 1 — Project scaffold (depends on Phase 0)
- [x] Create file structure: `index.html`, `css/style.css`, `js/firebase-config.js`, `js/app.js`, `js/firestore.js`, `firebase.json`, `.firebaserc`, `firestore.rules`
- [x] Load Firebase SDK via CDN (modular v9+ syntax), init Auth + Firestore
- [x] Implement Google sign-in flow (sign-in button when signed out; app UI when signed in)

### Phase 2 — Core UI: Today page + date navigation (depends on Phase 1)
- [x] Header with current date, defaulting to "today"; `<input type="date">` picker for past dates
- [x] Weight input field (optional, numeric, retained locally on change) for the selected day; Firestore persistence is Phase 4
- [x] Below the weight input, show the rolling 7-day average (based on whatever entries are available, degrading gracefully during the first week) and the prior day's 7-day average, for at-a-glance trend context
- [x] Running calorie total display, recalculated whenever the in-memory meal model changes
- [x] Container area rendering each meal as a card titled "Meal N" with its rows (time, item(s), calories), plus an empty state
- [x] "Add Entry" button, mobile-friendly placement; its entry form arrives in Phase 3
- [x] "Copy Day as JSON" button with an adjacent "Include calories" toggle near the running calorie total; copying and preference persistence arrive in Phase 4

### Phase 3 — Add/Edit Entry modal (depends on Phase 2)
- [x] Row-based form: each row = time, item, calories (time/calories optional)
- [x] First row sets the time; "Add another item" adds more rows that reuse that time, only needing item + calories
- [x] Save validates minimal input and closes the modal
- [x] On save (new entry): append meal object `{ time, rows }` to the selected day's in-memory `meals` array and re-render; Firestore persistence is Phase 4
- [x] Reuse the modal for editing: "Edit" control on each meal card opens it pre-filled; Save updates in place
- [x] "Delete" control on each meal card (with confirmation) removes it from in-memory state and re-renders; Firestore persistence is Phase 4
- [x] Weight field gets a "Clear" (X) control to delete a locally retained value for the day; Firestore persistence is Phase 4

### Phase 4 — Persistence wiring (depends on Phases 1-3)
- [x] `firestore.js`: `getDay(uid, dateStr)`, `saveDay(uid, dateStr, dayData)`
- [x] `firestore.js`: `getWeightsForDateRange(uid, startDateStr, endDateStr)` — fetch the last 8 calendar days of weight values via a document-ID range query for computing rolling averages
- [x] `firestore.js`: `getSettings(uid)` / `saveSettings(uid, settings)` for the persisted "include calories" toggle
- [x] On date change or sign-in, fetch and render that day's doc; empty state if none exists
- [x] Save weight field on change, including clearing an empty day document
- [x] Recompute both rolling weight averages whenever the selected date changes or the weight field is saved
- [x] Copy handler: build `{ time, rows }` meals array from the selected day, omitting each row's `calories` key entirely when the toggle is off; write to clipboard via `navigator.clipboard.writeText`, with a hidden-textarea/`execCommand('copy')` fallback; disable the button when the day has no meals; brief "Copied!" feedback on success

### Phase 5 — Historic graph (depends on Phase 4)
- [x] "View graph" button opens a modal view with a Chart.js line chart
- [x] Segmented control switches dataset between "Weight" and "Calories"
- [x] Query `users/{uid}/days` by document-ID date range for the last 90 days, map to per-date series client-side

### Phase 6 — Mobile-first styling (parallel with Phases 2-5, finalized last)
- [x] Single responsive column layout, large tap targets, sticky "Add entry" button
- [x] Entry and graph modals go full-screen on small viewports
- [x] Simple responsive CSS in `css/style.css`, no framework needed

### Phase 7 — Deploy (depends on all previous phases)
- [x] `firebase init hosting` (or manual `firebase.json`)
- [x] `firebase deploy` published https://food-diary-built-with-ai.web.app and the live sign-in page responds; manual phone verification remains in the verification checklist
- [x] Deploy Firestore security rules (`firebase deploy --only firestore:rules`)

## Relevant files (to be created)

- `index.html` — app shell, sign-in button, date picker, weight input, meal container area, Add Entry button, modal markup, graph modal markup
- `css/style.css` — mobile-first styles
- `js/firebase-config.js` — Firebase project config (from Phase 0)
- `js/app.js` — state management, rendering, modal logic, event wiring
- `js/firestore.js` — Firestore read/write helpers
- `firestore.rules` — per-user access rules
- `firebase.json`, `.firebaserc` — Hosting + project config

## Verification checklist

- [ ] Sign in with Google, add a meal with 2 rows (shared time); confirm it renders as "Meal 1" with both rows and correct calorie sum
- [ ] Navigate to a past date via the date picker; confirm empty state, add data, navigate back to today, confirm today's data persists separately
- [ ] Edit and delete a meal; confirm changes persist
- [ ] Enter/update/clear weight for a day; reload page; confirm it persisted
- [ ] Open graph, toggle Weight/Calories; confirm the line chart reflects entered data across multiple days
- [ ] Enter weight for several consecutive days; confirm the 7-day average and "yesterday's" 7-day average shown under the weight input match manual calculation, including correct behavior during the first week (fewer than 7 entries)
- [ ] Toggle "Include calories" off, copy a day with meals, confirm pasted JSON omits `calories` fields entirely; toggle on and confirm calories reappear where present
- [ ] Sign in on a second device/browser profile and confirm the "include calories" toggle reflects the last value saved
- [ ] Test on an actual mobile phone browser (or device emulation) for layout/tap target sanity
- [ ] Deploy check: visit Firebase Hosting URL from phone, confirm full flow works end-to-end

## Scope exclusions

- No offline support/service worker (not requested)
- No multi-user sharing (each Google account only sees its own data)
- Rolling weight averages are computed client-side on read, not pre-aggregated/cached server-side
- Copy-as-JSON always covers the currently viewed day only; no date-range export