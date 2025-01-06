import mime from 'mime/lite'
import accepts from 'accepts'
import statuses from 'statuses'
import { HTTP_INTERNAL_SERVER_ERROR } from '@stone-js/http-core'
import { AwsLambdaContext, AwsLambdaHttpEvent, RawHttpResponse } from './declarations'
import { IntegrationError, AdapterErrorContext, IAdapterErrorHandler, ILogger } from '@stone-js/core'

/**
 * AwsLambdaHttpErrorHandler options.
 */
export interface AwsLambdaHttpErrorHandlerOptions {
  logger: ILogger
}

/**
 * Class representing an AwsLambdaHttpErrorHandler.
 */
export class AwsLambdaHttpErrorHandler implements IAdapterErrorHandler<AwsLambdaHttpEvent, RawHttpResponse, AwsLambdaContext> {
  private readonly logger: ILogger

  /**
   * Create an AwsLambdaHttpErrorHandler.
   *
   * @param options - AwsLambdaHttpErrorHandler options.
   */
  constructor ({ logger }: AwsLambdaHttpErrorHandlerOptions) {
    if (logger === undefined) {
      throw new IntegrationError('Logger is required to create an AwsLambdaHttpErrorHandler instance.')
    }

    this.logger = logger
  }

  /**
   * Handle an error.
   *
   * @param error - The error to handle.
   * @param context - The context of the adapter.
   * @returns The raw response.
   */
  public async handle (error: Error, context: AdapterErrorContext<AwsLambdaHttpEvent, RawHttpResponse, AwsLambdaContext>): Promise<RawHttpResponse> {
    const type = accepts(context.rawEvent as any).type(['json', 'html']) as string | false
    const contentType = mime.getType(type !== false ? type : 'txt') ?? 'text/plain'
    const headers = new Headers({ 'Content-Type': contentType })

    context
      .rawResponseBuilder
      .add('headers', headers)
      .add('statusCode', HTTP_INTERNAL_SERVER_ERROR)
      .add('statusMessage', statuses.message[HTTP_INTERNAL_SERVER_ERROR])

    this.logger.error(error.message, { error })

    return await context.rawResponseBuilder.build().respond()
  }
}
