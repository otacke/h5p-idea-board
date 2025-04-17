import Util from '@services/util.js';
import Exercise from './exercise/exercise.js';
import './card.scss';

export default class Card {

  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      getBoardRect: () => {}
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
        }
      }
    );
    this.exerciseDOM.append(this.exercise.getDOM());
    this.exercise.attachInstance();
  }

  getDOM() {
    return this.dom;
  }

  focusContent() {
    return this.exercise.focus();
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
