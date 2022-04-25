/**
 * gas-gocr2notion
 * @copyright (c) 2022 hankei6km
 * @license MIT
 * see "LICENSE.txt" "OPEN_SOURCE_LICENSES.txt" of "gas-gocr2notion.zip" in
 * releases(https://github.com/hankei6km/gas-gocr2html/releases)
 */

'use strict'

/**
 * Options for OCR processing.
 * @typedef {Object} OcrOpts
 * @property {string} scanFolderId - the id of folder that is contained scan files
 * @property {string} ocrFolderId - the id of folder that is contained ocr files
 * @property {string} ocrLanguage - A language hint for OCR processing during image import (ISO 639-1 code)
 * @property {Array<string>} [tags] - tag to set proty of page in notion
 * @property {boolean} [removeOcrFile] - remove ocr file
 */

/**
 * Options for send method.
 * @typedef {Object} FileItemsOpts
 * @property {string} database_id - the id of database that is stored results of ocr in notion
 * @property {Array<OcrOpts>} ocrOpts - ocr options
 */

/**
 * Proccess OCR to items then send texts to Notion
 *
 * @param {string} apiKey
 * @param {FileItemsOpts} opts
 * @param {Drive_v2.Drive.V2.Schema.FileList | Drive_v2.Drive.V2.Schema.ChangeList} list
 * @returns {void}
 */
function send(apiKey, opts, list) {
  return _entry_point_.GocrToNotion.send(apiKey, opts, list)
}

/**
 * Proccess OCR to recent created items that are contained scan folders
 * then send texts to Notion
 *
 * @param {string} apiKey
 * @param {FileItemsOpts} opts
 * @returns {void}
 */
function ocr(apiKey, opts) {
  return _entry_point_.GocrToNotion.ocr(apiKey, opts)
}
