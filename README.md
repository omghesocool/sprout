# Sprout (web)

Browser version of the Sprout baby-names app, built to deploy on Vercel. It's the
same idea and the same Firebase backend as `../babynames-android`, so one person
can use the phone app and the other the website — they pair with the same
six-character couple code.

- **Next.js (App Router) + TypeScript**, no UI library. Static page; everything
  runs in the browser.
- **Names** come from `public/names.json`, generated from your spreadsheet by
  `../names-etl` (see below). There is no name data fetched from anywhere else.
- **Swipes, matches, rankings** sync through Firestore, using the exact document
  layout and security rules the Android app already uses (`couples/{code}/...`).
  Swipes are saved locally first and retried if you're offline.
- Anonymous Firebase sign-in, like Android. Your identity lives in this browser's
  storage, so clearing site data or switching browsers means re-joining (the
  couple holds two members, so a replaced device needs a new couple).

## Updating the names list

1. Edit your spreadsheet and export it as CSV to `../names-etl/input/names.csv`
   (Excel: *Save As → CSV UTF-8*). Columns are documented in
   [`../names-etl/README.md`](../names-etl/README.md).
2. From `../names-etl`: `python -m names_etl build`. This checks every row (and
   lists *all* problems at once), then writes `public/names.json` for this app and
   `names.db` for the Android app.
3. Commit/push (or redeploy) — Vercel serves the new `names.json`.

`names.json` is the only thing that changes when you change names; no code edits.

## Adding your own names

Either partner can tap **+** on the Swipe screen (or *Add a name* in Settings) to type in a
name that isn't on the list: name, gender, and optionally origin and meaning. It goes to the
**front of both decks**, shows an "Added by you / your partner" tag, and can be added to your
likes straight away. Only whoever added a name can remove it (Settings → Names you've added).

- Names are stored in Firestore under `couples/{code}/customNames`, so both partners get them.
  **This needs the updated `firestore.rules` deployed once** (see setup step 1 below). Until then
  adding a name works on your device but won't reach your partner (Settings shows it as
  "waiting to sync").
- Duplicates are blocked by spelling, listed variant and accent (adding "Zoë" when "Zoe" exists
  is refused); a neutral card blocks the same name as Boy or Girl, and vice versa.
- The Android app doesn't know about these names, so they only appear in the web app.

## One-time setup

### 1. Firebase web app (the part only you can do)

The Android app's `google-services.json` isn't enough — a web app needs its own
config. In the [Firebase console](https://console.firebase.google.com), project
`sprout-babynames`:

1. Project settings → *Your apps* → **Add app → Web (`</>`)**. Register it (no
   Firebase Hosting needed).
2. Copy the four values from the config snippet into `.env.local`
   (see `.env.example`): `apiKey`, `authDomain`, `projectId`, `appId`.
3. Authentication → Sign-in method → **Anonymous** must be on (it already is if
   the Android app works).
4. Authentication → Settings → **Authorized domains** → add your Vercel domain
   (e.g. `sprout-web.vercel.app`, plus any custom domain). Without this, sign-in
   fails on the deployed site even though it works on `localhost`.

Deploy the updated security rules once, from `../babynames-android` (needs the
[Firebase CLI](https://firebase.google.com/docs/cli) and `firebase login`):
`firebase deploy --only firestore:rules`. The new rules only add the `customNames` collection;
everything else is unchanged, so the Android app keeps working. These config values are public identifiers, not secrets — access is
controlled by the rules, not by hiding the key.

### 2. Run locally

```bash
npm install
cp .env.example .env.local   # then fill in the four values
npm run dev                  # http://localhost:3000
```

Checks: `npm test` (domain logic), `npm run typecheck`, `npm run build`.

### 3. Deploy to Vercel

1. Push this folder to a Git repo and import it at vercel.com/new (framework:
   Next.js, auto-detected; root directory = this folder if it's inside a larger repo).
2. Add the four `NEXT_PUBLIC_FIREBASE_*` variables under *Settings → Environment
   Variables* (Production + Preview). They're inlined at build time, so redeploy
   after changing them.
3. Add the deployed domain to Firebase's authorized domains (step 4 above).

## How it differs from the Android app

- Cluster IDs are now 53-bit (names-etl schema v3) so JavaScript can hold them
  exactly. Names rebuilt with schema v3 give the web and Android apps identical IDs.
  Swipes made in the Android app against an *older* `names.db` don't line up with
  a new list — that's inherent in replacing the list, not specific to the web app.
- Matches are derived (my likes ∩ partner's likes) rather than stored per device,
  so if either person undoes a like, the match disappears for both.
- Deck order is tier first, then popularity, then a stable shuffle — with a
  hand-made list that has no rank data, this means a stable but non-alphabetical order.
- No background push notifications; a match shows as a banner/celebration while
  the page is open.
