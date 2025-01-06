import deepmerge from 'deepmerge'
import { addBlueprint, ClassType } from '@stone-js/core'
import { awsLambdaHttpAdapterBlueprint, AwsLambdaHttpAdapterConfig } from '../options/AwsLambdaHttpAdapterBlueprint'

/**
 * Configuration options for the `AwsLambdaHttp` decorator.
 * These options extend the default AWS Lambda HTTP adapter configuration.
 */
export interface AwsLambdaHttpOptions extends Partial<AwsLambdaHttpAdapterConfig> {}

/**
 * A Stone.js decorator that integrates the AWS Lambda HTTP Adapter with a class.
 *
 * This decorator modifies the class to seamlessly enable AWS Lambda HTTP as the
 * execution environment for a Stone.js application. By applying this decorator,
 * the class is automatically configured with the necessary blueprint for AWS Lambda HTTP.
 *
 * @template T - The type of the class being decorated. Defaults to `ClassType`.
 * @param options - Optional configuration to customize the AWS Lambda HTTP Adapter.
 *
 * @returns A class decorator that applies the AWS Lambda HTTP adapter configuration.
 *
 * @example
 * ```typescript
 * import { AwsLambdaHttp } from '@stone-js/aws-lambda-adapter';
 *
 * @AwsLambdaHttp({
 *   alias: 'MyAwsLambdaHttpAdapter',
 *   current: true,
 * })
 * class App {
 *   // Your application logic here
 * }
 * ```
 */
export const AwsLambdaHttp = <T extends ClassType = ClassType>(
  options: AwsLambdaHttpOptions = {}
): ((target: T, context: ClassDecoratorContext<T>) => void) => {
  return (target: T, context: ClassDecoratorContext<T>) => {
    if (awsLambdaHttpAdapterBlueprint.stone?.adapters?.[0] !== undefined) {
      // Merge provided options with the default AWS Lambda HTTP adapter blueprint.
      awsLambdaHttpAdapterBlueprint.stone.adapters[0] = deepmerge(awsLambdaHttpAdapterBlueprint.stone.adapters[0], options)
    }

    // Add the modified blueprint to the target class.
    addBlueprint(target, context, awsLambdaHttpAdapterBlueprint)
  }
}
