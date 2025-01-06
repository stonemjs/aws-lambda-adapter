import { HTTP_INTERNAL_SERVER_ERROR } from '@stone-js/http-core'
import { AwsLambdaErrorHandler } from '../src/AwsLambdaErrorHandler'
import { IntegrationError, AdapterErrorContext, ILogger } from '@stone-js/core'

describe('AwsLambdaErrorHandler', () => {
  let mockLogger: ILogger
  let handler: AwsLambdaErrorHandler
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

    handler = new AwsLambdaErrorHandler({ logger: mockLogger })
  })

  test('should throw an IntegrationError if logger is not provided', () => {
    expect(() => new AwsLambdaErrorHandler({ logger: undefined as any })).toThrowError(IntegrationError)
  })

  test('should handle an error and return a response with correct headers', async () => {
    const error = new Error('Something went wrong')

    const response = await handler.handle(error, mockContext)

    expect(mockContext.rawResponseBuilder.add).toHaveBeenCalledWith(
      'statusCode',
      HTTP_INTERNAL_SERVER_ERROR
    )
    expect(mockLogger.error).toHaveBeenCalledWith('Something went wrong', { error })
    expect(response).toBe('response')
  })
})
