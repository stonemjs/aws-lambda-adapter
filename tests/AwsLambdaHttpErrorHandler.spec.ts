import mime from 'mime/lite'
import { Mock } from 'vitest'
import { HTTP_INTERNAL_SERVER_ERROR } from '@stone-js/http-core'
import { AwsLambdaHttpErrorHandler } from '../src/AwsLambdaHttpErrorHandler'
import { IntegrationError, AdapterErrorContext, ILogger } from '@stone-js/core'

const MockAcceptsType: any = vi.fn(() => 'json')

vi.mock('accepts', () => ({
  type: vi.fn(() => 'json'),
  default: () => ({ type: MockAcceptsType })
}))

vi.mock('mime/lite', () => ({
  getType: vi.fn(() => 'application/json'),
  default: { getType: vi.fn(() => 'application/json') }
}))

vi.mock('statuses', () => ({
  default: { message: { [HTTP_INTERNAL_SERVER_ERROR]: 'Internal Server Error' } }
}))

describe('AwsLambdaHttpErrorHandler', () => {
  let mockLogger: ILogger
  let handler: AwsLambdaHttpErrorHandler
  let mockContext: AdapterErrorContext<any, any, any>

  beforeEach(() => {
    mockLogger = {
      error: vi.fn()
    } as unknown as ILogger

    mockContext = {
      rawEvent: {},
      rawResponseBuilder: {
        add: vi.fn().mockReturnThis(),
        build: vi.fn().mockReturnValue({
          respond: vi.fn().mockResolvedValue('response')
        })
      }
    } as unknown as AdapterErrorContext<any, any, any>

    handler = new AwsLambdaHttpErrorHandler({ logger: mockLogger })
  })

  test('should throw an IntegrationError if logger is not provided', () => {
    expect(() => new AwsLambdaHttpErrorHandler({ logger: undefined as any })).toThrowError(IntegrationError)
  })

  test('should handle an error and return a response with correct headers', async () => {
    const error = new Error('Something went wrong')

    const response = await handler.handle(error, mockContext)

    expect(mockContext.rawResponseBuilder.add).toHaveBeenCalledWith(
      'headers',
      expect.any(Headers)
    )
    expect(mockContext.rawResponseBuilder.add).toHaveBeenCalledWith(
      'statusCode',
      HTTP_INTERNAL_SERVER_ERROR
    )
    expect(mockContext.rawResponseBuilder.add).toHaveBeenCalledWith(
      'statusMessage',
      'Internal Server Error'
    )
    expect(mockLogger.error).toHaveBeenCalledWith('Something went wrong', { error })
    expect(response).toBe('response')
  })

  test('should default to text/plain if mime.getType returns undefined', async () => {
    (mime.getType as unknown as Mock).mockReturnValueOnce(undefined)

    const error = new Error('Fallback mime type')

    const response = await handler.handle(error, mockContext)

    expect(mockContext.rawResponseBuilder.add).toHaveBeenCalledWith(
      'headers',
      expect.any(Headers)
    )
    expect(mockLogger.error).toHaveBeenCalledWith('Fallback mime type', { error })
    expect(response).toBe('response')
  })

  test('should handle false return from accepts.type', async () => {
    MockAcceptsType.mockReturnValueOnce(false)

    const error = new Error('Accepts returned false')

    const response = await handler.handle(error, mockContext)

    expect(mockContext.rawResponseBuilder.add).toHaveBeenCalledWith(
      'headers',
      expect.any(Headers)
    )
    expect(mockLogger.error).toHaveBeenCalledWith('Accepts returned false', { error })
    expect(response).toBe('response')
  })
})
