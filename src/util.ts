import { GocrToNotion } from './gocr2notion.js'

const noResult = 'OCR - テキストは生成されませんでした。'
const maxContentLines = 70
// https://developers.notion.com/reference/request-limits#limits-for-property-values
// > text.content	2000 characters
// (characters とあるが、たぶんバイト数)
// Utilities.newBlob(line).getBytes().length でカウントするとときどきオーバーする。
// 暫定対応で 1900 にしておく
// TODO: excerpt のカウントを Notion の API とあわせる
const maxContentLength = 1900

export function getContentLines(s: string): string {
  const maxLines = s.split('\n', maxContentLines)
  const lines: string[] = []
  let len = 0
  for (const line of maxLines) {
    len = len + Utilities.newBlob(line).getBytes().length
    if (len >= maxContentLength) {
      break
    }
    lines.push(line)
    if (lines.length >= maxContentLines) {
      break
    }
  }

  return lines.join('\n')
}

export function getType(mimeType: string): string {
  if (mimeType.startsWith('application/vnd.google-apps.')) {
    // 'application/vnd.google-apps.'.length = 28
    return mimeType.slice(28)
  }
  if (mimeType === 'text/plain') {
    return 'text'
  }
  const s = mimeType.split('/', 2)
  if (s.length === 2) {
    return s[1]
  }
  return s[0]
}

export function isScanFile(mimeType?: string | undefined): boolean {
  if (mimeType === 'application/pdf') {
    return true
  }
  const s = (mimeType || '').split('/', 2)
  if (s[0] === 'image') {
    return true
  }
  return false
}

export function normalizeItems(
  items: any[]
): GoogleAppsScript.Drive.Schema.Change[] {
  return items.map((item) => {
    if (item.file !== undefined) {
      return item
    }
    return {
      // fileId のみ設定(この後の処理で Change としてはほぼ使わない、予定)
      fileId: item.id,
      file: item
    }
  })
}

export function pickScanFiles(
  opts: GocrToNotion.FileItemsOpts,
  changeList: GoogleAppsScript.Drive.Schema.ChangeList
): GoogleAppsScript.Drive.Schema.ChangeList {
  const list = Object.assign({}, changeList)
  if (list.items) {
    list.items = list.items.filter((item) => {
      const file = item.file
      if (file) {
        if (
          isScanFile(file.mimeType) &&
          (file.description === undefined || file.description === '') &&
          file.parents?.some((p) =>
            opts.ocrOpts.some((o) => p.id == o.scanFolderId)
          )
        ) {
          return true
        }
      }
    })
  }
  return list
}

type OcrResult = { id: string; text: string }
export class OcrResutls {
  private results: OcrResult[] = []
  constructor() {
    this.results = []
  }
  add(res: OcrResult) {
    this.results.push(res)
  }
  applyAll() {
    for (const res of this.results) {
      const file = DriveApp.getFileById(res.id)
      file.setDescription(res.text.substring(0, 400))
    }
  }
}

export function getOcrFileTransformer(
  opts: GocrToNotion.FileItemsOpts
): GocrToNotion.FileTransformer {
  return function* ocrFileTransformer(ite) {
    for (const [item, file] of ite) {
      // この時点でファイルのフィルタリングは行われているが、
      // ocrOpts のどれにヒットしたかはセットせれていないので
      // ここで取り出す
      const idx = opts.ocrOpts.findIndex((o) =>
        file.parents?.some((p) => p.id && p.id === o.scanFolderId)
      )
      if (idx >= 0) {
        item.ocrOpt = opts.ocrOpts[idx]
        const folder = Drive.Files?.get(item.ocrOpt.ocrFolderId)
        if (folder) {
          // https://zenn.dev/harachan/articles/d910ef8b89720b
          const doc = Drive.Files?.copy(
            { title: file.title, parents: [folder] },
            item.guid,
            {
              ocr: true,
              ocrLanguage: item.ocrOpt!.ocrLanguage
            }
          )
          if (doc && doc.id) {
            const text =
              DocumentApp.openById(doc.id).getBody().getText() || noResult
            item.excerpt = getContentLines(text)
            item.text = text
            if (item.ocrOpt.removeOcrFile) {
              Drive.Files?.remove(doc.id)
            }
            yield [item, file]
          }
        }
      }
    }
  }
}

export function* changedItems(
  opts: GocrToNotion.FileItemsOpts,
  items: GoogleAppsScript.Drive.Schema.File[]
): Generator<[GocrToNotion.FileItem, GoogleAppsScript.Drive.Schema.File]> {
  let idx = 0
  for (const item of items) {
    const id = item.id || ''
    const mimeType = item.mimeType || ''
    const parents: string[] = item.parents?.map(({ id }) => id || '') || []
    const fileObj = DriveApp.getFileById(item.id || '')
    const recentItem: GocrToNotion.FileItem = {
      fileObj,
      guid: id,
      mimeType,
      type: getType(mimeType),
      excerpt: '',
      description: item.description || '',
      link: fileObj.getUrl(),
      modified: new Date(item.modifiedDate || Date.now()).toISOString(),
      thumbnailLink: item.thumbnailLink,
      text: ''
    }
    yield [recentItem, item]
    idx++
  }
}
