import OptionField from '../option-field.js';
import './option-field-group.scss';

export default class OptionFieldGroup extends OptionField {

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

  reset() {
    this.children.forEach((field) => {
      field.reset();
    });
  }

  getValue() {
    const values = this.children.map((field) => {
      return field.getValue();
    });

    return {
      name: this.getName(),
      value: values
    };
  }

  isValid() {
    return this.children.every((field) => field.isValid());
  }

  validate() {
    this.children.forEach((field) => {
      field.validate();
    });
  }

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

  collapse() {
    this.panelContent.setAttribute('hidden', 'true');
    this.panelButton.setAttribute('aria-expanded', 'false');
  }

  expand() {
    this.panelContent.removeAttribute('hidden');
    this.panelButton.setAttribute('aria-expanded', 'true');
  }
}
