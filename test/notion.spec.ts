import { jest } from '@jest/globals'
import { createPage, updatePage, StoredItems, isErrRes } from '../src/notion'

const saveUrlFetchApp = global.UrlFetchApp
afterEach(() => {
  global.UrlFetchApp = saveUrlFetchApp
})

describe('isErrRese()', () => {
  const mockRes = (code: number): any => ({
    getResponseCode: jest.fn().mockReturnValue(code)
  })
  it('should return true', () => {
    expect(isErrRes(mockRes(404))).toBeTruthy()
    expect(isErrRes(mockRes(500))).toBeTruthy()
  })
  it('should return false', () => {
    expect(isErrRes(mockRes(200))).toBeFalsy()
  })
})

describe('updatePage()', () => {
  it('should call create page api', () => {
    const mockfetch = jest.fn().mockReturnValue({
      getResponseCode: jest.fn().mockReturnValue(200)
    })
    global.UrlFetchApp = {
      fetch: mockfetch
    } as any
    updatePage('test-api-key', {
      page_id: 'test-page-id',
      properties: 'test-properties'
    } as any)
    expect(mockfetch).toBeCalledWith(
      'https://api.notion.com/v1/pages/test-page-id',
      {
        method: 'patch',
        headers: {
          Authorization: `Bearer test-api-key`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-02-22'
        },
        payload: JSON.stringify({ properties: 'test-properties' }),
        muteHttpExceptions: true
      }
    )
  })
})

describe('getStoredItems()', () => {
  it('should stored items', () => {
    const mockfetch = jest
      .fn()
      .mockReturnValueOnce({
        getContentText: jest.fn().mockReturnValueOnce(
          JSON.stringify({
            results: [
              {
                id: 'test-page-id-1',
                properties: {
                  guid: {
                    rich_text: [{ type: 'text', plain_text: 'g1' }]
                  }
                }
              },
              {
                id: 'test-page-id-2',
                properties: {
                  guid: {
                    rich_text: [{ type: 'text', plain_text: 'g2' }]
                  }
                }
              }
            ],
            next_cursor: 'c1',
            has_more: true
          })
        )
      })
      .mockReturnValueOnce({
        getContentText: jest.fn().mockReturnValueOnce(
          JSON.stringify({
            results: [
              {
                id: 'test-page-id-3',
                properties: {
                  guid: {
                    rich_text: [{ type: 'text', plain_text: 'g3' }]
                  }
                }
              },
              {
                id: 'test-page-id-4',
                properties: {
                  guid: {
                    rich_text: [{ type: 'text', plain_text: 'g4' }]
                  }
                }
              }
            ],
            next_cursor: null,
            has_more: true
          })
        )
      })

    global.UrlFetchApp = {
      fetch: mockfetch
    } as any

    const storedItems = new StoredItems(
      'test-api-key',
      'test-database-id' as any
    )
    expect(storedItems.getPageId('g1')).toEqual('test-page-id-1')
    expect(storedItems.getPageId('g2')).toEqual('test-page-id-2')
    expect(storedItems.getPageId('g3')).toEqual('test-page-id-3')
    expect(storedItems.getPageId('g4')).toEqual('test-page-id-4')
    expect(storedItems.getOverPageIds(5)).toEqual([])
    expect(storedItems.getOverPageIds(2)).toEqual([
      'test-page-id-3',
      'test-page-id-4'
    ])
    storedItems.updated('g3')
    expect(storedItems.getOverPageIds(2)).toEqual([
      'test-page-id-2',
      'test-page-id-4'
    ])
    storedItems.created('g5')
    expect(storedItems.getOverPageIds(2)).toEqual([
      'test-page-id-1',
      'test-page-id-2',
      'test-page-id-4'
    ])
    storedItems.deleted('g2')
    expect(storedItems.getOverPageIds(2)).toEqual([
      'test-page-id-1',
      'test-page-id-4'
    ])
    expect(mockfetch).toBeCalledWith(
      'https://api.notion.com/v1/databases/test-database-id/query',
      {
        method: 'post',
        headers: {
          Authorization: `Bearer test-api-key`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-02-22'
        },
        payload: JSON.stringify({
          sorts: [
            {
              property: 'entryUpdated',
              direction: 'descending'
            }
          ]
        })
      }
    )
    expect(mockfetch).toBeCalledWith(
      'https://api.notion.com/v1/databases/test-database-id/query',
      {
        method: 'post',
        headers: {
          Authorization: `Bearer test-api-key`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-02-22'
        },
        payload: JSON.stringify({
          sorts: [
            {
              property: 'entryUpdated',
              direction: 'descending'
            }
          ],
          start_cursor: 'c1'
        })
      }
    )
  })
})

describe('createPage()', () => {
  it('should call create page api', () => {
    const mockfetch = jest.fn().mockReturnValue({
      getResponseCode: jest.fn().mockReturnValue(200)
    })
    global.UrlFetchApp = {
      fetch: mockfetch
    } as any
    createPage('test-api-key', 'test-param' as any)
    expect(mockfetch).toBeCalledWith('https://api.notion.com/v1/pages', {
      method: 'post',
      headers: {
        Authorization: `Bearer test-api-key`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-02-22'
      },
      payload: '"test-param"',
      muteHttpExceptions: true
    })
  })
})

describe('updatePage()', () => {
  it('should call create page api', () => {
    const mockfetch = jest.fn().mockReturnValue({
      getResponseCode: jest.fn().mockReturnValue(200)
    })
    global.UrlFetchApp = {
      fetch: mockfetch
    } as any
    updatePage('test-api-key', {
      page_id: 'test-page-id',
      properties: 'test-properties'
    } as any)
    expect(mockfetch).toBeCalledWith(
      'https://api.notion.com/v1/pages/test-page-id',
      {
        method: 'patch',
        headers: {
          Authorization: `Bearer test-api-key`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-02-22'
        },
        payload: JSON.stringify({ properties: 'test-properties' }),
        muteHttpExceptions: true
      }
    )
  })
})

describe('getStoredItems()', () => {
  it('should stored items', () => {
    const mockfetch = jest
      .fn()
      .mockReturnValueOnce({
        getContentText: jest.fn().mockReturnValueOnce(
          JSON.stringify({
            results: [
              {
                id: 'test-page-id-1',
                properties: {
                  guid: {
                    rich_text: [{ type: 'text', plain_text: 'g1' }]
                  }
                }
              },
              {
                id: 'test-page-id-2',
                properties: {
                  guid: {
                    rich_text: [{ type: 'text', plain_text: 'g2' }]
                  }
                }
              }
            ],
            next_cursor: 'c1',
            has_more: true
          })
        )
      })
      .mockReturnValueOnce({
        getContentText: jest.fn().mockReturnValueOnce(
          JSON.stringify({
            results: [
              {
                id: 'test-page-id-3',
                properties: {
                  guid: {
                    rich_text: [{ type: 'text', plain_text: 'g3' }]
                  }
                }
              },
              {
                id: 'test-page-id-4',
                properties: {
                  guid: {
                    rich_text: [{ type: 'text', plain_text: 'g4' }]
                  }
                }
              }
            ],
            next_cursor: null,
            has_more: true
          })
        )
      })

    global.UrlFetchApp = {
      fetch: mockfetch
    } as any

    const storedItems = new StoredItems(
      'test-api-key',
      'test-database-id' as any
    )
    expect(storedItems.getPageId('g1')).toEqual('test-page-id-1')
    expect(storedItems.getPageId('g2')).toEqual('test-page-id-2')
    expect(storedItems.getPageId('g3')).toEqual('test-page-id-3')
    expect(storedItems.getPageId('g4')).toEqual('test-page-id-4')
    expect(storedItems.getOverPageIds(5)).toEqual([])
    expect(storedItems.getOverPageIds(2)).toEqual([
      'test-page-id-3',
      'test-page-id-4'
    ])
    storedItems.updated('g3')
    expect(storedItems.getOverPageIds(2)).toEqual([
      'test-page-id-2',
      'test-page-id-4'
    ])
    storedItems.created('g5')
    expect(storedItems.getOverPageIds(2)).toEqual([
      'test-page-id-1',
      'test-page-id-2',
      'test-page-id-4'
    ])
    storedItems.deleted('g2')
    expect(storedItems.getOverPageIds(2)).toEqual([
      'test-page-id-1',
      'test-page-id-4'
    ])
    expect(mockfetch).toBeCalledWith(
      'https://api.notion.com/v1/databases/test-database-id/query',
      {
        method: 'post',
        headers: {
          Authorization: `Bearer test-api-key`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-02-22'
        },
        payload: JSON.stringify({
          sorts: [
            {
              property: 'entryUpdated',
              direction: 'descending'
            }
          ]
        })
      }
    )
    expect(mockfetch).toBeCalledWith(
      'https://api.notion.com/v1/databases/test-database-id/query',
      {
        method: 'post',
        headers: {
          Authorization: `Bearer test-api-key`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-02-22'
        },
        payload: JSON.stringify({
          sorts: [
            {
              property: 'entryUpdated',
              direction: 'descending'
            }
          ],
          start_cursor: 'c1'
        })
      }
    )
  })
})
