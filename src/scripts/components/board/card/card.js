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

  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      getBoardRect: () => {},
      openEditorDialog: () => {}
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-idea-board-card');

    this.exerciseDOM = document.createElement('div');
    this.exerciseDOM.classList.add('h5p-idea-board-card-exercise');
    this.dom.append(this.exerciseDOM);

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
          }
        }
      );
      ratingDOM.append(this.ratingBox.getDOM());

      this.dom.append(ratingDOM);
    }

    this.exercise.attachInstance();

    this.setBackgroundColor(this.params.backgroundColor);
    this.setBorderColor(this.params.borderColor);
    this.setRating(this.params.capabilities.cardRating, { silent: true });
  }

  getDOM() {
    return this.dom;
  }

  getId() {
    return this.params.id;
  }

  focusContent() {
    return this.exercise.focus();
  }

  getBackgroundColor() {
    return this.params.backgroundColor;
  }

  setBackgroundColor(color) {
    this.params.backgroundColor = color;
    this.dom.style.setProperty('--h5p-idea-board-card-background-color', color);

    const contrastColor = getAccessibleContrastColor(roundColorString(color));
    this.dom.style.setProperty('--h5p-idea-board-card-contrast-color', contrastColor);
  }

  getBorderColor() {
    return this.params.borderColor;
  }

  setBorderColor(color) {
    this.params.borderColor = color;
    this.dom.style.setProperty('--h5p-idea-board-card-border-color', color);
  }

  getCapabilities() {
    return {
      canUserRateCard: this.params.capabilities.canUserRateCard,
      canUserEditCard: this.params.capabilities.canUserEditCard,
      canUserDeleteCard: this.params.capabilities.canUserDeleteCard,
      canUserMoveCard: this.params.capabilities.canUserMoveCard,
      canUserResizeCard: this.params.capabilities.canUserResizeCard,
      cardRating: this.getRating(),
    };
  }

  setRating(rating, options = {}) {
    if (!this.params.capabilities.canUserRateCard) {
      return;
    }

    if (typeof rating !== 'number' || rating < RATING_MIN || rating > RATING_MAX) {
      return;
    }

    this.ratingBox.setRating(rating, options);
  }

  getRating() {
    if (!this.params.capabilities.canUserRateCard) {
      return;
    }

    return this.ratingBox.getRating();
  }

  getExerciseInstance() {
    return this.exercise.getInstance();
  }

  resizeInstance() {
    this.exercise.resize();
  }

  getSummaryText() {
    return this.exercise.getSummaryText() ?? this.params.dictionary.get('noSummaryAvailable');
  }
}
