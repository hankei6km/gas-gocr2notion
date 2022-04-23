import { jest } from '@jest/globals'
const saveUrlFetchApp = global.UrlFetchApp
afterEach(() => {
  global.UrlFetchApp = saveUrlFetchApp
})

describe('send()', () => {
  it('should return void', () => {
    expect(
      send(
        'test-api-key',
        {
          dataase_id: 'test-database-id',
          ocrOpts: []
        },
        { imtes: [] }
      )
    ).toBeUndefined()
  })

  describe('ocr()', () => {
    it('should return void', () => {
      expect(
        ocr('test-api-key', {
          dataase_id: 'test-database-id',
          ocrOpts: []
        })
      ).toBeUndefined()
    })
  })
})
