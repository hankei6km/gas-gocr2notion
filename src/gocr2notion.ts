import {
  CreatePageParameters,
  UpdatePageParameters
} from '@notionhq/client/build/src/api-endpoints'
import { createPage, retriveDatabase } from './notion.js'
import {
  genCreatePageParameters,
  thumbParamTeransFormer as _thumbParamTeransFormer
} from './params.js'
import { normalizeItems, OcrResutls, pickScanFiles } from './util.js'

export namespace GocrToNotion {
  export type FilterMimeTypeTransformerOpts = {
    ignoreTypes: string[]
  }
  export type FileTransfomer = (
    ite: Generator<[FileItem, GoogleAppsScript.Drive.Schema.File]>
  ) => Generator<[FileItem, GoogleAppsScript.Drive.Schema.File]>

  export type ParamsCmdCreate = {
    cmd: 'create'
    param: CreatePageParameters
  }
  export type ParamsCmdUpdate = {
    cmd: 'update'
    param: UpdatePageParameters
  }
  export type ParamsCmdDelete = {
    cmd: 'delete'
    param: UpdatePageParameters
  }
  export type ParamsCmd = ParamsCmdCreate | ParamsCmdUpdate | ParamsCmdDelete
  export type ParamTransfomer = (
    ite: Generator<[ParamsCmd, FileItem, GoogleAppsScript.Drive.Schema.File]>
  ) => Generator<[ParamsCmd, FileItem, GoogleAppsScript.Drive.Schema.File]>

  export type OcrOpts = {
    scanFolderId: string
    ocrFolderId: string
    ocrLanguage: string
    tags?: string[]
    removeOcrFile?: boolean
  }

  export type FileItemsOpts = {
    database_id: string
    ocrOpts: OcrOpts[]
    fileTransfomers?: FileTransfomer[]
    paramTransfomers?: ParamTransfomer[]
  }

  export type FileItem = {
    fileObj: GoogleAppsScript.Drive.File
    guid: string
    mimeType: string
    type: string
    excerpt: string
    description: string
    link: string
    modified: string
    thumbnailLink?: string | undefined
    text: string
    ocrOpt?: OcrOpts
  }

  // export type StoredItems = Record<string, { page_id: string; use: boolean }>

  /**
   * Proccess OCR to items then send texts to Notion
   *
   * @param {string} apiKey
   * @param {FileItemsOpts} opts
   * @returns
   */
  export function send(
    apiKey: string,
    opts: FileItemsOpts,
    list:
      | GoogleAppsScript.Drive.Schema.FileList
      | GoogleAppsScript.Drive.Schema.ChangeList
  ): void {
    // TODO: opts の各フィールドを reuqired にしてデフォルトを設定
    list.items = normalizeItems(list.items || [])
    const pickedList = pickScanFiles(opts, list)
    if (pickedList.items && pickedList.items.length > 0) {
      const ocrResutls = new OcrResutls()
      const dataBaseModel = retriveDatabase(apiKey, opts.database_id)
      for (const [paramCmd, item] of genCreatePageParameters(
        opts,
        dataBaseModel.properties,
        pickedList.items
      )) {
        // 現状では create のみ
        if (paramCmd.cmd === 'create') {
          createPage(apiKey, paramCmd.param)
          ocrResutls.add({ id: item.guid, text: item.text })
        }
      }
      ocrResutls.applyAll()
    }
    return
  }

  /**
   * Proccess OCR to recent created items that are contained scan folders
   * then send texts to Notion
   *
   * @param {string} apiKey
   * @param {FileItemsOpts} opts
   * @returns
   */
  export function ocr(apiKey: string, opts: FileItemsOpts) {
    for (const ocrOpt of opts.ocrOpts) {
      const res = Drive.Files?.list({
        q: `"${ocrOpt.scanFolderId}" in parents`,
        orderBy: 'createdDate desc'
      })
      if (res && res.items) {
        GocrToNotion.send(apiKey, opts, res)
      }
    }
  }
}
