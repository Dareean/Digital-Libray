const axios = require('axios')

const BASE_URL = 'http://127.0.0.1:3333'
const LIMITED_TOKEN = 'token-limited-123'
const ADMIN_TOKEN = 'token-all-456'

let createdBookId = null

async function runTests() {
  console.log('=== Digital Library API - Automated Tests ===\n')

  try {
    // Test 1: Health check
    console.log('Test 1: Health check')
    const health = await axios.get(`${BASE_URL}/health`)
    console.assert(health.status === 200 && health.data.status === 'ok', 'Health check failed')
    console.log('✓ PASS: Health endpoint returns 200 OK\n')

    // Test 2: Unauthorized create (no token)
    console.log('Test 2: Unauthorized create without token')
    try {
      await axios.post(`${BASE_URL}/books`, { title: 'Test Book' })
      console.log('✗ FAIL: Should have returned 401\n')
    } catch (err) {
      if (err.response && err.response.status === 401) {
        console.log('✓ PASS: Returns 401 Unauthorized without token\n')
      } else {
        console.log('✗ FAIL: Unexpected error:', err.message, '\n')
      }
    }

    // Test 3: Create book with limited token
    console.log('Test 3: Create book with limited token')
    const createRes = await axios.post(
      `${BASE_URL}/books`,
      { title: 'Test Book', authors: ['Alice'], year: 2023 },
      { headers: { Authorization: `Bearer ${LIMITED_TOKEN}` } }
    )
    console.assert(createRes.status === 201, 'Create failed')
    console.assert(createRes.data.id, 'No ID in response')
    createdBookId = createRes.data.id
    console.log('✓ PASS: Book created successfully, ID:', createdBookId, '\n')

    // Test 4: Get created book
    console.log('Test 4: Get created book')
    const getRes = await axios.get(`${BASE_URL}/books/${createdBookId}`)
    console.assert(getRes.status === 200, 'Get failed')
    console.assert(getRes.data.title === 'Test Book', 'Title mismatch')
    console.log('✓ PASS: Retrieved book successfully\n')

    // Test 5: Forbidden delete with limited token
    console.log('Test 5: Forbidden delete with limited token')
    try {
      await axios.delete(`${BASE_URL}/books/${createdBookId}`, {
        headers: { Authorization: `Bearer ${LIMITED_TOKEN}` },
      })
      console.log('✗ FAIL: Should have returned 403\n')
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log('✓ PASS: Returns 403 Forbidden with limited token\n')
      } else {
        console.log('✗ FAIL: Unexpected error:', err.message, '\n')
      }
    }

    // Test 6: Delete with admin token
    console.log('Test 6: Delete book with admin token')
    const deleteRes = await axios.delete(`${BASE_URL}/books/${createdBookId}`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    })
    console.assert(deleteRes.status === 200, 'Delete failed')
    console.log('✓ PASS: Book deleted successfully\n')

    // Test 7: External API - Open Library
    console.log('Test 7: Search Open Library')
    const openLibRes = await axios.get(`${BASE_URL}/external/openlibrary?q=tolkien`, {
      headers: { Authorization: `Bearer ${LIMITED_TOKEN}` },
    })
    console.assert(openLibRes.status === 200, 'Open Library search failed')
    console.assert(Array.isArray(openLibRes.data.data), 'Response data not array')
    console.log('✓ PASS: Open Library search returned results\n')

    // Test 8: External API - Gutendex
    console.log('Test 8: Search Gutendex')
    const gutendexRes = await axios.get(`${BASE_URL}/external/gutendex?q=pride`, {
      headers: { Authorization: `Bearer ${LIMITED_TOKEN}` },
    })
    console.assert(gutendexRes.status === 200, 'Gutendex search failed')
    console.assert(Array.isArray(gutendexRes.data.data), 'Response data not array')
    console.log('✓ PASS: Gutendex search returned results\n')

    console.log('=== All Tests Passed! ===')
  } catch (error) {
    console.error('Test failed with error:', error.message)
    if (error.response) {
      console.error('Response:', error.response.status, error.response.data)
    }
    process.exit(1)
  }
}

// Run tests
runTests()
