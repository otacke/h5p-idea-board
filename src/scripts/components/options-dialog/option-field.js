import './option-field.scss';

export default class OptionField {
  /**
   * Base class for option fields.
   * @class
   * @param {object} field Field definition.
   * @param {number|string|boolean|object} value Field value.
   * @param {object} dictionary Dictionary for translations.
   */
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

  /**
   * Get DOM element for this field.
   * @returns {HTMLElement} DOM element.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get field name.
   * @returns {string} Field name.
   */
  getName() {
    return this.field.name;
  }

  /**
   * Get field value.
   * @returns {*} Field value.
   */
  getValue() {
    return; // Must be implemented
  }

  /**
   * Check if field value is valid.
   * @returns {boolean} True if valid.
   */
  isValid() {
    return true;
  }

  /**
   * Reset field errors.
   */
  reset() {
    this.setError();
  }

  /**
   * Validate field value and show error if invalid.
   */
  validate() {
    this.dom.classList.toggle('has-error', !this.isValid());
  }

  /**
   * Set error message.
   * @param {string} [message] Error message.
   */
  setError(message) {
    this.dom.classList.toggle('has-error', !!message);
    this.error.innerText = message ?? '';
  }

  /**
   * Handle resize events.
   */
  resize() {
    return; // May be implemented by subclasses
  }
}
