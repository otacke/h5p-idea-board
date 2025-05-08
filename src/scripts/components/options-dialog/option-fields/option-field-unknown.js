import OptionField from '../option-field.js';
import './option-field-unknown.scss';

export default class OptionFieldUnknown extends OptionField {

  constructor(field = {}, value, dictionary) {
    super(field, value, dictionary);

    this.contentDOM = document.createElement('span');
    this.contentDOM.classList.add('h5p-idea-board-options-dialog-option-field-unknown');

    const type = `${field.type}${field.widget ? `/${field.widget}` : ''}`;
    this.contentDOM.innerText = dictionary.get('l10n.unknownFieldType').replace('@type', type);
    this.dom.append(this.contentDOM);
  }

  reset() {
  }

  getValue() {
    return {
      name: this.field.name,
      value: this.value,
    };
  }
}
