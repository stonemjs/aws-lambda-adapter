import { HTTP_INTERNAL_SERVER_ERROR } from '@stone-js/http-core'
import { AwsLambdaContext, AwsLambdaEvent, RawResponse } from './declarations'
import { IntegrationError, AdapterErrorContext, IAdapterErrorHandler, ILogger } from '@stone-js/core'

/**
 * AwsLambdaErrorHandler options.
 */
export interface AwsLambdaErrorHandlerOptions {
  logger: ILogger
}

/**
 * Class representing an AwsLambdaErrorHandler.
 */
export class AwsLambdaErrorHandler implements IAdapterErrorHandler<AwsLambdaEvent, RawResponse, AwsLambdaContext> {
  private readonly logger: ILogger

  /**
   * Create an AwsLambdaErrorHandler.
   *
   * @param options - AwsLambdaErrorHandler options.
   */
  constructor ({ logger }: AwsLambdaErrorHandlerOptions) {
    if (logger === undefined) {
      throw new IntegrationError('Logger is required to create an AwsLambdaErrorHandler instance.')
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
  public async handle (error: Error, context: AdapterErrorContext<AwsLambdaEvent, RawResponse, AwsLambdaContext>): Promise<RawResponse> {
    context
      .rawResponseBuilder
      .add('statusCode', HTTP_INTERNAL_SERVER_ERROR)

    this.logger.error(error.message, { error })

    return await context.rawResponseBuilder.build().respond()
  }
}
