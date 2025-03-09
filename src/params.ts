import {
  BlockObjectRequest,
  CreatePageParameters,
  GetDatabaseResponse
} from '@notionhq/client/build/src/api-endpoints'
import URI from 'urijs'
import { GocrToNotion } from './gocr2notion.js'
import { StoredItems } from './notion.js'
import { changedItems, getOcrFileTransformer } from './util.js'

export function* thumbParamTransformer(
  ite: ReturnType<GocrToNotion.ParamTransformer>
): ReturnType<GocrToNotion.ParamTransformer> {
  for (const [paramCmd, item, file] of ite) {
    if (item.thumbnailLink) {
      const uri = new URI(item.thumbnailLink)
      if (uri.query() === '' && uri.domain() === 'googleusercontent.com') {
        paramCmd.param.cover = {
          type: 'external',
          external: {
            url: item.thumbnailLink
          }
        }
        // 以下は "Content creation Failed. Fix the following: \nInvalid image url."" となる
        // ;(paramCmd.param as any).children?.splice(0, 0, {
        //   object: 'block',
        //   type: 'image',
        //   image: {
        //     external: { url: item.thumbnailLink }
        //   }
        // })
      }
    }
    yield [paramCmd, item, file]
  }
}

function* _genCreatePageParameters(
  opts: GocrToNotion.FileItemsOpts,
  propertiesModel: GetDatabaseResponse['properties'],
  items: GoogleAppsScript.Drive.Schema.Change[]
): ReturnType<GocrToNotion.ParamTransformer> {
  const fileTransformers = opts.fileTransformers ||
    opts.fileTransfomers || [getOcrFileTransformer(opts)]
  const filterTransformer: GocrToNotion.FileTransformer = function* (ite) {
    for (const i of ite) {
      yield i
    }
  }
  let ite: ReturnType<GocrToNotion.FileTransformer> = filterTransformer(
    changedItems(
      opts,
      items.filter(({ file }) => file).map(({ file }) => file || {})
    )
  )
  for (const i of fileTransformers) {
    ite = i(ite)
  }
  for (const [item, file] of ite) {
    // ゴミ箱にある場合、なにもしない
    if (!file.labels?.trashed) {
      const chunkedTexts = _chunkString(item.text, 2000)
      const children = chunkedTexts.map<BlockObjectRequest>((text) => ({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: text
              }
            }
          ]
        }
      }))
      const param: CreatePageParameters = {
        parent: {
          database_id: opts.database_id
        },
        properties: {
          title: {
            title: [{ type: 'text', text: { content: file.title || '' } }]
          }
        },
        children: children
      }
      if (
        propertiesModel?.entryUpdated &&
        propertiesModel?.entryUpdated.type === 'date'
      ) {
        param.properties.entryUpdated = {
          date: { start: new Date(Date.now()).toISOString() }
        }
      }
      if (propertiesModel?.guid && propertiesModel?.guid.type === 'rich_text') {
        param.properties.guid = {
          rich_text: [{ type: 'text', text: { content: item.guid } }]
        }
      }
      if (
        propertiesModel?.mimeType &&
        propertiesModel?.mimeType.type === 'select'
      ) {
        param.properties.mimeType = {
          select: { name: item.mimeType }
        }
      }
      if (propertiesModel?.type && propertiesModel?.type.type === 'select') {
        param.properties.type = {
          select: { name: item.type }
        }
      }
      if (
        propertiesModel?.tags &&
        propertiesModel?.tags.type === 'multi_select'
      ) {
        param.properties.tags = {
          multi_select: (item.ocrOpt?.tags || []).map((t) => ({ name: t }))
        }
      }
      if (
        propertiesModel?.['タグ'] &&
        propertiesModel?.['タグ'].type === 'multi_select'
      ) {
        param.properties['タグ'] = {
          multi_select: (item.ocrOpt?.tags || []).map((t) => ({ name: t }))
        }
      }
      if (
        propertiesModel?.excerpt &&
        propertiesModel?.excerpt.type === 'rich_text'
      ) {
        param.properties.excerpt = {
          rich_text: [{ type: 'text', text: { content: item.excerpt } }]
        }
      }
      if (propertiesModel?.link && propertiesModel?.link.type === 'url') {
        param.properties.link = {
          url: item.link
        }
      }
      if (
        propertiesModel?.modified &&
        propertiesModel?.modified.type === 'date'
      ) {
        param.properties.modified = {
          date: { start: item.modified }
        }
      }
      yield [{ cmd: 'create', param }, item, file]
    }
  }
}

export function* genCreatePageParameters(
  opts: GocrToNotion.FileItemsOpts,
  propertiesModel: GetDatabaseResponse['properties'],
  items: GoogleAppsScript.Drive.Schema.Change[]
): ReturnType<GocrToNotion.ParamTransformer> {
  const paramTransformers = opts.paramTransformers ||
    opts.paramTransfomers || [thumbParamTransformer]
  let ite: ReturnType<GocrToNotion.ParamTransformer> = _genCreatePageParameters(
    opts,
    propertiesModel,
    items
  )
  for (const i of paramTransformers) {
    ite = i(ite)
  }
  for (const item of ite) {
    yield item
  }
}

function _chunkString(str: String, chunkSize: number): string[] {
  const result = []
  for (let i = 0; i < str.length; i += chunkSize) {
    result.push(str.slice(i, i + chunkSize))
  }
  return result
}
