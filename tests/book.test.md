Test cases (manual or automated)

Precondition: server running at http://localhost:3333
Sample tokens:
- Limited: `token-limited-123` (role limited)
- Admin: `token-all-456` (role all-access)

1) Health check
- Request: GET /health
- Expect: 200 OK, body { status: 'ok' }

2) Unauthorized create
- Request: POST /books with payload { title: 'Test' } without token
- Expect: 401 Unauthorized

3) Create book with limited token
- Request: POST /books with header `Authorization: Bearer token-limited-123` and payload { title: 'Test Book', authors: ['Alice'] }
- Expect: 201 Created, response body contains `id` and `title`

4) Forbidden delete with limited token
- Request: DELETE /books/{id} with `Authorization: Bearer token-limited-123`
- Expect: 403 Forbidden

5) Delete with admin token
- Request: DELETE /books/{id} with `Authorization: Bearer token-all-456`
- Expect: 200 OK and subsequent GET /books/{id} returns 404

6) External API search (Open Library)
- Request: GET /external/openlibrary?q=tolkien with limited token
- Expect: 200 OK and list of results

7) External API search (Gutendex)
- Request: GET /external/gutendex?q=pride with limited token
- Expect: 200 OK and list of results

Notes on automation:
- You can convert these to Jest+supertest tests; they assume server is running.
- To capture results for the report, run tests and take screenshots of terminal output and Swagger UI.