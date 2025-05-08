import Util from '@services/util.js';
import './rating-box.scss';

export default class RatingBox {
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      onRatingChanged: () => {}
    }, callbacks);

    this.rating = 0;

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

  getDOM() {
    return this.dom;
  }

  setRating(rating) {
    this.rating = rating;

    this.stars.forEach((star, i) => {
      star.classList.toggle('filled', i < this.rating);
    });
  }

  getRating() {
    return this.rating;
  }

  changeRatingBy(indexClicked) {
    this.setRating(this.rating === indexClicked + 1 ? indexClicked : indexClicked + 1);
  }
}
