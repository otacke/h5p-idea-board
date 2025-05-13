import './option-field.scss';

export default class OptionField {
  constructor(field, value, dictionary) {
    this.field = field;

    this.dictionary = dictionary;

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-idea-board-options-dialog-option-field');
    this.dom.classList.add(field.type);

    this.uuid = H5P.createUUID();

    this.label = document.createElement('label');
    this.label.classList.add('h5p-idea-board-options-dialog-option-field-label');
    this.label.setAttribute('for', `field-${this.uuid}`);
    this.label.innerText = field.label || '';
    this.dom.append(this.label);

    if (field.description) {
      this.description = document.createElement('div');
      this.description.classList.add('h5p-idea-board-options-dialog-option-field-description');
      this.description.setAttribute('id', `field-${this.uuid}-description`);
      this.description.innerText = field.description;
      this.dom.append(this.description);
    }

    this.content = document.createElement('div');
    this.dom.append(this.content);

    this.error = document.createElement('div');
    this.error.classList.add('h5p-idea-board-options-dialog-option-field-errors');
    this.dom.append(this.error);

    return this;
  }

  getDOM() {
    return this.dom;
  }

  getName() {
    return this.field.name;
  }

  getValue() {
    return; // Must be implemented
  }

  isValid() {
    return true;
  }

  reset() {
    this.setError();
  }

  validate() {
    this.dom.classList.toggle('has-error', !this.isValid());
  }

  setError(message) {
    this.dom.classList.toggle('has-error', !!message);
    this.error.innerText = message ?? '';
  }
}
