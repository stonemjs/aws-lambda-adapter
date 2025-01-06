import bytes from 'bytes'
import typeIs from 'type-is'
import { Mock } from 'vitest'
import { isMultipart, getCharset } from '@stone-js/http-core'
import { AwsLambdaHttpAdapterContext } from '../../src/declarations'
import { BodyEventMiddleware } from '../../src/middleware/BodyEventMiddleware'
import { AwsLambdaAdapterError } from '../../src/errors/AwsLambdaAdapterError'

vi.mock('bytes')
vi.mock('type-is')
vi.mock('raw-body')
vi.mock('co-body')

vi.mock('@stone-js/http-core', () => ({
  getType: vi.fn(),
  getCharset: vi.fn(),
  isMultipart: vi.fn(),
  getHttpError: vi.fn()
}))

describe('BodyEventMiddleware', () => {
  let next: Mock
  let mockBlueprint: any
  let middleware: BodyEventMiddleware
  let mockContext: AwsLambdaHttpAdapterContext

  beforeEach(() => {
    mockBlueprint = {
      get: vi.fn(() => ({
        limit: '100kb',
        defaultType: 'json',
        defaultCharset: 'utf-8'
      }))
    }

    middleware = new BodyEventMiddleware({ blueprint: mockBlueprint })

    mockContext = {
      rawEvent: {
        headers: { 'content-type': 'application/json', 'content-length': '123' }
      },
      incomingEventBuilder: {
        add: vi.fn()
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

  it('should skip body parsing if the request is multipart', async () => {
    vi.mocked(isMultipart).mockReturnValue(true)

    await middleware.handle(mockContext, next)

    expect(isMultipart).toHaveBeenCalledWith(mockContext.rawEvent)
    expect(mockContext.incomingEventBuilder?.add).not.toHaveBeenCalledWith('body', expect.anything())
    expect(next).toHaveBeenCalledWith(mockContext)
  })

  it('should parse and add empty object body to the event builder when request has no body', async () => {
    vi.mocked(isMultipart).mockReturnValue(false)
    vi.mocked(typeIs.hasBody).mockReturnValue(false)

    await middleware.handle(mockContext, next)

    expect(mockContext.incomingEventBuilder?.add).toHaveBeenCalledWith('body', {})
    expect(next).toHaveBeenCalledWith(mockContext)
  })

  it('should parse and add empty object body to the event builder on invalid type', async () => {
    vi.mocked(isMultipart).mockReturnValue(false)
    vi.mocked(typeIs.hasBody).mockReturnValue(true)
    vi.mocked(typeIs.is).mockReturnValue(false)

    await middleware.handle(mockContext, next)

    expect(mockContext.incomingEventBuilder?.add).toHaveBeenCalledWith('body', {})
    expect(next).toHaveBeenCalledWith(mockContext)
  })

  it('should parse and add JSON body to the event builder', async () => {
    vi.mocked(isMultipart).mockReturnValue(false)
    vi.mocked(typeIs.hasBody).mockReturnValue(true)
    vi.mocked(getCharset).mockReturnValue('utf-8')
    vi.mocked(typeIs.is).mockReturnValue('json')

    mockContext.rawEvent.body = { key: 'value' }

    await middleware.handle(mockContext, next)

    expect(mockBlueprint.get).toHaveBeenCalledWith('stone.http.body', expect.any(Object))
    expect(mockContext.incomingEventBuilder?.add).toHaveBeenCalledWith('body', { key: 'value' })
    expect(next).toHaveBeenCalledWith(mockContext)
  })

  it('should parse and add text body to the event builder', async () => {
    vi.mocked(isMultipart).mockReturnValue(false)
    vi.mocked(typeIs.hasBody).mockReturnValue(true)
    vi.mocked(getCharset).mockReturnValue('utf-8')
    vi.mocked(typeIs.is).mockReturnValue('text')

    mockContext.rawEvent.body = '<h1>Hello, world!</h1>'

    await middleware.handle(mockContext, next)

    expect(mockContext.incomingEventBuilder?.add).toHaveBeenCalledWith('body', '<h1>Hello, world!</h1>')
    expect(next).toHaveBeenCalledWith(mockContext)
  })

  it('should throw an error when body length exeeced the limit', async () => {
    vi.mocked(isMultipart).mockReturnValue(false)
    vi.mocked(typeIs.hasBody).mockReturnValue(true)
    vi.mocked(typeIs.is).mockReturnValue('sting')
    vi.mocked(bytes.parse).mockReturnValue(102400)
    Buffer.byteLength = vi.fn().mockReturnValue(999999999)

    mockContext.rawEvent.headers = { 'Content-Type': 'multipart/form-data', 'Content-Length': '999999999' }

    await expect(async () => await middleware.handle(mockContext, next)).rejects.toThrow(AwsLambdaAdapterError)
    expect(next).not.toHaveBeenCalledWith(mockContext)
    // @ts-expect-error
    Buffer.byteLength.mockRestore()
  })
})
