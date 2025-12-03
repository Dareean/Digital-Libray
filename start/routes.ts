import Route from '@ioc:Adonis/Core/Route'
import swaggerUi from 'swagger-ui-express'
import YAML from 'yamljs'
import path from 'path'

// Swagger UI
const swaggerDocument = YAML.load(path.join(__dirname, '../docs/openapi.yaml'))
Route.get('/docs', async ({ response }) => {
  return response.redirect('/api-docs')
})

// Mount Swagger UI using raw Express middleware
import Application from '@ioc:Adonis/Core/Application'
Route.any('/api-docs*', async ({ request, response }) => {
  const swaggerMiddleware = swaggerUi.setup(swaggerDocument)
  const serve = swaggerUi.serve

  // Simple proxy to express middleware
  if (request.url().endsWith('/api-docs') || request.url().endsWith('/api-docs/')) {
    const html = swaggerUi.generateHTML(swaggerDocument)
    return response.type('text/html').send(html)
  }
  
  response.type('text/html').send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>API Docs</title>
      <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui.css" />
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui-bundle.js"></script>
      <script>
        window.onload = function() {
          SwaggerUIBundle({
            url: '/api-docs/spec',
            dom_id: '#swagger-ui',
          })
        }
      </script>
    </body>
    </html>
  `)
})

Route.get('/api-docs/spec', async ({ response }) => {
  return response.json(swaggerDocument)
})

// Books endpoints
Route.get('/books', 'BooksController.index')
Route.get('/books/:id', 'BooksController.show')
// Create requires token (limited or all-access): we pass middleware param 'limited,all-access'
Route.post('/books', 'BooksController.store').middleware('token:limited,all-access')
Route.put('/books/:id', 'BooksController.update').middleware('token:limited,all-access')
// Delete requires all-access
Route.delete('/books/:id', 'BooksController.destroy').middleware('token:all-access')

// External API proxies (require token)
Route.get('/external/openlibrary', 'BooksController.searchOpenLibrary').middleware('token:limited,all-access')
Route.get('/external/gutendex', 'BooksController.searchGutendex').middleware('token:limited,all-access')

// Health
Route.get('/health', async () => ({ status: 'ok' }))
