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

/**
 * Get the reason why pasting is not possible.
 * @param {object} clipboard H5P clipboard data.
 * @param {object[]} supportedLibraries Supported libraries for the content type.
 * @returns {object} Reason and replaceable strings if applicable.
 */
export const getNoPasteReason = (clipboard, supportedLibraries) => {
  if (!clipboard || !clipboard.generic) {
    return {
      reason: 'pasteNoContent'
    };
  }

  if (!supportedLibraries || !Array.isArray(supportedLibraries)) {
    return {
      reason: 'pasteError'
    };
  }

  // Parse clipboard library info
  const [machineNameClipboard, versionClipboard] = clipboard.generic.library.split(' ');

  // Parse supported libraries
  const supportedVersions = supportedLibraries
    .filter((library) => library.uberName.split(' ')[0] === machineNameClipboard)
    .map((library) => {
      const [major, minor] = library.uberName.split(' ')[1].split('.').map(Number);
      return { major, minor };
    });

  if (supportedVersions.length === 0) {
    return {
      reason: 'pasteContentNotSupported'
    };
  }

  // Check for exact version match
  const [majorVersionClipboard, minorVersionClipboard] = versionClipboard.split('.').map(Number);
  const exactMatch = supportedVersions.some((version) =>
    version.major === majorVersionClipboard && version.minor === minorVersionClipboard
  );

  if (exactMatch) {
    return {
      reason: ''
    };
  }

  // Find min and max supported versions
  const maxVersion = supportedVersions.reduce((max, version) => {
    return (version.major > max.major || (version.major === max.major && version.minor > max.minor))
      ? version : max;
  }, { major: 0, minor: 0 });

  const minVersion = supportedVersions.reduce((min, version) => {
    return (version.major < min.major || (version.major === min.major && version.minor < min.minor))
      ? version : min;
  }, { major: Number.MAX_SAFE_INTEGER, minor: Number.MAX_SAFE_INTEGER });

  // Compare with clipboard version
  if (majorVersionClipboard > maxVersion.major ||
      (majorVersionClipboard === maxVersion.major && minorVersionClipboard > maxVersion.minor)) {
    return {
      reason: 'pasteTooNew',
      replace: {
        clip: versionClipboard,
        local: `${maxVersion.major}.${maxVersion.minor}`
      }
    };
  }

  if (majorVersionClipboard < minVersion.major ||
      (majorVersionClipboard === minVersion.major && minorVersionClipboard < minVersion.minor)) {
    return {
      reason: 'pasteTooOld',
      replace: {
        clip: versionClipboard,
        local: `${minVersion.major}.${minVersion.minor}`
      }
    };
  }

  return {
    reason: 'pasteError'
  };
};
