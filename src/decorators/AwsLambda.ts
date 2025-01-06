import deepmerge from 'deepmerge'
import { addBlueprint, ClassType } from '@stone-js/core'
import { awsLambdaAdapterBlueprint, AwsLambdaAdapterConfig } from '../options/AwsLambdaAdapterBlueprint'

/**
 * Configuration options for the `AwsLambda` decorator.
 * These options extend the default AWS Lambda adapter configuration.
 */
export interface AwsLambdaOptions extends Partial<AwsLambdaAdapterConfig> {}

/**
 * A Stone.js decorator that integrates the AWS Lambda Adapter with a class.
 *
 * This decorator modifies the class to seamlessly enable AWS Lambda as the
 * execution environment for a Stone.js application. By applying this decorator,
 * the class is automatically configured with the necessary blueprint for AWS Lambda.
 *
 * @template T - The type of the class being decorated. Defaults to `ClassType`.
 * @param options - Optional configuration to customize the AWS Lambda Adapter.
 *
 * @returns A class decorator that applies the AWS Lambda adapter configuration.
 *
 * @example
 * ```typescript
 * import { AwsLambda } from '@stone-js/aws-lambda-adapter';
 *
 * @AwsLambda({
 *   alias: 'MyAWSLambda',
 * })
 * class App {
 *   // Your application logic here
 * }
 * ```
 */
export const AwsLambda = <T extends ClassType = ClassType>(
  options: AwsLambdaOptions = {}
): ((target: T, context: ClassDecoratorContext<T>) => void) => {
  return (target: T, context: ClassDecoratorContext<T>) => {
    if (awsLambdaAdapterBlueprint.stone?.adapters?.[0] !== undefined) {
      // Merge provided options with the default AWS Lambda adapter blueprint.
      awsLambdaAdapterBlueprint.stone.adapters[0] = deepmerge(awsLambdaAdapterBlueprint.stone.adapters[0], options)
    }

    // Add the modified blueprint to the target class.
    addBlueprint(target, context, awsLambdaAdapterBlueprint)
  }
}
