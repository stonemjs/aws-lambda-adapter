import { AWS_LAMBDA_HTTP_PLATFORM } from '../constants'
import { awsLambdaHttpAdapterResolver } from '../resolvers'
import { AdapterConfig, StoneBlueprint } from '@stone-js/core'
import { AwsLambdaHttpErrorHandler } from '../AwsLambdaHttpErrorHandler'
import { IncomingHttpEvent, OutgoingHttpResponse } from '@stone-js/http-core'
import { IncomingEventMiddleware } from '../middleware/IncomingEventMiddleware'
import { ServerResponseMiddleware } from '../middleware/ServerResponseMiddleware'

/**
 * Configuration interface for the AWS Lambda Http Adapter.
 *
 * Extends the `AdapterConfig` interface from the Stone.js framework and provides
 * customizable options specific to the AWS Lambda platform. This includes
 * alias, resolver, middleware, hooks, and various adapter state flags.
 */
export interface AwsLambdaHttpAdapterConfig extends AdapterConfig {}

/**
 * Blueprint interface for the AWS Lambda Http Adapter.
 *
 * This interface extends `StoneBlueprint` and defines the structure of the
 * AWS Lambda Http adapter blueprint used in the Stone.js framework. It includes
 * a `stone` object with an array of `AwsLambdaHttpAdapterConfig` items.
 */
export interface AwsLambdaHttpAdapterBlueprint extends StoneBlueprint<IncomingHttpEvent, OutgoingHttpResponse> {}

/**
 * Default blueprint configuration for the AWS Lambda Http Adapter.
 *
 * This blueprint defines the initial configuration for the AWS Lambda Http adapter
 * within the Stone.js framework. It includes:
 * - An alias for the AWS Lambda platform (`AWS_LAMBDA_HTTP_PLATFORM`).
 * - A default resolver function (currently a placeholder).
 * - Middleware, hooks, and state flags (`current`, `default`, `preferred`).
 */
export const awsLambdaHttpAdapterBlueprint: AwsLambdaHttpAdapterBlueprint = {
  stone: {
    adapters: [
      {
        platform: AWS_LAMBDA_HTTP_PLATFORM,
        resolver: awsLambdaHttpAdapterResolver,
        middleware: [
          { priority: 0, pipe: IncomingEventMiddleware },
          { priority: 10, pipe: ServerResponseMiddleware }
        ],
        hooks: {},
        errorHandlers: {
          default: AwsLambdaHttpErrorHandler
        },
        current: false,
        default: false
      }
    ]
  }
}
