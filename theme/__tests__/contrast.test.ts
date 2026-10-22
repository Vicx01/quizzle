/**
 * Quizzle — WCAG AA contrast verification.
 *
 * Owner approval condition 1: "Keep the documented palette provisionally, but
 * verify WCAG AA contrast in light and dark themes before finalising the tokens."
 *
 * RESOLVED 2026-10-22. The two deviations found during Phase 3 were fixed by
 * splitting the overloaded tokens rather than by pinning the failures:
 *
 *   - `border`        -> split into `border` (decorative) + `borderControl`
 *                        (control boundaries, >= 3:1).
 *   - `textTertiary`  -> raised to >= 4.5:1 and split from `textDisabled`
 *                        (disabled controls, exempt from 1.4.3).
 *
 * Thresholds (WCAG 2.1):
 *  - 1.4.3  Normal text:                    >= 4.5:1
 *  - 1.4.3  Large text (>=18pt/24px bold):  >= 3:1
 *  - 1.4.11 UI components / graphics:       >= 3:1
 *  - 1.4.3  Disabled/inactive controls are EXEMPT.
 *
 * Every assertion below is a real compliance requirement, not a pin.
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

const themes: [string, ColorSet][] = [
  ['light', lightColors],
  ['dark', darkColors],
];

/** Text tokens required to be readable as normal-size text. */
const readableTextTokens = ['textPrimary', 'textSecondary', 'textTertiary'] as const;

describe.each(themes)('WCAG 1.4.3 — text contrast (%s)', (name, c) => {
  it.each(readableTextTokens)('%s on background meets 4.5:1', token => {
    expect(contrastRatio(c[token], c.background)).toBeGreaterThanOrEqual(NORMAL_TEXT);
  });

  it.each(readableTextTokens)('%s on surface meets 4.5:1', token => {
    expect(contrastRatio(c[token], c.surface)).toBeGreaterThanOrEqual(NORMAL_TEXT);
  });

  it('textTertiary is readable on surface (placeholder text is NOT exempt)', () => {
    // Placeholders sit on `surface`, not on `background`. A value like #767676
    // passes against pure white (4.54:1) but FAILS against #F7F7F7 (4.24:1),
    // so both surfaces must be checked.
    expect(contrastRatio(c.textTertiary, c.surface)).toBeGreaterThanOrEqual(NORMAL_TEXT);
  });
});

describe.each(themes)('WCAG 1.4.11 — non-text contrast (%s)', (name, c) => {
  it('borderControl on surface meets 3:1 (control boundary)', () => {
    expect(contrastRatio(c.borderControl, c.surface)).toBeGreaterThanOrEqual(LARGE_TEXT_AND_UI);
  });

  it('borderControl on background meets 3:1 (control boundary)', () => {
    expect(contrastRatio(c.borderControl, c.background)).toBeGreaterThanOrEqual(LARGE_TEXT_AND_UI);
  });

  it('accent on background meets 3:1 (selected state, large text / UI)', () => {
    expect(contrastRatio(c.accent, c.background)).toBeGreaterThanOrEqual(LARGE_TEXT_AND_UI);
  });

  it('focus ring on background meets 3:1', () => {
    expect(contrastRatio(c.focus, c.background)).toBeGreaterThanOrEqual(LARGE_TEXT_AND_UI);
  });

  /**
   * A progress bar conveys information through the fill/track boundary, so that
   * pair is the one 1.4.11 governs. The track itself need not contrast with the
   * page, only with the fill.
   */
  it('progress fill vs track meets 3:1', () => {
    expect(contrastRatio(c.accent, c.border)).toBeGreaterThanOrEqual(LARGE_TEXT_AND_UI);
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

describe('Disabled controls — exempt from WCAG 1.4.3', () => {
  /**
   * `textDisabled` is intentionally below 4.5:1. WCAG 1.4.3 exempts inactive
   * controls, so faded disabled labels are permitted.
   *
   * The important guarantee is that disabled styling is a SEPARATE token from
   * `textTertiary`, so nothing that must be readable can silently inherit the
   * faded value. These assertions lock that separation in.
   */
  it('textDisabled is a distinct token from textTertiary', () => {
    expect(lightColors.textDisabled).not.toBe(lightColors.textTertiary);
    expect(darkColors.textDisabled).not.toBe(darkColors.textTertiary);
  });

  it('textTertiary (readable) has higher contrast than textDisabled (exempt)', () => {
    for (const c of [lightColors, darkColors]) {
      expect(contrastRatio(c.textTertiary, c.background)).toBeGreaterThan(
        contrastRatio(c.textDisabled, c.background)
      );
    }
  });

  it('textDisabled is visibly faded rather than fully contrast-free', () => {
    // Guard against accidentally setting the disabled colour equal to the
    // background, which would make disabled labels disappear entirely.
    for (const c of [lightColors, darkColors]) {
      expect(contrastRatio(c.textDisabled, c.background)).toBeGreaterThan(1.5);
    }
  });
});

describe('Decorative border — deliberately subtle, documented', () => {
  /**
   * `border` is for dividers, card outlines and progress tracks only. It is
   * intentionally below 3:1, which is permitted because those boundaries are not
   * required to identify a control (WCAG 1.4.11).
   *
   * This test documents that decision and will fail if `border` is ever made
   * compliant by accident — at which point it should be merged with
   * `borderControl` and this test removed.
   */
  it('border is documented as decorative and NOT used to identify controls', () => {
    expect(contrastRatio(lightColors.border, lightColors.surface)).toBeLessThan(LARGE_TEXT_AND_UI);
    expect(contrastRatio(darkColors.border, darkColors.surface)).toBeLessThan(LARGE_TEXT_AND_UI);
  });

  it('borderControl is strictly more visible than the decorative border', () => {
    for (const c of [lightColors, darkColors]) {
      expect(contrastRatio(c.borderControl, c.surface)).toBeGreaterThan(
        contrastRatio(c.border, c.surface)
      );
    }
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
          ['textTertiary/surface', c.textTertiary, c.surface],
          ['textDisabled/background (exempt)', c.textDisabled, c.background],
          ['borderControl/surface', c.borderControl, c.surface],
          ['borderControl/background', c.borderControl, c.background],
          ['border/surface (decorative)', c.border, c.surface],
          ['accent/background', c.accent, c.background],
          ['accent/border (progress)', c.accent, c.border],
          ['success/successMuted', c.success, c.successMuted],
          ['danger/dangerMuted', c.danger, c.dangerMuted],
          ['warning/warningMuted', c.warning, c.warningMuted],
        ] as const
      ).map(
        ([pair, fg, bg]) =>
          `    ${name.padEnd(5)} ${pair.padEnd(30)} ${contrastRatio(fg, bg).toFixed(2)}:1`
      )
    );

    // eslint-disable-next-line no-console
    console.log(`\n  WCAG contrast report:\n${lines.join('\n')}\n`);

    expect(lines).toHaveLength(26);
  });
});
