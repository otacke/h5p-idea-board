import Util from '@services/util.js';
import ElementInteractorContextMenu from './element-interactor-context-menu.js';
import ElementInteractorResizeKnob from './element-interactor-resize-knob.js';
import './element-interactor.scss';
import H5PUtil from '../../../services/utils-h5p.js';

/** @constant {number} MOVE_DELTA_INCREMENT Increment added when moving constantly. */
const MOVE_DELTA_INCREMENT = 0.4;

/** @constant {number} RESIZE_DELTA_INCREMENT Increment added when resizing constantly. */
const RESIZE_DELTA_INCREMENT = 0.2;

/** @constant {number} TELEMETRY_DEFAULT_WIDTH Default width of the telemetry element */
const TELEMETRY_DEFAULT_WIDTH = 33.3;

/** @constant {number} TELEMETRY_DEFAULT_HEIGHT Default height of the telemetry element */
const TELEMETRY_DEFAULT_HEIGHT = 33.3;

/** @constant {number} TELEMETRY_MIN_SIZE_PX Minimum size of interactor element in pixels */
const TELEMETRY_MIN_SIZE_PX = 48;

/** @constant {number} FOCUS_RETAIN_TIMEOUT_MS Timeout in milliseconds to retain focus */
const FOCUS_RETAIN_TIMEOUT_MS = 100;

/** @constant {object} INTERACTOR_MODE Modes for the interactor */
export const INTERACTOR_MODE = { view: 0, interact: 1 };

export default class ElementInteractor {
  /**
   * Element interactor for handling card interactions.
   * @class
   * @param {object} params Parameters.
   * @param {string} [params.id] Element ID.
   * @param {object} [params.telemetry] Telemetry data (position and size).
   * @param {HTMLElement} [params.contentDOM] Content DOM element.
   * @param {object} [params.capabilities] Element capabilities.
   * @param {object} callbacks Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      telemetry: {
        x: Math.floor(Math.random() * 100),
        y: Math.floor(Math.random() * 100),
        width: TELEMETRY_DEFAULT_WIDTH,
        height: TELEMETRY_DEFAULT_HEIGHT
      },
      capabilities: {
        edit: true,
        move: true,
        resize: true,
        delete: true
      }
    }, params);

    for (const key in this.params.telemetry) {
      this.params.telemetry[key] = Math.max(0, Math.min(parseInt(this.params.telemetry[key]), 100));
    }

    if (this.params.telemetry.x > 100 - this.params.telemetry.width) {
      this.params.telemetry.x = 100 - this.params.telemetry.width;
    }
    if (this.params.telemetry.y > 100 - this.params.telemetry.height) {
      this.params.telemetry.y = 100 - this.params.telemetry.height;
    }

    this.callbacks = Util.extend({
      getBoardRect: () => {},
      onEditingModeChanged: () => {},
      onEdit: () => {},
      onBringToFront: () => {},
      onSendToBack: () => {},
      onCopy: () => {},
      onDelete: () => {},
      onMove: () => {},
      resizeCard: () => {},
      getDenominator: () => {},
      getSummaryText: () => {}
    }, callbacks);

    this.mode = INTERACTOR_MODE.view;
    this.telemetry = { ...this.params.telemetry };

    this.moveDelta = 1;
    this.isMoving = false;

    this.resizeDelta = 1;

    this.handleTouchEvent = this.handleTouchEvent.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);

    this.buildDOM();
  }

  /**
   * Get element ID.
   * @returns {string} Element ID.
   */
  getId() {
    return this.params.id;
  }

  /**
   * Get telemetry data.
   * @returns {object} Telemetry data.
   */
  getTelemetry() {
    return this.telemetry;
  }

  /**
   * Get DOM element.
   * @returns {HTMLElement} The element DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Build the DOM structure.
   */
  buildDOM() {
    this.dom = document.createElement('li');
    this.dom.classList.add('h5p-idea-board-element-interactor');

    if (this.params.capabilities.move || H5PUtil.isEditor()) {
      this.dom.classList.add('can-move');
    }
    this.dom.setAttribute('tabindex', '0');
    this.contentDOM = document.createElement('div');
    this.contentDOM.classList.add('h5p-idea-board-element-interactor-content');
    this.contentDOM.classList.add('layer');
    this.toggleContentDOMBlocked();
    this.dom.append(this.contentDOM);

    this.ariaSummary = document.createElement('span');
    this.ariaSummary.classList.add('h5p-idea-board-element-interactor-summary');
    this.dom.append(this.ariaSummary);

    if (this.params.contentDOM) {
      this.contentDOM.append(this.params.contentDOM);
    }

    this.dom.addEventListener('keydown', (event) => {
      if (event.key === 'Shift') {
        this.shiftIsPressed = true;
      }

      if (event.key === 'Escape') {
        this.setMode(INTERACTOR_MODE.view);
        this.dom.focus();
      }

      if (event.target !== this.dom) {
        return; // No delegation
      }

      if (event.key === 'Enter' || event.key === ' ') {
        this.setMode(INTERACTOR_MODE.interact);
      }

      const isControlPressed = event.ctrlKey || event.metaKey;
      if (isControlPressed && event.key === 'c') {
        this.callbacks.onCopy(this.params.id);
        event.preventDefault();
      }
    });

    this.dom.addEventListener('keyup', (event) => {
      if (event.key === 'Shift') {
        this.shiftIsPressed = false;
      }
    });

    this.dom.addEventListener('touchstart', (event) => {
      this.handleTouchEvent(event);
    }, { passive: false });

    this.dom.addEventListener('pointerdown', (event) => {
      this.handlePointerDown(event);
    });

    this.dom.addEventListener('focusin', (event) => {
      this.handleFocusIn(event);
    });

    this.dom.addEventListener('focusout', (event) => {
      this.handleFocusOut(event);
    });

    this.buildContextMenu();
    if (this.params.capabilities.resize || H5PUtil.isEditor()) {
      this.buildResizeKnobs();
    }

    this.setTelemetry(this.params.telemetry);
  }

  /**
   * Build context menu.
   */
  buildContextMenu() {
    const contextMenuButtonParams = [];

    if (this.params.capabilities.edit || H5PUtil.isEditor()) {
      contextMenuButtonParams.push({
        id: 'edit',
        type: 'pulse',
        pulseStates: [{ id: 'edit', label: this.params.dictionary.get('a11y.edit') }],
        onClick: () => {
          this.callbacks.onEdit(this.params.id);
        }
      });
    }

    if (this.params.capabilities.move || H5PUtil.isEditor()) {
      contextMenuButtonParams.push({
        id: 'move',
        type: 'toggle',
        a11y: {
          active: this.params.dictionary.get('a11y.toggleMoveModeActive'),
          inactive: this.params.dictionary.get('a11y.toggleMoveModeInactive')
        },
        onKeydown: (event, options) => {
          this.handleMoveStart(event, options);
        },
        onKeyup: (event, options) => {
          this.handleMoveEnd(event, options);
        }
      });
    }

    if (this.params.capabilities.resize || H5PUtil.isEditor()) {
      contextMenuButtonParams.push({
        id: 'resize',
        type: 'toggle',
        a11y: {
          active: this.params.dictionary.get('a11y.toggleResizeModeActive'),
          inactive: this.params.dictionary.get('a11y.toggleResizeModeInactive')
        },
        onKeydown: (event, options) => {
          this.handleResizeStart(event, options);
        },
        onKeyup: (event, options) => {
          this.handleResizeEnd(event, options);
        }
      });
    }

    contextMenuButtonParams.push({
      id: 'bringToFront',
      type: 'pulse',
      pulseStates: [{ id: 'bringToFront', label: this.params.dictionary.get('a11y.bringToFront') }],
      onClick: (event, options) => {
        this.handleBringToFront(event, options);
      }
    });

    contextMenuButtonParams.push({
      id: 'sendToBack',
      type: 'pulse',
      pulseStates: [{ id: 'sendToBack', label: this.params.dictionary.get('a11y.sendToBack') }],
      onClick: (event, options) => {
        this.handleSendToBack(event, options);
      }
    });

    contextMenuButtonParams.push({
      id: 'copy',
      type: 'pulse',
      pulseStates: [{ id: 'copy', label: this.params.dictionary.get('a11y.copy') }],
      onClick: (event, options) => {
        this.callbacks.onCopy(this.params.id);
      }
    });

    if (this.params.capabilities.delete || H5PUtil.isEditor()) {
      contextMenuButtonParams.push({
        id: 'delete',
        type: 'pulse',
        pulseStates: [{ id: 'delete', label: this.params.dictionary.get('a11y.delete') }],
        onClick: (event, options) => {
          this.callbacks.onDelete(this.params.id);
        }
      });
    }

    this.contextMenu = new ElementInteractorContextMenu(
      {
        dictionary: this.params.dictionary,
        buttons: contextMenuButtonParams
      },
      {
        getDenominator: () => {
          return this.callbacks.getDenominator(this.params.id);
        }
      }
    );
    this.dom.append(this.contextMenu.getDOM());
  }

  /**
   * Build resize knobs.
   */
  buildResizeKnobs() {
    [
      'top-left', 'top', 'top-right',
      'left', 'right',
      'bottom-left', 'bottom', 'bottom-right'
    ].forEach((position) => {
      const knob = new ElementInteractorResizeKnob(
        {
          position: position
        },
        {
          getBoardRect: () => {
            return this.callbacks.getBoardRect();
          },
          getInteractorRect: () => {
            return this.dom.getBoundingClientRect();
          },
          isShiftPressed: () => {
            return this.shiftIsPressed;
          },
          updateTelemetryByPx: (deltaPx, options) => {
            this.updateTelemetryByPx(deltaPx, options);
          },
          onStoppedResizing: () => {
            this.callbacks.resizeCard(this.params.id);
          }
        }
      );
      this.dom.append(knob.getDOM());
    });
  }

  /**
   * Focus the element.
   */
  focus() {
    this.dom.focus();
  }

  /**
   * Set interaction mode.
   * @param {number} mode Interaction mode.
   */
  setMode(mode = INTERACTOR_MODE.view) {
    this.mode = mode;

    this.dom.classList.toggle('is-interactive', mode === INTERACTOR_MODE.interact);

    if (mode === INTERACTOR_MODE.interact) {
      this.retainFocus();
      this.dom.removeAttribute('tabindex');
    }
    else {
      this.contextMenu.hide();
      this.updateAriaSummary();
      this.dom.setAttribute('tabindex', '0');
    }

    this.toggleContentDOMBlocked(mode !== INTERACTOR_MODE.interact);

    this.callbacks.onEditingModeChanged(this.params.id, mode);
  }

  /**
   * Toggle whether content DOM is blocked.
   * @param {boolean} block Whether to block content DOM.
   */
  toggleContentDOMBlocked(block = true) {
    if (block) {
      this.contentDOM.setAttribute('inert', '');
    }
    else {
      this.contentDOM.removeAttribute('inert');
    }
  }

  /**
   * Set telemetry values. Telemetry argument can be sparse to only update certain values.
   * @param {object} telemetry Telemetry object.
   * @param {number} [telemetry.x] X position as percentage.
   * @param {number} [telemetry.y] Y position as percentage.
   * @param {number} [telemetry.width] Width as percentage.
   * @param {number} [telemetry.height] Height as percentage.
   * @param {object} options Options for sanitization.
   */
  setTelemetry(telemetry = {}, options = {}) {
    const sanitizedPosition = this.getSanitizedPosition(telemetry);
    const sanitizedSize = this.getSanitizedSize(telemetry);
    const sanitizedTelemetry = this.getSanitizedOverflow(
      {
        x: sanitizedPosition.x,
        y: sanitizedPosition.y,
        width: sanitizedSize.width,
        height: sanitizedSize.height
      },
      options
    );

    for (const key in sanitizedTelemetry) {
      this.telemetry[key] = sanitizedTelemetry[key];
    }

    this.dom.style.setProperty('--idea-board-element-x', `${this.telemetry.x}%`);
    this.dom.style.setProperty('--idea-board-element-y', `${this.telemetry.y}%`);
    this.dom.style.setProperty('--idea-board-element-width', `${this.telemetry.width}%`);
    this.dom.style.setProperty('--idea-board-element-height', `${this.telemetry.height}%`);
  }

  /**
   * Check if position is within bounds.
   * @param {object} position Position object.
   * @returns {boolean} True if position is within bounds.
   */
  isPositionWithinBounds(position = {}) {
    const { x, y } = position;

    if (typeof x === 'number' && (x < 0 || x > 100)) {
      return false;
    }

    if (typeof y === 'number' && (y < 0 || y > 100)) {
      return false;
    }

    return true;
  }

  /**
   * Get sanitized position.
   * @param {object} position Position object.
   * @returns {object} Sanitized position.
   */
  getSanitizedPosition(position = {}) {
    return {
      x: Math.max(0, Math.min(position.x ?? this.telemetry.x, 100)),
      y: Math.max(0, Math.min(position.y ?? this.telemetry.y, 100))
    };
  }

  /**
   * Check if size is within bounds.
   * @param {object} size Size object.
   * @returns {boolean} True if size is within bounds.
   */
  isSizeWithinBounds(size = {}) {
    const { width, height } = size;

    if (typeof width === 'number' && (width < this.pxToPercent(TELEMETRY_MIN_SIZE_PX, 'width') || width > 100)) {
      return false;
    }

    if (typeof height === 'number' && (height < this.pxToPercent(TELEMETRY_MIN_SIZE_PX, 'height') || height > 100)) {
      return false;
    }

    return true;
  }

  /**
   * Get sanitized size.
   * @param {object} size Size object.
   * @returns {object} Sanitized size.
   */
  getSanitizedSize(size = {}) {
    return {
      width: Math.max(
        this.pxToPercent(TELEMETRY_MIN_SIZE_PX, 'width'),
        Math.min(size.width ?? this.telemetry.width, 100)
      ),
      height: Math.max(
        this.pxToPercent(TELEMETRY_MIN_SIZE_PX, 'height'),
        Math.min(size.height ?? this.telemetry.height, 100)
      )
    };
  }

  /**
   * Get sanitized telemetry to prevent overflow.
   * @param {object} telemetry Telemetry object.
   * @param {object} options Options for sanitization.
   * @returns {object} Sanitized telemetry.
   */
  getSanitizedOverflow(telemetry = {}, options = {}) {
    const sanitizedTelemetry = { ... telemetry };

    if (sanitizedTelemetry.x + sanitizedTelemetry.width > 100) {
      if (options.retainSize) {
        sanitizedTelemetry.x = 100 - sanitizedTelemetry.width;
      }
      else {
        sanitizedTelemetry.width = 100 - sanitizedTelemetry.x;
      }
    }

    if (sanitizedTelemetry.y + sanitizedTelemetry.height > 100) {
      if (options.retainSize) {
        sanitizedTelemetry.y = 100 - sanitizedTelemetry.height;
      }
      else if (!options.aspectRatio) {
        sanitizedTelemetry.height = 100 - sanitizedTelemetry.y;
      }
    }

    return sanitizedTelemetry;
  }

  /**
   * Convert pixels to percentage.
   * @param {number} px Pixels.
   * @param {string} base Base ('width' or 'height').
   * @returns {number} Percentage.
   */
  pxToPercent(px, base) {
    const boardSize = this.callbacks.getBoardRect();
    if (boardSize[base] === 0) {
      return 0;
    }

    return 100 * px / boardSize[base];
  }

  /**
   * Update telemetry by pixels.
   * @param {object} deltaPx Delta in pixels.
   * @param {object} options Options for updating telemetry.
   * @param {boolean} [options.retainSize] If true, keep the size of the interactor.
   * @param {number} [options.aspectRatio] Aspect ratio to maintain during resizing.
   * @param {boolean} [options.active] If true, update telemetry only if active.
   * @param {boolean} [options.silent] If true, do not trigger move event.
   * @param {boolean} [options.skipSanitization] If true, skip sanitization of telemetry.
   */
  updateTelemetryByPx(deltaPx = {}, options = {}) {
    const boardSize = this.callbacks.getBoardRect();
    if (boardSize?.width === 0 || boardSize?.height === 0) {
      return;
    }

    const interactorTelemetry = {
      x: this.telemetry.x * boardSize.width / 100,
      y: this.telemetry.y * boardSize.height / 100,
      width: this.telemetry.width * boardSize.width / 100,
      height: this.telemetry.height * boardSize.height / 100
    };

    let targetTelemetry = {
      x: interactorTelemetry.x + (deltaPx.x ?? 0),
      y: interactorTelemetry.y + (deltaPx.y ?? 0),
      width: interactorTelemetry.width + (deltaPx.width ?? 0),
      height: interactorTelemetry.height + (deltaPx.height ?? 0)
    };

    const applyAspectRatioModification = (deltaPx, interactorTelemetry, targetTelemetry, aspectRatio) => {
      const newTargetTelemetry = { ...targetTelemetry };

      if (deltaPx.x && deltaPx.y) {
        // top left knob
        const targetY = interactorTelemetry.y + interactorTelemetry.height;
        newTargetTelemetry.height = newTargetTelemetry.width / aspectRatio;
        newTargetTelemetry.y = targetY - newTargetTelemetry.height;
      }
      else if (!deltaPx.x && deltaPx.y) {
        if (!deltaPx.width) {
          // top knob
          newTargetTelemetry.width = newTargetTelemetry.height * aspectRatio;
        }
        else {
          // top right knob
          const targetY = interactorTelemetry.y + interactorTelemetry.height;
          newTargetTelemetry.height = newTargetTelemetry.width / aspectRatio;
          newTargetTelemetry.y = targetY - newTargetTelemetry.height;
        }
      }
      else if (deltaPx.x && !deltaPx.y) {
        // bottom left knob
        const targetY = interactorTelemetry.y;
        newTargetTelemetry.height = newTargetTelemetry.width / aspectRatio;
        newTargetTelemetry.y = targetY;
      }
      else if (!deltaPx.x && !deltaPx.y) {
        if (!deltaPx.width) {
          // bottom knob
          newTargetTelemetry.width = newTargetTelemetry.height * aspectRatio;
        }
        else {
          // bottom right knob
          const targetY = interactorTelemetry.y;
          newTargetTelemetry.height = newTargetTelemetry.width / aspectRatio;
          newTargetTelemetry.y = targetY;
        }
      }

      return newTargetTelemetry;
    };

    if (options.aspectRatio) {
      targetTelemetry = applyAspectRatioModification(
        deltaPx, interactorTelemetry, targetTelemetry, options.aspectRatio
      );

      if (targetTelemetry.x < 0 || targetTelemetry.x + targetTelemetry.width > boardSize.width) {
        return;
      }

      if (targetTelemetry.y < 0 || targetTelemetry.y + targetTelemetry.height > boardSize.height) {
        return;
      }
    }

    if (targetTelemetry.x < 0 && deltaPx.width) {
      targetTelemetry.width = targetTelemetry.width + targetTelemetry.x;
      targetTelemetry.x = 0;
    }

    if (targetTelemetry.y < 0 && deltaPx.height) {
      targetTelemetry.height = targetTelemetry.height + targetTelemetry.y;
      targetTelemetry.y = 0;
    }

    if (targetTelemetry.width < TELEMETRY_MIN_SIZE_PX) {
      return;
    }

    if (targetTelemetry.height < TELEMETRY_MIN_SIZE_PX) {
      return;
    }

    const targetTelemetryPercent = {
      x: this.pxToPercent(targetTelemetry.x, 'width'),
      y: this.pxToPercent(targetTelemetry.y, 'height'),
      width: this.pxToPercent(targetTelemetry.width, 'width'),
      height: this.pxToPercent(targetTelemetry.height, 'height')
    };

    this.setTelemetry(targetTelemetryPercent, options);
  }

  /**
   * Compute target telemetry in percent.
   * @param {object} deltaPx Delta in pixels.
   * @returns {object} Target telemetry in percent.
   */
  computeTargetTelemetryPercent(deltaPx = {}) {
    const deltaPercent = this.deltaPxToDeltaPercent(deltaPx);
    return {
      x: this.telemetry.x + deltaPercent.x ?? 0,
      y: this.telemetry.y + deltaPercent.y ?? 0,
      width: this.telemetry.width + deltaPercent.width ?? 0,
      height: this.telemetry.height + deltaPercent.height ?? 0
    };
  }

  /**
   * Convert delta pixels to delta percent.
   * @param {object} deltaPx Delta in pixels.
   * @returns {object} Delta in percent.
   */
  deltaPxToDeltaPercent(deltaPx = {}) {
    return {
      x: this.pxToPercent(deltaPx.x ?? 0, 'width'),
      y: this.pxToPercent(deltaPx.y ?? 0, 'height'),
      width: this.pxToPercent(deltaPx.width ?? 0, 'width'),
      height: this.pxToPercent(deltaPx.height ?? 0, 'height')
    };
  }

  /**
   * Handle bring to front action.
   * @param {Event} event Event.
   * @param {object} options Options.
   */
  handleBringToFront(event, options) {
    let nextFocusElement = null;
    const eventWasFromKeyboard = event.pointerType === '';

    if (eventWasFromKeyboard) {
      nextFocusElement = this.contextMenu.getButton(options.id)?.getDOM();
    }

    this.retainFocus();

    this.callbacks.onBringToFront( this.params.id, { nextFocus: nextFocusElement } );
  }

  /**
   * Handle send to back action.
   * @param {Event} event Event.
   * @param {object} options Options.
   */
  handleSendToBack(event, options) {
    let nextFocusElement = null;
    const eventWasFromKeyboard = event.pointerType === '';

    if (eventWasFromKeyboard) {
      nextFocusElement = this.contextMenu.getButton(options.id)?.getDOM();
    }

    this.retainFocus();

    this.callbacks.onSendToBack(this.params.id, { nextFocus: nextFocusElement } );
  }

  /**
   * Handle move start.
   * @param {KeyboardEvent} event Keyboard event.
   * @param {object} options Options.
   */
  handleMoveStart(event, options) {
    if (!options.active) {
      return;
    }

    if (event.key === 'ArrowUp') {
      this.updateTelemetryByPx({ x: 0, y: -this.moveDelta });
    }
    else if (event.key === 'ArrowDown') {
      this.updateTelemetryByPx({ x: 0, y: this.moveDelta });
    }
    else if (event.key === 'ArrowLeft') {
      this.updateTelemetryByPx({ x: -this.moveDelta, y: 0 });
    }
    else if (event.key === 'ArrowRight') {
      this.updateTelemetryByPx({ x: this.moveDelta, y: 0 });
    }
    else {
      return;
    }

    this.moveDelta += MOVE_DELTA_INCREMENT;
    event.stopPropagation();
  }

  /**
   * Handle move end.
   * @param {KeyboardEvent} event Keyboard event.
   * @param {object} options Options.
   */
  handleMoveEnd(event, options) {
    if (!options.active) {
      return;
    }

    this.moveDelta = 1;
    this.callbacks.onMove();
  }

  /**
   * Handle resize start.
   * @param {KeyboardEvent} event Keyboard event.
   * @param {object} options Options.
   */
  handleResizeStart(event, options) {
    if (!options.active) {
      return;
    }

    if (event.key === 'ArrowUp') {
      this.updateTelemetryByPx({ x: 0, y: 0, height: -this.resizeDelta, width: 0 });
    }
    else if (event.key === 'ArrowDown') {
      this.updateTelemetryByPx({ x: 0, y: 0, height: this.resizeDelta, width: 0 });
    }
    else if (event.key === 'ArrowLeft') {
      this.updateTelemetryByPx({ x: 0, y: 0, height: 0, width: -this.resizeDelta });
    }
    else if (event.key === 'ArrowRight') {
      this.updateTelemetryByPx({ x: 0, y: 0, height: 0, width: this.resizeDelta });
    }
    else {
      return;
    }

    this.resizeDelta += RESIZE_DELTA_INCREMENT;
    event.stopPropagation();
  }

  /**
   * Handle resize end.
   * @param {KeyboardEvent} event Keyboard event.
   * @param {object} options Options.
   */
  handleResizeEnd(event, options) {
    if (!options.active) {
      return;
    }

    this.resizeDelta = 1;
    this.callbacks.resizeCard(this.params.id);
  }

  /**
   * Handle pointer down event.
   * @param {PointerEvent} event Pointer down event.
   */
  handlePointerDown(event) {
    if (event.target !== this.dom) {
      return; // No delegation
    }

    if (this.mode !== INTERACTOR_MODE.view) {
      return;
    }

    event.preventDefault();
    if (document.activeElement !== this.dom) {
      this.dom.focus();
      this.hadFocus = false;
    }
    else {
      this.hadFocus = true;
    }

    this.isMoving = true;

    document.addEventListener('pointerup', this.handlePointerUp);
    if (!this.params.capabilities.move) {
      return;
    }

    this.moveStartPx = { x: event.clientX, y: event.clientY };

    this.dom.setPointerCapture(event.pointerId);

    document.addEventListener('touchmove', this.handleTouchEvent, { passive: false });
    document.addEventListener('pointermove', this.handlePointerMove);

    event.preventDefault();
  }

  /**
   * Handle touch move event.
   * @param {TouchEvent} event Touch move event.
   */
  handleTouchEvent(event) {
    if (!this.params.capabilities.move) {
      return;
    }

    // Prevent default touch events like moving screen when moving/resizing could take place.
    if (this.mode === INTERACTOR_MODE.view && event.target === this.dom) {
      event.preventDefault();
    }
  }

  /**
   * Handle pointer move event.
   * @param {PointerEvent} event Pointer move event.
   */
  handlePointerMove(event) {
    if (event.target !== this.dom) {
      return; // No delegation
    }

    if (this.mode !== INTERACTOR_MODE.view) {
      return;
    }

    if (!this.isMoving) {
      return;
    }

    this.wasMoved = true;

    const deltaPx = { x: event.clientX - this.moveStartPx.x, y: event.clientY - this.moveStartPx.y };

    const boardRect = this.callbacks.getBoardRect();
    this.moveStartPx = {
      x: Math.max(boardRect.left, Math.min(event.clientX, boardRect.right)),
      y: Math.max(boardRect.top, Math.min(event.clientY, boardRect.bottom))
    };

    this.updateTelemetryByPx(deltaPx, { retainSize: true });
  }

  /**
   * Handle pointer up event.
   * @param {PointerEvent} event Pointer up event.
   */
  handlePointerUp(event) {
    if (event.target !== this.dom) {
      return; // No delegation
    }

    if (this.mode !== INTERACTOR_MODE.view) {
      return;
    }

    event.preventDefault();
    if (!this.isMoving) {
      return;
    }

    if (this.hadFocus && !this.wasMoved) {
      this.setMode(INTERACTOR_MODE.interact);
    }

    this.isMoving = false;
    this.wasMoved = false;

    if (this.dom.hasPointerCapture(event.pointerId)) {
      this.dom.releasePointerCapture(event.pointerId);
    }

    document.removeEventListener('touchmove', this.handleTouchEvent);
    document.removeEventListener('pointermove', this.handlePointerMove);
    document.removeEventListener('pointerup', this.handlePointerUp);

    this.callbacks.onMove();
  }

  /**
   * Retain focus on element. Prevents losing focus by onFocusOut handle kicking in right after mode change.
   */
  retainFocus() {
    this.shouldRetainFocus = true;

    // Workaround. Using requestAnimationFrame does not work on Firefox, it seems to be too slow.
    window.setTimeout(() => {
      this.shouldRetainFocus = false;
    }, FOCUS_RETAIN_TIMEOUT_MS);
  }

  /**
   * Handle focus in event.
   * @param {FocusEvent} event Focus event.
   */
  handleFocusIn(event) {
    this.contextMenu.show();
    this.updateAriaSummary();
  }

  /**
   * Update ARIA summary for the element.
   */
  updateAriaSummary() {
    const denominator = this.callbacks.getDenominator(this.params.id);
    const summaryText = this.callbacks.getSummaryText(this.params.id);


    this.ariaSummary.innerText = `${denominator}. ${summaryText}`;
  }

  /**
   * Handle focus out event.
   * @param {FocusEvent} event Focus event.
   */
  handleFocusOut(event) {
    if (this.shouldRetainFocus) {
      return;
    }

    if (
      event.relatedTarget === this.dom ||
      event.relatedTarget?.closest('.h5p-idea-board-element-interactor') === this.dom
    ) {
      return; // Focus still on this element or one of its children
    }

    this.setMode(INTERACTOR_MODE.view);
  }

  /**
   * Reset the interactor.
   * @param {object} telemetry Telemetry data to reset to.
   */
  reset(telemetry) {
    this.setTelemetry(telemetry ?? this.params.telemetry);
  }
}
