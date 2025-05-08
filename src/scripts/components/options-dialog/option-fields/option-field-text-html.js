
import OptionField from '../option-field.js';
import Util from '@services/util.js';

import './option-field-text-html.scss';

/** @constant {object} DEFAULT_CKE_CONFIG Config mirroring html widget in semantics.json */
const DEFAULT_CKE_CONFIG = {
  removePlugins: ['MathType'],
  updateSourceElementOnDestroy: true,
  startupFocus: false,
  toolbar: [
    'bold', 'italic', 'underline', 'strikeThrough', 'Subscript', 'Superscript', '|',
    'RemoveFormat', '|',
    'alignment', 'bulletedList', 'numberedList', '|',
    'link', '|',
    'horizontalLine', 'heading', 'fontSize', 'fontColor'
  ],
  link: {
    defaultProtocol: 'https://',
  },
  heading: {
    options: [
      { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
      { model: 'formatted', view: 'pre', title: 'Formatted' },
      { model: 'address', view: 'address', title: 'Address' },
      { model: 'normal', view: 'div', title: 'Normal (DIV)' }
    ]
  },
  alignment: {
    options: ['left', 'center', 'right']
  }
};

export default class OptionFieldText extends OptionField {

  constructor(field = {}, value, dictionary) {
    super(field, value, dictionary);

    this.id = H5P.createUUID();

    this.contentDOM = document.createElement('div');
    this.contentDOM.classList.add('h5p-idea-board-options-dialog-option-field-text-html-container');

    this.contentDOM.addEventListener('blur', () => {
      this.validate();
    });

    this.contentDOM.addEventListener('input', () => {
      this.setError();
    });

    this.textarea = document.createElement('div');
    this.textarea.classList.add('h5p-idea-board-options-dialog-option-field-text-html-textarea');
    this.textarea.setAttribute('tabindex', 0);
    if (field.placeholder) {
      this.textarea.setAttribute('placeholder', field.placeholder);
    }
    if (value) {
      this.textarea.innerHTML = value ?? this.field.defaultValue ?? '';
    }
    this.contentDOM.append(this.textarea);

    this.textarea.addEventListener('focus', () => {
      // Prevent outside click listener from firing when click caused focus
      this.canBeHidden = false;
      window.requestAnimationFrame(() => {
        this.canBeHidden = true;
      });

      this.initCKEditor( { text: this.textarea.innerHTML } );
      this.showCKEditor();
    });

    this.textarea.addEventListener('click', () => {
      this.initCKEditor( { text: this.textarea.innerHTML } );
      this.showCKEditor();
    });

    document.addEventListener('click', (event) => {
      const wasClickedOutside =
        event.target.closest('.h5p-idea-board-options-dialog-option-field-text-html-container') === null;
      if (!wasClickedOutside) {
        return;
      }

      this.hideCKEditor();
    });

    // TODO: CHECK
    this.textarea.id = this.id;

    const newDOM = this.contentDOM;
    this.content.replaceWith(newDOM);
    this.content = newDOM;
  }

  /**
   * Initialize CKEditor.
   * @param {object} [config] Configuration.
   */
  initCKEditor(config = {}) {
    if (this.ckeditor) {
      return;
    }

    /*
     * Workaround for H5PCLI that for some reason adds the patch version to the path
     * @see https://h5ptechnology.atlassian.net/browse/HFP-4240
     */
    for (let uberName in H5PIntegration.libraryDirectories) {
      const path = H5PIntegration.libraryDirectories[uberName];
      let [ main, version ] = path.split('-');
      // eslint-disable-next-line no-magic-numbers
      version = version.split('.').slice(0, 2).join('.');
      H5PIntegration.libraryDirectories[uberName] = `${main}-${version}`;
    }

    config = Util.extend({ title: this.dictionary.get('a11y.textInputTitle') }, config);

    this.ckeditor = this.buildCKEditor(config);
    this.updateTextAreaFromCKEditor();
  }

  showCKEditor() {
    if (this.isShowingCKEditor) {
      return;
    }

    if (!this.ckeditor) {
      this.initCKEditor( { text: this.textarea.innerHTML });
    }

    this.ckeditor.create();
    this.isShowingCKEditor = true;

    this.callOnceCKEditorVisible(this.dom, () => {
      this.textarea.classList.remove('opacity-zero');

      const ckeditorContentDOM = this.dom.querySelector('.h5p-ckeditor .ck-content');
      ckeditorContentDOM?.addEventListener('keydown', () => {
        this.updateTextAreaFromCKEditor();
      });

      ckeditorContentDOM.addEventListener('focus', () => {
        // Prevent outside click listener from firing when focus was just given
        this.canBeHidden = false;
        window.requestAnimationFrame(() => {
          this.canBeHidden = true;
        });
      });

      const toolbar = this.dom.querySelector('.h5p-ckeditor .ck-toolbar');
      toolbar?.addEventListener('click', () => {
        this.updateTextAreaFromCKEditor();
      });
    });
  }

  hideCKEditor() {
    if (!this.ckeditor) {
      return;
    }

    this.updateTextAreaFromCKEditor();

    this.ckeditor.destroy();
    delete this.ckeditor;
    this.isShowingCKEditor = false;
  }

  /**
   * Build H5P.CKEditor instance (!== CKEditor instance).
   * @param {object} [config] Configuration.
   * @returns {H5P.CKEditor} H5P.CKEditor instance.
   */
  buildCKEditor(config = {}) {
    return new H5P.CKEditor(
      this.id,
      'en',
      H5P.jQuery(this.dom),
      config.text ?? '',
      Util.extend(DEFAULT_CKE_CONFIG, config)
    );
  }

  /**
   * Update textarea with content from CKEditor.
   */
  updateTextAreaFromCKEditor() {
    this.textarea.innerHTML = this.getHTML();
  }

  /**
   * Get HTML.
   * @returns {string} HTML.
   */
  getHTML() {
    return this.ckeditor?.getData() ?? this.textarea.innerHTML ?? '';
  }

  /**
   * Call callback function once CKEditor is visible.
   * @param {HTMLElement} dom DOM element to wait on.
   * @param {function} callback Function to call once CKEditor is visible.
   */
  callOnceCKEditorVisible(dom, callback) {
    if (typeof dom !== 'object' || typeof callback !== 'function') {
      return; // Invalid arguments
    }

    const observer = new MutationObserver(() => {
      const ckeditorDOM = dom.querySelector('.h5p-ckeditor');

      if (!ckeditorDOM) {
        return;
      }

      observer.disconnect();

      callback();
    });

    observer.observe(dom, { attributes: true, childList: true, subtree: true });
  }

  getValue() {
    return {
      name: this.field.name,
      value: this.getHTML()
    };
  }

  reset() {
    this.hideCKEditor();
    this.textarea.innerHTML = '';
    this.setError();
  }

  isValid() {
    const value = this.getHTML().trim();
    if (value === '') {
      return !!this.field.optional;
    }

    return true;
  }

  validate() {
    if (this.isValid()) {
      this.setError();
      return;
    }
  }
}
