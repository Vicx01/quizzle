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

- Exact brand colours, typography, and logo treatment.
- Quiz screen layout and question navigation detail.
- Motion preferences and specific accessibility requirements beyond the baseline.
- Responsive breakpoint targets for web vs mobile.
