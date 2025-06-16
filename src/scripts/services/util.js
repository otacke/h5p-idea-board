import { decode } from 'he';

/** Class for utility functions */
export default class Util {
  /**
   * Add mixins to a class, useful for splitting files.
   * @param {object} [master] Master class to add mixins to.
   * @param {object[]|object} [mixins] Mixins to be added to master.
   */
  static addMixins(master = {}, mixins = []) {
    if (!master.prototype) {
      return;
    }

    if (!Array.isArray(mixins)) {
      mixins = [mixins];
    }

    const masterPrototype = master.prototype;

    mixins.forEach((mixin) => {
      const mixinPrototype = mixin.prototype;
      Object.getOwnPropertyNames(mixinPrototype).forEach((property) => {
        if (property === 'constructor') {
          return; // Don't need constructor
        }

        if (Object.getOwnPropertyNames(masterPrototype).includes(property)) {
          return; // property already present, do not override
        }

        masterPrototype[property] = mixinPrototype[property];
      });
    });
  }

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
   * Format language tag (RFC 5646). Assuming "language-coutry". No validation.
   * Cmp. https://tools.ietf.org/html/rfc5646
   * @param {string} languageCode Language tag.
   * @returns {string} Formatted language tag.
   */
  static formatLanguageCode(languageCode) {
    if (typeof languageCode !== 'string') {
      return languageCode;
    }

    /*
     * RFC 5646 states that language tags are case insensitive, but
     * recommendations may be followed to improve human interpretation
     */
    const segments = languageCode.split('-');
    segments[0] = segments[0].toLowerCase(); // ISO 639 recommendation
    if (segments.length > 1) {
      segments[1] = segments[1].toUpperCase(); // ISO 3166-1 recommendation
    }
    languageCode = segments.join('-');

    return languageCode;
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

  /**
   * Deeply merge two objects or arrays.
   * @param {object|object[]} obj1 First object or array.
   * @param {object|object[]} obj2 Second object or array (overrides obj1).
   * @returns {object|object[]} Merged result.
   */
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

  /**
   * Convert an array of name-value pairs to a plain object.
   * @param {object[]} arr Array of objects with name and value properties.
   * @returns {object} Plain object with names as keys and values as values.
   */
  static paramsArrayToPlainObject(arr) {
    const result = {};

    arr.forEach((item) => {
      if (Array.isArray(item.value)) {
        result[item.name] = Util.paramsArrayToPlainObject(item.value);
      }
      else {
        result[item.name] = item.value;
      }
    });

    return result;
  }
}
