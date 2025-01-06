import { Mock } from 'vitest'
import { addBlueprint } from '@stone-js/core'
import { AwsLambdaHttp, AwsLambdaHttpOptions } from '../../src/decorators/AwsLambdaHttp'
import { awsLambdaHttpAdapterBlueprint } from '../../src/options/AwsLambdaHttpAdapterBlueprint'

/* eslint-disable @typescript-eslint/no-extraneous-class */

// Mock setClassMetadata
vi.mock('@stone-js/core')

describe('AwsLambdaHttp', () => {
  it('should call setClassMetadata with correct parameters', () => {
    (addBlueprint as Mock).mockReturnValueOnce(() => {})
    const options: AwsLambdaHttpOptions = awsLambdaHttpAdapterBlueprint.stone.adapters?.[0] ?? {}
    AwsLambdaHttp(options)(class {}, {} as any)
    expect(addBlueprint).toHaveBeenCalled()
  })

  it('should call setClassMetadata with default options if none are provided', () => {
    vi.mocked(addBlueprint).mockImplementation(() => {})
    AwsLambdaHttp()(class {}, {} as any)
    expect(addBlueprint).toHaveBeenCalled()
  })
})
