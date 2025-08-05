import Util from '@services/util.js';
import Screenreader from '@services/screenreader.js';
import './rating-box.scss';

export default class RatingBox {
  /**
   * Rating box component for cards.
   * @class
   * @param {object} params Parameters.
   * @param {number} params.max Maximum rating value.
   * @param {object} params.dictionary Dictionary for translations.
   * @param {object} callbacks Callbacks.
   * @param {function} callbacks.onRatingChanged Called when rating changes.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      onRatingChanged: () => {}
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-idea-board-card-rating-box');

    this.stars = [];

    for (let i = 0; i < this.params.max; i++) {
      const star = document.createElement('button');
      star.classList.add('h5p-idea-board-card-rating-box-star');
      star.addEventListener('click', () => {
        this.changeRatingBy(i);
        this.callbacks.onRatingChanged(this.rating);
      });
      this.dom.append(star);

      this.stars.push(star);
    }
  }

  /**
   * Get DOM element.
   * @returns {HTMLElement} The rating box DOM element.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Set rating value.
   * @param {number} rating Rating value.
   * @param {object} options Options.
   * @param {boolean} [options.silent] If true, don't announce rating change.
   */
  setRating(rating, options = {}) {
    this.rating = rating;

    this.stars.forEach((star, i) => {
      star.classList.toggle('filled', i < this.rating);
    });

    this.updateAriaLabels();

    if (!options.silent) {
      Screenreader.read(this.params.dictionary.get('a11y.ratingChanged').replace('@rating', this.rating));
    }
  }

  /**
   * Get current rating value.
   * @returns {number|undefined} Current rating.
   */
  getRating() {
    return this.rating;
  }

  /**
   * Change rating based on star index clicked.
   * @param {number} indexClicked Index of star that was clicked.
   */
  changeRatingBy(indexClicked) {
    this.setRating(this.rating === indexClicked + 1 ? indexClicked : indexClicked + 1);
  }

  /**
   * Update ARIA labels for all stars.
   */
  updateAriaLabels() {
    this.stars.forEach((star, index) => {
      const targetRating = (index === this.rating - 1) ? index : index + 1;
      star.setAttribute('aria-label', this.params.dictionary.get('a11y.giveRatingOf').replace('@rating', targetRating));
    });
  }

  /**
   * Toggle visibility of the rating box.
   * @param {boolean} visible Whether to show or hide the rating box.
   */
  toggleVisible(visible) {
    this.dom.classList.toggle('display-none', !visible);
  }
}
