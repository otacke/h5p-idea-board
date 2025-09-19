import Pickr from '@simonwep/pickr';

import OptionField from '../option-field.js';
import './option-field-text-color-selector.scss';
import '@simonwep/pickr/dist/themes/nano.min.css';
import Util from '@services/util.js';

/** @constant {string} DEFAULT_RGBA Default color if nothing is specified. */
const DEFAULT_RGBA = 'rgba(255, 255, 255, 0)';

export default class OptionFieldText extends OptionField {
  /**
   * Text color selector field for options dialog.
   * @class
   * @param {object} field Field definition.
   * @param {string} value Field value.
   * @param {object} dictionary Dictionary for translations.
   */
  constructor(field = {}, value, dictionary) {
    super(field, value, dictionary);

    // Deviating from semantics spec to support multiple regexps
    if (!Array.isArray(this.field.regexp)) {
      if (typeof this.field.regexp === 'object' && this.field.regexp !== null) {
        this.field.regexp = [this.field.regexp];
      }
      else {
        this.field.regexp = [];
      }
    }

    this.field.regexp = this.field.regexp.filter((regexp) => {
      return regexp.pattern;
    });

    this.contentDOM = document.createElement('div');
    this.contentDOM.classList.add('h5p-idea-board-options-dialog-option-field-text-color-selector');

    const uuid = H5P.createUUID();
    const pickerDOM = document.createElement('div');
    pickerDOM.classList.add('h5p-idea-board-options-dialog-option-field-text-color-selector-picker');
    pickerDOM.setAttribute('id', `h5p-idea-board-options-dialog-option-field-text-color-selector-picker-${uuid}`);
    this.contentDOM.append(pickerDOM);

    const swatches = Array.isArray(field?.spectrum?.palette) ? field.spectrum.palette.flat() : [];

    Util.callOnceVisible(pickerDOM, () => {
      this.pickr = Pickr.create({
        el: `#h5p-idea-board-options-dialog-option-field-text-color-selector-picker-${uuid}`,
        container: this.contentDOM,
        inline: true,
        theme: 'nano',
        swatches: swatches,
        components: {
          preview: true,
          hue: true,
          interaction: {
            hex: true,
            rgba: true,
            input: true,
            cancel: true,
            save: true,
          },
        },
        i18n: {
          'ui:dialog': dictionary.get('a11y.colorPickerDialog'),
          'btn:toggle': dictionary.get('a11y.toggleColorPicker'),
          'btn:save': dictionary.get('l10n.choose'),
          'aria:btn:save': dictionary.get('l10n.choose'),
          'btn:cancel': dictionary.get('l10n.cancel'),
          'aria:btn:cancel': dictionary.get('l10n.cancel'),
          'aria:palette': dictionary.get('a11y.colorSelectionArea'),
          'aria:hue': dictionary.get('a11y.hueSlider'),
          'aria:opacity': dictionary.get('a11y.opacitySlider'),
        },
      });

      this.pickr.on('init', (instance) => {
        const app = instance?.getRoot().app;
        if (!app) {
          return;
        }

        this.pickr.setColor(value ?? this.field.defaultValue ?? DEFAULT_RGBA, false);

        app.style.position = '';
      });

      this.pickr.on('cancel', () => {
        this.pickr.hide();
      });

      this.pickr.on('save', (color) => {
        this.pickerColor = color?.toRGBA().toString() ?? this.field.defaultValue ?? DEFAULT_RGBA;
        this.pickr.hide();
      });
    });

    this.pickerColor = value;

    const newDOM = this.contentDOM;
    this.content.replaceWith(newDOM);
    this.content = newDOM;
  }

  /**
   * Get field value.
   * @returns {object} Field name and value.
   */
  getValue() {
    return {
      name: this.field.name,
      value: this.pickerColor,
    };
  }

  /**
   * Reset field to default value.
   */
  reset() {
    this.pickerColor = this.field.defaultValue ?? '#ffffff';
    this.setError();
  }

  /**
   * Check if field value is valid.
   * @returns {boolean} True if valid.
   */
  isValid() {
    const value = this.pickerColor.trim();
    if (value === '') {
      return !!this.field.optional;
    }

    const isMatchingAllPatterns = this.field.regexp.every((rule) => {
      const regexp = new RegExp(rule.pattern, rule.modifiers ?? '');

      return regexp.test(value);
    });

    if (!isMatchingAllPatterns) {
      return false;
    }

    return true;
  }

  /**
   * Validate field value and show error if invalid.
   */
  validate() {
    if (this.isValid()) {
      this.setError();
      return;
    }

    let message = '';

    const value = this.colorPicker.value.trim();
    this.field.regexp.forEach((rule) => {
      const regexp = new RegExp(rule.pattern, rule.modifiers ?? '');

      if (!regexp.test(value)) {
        message = [message, rule.message].join(' ');
      }
    });

    if (message) {
      this.setError(message);
      return;
    }
  }
}
