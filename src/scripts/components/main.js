import Board from '@components/board/board.js';
import OptionsDialog from '@components/options-dialog/options-dialog.js';
import Toolbar from '@components/toolbar/toolbar.js';
import Util from '@services/util.js';
import H5PUtil from '@services/utils-h5p.js';
import semantics from '@root/semantics.json';
import './main.scss';

/** @constant {number} FULL_SCREEN_DELAY_SMALL_MS Time some browsers need to go to full screen. */
const FULL_SCREEN_DELAY_SMALL_MS = 50;

export default class Main {

  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      previousState: {}
    }, params);

    this.callbacks = Util.extend({
      onFullscreenClicked: () => {}
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
          cardBackgroundColor: element.cardBackgroundColor,
          cardBorderColor: element.cardBorderColor,
          previousState: element.previousState || {}
        }
      );
    });
  }

  getDOM() {
    return this.dom;
  }

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
        onCardDeleted: (params = {}) => {
          this.handleCardDeleted(params);
        },
        openEditorDialog: (id, params, callbacks) => {
          const fields = [
            ...params.fields,
            H5PUtil.findSemanticsField('cardBackgroundColor', semantics),
            H5PUtil.findSemanticsField('cardBorderColor', semantics),
          ];

          const cardsParams = this.board.getElementsParams();
          const cardParams = cardsParams.find((card) => card.id === id);

          const values = {
            ...params.values,
            cardBackgroundColor: cardParams.cardBackgroundColor,
            cardBorderColor: cardParams.cardBorderColor,
          };

          this.optionsDialog.setCallback('onSaved', (values) => {
            const cards = this.board.getCards();
            const card = cards.find((card) => card.getId() === id);

            const cardBackgroundColor = values.find((field) => field.name === 'cardBackgroundColor').value;
            const cardBorderColor = values.find((field) => field.name === 'cardBorderColor').value;

            values = values.filter((field) => field.name !== 'cardBackgroundColor' && field.name !== 'cardBorderColor');

            card.setBackgroundColor(cardBackgroundColor);
            card.setBorderColor(cardBorderColor);

            callbacks.setValues(values);
          });
          this.optionsDialog.setTitle(params.title);
          this.optionsDialog.setFields(fields, values);
          this.optionsDialog.show();
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
  }

  buildToolbar() {
    const globalParams = this.params.globals.get('params');
    const toolbarButtons = [];

    const contentTypeField = H5PUtil.findSemanticsField('contentType');
    const versionedMachineNames = (contentTypeField?.options ?? []);

    versionedMachineNames.forEach((versionedMachineName) => {
      const machineName = versionedMachineName.split(' ').shift();

      const contentTypeName = (machineName === 'H5P.EditableText') ?
        'Text' :
        machineName.split('.').pop().toLowerCase();

      if (machineName !== 'H5P.EditableMedium') {
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

  addElementToBoard(taintedMachineName, params = {}) {
    const [ versionedMachineName, versionedSubContentMachineName ] = taintedMachineName.split('/');

    if (!versionedSubContentMachineName) {
      const contentType = params.contentType ?? {
        library: versionedMachineName,
        params: {}
      };

      this.board.addElement({
        id: params.id ?? H5P.createUUID(),
        telemetry: params.telemetry,
        cardBackgroundColor: params.cardBackgroundColor,
        cardBorderColor: params.cardBorderColor,
        contentType: contentType,
        previousState: params.previousState || {}
      });

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
      contentType: contentType,
      previousState: params.previousState || {}
    });
  }

  setFullscreen(isFullscreen) {
    const style = window.getComputedStyle(this.dom);
    const marginHorizontal = parseFloat(style.getPropertyValue('margin-left')) +
      parseFloat(style.getPropertyValue('margin-right'));

    const marginVertical = parseFloat(style.getPropertyValue('margin-top')) +
      parseFloat(style.getPropertyValue('margin-bottom'));

    window.setTimeout(() => {
      this.board.setFullscreen(isFullscreen, {
        width: window.innerWidth - marginHorizontal,
        height: window.innerHeight - marginVertical - this.toolbar.getFullHeight()
      });

      this.params.globals.get('mainInstance').trigger('resize');
    }, FULL_SCREEN_DELAY_SMALL_MS);
  }

  getCurrentState() {
    return {
      elements: this.board.getElementsParams(),
    };
  }

  handleCardDeleted(params = {}) {
    if (params.focusDOM) {
      params.focusDOM.focus();
    }
    else {
      this.toolbar.focus();
    }
  }
}
