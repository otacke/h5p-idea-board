import OptionField from '../option-field.js';
import './option-field-select.scss';

export default class OptionFieldSelect extends OptionField {

  constructor(field = {}, value, dictionary) {
    super(field, value, dictionary);

    this.contentDOM = document.createElement('select');
    this.contentDOM.classList.add('h5p-idea-board-options-dialog-option-field-select');
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

  getValue() {
    return {
      name: this.field.name,
      value: this.contentDOM.value,
    };
  }

  isValid() {
    return this.field.options.some((option) => option.value === this.contentDOM.value);
  }
}
