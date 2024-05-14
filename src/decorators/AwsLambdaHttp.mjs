import { classLevelDecoratorChecker, merge } from '@stone-js/common'
import { AWS_LAMBDA_HTTP_PLATFORM } from '@stonejs-community/aws-lambda-adapter'
import { awsHttpAdapterOptions } from '@stonejs-community/aws-lambda-adapter/config'

/**
 * AwsLambda Decorator: Useful for customizing classes to ensure applications run smoothly on specific platforms.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @memberOf Decorators
 * @param  {adapterOptions} options
 * @return {Function}
 */
export const AwsLambdaHttp = (options = {}) => {
  return (target) => {
    classLevelDecoratorChecker(target)

    const metadata = {
      adapters: [
        merge(awsHttpAdapterOptions.adapters[0], {
          app: {
            adapter: {
              default: options.default ?? false,
              alias: options.alias ?? AWS_LAMBDA_HTTP_PLATFORM
            },
            mapper: {
              input: {
                middleware: options.input ?? []
              },
              output: {
                middleware: options.output ?? []
              }
            }
          }
        })
      ]
    }

    target.$$metadata$$ = merge(target.$$metadata$$ ?? {}, metadata)

    return target
  }
}
