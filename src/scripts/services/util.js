import { decode } from 'he';

/** Class for utility functions */
export default class Util {
  /**
   * Extend an array just like JQuery's extend.
   * @returns {object} Merged objects.
   */
  static extend() {
    for (let i = 1; i < arguments.length; i++) {
      for (let key in arguments[i]) {
        if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
          if (
            typeof arguments[0][key] === 'object' &&
            typeof arguments[i][key] === 'object'
          ) {
            this.extend(arguments[0][key], arguments[i][key]);
          }
          else if (arguments[i][key] !== undefined) {
            arguments[0][key] = arguments[i][key];
          }
        }
      }
    }
    return arguments[0];
  }

  /**
   * HTML decode and strip HTML.
   * @param {string|object} html html.
   * @returns {string} html value.
   */
  static purifyHTML(html) {
    if (typeof html !== 'string') {
      return '';
    }

    let text = decode(html);
    const div = document.createElement('div');
    div.innerHTML = text;
    text = div.textContent || div.innerText || '';

    return text;
  }

  /**
   * Convert HTML to plain text while preserving line breaks and paragraphs.
   * @param {string} html HTML string to convert.
   * @returns {string} Plain text string.
   */
  static htmlToPlain(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    let text = tempDiv.innerHTML
      .replace(/<p>/g, ' ')
      .replace(/<\/p>/g, ' ')
      .replace(/<br\s*\/?>/g, ' ');

    text = Util.purifyHTML(text);

    text = text
      .replace(/\s+/g, ' ')
      .trim();

    return text;
  }
}
