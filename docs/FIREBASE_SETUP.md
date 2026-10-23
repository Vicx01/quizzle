# Firebase Setup — Quizzle

**Status:** setup instructions complete. **The Google sign-in flow is
VERIFIED** — the owner ran it against the live Firebase project and confirmed a
successful sign-in.

Still open: `signOut()` is not wired to any UI (a signed-in user cannot sign
out), and **no Firestore security rules exist**, so there is no data-access
control yet.

This document explains how to configure Firebase and how to verify the flow.

Read `SECURITY` below before entering any values.

---

## 1. What is already implemented

| Piece                                                  | Location               | Status                        |
| ------------------------------------------------------ | ---------------------- | ----------------------------- |
| Firebase app init from env vars                        | `services/firebase.ts` | Implemented                   |
| Config diagnostics (missing / placeholder / malformed) | `services/firebase.ts` | Implemented, tested           |
| Google sign-in (popup + redirect fallback)             | `services/auth.ts`     | Implemented, **VERIFIED**     |
| Actionable error mapping                               | `services/auth.ts`     | Implemented, tested           |
| Sign-in screen + setup checklist                       | `screens/SignIn.tsx`   | Implemented, tested           |
| Sign out                                               | `services/auth.ts`     | Exported, **not wired to UI** |
| Firestore                                              | —                      | Initialised, **unused**       |
| Firestore security rules                               | —                      | **Not implemented**           |
| Native (iOS/Android) auth                              | —                      | **Not implemented**           |

Nothing here contacts Firebase at build or test time. All 27 service tests run
without credentials.

---

## 2. Values you must supply

There is **no committed template**. Create `.env` in the project root yourself
and add the four **required** values below.

Create the empty file first — pick your shell:

| Shell                               | Command                        |
| ----------------------------------- | ------------------------------ |
| macOS / Linux / Git Bash on Windows | `touch .env`                   |
| Windows **Command Prompt (cmd)**    | `type nul > .env`              |
| Windows **PowerShell**              | `New-Item .env -ItemType File` |

> On Windows, Notepad will silently save this as `.env.txt`, which is ignored
> entirely. Check with `dir .env*` and rename with `ren .env.txt .env`. See the
> Windows notes in the README.

Then add these values:

| Variable                           | Where to find it                                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_FIREBASE_API_KEY`     | Firebase Console → Project settings → General → Your apps → SDK setup and configuration → `apiKey` |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Same config block → `authDomain` (usually `<project-id>.firebaseapp.com`)                          |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID`  | Same config block → `projectId`                                                                    |
| `EXPO_PUBLIC_FIREBASE_APP_ID`      | Same config block → `appId`                                                                        |

Two **recommended** (not blocking):

| Variable                                   | Notes                              |
| ------------------------------------------ | ---------------------------------- |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`      | Usually `<project-id>.appspot.com` |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Needed later for Cloud Messaging   |

Then **restart the dev server** — `EXPO_PUBLIC_*` values are inlined at build
time and are not hot-reloaded.

The app detects unfilled values, so a `.env` still containing template text like
`your-project-id` reports "still has its placeholder value" rather than a cryptic
Firebase error.

---

## 3. Firebase Console setup — Google Sign-In on web

### 3.1 Create or select a project

1. Go to <https://console.firebase.google.com/>
2. **Add project** (or select an existing one).
3. Accept the default Google Analytics setting, or disable it — either is fine.

### 3.2 Register the web app and copy the config

1. Project overview → **Add app** → choose the **Web** icon (`</>`).
2. Give it a nickname (e.g. `quizzle-web`). Do **not** tick "Firebase Hosting" unless you want it.
3. Firebase shows a `firebaseConfig` snippet. Copy the four values into `.env`.

If you skipped past it: **Project settings → General → Your apps → SDK setup and
configuration → Config**.

### 3.3 Enable the Google sign-in provider

1. **Authentication → Sign-in method**
2. Select **Google** → **Enable**
3. Set a project support email → **Save**

If you skip this, sign-in fails with `auth/operation-not-allowed`, which the app
now reports with instructions.

### 3.4 Add your domains to the allowlist ⚠️ most common failure

**Authentication → Settings → Authorized domains → Add domain**

Add every origin the app will be served from:

| Origin                           | When                                |
| -------------------------------- | ----------------------------------- |
| `localhost`                      | Local dev (usually already present) |
| `127.0.0.1`                      | Only if you browse via the IP       |
| `<your-sandbox-id>-8080.e2b.app` | **The Arena live preview**          |
| Your production domain           | When you deploy                     |

**The Arena preview host must be added explicitly.** It looks like
`8080-<sandbox-id>.e2b.app` and the sandbox ID can change between sessions, so
re-check it if sign-in suddenly starts failing with `auth/unauthorized-domain`.
The app prints the exact origin it is running on in that error message.

### 3.5 OAuth consent screen (Google Cloud)

Firebase creates an OAuth client automatically, but the consent screen may need
completing before it works for anyone outside your test users:

1. Google Cloud Console → **APIs & Services → OAuth consent screen**
2. Set **User type**: Internal (Workspace only) or External.
3. Fill in app name, support email, developer contact.
4. If External and status is "Testing", add **Test users** — otherwise sign-in
   will be blocked for accounts you have not allowlisted.

---

## 4. Native setup (iOS / Android) — NOT implemented

The current code targets **web only**. For the record, native needs all of the
following, none of which has been built or tested:

### 4.1 Register the native apps

**iOS** — Project settings → **Add app → iOS**:

- Bundle ID must match `ios.bundleIdentifier` in `app.json`.
- Download `GoogleService-Info.plist`.
- Add the reversed `CLIENT_ID` as a URL scheme in `ios` config.

**Android** — Project settings → **Add app → Android**:

- Package name must match `android.package` in `app.json`.
- Add **SHA-1** and **SHA-256** fingerprints. Debug fingerprint:

```bash
keytool -list -v -keystore ~/.android/debug.keystore \
  -alias androiddebugkey -storepass android -keypass android
```

- Download `google-services.json`.

Firebase creates the platform-specific OAuth clients from these. If the SHA
fingerprint is missing or wrong, Google sign-in fails on Android with a
non-obvious error code.

### 4.2 Code changes required

Two things are missing in code today:

1. **Auth persistence.** On React Native, `getAuth()` defaults to browser
   persistence and does not work. It needs:
   ```ts
   initializeAuth(app, {
     persistence: getReactNativePersistence(AsyncStorage),
   });
   ```
2. **A native OAuth flow.** `signInWithPopup` / `signInWithRedirect` are web
   APIs. Native needs `expo-auth-session` + `Google` provider, or
   `@react-native-google-signin/google-signin`, feeding the credential into
   `signInWithCredential`.

**Do not assume native sign-in works.** It is untested and unverified.

---

## 5. How to verify the flow (do this once config is supplied)

**Sign-in is verified** — the owner completed these steps successfully against
the live project. Re-run them if you change the Firebase configuration.

1. Create `.env` in the project root with the four required values (see §2).
2. Restart the dev server (`npm run web`).
3. Load the app. You should see the normal "Sign in to Quizzle" screen with a
   working **Sign in with Google** button.
   - If you still see **"Finish Firebase setup"**, the config check found a
     problem — it lists exactly which variables and why.
4. Click **Sign in with Google**.
   - Expected: Google account chooser → select account → consent → back in the
     app on the Generate screen.
5. Reload the page. You should stay signed in (Auth persists the session).
6. Check Firebase Console → **Authentication → Users** — a new user should appear.
7. Sign out and confirm you return to the sign-in screen.

### Record the result

When you finish, note in `CHANGELOG.md`:

- whether the popup flow worked,
- whether the redirect fallback was needed (e.g. in an iframe or embedded browser),
- whether session persistence across reloads worked,
- the exact origin you had to allowlist.

### Known environment caveats

- **Popup blockers / embedded previews.** Some embedded browsers and iframe
  previews block popups or block third-party cookies. Symptoms:
  `auth/popup-blocked` (the app falls back to redirect automatically) or
  `auth/web-storage-unsupported`. If the preview is embedded and the redirect
  flow misbehaves, **open the preview URL in a normal browser tab** rather than
  inside the iframe.
- **Third-party cookie blocking** can prevent the popup from completing silently.
  If it hangs, allow third-party cookies for the preview host.

### Google returns "403. That's an error … you do not have access to this page"

This is **Google's** page, not Quizzle's. It is good news about the wiring: the
flow did launch and Firebase accepted the API key and project. Google then
refused to serve the consent page. Work through these in order.

1. **You are inside an embedded preview — most common cause.**
   Google will not render its sign-in pages in an `<iframe>`, and popups are
   usually blocked there, so the flow cannot complete. The app detects framing
   and shows an "Open in a new browser tab to sign in" warning.
   → Open the preview URL in a normal browser tab and sign in from there.

2. **The OAuth consent screen was never completed.**
   Google Cloud → APIs & Services → OAuth consent screen → fill in app name,
   user support email and developer contact email, then save.
   → A project with no consent screen returns 403 instead of a sign-in page.

3. **Consent screen is in "Testing" and your account is not a test user.**
   → Add your own Google account under **Test users**, or publish the app.

4. **Origin not allowlisted** — less likely for this exact message, because
   Firebase normally surfaces `auth/unauthorized-domain` for that case.
   → Authentication → Settings → Authorized domains.

If you cannot read the address bar (the app is framed), the sign-in screen
prints the exact origin under the "This app origin" label.

---

## 6. Troubleshooting

| Error (shown in the app)                            | Cause                                 | Fix                                               |
| --------------------------------------------------- | ------------------------------------- | ------------------------------------------------- |
| "not allowed to sign in … Authorized domains"       | Origin not allowlisted                | Authentication → Settings → Authorized domains    |
| "Google sign-in provider is disabled"               | Provider off                          | Authentication → Sign-in method → Google → Enable |
| "API key is invalid"                                | Wrong `apiKey`, or stale build        | Fix `.env`, restart dev server                    |
| "Authentication is not configured for this project" | No provider enabled / Auth not set up | Enable Google provider                            |
| "Sign-in was cancelled"                             | You closed the popup                  | Not an error — just retry                         |
| "This screen is not configured" checklist stuck on  | Placeholder values still in `.env`    | Replace `your-…` values with real ones            |
| Google 403 page, no app error                       | Framed preview, or consent screen     | New tab; finish OAuth consent screen              |

---

## 7. SECURITY

- **These four values are not secrets.** Firebase web config ships in the client
  bundle of every Firebase web app by design. It identifies the project; it does
  not grant access.
- **Access is controlled by** (in order of importance):
  1. **Firestore security rules** — must be deployed before any data is stored.
     Not yet written.
  2. **Authorized domains** — limits where sign-in can originate.
  3. **App Check** — recommended later to reduce API-key abuse.
- **Never** put a service-account key, a Firebase Admin SDK credential, or an AI
  provider key in `.env`. Those belong in the server-side API layer, which is
  deliberately not built yet.
- `.env` and all `.env.*` variants are gitignored, and **no template is
  committed** — `.env.example` was removed at the owner's request. Verify before
  committing:
  ```bash
  git check-ignore -v .env          # must print the matching .gitignore rule
  git ls-files | grep -i '^\.env'   # must print nothing
  ```
  If `.env` is ever tracked, untrack it **without deleting your local file**:
  ```bash
  git rm --cached .env
  ```
- Consider enabling **App Check** (reCAPTCHA Enterprise on web) before any
  public deployment.

---

## 8. Still to do (not started)

- [ ] Deploy Firestore security rules (ownership enforced server-side)
- [ ] Server-side API layer with the replaceable `AIProvider` interface
- [ ] AI provider free-tier verification (GroqCloud → NVIDIA NIM → Mistral)
- [ ] Native auth: `initializeAuth` + RN persistence + native OAuth flow
- [ ] App Check
