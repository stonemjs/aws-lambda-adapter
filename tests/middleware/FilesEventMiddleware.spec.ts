import { Mock } from 'vitest'
import { AwsLambdaHttpAdapterContext } from '../../src/declarations'
import { isMultipart, getFilesUploads } from '@stone-js/http-core'
import { AwsLambdaAdapterError } from '../../src/errors/AwsLambdaAdapterError'
import { FilesEventMiddleware } from '../../src/middleware/FilesEventMiddleware'

vi.mock('@stone-js/http-core')

describe('FilesEventMiddleware', () => {
  let next: Mock
  let mockBlueprint: any
  let middleware: FilesEventMiddleware
  let mockContext: AwsLambdaHttpAdapterContext

  beforeEach(() => {
    mockBlueprint = {
      get: vi.fn(() => ({}))
    }

    middleware = new FilesEventMiddleware({ blueprint: mockBlueprint })

    mockContext = {
      rawEvent: {
        headers: { 'content-type': 'multipart/form-data' }
      },
      incomingEventBuilder: {
        add: vi.fn().mockReturnThis()
      }
    } as unknown as AwsLambdaHttpAdapterContext

    next = vi.fn()
  })

  it('should throw an error if context is missing required components', async () => {
    // @ts-expect-error
    mockContext.rawEvent = undefined

    await expect(middleware.handle(mockContext, next)).rejects.toThrow(AwsLambdaAdapterError)

    // @ts-expect-error
    mockContext.rawEvent = {}
    // @ts-expect-error
    mockContext.incomingEventBuilder = null

    await expect(middleware.handle(mockContext, next)).rejects.toThrow(AwsLambdaAdapterError)
  })

  it('should skip file upload handling if the request is not multipart', async () => {
    vi.mocked(isMultipart).mockReturnValue(false)

    mockContext.rawEvent.headers = { 'Content-Type': 'multipart/form-data' }

    await middleware.handle(mockContext, next)

    expect(next).toHaveBeenCalledWith(mockContext)
    expect(mockBlueprint.get).not.toHaveBeenCalled()
    // @ts-expect-error - Accessing private method for testing
    expect(isMultipart).toHaveBeenCalledWith(middleware.normalizeEvent(mockContext.rawEvent))
  })

  it('should process multipart request and add files and fields to the event builder', async () => {
    vi.mocked(isMultipart).mockReturnValue(true)
    vi.mocked(getFilesUploads).mockResolvedValue({
      files: { filename: [{ name: 'file1.txt', size: 123 }] } as any,
      fields: { key: 'value' }
    })

    await middleware.handle(mockContext, next)

    expect(isMultipart).toHaveBeenCalledWith(mockContext.rawEvent)
    expect(mockBlueprint.get).toHaveBeenCalledWith('stone.http.files.upload', {})
    expect(getFilesUploads).toHaveBeenCalledWith(mockContext.rawEvent, {})
    expect(mockContext.incomingEventBuilder?.add).toHaveBeenCalledWith('files', { filename: [{ name: 'file1.txt', size: 123 }] })
    expect(mockContext.incomingEventBuilder?.add).toHaveBeenCalledWith('body', { key: 'value' })
    expect(next).toHaveBeenCalledWith(mockContext)
  })

  it('should call next even if no multipart files are uploaded', async () => {
    vi.mocked(isMultipart).mockReturnValue(true)
    vi.mocked(getFilesUploads).mockResolvedValue({
      files: {},
      fields: {}
    })

    await middleware.handle(mockContext, next)

    expect(isMultipart).toHaveBeenCalledWith(mockContext.rawEvent)
    expect(getFilesUploads).toHaveBeenCalled()
    expect(mockContext.incomingEventBuilder?.add).toHaveBeenCalledWith('files', {})
    expect(mockContext.incomingEventBuilder?.add).toHaveBeenCalledWith('body', {})
    expect(next).toHaveBeenCalledWith(mockContext)
  })
})
