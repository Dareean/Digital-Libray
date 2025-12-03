import Server from '@ioc:Adonis/Core/Server'

/*
|--------------------------------------------------------------------------
| Global Middleware
|--------------------------------------------------------------------------
*/
Server.middleware.register([
  () => import('@ioc:Adonis/Core/BodyParser'),
])

/*
|--------------------------------------------------------------------------
| Named Middleware
|--------------------------------------------------------------------------
*/
Server.middleware.registerNamed({
  token: () => import('App/Middleware/TokenAuth'),
})
