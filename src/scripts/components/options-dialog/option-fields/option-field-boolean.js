import OptionField from '../option-field.js';
import './option-field-select.scss';

export default class OptionFieldSelect extends OptionField {

  constructor(field = {}, value, dictionary) {
    super(field, value, dictionary);

    this.contentDOM = document.createElement('input');
    this.contentDOM.classList.add('h5p-idea-board-options-dialog-option-field-boolean');
    this.contentDOM.setAttribute('id', `field-${this.uuid}`);
    if (this.description) {
      this.contentDOM.setAttribute('aria-describedby', `field-${this.uuid}-description`);
    }
    this.contentDOM.setAttribute('type', 'checkbox');
    this.contentDOM.checked = value ?? (this.field.default || false);

    this.contentDOM.addEventListener('blur', () => {
      this.validate();
    });

    this.contentDOM.addEventListener('input', () => {
      this.setError();
    });

    const newDOM = this.contentDOM;
    this.content.replaceWith(newDOM);
    this.content = newDOM;

    // Move checkbox in front of label
    const contentIndex = Array.from(this.dom.children).indexOf(this.content);
    const labelIndex = Array.from(this.dom.children).indexOf(this.label);
    if (contentIndex > labelIndex) {
      this.dom.insertBefore(this.content, this.label);
    }
  }

  reset() {
    this.contentDOM.checked = this.field.default || false;
    this.setError();
  }

  getValue() {
    return {
      name: this.field.name,
      value: this.contentDOM.checked,
    };
  }
}
