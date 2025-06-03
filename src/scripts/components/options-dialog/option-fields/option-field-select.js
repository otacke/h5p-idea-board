import OptionField from '../option-field.js';
import './option-field-select.scss';

export default class OptionFieldSelect extends OptionField {
  /**
   * Select field for options dialog.
   * @class
   * @param {object} field Field definition.
   * @param {string} value Field value.
   * @param {object} dictionary Dictionary for translations.
   */
  constructor(field = {}, value, dictionary) {
    super(field, value, dictionary);

    this.contentDOM = document.createElement('select');
    this.contentDOM.classList.add('h5p-idea-board-options-dialog-option-field-boolean');
    this.contentDOM.setAttribute('id', `field-${this.uuid}`);
    if (this.description) {
      this.contentDOM.setAttribute('aria-describedby', `field-${this.uuid}-description`);
    }

    (field.options ?? []).forEach((option) => {
      const optionElement = document.createElement('option');
      optionElement.setAttribute('value', option.value);
      optionElement.innerText = option.label;
      this.contentDOM.append(optionElement);
    });

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
   * Reset field to default value.
   */
  reset() {
    if (this.field.defaultValue) {
      this.contentDOM.value = this.field.defaultValue;
    }
    else {
      const options = this.contentDOM.querySelectorAll('option');
      if (options.length > 0) {
        this.contentDOM.value = options[0].value;
      }
    }

    this.setError();
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
   * Check if field value is valid.
   * @returns {boolean} True if valid.
   */
  isValid() {
    return this.field.options.some((option) => option.value === this.contentDOM.value);
  }
}
