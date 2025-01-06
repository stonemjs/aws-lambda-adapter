import proxyAddr from 'proxy-addr'
import { IBlueprint } from '@stone-js/core'
import { IncomingMessage } from 'node:http'
import { NextPipe } from '@stone-js/pipeline'
import { AwsLambdaAdapterError } from '../errors/AwsLambdaAdapterError'
import { getHostname, getProtocol, isIpTrusted, CookieSameSite, CookieCollection } from '@stone-js/http-core'
import { AwsLambdaHttpEvent, AwsLambdaHttpAdapterContext, AwsLambdaHttpAdapterResponseBuilder } from '../declarations'

/**
 * Represents the options for the IncomingEventMiddleware.
 */
interface HttpProxyOptions {
  trusted: string[]
  trustedIp: string[]
  untrustedIp: string[]
}

/**
 * Represents the options for cookies in IncomingEventMiddleware.
 */
interface HttpCommonCookieOptions {
  path?: string
  expires?: Date
  domain?: string
  maxAge?: number
  secure?: boolean
  httpOnly?: boolean
  sameSite?: CookieSameSite
}

/**
 * Middleware for handling incoming events and transforming them into Stone.js events.
 *
 * This class processes incoming HTTP requests, extracting relevant data such as URL, IP addresses,
 * headers, cookies, and more, and forwards them to the next middleware in the pipeline.
 */
export class IncomingEventMiddleware {
  /**
   * The blueprint for resolving configuration and dependencies.
   */
  private readonly blueprint: IBlueprint

  /**
   * Create an IncomingEventMiddleware instance.
   *
   * @param {blueprint} options - Options containing the blueprint for resolving configuration and dependencies.
   */
  constructor ({ blueprint }: { blueprint: IBlueprint }) {
    this.blueprint = blueprint
  }

  /**
   * Handles the incoming event, processes it, and invokes the next middleware in the pipeline.
   *
   * @param context - The adapter context containing the raw event, execution context, and other data.
   * @param next - The next middleware to be invoked in the pipeline.
   * @returns A promise that resolves to the processed context.
   * @throws {AwsLambdaAdapterError} If required components are missing in the context.
   */
  async handle (context: AwsLambdaHttpAdapterContext, next: NextPipe<AwsLambdaHttpAdapterContext, AwsLambdaHttpAdapterResponseBuilder>): Promise<AwsLambdaHttpAdapterResponseBuilder> {
    if ((context.rawEvent == null) || ((context.incomingEventBuilder?.add) == null)) {
      throw new AwsLambdaAdapterError('The context is missing required components.')
    }

    const proxyOptions = this.getProxyOptions()
    const cookieOptions = this.getCookieOptions()
    const url = this.extractUrl(context.rawEvent, proxyOptions)
    const ipAddresses = this.extractIpAddresses(context.rawEvent, proxyOptions)

    context
      .incomingEventBuilder
      .add('url', url)
      .add('ips', ipAddresses)
      .add('source', context.executionContext)
      .add('headers', context.rawEvent.headers)
      .add('method', this.getMethod(context.rawEvent))
      .add('queryString', context.rawEvent.queryStringParameters)
      .add('protocol', this.getProtocol(context.rawEvent, proxyOptions))
      .add('metadata', { lambda: { rawEvent: context.rawEvent, context: context.executionContext } })
      .add('cookies', CookieCollection.create(context.rawEvent.headers.cookie, cookieOptions, this.getCookieSecret()))
      .add('ip', proxyAddr(this.toNodeMessage(context.rawEvent), isIpTrusted(proxyOptions.trustedIp, proxyOptions.untrustedIp)))

    return await next(context)
  }

  /**
   * Extracts the HTTP method from the incoming rawEvent.
   *
   * @param rawEvent - The incoming rawEvent.
   * @returns The HTTP method string.
   */
  private getMethod (rawEvent: AwsLambdaHttpEvent): string {
    return rawEvent.httpMethod ??
      rawEvent.requestContext?.httpMethod ??
      rawEvent.requestContext?.http?.method ??
      'GET'
  }

  /**
   * Extracts proxy-related options from the blueprint.
   *
   * @returns Proxy options.
   */
  private getProxyOptions (): HttpProxyOptions {
    const defaultProxyOptions: HttpProxyOptions = { trusted: [], trustedIp: [], untrustedIp: [] }
    const proxyOptions = this.blueprint.get<HttpProxyOptions>('stone.http.proxies', defaultProxyOptions)
    proxyOptions.trusted = this.blueprint.get<string[]>('stone.http.hosts.trusted', [])
    return proxyOptions
  }

  /**
   * Retrieves cookie-related options from the blueprint.
   *
   * @returns Cookie options.
   */
  private getCookieOptions (): HttpCommonCookieOptions {
    return this.blueprint.get<HttpCommonCookieOptions>('stone.http.cookie.options', {})
  }

  /**
   * Retrieves the cookie secret from the blueprint.
   *
   * @returns The cookie secret string.
   */
  private getCookieSecret (): string {
    return this.blueprint.get<string>('stone.http.cookie.secret', this.blueprint.get<string>('stone.secret', ''))
  }

  /**
   * Extracts and parses the URL from the incoming rawEvent.
   *
   * @param rawEvent - The incoming HTTP rawEvent.
   * @param options - Proxy options.
   * @returns The parsed URL object.
   */
  private extractUrl (rawEvent: AwsLambdaHttpEvent, options: HttpProxyOptions): URL {
    const hostname = getHostname(this.getRemoteAddress(rawEvent), rawEvent.headers, options)
    const proto = getProtocol(this.getRemoteAddress(rawEvent), rawEvent.headers, true, options)
    return new URL(rawEvent.path ?? rawEvent.rawPath ?? '', `${String(proto)}://${String(hostname)}`)
  }

  /**
   * Extracts a list of IP addresses from the incoming rawEvent.
   *
   * @param rawEvent - The incoming HTTP rawEvent.
   * @param options - Proxy options.
   * @returns An array of IP addresses.
   */
  private extractIpAddresses (rawEvent: AwsLambdaHttpEvent, options: HttpProxyOptions): string[] {
    const isTrusted = isIpTrusted(options.trustedIp, options.untrustedIp)
    return proxyAddr.all(this.toNodeMessage(rawEvent), isTrusted).slice(1).reverse()
  }

  /**
   * Converts the incoming rawEvent to a Node.js IncomingMessage.
   *
   * @param rawEvent - The incoming rawEvent.
   * @returns The converted IncomingMessage.
   */
  private toNodeMessage (rawEvent: AwsLambdaHttpEvent): IncomingMessage {
    return {
      connection: { remoteAddress: this.getRemoteAddress(rawEvent) },
      headers: { 'x-forwarded-for': rawEvent.headers['x-forwarded-for'] ?? rawEvent.headers['X-Forwarded-For'] }
    } as unknown as IncomingMessage
  }

  /**
   * Determines the protocol from the incoming rawEvent.
   *
   * @param rawEvent - The incoming rawEvent.
   * @param options - Proxy options.
   * @returns The protocol string.
   */
  private getProtocol (rawEvent: AwsLambdaHttpEvent, options: HttpProxyOptions): string {
    return getProtocol(this.getRemoteAddress(rawEvent), rawEvent.headers, true, options)
  }

  /**
   * Retrieves the remote address from the incoming rawEvent.
   * This method is used as a fallback when the remote address is not found in the rawEvent.
   * @param rawEvent - The incoming rawEvent.
   * @returns The remote address string.
   */
  private getRemoteAddress (rawEvent: AwsLambdaHttpEvent): string {
    return rawEvent.requestContext?.http?.sourceIp ?? rawEvent.requestContext?.identity?.sourceIp ?? ''
  }
}
