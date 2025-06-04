import FocusTrap from '@services/focus-trap.js';
import Util from '@services/util.js';
import H5PUtil from '@services/utils-h5p.js';
import OptionFieldFactory from './option-field-factory.js';
import './options-dialog.scss';

/** Class representing an overlay dialog */
export default class OptionsDialog {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      onCanceled: () => {},
      onSaved: () => {},
    }, callbacks);

    this.isShowingState = false;

    this.handleGlobalClick = this.handleGlobalClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-idea-board-options-dialog');
    this.dom.classList.toggle('open', false);
    if (this.params.cssMainSelector) {
      this.dom.classList.add(this.params.cssMainSelector);
    }
    this.dom.setAttribute('role', 'dialog');
    this.dom.setAttribute('aria-modal', 'true');

    // Container for H5P content, can be CSS-transformed
    this.contentContainer = document.createElement('div');
    this.contentContainer.classList.add(
      'h5p-idea-board-options-dialog-content-container'
    );
    this.dom.append(this.contentContainer);

    this.content = document.createElement('div');
    this.content.classList.add('h5p-idea-board-options-dialog-content');

    /*
     * These two help to prevent the dialog from closing when starting to drag
     * inside the dialog but ending outside of it. They interact with handleGlobalClick.
     */
    this.content.addEventListener('mousedown', (event) => {
      this.lastMouseDownElement = event.target;
    });
    this.content.addEventListener('mouseup', () => {
      window.requestAnimationFrame(() => {
        delete this.lastMouseDownElement;
      });
    });

    this.contentContainer.append(this.content);

    // Close button
    this.buttonClose = document.createElement('button');
    this.buttonClose.classList.add('h5p-idea-board-options-dialog-button-close');
    this.buttonClose.setAttribute(
      'aria-label', this.params.dictionary.get('a11y.close')
    );
    this.buttonClose.addEventListener('click', () => {
      this.cancel();
    });
    this.contentContainer.append(this.buttonClose);

    // Headline
    const headline = document.createElement('div');
    headline.classList.add('h5p-idea-board-options-dialog-headline');
    this.content.append(headline);

    this.headlineText = document.createElement('div');
    this.headlineText.classList.add('h5p-idea-board-options-dialog-headline-text');
    headline.append(this.headlineText);

    this.contentContainer = document.createElement('div');
    this.contentContainer.classList.add('h5p-idea-board-options-dialog-options-container');
    this.content.append(this.contentContainer);

    this.focusTrap = new FocusTrap({
      trapElement: this.dom,
      closeElement: this.buttonClose,
      fallbackContainer: this.contentContainer
    });

    this.buttonRow = document.createElement('div');
    this.buttonRow.classList.add('h5p-idea-board-options-dialog-button-row');
    this.contentContainer.append(this.buttonRow);

    this.saveButton = document.createElement('button');
    this.saveButton.classList.add('h5p-idea-board-options-dialog-button');
    this.saveButton.classList.add('save');
    this.saveButton.innerText = this.params.dictionary.get('l10n.save');
    this.saveButton.addEventListener('click', () => {
      this.save();
    });
    this.buttonRow.append(this.saveButton);

    const cancelButton = document.createElement('button');
    cancelButton.classList.add('h5p-idea-board-options-dialog-button');
    cancelButton.classList.add('cancel');
    cancelButton.innerText = this.params.dictionary.get('l10n.cancel');
    cancelButton.addEventListener('click', () => {
      this.cancel();
    });
    this.buttonRow.append(cancelButton);
  }

  /**
   * Get DOM for exercise.
   * @returns {HTMLElement} DOM for exercise.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Set callback.
   * @param {string} name Name of callback.
   * @param {function} callback Callback function.
   */
  setCallback(name, callback) {
    if (typeof name === 'string' && typeof callback === 'function') {
      this.callbacks[name] = callback;
    }
  }

  /**
   * Set the editor form.
   * @param {object} [data] Data to set.
   */
  setEditorForm(data = {}) {
    this.data = data;
    this.formFields = [];

    this.contentContainer.innerHTML = '';

    this.formFields = data.parent.children;
    this.contentContainer.append(data.formDOM);

    this.contentContainer.append(this.buttonRow);
  }

  /**
   * Set the form fields.
   * @param {object} fields Fields to set.
   * @param {object} values Values to set.
   */
  setCustomForm(fields, values) {
    this.type = 'custom';

    this.contentContainer.innerHTML = '';

    this.formFields = fields
      .map((field) => OptionFieldFactory.produce(field, values[field.name], this.params.dictionary))
      .filter((field) => field !== undefined && field !== null);

    this.formFields.forEach((field) => {
      this.contentContainer.appendChild(field.getDOM());
    });

    this.contentContainer.append(this.buttonRow);
  }

  handleErrorStateChanged(hasError) {
    this.saveButton.disabled = hasError;
  }

  /**
   * Save changes
   */
  save() {
    this.hide();

    let values;

    if (H5PUtil.isEditor()) {
      this.formFields.forEach((field) => {
        field.validate();
      });

      values = [];

      const contentTypeValues = Object
        .keys(this.data.values.contentType.params)
        .map((key) => {
          return {
            name: key,
            value: this.data.values.contentType.params[key]
          };
        });

      values.push({
        name: 'contentType',
        value: contentTypeValues
      });

      const cardSettingsValues = Object
        .keys(this.data.values.cardSettings)
        .map((key) => {
          return {
            name: key,
            value: this.data.values.cardSettings[key]
          };
        });

      values.push({
        name: 'cardSettings',
        value: cardSettingsValues
      });

      const cardCapabilitiesValues = Object
        .keys(this.data.values.cardCapabilities)
        .map((key) => {
          return {
            name: key,
            value: this.data.values.cardCapabilities[key]
          };
        });

      values.push({
        name: 'cardCapabilities',
        value: cardCapabilitiesValues
      });
    }
    else {
      const isInputValid = this.formFields.every((field) => field.isValid());
      if (!isInputValid) {
        this.formFields.forEach((field) => {
          field.validate();
        });

        return;
      }

      values = this.formFields.map((field) => {
        return field.getValue();
      });
    }

    this.callbacks.onSaved(values);
  }

  /**
   * Show.
   * @param {object} [params] Parameters.
   * @param {HTMLElement} [params.activeElement] Element to return focus to.
   */
  show(params = {}) {
    this.returnFocusTo = params.activeElement ?? document.activeElement;

    this.dom.classList.toggle('open', true);

    // Wait to allow DOM to progress
    window.requestAnimationFrame(() => {
      this.focusTrap.activate();

      document.addEventListener('click', this.handleGlobalClick);
      document.addEventListener('keydown', this.handleKeyDown);

      this.params.globals.get('mainInstance').trigger('resize');
    });

    this.isShowingState = true;
  }

  /**
   * Hide.
   */
  hide() {
    document.removeEventListener('click', this.handleGlobalClick);
    document.removeEventListener('keydown', this.handleKeyDown);

    this.dom.classList.toggle('open', false);

    this.focusTrap.deactivate();

    if (this.returnFocusTo && this.returnFocusTo.isConnected) {
      window.requestAnimationFrame(() => {
        this.returnFocusTo.focus();
      });
    }

    this.isShowingState = false;
  }

  /**
   * Cancel changes.
   */
  cancel() {
    this.hide();

    this.callbacks.onCanceled();
  }

  /**
   * Set DOM content.
   * @param {HTMLElement} dom DOM of content.
   */
  setContent(dom) {
    this.contentContainer.innerHTML = '';
    this.contentContainer.appendChild(dom);
  }

  /**
   * Set headline text.
   * @param {string} text Headline text to set.
   */
  setTitle(text) {
    text = Util.purifyHTML(text);

    this.headlineText.innerText = text;
    this.dom.setAttribute('aria-label', text);
  }

  /**
   * Handle global click event.
   * @param {Event} event Click event.
   */
  handleGlobalClick(event) {
    if (!event.target.isConnected || this.content.contains(this.lastMouseDownElement ?? event.target)) {
      return;
    }

    this.cancel();
  }

  /**
   * Handle key down.
   * @param {KeyboardEvent} event Keyboard event.
   */
  handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancel();
    }
  }

  /**
   * Resize the dialog. Only required as a workaround for CKEditor resizing issues.
   */
  resize() {
    /*
     * Workaround for CKEditor resizing issues in the editor.
     * // TODO: Remove once HFP-4262 is resolved, @see https://h5ptechnology.atlassian.net/browse/HFP-4262
     */
    if (!H5PUtil.isEditor() || !this.formFields || !this.isShowingState) {
      return;
    }

    const openCKEditorDOMs = [...this.content.querySelectorAll('.ck.ck-editor')];
    if (!openCKEditorDOMs) {
      return;
    }

    openCKEditorDOMs.forEach((openCKEditorDOM) => {
      openCKEditorDOM.style.maxWidth = '';
      openCKEditorDOM.style.width = 0;
      window.requestAnimationFrame(() => {
        openCKEditorDOM.style.width = `${openCKEditorDOM.parentElement.offsetWidth}px`;
      });
    });
  }
}
