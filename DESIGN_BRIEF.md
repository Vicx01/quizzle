# Quizzle — Design Brief

**Status:** Discovery complete. Owner decisions captured.  
**Last updated:** 2026-10-22

## 1. Design goal

Create a distinctive, clear, trustworthy study tool whose main action—turning study material into a quiz—is immediately understandable. The interface should be driven by the owner's preferences and actual study workflows, not by generic AI-generated dashboard patterns.

Confirmed direction: **minimal**, referencing **Notion**, with a **centered single-column** home screen focused on quiz generation, **both light and dark themes**, and a **balanced web/mobile** priority.

## 2. Confirmed UX needs (from discovery)

- The home screen should focus on quiz generation, centered on the page.
- Users can upload one supported document or paste text.
- Users configure question type, difficulty, question count, and optionally a timer.
- The quiz-taking flow must make questions, answer choices, progress, and timer state clear.
- Results should clearly present score, correct answers, and explanations.
- Users need quiz history and a way to share a saved quiz.
- Layout must be responsive for web and evaluated for future native use.
- Accessibility, readable mathematical notation, loading/error states, and keyboard support matter.
- LaTeX rendering for math/physics notation.

## 3. Owner decisions captured (Phase 0)

| Decision | Answer |
|---|---|
| Intended users and primary use cases | University / college students — coursework, exam prep, lecture review |
| Reference websites/apps liked | Notion |
| Desired visual direction | Minimal |
| Brand name treatment, logo, colours, fonts, existing assets | None yet — guidance requested |
| Home screen structure and navigation preference | Centered single-column |
| Quiz screen layout and question navigation | To be specified (wireframe stage) |
| Light mode, dark mode, or both | Both |
| Desktop/mobile priority | Balanced |
| Motion preferences and accessibility requirements | To be confirmed |
| Whether to preserve or adapt any existing UI | Nothing to preserve — start fresh |

## 4. Anti-patterns to avoid unless explicitly approved

- Default purple/blue gradients.
- Decorative dashboards and invented statistics.
- Wrapping every item in a card.
- Unnecessary sidebars or navigation.
- Excessive shadows, glass effects, or animation.
- Generic AI illustrations and arbitrary icon decoration.
- Copying a reference design without adapting it to Quizzle's workflow.

These are not absolute bans; use them only when they fit an approved direction.

## 5. Screens to specify

1. Google sign-in.
2. Main quiz-generation screen (centered single-column).
3. Document upload and pasted-text input.
4. Generation/loading, quota, and error states.
5. Quiz-taking screen.
6. Completion, score, and answer review.
7. Quiz history.
8. Shared-quiz landing and attempt flow.
9. Account/privacy settings where required.

For each screen, define hierarchy, primary action, secondary actions, responsive behaviour, empty/loading/error states, and accessibility considerations.

## 6. Design-system deliverables

After owner approval, document:

- Design principles.
- Colour and semantic tokens (light and dark themes).
- Typography and font usage.
- Spacing and layout scales.
- Responsive breakpoints.
- Button, input, menu, dialog, notification, and progress components.
- Quiz question, MCQ option, theory answer, timer, and results components.
- Focus states, keyboard behaviour, contrast and accessibility.
- Theme behaviour (light/dark toggle).

## 7. Approval gate

Do not implement all screens until the owner has reviewed a wireframe, prototype, or a small representative screen and approved the direction. Record feedback and decisions here and in `CHANGELOG.md`.

## 8. Open questions (design)

- Quiz screen layout and question navigation detail.
- Motion preferences and specific accessibility requirements beyond the baseline.
- Responsive breakpoint targets for web vs mobile.

## 9. Brand proposal (awaiting owner approval)

**Proposed identity:** a distinctive, minimal Quizzle brand inspired by Notion's clarity — spacious, typography-led, restrained colour, trustworthy for university study.

### Colour palette (light theme)
| Token | Role | Hex (proposed) |
|---|---|---|
| `--color-background` | Page background | `#FFFFFF` |
| `--color-surface` | Elevated surfaces (cards, inputs) | `#F7F7F7` |
| `--color-border` | Subtle dividers | `#E5E5E5` |
| `--color-text-primary` | Body text | `#1A1A1A` |
| `--color-text-secondary` | Secondary text, captions | `#666666` |
| `--color-accent` | Primary actions, links | `#0F62FE` (blue) |
| `--color-accent-hover` | Pressed/hover state | `#0D55E8` |
| `--color-success` | Correct answers | `#16A34A` (green) |
| `--color-danger` | Incorrect answers | `#DC2626` (red) |
| `--color-warning` | Quota/errors | `#D97706` (amber) |

### Colour palette (dark theme)
| Token | Role | Hex (proposed) |
|---|---|---|
| `--color-background` | Page background | `#0F0F0F` |
| `--color-surface` | Elevated surfaces | `#1A1A1A` |
| `--color-border` | Subtle dividers | `#2A2A2A` |
| `--color-text-primary` | Body text | `#FFFFFF` |
| `--color-text-secondary` | Secondary text, captions | `#A1A1AA` |
| `--color-accent` | Primary actions, links | `#3B82F6` (lighter blue for dark) |
| `--color-accent-hover` | Pressed/hover state | `#2563EB` |
| `--color-success` | Correct answers | `#22C55E` |
| `--color-danger` | Incorrect answers | `#EF4444` |
| `--color-warning` | Quota/errors | `#F59E0B` |

### Typography (proposed)
- **Headings:** `Inter` (sans-serif) — clean, legible, neutral.
- **Body:** `Inter` (sans-serif) — 16 px base, 1.5 line height.
- **Code / LaTeX inline:** `JetBrains Mono` or `IBM Plex Mono` — monospaced for math and technical notation.
- **Display (optional brand wordmark):** A single refined serif or a tightly tracked sans-serif for the Quizzle logo only.

### Logo concept (proposed)
A minimal wordmark: "quizzle" in lowercase Inter, letter-spaced, with a single accent dot or notch replacing the dot of the "i" to suggest a question mark without being literal. No mascot, no generic graduation-cap icon, no gradient. Works at 24 px (favicon) and 200 px (marketing). One colour (accent blue) on white; reversed (white) on dark.

### Anti-patterns confirmed (from Phase 0)
- No default purple/blue gradients.
- No decorative dashboards or invented statistics.
- No wrapping every item in a card.
- No unnecessary sidebars or navigation.
- No excessive shadows, glass effects, or animation.
- No generic AI illustrations or arbitrary icon decoration.

### Approval gate
Do not implement the visual system (tokens, components, theme) until the owner reviews and approves this brand proposal. Record feedback in `DESIGN_BRIEF.md` §9 and `CHANGELOG.md`.
