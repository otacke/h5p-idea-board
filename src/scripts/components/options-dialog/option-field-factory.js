import OptionFieldBoolean from './option-fields/option-field-boolean.js';
import OptionFieldGroup from './option-fields/option-field-group.js';
import OptionFieldNumber from './option-fields/option-field-number.js';
import OptionFieldText from './option-fields/option-field-text.js';
import OptionFieldTextColorSelector from './option-fields/option-field-text-color-selector.js';
import OptionFieldTextHtml from './option-fields/option-field-text-html.js';
import OptionFieldSelect from './option-fields/option-field-select.js';
import OptionFieldUnknown from './option-fields/option-field-unknown.js';

export default class OptionsFieldFactory {
  /**
   * Produce a field instance based on field type and widget.
   * @param {object} field Field definition.
   * @param {number|string|boolean|object} value Field value.
   * @param {object} dictionary Dictionary for translations.
   * @returns {object} Field instance.
   */
  static produce(field = {}, value, dictionary) {
    let type = field.type;
    if (field.widget) {
      type = `${type}/${field.widget}`;
    }

    return this.createField(type, field, value, dictionary);
  }

  /**
   * Create a field instance for a specific type.
   * @param {string} type Field type (possibly including widget).
   * @param {object} field Field definition.
   * @param {number|string|boolean|object} value Field value.
   * @param {object} dictionary Dictionary for translations.
   * @returns {object} Field instance.
   */
  static createField(type, field, value, dictionary) {
    const [fieldType, widget] = type.split('/');

    if (fieldType === 'text') {
      if (widget === 'colorSelector') {
        return new OptionFieldTextColorSelector(field, value, dictionary, this);
      }
      else if (widget === 'html') {
        return new OptionFieldTextHtml(field, value, dictionary, this);
      }
      else if (widget) {
        error.warn(`Unknown widget type "${widget}" for field "${field.name}". Using default text field.`);
        return new OptionFieldText(field, value, dictionary, this);
      }
      else {
        return new OptionFieldText(field, value, dictionary, this);
      }
    }
    else if (fieldType === 'select') {
      return new OptionFieldSelect(field, value, dictionary, this);
    }
    else if (fieldType === 'boolean') {
      return new OptionFieldBoolean(field, value, dictionary, this);
    }
    else if (fieldType === 'number') {
      return new OptionFieldNumber(field, value, dictionary, this);
    }
    else if (fieldType === 'group') {
      return new OptionFieldGroup(field, value, dictionary, this);
    }
    else if (fieldType === 'unknown') {
      return new OptionFieldGroup(field, value, dictionary, this);
    }
    else {
      return new OptionFieldUnknown(field, value, dictionary, this);
    }
  }
}
