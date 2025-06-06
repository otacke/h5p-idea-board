import Board from '@components/board/board.js';
import OptionsDialog from '@components/options-dialog/options-dialog.js';
import Toolbar from '@components/toolbar/toolbar.js';
import Util from '@services/util.js';
import H5PUtil from '@services/utils-h5p.js';
import {
  getH5PClipboard, getNoPasteReason, shapeParamsForClipboard, shapeParamsFromClipboard
} from '@services/h5p-clipboard.js';
import './main.scss';

/** @constant {number} FULL_SCREEN_DELAY_SMALL_MS Time some browsers need to go to full screen. */
const FULL_SCREEN_DELAY_SMALL_MS = 50;

export default class Main {
  /**
   * @class
   * @param {object} params Parameters.
   * @param {object} callbacks Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      previousState: {}
    }, params);

    this.callbacks = Util.extend({
      onFullscreenClicked: () => {},
      updateEditorValues: () => {},
    }, callbacks);

    this.buildDOM();

    (params.previousState?.elements ?? []).forEach((element) => {
      let taintedMachineName = element.contentType?.library ?? '';
      if (taintedMachineName.startsWith('H5P.EditableMedium')) {
        const versionedSubContentMachineName = element.contentType?.params?.contentType?.library ?? '';
        taintedMachineName = `${taintedMachineName}/${versionedSubContentMachineName}`;
      }

      this.addElementToBoard(
        taintedMachineName,
        {
          id: element.id,
          telemetry: element.telemetry,
          contentType: element.contentType,
          cardBackgroundColor: element.cardSettings.cardBackgroundColor,
          cardBorderColor: element.cardSettings.cardBorderColor,
          cardRating: element.cardSettings.cardRating,
          cardCapabilities: element.cardCapabilities,
          previousState: element.previousState || {}
        }
      );
    });

    this.supportedSubcontentTypes = this.getSupportedSubcontentTypes();

    H5P.externalDispatcher.on('datainclipboard', (event) => {
      this.updatePasteButtonState(event.data);
    });

    this.updatePasteButtonState();
  }

  /**
   * Update the paste button state based on clipboard content.
   * @param {object} data Event data.
   */
  updatePasteButtonState(data = {}) {
    let canPaste = !data.reset;
    if (canPaste) {
      canPaste = this.canPasteFromClipboard();
    }

    // Using the format that H5PEditor.LibraryListCache.getLibraries would produce, required for canPastePlus.
    const supportedLibraries = this.supportedSubcontentTypes.map((uberName) => {
      return {
        uberName: uberName,
        name: uberName.split(' ')[0],
        majorVersion: (uberName.split(' ')[1]).split('.')[0],
        minorVersion: (uberName.split(' ')[1]).split('.')[1]
      };
    });

    const clipboard = H5PUtil.isEditor() ? H5P.getClipboard() : getH5PClipboard();

    if (canPaste) {
      this.toolbar.enableButton('paste');
      this.toolbar.setButtonAttributes('paste', { 'aria-label': this.params.dictionary.get('a11y.pasteContent') });
    }
    else {
      this.toolbar.disableButton('paste');

      let noPasteReason = '';
      if (H5PUtil.isEditor()) {
        noPasteReason = H5PEditor.canPastePlus(clipboard, supportedLibraries).description;
      }
      else {
        const noPasteReasonObject = getNoPasteReason(clipboard, supportedLibraries, this.params.dictionary);
        noPasteReason = this.params.dictionary.get(`a11y.${noPasteReasonObject.reason}`);
        Object.keys(noPasteReasonObject.replace || {}).forEach((key) => {
          noPasteReason = noPasteReason.replace(`@${key}`, noPasteReasonObject.replace[key]);
        });
      }
      noPasteReason = noPasteReason || this.params.dictionary.get('a11y.pasteContentDisabled');
      this.toolbar.setButtonAttributes('paste', { 'aria-label': noPasteReason });
    }
  }

  /**
   * Get all supported subcontent types.
   * @returns {string[]} Array of supported uber names.
   */
  getSupportedSubcontentTypes() {
    const subcontentUberNames = Array.from(
      new Set(H5PUtil.semanticsFieldSelectorAll({ type: 'library' }).flatMap((field) => field.options || []))
    );

    const subsubcontentUberNames = ['H5P.AdvancedText', 'H5P.Image', 'H5P.Audio', 'H5P.Video']
      .map((machineName) => {
        const libraryVersion = H5PUtil.getLibraryVersion(machineName);
        return libraryVersion ? `${machineName} ${libraryVersion}` : null;
      })
      .filter(Boolean);

    return [...subcontentUberNames, ...subsubcontentUberNames];
  }

  /**
   * Check if content type is supported.
   * @param {string} uberName Library uber name to be checked.
   * @returns {boolean} True if content type is supported, false otherwise.
   */
  isSupportedContentType(uberName) {
    return this.supportedSubcontentTypes.includes(uberName);
  }

  /**
   * Check if clipboard content can be pasted.
   * @returns {boolean} True if clipboard content can be pasted, false otherwise.
   */
  canPasteFromClipboard() {
    const clipboard = H5PUtil.isEditor() ? H5P.getClipboard() : getH5PClipboard();

    if (!clipboard) {
      return false;
    }

    const machineName = H5PUtil.getUberName().split(' ').shift();
    if (
      clipboard.from === machineName && (!clipboard.generic || this.isSupportedContentType(clipboard.generic.library))
    ) {
      return true;
    }
    else if (clipboard.generic && this.isSupportedContentType(clipboard.generic.library)) {
      return true;
    }

    return false;
  }

  /**
   * Get DOM element.
   * @returns {HTMLElement} The main DOM element.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Build the main DOM structure.
   */
  buildDOM() {
    this.dom = document.createElement('main');
    this.dom.classList.add('h5p-idea-board-main');

    this.buildToolbar();

    this.board = new Board(
      {
        globals: this.params.globals,
        dictionary: this.params.dictionary,
      },
      {
        onClick: (versionedMachineName, telemetry) => {
          this.addElementToBoard(versionedMachineName, { telemetry });
        },
        onDrop: (versionedMachineName, telemetry) => {
          this.addElementToBoard(versionedMachineName, { telemetry });
        },
        onCardCopied: (params = {}) => {
          this.handleCardCopied(params);
        },
        onCardDeleted: (params = {}) => {
          this.handleCardDeleted(params);
        },
        openEditorDialog: async (id, params, callbacks) => {
          this.openEditorDialog(id, params, callbacks);
        },
        onUpdated: (params = {}) => {
          this.updateSubcontentFields(params);
        }
      }
    );
    this.dom.append(this.board.getDOM());

    this.optionsDialog = new OptionsDialog(
      {
        globals: this.params.globals,
        dictionary: this.params.dictionary,
      }
    );
    this.dom.append(this.optionsDialog.getDOM());

    /*
     * It's important to not simply append the dialog to the document.body, or
     * the dialog will not be shown when the user is in fullscreen mode and the
     * content is embedded.
     */
    this.dom.append(this.params.globals.get('ConfirmationDialog').getDOM());

    document.addEventListener('keydown', (event) => {
      this.handleKeyDown(event);
    });
  }

  /**
   * Update subcontent fields in the editor.
   * Without this, the HTML field widget would call setValue on saving and overwrite the changes
   * made in the editor. Alternatively, we could skip validation of the IdeaBoard editor widget which
   * triggers all children to validate and thus call setValue.
   * @param {object} params Parameters containing index and contentTypeParams.
   */
  updateSubcontentFields(params = {}) {
    if (!H5PUtil.isEditor()) {
      return;
    }

    if (typeof params.index !== 'number') {
      return;
    }

    const groupInstance = this.params.globals.get('editor').getCardsListGroupInstance(params.index);
    const textInputField = H5PEditor.findField('contentType/text', groupInstance);
    if (textInputField?.$input) {
      textInputField.$input[0].innerHTML = params.contentTypeParams.params.text;
      textInputField.$input[0].dispatchEvent(new Event('input'));
    }

    this.callbacks.updateEditorValues();
  }

  /**
   * Handle keyboard events.
   * @param {KeyboardEvent} event Keyboard event.
   */
  handleKeyDown(event) {
    const isControlPressed = event.ctrlKey || event.metaKey;
    if (!isControlPressed) {
      return;
    }

    if (event.key !== 'v') {
      return; // Only handle paste events
    }

    const isWithinIdeaBoard = event.target.closest('.h5p-idea-board-main') !== null;
    const isFromSubContent = event.target.closest('.h5p-idea-board-card-exercise') !== null;
    if (isFromSubContent || !isWithinIdeaBoard) {
      return;
    }

    this.pasteContentFromClipboard();
  }

  /**
   * Build the toolbar.
   */
  buildToolbar() {
    const globalParams = this.params.globals.get('params');
    const toolbarButtons = [];

    let allowedContentTypes = [];
    if (H5PUtil.isEditor()) {
      const addableTypes = H5PUtil.semanticsFieldSelector({ name: 'addableTypes' });
      if (!addableTypes?.fields) {
        throw new Error('No addableTypes found in semantics');
      }

      allowedContentTypes = addableTypes.fields.map((field) => field.name.replace('addableType', '').toLowerCase());
    }
    else {
      if (globalParams.behaviour.userCanAddCards || H5PUtil.isEditor()) {
        Object.keys(globalParams.behaviour.addableTypes).forEach((key) => {
          if (globalParams.behaviour.addableTypes[key] === true || H5PUtil.isEditor()) {
            allowedContentTypes.push(key.replace('addableType', '').toLowerCase());
          }
        });
      }
    }

    const contentTypeField = H5PUtil.semanticsFieldSelector({ name: 'contentType' });
    const versionedMachineNames = (contentTypeField?.options ?? []);

    versionedMachineNames.forEach((versionedMachineName) => {
      const machineName = versionedMachineName.split(' ').shift();

      const contentTypeName = (machineName === 'H5P.EditableText') ?
        'Text' :
        machineName.split('.').pop().toLowerCase();

      if (machineName !== 'H5P.EditableMedium' && allowedContentTypes.includes('text')) {
        toolbarButtons.push({
          id: contentTypeName,
          versionedMachineName: versionedMachineName,
          type: 'pulse',
          props: [{ draggable: true }],
          pulseStates: [
            {
              id: contentTypeName,
              label: this.params.dictionary.get('a11y.addContentType').replace('@contentType', contentTypeName)
            }
          ],
          onClick: () => {
            this.addElementToBoard(versionedMachineName);
          }
        });
      }
      else {
        ['H5P.Image', 'H5P.Audio', 'H5P.Video'].forEach((machineName) => {
          if (
            machineName === 'H5P.Image' && !allowedContentTypes.includes('image') ||
            machineName === 'H5P.Audio' && !allowedContentTypes.includes('audio') ||
            machineName === 'H5P.Video' && !allowedContentTypes.includes('video')
          ) {
            return;
          }

          const loadedLibraryVersion = H5PUtil.getLibraryVersion(machineName);
          const subcontentMachineName = `${machineName} ${loadedLibraryVersion}`;
          const type = machineName.split('.').pop();

          toolbarButtons.push({
            id: type.toLowerCase(),
            versionedMachineName: `${versionedMachineName}/${subcontentMachineName}`,
            type: 'pulse',
            props: [{ draggable: true }],
            pulseStates: [
              {
                id: type.toLowerCase(),
                label: this.params.dictionary.get('a11y.addContentType').replace('@contentType', type)
              }
            ],
            onClick: () => {
              this.addElementToBoard(`${versionedMachineName}/${subcontentMachineName}`);
            }
          });
        });
      }
    });

    toolbarButtons.push({
      id: 'paste',
      type: 'pulse',
      pulseStates: [
        {
          id: 'paste',
          label: this.params.dictionary.get('a11y.pasteContent'),
        }
      ],
      a11y: {
        disabled: this.params.dictionary.get('a11y.pasteContentDisabled')
      },
      onClick: () => {
        this.pasteContentFromClipboard();
      }
    });

    if (this.params.globals.get('isFullscreenSupported')) {
      toolbarButtons.push({
        id: 'fullscreen',
        type: 'pulse',
        pulseStates: [
          {
            id: 'enter-fullscreen',
            label: this.params.dictionary.get('a11y.enterFullscreen')
          },
          {
            id: 'exit-fullscreen',
            label: this.params.dictionary.get('a11y.exitFullscreen')
          }
        ],
        onClick: () => {
          this.callbacks.onFullscreenClicked();
        }
      });
    }

    this.toolbar = new Toolbar({
      ...(globalParams.headline && { headline: globalParams.headline }),
      dictionary: this.params.dictionary,
      buttons: toolbarButtons
    });
    this.dom.append(this.toolbar.getDOM());
  }

  /**
   * Add an element to the board.
   * @param {string} taintedMachineName Machine name of the content type (possibly tainted).
   * @param {object} params Element parameters.
   */
  addElementToBoard(taintedMachineName, params = {}) {
    const [ versionedMachineName, versionedSubContentMachineName ] = taintedMachineName.split('/');

    if (!versionedSubContentMachineName) {
      const contentType = params.contentType ?? {
        library: versionedMachineName,
        params: {},
      };

      contentType.metadata = contentType.metadata || {};
      contentType.metadata.defaultLanguage = this.params.globals.get('defaultLanguage');

      this.board.addElement({
        id: params.id ?? H5P.createUUID(),
        telemetry: params.telemetry,
        cardBackgroundColor: params.cardBackgroundColor,
        cardBorderColor: params.cardBorderColor,
        cardRating: params.cardRating,
        cardCapabilities: params.cardCapabilities || {},
        contentType: contentType,
        previousState: params.previousState || {}
      });

      this.callbacks.updateEditorValues();

      return;
    }

    const contentType = params.contentType ?? {
      library: versionedMachineName,
      params: {
        contentType: {
          library: versionedSubContentMachineName,
          params: {}
        }
      }
    };

    contentType.metadata = contentType.metadata || {};
    contentType.metadata.defaultLanguage = this.params.globals.get('defaultLanguage');


    const machineName = versionedMachineName.split(' ')[0];
    if (machineName === 'H5P.EditableMedium') {
      contentType.params.behaviour = contentType.params.behaviour || {};
      contentType.params.behaviour.delegateEditorDialog = true;
    }

    this.board.addElement({
      id: params.id ?? H5P.createUUID(),
      telemetry: params.telemetry,
      cardBackgroundColor: params.cardBackgroundColor,
      cardBorderColor: params.cardBorderColor,
      cardRating: params.cardRating,
      cardCapabilities: params.cardCapabilities,
      contentType: contentType,
      previousState: params.previousState || {}
    });

    this.callbacks.updateEditorValues();
  }

  /**
   * Set fullscreen mode.
   * @param {boolean} shouldBeFullscreen Whether to enter or exit fullscreen.
   */
  setFullscreen(shouldBeFullscreen) {
    const style = window.getComputedStyle(this.dom);
    const marginHorizontal = parseFloat(style.getPropertyValue('margin-left')) +
      parseFloat(style.getPropertyValue('margin-right'));

    const marginVertical = parseFloat(style.getPropertyValue('margin-top')) +
      parseFloat(style.getPropertyValue('margin-bottom'));

    window.setTimeout(() => {
      this.board.setFullscreen(shouldBeFullscreen, {
        width: window.innerWidth - marginHorizontal,
        height: window.innerHeight - marginVertical - this.toolbar.getFullHeight()
      });

      this.params.globals.get('mainInstance').trigger('resize');
    }, FULL_SCREEN_DELAY_SMALL_MS);
  }

  /**
   * Get current state for resume support.
   * @returns {object} Current state.
   */
  getCurrentState() {
    return {
      elements: this.board.getElementsParams(),
    };
  }

  /**
   * Paste content from clipboard.
   */
  pasteContentFromClipboard() {
    if (!this.canPasteFromClipboard()) {
      return;
    }

    const clipboard = H5PUtil.isEditor() ? H5P.getClipboard() : getH5PClipboard();
    const shapedParams = shapeParamsFromClipboard(clipboard, this.supportedSubcontentTypes);
    delete shapedParams.specific.contentType;
    delete shapedParams.specific.telemetry?.x;
    delete shapedParams.specific.telemetry?.y;

    let taintedMachineName = shapedParams.generic.library ?? '';
    if (taintedMachineName.startsWith('H5P.EditableMedium ')) {
      const versionedSubContentMachineName = shapedParams.generic?.params?.contentType?.library ?? '';
      taintedMachineName = `${taintedMachineName}/${versionedSubContentMachineName}`;
    }

    this.addElementToBoard(
      taintedMachineName,
      { ...shapedParams.specific, contentType: shapedParams.generic }
    );
  }

  /**
   * Handle card copied event.
   * @param {object} params Card parameters.
   */
  handleCardCopied(params = {}) {
    const clipboardData = {
      contentId: this.params.globals.get('contentId'),
      from: H5PUtil.getUberName().split(' ').shift(),
      generic: 'contentType',
    };

    Object.keys(params).forEach((key) => {
      if (['cardBackgroundColor', 'cardBorderColor', 'cardRating', 'cardCapabilities', 'telemetry'].includes(key)) {
        clipboardData[key] = params[key];
      }
    });

    clipboardData.specific = params;

    const reshapedParams = shapeParamsForClipboard(clipboardData, this.supportedSubcontentTypes);
    H5P.setClipboard(reshapedParams);
  }

  /**
   * Handle card deleted event.
   * @param {object} params Parameters.
   * @param {HTMLElement} [params.focusDOM] DOM element to focus after deletion.
   */
  handleCardDeleted(params = {}) {
    if (params.focusDOM) {
      params.focusDOM.focus();
    }
    else {
      this.toolbar.focus();
    }

    this.callbacks.updateEditorValues();
  }

  /**
   * Open editor dialog for a card.
   * @param {string} id Card ID.
   * @param {object} params Card parameters.
   * @param {object} callbacks Callbacks for dialog.
   */
  async openEditorDialog(id, params, callbacks) {
    const cardsParams = this.board.getElementsParams();
    const cardParams = cardsParams.find((card) => card.id === id);

    if (H5PUtil.isEditor()) {
      // Override text background color to transparent
      if (params.versionedName.startsWith('H5P.EditableText ')) {
        params.params.backgroundColor = 'rgba(255, 255, 255, 0)';
      }

      const contentFormDOM = document.createElement('div');
      contentFormDOM.classList.add('h5p-idea-board-content-form');

      const index = cardsParams.findIndex((card) => card.id === id);
      const groupInstance = this.params.globals.get('editor').getCardsListGroupInstance(index);

      groupInstance.params.contentType.library = params.versionedName;
      groupInstance.params.contentType.params = params.params;
      groupInstance.params.id = cardParams.id;
      groupInstance.params.telemetry = cardParams.telemetry;
      groupInstance.params.cardSettings = cardParams.cardSettings || {};
      groupInstance.params.cardCapabilities = cardParams.cardCapabilities;

      H5PEditor.processSemanticsChunk(
        groupInstance.field.fields,
        groupInstance.params,
        H5P.jQuery(contentFormDOM),
        groupInstance,
      );

      this.optionsDialog.setEditorForm({
        fields: groupInstance.field.fields,
        values: groupInstance.params,
        formDOM: contentFormDOM,
        parent: groupInstance,
      });
    }
    else {
      this.semantics = this.semantics ??
        await H5PUtil.getTranslatedSemantics(this.params.globals.get('defaultLanguage'));

      const contentTypeField = {
        name: 'contentType',
        type: 'group',
        label: params.title,
        importance: 'high',
        expanded: true,
        description: this.params.dictionary.get('l10n.contentTypeDescription'),
        fields: [ ...params.fields ]
      };

      // Remove background color field if it exists
      contentTypeField.fields = contentTypeField.fields.filter((field) => field.name !== 'backgroundColor');

      const cardSettingsField = {
        name: 'cardSettings',
        type: 'group',
        label: this.params.dictionary.get('l10n.cardSettings'),
        description: this.params.dictionary.get('l10n.contentTypeDescription'),
        fields: [
          H5PUtil.semanticsFieldSelector({ name: 'cardBackgroundColor' }, this.semantics),
          H5PUtil.semanticsFieldSelector({ name: 'cardBorderColor' }, this.semantics)
        ]
      };

      if (cardParams.cardCapabilities.canUserRateCard) {
        const field = H5PUtil.semanticsFieldSelector({ name: 'cardRating' }, this.semantics);
        delete field.widget; // showWhen
        cardSettingsField.fields.push(field);
      }

      const fields = [
        contentTypeField,
        cardSettingsField
      ];

      const values = {
        contentType: { ...params.values },
        cardSettings: {
          cardBackgroundColor: cardParams.cardSettings.cardBackgroundColor,
          cardBorderColor: cardParams.cardSettings.cardBorderColor,
        }
      };

      // Override text background color to transparent
      values.contentType.backgroundColor = 'rgba(255, 255, 255, 0)';

      if (cardParams.cardCapabilities.canUserRateCard) {
        values.cardSettings.cardRating = cardParams.cardSettings.cardRating;
      }

      this.optionsDialog.setCustomForm(fields, values);
    }

    this.optionsDialog.setCallback('onSaved', (values) => {
      this.handleOptionsDialogSave(values, id, callbacks);
    });

    this.optionsDialog.show();
  }

  /**
   * Set background image.
   * @param {object} image Image object.
   */
  setBackgroundImage(image) {
    this.board.setBackgroundImage(image);
    this.callbacks.updateEditorValues();
  }

  /**
   * Set background color.
   * @param {string} color CSS color value.
   */
  setBackgroundColor(color) {
    this.board.setBackgroundColor(color);
    this.callbacks.updateEditorValues();
  }

  /**
   * Handle options dialog save event.
   * @param {object[]} values Values from the dialog.
   * @param {string} id Card ID.
   * @param {object} callbacks Callbacks for handling saved values.
   */
  handleOptionsDialogSave(values, id, callbacks) {
    const cards = this.board.getCards();
    const card = cards.find((card) => card.getId() === id);

    const cardSettings = values.find((field) => field.name === 'cardSettings')?.value;

    const cardBackgroundColor = cardSettings.find((field) => field.name === 'cardBackgroundColor').value;
    card.setBackgroundColor(cardBackgroundColor);

    const cardBorderColor = cardSettings.find((field) => field.name === 'cardBorderColor').value;
    card.setBorderColor(cardBorderColor);

    const cardRating = parseFloat(cardSettings.find((field) => field.name === 'cardRating')?.value);
    if (typeof cardRating === 'number' && !isNaN(cardRating)) {
      card.setRating(cardRating);
    }

    const cardCapabilities = values.find((field) => field.name === 'cardCapabilities')?.value;
    card.setCapabilities(cardCapabilities);

    const contentTypeValues = values.find((field) => field.name === 'contentType')?.value;
    card.setContentTypeValues(contentTypeValues);

    // Sending back to subcontent type
    callbacks.setValues(contentTypeValues, H5PUtil.isEditor());

    // Store for parent content type
    this.callbacks.updateEditorValues();
  }

  /**
   * Get editor values.
   * @returns {object} Editor values.
   */
  getEditorValue() {
    return this.board.getEditorValue();
  }

  /**
   * Handle resize events.
   */
  resize() {
    this.optionsDialog.resize();
  }

  /**
   * Clear the board.
   */
  clearBoard() {
    this.board.removeAllElements();
  }

  /**
   * Compute position and size telemetry data for multiple cards.
   * @param {number} numberOfCards Number of cards to position.
   * @returns {object[]} Array of telemetry objects with x, y, width, and height.
   */
  computeTelemetries(numberOfCards) {
    if (numberOfCards === 0) {
      return [];
    }

    const layout = this.calculateLayout(numberOfCards);
    const telemetries = [];

    for (let index = 0; index < numberOfCards; index++) {
      const column = index % layout.columns;
      const row = Math.floor(index / layout.columns);

      telemetries.push({
        x: (column + 1) * layout.gapX + column * layout.cardWidth,
        y: (row + 1) * layout.gapY + row * layout.cardHeight,
        width: layout.cardWidth,
        height: layout.cardHeight
      });
    }

    return telemetries;
  }

  /**
   * Calculate layout parameters for positioning cards.
   * @param {number} numberOfCards Number of cards to position.
   * @returns {object} Layout parameters.
   */
  calculateLayout(numberOfCards) {
    const constraints = {
      baseGapX: 5,
      baseGapY: 5,
      maxCardWidth: 33,
      maxCardHeight: 33
    };

    const columns = Math.ceil(Math.sqrt(numberOfCards));
    const rows = Math.ceil(numberOfCards / columns);

    let gapX = constraints.baseGapX;
    let gapY = constraints.baseGapY;

    // Calculate card dimensions based on available space
    let cardWidth = (100 - (columns + 1) * gapX) / columns;
    let cardHeight = (100 - (rows + 1) * gapY) / rows;

    // Adjust if card width exceeds maximum to center card(s)
    if (cardWidth > constraints.maxCardWidth) {
      cardWidth = constraints.maxCardWidth;
      gapX = (100 - columns * cardWidth) / (columns + 1);
    }

    // Adjust if card height exceeds maximum to center card(s)
    if (cardHeight > constraints.maxCardHeight) {
      cardHeight = constraints.maxCardHeight;
      gapY = (100 - rows * cardHeight) / (rows + 1);
    }

    return { columns, rows, gapX, gapY, cardWidth, cardHeight };
  }

  /**
   * Add text cards to the board.
   * @param {string[]} cardHTMLs Array of HTML strings representing text cards.
   */
  addTextCards(cardHTMLs = []) {
    if (cardHTMLs.length === 0) {
      return; // Nothing to add
    }

    const editableTextUbername = this.supportedSubcontentTypes.find((name) => name.startsWith('H5P.EditableText '));
    if (!editableTextUbername) {
      return;
    }

    let telemetries = this.computeTelemetries(cardHTMLs.length);

    cardHTMLs.forEach((cardHTML, index) => {
      this.addElementToBoard(editableTextUbername, { telemetry: telemetries[index] });

      const card = this.board.getCards()[this.board.getCards().length - 1];
      card.setContentTypeValues([{ name: 'text', value: cardHTML }]);
      // Should we access updateParams directly or have a way to learn about the right functon to call?
      card.getExerciseInstance().updateParams([{ name: 'text', value: cardHTML }]);

      this.callbacks.updateEditorValues();
    });
  }
}
