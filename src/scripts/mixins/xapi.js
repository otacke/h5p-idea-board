import Util from '@services/util.js';

/** @constant {string} DEFAULT_DESCRIPTION Default description */
const DEFAULT_DESCRIPTION = 'Idea Board';

/**
 * Mixin containing methods for xapi stuff.
 */
export default class XAPI {
  /**
   * Create an xAPI event.
   * @param {string} verb Short id of the verb we want to trigger.
   * @returns {H5P.XAPIEvent} Event template.
   */
  createXAPIEvent(verb) {
    const xAPIEvent = this.createXAPIEventTemplate(verb);

    Util.extend(
      xAPIEvent.getVerifiedStatementValue(['object', 'definition']),
      this.getXAPIDefinition());

    if (verb === 'completed' || verb === 'answered') {
      /*
       * Not using getScore() or getMaxScore() here, because the question type contract implementation does not
       * include those - would be fine it itself, but some compound content types use those to determine whether
       * a content type is a task/exercise or not.
       */
      xAPIEvent.setScoredResult(
        0, // Score achieved
        0, // Score maximum
        this,
        true, // Completed
        true, // Success
      );
    }

    return xAPIEvent;
  }

  /**
   * Get the xAPI definition for the xAPI object.
   * @returns {object} XAPI definition.
   */
  getXAPIDefinition() {
    const definition = {};

    definition.name = {};
    definition.name[this.languageTag] = this.getTitle();
    // Fallback for h5p-php-reporting, expects en-US
    definition.name['en-US'] = definition.name[this.languageTag];

    definition.description = {};
    definition.description[this.languageTag] = this.getDescription();
    // Fallback for h5p-php-reporting, expects en-US
    definition.description['en-US'] = definition.description[this.languageTag];

    definition.type = 'http://adlnet.gov/expapi/activities/cmi.interaction';
    definition.interactionType = 'other';

    return definition;
  }

  /**
   * Get task title.
   * @returns {string} Title.
   */
  getTitle() {
    // H5P Core function: createTitle
    return H5P.createTitle(
      this.params?.headline || this.extras?.metadata?.title || DEFAULT_DESCRIPTION,
    );
  }

  /**
   * Get description.
   * @returns {string} Description.
   */
  getDescription() {
    return DEFAULT_DESCRIPTION;
  }
}
