import { jest } from '@jest/globals'
import { GocrToNotion } from '../src/gocr2notion.js'
import { StoredItems } from '../src/notion.js'

const saveDrive = global.Drive
const saveDriveApp = global.DriveApp
const saveDateNow = global.Date.now
afterEach(() => {
  global.Drive = saveDrive
  global.DriveApp = saveDriveApp
  global.Date.now = saveDateNow
})

jest.unstable_mockModule('../src/util.js', () => {
  const mockGetOcrFileTransformer = jest.fn()
  const mockChangedItems = jest.fn()
  const reset = (items: GocrToNotion.FileItem[]) => {
    mockGetOcrFileTransformer.mockReset().mockReturnValue(function* () {
      for (const i of items) {
        yield i
      }
    })
    mockChangedItems.mockReset().mockImplementation(function* () {
      for (const i of items) {
        yield i
      }
    })
  }

  reset([])
  return {
    getOcrFileTransformer: mockGetOcrFileTransformer,
    changedItems: mockChangedItems,
    _reset: reset,
    _getMocks: () => ({
      mockChangedItems,
      mockGetOcrFileTransformer
    })
  }
})

const mockUtil = await import('../src/util.js')
const { mockFiletems } = (mockUtil as any)._getMocks()
const { genCreatePageParameters } = await import('../src/params.js')

describe('genCreatePageParameters()', () => {
  it('should return CreatePageParameters items', () => {
    const mockItems: [
      GocrToNotion.FileItem,
      GoogleAppsScript.Drive.Schema.File
    ][] = [
      [
        {
          fileObj: {
            getThumbnail: jest.fn().mockReturnValue({
              copyBlob: jest.fn().mockReturnValue('test-blob-1')
            })
          } as any,
          guid: 'test-id-1',
          mimeType: 'image/jpeg',
          type: 'jpeg',
          excerpt: 'test-content-1',
          description: 'test-description-1',
          link: 'test-url-1',
          modified: '2022-04-18T00:00:00.000Z',
          thumbnailLink:
            'https://test.googleusercontent.com/test-thumbnail-link-1',
          text: 'test-text-1',
          ocrOpt: {
            scanFolderId: 'test-scan-1',
            ocrFolderId: 'test-ocr-1',
            ocrLanguage: 'ja'
          }
        },
        {
          title: 'test-title-1',
          id: 'test-id-1',
          modifiedDate: '2022-04-18',
          thumbnailLink: 'test-thumbnail-link-1'
        }
      ],
      [
        {
          fileObj: {
            getThumbnail: jest.fn().mockReturnValue({
              copyBlob: jest.fn().mockReturnValue('test-blob-2')
            })
          } as any,
          guid: 'test-id-2',
          mimeType: 'text/plain',
          type: 'text',
          excerpt: 'test-content-2',
          description: 'test-description-2',
          link: 'test-url-2',
          modified: '2022-04-17T00:00:00.000Z',
          text: 'test-text-2',
          ocrOpt: {
            scanFolderId: 'test-scan-2',
            ocrFolderId: 'test-ocr-2',
            ocrLanguage: 'ja',
            tags: ['test-tags-2-1', 'test-tags-2-2']
          }
        },
        {
          title: 'test-title-2',
          id: 'test-id-2',
          modifiedDate: '2022-04-17'
        }
      ]
    ]
    ;(mockUtil as any)._reset(mockItems)
    const mockGet = jest.fn().mockReturnValue({
      thumbnailLink: 'test-thumbnail-link-new-1'
    })
    const mockRemove = jest.fn()
    global.Drive = {
      Files: {
        get: mockGet,
        remove: mockRemove
      }
    } as any

    const mockGetFiles = jest.fn().mockReturnValue({
      hasNext: jest.fn().mockReturnValueOnce(true).mockReturnValueOnce(true),
      next: jest
        .fn()
        .mockReturnValueOnce({
          getId: jest.fn().mockReturnValue('test-remove-id-1')
        })
        .mockReturnValueOnce({
          getId: jest.fn().mockReturnValue('test-remove-id-2')
        })
    })
    const mockGetFolderById = jest.fn().mockReturnValue({
      createFile: jest.fn().mockReturnValue({
        setName: jest.fn().mockReturnValue({
          getId: jest.fn()
        })
      }),
      getFiles: mockGetFiles
    })
    const mockFileObj1 = {
      getUrl: jest.fn().mockReturnValueOnce('test-url-1')
    }
    const mockFileObj2 = {
      getUrl: jest.fn().mockReturnValueOnce('test-url-2')
    }
    const mockFileById = jest
      .fn()
      .mockReturnValueOnce(mockFileObj1)
      .mockReturnValueOnce(mockFileObj2)
    global.DriveApp = {
      getFolderById: mockGetFolderById,
      getFileById: mockFileById
    } as any

    const g = genCreatePageParameters(
      {
        database_id: 'test-database-id',
        ocrOpts: [
          {
            scanFolderId: 'test-scan-folder',
            ocrFolderId: 'test-ocr-folder',
            ocrLanguage: 'ja'
          }
        ]
      },
      {
        entryUpdated: {
          type: 'date'
        },
        guid: {
          type: 'rich_text'
        },
        mimeType: {
          type: 'select'
        },
        type: {
          type: 'select'
        },
        tags: {
          type: 'multi_select'
        },
        タグ: {
          type: 'multi_select'
        },
        excerpt: { type: 'rich_text' },
        description: {
          type: 'rich_text'
        },
        link: {
          type: 'url'
        },
        modified: {
          type: 'date'
        }
      } as any,
      []
    )
    const mockFakeNow = new Date('2022-04-20').getTime()
    Date.now = jest.fn<number, []>().mockReturnValue(mockFakeNow)

    const params: [
      GocrToNotion.ParamsCmd,
      GocrToNotion.FileItem,
      GoogleAppsScript.Drive.Schema.File
    ][] = []
    for (const param of g) {
      params.push(param)
    }

    expect(params).toEqual([
      [
        {
          cmd: 'create',
          param: {
            parent: {
              database_id: 'test-database-id'
            },
            cover: {
              type: 'external',
              external: {
                url: 'https://test.googleusercontent.com/test-thumbnail-link-1'
              }
            },
            properties: {
              title: {
                title: [{ type: 'text', text: { content: 'test-title-1' } }]
              },
              entryUpdated: {
                date: { start: '2022-04-20T00:00:00.000Z' }
              },
              guid: {
                rich_text: [{ type: 'text', text: { content: 'test-id-1' } }]
              },
              mimeType: {
                select: { name: 'image/jpeg' }
              },
              type: {
                select: { name: 'jpeg' }
              },
              tags: {
                multi_select: []
              },
              タグ: {
                multi_select: []
              },
              excerpt: {
                rich_text: [
                  { type: 'text', text: { content: 'test-content-1' } }
                ]
              },
              description: {
                rich_text: [
                  { type: 'text', text: { content: 'test-description-1' } }
                ]
              },
              link: {
                url: 'test-url-1'
              },
              modified: {
                date: { start: '2022-04-18T00:00:00.000Z' }
              }
            },
            children: [
              {
                object: 'block',
                type: 'paragraph',
                paragraph: {
                  rich_text: [
                    {
                      type: 'text',
                      text: {
                        content: 'test-text-1'
                      }
                    }
                  ]
                }
              }
            ]
          }
        },
        ...mockItems[0]
      ],
      [
        {
          cmd: 'create',
          param: {
            parent: {
              database_id: 'test-database-id'
            },
            properties: {
              title: {
                title: [{ type: 'text', text: { content: 'test-title-2' } }]
              },
              entryUpdated: {
                date: { start: '2022-04-20T00:00:00.000Z' }
              },
              guid: {
                rich_text: [{ type: 'text', text: { content: 'test-id-2' } }]
              },
              mimeType: {
                select: { name: 'text/plain' }
              },
              type: {
                select: { name: 'text' }
              },
              tags: {
                multi_select: [
                  { name: 'test-tags-2-1' },
                  { name: 'test-tags-2-2' }
                ]
              },
              タグ: {
                multi_select: [
                  { name: 'test-tags-2-1' },
                  { name: 'test-tags-2-2' }
                ]
              },
              excerpt: {
                rich_text: [
                  { type: 'text', text: { content: 'test-content-2' } }
                ]
              },
              description: {
                rich_text: [
                  { type: 'text', text: { content: 'test-description-2' } }
                ]
              },
              link: {
                url: 'test-url-2'
              },
              modified: {
                date: { start: '2022-04-17T00:00:00.000Z' }
              }
            },
            children: [
              {
                object: 'block',
                type: 'paragraph',
                paragraph: {
                  rich_text: [
                    {
                      type: 'text',
                      text: {
                        content: 'test-text-2'
                      }
                    }
                  ]
                }
              }
            ]
          }
        },
        ...mockItems[1]
      ]
    ])
  })
})
