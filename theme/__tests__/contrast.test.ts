/**
 * Quizzle — WCAG AA contrast verification.
 *
 * Owner approval condition 1: "Keep the documented palette provisionally, but
 * verify WCAG AA contrast in light and dark themes before finalising the tokens."
 *
 * Thresholds (WCAG 2.1):
 *  - 1.4.3  Normal text:                     >= 4.5:1
 *  - 1.4.3  Large text (>=18pt/24px bold):   >= 3:1
 *  - 1.4.11 UI components / graphics:        >= 3:1
 *  - 1.4.3  Disabled/inactive controls are EXEMPT from 1.4.3.
 *
 * RESULTS (measured from the actual tokens, 2026-10-22):
 *
 *   PASSING — asserted strictly below:
 *     light textPrimary/background     17.40:1
 *     light textSecondary/background    5.74:1
 *     light accent/background           5.00:1
 *     dark  textPrimary/background     19.17:1
 *     dark  textSecondary/background    7.48:1
 *     dark  accent/background           5.21:1
 *     light success/successMuted        3.12:1
 *     light danger/dangerMuted          4.41:1
 *     light warning/warningMuted        3.07:1
 *     dark  success/successMuted        4.32:1
 *     dark  danger/dangerMuted          4.29:1
 *     dark  warning/warningMuted        6.17:1
 *
 *   KNOWN DEVIATIONS — pinned (not silently fixed) in the last describe block:
 *     border on surface: light 1.18:1 / dark 1.21:1 (needs 3:1 per 1.4.11)
 *     textTertiary on background: light 2.85:1 / dark 2.45:1 (exempt if used
 *       ONLY for disabled controls; NOT exempt if used for placeholder text)
 */

import { lightColors, darkColors } from '../tokens';

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map(c => c + c)
          .join('')
      : clean;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** WCAG 2.1 relative luminance. */
function luminance([r, g, b]: Rgb): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(fgHex: string, bgHex: string): number {
  const l1 = luminance(hexToRgb(fgHex));
  const l2 = luminance(hexToRgb(bgHex));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const NORMAL_TEXT = 4.5;
const LARGE_TEXT_AND_UI = 3.0;

type ColorSet = Record<string, string>;

/** Text tokens that must be readable against the page background. */
const textOnBackground = ['textPrimary', 'textSecondary'] as const;

const themes: [string, ColorSet][] = [
  ['light', lightColors],
  ['dark', darkColors],
];

describe.each(themes)('WCAG AA — %s theme (compliant pairs)', (name, c) => {
  it.each(textOnBackground)('%s on background meets 4.5:1', token => {
    expect(contrastRatio(c[token], c.background)).toBeGreaterThanOrEqual(NORMAL_TEXT);
  });

  it.each(textOnBackground)('%s on surface meets 4.5:1', token => {
    expect(contrastRatio(c[token], c.surface)).toBeGreaterThanOrEqual(NORMAL_TEXT);
  });

  it('accent on background meets 3:1 (large text / UI components)', () => {
    expect(contrastRatio(c.accent, c.background)).toBeGreaterThanOrEqual(LARGE_TEXT_AND_UI);
  });

  it('focus ring on background meets 3:1', () => {
    expect(contrastRatio(c.focus, c.background)).toBeGreaterThanOrEqual(LARGE_TEXT_AND_UI);
  });

  it('success on successMuted meets 3:1 (state chip)', () => {
    expect(contrastRatio(c.success, c.successMuted)).toBeGreaterThanOrEqual(LARGE_TEXT_AND_UI);
  });

  it('danger on dangerMuted meets 3:1 (state chip)', () => {
    expect(contrastRatio(c.danger, c.dangerMuted)).toBeGreaterThanOrEqual(LARGE_TEXT_AND_UI);
  });

  it('warning on warningMuted meets 3:1 (state chip)', () => {
    expect(contrastRatio(c.warning, c.warningMuted)).toBeGreaterThanOrEqual(LARGE_TEXT_AND_UI);
  });
});

/**
 * KNOWN DEVIATIONS — recorded, not hidden.
 *
 * These DO NOT meet the threshold. They are pinned here at their measured values
 * so (a) the suite stays green, (b) the shortfall is auditable in CI output, and
 * (c) any change to the palette immediately breaks this test and forces a review.
 *
 * Changing the approved palette requires owner approval, so these were NOT fixed
 * unilaterally.
 */
describe('KNOWN WCAG DEVIATIONS — awaiting owner decision', () => {
  /**
   * WCAG 1.4.11 Non-text Contrast: 3:1 required for visual boundaries that
   * identify a UI component. This applies here because DESIGN_BRIEF §9.2 states
   * input state is "communicated via border colour only" — so the border IS the
   * only affordance identifying the input.
   *
   * Compliant alternatives (computed, NOT applied):
   *   light: #8F8F8F -> 3.02:1 on surface, 3.23:1 on background
   *   dark:  #666666 -> 3.03:1 on surface, 3.29:1 on background
   */
  it('border/surface is BELOW 3:1 (light 1.18:1, dark 1.21:1) — needs owner approval to change', () => {
    const light = contrastRatio(lightColors.border, lightColors.surface);
    const dark = contrastRatio(darkColors.border, darkColors.surface);

    expect(light).toBeCloseTo(1.18, 1);
    expect(dark).toBeCloseTo(1.21, 1);
    expect(light).toBeLessThan(LARGE_TEXT_AND_UI);
    expect(dark).toBeLessThan(LARGE_TEXT_AND_UI);
  });

  /**
   * WCAG 1.4.3 exempts *disabled* controls, and textTertiary is documented as
   * "Disabled, muted text" — so its use for disabled labels/controls is fine.
   *
   * CAVEAT: DESIGN_BRIEF §9.2 assigns textTertiary to input *placeholder* text.
   * Placeholder text is NOT exempt, so if placeholders must be readable this
   * token needs to reach 4.5:1 (a mid-grey such as #767676 gives 4.54:1 on white).
   */
  it('textTertiary/background is BELOW 4.5:1 (light 2.85:1, dark 2.45:1) — exempt only for disabled controls', () => {
    const light = contrastRatio(lightColors.textTertiary, lightColors.background);
    const dark = contrastRatio(darkColors.textTertiary, darkColors.background);

    expect(light).toBeCloseTo(2.85, 1);
    expect(dark).toBeCloseTo(2.45, 1);
    expect(light).toBeLessThan(NORMAL_TEXT);
    expect(dark).toBeLessThan(NORMAL_TEXT);
  });
});

describe('WCAG AA contrast — full report', () => {
  it('logs all measured ratios for the audit record', () => {
    const lines = themes.flatMap(([name, c]) =>
      (
        [
          ['textPrimary/background', c.textPrimary, c.background],
          ['textSecondary/background', c.textSecondary, c.background],
          ['textTertiary/background', c.textTertiary, c.background],
          ['accent/background', c.accent, c.background],
          ['border/surface', c.border, c.surface],
          ['success/successMuted', c.success, c.successMuted],
          ['danger/dangerMuted', c.danger, c.dangerMuted],
          ['warning/warningMuted', c.warning, c.warningMuted],
        ] as const
      ).map(
        ([pair, fg, bg]) =>
          `    ${name.padEnd(5)} ${pair.padEnd(26)} ${contrastRatio(fg, bg).toFixed(2)}:1`
      )
    );

    // eslint-disable-next-line no-console
    console.log(`\n  WCAG contrast report:\n${lines.join('\n')}\n`);

    expect(lines).toHaveLength(16);
  });
});
