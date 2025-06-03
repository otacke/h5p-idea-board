/**
 * Recursively updates paths in the params object.
 * @param {object} params The parameters object to update.
 * @param {function} handler Function to handle the path update.
 */
const recursiveUpdate = (params, handler) => {
  for (let prop in params) {
    if (params.hasOwnProperty(prop) && params[prop] instanceof Object) {
      var obj = params[prop];
      if (obj.path !== undefined && obj.mime !== undefined) {
        obj.path = handler(obj.path);
      }
      else {
        if (obj.library !== undefined && obj.subContentId !== undefined) {
          delete obj.subContentId;
        }
        recursiveUpdate(obj, handler);
      }
    }
  }
};

/**
 * Reimplementation of H5P.getClipboard to work outisde ot the editor.
 * It's a hack. The content that was pasted will break when the original content is deleted.
 * @returns {object|undefined} Clipboard data or undefined if not available.
 */
export const getH5PClipboard = () => {
  let clipboardData;
  try {
    clipboardData = localStorage.getItem('h5pClipboard');
  }
  catch (error) {
    // TODO
    console.warn('H5P Clipboard is not supported in this browser.');
    return;
  }

  if (!clipboardData) {
    return;
  }

  try {
    clipboardData = JSON.parse(clipboardData);
  }
  catch (error) {
    // TODO
    console.warn('H5P Clipboard data is not valid JSON.');
    return;
  }

  /**
   * Here's where the difference lies: H5P.getClipboard tries to determine the path based on
   * data from window.H5P.Editor that we do not have available in the view.
   */
  recursiveUpdate(clipboardData.specific, (path) => {
    const isTmpFile = path.endsWith('#tmp'); // Should always be false in the view.
    const isHttp = /^https?:\/\//i.test(path);
    const prefix = clipboardData.contentId ? `../${clipboardData.contentId}/` : '';

    if (!isTmpFile && clipboardData.contentId && !isHttp) {
      return path.startsWith(prefix) ? path : `${prefix}${path}`;
    }

    return path;
  });

  if (clipboardData.generic) {
    clipboardData.generic = clipboardData.specific[clipboardData.generic];
  }

  return clipboardData;
};

/**
 * Shape params to use more common libraries for copy&paste.
 * Use AdvancedText instead of EditableText and the subcontent type in EditableMedium.
 * @param {object} params Content type params.
 * @param {string[]} supportedSubcontentTypeUberNames List of supported subcontent type uber names.
 * @returns {object} Shaped params.
 */
export const shapeParamsForClipboard = (params, supportedSubcontentTypeUberNames) => {

  let mainParams = params.specific[params.generic];
  const library = mainParams.library;

  if (library.startsWith('H5P.EditableText ')) {
    const advancedTextUberName =
      supportedSubcontentTypeUberNames.filter((name) => name.startsWith('H5P.AdvancedText '))[0] || '';

    if (advancedTextUberName.length > 0) {
      params.specific[params.generic] = {
        library: advancedTextUberName,
        params: { text: mainParams.params.text }
      };
    }
  }
  else if (library.startsWith('H5P.EditableMedium ')) {
    params.specific[params.generic] = mainParams.params.contentType;
  }
  else {
    params.specific[params.generic];
  }

  return params;
};

export const shapeParamsFromClipboard = (params, supportedSubcontentTypeUberNames) => {
  let genericParams = params.generic;
  let specificParams = params.specific;

  const subContentUberName = genericParams.library;

  const contentType = {};

  if (subContentUberName.startsWith('H5P.AdvancedText ')) {
    const editableTextUberName =
      supportedSubcontentTypeUberNames.filter((name) => name.startsWith('H5P.EditableText '))[0] || '';
    if (editableTextUberName.length > 0) {
      contentType.library = editableTextUberName;
      contentType.params = { text: genericParams.params.text };
    }
  }
  else if (
    subContentUberName.startsWith('H5P.Audio ') ||
    subContentUberName.startsWith('H5P.Video ') ||
    subContentUberName.startsWith('H5P.Image ')
  ) {
    const editableMediumUberName =
      supportedSubcontentTypeUberNames.filter((name) => name.startsWith('H5P.EditableMedium '))[0] || '';

    contentType.library = editableMediumUberName;
    contentType.params = {
      contentType: genericParams
    };
  }

  if (Object.keys(contentType).length) {
    return {
      specific: specificParams,
      generic: contentType
    };
  }

  return {
    specific: specificParams,
    generic: genericParams
  };
};
