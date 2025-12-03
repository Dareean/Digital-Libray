import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import axios from 'axios'
import NodeCache from 'node-cache'

// In-memory "DB" for demo purposes. In a real project use a database and models.
const BOOK_STORE: Record<string, any> = {}
let nextId = 1

const cache = new NodeCache({ stdTTL: 60 * 5 }) // 5 minutes

export default class BooksController {
  // GET /books
  public async index({ request, response }: HttpContextContract) {
    const q = request.qs() || {}
    const books = Object.values(BOOK_STORE)
    return response.ok({ data: books, meta: { total: books.length, query: q } })
  }

  // GET /books/:id
  public async show({ params, response }: HttpContextContract) {
    const book = BOOK_STORE[params.id]
    if (!book) return response.notFound({ message: 'Book not found' })
    return response.ok(book)
  }

  // POST /books  (requires token with at least 'limited')
  public async store({ request, response, apiToken }: HttpContextContract) {
    const payload = request.only(['title', 'authors', 'year', 'source'])
    if (!payload.title) return response.badRequest({ message: 'title is required' })

    const id = String(nextId++)
    const record = { id, ...payload, createdBy: apiToken?.owner || 'unknown' }
    BOOK_STORE[id] = record
    return response.created(record)
  }

  // PUT /books/:id
  public async update({ params, request, response }: HttpContextContract) {
    const book = BOOK_STORE[params.id]
    if (!book) return response.notFound({ message: 'Book not found' })
    const payload = request.only(['title', 'authors', 'year'])
    BOOK_STORE[params.id] = { ...book, ...payload }
    return response.ok(BOOK_STORE[params.id])
  }

  // DELETE /books/:id  (requires all-access)
  public async destroy({ params, response }: HttpContextContract) {
    const book = BOOK_STORE[params.id]
    if (!book) return response.notFound({ message: 'Book not found' })
    delete BOOK_STORE[params.id]
    return response.ok({ message: 'Deleted' })
  }

  // GET /external/openlibrary?q=...
  public async searchOpenLibrary({ request, response }: HttpContextContract) {
    const q = request.input('q')
    if (!q) return response.badRequest({ message: 'q parameter required' })
    const cacheKey = `openlib:${q}`
    const cached = cache.get(cacheKey)
    if (cached) return response.ok({ data: cached, cached: true })

    try {
      const res = await axios.get('https://openlibrary.org/search.json', { params: { q } })
      const docs = res.data?.docs?.slice(0, 10) || []
      cache.set(cacheKey, docs)
      return response.ok({ data: docs })
    } catch (err) {
      return response.internalServerError({ message: 'OpenLibrary request failed', error: String(err) })
    }
  }

  // GET /external/gutendex?q=...
  public async searchGutendex({ request, response }: HttpContextContract) {
    const q = request.input('q')
    if (!q) return response.badRequest({ message: 'q parameter required' })
    const cacheKey = `gutendex:${q}`
    const cached = cache.get(cacheKey)
    if (cached) return response.ok({ data: cached, cached: true })

    try {
      const res = await axios.get('https://gutendex.com/books', { params: { search: q } })
      const books = res.data?.results?.slice(0, 10) || []
      cache.set(cacheKey, books)
      return response.ok({ data: books })
    } catch (err) {
      return response.internalServerError({ message: 'Gutendex request failed', error: String(err) })
    }
  }
}
