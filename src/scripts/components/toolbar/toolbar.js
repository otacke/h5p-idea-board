import ToolbarButton from '@components/toolbar-button/toolbar-button.js';
import Util from '@services/util.js';
import './toolbar.scss';

/** Class representing the button bar */
export default class Toolbar {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object[]} [params.buttons] Button parameters.
   * @param {boolean} [params.hidden] If true, hide toolbar.
   * @param {object} [callbacks] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      buttons: [],
      hidden: false
    }, params);

    this.callbacks = Util.extend({
    }, callbacks);

    this.buttons = {};

    // Build DOM
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-idea-board-toolbar-tool-bar');
    this.dom.setAttribute('role', 'toolbar');

    this.dom.addEventListener('keydown', (event) => {
      this.handleKeydown(event);
    });

    if (this.params.hidden) {
      this.hide();
    }

    // Headline
    const headline = document.createElement('div');
    headline.classList.add('toolbar-headline');
    headline.innerText = Util.purifyHTML(this.params.headline);
    this.dom.append(headline);

    if (this.params.headline) {
      const headLineId = `headline-${H5P.createUUID()}`;

      headline.setAttribute('id', headLineId);

      // Use headline as label for toolbar
      this.dom.setAttribute('aria-labelledby', headLineId);
    }
    else {
      this.dom.setAttribute(
        'aria-label', this.params.dictionary.get('a11y.toolbarFallbackLabel')
      );
    }

    const nonHeadline = document.createElement('div');
    nonHeadline.classList.add('toolbar-non-headline');
    this.dom.append(nonHeadline);

    // Buttons
    this.buttonsContainer = document.createElement('div');
    this.buttonsContainer.classList.add('toolbar-buttons');
    nonHeadline.append(this.buttonsContainer);

    this.params.buttons.forEach((button) => {
      this.addButton(button);
    });

    // Make first button active one
    Object.values(this.buttons).forEach((button, index) => {
      button.setAttribute('tabindex', index === 0 ? '0' : '-1');
    });
    this.currentButtonIndex = 0;
  }

  /**
   * Return the DOM for this class.
   * @returns {HTMLElement} DOM for this class.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get full height.
   * @returns {number} Full height in px.
   */
  getFullHeight() {
    const styles = window.getComputedStyle(this.dom);
    const margin = parseFloat(styles.getPropertyValue('margin-top')) +
      parseFloat(styles.getPropertyValue('margin-bottom'));

    return Math.ceil(this.dom.offsetHeight + margin);
  }

  /**
   * Focus whatever should get focus.
   */
  focus() {
    Object.values(this.buttons)[this.currentButtonIndex]?.focus();
  }

  /**
   * Add button.
   * @param {object} [button] Button parameters.
   */
  addButton(button = {}) {
    if (typeof button.id !== 'string') {
      return; // We need an id at least
    }

    this.buttons[button.id] = new ToolbarButton(
      {
        id: button.id,
        ...(button.versionedMachineName && { versionedMachineName: button.versionedMachineName }),
        ...(button.a11y && { a11y: button.a11y }),
        classes: ['toolbar-button', `toolbar-button-${button.id.toLowerCase()}`],
        ...(typeof button.disabled === 'boolean' && {
          disabled: button.disabled
        }),
        ...(button.active && { active: button.active }),
        ...(button.type && { type: button.type }),
        ...(button.pulseStates && { pulseStates: button.pulseStates }),
        ...(button.pulseIndex && { pulseIndex: button.pulseIndex }),
        ...(button.props && { props: button.props }),
      },
      {
        ...(typeof button.onClick === 'function' && {
          onClick: (event, params) => {
            button.onClick(event, params);
          }
        })
      }
    );

    this.buttonsContainer.appendChild(this.buttons[button.id].getDOM());
  }

  /**
   * Set button attributes.
   * @param {string} id Button id.
   * @param {object} attributes HTML attributes to set.
   */
  setButtonAttributes(id = '', attributes = {}) {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    for (let attribute in attributes) {
      this.buttons[id].setAttribute(attribute, attributes[attribute]);
    }
  }

  /**
   * Force button state.
   * @param {string} id Button id.
   * @param {boolean|number} active If true, toggle active, else inactive.
   * @param {object} [options] Options.
   */
  forceButton(id = '', active, options = {}) {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].force(active, options);
  }

  /**
   * Enable.
   */
  enable() {
    for (const id in this.buttons) {
      this.enableButton(id);
    }
  }

  /**
   * Disable.
   */
  disable() {
    for (const id in this.buttons) {
      this.disableButton(id);
    }
  }

  /**
   * Enable button.
   * @param {string} id Button id.
   */
  enableButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].enable();
  }

  /**
   * Disable button.
   * @param {string} id Button id.
   */
  disableButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].disable();
  }

  /**
   * Show button.
   * @param {string} id Button id.
   */
  showButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].show();
  }

  /**
   * Hide button.
   * @param {string} id Button id.
   */
  hideButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].hide();
  }

  /**
   * Decloak button.
   * @param {string} id Button id.
   */
  decloakButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].decloak();
  }

  /**
   * Cloak button.
   * @param {string} id Button id.
   */
  cloakButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].cloak();
  }

  /**
   * Focus a button.
   * @param {string} id Button id.
   */
  focusButton(id = '') {
    if (!this.buttons[id] || this.buttons[id].isCloaked()) {
      return; // Button not available
    }

    this.buttons[id].focus();
  }

  /**
   * Show.
   */
  show() {
    this.dom.classList.remove('display-none');
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('display-none');
  }

  /**
   * Move button focus.
   * @param {number} offset Offset to move position by.
   */
  moveButtonFocus(offset) {
    if (typeof offset !== 'number') {
      return;
    }
    if (
      this.currentButtonIndex + offset < 0 ||
      this.currentButtonIndex + offset > Object.keys(this.buttons).length - 1
    ) {
      return; // Don't cycle
    }
    Object.values(this.buttons)[this.currentButtonIndex]
      .setAttribute('tabindex', '-1');
    this.currentButtonIndex = this.currentButtonIndex + offset;
    const focusButton = Object.values(this.buttons)[this.currentButtonIndex];
    focusButton.setAttribute('tabindex', '0');
    focusButton.focus();
  }

  /**
   * Handle key down.
   * @param {KeyboardEvent} event Keyboard event.
   */
  handleKeydown(event) {
    if (event.code === 'ArrowLeft' || event.code === 'ArrowUp') {
      this.moveButtonFocus(-1);
    }
    else if (event.code === 'ArrowRight' || event.code === 'ArrowDown') {
      this.moveButtonFocus(1);
    }
    else if (event.code === 'Home') {
      this.moveButtonFocus(0 - this.currentButtonIndex);
    }
    else if (event.code === 'End') {
      this.moveButtonFocus(
        Object.keys(this.buttons).length - 1 - this.currentButtonIndex
      );
    }
    else {
      return;
    }
    event.preventDefault();
  }

  /**
   * Get the minimum height of the toolbar.
   * @returns {number} Minimum height of the toolbar.
   */
  getMinHeight() {
    const childrenMaxHeight = Array.from(this.dom.children).reduce((max, child) => {
      return Math.max(max, child.offsetHeight);
    }, 0);

    const padding = parseFloat(getComputedStyle(this.dom).paddingTop) +
    parseFloat(getComputedStyle(this.dom).paddingBottom);

    return childrenMaxHeight + padding;
  }
}
