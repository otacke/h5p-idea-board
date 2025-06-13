import Util from '@services/util.js';
import H5PUtil from './services/utils-h5p.js';
import Dictionary from '@services/dictionary.js';
import Globals from '@services/globals.js';
import ConfirmationDialog from '@components/confirmation-dialog/confirmation-dialog.js';
import Screenreader from '@services/screenreader.js';
import Main from '@components/main.js';
import '@styles/h5p-idea-board.scss';

/** @constant {string} Default description */
const DEFAULT_DESCRIPTION = 'Idea Board';

/** @constant {number} FULL_SCREEN_DELAY_MEDIUM_MS Time some browsers need to go to full screen. */
const FULL_SCREEN_DELAY_MEDIUM_MS = 200;

/** @constant {number} FULL_SCREEN_DELAY_LARGE_MS Time some browsers need to go to full screen. */
const FULL_SCREEN_DELAY_LARGE_MS = 300;

/** @constant {object} BASE_SIZE base size to compute values like font size (as in CoursePresentation). */
const BASE_SIZE = { width: 640, height: 400 };

/** @constant {number} BASE_FONT_SIZE_PX base font size in px. */
const BASE_FONT_SIZE_PX = 16;

/** @constant {number} TELEMETRY_PROPERTY_COUNT Number of properties in telemetry object. */
const TELEMETRY_PROPERTY_COUNT = 4;

export default class IdeaBoard extends H5P.EventDispatcher {
  /**
   * @class
   * @param {object} params Parameters passed by the editor.
   * @param {number} contentId Content's id.
   * @param {object} [extras] Saved state, metadata, etc.
   */
  constructor(params, contentId, extras = {}) {
    super('idea-board');

    const defaults = Util.extend({}, H5PUtil.getSemanticsDefaults());
    this.params = Util.extend(defaults, params);

    this.contentId = contentId;
    this.extras = extras ?? {};
    this.previousState = extras?.previousState ?? {};

    this.globals = new Globals();
    this.globals.set('contentId', this.contentId);
    this.globals.set('mainInstance', this);
    this.globals.set('params', this.params);
    this.globals.set('baseSize', BASE_SIZE);
    this.globals.set('baseFontSizePx', BASE_FONT_SIZE_PX);
    this.globals.set('isFullscreenSupported', this.isRoot() && H5P.fullscreenSupported);
    this.globals.set('Screenreader', Screenreader);
    this.globals.set('defaultLanguage', extras?.metadata?.defaultLanguage || 'en');
    this.globals.set('editor', this.extras.IdeaBoardEditor ?? false);

    this.dictionary = new Dictionary();
    this.dictionary.fill({ l10n: this.params.l10n, a11y: this.params.a11y });

    // Confirmation Dialog
    this.confirmationDialog = new ConfirmationDialog({
      globals: this.globals
    });
    this.globals.set('ConfirmationDialog', this.confirmationDialog);

    // Screenreader for polite screen reading
    document.body.append(Screenreader.getDOM());

    this.sanitizeCards();

    this.main = new Main(
      {
        globals: this.globals,
        dictionary: this.dictionary,
        // Setting editor params as previous state if the latter is not set
        previousState: this.previousState.main ?? { elements: this.params.board.cards },
      },
      {
        onFullscreenClicked: () => {
          this.handleFullscreenClicked();
        },
        updateEditorValues: () => {
          this.updateEditorValues();
        },
        onEdited: (data) => {
          this.trigger('edited', data);
        },
        onAdded: (data) => {
          this.trigger('added', data);
        }
      }
    );

    // Resize fullscreen dimensions when rotating screen
    const recomputeDimensions = () => {
      if (H5P.isFullscreen) {
        window.setTimeout(() => { // Needs time to rotate for window.innerHeight
          this.main.setFullscreen(true);
        }, FULL_SCREEN_DELAY_MEDIUM_MS);
      }
    };

    if (screen?.orientation?.addEventListener) {
      screen?.orientation?.addEventListener('change', () => {
        recomputeDimensions();
      });
    }
    else {
      /*
       * `orientationchange` is deprecated, but guess what browser was late to the party Screen Orientation API ...
       * By something with fruit.
       */
      window.addEventListener('orientationchange', () => {
        recomputeDimensions();
      }, false);
    }

    this.on('resize', () => {
      this.main.resize();
    });
  }

  /**
   * Update the board values in the editor.
   */
  updateEditorValues() {
    if (!this.extras.IdeaBoardEditor || !this.main) {
      return;
    }

    this.extras.IdeaBoardEditor.updateValue(this.getEditorValue());
  }

  /**
   * Sanitize cards, removing invalid ones.
   */
  sanitizeCards() {
    this.params.board.cards = (this.params.board.cards ?? []).filter((card) => {
      if (!card.contentType?.library) {
        return false;
      }

      if (Object.keys(card.telemetry ?? {}).length !== TELEMETRY_PROPERTY_COUNT) {
        return false; // TODO: This could be nicer by checking for telemetry properties
      }

      return true;
    });
  }

  /**
   * Attach library to wrapper.
   * @param {H5P.jQuery} $wrapper Content's container.
   */
  attach($wrapper) {
    this.dom = $wrapper.get(0);

    this.dom.classList.add('h5p-idea-board');
    this.dom.appendChild(this.main.getDOM());

    // When in editor, using-mouse not set by H5P Core, so we set it manually
    if (H5PUtil.isEditor()) {
      this.dom.classList.add('using-mouse');
      this.dom.addEventListener('mousedown', () => {
        this.dom.classList.add('using-mouse');
      });
      this.dom.addEventListener('keydown', () => {
        this.dom.classList.remove('using-mouse');
      });
      this.dom.addEventListener('keyup', () => {
        this.dom.classList.remove('using-mouse');
      });
    }

    // Using same mechanism to determine base width as Course Presentation
    const domWidth = parseInt(this.dom.style.width) || 0;
    const domHeight = parseInt(this.dom.style.height) || 0;

    const baseWidth = (domWidth !== 0) ? domWidth : BASE_SIZE.width;
    const baseHeight = (domHeight !== 0) ? domHeight : BASE_SIZE.height;

    this.globals.set('baseSize', { width: baseWidth, height: baseHeight });
  }

  /**
   * Get task title.
   * @returns {string} Title.
   */
  getTitle() {
    // H5P Core function: createTitle
    return H5P.createTitle(
      this.extras?.metadata?.title || DEFAULT_DESCRIPTION
    );
  }

  /**
   * Get description.
   * @returns {string} Description.
   */
  getDescription() {
    return DEFAULT_DESCRIPTION;
  }

  /**
   * Handle fullscreen button clicked.
   */
  handleFullscreenClicked() {
    window.setTimeout(() => {
      this.toggleFullscreen();
    }, FULL_SCREEN_DELAY_LARGE_MS); // Some devices don't register user gesture before call to to requestFullscreen
  }

  /**
   * Toggle fullscreen button.
   * @param {string|boolean} state enter|false for enter, exit|true for exit.
   */
  toggleFullscreen(state) {
    if (!this.dom) {
      return;
    }

    switch (state) {
      case 'enter':
        state = false;
        break;

      case 'exit':
        state = true;
        break;

      default:
        state = typeof state === 'boolean' ? state : !H5P.isFullscreen;
    }

    if (state) {
      this.container = this.container || this.dom.closest('.h5p-container');
      if (this.container) {
        H5P.fullScreen(H5P.jQuery(this.container), this);
      }
    }
    else {
      H5P.exitFullScreen();
    }

    this.main.setFullscreen(state);
  }

  /**
   * Get current state.
   * @returns {object} Current state to be retrieved later.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-7}
   */
  getCurrentState() {
    return {
      main: this.main.getCurrentState()
    };
  }

  /**
   * Set background image.
   * @param {object} image Image object.
   */
  setBackgroundImage(image) {
    this.main.setBackgroundImage(image);
  }

  /**
   * Set background color.
   * @param {string} color CSS color value.
   */
  setBackgroundColor(color) {
    this.main.setBackgroundColor(color);
  }

  /**
   * Clear the board.
   */
  clearBoard() {
    this.main.clearBoard();
  }

  /**
   * Add text cards to the board.
   * @param {string[]} cardHTMLs Array of HTML strings representing text cards.
   */
  addTextCards(cardHTMLs) {
    this.main.addTextCards(cardHTMLs);
  }

  /**
   * Get current values for the editor.
   * @returns {object} Current editor values.
   */
  getEditorValue() {
    return this.main.getEditorValue();
  }
}
