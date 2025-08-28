import Util from '@services/util.js';
import semantics from '@root/semantics.json';
import libraryJson from '@root/library.json';

/** Class for h5p related utility functions */
export default class H5PUtil {
  /**
   * Get default values from semantics fields.
   * @param {object[]} start Start semantics field.
   * @returns {object} Default values from semantics.
   */
  static getSemanticsDefaults(start = semantics) {
    let defaults = {};

    if (!Array.isArray(start)) {
      return defaults; // Must be array, root or list
    }

    start.forEach((entry) => {
      if (typeof entry.name !== 'string') {
        return;
      }

      if (typeof entry.default !== 'undefined') {
        defaults[entry.name] = entry.default;
      }

      if (entry.type === 'list') {
        defaults[entry.name] = []; // Does not set defaults within list items!
      }
      else if (entry.type === 'group' && entry.fields) {
        const groupDefaults = H5PUtil.getSemanticsDefaults(entry.fields);
        if (Object.keys(groupDefaults).length) {
          defaults[entry.name] = groupDefaults;
        }
      }
    });

    return defaults;
  }

  /**
   * Find a semantics field by its selectors. Will only return the first match just like querySelector.
   * @param {object} selectors Selectors to match against semantics fields.
   * @param {object} [semanticsStructure] Semantics structure to search in.
   * @returns {object|null} The matching semantics field or null if not found.
   */
  static semanticsFieldSelector(selectors = {}, semanticsStructure = semantics) {
    if (!semanticsStructure || !Object.keys(selectors).length) {
      return null;
    }

    const stack = [semanticsStructure];

    while (stack.length) {
      const current = stack.pop();

      if (Array.isArray(current)) {
        for (let i = current.length - 1; i >= 0; i--) {
          stack.push(current[i]);
        }
        continue;
      }

      if (Object.keys(selectors).every((key) => current[key] === selectors[key])) {
        return current;
      }

      if (current.field) {
        stack.push(current.field);
      }
      if (current.fields) {
        stack.push(current.fields);
      }
    }

    return null;
  }

  /**
   * Find all semantics fields by their selectors. Returns all matches as an array.
   * @param {object} selectors Selectors to match against semantics fields.
   * @param {object} [semanticsStructure] Semantics structure to search in.
   * @returns {object[]} Array of matching semantics fields.
   */
  static semanticsFieldSelectorAll(selectors = {}, semanticsStructure = semantics) {
    const matches = [];
    if (!semanticsStructure || !Object.keys(selectors).length) {
      return matches;
    }

    const search = (structure) => {
      if (Array.isArray(structure)) {
        structure.forEach(search);
        return;
      }
      if (Object.keys(selectors).every((key) => structure[key] === selectors[key])) {
        matches.push(structure);
      }
      if (structure.field) {
        search(structure.field);
      }
      if (structure.fields) {
        search(structure.fields);
      }
    };

    search(semanticsStructure);
    return matches;
  }

  /**
   * Get semantics structure.
   * @returns {object} Semantics structure.
   */
  static getSemantics() {
    return semantics;
  }

  /**
   * Get a translated version of semantics if available.
   * @param {string} languageCode Language code.
   * @returns {object} Translated semantics structure.
   */
  static async getTranslatedSemantics(languageCode) {
    if (!languageCode || languageCode === 'en') {
      return semantics;
    }

    const translation = await H5PUtil.getTranslation(languageCode);

    if (!translation?.semantics) {
      return semantics;
    }

    return Util.mergeDeep(semantics, translation.semantics);
  }

  /**
   * Get library version for an H5P machine name.
   * @param {string} machineName Machine name of the library.
   * @returns {string} Version of the library as major.minor or empty string if not found.
   */
  static getLibraryVersion(machineName) {
    if (!machineName) {
      return '';
    }

    const dependencies = [
      ...H5PUtil.getDependencies(),
      // Fallback. We could probably come up with a way to fetch these from the dependencies recursively.
      'H5P.AdvancedText 1.1',
      'H5P.Image 1.1',
      'H5P.Video 1.6',
      'H5P.Audio 1.5',
    ];

    /*
     * H5P.getLibraryPath would return the URL to the dependencies folder,
     * we could fetch library.json and extract the version information from there. Fetching would
     * need to be asynchronous though.
     */

    return dependencies.find((dep) => dep.startsWith(machineName))?.split(' ').pop() || '';
  }

  /**
   * Get all dependencies for the library.
   * @returns {object[]} List of dependency machine names.
   */
  static getDependencies() {
    const dependencies = [
      ...(libraryJson?.preloadedDependencies ?? []),
      ...(libraryJson?.editorDependencies ?? [])
    ];
    return dependencies.map((dep) => `${dep.machineName} ${dep.majorVersion}.${dep.minorVersion}`);
  }

  /**
   * Get the Uber name of the library without spaces.
   * @returns {string} Uber name of the content type.
   */
  static getUberNameNoSpaces() {
    return `${libraryJson.machineName}-${libraryJson.majorVersion}.${libraryJson.minorVersion}`;
  }

  /**
   * Get the Uber name of the library.
   * @returns {string} Uber name of the content type.
   */
  static getUberName() {
    return `${libraryJson.machineName} ${libraryJson.majorVersion}.${libraryJson.minorVersion}`;
  }

  /**
   * Get translation file contents for a given language code.
   * @param {string} [languageCode] Language code.
   * @returns {Promise<object>} Translation object or undefined if not found.
   */
  static async getTranslation(languageCode = 'en') {
    const libraryPath = H5P.getLibraryPath(H5PUtil.getUberNameNoSpaces());
    const languagePath = `${libraryPath}/language/${languageCode}.json`;

    try {
      const response = await fetch(languagePath);
      if (!response.ok) {
        return;
      }

      const translation = await response.json();
      return translation;
    }
    catch (error) {
      return;
    }
  }

  /**
   * Determine whether the H5P editor is being used.
   * @returns {boolean} True if the H5P editor is being used, false otherwise.
   */
  static isEditor() {
    return window.H5PEditor !== undefined;
  }
}
