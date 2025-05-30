import Util from '@services/util.js';
import './exercise.scss';

export default class Exercise {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   * @param {object} [callbacks.getBoardRect] Get board rect.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      getBoardRect: () => {},
      passEditorDialog: () => {}
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-idea-board-exercise-instance-wrapper');

    this.instanceWrapper = document.createElement('div');
    this.instanceWrapper.classList.add('h5p-idea-board-exercise-instance');
    this.dom.append(this.instanceWrapper);

    this.previousState = params?.previousState || {};

    this.initializeInstance();
  }

  /**
   * Get DOM with H5P exercise.
   * @returns {HTMLElement} DOM with H5P exercise.
   */
  getDOM() {
    return this.dom;
  }

  resize() {
    if (!this.instance) {
      return;
    }

    this.instance.trigger('resize');
  }

  /**
   * Set focus on the first focusable element in the exercise.
   * @returns {boolean} True, if focus was set.
   */
  focus() {
    const focusable = [... this.dom.querySelectorAll(
      'input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable]'
    )].filter((element) => {
      const style = window.getComputedStyle(element);
      const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
      const isDisabled = element.disabled || element.getAttribute('aria-disabled') === 'true';
      return isVisible && !isDisabled;
    }).shift();

    if (focusable) {
      focusable.focus();
      return true;
    }

    return false;
  }

  /**
   * Initialize H5P instance.
   */
  initializeInstance() {
    if (this.instance === null || this.instance) {
      return; // Only once, please
    }

    const machineName = this.params.contentType?.library?.split?.(' ')[0];

    if (!this.instance) {
      this.instance = H5P.newRunnable(
        this.params.contentType,
        this.params.globals.get('contentId'),
        undefined,
        true,
        { previousState: this.previousState?.instanceState }
      );
    }

    if (!this.instance) {
      return;
    }

    this.instance.setPassEditorDialogCallback(this.callbacks.passEditorDialog);

    // Resize parent when children resize
    this.bubbleUp(
      this.instance, 'resize', this.params.globals.get('mainInstance')
    );

    // Resize children to fit inside parent
    this.bubbleDown(
      this.params.globals.get('mainInstance'), 'resize', [this.instance]
    );

    if (machineName === 'H5P.EditableText') {
      this.instance.on('resize', () => {
        this.resizeHTMLTextFontSize();
      });
    }
  }

  resizeHTMLTextFontSize() {
    if (!this.instance) {
      return;
    }

    const boardRect = this.callbacks.getBoardRect();
    const boardWidth = boardRect.width;
    const baseWidth = this.params.globals.get('baseSize').width;

    const widthRatio = boardWidth / baseWidth;
    const scaledFontSize = this.params.globals.get('baseFontSizePx') * widthRatio;

    this.instance.setFontSize(scaledFontSize);
  }

  /**
   * Get Id.
   * @returns {string} Exercise Id.
   */
  getId() {
    return this.params.id;
  }

  /**
   * Get H5P instance.
   * @returns {H5P.ContentType} H5P instance.
   */
  getInstance() {
    return this.instance;
  }

  /**
   * Get current state.
   * @returns {object} Current state to be retrieved later.
   */
  getCurrentState() {
    return { instanceState: this.instance?.getCurrentState?.() };
  }

  /**
   * Get xAPI data from exercises.
   * @returns {object[]} XAPI data objects used to build report.
   */
  getXAPIData() {
    return this.instance.getXAPIData?.();
  }

  /**
   * Show solutions.
   */
  showSolutions() {
    if (!this.isAttached) {
      this.attachInstance();
    }

    this.instance?.showSolutions?.();
  }

  /**
   * Determine whether some answer was given.
   * @returns {boolean} True, if some answer was given.
   */
  getAnswerGiven() {
    return this.instance?.getAnswerGiven?.() ?? false;
  }

  /**
   * Get score of instance.
   * @returns {number} Score of instance or 0.
   */
  getScore() {
    /*
     * Does not work for H5P.MultiChoice and H5P.MultiMediaChoice if no answer
     * option is correct.
     * In both, `getAnswerGiven` should not try to derive the state from the
     * DOM, but rather from the user actually having given an answer.
     * Should be fixed in those two.
     * Cmp. https://h5ptechnology.atlassian.net/issues/HFP-3682
     */
    const score = this.instance?.getScore?.();

    return (typeof score === 'number') ? score : 0;
  }

  /**
   * Get max score of instance.
   * @returns {number} Maximum score of instance or 0.
   */
  getMaxScore() {
    const maxScore = this.instance?.getMaxScore?.();

    return (typeof maxScore === 'number') ? maxScore : 0;
  }

  /**
   * Make it easy to bubble events from child to parent.
   * @param {object} origin Origin of event.
   * @param {string} eventName Name of event.
   * @param {object} target Target to trigger event on.
   */
  bubbleUp(origin, eventName, target) {
    origin.on(eventName, (event) => {
      // Prevent target from sending event back down
      target.bubblingUpwards = true;

      // Trigger event
      target.trigger(eventName, event);

      // Reset
      target.bubblingUpwards = false;
    });
  }

  /**
   * Make it easy to bubble events from parent to children.
   * @param {object} origin Origin of event.
   * @param {string} eventName Name of event.
   * @param {object[]} targets Targets to trigger event on.
   */
  bubbleDown(origin, eventName, targets) {
    origin.on(eventName, (event) => {
      if (origin.bubblingUpwards) {
        return; // Prevent send event back down.
      }

      targets.forEach((target) => {
        // If not attached yet, some contents can fail (e. g. CP).
        if (this.isAttached) {
          target.trigger(eventName, event);
        }
      });
    });
  }

  /**
   * Attach instance to DOM.
   */
  attachInstance() {
    if (this.isAttached) {
      return; // Already attached. Listeners would go missing on re-attaching.
    }

    this.instance.attach(H5P.jQuery(this.instanceWrapper));

    this.isAttached = true;
  }

  /**
   * Reset.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.isInitial] If true, don't overwrite presets.
   */
  reset(params = {}) {
    this.score = 0;

    /*
     * If not attached yet, some contents can fail (e. g. CP), but contents
     * that are not attached never had a previous state change, so okay
     */
    if (!this.isAttached) {
      this.attachInstance();
    }

    if (!params.isInitial && this.instance) {
      if (typeof this.instance.resetTask === 'function') {
        this.instance.resetTask();
      }
      else {
        delete this.instance;
        this.initializeInstance();
        this.isAttached = false;
      }
    }
  }

  getSummaryText() {
    if (!this.instance) {
      return;
    }

    const machineName = this.instance.libraryInfo.machineName;
    if (machineName === 'H5P.EditableText') {
      return Util.htmlToPlain(this.instance.getSummary());
    }
    else if (machineName === 'H5P.EditableMedium') {
      return Util.purifyHTML(this.instance.getSummary());
    }

    return machineName;
  }
}
