import Color from 'color';

/** @constant {number} WCAG_CONTRAST_THRESHOLD_AA Minimum contrast ratio for AA compliance. */
const WCAG_CONTRAST_THRESHOLD_AA = 4.5;

/** @constant {string} CONTRAST_COLOR_FALLBACK_LIGHT Color white in hex format. */
const CONTRAST_COLOR_FALLBACK_LIGHT = '#ffffff';

/** @constant {string} CONTRAST_COLOR_FALLBACK_DARK Color black in hex format. */
const CONTRAST_COLOR_FALLBACK_DARK = '#000000';

/**
 * Ensure an rgb/rgba color string is rounded to the nearest integer.
 * @param {string} colorString Color string in rgb or rgba format.
 * @returns {string} Color string with rounded values.
 */
export const roundColorString = (colorString) => {
  const colorMatch = colorString.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i);

  const r = Math.round(parseFloat(colorMatch[1]));
  const g = Math.round(parseFloat(colorMatch[2]));
  const b = Math.round(parseFloat(colorMatch[3]));
  const a = colorMatch[4] !== undefined ? Math.round(parseFloat(colorMatch[4]) * 100) / 100 : 1;

  return a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;
};

/**
 * Get a color that has a contrast ratio of at least 4.5:1 with the given base color.
 * @param {string} baseColor Base color in any CSS color format.
 * @param {number} [maxAttempts] Maximum number of attempts to find a contrasting color.
 * @param {number} [step] Step size for adjusting the color.
 * @returns {string} A color that has a contrast ratio of at least 4.5:1 with the base color.
 */
export const getAccessibleContrastColor = (baseColor, maxAttempts = 20, step = 0.1) => {
  const original = Color(baseColor);
  const isDark = original.isDark();

  const adjust = (color, amount) => isDark ? color.lighten(amount) : color.darken(amount);

  for (let i = 1; i <= maxAttempts; i++) {
    const candidate = adjust(original, step * i);
    const contrast = original.contrast(candidate);

    if (contrast >= WCAG_CONTRAST_THRESHOLD_AA) {
      return candidate.hex();
    }
  }

  return isDark ? CONTRAST_COLOR_FALLBACK_LIGHT : CONTRAST_COLOR_FALLBACK_DARK;
};
