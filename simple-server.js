// Simplified standalone server (no full Adonis required for demo)
const http = require('http')
const url = require('url')
const axios = require('axios')
const NodeCache = require('node-cache')
const fs = require('fs')
const path = require('path')

const cache = new NodeCache({ stdTTL: 300 }) // 5 minutes
const BOOK_STORE = {}
const BOOK_REQUESTS = {}
let nextId = 1
let nextRequestId = 1

// Add sample books for demo
BOOK_STORE['1'] = {
  id: '1',
  title: 'The Great Gatsby',
  authors: ['F. Scott Fitzgerald'],
  year: 1925,
  status: 'available',
  description: 'A Jazz Age tragedy that dissects excess, longing, and the pursuit of the American Dream through Jay Gatsby\'s eyes.',
  coverImage: 'https://covers.openlibrary.org/b/id/8225631-L.jpg',
  externalLink: 'https://openlibrary.org/works/OL2768886W',
  content: 'So we beat on, boats against the current, borne back ceaselessly into the past.',
  createdBy: 'system'
}
BOOK_STORE['2'] = {
  id: '2',
  title: '1984',
  authors: ['George Orwell'],
  year: 1949,
  status: 'available',
  description: 'A dystopian masterwork that warns against omnipresent surveillance, linguistic manipulation, and authoritarian rule.',
  coverImage: 'https://covers.openlibrary.org/b/id/7222246-L.jpg',
  externalLink: 'https://openlibrary.org/works/OL7343627W',
  content: 'Big Brother is Watching You.',
  createdBy: 'system'
}
BOOK_STORE['3'] = {
  id: '3',
  title: 'To Kill a Mockingbird',
  authors: ['Harper Lee'],
  year: 1960,
  status: 'available',
  description: 'Scout Finch recounts childhood lessons on empathy, courage, and justice in the Jim Crow South.',
  coverImage: 'https://covers.openlibrary.org/b/id/8225261-L.jpg',
  externalLink: 'https://openlibrary.org/works/OL82563W',
  content: 'Real courage is when you know you\'re licked before you begin, but you begin anyway and see it through.',
  createdBy: 'system'
}
nextId = 4

const TOKENS = {
  'token-limited-123': { role: 'limited', owner: 'studentA' },
  'token-all-456': { role: 'all-access', owner: 'studentLeader' },
  'token-user-123': { role: 'limited', owner: 'user' },
  'token-admin-456': { role: 'all-access', owner: 'admin' },
}

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
}

// Helper to serve static files
function serveStaticFile(res, filePath) {
  const extname = path.extname(filePath)
  const contentType = MIME_TYPES[extname] || 'application/octet-stream'
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('404 Not Found')
      } else {
        res.writeHead(500)
        res.end('Server Error')
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType })
      res.end(content)
    }
  })
}

// Helper to parse JSON body
async function parseBody(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', chunk => body += chunk.toString())
    req.on('end', () => {
      try {
        resolve(JSON.parse(body))
      } catch {
        resolve({})
      }
    })
  })
}

function normalizeAuthors(value) {
  if (Array.isArray(value)) {
    return value.map((author) => String(author).trim()).filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((author) => author.trim())
      .filter(Boolean)
  }

  return []
}

// Auth middleware
function checkAuth(req, requiredRoles = []) {
  const authHeader = req.headers['authorization'] || ''
  const apiToken = req.headers['x-api-token']
  
  let token = ''
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.slice(7).trim()
  } else if (apiToken) {
    token = apiToken
  }

  if (!token) return { error: 'API token required', status: 401 }
  
  const record = TOKENS[token]
  if (!record) return { error: 'Invalid API token', status: 401 }
  
  if (requiredRoles.length > 0 && !requiredRoles.includes(record.role)) {
    return { error: 'Insufficient token permissions', status: 403 }
  }
  
  return { user: record }
}

// Load OpenAPI spec
let openApiSpec = null
try {
  const YAML = require('yamljs')
  openApiSpec = YAML.load(path.join(__dirname, 'docs', 'openapi.yaml'))
} catch (err) {
  console.warn('Could not load OpenAPI spec:', err.message)
}

// Router
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true)
  const pathname = parsedUrl.pathname
  const query = parsedUrl.query
  const method = req.method

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-token')
  
  if (method === 'OPTIONS') {
    res.writeHead(200)
    return res.end()
  }

  // Serve static files from public directory
  if (method === 'GET' && !pathname.startsWith('/api') && !pathname.startsWith('/books') && 
      !pathname.startsWith('/external') && pathname !== '/health' && pathname !== '/docs') {
    let filePath
    
    if (pathname === '/') {
      filePath = path.join(__dirname, 'public', 'login.html')
    } else {
      filePath = path.join(__dirname, 'public', pathname)
    }
    
    return serveStaticFile(res, filePath)
  }

  // JSON response helper
  const jsonResponse = (data, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data))
  }

  console.log(`${method} ${pathname}`)

  try {
    // Health check
    if (pathname === '/health' && method === 'GET') {
      return jsonResponse({ status: 'ok' })
    }

    // Swagger UI
    if (pathname === '/api-docs' || pathname === '/docs') {
      res.writeHead(200, { 'Content-Type': 'text/html' })
      return res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Digital Library API Docs</title>
          <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui.css" />
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
    }

    if (pathname === '/api-docs/spec' && method === 'GET') {
      return jsonResponse(openApiSpec || { info: { title: 'API', version: '1.0' }, paths: {} })
    }

    // GET /books
    if (pathname === '/books' && method === 'GET') {
      const books = Object.values(BOOK_STORE)
      return jsonResponse(books)
    }

    // GET /books/:id
    if (pathname.match(/^\/books\/\w+$/) && method === 'GET') {
      const id = pathname.split('/')[2]
      const book = BOOK_STORE[id]
      if (!book) return jsonResponse({ message: 'Book not found' }, 404)
      return jsonResponse(book)
    }

    // POST /books (requires auth)
    if (pathname === '/books' && method === 'POST') {
      const auth = checkAuth(req, ['all-access'])
      if (auth.error) return jsonResponse({ message: auth.error }, auth.status)

      const body = await parseBody(req)
      if (!body.title) return jsonResponse({ message: 'title is required' }, 400)

      const id = String(nextId++)
      const book = { id, ...body, createdBy: auth.user.owner }
      BOOK_STORE[id] = book
      return jsonResponse(book, 201)
    }

    // PUT /books/:id (requires auth)
    if (pathname.match(/^\/books\/\w+$/) && method === 'PUT') {
      const auth = checkAuth(req, ['all-access'])
      if (auth.error) return jsonResponse({ message: auth.error }, auth.status)

      const id = pathname.split('/')[2]
      const book = BOOK_STORE[id]
      if (!book) return jsonResponse({ message: 'Book not found' }, 404)

      const body = await parseBody(req)
      BOOK_STORE[id] = { ...book, ...body }
      return jsonResponse(BOOK_STORE[id])
    }

    // DELETE /books/:id (requires all-access)
    if (pathname.match(/^\/books\/\w+$/) && method === 'DELETE') {
      const auth = checkAuth(req, ['all-access'])
      if (auth.error) return jsonResponse({ message: auth.error }, auth.status)

      const id = pathname.split('/')[2]
      const book = BOOK_STORE[id]
      if (!book) return jsonResponse({ message: 'Book not found' }, 404)

      delete BOOK_STORE[id]
      return jsonResponse({ message: 'Deleted' })
    }

    // GET /requests (admin only)
    if (pathname === '/requests' && method === 'GET') {
      const auth = checkAuth(req, ['all-access'])
      if (auth.error) return jsonResponse({ message: auth.error }, auth.status)

      const requests = Object.values(BOOK_REQUESTS).sort((a, b) => b.createdAt - a.createdAt)
      return jsonResponse({ data: requests })
    }

    // POST /requests
    if (pathname === '/requests' && method === 'POST') {
      const auth = checkAuth(req, ['limited', 'all-access'])
      if (auth.error) return jsonResponse({ message: auth.error }, auth.status)

      const body = await parseBody(req)
      const title = (body.title || '').trim()
      if (!title) return jsonResponse({ message: 'title is required' }, 400)

      const id = String(nextRequestId++)
      const record = {
        id,
        title,
        authors: normalizeAuthors(body.authors),
        reason: (body.reason || '').trim(),
        additionalNotes: (body.additionalNotes || '').trim(),
        externalLink: (body.externalLink || '').trim(),
        requesterName: (body.requesterName || auth.user.owner || 'unknown').trim(),
        requesterEmail: (body.requesterEmail || '').trim(),
        status: 'pending',
        adminNote: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      BOOK_REQUESTS[id] = record
      return jsonResponse(record, 201)
    }

    // PUT /requests/:id (admin only)
    if (pathname.match(/^\/requests\/\w+$/) && method === 'PUT') {
      const auth = checkAuth(req, ['all-access'])
      if (auth.error) return jsonResponse({ message: auth.error }, auth.status)

      const id = pathname.split('/')[2]
      const existing = BOOK_REQUESTS[id]
      if (!existing) return jsonResponse({ message: 'Request not found' }, 404)

      const body = await parseBody(req)
      const validStatuses = ['pending', 'approved', 'rejected']
      if (body.status && !validStatuses.includes(body.status)) {
        return jsonResponse({ message: 'Invalid status value' }, 400)
      }

      BOOK_REQUESTS[id] = {
        ...existing,
        status: body.status || existing.status,
        adminNote: body.adminNote !== undefined ? String(body.adminNote) : existing.adminNote,
        updatedAt: Date.now(),
      }

      return jsonResponse(BOOK_REQUESTS[id])
    }

    // DELETE /requests/:id (admin only)
    if (pathname.match(/^\/requests\/\w+$/) && method === 'DELETE') {
      const auth = checkAuth(req, ['all-access'])
      if (auth.error) return jsonResponse({ message: auth.error }, auth.status)

      const id = pathname.split('/')[2]
      const existing = BOOK_REQUESTS[id]
      if (!existing) return jsonResponse({ message: 'Request not found' }, 404)

      delete BOOK_REQUESTS[id]
      return jsonResponse({ message: 'Deleted' })
    }

    // GET /external/openlibrary
    if (pathname === '/external/openlibrary' && method === 'GET') {
      const auth = checkAuth(req, ['limited', 'all-access'])
      if (auth.error) return jsonResponse({ message: auth.error }, auth.status)

      const q = query.q
      if (!q) return jsonResponse({ message: 'q parameter required' }, 400)

      const cacheKey = `openlib:${q}`
      const cached = cache.get(cacheKey)
      if (cached) return jsonResponse({ data: cached, cached: true })

      try {
        const response = await axios.get('https://openlibrary.org/search.json', { params: { q } })
        const docs = (response.data?.docs || []).slice(0, 10)
        cache.set(cacheKey, docs)
        return jsonResponse({ data: docs })
      } catch (err) {
        return jsonResponse({ message: 'OpenLibrary request failed', error: err.message }, 500)
      }
    }

    // GET /external/gutendex
    if (pathname === '/external/gutendex' && method === 'GET') {
      const auth = checkAuth(req, ['limited', 'all-access'])
      if (auth.error) return jsonResponse({ message: auth.error }, auth.status)

      const q = query.q
      if (!q) return jsonResponse({ message: 'q parameter required' }, 400)

      const cacheKey = `gutendex:${q}`
      const cached = cache.get(cacheKey)
      if (cached) return jsonResponse({ data: cached, cached: true })

      try {
        const response = await axios.get('https://gutendex.com/books', { params: { search: q } })
        const books = (response.data?.results || []).slice(0, 10)
        cache.set(cacheKey, books)
        return jsonResponse({ data: books })
      } catch (err) {
        return jsonResponse({ message: 'Gutendex request failed', error: err.message }, 500)
      }
    }

    // 404
    jsonResponse({ message: 'Not found' }, 404)

  } catch (error) {
    console.error('Server error:', error)
    jsonResponse({ message: 'Internal server error', error: error.message }, 500)
  }
})

const PORT = process.env.PORT || 3333
const HOST = '127.0.0.1' // Explicit localhost for Windows compatibility

server.on('error', (err) => {
  console.error('❌ Server Error:', err.message)
  if (err.code === 'EADDRINUSE') {
    console.error(`   Port ${PORT} is already in use. Try: netstat -ano | findstr :${PORT}`)
  }
  process.exit(1)
})

server.listen(PORT, HOST, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 Digital Library API Server                          ║
║                                                           ║
║   Server running at: http://${HOST}:${PORT}         ║
║   API Docs: http://${HOST}:${PORT}/api-docs        ║
║   Health Check: http://${HOST}:${PORT}/health      ║
║                                                           ║
║   Available Tokens:                                       ║
║   - Limited: token-limited-123                            ║
║   - Admin: token-all-456                                  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `)
  
  // Self-test
  setTimeout(async () => {
    try {
      const testRes = await axios.get(`http://${HOST}:${PORT}/health`)
      console.log('✅ Server self-test passed:', testRes.data)
    } catch (err) {
      console.error('❌ Server self-test failed:', err.message)
      console.error('   Server may not be accessible. Check firewall settings.')
    }
  }, 1000)
})

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err)
  process.exit(1)
})

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err)
  process.exit(1)
})
