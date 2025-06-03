import OptionField from '../option-field.js';
import './option-field-text.scss';

export default class OptionFieldText extends OptionField {
  /**
   * Text field for options dialog.
   * @class
   * @param {object} field Field definition.
   * @param {string} value Field value.
   * @param {object} dictionary Dictionary for translations.
   */
  constructor(field = {}, value, dictionary) {
    super(field, value, dictionary);

    // Deviating from semantics spec to support multiple regexps
    if (!Array.isArray(this.field.regexp)) {
      if (typeof this.field.regexp === 'object' && this.field.regexp !== null) {
        this.field.regexp = [this.field.regexp];
      }
      else {
        this.field.regexp = [];
      }
    }

    this.field.regexp = this.field.regexp.filter((regexp) => {
      return regexp.pattern;
    });

    this.contentDOM = document.createElement('input');
    this.contentDOM.classList.add('h5p-idea-board-options-dialog-option-field-text-input');
    this.contentDOM.setAttribute('id', `field-${this.uuid}`);
    this.contentDOM.setAttribute('type', 'text');
    this.contentDOM.setAttribute('placeholder', this.field.placeholder || '');
    this.contentDOM.setAttribute('spellcheck', 'false');
    this.contentDOM.setAttribute('autocomplete', 'off');
    if (this.description) {
      this.contentDOM.setAttribute('aria-describedby', `field-${this.uuid}-description`);
    }

    this.contentDOM.value = value ?? this.field.defaultValue ?? '';

    this.contentDOM.addEventListener('blur', () => {
      this.validate();
    });

    this.contentDOM.addEventListener('input', () => {
      this.setError();
    });

    const newDOM = this.contentDOM;
    this.content.replaceWith(newDOM);
    this.content = newDOM;
  }

  /**
   * Get field value.
   * @returns {object} Field name and value.
   */
  getValue() {
    return {
      name: this.field.name,
      value: this.contentDOM.value,
    };
  }

  /**
   * Reset field to default value.
   */
  reset() {
    this.contentDOM.value = '';
    this.setError();
  }

  /**
   * Check if field value is valid.
   * @returns {boolean} True if valid.
   */
  isValid() {
    const value = this.contentDOM.value.trim();
    if (value === '') {
      return !!this.field.optional;
    }

    const isMatchingAllPatterns = this.field.regexp.every((rule) => {
      const regexp = new RegExp(rule.pattern, rule.modifiers ?? '');

      return regexp.test(value);
    });

    if (!isMatchingAllPatterns) {
      return false;
    }

    return true;
  }

  /**
   * Validate field value and show error if invalid.
   */
  validate() {
    if (this.isValid()) {
      this.setError();
      return;
    }

    let message = '';

    const value = this.contentDOM.value.trim();
    this.field.regexp.forEach((rule) => {
      const regexp = new RegExp(rule.pattern, rule.modifiers ?? '');

      if (!regexp.test(value)) {
        message = [message, rule.message].join(' ');
      }
    });

    if (message) {
      this.setError(message);
    }
  }
}
