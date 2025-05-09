import { decode } from 'he';

/** Class for utility functions */
export default class Util {
  /**
   * Extend an array just like JQuery's extend.
   * @param {*} target Target.
   * @param {...*} sources Sources.
   * @returns {object} Merged objects.
   */
  static extend(target, ...sources) {
    sources.forEach((source) => {
      for (let key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          if (key === '__proto__' || key === 'constructor') {
            continue; // Prevent prototype pollution
          }
          if (
            typeof target[key] === 'object' && !Array.isArray(target[key]) &&
            typeof source[key] === 'object' && !Array.isArray(source[key])
          ) {
            this.extend(target[key], source[key]);
          }
          else if (Array.isArray(source[key])) {
            target[key] = source[key].slice();
          }
          else if (source[key] !== undefined) {
            target[key] = source[key];
          }
        }
      }
    });
    return target;
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

  /**
   * Call callback function once dom element gets visible in viewport.
   * @async
   * @param {HTMLElement} dom DOM element to wait for.
   * @param {function} callback Function to call once DOM element is visible.
   * @param {object} [options] IntersectionObserver options.
   * @returns {IntersectionObserver} Promise for IntersectionObserver.
   */
  static async callOnceVisible(dom, callback, options = {}) {
    if (typeof dom !== 'object' || typeof callback !== 'function') {
      return; // Invalid arguments
    }

    options.threshold = options.threshold || 0;

    return await new Promise((resolve) => {
      // iOS is behind ... Again ...
      const idleCallback = window.requestIdleCallback ?
        window.requestIdleCallback :
        window.requestAnimationFrame;

      idleCallback(() => {
        // Get started once visible and ready
        const observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
            observer.unobserve(dom);
            observer.disconnect();

            callback();
          }
        }, {
          ...(options.root && { root: options.root }),
          threshold: options.threshold,
        });
        observer.observe(dom);

        resolve(observer);
      });
    });
  }

  static mergeDeep(obj1, obj2) {
    if (Array.isArray(obj1) && Array.isArray(obj2)) {
      const maxLength = Math.max(obj1.length, obj2.length);
      const result = [];
      for (let i = 0; i < maxLength; i++) {
        if (i in obj2) {
          result[i] = Util.mergeDeep(obj1[i], obj2[i]);
        }
        else {
          result[i] = obj1[i];
        }
      }
      return result;
    }

    if (
      typeof obj1 === 'object' && obj1 !== null && !Array.isArray(obj1) &&
      typeof obj2 === 'object' && obj2 !== null && !Array.isArray(obj2)
    ) {
      const result = { ...obj1 };
      for (const key in obj2) {
        result[key] = Util.mergeDeep(obj1[key], obj2[key]);
      }
      return result;
    }

    // Primitive or obj2 overrides
    return obj2 !== undefined ? obj2 : obj1;
  }
}
