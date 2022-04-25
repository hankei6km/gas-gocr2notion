import {
  CreatePageParameters,
  UpdatePageParameters,
  QueryDatabaseParameters,
  QueryDatabaseResponse,
  GetDatabaseResponse
} from '@notionhq/client/build/src/api-endpoints'
import { GocrToNotion } from './gocr2notion'

const apiIUrlCreatePage = 'https://api.notion.com/v1/pages'
const apiUrlDabtabaseQuery = (database_id: string) =>
  `https://api.notion.com/v1/databases/${database_id}/query`
const apiUrlUpdatePage = (page_id: string) =>
  `https://api.notion.com/v1/pages/${page_id}`
const apiUrlRetrieveDatabase = (database_id: string) =>
  `https://api.notion.com/v1/databases/${database_id}`
const apiVersion = '2022-02-22'

export function createPage(apiKey: string, param: CreatePageParameters) {
  const res = UrlFetchApp.fetch(apiIUrlCreatePage, {
    method: 'post',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': apiVersion
    },
    payload: JSON.stringify(param),
    muteHttpExceptions: true
  })
  const code = res.getResponseCode()
  if (code / 100 == 4 || code / 100 === 5) {
    throw res.getContentText()
  }
}

export function updatePage(apiKey: string, param: UpdatePageParameters) {
  const url = apiUrlUpdatePage(param.page_id)
  const p = JSON.parse(JSON.stringify(param))
  delete p.page_id
  try {
    const res = UrlFetchApp.fetch(url, {
      method: 'patch',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': apiVersion
      },
      payload: JSON.stringify(p),
      muteHttpExceptions: true
    })
    const code = res.getResponseCode()
    if (code / 100 == 4 || code / 100 === 5) {
      throw res.getContentText()
    }
  } catch (e) {
    console.log(`${e}`)
    throw e
  }
}

export function retriveDatabase(
  apiKey: string,
  database_id: string
): GetDatabaseResponse {
  const url = apiUrlRetrieveDatabase(database_id)
  try {
    const res = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': apiVersion
      },
      muteHttpExceptions: true
    })
    const code = res.getResponseCode()
    if (code / 100 == 4 || code / 100 === 5) {
      throw res.getContentText()
    }
    return JSON.parse(res.getContentText())
  } catch (e) {
    console.log(`${e}`)
    throw e
  }
}

export class StoredItems {
  private map: Record<string, { page_id: string; use: boolean }> = {}
  private items: { guid: string; page_id?: string }[] = []
  constructor(apiKey: string, database_id: string) {
    const url = apiUrlDabtabaseQuery(database_id)
    //const param: QueryDatabaseParameters = {
    // database_id が必須となているが、存在するとサーバー側でエラーにされる
    const param: Record<string, any> = {
      sorts: [
        {
          property: 'entryUpdated',
          direction: 'descending'
        }
      ]
    }
    //const param: Record<string, any> = {}
    function* sitems(database_id: string) {
      const res = UrlFetchApp.fetch(url, {
        method: 'post',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Notion-Version': apiVersion
        },
        payload: JSON.stringify(param)
      })
      let resQuery = JSON.parse(res.getContentText()) as QueryDatabaseResponse
      let resItems = resQuery.results
      while (resItems.length > 0) {
        for (const item of resItems) {
          yield item
        }
        resItems = []
        if (resQuery.next_cursor) {
          param.start_cursor = resQuery.next_cursor
          const res = UrlFetchApp.fetch(url, {
            method: 'post',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'Notion-Version': apiVersion
            },
            payload: JSON.stringify(param)
          })
          resQuery = JSON.parse(res.getContentText()) as QueryDatabaseResponse
          resItems = resQuery.results
        }
      }
    }

    for (const i of sitems(database_id)) {
      const item: any = i
      if (item.properties.guid) {
        const guid = item.properties.guid.rich_text
          .filter(({ type }: { type: string }) => type === 'text')
          .map(({ plain_text }: { plain_text: string }) => plain_text)
          .join()
        this.map[guid] = { page_id: i.id, use: false }
        this.items.push({ guid, page_id: i.id })
      }
    }
  }
  private find(guid: string): number {
    return this.items.findIndex((i) => i.guid === guid)
  }
  getPageId(guid: string): string {
    const page_id = this.map[guid]?.page_id
    if (page_id) {
      return page_id
    }
    return ''
  }
  created(guid: string) {
    this.items.unshift({ guid })
  }
  updated(guid: string) {
    const idx = this.find(guid)
    if (idx >= 0) {
      const t = this.items[idx]
      this.items.splice(idx, 1)
      this.items.unshift(t)
    }
  }
  deleted(guid: string) {
    const idx = this.find(guid)
    if (idx >= 0) {
      this.items.splice(idx, 1)
      delete this.map[guid]
    }
  }
  getOverPageIds(limit: number): (string | undefined)[] {
    return this.items.slice(limit).map(({ page_id }) => page_id)
  }
}
