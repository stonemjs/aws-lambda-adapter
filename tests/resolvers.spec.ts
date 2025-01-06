import { IBlueprint } from '@stone-js/core'
import { AWSLambdaAdapter } from '../src/AWSLambdaAdapter'
import { AWSLambdaHttpAdapter } from '../src/AWSLambdaHttpAdapter'
import { awsLambdaAdapterResolver, awsLambdaHttpAdapterResolver } from '../src/resolvers'

const mockBlueprint = {
  get: vi.fn().mockReturnValue(() => ({}))
} as unknown as IBlueprint

describe('AwsLambdaAdapter Resolvers', () => {
  describe('awsLambdaAdapterResolver', () => {
    it('should create a Kernel instance with the correct configuration', () => {
      const adapter = awsLambdaAdapterResolver(mockBlueprint)
      expect(adapter).toBeInstanceOf(AWSLambdaAdapter)
    })
  })

  describe('awsLambdaHttpAdapterResolver', () => {
    it('should create a Kernel instance with the correct configuration', () => {
      const adapter = awsLambdaHttpAdapterResolver(mockBlueprint)
      expect(adapter).toBeInstanceOf(AWSLambdaHttpAdapter)
    })
  })
})
