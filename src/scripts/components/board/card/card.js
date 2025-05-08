import Util from '@services/util.js';
import Exercise from './exercise/exercise.js';
import './card.scss';

export default class Card {

  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      getBoardRect: () => {},
      openEditorDialog: () => {}
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-idea-board-card');

    this.setBackgroundColor(this.params.backgroundColor);
    this.setBorderColor(this.params.borderColor);

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
    this.exercise.attachInstance();
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
  }

  getBorderColor() {
    return this.params.borderColor;
  }

  setBorderColor(color) {
    this.params.borderColor = color;
    this.dom.style.setProperty('--h5p-idea-board-card-border-color', color);
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
