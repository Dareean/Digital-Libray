import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

// Simple token store (in-memory). In production use DB or secrets manager.
const TOKENS: Record<string, { role: 'limited' | 'all-access'; owner?: string }> = {
  'token-limited-123': { role: 'limited', owner: 'studentA' },
  'token-all-456': { role: 'all-access', owner: 'studentLeader' },
}

export default class TokenAuth {
  public async handle(ctx: HttpContextContract, next: () => Promise<void>, allowedRoles?: string) {
    // Accept token via `authorization: Bearer <token>` or `x-api-key`.
    const authHeader = ctx.request.header('authorization') || ''
    const apiKey = ctx.request.header('x-api-key')

    let token = ''
    if (authHeader.toLowerCase().startsWith('bearer ')) token = authHeader.slice(7).trim()
    else if (apiKey) token = apiKey

    if (!token) {
      return ctx.response.unauthorized({ message: 'API token required' })
    }

    const record = TOKENS[token]
    if (!record) return ctx.response.unauthorized({ message: 'Invalid API token' })

    // If route requires role, check
    if (allowedRoles) {
      const roles = allowedRoles.split(',')
      if (!roles.includes(record.role)) {
        return ctx.response.forbidden({ message: 'Insufficient token permissions' })
      }
    }

    // attach token info to ctx for controllers
    ctx['apiToken'] = { token, role: record.role, owner: record.owner }

    await next()
  }
}
