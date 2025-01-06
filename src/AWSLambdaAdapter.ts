import { RawResponseWrapper } from './RawResponseWrapper'
import { AwsLambdaAdapterError } from './errors/AwsLambdaAdapterError'
import { AwsLambdaContext, AwsLambdaEvent, AwsLambdaEventHandlerFunction, RawResponse, AwsLambdaAdapterContext } from './declarations'
import { Adapter, AdapterEventBuilder, AdapterOptions, IncomingEvent, IncomingEventOptions, LifecycleEventHandler, OutgoingResponse, RawResponseOptions } from '@stone-js/core'

/**
 * AWS Lambda Adapter for Stone.js.
 *
 * The `AWSLambdaAdapter` provides seamless integration between Stone.js applications
 * and the AWS Lambda environment. It processes incoming events from AWS Lambda,
 * transforms them into `IncomingEvent` instances, and returns a `RawResponse`.
 *
 * This adapter ensures compatibility with AWS Lambda's execution model and
 * abstracts the event handling process for Stone.js developers.
 *
 * @template AwsLambdaEvent - The type of the raw event received from AWS Lambda.
 * @template RawResponse - The type of the response to send back to AWS Lambda.
 * @template AwsLambdaContext - The AWS Lambda execution context type.
 * @template IncomingEvent - The type of the processed incoming event.
 * @template IncomingEventOptions - Options used to create an incoming event.
 * @template OutgoingResponse - The type of the outgoing response after processing.
 * @template AwsLambdaAdapterContext - Context type specific to the adapter.
 *
 * @extends Adapter
 *
 * @example
 * ```typescript
 * import { AWSLambdaAdapter } from '@stone-js/aws-lambda-adapter';
 *
 * const adapter = AWSLambdaAdapter.create({...});
 *
 * const handler = await adapter.run();
 *
 * export { handler };
 * ```
 *
 * @see {@link https://stone-js.com/docs Stone.js Documentation}
 * @see {@link https://docs.aws.amazon.com/lambda/ AWS Lambda Documentation}
 */
export class AWSLambdaAdapter extends Adapter<
AwsLambdaEvent,
RawResponse,
AwsLambdaContext,
IncomingEvent,
IncomingEventOptions,
OutgoingResponse,
AwsLambdaAdapterContext
> {
  /**
   * Creates an instance of the `AWSLambdaAdapter`.
   *
   * This factory method allows developers to instantiate the adapter with
   * the necessary configuration options, ensuring it is correctly set up for
   * AWS Lambda usage.
   *
   * @param options - The configuration options for the adapter, including
   *                  handler resolver, error handling, and other settings.
   * @returns A fully initialized `AWSLambdaAdapter` instance.
   */
  static create (options: AdapterOptions<IncomingEvent, OutgoingResponse>): AWSLambdaAdapter {
    return new this(options)
  }

  /**
   * Executes the adapter and provides an AWS Lambda-compatible handler function.
   *
   * The `run` method initializes the adapter and returns a handler function
   * that AWS Lambda can invoke. This handler processes events, manages context,
   * and returns the appropriate response.
   *
   * @template ExecutionResultType - The type representing the AWS Lambda event handler function.
   * @returns A promise resolving to the AWS Lambda handler function.
   * @throws {AwsLambdaAdapterError} If used outside the AWS Lambda environment.
   */
  public async run<ExecutionResultType = AwsLambdaEventHandlerFunction>(): Promise<ExecutionResultType> {
    await this.onInit()

    const handler = async (rawEvent: AwsLambdaEvent, executionContext: AwsLambdaContext): Promise<RawResponse> => {
      return await this.eventListener(rawEvent, executionContext)
    }

    return handler as ExecutionResultType
  }

  /**
   * Initializes the adapter and validates its execution context.
   *
   * Ensures the adapter is running in an AWS Lambda environment. If not, it
   * throws an error to prevent misuse.
   *
   * @throws {AwsLambdaAdapterError} If executed outside an AWS Lambda context (e.g., browser).
   */
  protected async onInit (): Promise<void> {
    if (typeof window === 'object') {
      throw new AwsLambdaAdapterError(
        'This `AWSLambdaAdapter` must be used only in AWS Lambda context.'
      )
    }

    await super.onInit()
  }

  /**
   * Processes an incoming AWS Lambda event.
   *
   * This method transforms the raw AWS Lambda event into a Stone.js `IncomingEvent`,
   * processes it through the pipeline, and generates a `RawResponse` to send back.
   *
   * @param rawEvent - The raw AWS Lambda event to be processed.
   * @param executionContext - The AWS Lambda execution context for the event.
   * @returns A promise resolving to the processed `RawResponse`.
   */
  protected async eventListener (rawEvent: AwsLambdaEvent, executionContext: AwsLambdaContext): Promise<RawResponse> {
    const eventHandler = this.handlerResolver(this.blueprint) as LifecycleEventHandler<IncomingEvent, OutgoingResponse>

    await this.onPrepare(eventHandler)

    const incomingEventBuilder = AdapterEventBuilder.create<IncomingEventOptions, IncomingEvent>({
      resolver: (options) => IncomingEvent.create(options)
    })

    const rawResponseBuilder = AdapterEventBuilder.create<RawResponseOptions, RawResponseWrapper>({
      resolver: (options) => RawResponseWrapper.create(options)
    })

    const rawResponse: RawResponse = {}

    return await this.sendEventThroughDestination(eventHandler, {
      rawEvent,
      rawResponse,
      executionContext,
      rawResponseBuilder,
      incomingEventBuilder
    })
  }
}
