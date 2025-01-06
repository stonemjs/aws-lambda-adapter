import { Mock } from 'vitest'
import { addBlueprint } from '@stone-js/core'
import { AwsLambda, AwsLambdaOptions } from '../../src/decorators/AwsLambda'
import { awsLambdaAdapterBlueprint } from '../../src/options/AwsLambdaAdapterBlueprint'

/* eslint-disable @typescript-eslint/no-extraneous-class */

// Mock setClassMetadata
vi.mock('@stone-js/core')

describe('AwsLambda', () => {
  it('should call setClassMetadata with correct parameters', () => {
    (addBlueprint as Mock).mockReturnValueOnce(() => {})
    const options: AwsLambdaOptions = awsLambdaAdapterBlueprint.stone.adapters?.[0] ?? {}
    AwsLambda(options)(class {}, {} as any)
    expect(addBlueprint).toHaveBeenCalled()
  })

  it('should call setClassMetadata with default options if none are provided', () => {
    vi.mocked(addBlueprint).mockImplementation(() => {})
    AwsLambda()(class {}, {} as any)
    expect(addBlueprint).toHaveBeenCalled()
  })
})
