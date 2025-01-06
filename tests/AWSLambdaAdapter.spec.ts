import {
  AdapterEventBuilder,
  AdapterOptions,
  IncomingEvent,
  OutgoingResponse
} from '@stone-js/core'
import { AWSLambdaAdapter } from '../src/AWSLambdaAdapter'
import { RawResponseWrapper } from '../src/RawResponseWrapper'
import { AwsLambdaAdapterError } from '../src/errors/AwsLambdaAdapterError'

vi.mock('../src/RawResponseWrapper', () => ({
  RawResponseWrapper: {
    create: vi.fn()
  }
}))

describe('AWSLambdaAdapter', () => {
  let adapterOptions: AdapterOptions<IncomingEvent, OutgoingResponse>

  beforeEach(() => {
    adapterOptions = {
      hooks: {},
      blueprint: {
        get: vi.fn()
      },
      handlerResolver: vi.fn(),
      logger: {
        error: vi.fn()
      },
      errorHandler: {
        render: vi.fn(),
        report: vi.fn()
      }
    } as any
  })

  it('should create an instance with correct https configuration', () => {
    const adapter = AWSLambdaAdapter.create(adapterOptions)
    expect(adapter).toBeInstanceOf(AWSLambdaAdapter)
  })

  it('should throw error when used outside AWS Lambda context', async () => {
    const adapter = AWSLambdaAdapter.create(adapterOptions)

    global.window = {} as any // Simulate browser context

    await expect(adapter.run()).rejects.toThrow(AwsLambdaAdapterError)

    delete (global as any).window // Cleanup
  })

  it('should call the appropriate event listener on request', async () => {
    const adapter = AWSLambdaAdapter.create(adapterOptions)
    const mockEvent = {} as any

    IncomingEvent.create = vi.fn()
    RawResponseWrapper.create = vi.fn()
    AdapterEventBuilder.create = vi.fn((options) => options.resolver({}))
    // @ts-expect-error
    adapter.sendEventThroughDestination = vi.fn()

    const handler = await adapter.run()

    const rawResponse = await handler(mockEvent, {})

    expect(rawResponse).toBeUndefined()
    expect(AdapterEventBuilder.create).toHaveBeenCalled()
    // @ts-expect-error
    expect(adapter.sendEventThroughDestination).toHaveBeenCalled()
    expect(RawResponseWrapper.create).toHaveBeenCalledWith(expect.anything())
  })
})
