import { AWSLambdaAdapter } from './AWSLambdaAdapter'
import { AWSLambdaHttpAdapter } from './AWSLambdaHttpAdapter'
import { AdapterHooks, AdapterResolver, defaultKernelResolver, defaultLoggerResolver, IBlueprint } from '@stone-js/core'

/**
 * Adapter resolver for generic AWS Lambda adapter.
 *
 * Creates and configures an `AWSLambdaAdapter` for handling generic events in AWS Lambda.
 *
 * @param blueprint - The `IBlueprint` providing configuration and dependencies.
 * @returns An `AWSLambdaAdapter` instance.
 */
export const awsLambdaAdapterResolver: AdapterResolver = (blueprint: IBlueprint) => {
  const hooks = blueprint.get<AdapterHooks>('stone.adapter.hooks', {})
  const loggerResolver = blueprint.get('stone.logger.resolver', defaultLoggerResolver)
  const handlerResolver = blueprint.get('stone.kernel.resolver', defaultKernelResolver)

  return AWSLambdaAdapter.create({
    hooks,
    blueprint,
    handlerResolver,
    logger: loggerResolver(blueprint)
  })
}

/**
 * Adapter resolver for AWS Lambda HTTP adapter.
 *
 * Creates and configures an `AWSLambdaHttpAdapter` for handling HTTP events in AWS Lambda.
 *
 * @param blueprint - The `IBlueprint` providing configuration and dependencies.
 * @returns An `AWSLambdaHttpAdapter` instance.
 */
export const awsLambdaHttpAdapterResolver: AdapterResolver = (blueprint: IBlueprint) => {
  const hooks = blueprint.get<AdapterHooks>('stone.adapter.hooks', {})
  const loggerResolver = blueprint.get('stone.logger.resolver', defaultLoggerResolver)
  const handlerResolver = blueprint.get('stone.kernel.resolver', defaultKernelResolver)

  return AWSLambdaHttpAdapter.create({
    hooks,
    blueprint,
    handlerResolver,
    logger: loggerResolver(blueprint)
  })
}
