# Quizzle — Design Brief

**Status:** Phase 2 — design system specified, awaiting owner approval  
**Last updated:** 2026-10-22  
**Branch:** `arena/9131a5e6-quizzle`

---

## 1. Design goal

Create a distinctive, clear, trustworthy study tool whose main action — turning study material into a quiz — is immediately understandable. The interface is driven by the owner's preferences and actual university-study workflows, not by generic AI-generated dashboard patterns.

**Confirmed direction:** minimal, Notion-referencing, typography-led, spacious, restrained colour. Centered single-column home screen. Both light and dark themes. Balanced web/mobile priority.

---

## 2. Confirmed decisions (Phase 0 discovery + Phase 2 design interview)

| Decision | Value |
|---|---|
| Intended users | University / college students — coursework, exam prep, lecture review |
| Visual reference | Notion |
| Visual direction | Minimal |
| Home-screen layout | Centered single-column focused on quiz generation |
| Theme | Both light and dark (user-toggleable) |
| Platform priority | Balanced — web and mobile equally |
| Existing Quizzle assets to preserve | None — start completely fresh |
| Navigation model | Persistent tab bar (Generate, History, Share, Account) |
| Quiz-taking layout | One question at a time, paginated |
| Responsive strategy | Balanced — mobile and desktop treated as equal priorities |
| Progress/timer prominence | Subtle — small step counter (e.g. 3/10) and compact timer |
| Theme toggle location | Settings only (account screen) |
| Motion | Meaningful — purposeful transitions for progress and answer feedback |
| Brand colours/typography/logo | Proposed in §9, awaiting owner approval |

---

## 3. Design principles

1. **Content first.** The source material and the quiz are the focus. Chrome (nav, controls, branding) recedes.
2. **Progressive disclosure.** Show only what is needed at each step. Configuration options appear before generation; results appear after completion.
3. **Typographic hierarchy over decoration.** Use weight, size, and spacing to convey structure — not boxes, shadows, or colour washes.
4. **Generous whitespace.** Air around elements improves focus and readability, especially for long study sessions.
5. **Restrained colour.** Colour is used semantically (actions, correctness, warnings) — never as decoration.
6. **Predictable interactions.** Same patterns everywhere: submit buttons are primary and consistent; navigation never surprises.
7. **Accessibility by design.** Keyboard navigation, focus states, contrast, and screen-reader labels are built in, not bolted on.
8. **Meaningful motion.** Transitions communicate state change (quiz progress, correct/incorrect feedback) but never distract.

---

## 4. Anti-patterns (never the default)

- Default purple/blue gradients.
- Decorative dashboards and invented statistics.
- Wrapping every item in a card.
- Unnecessary sidebars or navigation items.
- Excessive shadows, glass effects, or animation.
- Generic AI illustrations and arbitrary icon decoration.
- Cloning a reference site without adapting it to Quizzle's workflow.

---

## 5. Colour tokens

Colours are defined as semantic CSS custom properties. Light and dark themes swap the same token set.

### Light theme

| Token | Role | Hex |
|---|---|---|
| `--color-background` | Page background | `#FFFFFF` |
| `--color-surface` | Elevated surfaces (inputs, modals) | `#F7F7F7` |
| `--color-border` | Subtle dividers, input borders | `#E5E5E5` |
| `--color-text-primary` | Body text, headings | `#1A1A1A` |
| `--color-text-secondary` | Secondary text, captions, helper text | `#666666` |
| `--color-text-tertiary` | Disabled, muted text | `#999999` |
| `--color-accent` | Primary actions, links | `#0F62FE` |
| `--color-accent-hover` | Pressed / hover state | `#0D55E8` |
| `--color-accent-muted` | Disabled primary action | `#C7C7C7` |
| `--color-success` | Correct answers, success states | `#16A34A` |
| `--color-success-muted` | Correct answer background (light) | `#ECFDF3` |
| `--color-danger` | Incorrect answers, errors | `#DC2626` |
| `--color-danger-muted` | Incorrect answer background (light) | `#FEF2F2` |
| `--color-warning` | Quota, warnings | `#D97706` |
| `--color-warning-muted` | Warning background (light) | `#FFFBEB` |
| `--color-focus` | Keyboard focus ring | `#0F62FE` |

### Dark theme

| Token | Role | Hex |
|---|---|---|
| `--color-background` | Page background | `#0F0F0F` |
| `--color-surface` | Elevated surfaces | `#1A1A1A` |
| `--color-border` | Subtle dividers, input borders | `#2A2A2A` |
| `--color-text-primary` | Body text, headings | `#FFFFFF` |
| `--color-text-secondary` | Secondary text, captions | `#A1A1AA` |
| `--color-text-tertiary` | Disabled, muted text | `#525252` |
| `--color-accent` | Primary actions, links | `#3B82F6` |
| `--color-accent-hover` | Pressed / hover state | `#2563EB` |
| `--color-accent-muted` | Disabled primary action | `#4B4B4B` |
| `--color-success` | Correct answers | `#22C55E` |
| `--color-success-muted` | Correct answer background (dark) | `#064E2B` |
| `--color-danger` | Incorrect answers, errors | `#EF4444` |
| `--color-danger-muted` | Incorrect answer background (dark) | `#450A0A` |
| `--color-warning` | Quota, warnings | `#F59E0B` |
| `--color-warning-muted` | Warning background (dark) | `#452A03` |
| `--color-focus` | Keyboard focus ring | `#3B82F6` |

### Semantic colour usage
- **Accent:** Primary buttons, active tab, links, selected MCQ option ring.
- **Success:** Correct answer highlight, "correct" checkmark, completion confetti substitute (subtle).
- **Danger:** Incorrect answer highlight, error messages, delete actions.
- **Warning:** Quota limit notices, expired share links, scanned-PDF-cannot-extract errors.
- **Muted variants:** Used as subtle backgrounds behind state chips (e.g. "Correct" pill), never as full-page backgrounds.

---

## 6. Typography

| Role | Font | Size | Weight | Line height | Use |
|---|---|---|---|---|---|
| Display (logo only) | Inter | 28–40 px | 500 | 1.2 | Quizzle wordmark |
| Heading 1 | Inter | 24 px | 600 | 1.25 | Page titles |
| Heading 2 | Inter | 20 px | 600 | 1.3 | Section titles |
| Heading 3 | Inter | 18 px | 600 | 1.35 | Card/component titles |
| Body large | Inter | 16 px | 400 | 1.5 | Primary body text |
| Body | Inter | 14 px | 400 | 1.5 | Secondary body text |
| Small | Inter | 12 px | 400 | 1.4 | Captions, helper text |
| Label | Inter | 14 px | 500 | 1.4 | Form labels, button text |
| Code / LaTeX inline | JetBrains Mono | 14 px | 400 | 1.5 | Inline math, code snippets |
| LaTeX block | JetBrains Mono / KaTeX | 16 px | 400 | 1.6 | Display math equations |

- **Headings:** `Inter`, sans-serif.
- **Body:** `Inter`, sans-serif, 16 px base.
- **Monospace:** `JetBrains Mono` (fallback: `IBM Plex Mono`, then system monospace) for LaTeX and code.
- **Font loading:** Self-host or Google Fonts with `font-display: swap`. Preload Inter for the first paint.

---

## 7. Spacing scale

| Token | Value | Use |
|---|---|---|
| `--space-1` | 4 px | Tight internal padding, hairline gaps |
| `--space-2` | 8 px | Small component gaps, icon spacing |
| `--space-3` | 12 px | Standard component padding |
| `--space-4` | 16 px | Default section gap, input padding |
| `--space-5` | 20 px | Larger section gap |
| `--space-6` | 24 px | Card/content padding |
| `--space-8` | 32 px | Major section separation |
| `--space-10` | 40 px | Page-level padding |
| `--space-12` | 48 px | Hero/home-screen vertical padding |

All spacing uses multiples of 4 px. Components use `--space-3` to `--space-6` internally; pages use `--space-8` to `--space-12` between sections.

---

## 8. Layout and responsive breakpoints

### Breakpoints (balanced strategy)

| Token | Min width | Target |
|---|---|---|
| `--bp-mobile` | 0 px | Phones (portrait/landscape) |
| `--bp-tablet` | 768 px | Tablets, small laptops |
| `--bp-desktop` | 1024 px | Desktops |

Mobile and desktop are designed in parallel — no "mobile is secondary" assumptions. The centered single-column home screen is the same on both; only width and padding scale.

### Layout rules
- **Max content width:** 720 px on desktop (centered). On mobile, full width with `--space-4` horizontal padding.
- **Home screen:** Centered single column. Generation form occupies the center; no sidebars.
- **Quiz screen:** Full-width on mobile; centered max-width column on desktop.
- **Tab bar:** Bottom on mobile; top or hidden on desktop (history/share/account accessible via header or inline).

---

## 9. Component specifications

All components are built with reusable tokens — no hardcoded colours, spacing, or typography.

### 9.1 Button

| Variant | Background | Text | Border | Use |
|---|---|---|---|---|
| Primary | `--color-accent` | White | None | Main actions (Generate, Submit, Save) |
| Secondary | Transparent | `--color-text-primary` | `--color-border` | Tertiary actions (Cancel, Back) |
| Danger | `--color-danger` | White | None | Destructive actions (Delete, Revoke) |
| Ghost | Transparent | `--color-text-secondary` | None | Icon buttons, subtle actions |

- Height: 44 px (touch-friendly minimum).
- Border radius: 6 px (subtle, not pill-shaped).
- Focus: 2 px ring in `--color-focus`, 2 px offset.
- States: hover (accent → `--color-accent-hover`), disabled (background `--color-accent-muted`, text `--color-text-tertiary`), loading (spinner + disabled).
- No gradients, no glass, no heavy shadows.

### 9.2 Input

| Part | Token | Value |
|---|---|---|
| Background | `--color-surface` | Light: `#F7F7F7` / Dark: `#1A1A1A` |
| Border | `--color-border` | 1 px solid |
| Border (focus) | `--color-focus` | 2 px solid |
| Text | `--color-text-primary` | |
| Placeholder | `--color-text-tertiary` | |
| Height | — | 44 px |
| Padding | `--space-3` horizontal | 12 px |
| Border radius | — | 6 px |

- Text input, textarea, and select share the same height and border style.
- Error state: border `--color-danger`, helper text `--color-danger`.
- Label above input, font weight 500, size 14 px.
- No inner box-shadow; state communicated via border colour only.

### 9.3 Select / Menu

- Trigger styled as an input (44 px, same border).
- Dropdown menu: `--color-surface` background, `--color-border` top border, 8 px max shadow (subtle).
- Menu items: 40 px height, `--space-3` horizontal padding, `--color-text-primary` text.
- Hover item: `--color-surface` background (slightly lighter/darker than base).
- Selected item: accent tint background, accent text.
- No arrows or caret icons unless needed for clarity.

### 9.4 Dialog / Modal

- Overlay: rgba(0,0,0,0.4) backdrop, blurred slightly.
- Panel: `--color-surface` background, `--color-border` border, 8 px border radius.
- Max width: 520 px; centered.
- Close: X button (tertiary/ghost) in top-right, plus backdrop click and Escape key.
- Title: Heading 3. Body: Body. Actions right-aligned, primary button last.
- No full-page modal takeovers for small actions.

### 9.5 Notification / Toast

- Position: bottom-center (mobile) or top-right (desktop), non-obstructive.
- Background: `--color-text-primary` with inverse text, or `--color-surface` with border.
- Duration: auto-dismiss after 4–6 seconds; dismissible via X or swipe.
- Types: success (green tint), error (red tint), warning (amber tint), info (neutral).
- Never use for critical errors that require action — use inline error state instead.

### 9.6 Progress indicator

- **Step counter:** "3 / 10" — small, `--color-text-secondary`, monospace-friendly.
- **Progress bar:** optional, 4 px height, `--color-border` track, `--color-accent` fill. Subtle, never animated aggressively.
- Placed above the question, below the header.

---

## 10. Quiz components

### 10.1 Question

- **Question text:** Body large, `--color-text-primary`, left-aligned.
- **LaTeX blocks:** Rendered inline via KaTeX (web) / RaTeX (native); monospace fallback if renderer fails.
- **Question number:** Small chip "Q3" — `--color-text-secondary` on `--color-surface`, 24 px square, 12 px radius.
- **Required indicator:** No asterisk; all questions are required by default.

### 10.2 MCQ option

- Layout: radio button (20 px) + label text (Body, `--color-text-primary`).
- Unselected: border `--color-border`, transparent background.
- Selected: border `--color-accent`, background `--color-accent` at 6% opacity, accent dot.
- Correct (post-submit): background `--color-success-muted`, border `--color-success`, checkmark icon.
- Incorrect (post-submit): background `--color-danger-muted`, border `--color-danger`, X icon.
- No card wrapper — option is a list item with subtle separation.
- Touch target: full width of option row, min 44 px height.

### 10.3 Theory answer

- Input: textarea, 4 rows minimum, expands with content.
- LaTeX support: inline math blocks via toggle or `$$...$$` detection; monospace font for math.
- Placeholder: "Type your answer…" in `--color-text-tertiary`.
- Character count: subtle, `--color-text-tertiary`, bottom-right.
- Grading feedback (post-submit): AI score + rubric reference + explanation, below the input.

### 10.4 Timer

- **When enabled:** Compact, `--color-text-secondary`, monospace digits, top-right of quiz area.
- **Format:** MM:SS.
- **Warning state:** Last 60 seconds → text `--color-warning`.
- **Expired:** Auto-submit current question, show `--color-danger` briefly, move to next.
- **When disabled:** No timer UI shown at all.

### 10.5 Results

- **Score:** Large number (e.g. "8 / 10"), `--color-text-primary`, monospace.
- **Percentage:** Subtle, `--color-text-secondary`.
- **Correct/incorrect breakdown:** Two small chips — green "8 correct", red "2 incorrect".
- **Review list:** Each question with user answer, correct answer, explanation.
- **LaTeX:** Rendered correctly in questions, answers, and explanations.
- **Actions:** "Retake quiz", "View history", "Share quiz" — primary first.

---

## 11. State components

### 11.1 Loading

- **Page-level:** Centered spinner + "Loading…" text, `--color-text-secondary`.
- **Generation:** Spinner inside the generate button + "Generating quiz…" — do not disable the whole page.
- **Skeleton:** Not used (minimal preference); spinner + text only.

### 11.2 Error

- **Inline:** Red border on the offending input, helper text `--color-danger` below.
- **Page-level:** Centered, heading + description + primary action button (e.g. "Try again").
- **Quota exceeded:** Warning colour, clear message ("You've reached your daily limit. Try again tomorrow."), no retry button until reset.
- **Scanned PDF:** Warning colour, "This PDF appears to be scanned. Quizzle currently supports text-based PDFs, DOCX, and TXT files."

### 11.3 Empty states

- **No quizzes yet:** Centered, heading "No saved quizzes", subtitle "Generate your first quiz from a document or pasted text.", primary action "Create quiz".
- **No history:** Similar, with "Start studying" action.
- **Share link expired:** "This quiz link has expired." with optional "Request access" (owner only).
- Empty states use `--color-text-secondary`, no illustration.

---

## 12. Screen specifications

### 12.1 Sign-in (Google)

**Hierarchy:**
1. Quizzle wordmark (top-left or centered).
2. Heading: "Sign in to Quizzle".
3. Subtitle: "Continue with your Google account."
4. Primary button: "Sign in with Google" (Google icon + text).
5. Secondary: "Privacy policy · Terms of service" (small, bottom).

**Behaviour:**
- Single Google-only sign-in. No email/password, no social alternatives.
- On success: redirect to Generate screen, set session cookie/token.
- Error: inline message below button.

**Responsive:** Full-width card on mobile; centered max-width 400 px on desktop.

**Accessibility:** Button has `aria-label="Sign in with Google"`; focus visible; Enter/Space activates.

### 12.2 Main quiz-generation screen (home)

**Hierarchy:**
1. Tab bar (bottom mobile / top desktop): Generate (active), History, Share, Account.
2. Quizzle wordmark.
3. Heading: "Create a quiz".
4. Source input:
   - Tabs: "Paste text" / "Upload file" (PDF, DOCX, TXT).
   - Textarea (paste) OR file drop zone + filename chip (upload).
   - File info chip: name, size, type (after selection).
5. Configuration:
   - Question format: MCQ / Theory / Mixed (segmented control).
   - Question count: number input, 1–50, default 10.
   - Difficulty: Easy / Medium / Hard (segmented control).
   - Timer: toggle + minutes input (when enabled).
6. Primary button: "Generate quiz" (full width, accent).
7. Quota indicator (subtle): "12 / 50 generations today".

**Primary action:** Generate quiz.
**Secondary actions:** Paste sample text, view history, change theme (via settings).

**Responsive:** Centered single column, max 720 px. Mobile: full width, tab bar bottom. Desktop: centered, tab bar top or inline.

**Loading:** Button spinner + "Generating quiz…" during AI call.
**Error:** Inline below generate button or file input.
**Empty:** N/A (this is the entry screen).

**Accessibility:** All form fields labelled; segmented controls use `role="radiogroup"`; count input has `aria-valuemin="1" aria-valuemax="50"`.

### 12.3 Source upload and pasted-text input

**Paste text:**
- Textarea, 8–12 rows, placeholder "Paste your study material here…".
- Character count (subtle, bottom-right).
- Max ~50K characters enforced; warning near limit.

**Upload file:**
- Drop zone / button: "Choose PDF, DOCX, or TXT".
- Accept: `.pdf`, `.docx`, `.txt`.
- Max size: 5 MB.
- After selection: filename chip with optional remove (X).
- Scanned PDF detection: warning inline if no extractable text.

**Shared behaviour:**
- One source per generation session. Switching source clears configuration.
- Source treated as untrusted: no HTML rendering, sanitized before AI.

### 12.4 Generation progress and error handling

**Progress:**
- Step counter: "Generating question 3 of 10…" (subtle).
- Spinner inside generate button.
- No full-screen loader.

**Error:**
- Inline error below generate button: "Unable to generate quiz. Please try again." + "Try again" button.
- Quota error: warning colour, "Daily generation limit reached." + "Try again tomorrow."
- Network error: "Connection lost. Check your internet and retry."

**Responsive:** Centered column, same as home screen.

### 12.5 Quiz-taking screen

**Hierarchy:**
1. Header: quiz title (optional), back arrow.
2. Progress: "3 / 10" + optional progress bar.
3. Timer (if enabled): compact MM:SS, top-right.
4. Question: Q3 chip + question text + LaTeX blocks.
5. Options (MCQ): list of selectable options.
   - Or textarea (Theory).
6. Navigation: "Previous" / "Next" (disabled on first/last).
   - On last question: "Submit quiz" (primary, accent).
7. Footer: none.

**Behaviour:**
- One question at a time. User must answer before Next enables (MCQ: select option; Theory: enter text).
- Answer saved locally as user progresses.
- On submit: attempt sent to server, score computed, redirect to results.
- Timer: counts down; warning at 60s; auto-advance on expiry.

**Responsive:** Full width mobile; centered max-width 720 px desktop.

**Loading:** N/A (client-side navigation).
**Error:** Inline if answer save fails ("Unable to save answer. Retry?").

**Accessibility:** Options use `role="radio"`; focus visible; screen reader announces question number and remaining count.

### 12.6 Quiz completion and answer review

**Hierarchy:**
1. Heading: "Quiz complete".
2. Score: "8 / 10" (large), "80%" (subtle).
3. Chips: "8 correct" (green), "2 incorrect" (red).
4. Review list:
   - Each question: Q chip, question text, user answer, correct answer, explanation.
   - Correct: green accent. Incorrect: red accent with correct answer shown.
   - LaTeX rendered throughout.
5. Actions: "Retake quiz", "View history", "Share quiz".

**Primary action:** Depends on context (usually "View history" or "Share quiz").
**Secondary:** Retake.

**Responsive:** Centered column, scrollable review list.

**Empty:** N/A (quiz always has results).

**Accessibility:** Score announced to screen reader; review list uses heading structure; correct/incorrect conveyed via text (not colour alone).

### 12.7 Saved quiz history

**Hierarchy:**
1. Heading: "History".
2. Empty state (if none): "No saved quizzes yet." + "Create quiz" action.
3. List of saved quizzes:
   - Each: quiz title, source type, question count, date, score (if attempted).
   - Actions: "Retake", "Share", "Delete" (swipe or overflow menu).
4. Pull-to-refresh (mobile) or refresh button (desktop).

**Primary action:** Tap a quiz to retake or review.
**Secondary:** Share, delete.

**Responsive:** List full-width mobile; two-column grid optional on desktop (not required — single column acceptable).

**Retention:** Quizzes older than 30 days are purged (see retention policy). No UI for browsing expired quizzes.

**Accessibility:** List items use `role="listitem"`; delete actions have `aria-label`.

### 12.8 Shared quiz landing and attempt flow

**Landing page (public, no auth required):**
1. Heading: quiz title.
2. Subtitle: "Shared by [owner]" + date.
3. Description: source summary (not the source itself).
4. Primary button: "Take this quiz".
5. Expiry notice (subtle): "This link expires on [date]."

**Attempt flow:**
- Same as quiz-taking screen (12.5), but no sign-in required.
- Attempt recorded anonymously or linked if user signs in mid-attempt.
- Score shown at end; no save to history unless user signs in.

**Expiry/revocation:**
- Expired link: "This quiz link has expired." no attempt button.
- Revoked link: "This quiz is no longer available."

**Responsive:** Centered column, max-width 600 px.

**Accessibility:** Public page must be fully keyboard-navigable; expiry conveyed via text.

### 12.9 Account, privacy and retention settings

**Hierarchy:**
1. Heading: "Account".
2. User info: email, display name (from Google).
3. Theme: Light / Dark / System (segmented control). (Theme toggle lives here, not header.)
4. Data & privacy:
   - "Quiz history retention: 30 days" (read-only, explains policy).
   - "Delete my account and all data" (danger button).
   - "Export my data" (secondary).
5. Sign out (secondary/destructive).

**Primary action:** None (settings page).
**Secondary:** Theme change, data export, account deletion, sign out.

**Responsive:** Single column, full-width mobile; centered max-width 600 px desktop.

**Accessibility:** All options labelled; destructive actions require confirmation dialog.

---

## 13. Accessibility and keyboard behaviour

- **Keyboard:** All interactive elements reachable via Tab. Enter/Space activates buttons and links. Arrow keys navigate segmented controls and MCQ option groups.
- **Focus:** Visible 2 px ring in `--color-focus` on all interactive elements. No `outline: none`.
- **Contrast:** All text meets WCAG AA (4.5:1 normal, 3:1 large). UI components meet 3:1.
- **Screen readers:** Images absent (no decorative illustrations). Icons have `aria-hidden="true"` or meaningful labels. Form fields have associated `<label>`. Quiz announces question number and progress. Correct/incorrect conveyed via text, not colour alone.
- **Motion:** Respects `prefers-reduced-motion` — transitions disabled or instant.
- **Touch:** Minimum 44 px touch targets. No swipe-required actions without alternative.

---

## 14. Theme behaviour

- **Default:** System preference (light/dark) on first visit.
- **Override:** User can select Light / Dark / System in Account settings. Stored in Firestore `users.theme`.
- **Transition:** Instant or subtle crossfade (respects `prefers-reduced-motion`).
- **Flash of incorrect theme:** Mitigated by reading theme from localStorage/Firestore before first paint and applying inline style.

---

## 15. Approval gate

**Status:** APPROVED with conditions (owner, 2026-10-22). The design system is approved for implementation of a representative Generate-screen prototype only — not all nine screens.

### Owner approval conditions
1. Keep the documented palette provisionally, but **verify WCAG AA contrast in light and dark themes before finalising the tokens**.
2. Keep the tab order: **Generate, History, Share, Account**.
3. Keep **one-question-at-a-time quiz navigation**, including Previous/Next controls and a **review step before final submission**.
4. Keep theme controls in **Account/Settings**, with **Light, Dark, and System** options.
5. Ensure the specifications cover **quota exhaustion, generation failures, expired share links, deleted quizzes, and empty states**.

### Next step (prototype, not full implementation)
Build a functional **Generate-screen prototype** using the design tokens, shown at mobile and desktop widths in both light and dark themes. Include document upload, pasted-text input, quiz type, difficulty, question count, and optional timer. Do not implement all nine screens yet. Let the owner review the representative prototype first.

**Feedback requested on the prototype:**
- Does the Generate screen match the approved minimal direction?
- Are the design tokens usable and consistent?
- Any WCAG contrast concerns in light or dark themes?
- Is the mobile/desktop responsive behaviour correct?

Record prototype feedback in `DESIGN_BRIEF.md` §15 and `CHANGELOG.md` before expanding the design system across the application.
