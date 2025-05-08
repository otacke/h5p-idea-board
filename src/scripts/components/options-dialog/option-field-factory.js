import OptionFieldBoolean from './option-fields/option-field-boolean.js';
import OptionFieldText from './option-fields/option-field-text.js';
import OptionFieldTextColorSelector from './option-fields/option-field-text-color-selector.js';
import OptionFieldTextHtml from './option-fields/option-field-text-html.js';
import OptionFieldSelect from './option-fields/option-field-select.js';
import OptionFieldUnknown from './option-fields/option-field-unknown.js';

export default class OptionsFieldFactory {
  static produce(field = {}, value, dictionary) {
    let type = field.type;
    if (field.widget) {
      type = `${type}/${field.widget}`;
    }

    return this.createField(type, field, value, dictionary);
  }

  static createField(type, field, value, dictionary) {
    switch (type) {
      case 'text':
        return new OptionFieldText(field, value, dictionary);
      case 'text/colorSelector':
        return new OptionFieldTextColorSelector(field, value, dictionary);
      case 'text/html':
        return new OptionFieldTextHtml(field, value, dictionary);
      case 'select':
        return new OptionFieldSelect(field, value, dictionary);
      case 'boolean':
        return new OptionFieldBoolean(field, value, dictionary);
      default:
        return new OptionFieldUnknown(field, value, dictionary);
    }
  }
}
