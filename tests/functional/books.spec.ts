import test from '@japa/runner'
import supertest from 'supertest'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3333'
const LIMITED_TOKEN = 'token-limited-123'
const ADMIN_TOKEN = 'token-all-456'

test.group('Digital Library API Tests', () => {
  let createdBookId: string

  test('should return health check', async ({ assert }) => {
    const response = await supertest(BASE_URL).get('/health')
    assert.equal(response.status, 200)
    assert.equal(response.body.status, 'ok')
  })

  test('should return 401 when creating book without token', async ({ assert }) => {
    const response = await supertest(BASE_URL)
      .post('/books')
      .send({ title: 'Test Book' })
      .expect(401)
    assert.exists(response.body.message)
  })

  test('should create book with limited token', async ({ assert }) => {
    const response = await supertest(BASE_URL)
      .post('/books')
      .set('Authorization', `Bearer ${LIMITED_TOKEN}`)
      .send({ title: 'Test Book', authors: ['Alice'], year: 2023 })
      .expect(201)
    
    assert.exists(response.body.id)
    assert.equal(response.body.title, 'Test Book')
    createdBookId = response.body.id
  })

  test('should get created book', async ({ assert }) => {
    const response = await supertest(BASE_URL)
      .get(`/books/${createdBookId}`)
      .expect(200)
    
    assert.equal(response.body.title, 'Test Book')
  })

  test('should return 403 when deleting with limited token', async ({ assert }) => {
    await supertest(BASE_URL)
      .delete(`/books/${createdBookId}`)
      .set('Authorization', `Bearer ${LIMITED_TOKEN}`)
      .expect(403)
  })

  test('should delete book with admin token', async ({ assert }) => {
    await supertest(BASE_URL)
      .delete(`/books/${createdBookId}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .expect(200)
  })

  test('should search Open Library', async ({ assert }) => {
    const response = await supertest(BASE_URL)
      .get('/external/openlibrary?q=tolkien')
      .set('Authorization', `Bearer ${LIMITED_TOKEN}`)
      .expect(200)
    
    assert.isArray(response.body.data)
  })

  test('should search Gutendex', async ({ assert }) => {
    const response = await supertest(BASE_URL)
      .get('/external/gutendex?q=pride')
      .set('Authorization', `Bearer ${LIMITED_TOKEN}`)
      .expect(200)
    
    assert.isArray(response.body.data)
  })
})
