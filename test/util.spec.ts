import { jest } from '@jest/globals'
import { GocrToNotion } from '../src/main.js'
import {
  changedItems,
  getContentLines,
  getOcrFileTransformer,
  getType,
  normalizeItems,
  pickScanFiles
} from '../src/util.js'

const saveDrive = global.Drive
const saveDriveApp = global.DriveApp
const saveDocumentApp = global.DocumentApp
const saveUtilities = global.Utilities
afterEach(() => {
  global.Drive = saveDrive
  global.DriveApp = saveDriveApp
  global.DocumentApp = saveDocumentApp
  global.Utilities = saveUtilities
})
function getMockNewBlob() {
  return jest.fn().mockImplementation((v) => {
    return {
      getBytes: jest.fn<void, [string]>().mockImplementation(() => v)
    }
  })
}

describe('getContentLines()', () => {
  it('should return all lines', () => {
    global.Utilities = {
      newBlob: getMockNewBlob()
    } as any

    const mockLines = `test-1
    test-2
    test-3`
    expect(getContentLines(mockLines)).toEqual(mockLines)
  })

  it('should limit lines by maxContentLength', () => {
    global.Utilities = {
      newBlob: getMockNewBlob()
    } as any

    let mockLines = 'test-1\n'
    for (let i = 0; i < 1900; i++) {
      mockLines = `${mockLines}_`
    }
    expect(getContentLines(mockLines)).toEqual('test-1')
  })
})

describe('getType()', () => {
  it('should return type', () => {
    expect(getType('application/vnd.google-apps.document')).toEqual('document')
    expect(getType('application/vnd.google-apps.spreadsheet')).toEqual(
      'spreadsheet'
    )
    expect(getType('text/plain')).toEqual('text')
    expect(getType('text/csv')).toEqual('csv')
    expect(getType('application/pdf')).toEqual('pdf')
  })
})

describe('normalizeItems()', () => {
  it('should normalize items', () => {
    expect(
      normalizeItems([
        { id: 'test-id-1' },
        { fileId: 'test-id-2', file: { id: 'test-id-2' } }
      ])
    ).toEqual([
      { fileId: 'test-id-1', file: { id: 'test-id-1' } },
      { fileId: 'test-id-2', file: { id: 'test-id-2' } }
    ])
  })
  it('should blank array when  blank array passed', () => {
    expect(normalizeItems([])).toEqual([])
  })
})

describe('pickScanFiles()', () => {
  it('should pick scane files', () => {
    const mockList = [
      {
        file: {
          id: 'test-id-1',
          mimeType: 'application/pdf',
          parents: [{ id: 'test-scan-folder' }]
        }
      },
      {
        file: {
          id: 'test-id-2',
          mimeType: 'text/plain',
          parents: [{ id: 'test-scan-folder' }]
        }
      },
      {
        file: {
          id: 'test-id-3',
          mimeType: 'image/jpeg',
          parents: [{ id: 'test-scan-folder' }]
        }
      },
      {
        file: {
          id: 'test-id-4',
          mimeType: 'application/pdf',
          parents: [{ id: 'test-other-folder' }]
        }
      }
    ]
    const { items } = pickScanFiles(
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
      { items: mockList } as any
    )
    expect(items).toEqual([
      {
        file: {
          id: 'test-id-1',
          mimeType: 'application/pdf',
          parents: [{ id: 'test-scan-folder' }]
        }
      },
      {
        file: {
          id: 'test-id-3',
          mimeType: 'image/jpeg',
          parents: [{ id: 'test-scan-folder' }]
        }
      }
    ])
  })
})

describe('getOcrFileTransformer()', () => {
  it('should copy scanned file to document', () => {
    function* mockGen(): Generator<[any, any]> {
      yield [
        { guid: 'test-id-1', title: 'test-title-1' },
        { parents: [{ id: 'test-scan-folder-id-1' }] }
      ]
      yield [
        { guid: 'test-id-2', title: 'test-title-2' },
        { parents: [{ id: 'test-scan-folder-id-2' }] }
      ]
      yield [
        { guid: 'test-id-3', title: 'test-title-3' },
        { parents: [{ id: 'test-scan-folder-id-1' }] }
      ]
    }
    global.Drive = {
      Files: {
        get: jest.fn().mockImplementation((id) => id),
        copy: jest.fn().mockImplementation((resource, id) => ({ id }))
      }
    } as any
    global.DocumentApp = {
      openById: jest.fn().mockImplementation((id: any) => {
        return {
          getBody: jest.fn().mockReturnValue({
            //getText: jest.fn().mockReturnValue(`test-text-${id}`)
            getText: jest.fn().mockImplementation(() => {
              if (id !== 'test-id-3') {
                return `test-text-${id}`
              }
              return ''
            })
          })
        }
      })
    } as any
    global.Utilities = {
      newBlob: getMockNewBlob()
    } as any
    const ocrOpts = [
      {
        scanFolderId: 'test-scan-folder-id-1',
        ocrFolderId: 'test-scan-foldero-id-1',
        ocrLanguage: 'ja'
      },
      {
        scanFolderId: 'test-scan-folder-id-2',
        ocrFolderId: 'test-scan-folder-id-2',
        ocrLanguage: 'en'
      }
    ]

    const transformer = getOcrFileTransformer({
      database_id: 'test-database-id-1',
      ocrOpts
    })
    const items: any[] = []
    for (const [item] of transformer(mockGen())) {
      items.push(item)
    }
    expect(items).toEqual([
      {
        title: 'test-title-1',
        guid: 'test-id-1',
        excerpt: 'test-text-test-id-1',
        text: 'test-text-test-id-1',
        ocrOpt: ocrOpts[0]
      },
      {
        title: 'test-title-2',
        guid: 'test-id-2',
        excerpt: 'test-text-test-id-2',
        text: 'test-text-test-id-2',
        ocrOpt: ocrOpts[1]
      },
      {
        title: 'test-title-3',
        guid: 'test-id-3',
        excerpt: 'OCR - テキストは生成されませんでした。',
        text: 'OCR - テキストは生成されませんでした。',
        ocrOpt: ocrOpts[0]
      }
    ])
  })
})

describe('changedItems()', () => {
  it('should return file items from drive', () => {
    const mockList = [
      {
        id: 'test-id-1',
        mimeType: 'application/vnd.google-apps.photo',
        modifiedDate: '2022-04-18',
        description: 'test-description-1',
        thumbnailLink: 'test-thumbnail-link-1'
      },
      {
        id: 'test-id-2',
        mimeType: 'text/plain',
        modifiedDate: '2022-04-17'
      }
    ]
    const mockFileObj1 = {
      getUrl: jest.fn().mockReturnValueOnce('test-url-1')
    }
    const mockFileObj2 = {
      getUrl: jest.fn().mockReturnValueOnce('test-url-2'),
      getAs: jest.fn().mockReturnValueOnce({
        getDataAsString: jest.fn().mockReturnValueOnce('test-content-2')
      })
    }
    const mockFileById = jest
      .fn()
      .mockReturnValueOnce(mockFileObj1)
      .mockReturnValueOnce(mockFileObj2)
    global.DriveApp = {
      getFileById: mockFileById
    } as any
    global.Utilities = {
      newBlob: getMockNewBlob()
    } as any

    const items: [GocrToNotion.FileItem, GoogleAppsScript.Drive.Schema.File][] =
      []

    const g = changedItems(
      {
        database_id: '',
        ocrOpts: [
          {
            scanFolderId: 'test-scan-folder',
            ocrFolderId: 'test-ocr-folder',
            ocrLanguage: 'ja'
          }
        ]
      },
      mockList
    )
    for (const item of g) {
      items.push(item)
    }

    expect(mockFileById).toBeCalledWith('test-id-1')
    expect(mockFileById).toBeCalledWith('test-id-2')
    expect(items).toEqual([
      [
        {
          fileObj: mockFileObj1,
          guid: 'test-id-1',
          mimeType: 'application/vnd.google-apps.photo',
          type: 'photo',
          excerpt: '',
          description: 'test-description-1',
          link: 'test-url-1',
          modified: '2022-04-18T00:00:00.000Z',
          thumbnailLink: 'test-thumbnail-link-1',
          text: ''
        },
        {
          id: 'test-id-1',
          mimeType: 'application/vnd.google-apps.photo',
          modifiedDate: '2022-04-18',
          description: 'test-description-1',
          thumbnailLink: 'test-thumbnail-link-1'
        }
      ],
      [
        {
          fileObj: mockFileObj2,
          mimeType: 'text/plain',
          type: 'text',
          guid: 'test-id-2',
          excerpt: '',
          description: '',
          link: 'test-url-2',
          modified: '2022-04-17T00:00:00.000Z',
          text: ''
        },
        {
          id: 'test-id-2',
          mimeType: 'text/plain',
          modifiedDate: '2022-04-17'
        }
      ]
    ])
  })
})
