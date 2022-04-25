import { jest } from '@jest/globals'

const saveDrive = global.Drive
afterEach(() => {
  global.Drive = saveDrive
})

jest.unstable_mockModule('../src/util.js', () => {
  const mockPickScanFiles = jest.fn()
  const mockNormalizeItems = jest.fn()
  const mockOcrResutls = jest.fn()
  const mockChangedItems = jest.fn()
  const reset = (items: any[]) => {
    mockChangedItems.mockReset().mockImplementation(function* (items: any) {
      for (const i of items) {
        yield i
      }
    })
    mockNormalizeItems.mockReset().mockImplementation((items) => items)
    mockOcrResutls.mockReset().mockImplementation(() => {
      return {
        add: jest.fn(),
        applyAll: jest.fn()
      }
    })
    mockPickScanFiles.mockReset().mockReturnValue({
      items
    })
  }

  reset([])
  return {
    pickScanFiles: mockPickScanFiles,
    normalizeItems: mockNormalizeItems,
    OcrResutls: mockOcrResutls,
    _reset: reset,
    _getMocks: () => ({
      mockPickScanFiles,
      mockNormalizeItems,
      mockOcrResutls
    })
  }
})

jest.unstable_mockModule('../src/notion.js', () => {
  const mockCreatePage = jest.fn()
  const mockUpdatePage = jest.fn()
  const mockRetriveDatabase = jest.fn()
  const mockSortedItems = jest.fn()
  const mockSortedItemsMethods = {
    created: jest.fn(),
    updated: jest.fn(),
    deleted: jest.fn(),
    getOverPageIds: jest.fn()
  }
  const reset = () => {
    mockCreatePage.mockReset()
    mockUpdatePage.mockReset()
    mockRetriveDatabase
      .mockReset()
      .mockReturnValue({ properties: 'test-properties' })
    mockSortedItemsMethods.created.mockReset()
    mockSortedItemsMethods.updated.mockReset()
    mockSortedItemsMethods.deleted.mockReset()
    mockSortedItemsMethods.getOverPageIds
      .mockReset()
      .mockReturnValue(['test-over-1', 'test-over-2'])
    mockSortedItems.mockReset().mockImplementation(() => {
      return mockSortedItemsMethods
    })
  }

  reset()
  return {
    createPage: mockCreatePage,
    updatePage: mockUpdatePage,
    retriveDatabase: mockRetriveDatabase,
    StoredItems: mockSortedItems,
    _reset: reset,
    _getMocks: () => ({
      mockCreatePage,
      mockUpdatePage,
      mockRetriveDatabase,
      mockSortedItems,
      mockSortedItemsMethods
    })
  }
})

jest.unstable_mockModule('../src/params.js', () => {
  const mockGenCreatePageParameters = jest.fn()
  const mockThumbParamTeransFormer = jest.fn()
  const reset = (items: any[]) => {
    mockGenCreatePageParameters.mockReset().mockImplementation(function* () {
      for (const i of items) {
        yield i
      }
    })
    mockThumbParamTeransFormer.mockReset()
  }

  reset([])
  return {
    genCreatePageParameters: mockGenCreatePageParameters,
    thumbParamTeransFormer: mockThumbParamTeransFormer,
    _reset: reset,
    _getMocks: () => ({
      mockGenCreatePageParameters,
      mockThumbParamTeransFormer
    })
  }
})

const mockUtil = await import('../src/util.js')
const mockNotion = await import('../src/notion.js')
const mockParams = await import('../src/params.js')
const { mockPickScanFiles } = (mockUtil as any)._getMocks()
const {
  mockCreatePage,
  mockUpdatePage,
  mockSortedItems,
  mockSortedItemsMethods
} = (mockNotion as any)._getMocks()
const { mockGenCreatePageParameters, mockThumbParamTeransFormer } = (
  mockParams as any
)._getMocks()
const { GocrToNotion: GrecentToNotion } = await import('../src/gocr2notion.js')

afterEach(() => {
  ;(mockNotion as any)._reset()
})

describe('GrecentToNotion.send()', () => {
  it('should call createPage', () => {
    const mockItems = [
      [{ cmd: 'create', param: 'test-1' }, '', ''],
      [{ cmd: 'update', param: 'test-2' }, '', ''],
      [{ cmd: 'delete', param: 'test-3' }, '', '']
    ]
    ;(mockUtil as any)._reset(mockItems)
    ;(mockParams as any)._reset(mockItems)

    const opts = {
      database_id: 'test-database-id',
      ocrOpts: [
        {
          scanFolderId: 'test-scan-folder',
          ocrFolderId: 'test-ocr-folder',
          ocrLanguage: 'ja'
        }
      ]
    }
    GrecentToNotion.send(
      'test-api-key',
      opts,
      { items: [] } // この値は使われない、各 _reset に渡した mockItems が使われる
    )
    expect(mockCreatePage).toBeCalledTimes(1)
    expect(mockCreatePage).toBeCalledWith('test-api-key', 'test-1')
    expect(mockGenCreatePageParameters).toBeCalledWith(
      opts,
      'test-properties',
      mockItems
    )
  })
})

describe('GrecentToNotion.ocr()', () => {
  it('should call send', () => {
    const mockItems = [
      [{ cmd: 'create', param: 'test-1' }, '', ''],
      [{ cmd: 'update', param: 'test-2' }, '', ''],
      [{ cmd: 'delete', param: 'test-3' }, '', '']
    ]
    ;(mockUtil as any)._reset(mockItems)
    ;(mockParams as any)._reset(mockItems)
    const mockList = jest.fn().mockReturnValue({ items: [] }) // この値は使われない、各 _reset に渡した mockItems が使われる
    global.Drive = {
      Files: {
        list: mockList
      }
    } as any

    const opts = {
      database_id: 'test-database-id',
      ocrOpts: [
        {
          scanFolderId: 'test-scan-folder-1',
          ocrFolderId: 'test-ocr-folder-2',
          ocrLanguage: 'ja'
        },
        {
          scanFolderId: 'test-scan-folder-2',
          ocrFolderId: 'test-ocr-folder-2',
          ocrLanguage: 'ja'
        }
      ]
    }
    GrecentToNotion.ocr('test-api-key', opts)
    expect(mockList).toBeCalledTimes(2)
    expect(mockList).toBeCalledWith({
      q: '"test-scan-folder-1" in parents',
      orderBy: 'createdDate desc'
    })
    expect(mockList).toBeCalledWith({
      q: '"test-scan-folder-2" in parents',
      orderBy: 'createdDate desc'
    })
    expect(mockCreatePage).toBeCalledTimes(2)
    expect(mockCreatePage).toBeCalledWith('test-api-key', 'test-1')
    expect(mockCreatePage).toBeCalledWith('test-api-key', 'test-1')
    expect(mockGenCreatePageParameters).toBeCalledWith(
      opts,
      'test-properties',
      mockItems
    )
    expect(mockGenCreatePageParameters).toBeCalledWith(
      opts,
      'test-properties',
      mockItems
    )
  })
})
