import H5PUtil from '@services/utils-h5p.js';
import Util from '@services/util.js';
import { roundColorString, getAccessibleContrastColor } from '@services/utils-color.js';
import Exercise from './exercise/exercise.js';
import RatingBox from './rating-box/rating-box.js';
import './card.scss';

/** @constant {number} RATING_MIN Minimum rating for card. */
const RATING_MIN = 0;

/** @constant {number} RATING_MAX Maximum rating for card. */
const RATING_MAX = 5;

export default class Card {
  /**
   * Card component for IdeaBoard.
   * @class
   * @param {object} params Parameters.
   * @param {string} params.id Card ID.
   * @param {object} params.contentType Content type data.
   * @param {object} params.globals Global variables.
   * @param {object} params.dictionary Dictionary for translations.
   * @param {string} params.backgroundColor Background color.
   * @param {string} params.borderColor Border color.
   * @param {number} params.rating Card rating.
   * @param {object} params.capabilities Card capabilities.
   * @param {object} params.previousState Previous state.
   * @param {object} callbacks Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      getBoardRect: () => {},
      openEditorDialog: () => {},
      onUpdated: () => {}
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-idea-board-card');

    this.exerciseDOM = document.createElement('div');
    this.exerciseDOM.classList.add('h5p-idea-board-card-exercise');
    this.dom.append(this.exerciseDOM);

    if (!this.params.capabilities.canUserEditCard && !H5PUtil.isEditor()) {
      this.params.contentType.params.behaviour = Util.extend({ userCanEdit: false }, this.params.contentType.behaviour);
    };

    this.exercise = new Exercise(
      {
        contentType: this.params.contentType,
        globals: this.params.globals,
        previousState: this.params.previousState,
      },
      {
        getBoardRect: () => {
          return this.callbacks.getBoardRect();
        },
        passEditorDialog: (params, callbacks) => {
          this.callbacks.openEditorDialog(this.params.id, params, callbacks);
        }
      }
    );
    this.exerciseDOM.append(this.exercise.getDOM());

    if (this.params.capabilities.canUserRateCard) {
      this.dom.style.setProperty('--has-rating', 1);
      this.dom.style.setProperty('--star-count', RATING_MAX);

      const ratingDOM = document.createElement('div');
      ratingDOM.classList.add('h5p-idea-board-card-rating');
      this.ratingBox = new RatingBox(
        {
          max: RATING_MAX,
          dictionary: this.params.dictionary,
        },
        {
          onRatingChanged: (rating) => {
            this.setRating(rating);
            this.callbacks.onUpdated();
          }
        }
      );
      ratingDOM.append(this.ratingBox.getDOM());

      this.dom.append(ratingDOM);
    }

    this.exercise.attachInstance();

    this.setBackgroundColor(this.params.backgroundColor);
    this.setBorderColor(this.params.borderColor);

    this.setRating(this.params.rating, { silent: true });
  }

  /**
   * Get DOM element.
   * @returns {HTMLElement} The card DOM element.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get card ID.
   * @returns {string} Card ID.
   */
  getId() {
    return this.params.id;
  }

  /**
   * Focus the card content.
   * @returns {boolean} True if focus was set.
   */
  focusContent() {
    return this.exercise.focus();
  }

  /**
   * Get editor value.
   * @returns {object} Card editor value.
   */
  getEditorValue() {
    return {
      id: this.params.id,
      contentType: this.params.contentType,
      cardSettings: {
        cardBackgroundColor: this.getBackgroundColor(),
        cardBorderColor: this.getBorderColor(),
        cardRating: this.getRating(),
      },
      cardCapabilities: this.params.capabilities,
    };
  }

  /**
   * Get background color.
   * @returns {string} Background color.
   */
  getBackgroundColor() {
    return this.params.backgroundColor;
  }

  /**
   * Set background color.
   * @param {string} color Background color.
   */
  setBackgroundColor(color) {
    this.params.backgroundColor = color;
    this.dom.style.setProperty('--h5p-idea-board-card-background-color', color);

    const contrastColor = getAccessibleContrastColor(roundColorString(color));
    this.dom.style.setProperty('--h5p-idea-board-card-contrast-color', contrastColor);
    this.dom.style.setProperty('--h5p-editable-text-placeholder-color', contrastColor);
  }

  /**
   * Get border color.
   * @returns {string} Border color.
   */
  getBorderColor() {
    return this.params.borderColor;
  }

  /**
   * Set border color.
   * @param {string} color Border color.
   */
  setBorderColor(color) {
    this.params.borderColor = color;
    this.dom.style.setProperty('--h5p-idea-board-card-border-color', color);
  }

  /**
   * Set card capabilities.
   * @param {object[]} capabilities Card capabilities.
   */
  setCapabilities(capabilities = []) {
    capabilities.forEach((capability) => {
      this.params.capabilities[capability.name] = capability.value;
    });
  }

  /**
   * Set content type values.
   * @param {object} contentTypeValues Content type values.
   */
  setContentTypeValues(contentTypeValues = {}) {
    const paramsObject = Util.paramsArrayToPlainObject(contentTypeValues);
    this.params.contentType.params = Util.extend(this.params.contentType.params, paramsObject);
  };

  /**
   * Get content type parameters.
   * @returns {object} Content type parameters.
   */
  getContentTypeParams() {
    return this.params.contentType;
  }

  /**
   * Get card capabilities.
   * @returns {object} Card capabilities.
   */
  getCapabilities() {
    return {
      canUserRateCard: this.params.capabilities.canUserRateCard,
      canUserEditCard: this.params.capabilities.canUserEditCard,
      canUserDeleteCard: this.params.capabilities.canUserDeleteCard,
      canUserMoveCard: this.params.capabilities.canUserMoveCard,
      canUserResizeCard: this.params.capabilities.canUserResizeCard,
    };
  }

  /**
   * Set card rating.
   * @param {number} rating Rating value.
   * @param {object} options Options.
   */
  setRating(rating, options = {}) {
    if (!this.params.capabilities.canUserRateCard) {
      return;
    }

    if (typeof rating !== 'number' || rating < RATING_MIN || rating > RATING_MAX) {
      return;
    }

    this.ratingBox.setRating(rating, options);
  }

  /**
   * Get card rating.
   * @returns {number|undefined} Rating or undefined if rating not enabled.
   */
  getRating() {
    if (!this.params.capabilities.canUserRateCard) {
      return;
    }

    return this.ratingBox.getRating();
  }

  /**
   * Get exercise instance.
   * @returns {object} Exercise instance.
   */
  getExerciseInstance() {
    return this.exercise.getInstance();
  }

  /**
   * Resize exercise instance.
   */
  resizeInstance() {
    this.exercise.resize();
  }

  /**
   * Get summary text for card.
   * @returns {string} Summary text.
   */
  getSummaryText() {
    return this.exercise.getSummaryText() ?? this.params.dictionary.get('noSummaryAvailable');
  }
}
