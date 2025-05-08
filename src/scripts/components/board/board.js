import Util from '@services/util.js';
import Card from './card/card.js';
import ElementInteractor, { INTERACTOR_MODE } from './element-interactor/element-interactor.js';
import './board.scss';

export default class Board {
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);
    this.callbacks = Util.extend({
      onClick: () => {},
      onDrop: () => {},
      onCardDeleted: () => {},
      openEditorDialog: () => {}
    }, callbacks);

    this.cards = [];
    this.elementInteractors = [];
    this.elementInteractorsBeingEditedIds = [];
    this.checkEditingEnded = this.checkEditingEnded.bind(this);

    this.buildDOM();
  }

  getDOM() {
    return this.dom;
  }

  buildDOM() {
    this.dom = document.createElement('section');
    this.dom.setAttribute('role', 'application');
    this.dom.setAttribute(
      'aria-label',
      `${this.params.dictionary.get('a11y.board')}. ${this.params.dictionary.get('a11y.boardInstructions')}`
    );
    this.dom.classList.add('h5p-idea-board-board');

    this.dom.addEventListener('dragover', (event) => {
      event.preventDefault();
    });

    this.dom.addEventListener('drop', (event) => {
      const versionedMachineName = event.dataTransfer.getData('text/plain');
      if (!versionedMachineName.match(/H5P\..+ \d+\.\d+/)) {
        return;
      }

      const x = 100 * (event.clientX - this.dom.getBoundingClientRect().left) / this.dom.getBoundingClientRect().width;
      const y = 100 * (event.clientY - this.dom.getBoundingClientRect().top) / this.dom.getBoundingClientRect().height;

      event.preventDefault();
      this.callbacks.onDrop(versionedMachineName, { x, y });
    });

    this.cardsList = document.createElement('ol');
    this.cardsList.classList.add('h5p-idea-board-cards-list');
    this.dom.append(this.cardsList);
  }

  getElementsParams() {
    return this.elementInteractors.map((interactor) => {
      const card = this.getCard(interactor.params.id);

      return {
        id: card.params.id,
        contentType: card.params.contentType,
        previousState: card.exercise.getCurrentState(),
        cardBackgroundColor: card.getBackgroundColor(),
        cardBorderColor: card.getBorderColor(),
        canUserRateCard: card.canUserRateCard(),
        cardRating: card.getRating(),
        telemetry: interactor?.params?.telemetry
      };
    });
  }

  addElement(params = {}) {
    const card = new Card(
      {
        id: params.id,
        contentType: params.contentType,
        globals: this.params.globals,
        dictionary: this.params.dictionary,
        backgroundColor: params.cardBackgroundColor,
        borderColor: params.cardBorderColor,
        canUserRateCard: params.cardCanUserRateCard,
        rating: params.cardRating,
        previousState: params.previousState
      },
      {
        getBoardRect: () => {
          return this.getRect();
        },
        openEditorDialog: (id, params, callbacks) => {
          this.callbacks.openEditorDialog(id, params, callbacks);
        }
      }
    );
    this.cards.push(card);

    const element = new ElementInteractor(
      {
        id: params.id,
        telemetry: params.telemetry,
        contentDOM: card.getDOM(),
        globals: this.params.globals,
        dictionary: this.params.dictionary,
      },
      {
        getBoardRect: () => {
          return this.getRect();
        },
        onEditingModeChanged: (elementIntaractorId, mode) => {
          this.handleEditingModeChanged(elementIntaractorId, mode);
        },
        onEdit: (id) => {
          this.editElement(id);
        },
        onBringToFront: (id, options) => {
          this.bringElementToFront(id, options);
        },
        onSendToBack: (id, options) => {
          this.sendElementToBack(id, options);
        },
        onDelete: (id) => {
          this.deleteElement(id);
        },
        resizeCard: (id) => {
          this.resizeCardInstance(id);
        },
        getSummaryText: (id) => {
          return this.getSummaryText(id);
        },
        getDenominator: (id) => {
          return this.getDenominator(id);
        }
      }
    );

    this.cardsList.append(element.getDOM());
    this.elementInteractors.push(element);

    element.focus();
    // TODO: Add on drag event!? Check how DnB does it
  }

  handleEditingModeChanged(elementIntaractorId, mode) {
    const card = this.getCard(elementIntaractorId);
    if (mode === INTERACTOR_MODE.interact) {
      card?.focusContent();

      this.elementInteractorsBeingEditedIds.push(elementIntaractorId);
      document.addEventListener('click', this.checkEditingEnded);
    }
    else {
      this.elementInteractorsBeingEditedIds = this.elementInteractorsBeingEditedIds
        .filter((id) => id !== elementIntaractorId);

      if (this.elementInteractorsBeingEditedIds.length === 0) {
        document.removeEventListener('click', this.checkEditingEnded);
      }
    }
  }

  editElement(id) {
    const interactor = this.getInteractor(id);
    if (!interactor) {
      return;
    }

    interactor.setMode(INTERACTOR_MODE.interact);

    const card = this.getCard(id);
    const instance = card.getExerciseInstance();
    if (!instance) {
      return;
    }

    instance.openEditorDialog?.({
      activeElement: interactor.getDOM()
    });
  }

  bringElementToFront(id, options = {}) {
    const interactor = this.elementInteractors.find((elementInteractor) => elementInteractor.params.id === id);
    if (!interactor) {
      return;
    }

    this.elementInteractors = this.elementInteractors.filter((elementInteractor) => elementInteractor.params.id !== id);
    this.elementInteractors = [...this.elementInteractors, interactor];

    this.cardsList.append(interactor.getDOM());

    // Reattaching the interactor causes it and its children like context menu buttons to lose focus
    if (options.nextFocus) {
      options.nextFocus.focus();
    }
    else {
      interactor.focus();
    }

    this.params.globals.get('Screenreader').read(this.params.dictionary.get('a11y.cardBroughtToFront'));
  }

  sendElementToBack(id, options = {}) {
    const interactor = this.getInteractor(id);
    if (!interactor) {
      return;
    }

    this.elementInteractors = this.elementInteractors.filter((elementInteractor) => elementInteractor.params.id !== id);
    this.elementInteractors = [interactor, ...this.elementInteractors];


    this.cardsList.insertBefore(interactor.getDOM(), this.cardsList.firstChild);

    // Reattaching the interactor causes it and its children like context menu buttons to lose focus
    if (options.nextFocus) {
      options.nextFocus.focus();
    }
    else {
      interactor.focus();
    }

    this.params.globals.get('Screenreader').read(this.params.dictionary.get('a11y.cardSentToBack'));
  }

  deleteElement(id) {

    const activeElement = document.activeElement;

    const confirmationDialog = this.params.globals.get('ConfirmationDialog');
    confirmationDialog.update(
      {
        headerText: this.params.dictionary.get('l10n.confirmDeletionHeader'),
        dialogText: `${this.params.dictionary.get('l10n.confirmDeletionDialog')}`,
        confirmText: this.params.dictionary.get('l10n.confirmDeletionConfirm'),
        cancelText: this.params.dictionary.get('l10n.confirmDeletionCancel'),
      },
      {
        onConfirmed: () => {
          const element = this.getInteractor(id);
          if (!element) {
            return;
          }

          const elementDOM = element.getDOM();
          const focusDOM = elementDOM.nextElementSibling ?? elementDOM.previousElementSibling;
          this.cardsList.removeChild(elementDOM);
          this.cards = this.cards.filter((card) => card.params.id !== id);
          this.elementInteractors = this.elementInteractors
            .filter((elementInteractor) => elementInteractor.params.id !== id);

          this.params.globals.get('Screenreader').read(this.params.dictionary.get('a11y.cardDeleted'));

          this.callbacks.onCardDeleted({
            id: element.params.id,
            focusDOM: focusDOM,
          });
        },
        onCanceled: () => {
          const element = this.getInteractor(id);
          if (!element) {
            return;
          }

          element.focus(); // Required to allow focusing the delete button that's hidden on focusout
          activeElement.focus();
          // Truck H5P.Tooltip to not display on delete button after focus
          activeElement.dispatchEvent(new Event('mouseleave', { bubbles: true, cancelable: true }));
        }
      }
    );

    confirmationDialog.show();
  }

  checkEditingEnded(event) {
    this.elementInteractors.forEach((elementInteractor) => {
      if (event.target.closest('.h5p-idea-board-element-interactor') !== elementInteractor.getDOM()) {
        elementInteractor.setMode(INTERACTOR_MODE.view);
      }
    });
  }

  getRect() {
    return this.dom.getBoundingClientRect();
  }

  getCards() {
    return this.cards;
  }

  getElementInteractors() {
    return this.elementInteractors;
  }

  /**
   * Set fullscreen.
   * @param {boolean} state If true, fullscreen on.
   * @param {object} [availableSpace] Available width and height.
   */
  setFullscreen(state, availableSpace = {}) {
    if (!availableSpace.height || !availableSpace.width) {
      return;
    }

    if (!state) {
      this.forceSize(null);
      return;
    }

    const boardSize = this.getRect();

    let width, height;
    if (boardSize.width / boardSize.height > availableSpace.width / availableSpace.height) {
      width = availableSpace.width;
      height = availableSpace.width * boardSize.height / boardSize.width;
    }
    else {
      width = availableSpace.height * boardSize.width / boardSize.height;
      height = availableSpace.height;
    }

    this.forceSize({ width: width, height: height });
  }

  /**
   * Force size.
   * @param {object} [sizes] Size to force into.
   * @param {number} [sizes.width] Map width in px.
   * @param {number} [sizes.height] Map height in px.
   */
  forceSize(sizes = {}) {
    this.dom.classList.remove('forced-size');

    if (!sizes) {
      return;
    }
    else if (sizes.width && sizes.height) {
      window.requestAnimationFrame(() => {
        this.dom.style.setProperty('--forced-height', `${sizes.height}px`);
        this.dom.style.setProperty('--forced-width', `${sizes.width}px`);
        this.dom.classList.add('forced-size');

        window.requestAnimationFrame(() => {
          this.params.globals.get('mainInstance').trigger('resize');
        });
      });
    }

    window.requestAnimationFrame(() => {
      this.params.globals.get('mainInstance').trigger('resize');
    });
  }

  resizeCardInstance(id) {
    const card = this.getCard(id);
    if (!card) {
      return;
    }

    card.resizeInstance();
  }

  getSummaryText(id) {
    const card = this.getCard(id);
    if (!card) {
      return '';
    }

    return card.getSummaryText();
  }

  /**
   * Get card by id.
   * @param {string} id Id of the card.
   * @returns {Card|undefined} Card or undefined if not available.
   */
  getCard(id) {
    if (!id) {
      return;
    }

    return this.cards.find((card) => card.params.id === id);
  }

  /**
   * Get interactor by id.
   * @param {string} id Id of the interactor.
   * @returns {ElementInteractor|undefined} Interactor or undefined if not available.
   */
  getInteractor(id) {
    if (!id) {
      return;
    }

    return this.elementInteractors.find((interactor) => interactor.params.id === id);
  }

  getDenominator(id) {
    const index = this.elementInteractors.findIndex((elementInteractor) => elementInteractor.params.id === id);
    const position = (index === -1) ? null : index + 1;

    const total = this.elementInteractors.length;

    let denominator;
    if (position && total) {
      denominator = this.params.dictionary.get('a11y.cardXOfY').replace('@current', position).replace('@total', total);
    }
    else if (position) {
      denominator = this.params.dictionary.get('a11y.cardAt').replace('@current', position);
    }
    else {
      denominator = this.params.dictionary.get('a11y.card');
    }

    return denominator;
  }
}
