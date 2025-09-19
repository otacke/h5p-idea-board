import OptionField from '../option-field.js';
import './option-field-group.scss';

export default class OptionFieldGroup extends OptionField {
  /**
   * Group field for options dialog.
   * @class
   * @param {object} field Field definition.
   * @param {object} value Field value.
   * @param {object} dictionary Dictionary for translations.
   * @param {object} factory Factory for creating child fields.
   */
  constructor(field = {}, value, dictionary, factory) {
    super(field, value, dictionary);

    field.importance = field.importance || 'low';

    this.contentDOM = document.createElement('div');
    this.contentDOM.classList.add('h5p-idea-board-options-dialog-option-field-group');
    this.contentDOM.setAttribute('id', `field-${this.uuid}`);

    const panel = document.createElement('div');
    panel.classList.add('h5p-idea-board-options-dialog-option-field-group-panel');
    panel.classList.add(`importance-${field.importance}`);
    const headerId = H5P.createUUID();
    const contentId = H5P.createUUID();

    const header = document.createElement('div');
    header.classList.add('h5p-idea-board-options-dialog-option-field-group-panel-header');
    header.setAttribute('id', headerId);

    header.addEventListener('click', () => {
      this.toggle();
    });

    panel.append(header);

    this.panelButton = document.createElement('button');
    this.panelButton.classList.add('h5p-idea-board-options-dialog-option-field-group-panel-button');
    this.panelButton.setAttribute('aria-controls', contentId);
    this.panelButton.setAttribute('aria-expanded', 'false');
    this.panelButton.innerText = this.label.innerText;
    header.append(this.panelButton);

    this.label.remove();

    this.panelContent = document.createElement('div');
    this.panelContent.classList.add('h5p-idea-board-options-dialog-option-field-group-panel-content');
    this.panelContent.setAttribute('id', contentId);
    this.panelContent.setAttribute('aria-labelledby', headerId);
    this.panelContent.setAttribute('role', 'region');
    this.panelContent.setAttribute('hidden', 'true');
    panel.append(this.panelContent);

    this.contentDOM.append(panel);

    this.toggle(this.field.expanded === true);

    this.children = (this.field.fields ?? [])
      .map((field) => factory.produce(field, value?.[field.name], dictionary))
      .filter((field) => field !== undefined && field !== null);

    this.children.forEach((field) => {
      this.panelContent.appendChild(field.getDOM());
    });

    const newDOM = this.contentDOM;
    this.content.replaceWith(newDOM);
    this.content = newDOM;
  }

  /**
   * Reset field to default value.
   */
  reset() {
    this.children.forEach((field) => {
      field.reset();
    });
  }

  /**
   * Get field value.
   * @returns {object} Field name and value.
   */
  getValue() {
    const values = this.children.map((field) => {
      return field.getValue();
    });

    return {
      name: this.getName(),
      value: values,
    };
  }

  /**
   * Check if field and all children are valid.
   * @returns {boolean} True if valid.
   */
  isValid() {
    return this.children.every((field) => field.isValid());
  }

  /**
   * Validate field and all children.
   */
  validate() {
    this.children.forEach((field) => {
      field.validate();
    });
  }

  /**
   * Toggle expanded state.
   * @param {boolean} [shouldExpand] Whether to expand.
   */
  toggle(shouldExpand) {
    shouldExpand = (typeof shouldExpand === 'boolean') ?
      shouldExpand :
      this.panelButton.getAttribute('aria-expanded') !== 'true';

    if (shouldExpand) {
      this.expand();
    }
    else {
      this.collapse();
    }
  }

  /**
   * Collapse group field.
   */
  collapse() {
    this.panelContent.setAttribute('hidden', 'true');
    this.panelButton.setAttribute('aria-expanded', 'false');
  }

  /**
   * Expand group field.
   */
  expand() {
    this.panelContent.removeAttribute('hidden');
    this.panelButton.setAttribute('aria-expanded', 'true');
  }
}
