import statuses from 'statuses'
import { NextPipe } from '@stone-js/pipeline'
import { BinaryFileResponse } from '@stone-js/http-core'
import { AwsLambdaAdapterError } from '../errors/AwsLambdaAdapterError'
import { AwsLambdaHttpAdapterContext, AwsLambdaHttpAdapterResponseBuilder } from '../declarations'

/**
 * Middleware for handling server responses and transforming them into the appropriate HTTP responses.
 *
 * This middleware processes outgoing responses and attaches the necessary headers, status codes,
 * and body content to the HTTP response.
 */
export class ServerResponseMiddleware {
  /**
   * Handles the outgoing response, processes it, and invokes the next middleware in the pipeline.
   *
   * @param context - The adapter context containing the raw event, execution context, and other data.
   * @param next - The next middleware to be invoked in the pipeline.
   * @returns A promise resolving to the rawResponseBuilder.
   * @throws {AwsLambdaAdapterError} If required components are missing in the context.
   */
  async handle (context: AwsLambdaHttpAdapterContext, next: NextPipe<AwsLambdaHttpAdapterContext, AwsLambdaHttpAdapterResponseBuilder>): Promise<AwsLambdaHttpAdapterResponseBuilder> {
    const rawResponseBuilder = await next(context)

    if (context.rawEvent === undefined || context.incomingEvent === undefined || context.outgoingResponse === undefined || rawResponseBuilder?.add === undefined) {
      throw new AwsLambdaAdapterError('The context is missing required components.')
    }

    rawResponseBuilder
      .add('headers', context.outgoingResponse.headers)
      .add('statusCode', context.outgoingResponse.statusCode ?? 500)
      .add('statusMessage', context.outgoingResponse.statusMessage ?? statuses.message[context.outgoingResponse.statusCode ?? 500])

    if (!context.incomingEvent.isMethod('HEAD')) {
      if (context.outgoingResponse instanceof BinaryFileResponse) {
        rawResponseBuilder
          .add('body', context.outgoingResponse.file.getContent())
      } else {
        rawResponseBuilder
          .add('body', context.outgoingResponse.content)
          .add('charset', context.outgoingResponse.charset)
      }
    }

    return rawResponseBuilder
  }
}
