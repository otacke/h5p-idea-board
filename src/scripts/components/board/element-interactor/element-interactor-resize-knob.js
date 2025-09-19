import Util from '@services/util.js';
import './element-interactor-resize-knob.scss';

export default class ElementInteractorResizeKnob {
  /**
   * Resize knob for element interactor.
   * @class
   * @param {object} params Parameters.
   * @param {string} params.position Position of the knob ('top', 'right', 'bottom', 'left', or combinations).
   * @param {object} callbacks Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      getBoardRect: () => {},
      getInteractorRect: () => {},
      isShiftPressed: () => false,
      updateTelemetryByPx: () => {},
      onStoppedResizing: () => {},
    }, callbacks);

    this.canResizeHorizontally = this.params.position.includes('left') || this.params.position.includes('right');
    this.canResizeVertically = this.params.position.includes('top') || this.params.position.includes('bottom');

    this.horizontalFactor = this.params.position.includes('left') ? -1 : 1;
    this.VerticalFactor = this.params.position.includes('top') ? -1 : 1;

    this.handleTouchEvent = this.handleTouchEvent.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);

    this.buildDOM();
  }

  /**
   * Get DOM element.
   * @returns {HTMLElement} The resize knob DOM element.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Build the DOM structure.
   */
  buildDOM() {
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-idea-board-element-interactor-resize-knob');
    this.dom.classList.add(this.params.position);

    this.dom.addEventListener('touchdown', (event) => {
      this.handleTouchEvent(event);
    }, { passive: false });

    this.dom.addEventListener('pointerdown', (event) => {
      this.handlePointerDown(event);
    });
  }

  /**
   * Handle touch event.
   * @param {TouchEvent} event Touch event.
   */
  handleTouchEvent(event) {
    event.preventDefault();
  }

  /**
   * Handle pointer down event.
   * @param {PointerEvent} event Pointer down event.
   */
  handlePointerDown(event) {
    if (event.target !== this.dom) {
      return;
    }

    this.isResizing = true;

    const rect = this.callbacks.getInteractorRect();
    this.aspectRatio = rect.width / rect.height;

    this.resizeStartPx = { x: event.clientX, y: event.clientY };

    this.dom.setPointerCapture(event.pointerId);

    document.addEventListener('touchmove', this.handleTouchEvent, { passive: false });
    document.addEventListener('pointermove', this.handlePointerMove);
    document.addEventListener('pointerup', this.handlePointerUp);

    document.addEventListener('keydown', this.handleKeydown);
    document.addEventListener('keyup', this.handleKeyup);
  }

  /**
   * Handle pointer move event.
   * @param {PointerEvent} event Pointer move event.
   */
  handlePointerMove(event) {
    if (event.target !== this.dom || !this.isResizing) {
      return;
    }

    let deltaPx = { x: 0, y: 0, width: 0, height: 0 };

    const boardRect = this.callbacks.getBoardRect();

    if (this.canResizeHorizontally) {
      deltaPx.width = (event.clientX - this.resizeStartPx.x) * this.horizontalFactor;
    }
    if (this.canResizeVertically) {
      deltaPx.height = (event.clientY - this.resizeStartPx.y) * this.VerticalFactor;
    }

    if (this.horizontalFactor < 0) {
      deltaPx.x = -deltaPx.width;
    }
    if (this.VerticalFactor < 0) {
      deltaPx.y = -deltaPx.height;
    }

    this.resizeStartPx = {
      x: Math.max(boardRect.left, Math.min(event.clientX, boardRect.right)),
      y: Math.max(boardRect.top, Math.min(event.clientY, boardRect.bottom)),
    };

    const shouldRetainAspectRatio = this.callbacks.isShiftPressed();
    this.callbacks.updateTelemetryByPx(
      deltaPx,
      {
        ...(shouldRetainAspectRatio && { aspectRatio: this.aspectRatio }),
      },
    );
  }

  /**
   * Handle pointer up event.
   * @param {PointerEvent} event Pointer up event.
   */
  handlePointerUp(event) {
    this.isResizing = false;
    delete this.aspectRatio;

    this.dom.releasePointerCapture(event.pointerId);

    document.removeEventListener('touchmove', this.handleTouchEvent);
    document.removeEventListener('pointermove', this.handlePointerMove);
    document.removeEventListener('pointerup', this.handlePointerUp);

    this.callbacks.onStoppedResizing();
  }
}
