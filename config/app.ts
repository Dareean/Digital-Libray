import Env from '@ioc:Adonis/Core/Env'
import { serverConfig } from '@adonisjs/core/build/standalone'

export default serverConfig({
  cookie: {
    domain: '',
    path: '/',
    maxAge: '2h',
    httpOnly: true,
    secure: false,
    sameSite: false,
  },
  allowMethodSpoofing: false,
  trustProxy: Env.get('TRUST_PROXY', false),
  etag: false,
  jsonpCallbackName: 'callback',
  generateRequestId: false,
})
