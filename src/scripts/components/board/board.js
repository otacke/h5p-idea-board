import Util from '@services/util.js';
import Card from './card/card.js';
import ElementInteractor, { INTERACTOR_MODE } from './element-interactor/element-interactor.js';
import H5PUtil from '@services/utils-h5p.js';
import './board.scss';

export default class Board {
  /**
   * Board component for IdeaBoard.
   * @class
   * @param {object} params Parameters.
   * @param {object} callbacks Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);
    this.callbacks = Util.extend({
      onClick: () => {},
      onDrop: () => {},
      onContentPasted: () => {},
      onCardCopied: () => {},
      onCardDeleted: () => {},
      openEditorDialog: () => {},
      onUpdated: () => {},
      onEdited: () => {}
    }, callbacks);

    this.cards = [];
    this.elementInteractors = [];
    this.elementInteractorsBeingEditedIds = [];
    this.checkEditingEnded = this.checkEditingEnded.bind(this);

    this.buildDOM();
  }

  /**
   * Get DOM element.
   * @returns {HTMLElement} The board DOM element.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Build the DOM structure.
   */
  buildDOM() {
    const params = this.params.globals.get('params');

    this.dom = document.createElement('section');
    this.dom.setAttribute('role', 'application');
    this.dom.setAttribute(
      'aria-label',
      `${this.params.dictionary.get('a11y.board')}. ${this.params.dictionary.get('a11y.boardInstructions')}`
    );
    this.dom.classList.add('h5p-idea-board-board');
    this.dom.setAttribute('tabindex', '0');

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

    this.setBackgroundImage(params?.backgroundSettings?.backgroundImage);
    this.setBackgroundColor(params?.backgroundSettings?.backgroundColor);

    this.cardsList = document.createElement('ol');
    this.cardsList.classList.add('h5p-idea-board-cards-list');
    this.dom.append(this.cardsList);
  }

  /**
   * Get current parameters for all elements.
   * @returns {object[]} Element parameters.
   */
  getElementsParams() {
    return this.elementInteractors.map((interactor) => {
      const card = this.getCard(interactor.params.id);

      return {
        id: card.params.id,
        contentType: card.params.contentType,
        previousState: card.exercise.getCurrentState(),
        cardSettings: {
          cardBackgroundColor: card.getBackgroundColor(),
          cardBorderColor: card.getBorderColor(),
          cardRating: card.getRating(),
        },
        cardCapabilities: card.getCapabilities(),
        telemetry: interactor.getTelemetry()
      };
    });
  }

  /**
   * Add an element to the board.
   * @param {object} params Element parameters.
   */
  addElement(params = {}) {
    const elementParams = Util.extend({
      cardBackgroundColor: H5PUtil.semanticsFieldSelector({ name: 'cardBackgroundColor' })?.default,
      cardBorderColor: H5PUtil.semanticsFieldSelector({ name: 'cardBorderColor' })?.default,
      cardRating: H5PUtil.semanticsFieldSelector({ name: 'cardRating' })?.default,
      cardCapabilities: {
        canUserEditCard: true,
        canUserDeleteCard: true,
        canUserMoveCard: true,
        canUserResizeCard: true,
        canUserRateCard: true
      }
    }, params);

    if (H5PUtil.isEditor()) {
      this.params.globals.get('editor').addCardGroup();
    }

    const card = new Card(
      {
        id: elementParams.id,
        contentType: elementParams.contentType,
        globals: this.params.globals,
        dictionary: this.params.dictionary,
        backgroundColor: elementParams.cardBackgroundColor,
        borderColor: elementParams.cardBorderColor,
        rating: elementParams.cardRating,
        capabilities: elementParams.cardCapabilities,
        previousState: elementParams.previousState
      },
      {
        getBoardRect: () => {
          return this.getRect();
        },
        openEditorDialog: (id, params, callbacks) => {
          this.callbacks.openEditorDialog(id, params, callbacks);
        },
        onUpdated: () => {
          this.callbacks.onUpdated({
            index: this.cards.findIndex((c) => c.getId() === card.getId()),
            contentTypeParams: card.getContentTypeParams()
          });
        },
        onEdited: (data) => {
          this.callbacks.onEdited(data);
        },
      }
    );
    this.cards.push(card);

    const element = new ElementInteractor(
      {
        id: elementParams.id,
        telemetry: elementParams.telemetry,
        contentDOM: card.getDOM(),
        globals: this.params.globals,
        dictionary: this.params.dictionary,
        capabilities: {
          edit: elementParams.cardCapabilities.canUserEditCard,
          delete: elementParams.cardCapabilities.canUserDeleteCard,
          move: elementParams.cardCapabilities.canUserMoveCard,
          resize: elementParams.cardCapabilities.canUserResizeCard
        }
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
        onCopy: (id) => {
          this.copyElement(id);
        },
        onDelete: (id) => {
          this.deleteElement(id);
        },
        onMove: () => {
          this.callbacks.onUpdated();
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

    window.requestAnimationFrame(() => {
      this.params.globals.get('mainInstance').trigger('resize');
    });

    element.focus();
    // TODO: Add on drag event!? Check how DnB does it
  }

  /**
   * Handle editing mode change for an element.
   * @param {string} elementIntaractorId Id of the element interactor.
   * @param {string} mode New mode.
   */
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

  /**
   * Edit an element.
   * @param {string} id Element id.
   */
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

  /**
   * Bring element to front.
   * @param {string} id Element id.
   * @param {object} options Options.
   */
  bringElementToFront(id, options = {}) {
    const interactor = this.elementInteractors.find((elementInteractor) => elementInteractor.params.id === id);
    if (!interactor) {
      return;
    }

    const indexFrom = this.cards.findIndex((c) => c.getId() === id);
    const indexTo = this.cards.length - 1;
    if (H5PUtil.isEditor()) {
      this.params.globals.get('editor').moveCardGroup(indexFrom, indexTo);
    }
    const [cardToMove] = this.cards.splice(indexFrom, 1);
    this.cards.splice(indexTo, 0, cardToMove);

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

    this.callbacks.onUpdated();
  }

  /**
   * Send element to back.
   * @param {string} id Element id.
   * @param {object} options Options.
   */
  sendElementToBack(id, options = {}) {
    const interactor = this.getInteractor(id);
    if (!interactor) {
      return;
    }

    const indexFrom = this.cards.findIndex((c) => c.getId() === id);
    const indexTo = 0;
    if (H5PUtil.isEditor()) {
      this.params.globals.get('editor').moveCardGroup(indexFrom, indexTo);
    }
    const [cardToMove] = this.cards.splice(indexFrom, 1);
    this.cards.splice(indexTo, 0, cardToMove);

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

    this.callbacks.onUpdated();
  }

  /**
   * Copy an element.
   * @param {string} id Element id.
   */
  copyElement(id) {
    const interactor = this.getInteractor(id);
    if (!interactor) {
      return;
    }

    const card = this.getCard(id);
    if (!card) {
      return;
    }

    const copyParams = {
      contentType: card.getContentTypeParams(),
      cardBackgroundColor: card.getBackgroundColor(),
      cardBorderColor: card.getBorderColor(),
      cardRating: card.getRating(),
      cardCapabilities: card.getCapabilities(),
      telemetry: interactor.getTelemetry()
    };

    this.callbacks.onCardCopied(copyParams);
  }

  /**
   * Delete an element.
   * @param {string} id Element id.
   */
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
          this.deleteElementWithoutConfirmaton(id);
        },
        onCanceled: () => {
          const element = this.getInteractor(id);
          if (!element) {
            return;
          }

          element.focus(); // Required to allow focusing the delete button that's hidden on focusout
          activeElement.focus();
          // Track H5P.Tooltip to not display on delete button after focus
          activeElement.dispatchEvent(new Event('mouseleave', { bubbles: true, cancelable: true }));
        }
      }
    );

    confirmationDialog.show();
  }

  deleteElementWithoutConfirmaton(id) {
    const element = this.getInteractor(id);
    if (!element) {
      return;
    }

    if (H5PUtil.isEditor()) {
      const index = this.cards.findIndex((c) => c.getId() === id);
      this.params.globals.get('editor').removeCardGroup(index);
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

    this.callbacks.onUpdated();
  }

  /**
   * Check if editing has ended.
   * @param {Event} event Click event.
   */
  checkEditingEnded(event) {
    this.elementInteractors.forEach((elementInteractor) => {
      if (event.target.closest('.h5p-idea-board-element-interactor') !== elementInteractor.getDOM()) {
        elementInteractor.setMode(INTERACTOR_MODE.view);
      }
    });
  }

  /**
   * Get board rectangle.
   * @returns {DOMRect} Board rectangle.
   */
  getRect() {
    return this.dom.getBoundingClientRect();
  }

  /**
   * Get all cards.
   * @returns {object[]} Cards.
   */
  getCards() {
    return this.cards;
  }

  /**
   * Get all element interactors.
   * @returns {object[]} Element interactors.
   */
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

  /**
   * Resize a card instance.
   * @param {string} id Card id.
   */
  resizeCardInstance(id) {
    const card = this.getCard(id);
    if (!card) {
      return;
    }

    card.resizeInstance();

    this.callbacks.onUpdated();
  }

  /**
   * Get summary text for a card.
   * @param {string} id Card id.
   * @returns {string} Summary text.
   */
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

  /**
   * Get denominator text for a card (e.g. "Card 1 of 5").
   * @param {string} id Card id.
   * @returns {string} Denominator text.
   */
  getDenominator(id) {
    const index = this.elementInteractors.findIndex((elementInteractor) => elementInteractor.getId() === id);
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

  /**
   * Set background image.
   * @param {object} imageParams Image parameters.
   */
  setBackgroundImage(imageParams) {
    if (!imageParams) {
      this.dom.style.removeProperty('--board-background-image-url');
      return;
    }

    const contentId = H5PUtil.isEditor() ? H5PEditor.contentId : this.params.globals.get('contentId');
    const backgroundImageURL = H5P.getPath(imageParams.path ?? '', contentId);

    if (backgroundImageURL) {
      this.dom.style.setProperty('--board-background-image-url', `url(${backgroundImageURL})`);
    }

    this.backgroundImageParams = imageParams;
  }

  /**
   * Set background color.
   * @param {string} color Background color.
   */
  setBackgroundColor(color) {
    if (typeof color !== 'string') {
      this.dom.style.removeProperty('--board-background-color');
      return;
    }

    this.dom.style.setProperty('--board-background-color', color);

    this.backgroundColor = color;
  }

  /**
   * Get editor value.
   * @returns {object} Editor value.
   */
  getEditorValue() {
    let cardValues = this.cards.map((card) => {
      const editorValue = card.getEditorValue();
      const cardId = card.getId();
      const interactor = this.elementInteractors.find((interactor) => interactor.getId() === cardId);
      editorValue.telemetry = interactor.getTelemetry();
      Object.keys(editorValue.telemetry).forEach((key) => {
        editorValue.telemetry[key] = String(editorValue.telemetry[key]);
      });

      return editorValue;
    });

    return {
      cards: cardValues,
      backgroundSettings: {
        backgroundImage: this.backgroundImageParams,
        backgroundColor: this.backgroundColor
      }
    };
  }

  removeAllElements() {
    this.cards
      .map((card) => card.getId())
      .forEach((id) => {
        this.deleteElementWithoutConfirmaton(id);
      });
  }

  /**
   * Check if any card has an answer given.
   * @returns {boolean} True if any card has an answer given, false otherwise.
   */
  getAnswerGiven() {
    return this.cards.some((card) => card.getAnswerGiven());
  }

  /**
   * Reset the board.
   */
  reset() {
    this.cards.forEach((card) => card.reset());
    this.elementInteractors.forEach((interactor) => interactor.reset());
  }
}
