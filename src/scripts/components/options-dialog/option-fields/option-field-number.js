import OptionField from '../option-field.js';
import './option-field-number.scss';

export default class OptionFieldNumber extends OptionField {
  /**
   * Number field for options dialog.
   * @class
   * @param {object} field Field definition.
   * @param {number} value Field value.
   * @param {object} dictionary Dictionary for translations.
   */
  constructor(field = {}, value, dictionary) {
    super(field, value, dictionary);

    this.contentDOM = document.createElement('input');
    this.contentDOM.classList.add('h5p-idea-board-options-dialog-option-field-number-input');
    this.contentDOM.setAttribute('id', `field-${this.uuid}`);
    this.contentDOM.setAttribute('type', 'number');
    this.contentDOM.setAttribute('aria-valuemin', this.field.min ?? '');
    this.contentDOM.setAttribute('aria-valuemax', this.field.max ?? '');
    this.contentDOM.setAttribute('step', this.field.step ?? 'any');
    this.contentDOM.setAttribute('placeholder', this.field.placeholder || '');
    this.contentDOM.setAttribute('spellcheck', 'false');
    this.contentDOM.setAttribute('autocomplete', 'off');
    if (this.description) {
      this.contentDOM.setAttribute('aria-describedby', `field-${this.uuid}-description`);
    }

    this.contentDOM.value = value ?? this.field.defaultValue ?? '';

    this.contentDOM.addEventListener('blur', () => {
      this.sanitize();
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
   * Reset field to default value.
   */
  reset() {
    this.contentDOM.value = this.field.defaultValue ?? '';
    this.setError();
  }

  /**
   * Check if field value is valid.
   * @returns {boolean} True if valid.
   */
  isValid() {
    const value = parseFloat(this.contentDOM.value);

    if (typeof value !== 'number' || isNaN(value) ) {
      return this.field.optional === true;
    }

    if (this.field.min !== undefined && value < this.field.min) {
      return false;
    }

    if (this.field.max !== undefined && value > this.field.max) {
      return false;
    }

    if (this.field.step !== undefined && value % this.field.step !== 0) {
      return false;
    }

    return true;
  }

  /**
   * Sanitize field value.
   */
  sanitize() {
    if (this.contentDOM.value < this.field.min) {
      this.contentDOM.value = this.field.min;
    }
    else if (this.contentDOM.value > this.field.max) {
      this.contentDOM.value = this.field.max;
    }
  }

  /**
   * Validate field value and show error if invalid.
   */
  validate() {
    if (this.isValid()) {
      this.setError();
      return;
    }
    const value = parseFloat(this.contentDOM.value);

    let message = '';

    if (typeof value !== 'number' && !this.field.optional) {
      message = this.dictionary.get('l10n.errorFieldRequired');
    }
    else if (this.field.min !== undefined && value < this.field.min) {
      message = this.dictionary.get('l10n.errorNumberMinValue').replace('@min', this.field.min);
    }
    else if (this.field.max !== undefined && value > this.field.max) {
      message = this.dictionary.get('l10n.errorNumberMaxValue').replace('@max', this.field.max);
    }
    else if (this.field.step !== undefined && value % this.field.step !== 0) {
      message = this.dictionary.get('l10n.errorNumberStepValue').replace('@step', this.field.step);
    }

    if (message) {
      this.setError(message);
    }
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
}
