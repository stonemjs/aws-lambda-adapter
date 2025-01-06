import bytes from 'bytes'
import typeIs from 'type-is'
import { IBlueprint } from '@stone-js/core'
import { IncomingMessage } from 'node:http'
import { NextPipe } from '@stone-js/pipeline'
import { isMultipart, getCharset, getType } from '@stone-js/http-core'
import { AwsLambdaAdapterError } from '../errors/AwsLambdaAdapterError'
import { AwsLambdaHttpAdapterContext, AwsLambdaHttpAdapterResponseBuilder, AwsLambdaHttpEvent } from '../declarations'

/**
 * Represents the configuration options for parsing the request body.
 */
interface HttpBodyOptions {
  limit: string
  defaultType: string
  defaultCharset: string
}

/**
 * Class representing a BodyEventMiddleware.
 *
 * This middleware handles platform-specific messages and transforms them into Stone.js IncomingEvent objects.
 *
 * @author Mr. Stone
 */
export class BodyEventMiddleware {
  /**
   * The blueprint for resolving configuration and dependencies.
   */
  private readonly blueprint: IBlueprint

  /**
   * Create a BodyEventMiddleware.
   *
   * @param {blueprint} options - Options for creating the BodyEventMiddleware.
   */
  constructor ({ blueprint }: { blueprint: IBlueprint }) {
    this.blueprint = blueprint
  }

  /**
   * Handles the incoming event, processes it, and invokes the next middleware in the pipeline.
   *
   * @param context - The adapter context containing the raw event, execution context, and other data.
   * @param next - The next middleware to be invoked in the pipeline.
   * @returns A promise that resolves to the destination type after processing.
   *
   * @throws {AwsLambdaAdapterError} If required components such as the rawEvent or IncomingEventBuilder are not provided.
   */
  async handle (context: AwsLambdaHttpAdapterContext, next: NextPipe<AwsLambdaHttpAdapterContext, AwsLambdaHttpAdapterResponseBuilder>): Promise<AwsLambdaHttpAdapterResponseBuilder> {
    if (context.rawEvent === undefined || context.incomingEventBuilder?.add === undefined) {
      throw new AwsLambdaAdapterError('The context is missing required components.')
    }

    if (!isMultipart(this.toNodeMessage(context.rawEvent))) {
      context.incomingEventBuilder.add('body', this.getBody(this.toNodeMessage(context.rawEvent), context.rawEvent))
    }

    return await next(context)
  }

  toNodeMessage (rawEvent: AwsLambdaHttpEvent): IncomingMessage {
    return {
      headers: {
        'content-type': rawEvent.headers['content-type'] ?? rawEvent.headers['Content-Type'],
        'content-length': rawEvent.headers['content-length'] ?? rawEvent.headers['Content-Length'],
        'transfer-encoding': rawEvent.headers['transfer-encoding'] ?? rawEvent.headers['Transfer-Encoding']
      }
    } as unknown as IncomingMessage
  }

  /**
   * Extract and parse the body from the message.
   *
   * @param message - The incoming HTTP message.
   * @returns A Promise resolving to the parsed body.
   * @throws {AwsLambdaAdapterError} If the body parsing fails or is invalid.
   */
  private getBody (message: IncomingMessage, rawEvent: AwsLambdaHttpEvent): unknown {
    if (!typeIs.hasBody(message)) {
      return {}
    }

    const defaultOptions = { limit: '100kb', defaultType: 'text/plain', defaultCharset: 'utf-8' }
    const { defaultType, defaultCharset, limit: rawLimit } = this.blueprint.get<HttpBodyOptions>('stone.http.body', defaultOptions)
    const limit = bytes.parse(rawLimit) ?? 100000
    const encoding = getCharset(message, defaultCharset)
    const type = getType(message, defaultType)

    if (typeIs.is(type, ['urlencoded', 'json', 'text', 'bin']) === false) {
      return {}
    }

    const stringifiedBody = typeof rawEvent.body === 'string'
      ? rawEvent.body
      : (typeof rawEvent.body === 'object' && rawEvent.body !== null
          ? JSON.stringify(rawEvent.body)
          : ''
        )

    if (Buffer.byteLength(stringifiedBody, encoding as BufferEncoding) > limit) {
      throw new AwsLambdaAdapterError('The context is missing required components.')
    }

    return rawEvent.body
  }
}
