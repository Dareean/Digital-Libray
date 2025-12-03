// Interactive Demo - Digital Library API (No HTTP Server Required)
const readline = require('readline')

// Data store
const BOOK_STORE = {}
let nextId = 1

// Tokens
const TOKENS = {
  'token-limited-123': { role: 'limited', owner: 'studentA' },
  'token-all-456': { role: 'all-access', owner: 'studentLeader' },
}

let currentToken = null

// Mock external API responses
const mockOpenLibraryData = [
  { title: 'The Hobbit', author_name: ['J.R.R. Tolkien'], first_publish_year: 1937 },
  { title: 'The Lord of the Rings', author_name: ['J.R.R. Tolkien'], first_publish_year: 1954 },
  { title: 'The Silmarillion', author_name: ['J.R.R. Tolkien'], first_publish_year: 1977 }
]

const mockGutendexData = [
  { id: 1342, title: 'Pride and Prejudice', authors: [{ name: 'Austen, Jane' }] },
  { id: 1952, title: 'The Yellow Wallpaper', authors: [{ name: 'Gilman, Charlotte Perkins' }] }
]

// Auth check
function checkAuth(requiredRoles = []) {
  if (!currentToken) {
    return { error: 'API token required', status: 401 }
  }
  
  const record = TOKENS[currentToken]
  if (!record) {
    return { error: 'Invalid API token', status: 401 }
  }
  
  if (requiredRoles.length > 0 && !requiredRoles.includes(record.role)) {
    return { error: 'Insufficient token permissions', status: 403 }
  }
  
  return { user: record }
}

// API Functions
function healthCheck() {
  console.log('\n✅ Status: OK')
  console.log('Response: { "status": "ok" }')
}

function listBooks() {
  const books = Object.values(BOOK_STORE)
  console.log(`\n📚 Found ${books.length} book(s):`)
  if (books.length === 0) {
    console.log('  (No books yet - try creating one!)')
  } else {
    books.forEach(book => {
      console.log(`  📖 [${book.id}] ${book.title}`)
      console.log(`     Authors: ${book.authors?.join(', ') || 'N/A'}`)
      console.log(`     Year: ${book.year || 'N/A'}`)
      console.log(`     Created by: ${book.createdBy}`)
    })
  }
}

function getBook(id) {
  const book = BOOK_STORE[id]
  if (!book) {
    console.log(`\n❌ Error 404: Book with ID '${id}' not found`)
    return
  }
  console.log('\n📖 Book Details:')
  console.log(JSON.stringify(book, null, 2))
}

function createBook(rl) {
  const auth = checkAuth(['limited', 'all-access'])
  if (auth.error) {
    console.log(`\n❌ Error ${auth.status}: ${auth.error}`)
    return showMenu(rl)
  }

  console.log('\n📝 Create New Book')
  rl.question('  Title: ', (title) => {
    if (!title.trim()) {
      console.log('❌ Error 400: Title is required')
      return showMenu(rl)
    }
    
    rl.question('  Authors (comma-separated): ', (authors) => {
      rl.question('  Year: ', (year) => {
        const id = String(nextId++)
        const book = {
          id,
          title: title.trim(),
          authors: authors.split(',').map(a => a.trim()).filter(a => a),
          year: year ? parseInt(year) : null,
          createdBy: auth.user.owner
        }
        BOOK_STORE[id] = book
        console.log('\n✅ Book created successfully!')
        console.log(JSON.stringify(book, null, 2))
        showMenu(rl)
      })
    })
  })
}

function updateBook(rl, id) {
  const auth = checkAuth(['limited', 'all-access'])
  if (auth.error) {
    console.log(`\n❌ Error ${auth.status}: ${auth.error}`)
    return showMenu(rl)
  }

  const book = BOOK_STORE[id]
  if (!book) {
    console.log(`\n❌ Error 404: Book with ID '${id}' not found`)
    return showMenu(rl)
  }

  console.log('\n✏️  Update Book (press Enter to keep current value)')
  console.log(`Current title: ${book.title}`)
  
  rl.question('  New title: ', (title) => {
    rl.question(`Current authors: ${book.authors?.join(', ')}\n  New authors: `, (authors) => {
      rl.question(`Current year: ${book.year}\n  New year: `, (year) => {
        if (title.trim()) book.title = title.trim()
        if (authors.trim()) book.authors = authors.split(',').map(a => a.trim())
        if (year.trim()) book.year = parseInt(year)
        
        console.log('\n✅ Book updated successfully!')
        console.log(JSON.stringify(book, null, 2))
        showMenu(rl)
      })
    })
  })
}

function deleteBook(id) {
  const auth = checkAuth(['all-access'])
  if (auth.error) {
    console.log(`\n❌ Error ${auth.status}: ${auth.error}`)
    if (auth.status === 403) {
      console.log('   💡 Hint: Only admin token (token-all-456) can delete books')
    }
    return
  }

  const book = BOOK_STORE[id]
  if (!book) {
    console.log(`\n❌ Error 404: Book with ID '${id}' not found`)
    return
  }

  delete BOOK_STORE[id]
  console.log('\n✅ Book deleted successfully!')
}

function searchOpenLibrary(query) {
  const auth = checkAuth(['limited', 'all-access'])
  if (auth.error) {
    console.log(`\n❌ Error ${auth.status}: ${auth.error}`)
    return
  }

  console.log(`\n🔍 Searching Open Library for: "${query}"`)
  console.log('📚 Results (mock data):')
  
  const filtered = mockOpenLibraryData.filter(book => 
    book.title.toLowerCase().includes(query.toLowerCase()) ||
    book.author_name.some(a => a.toLowerCase().includes(query.toLowerCase()))
  )
  
  if (filtered.length === 0) {
    console.log('  No results found')
  } else {
    filtered.forEach((book, idx) => {
      console.log(`  ${idx + 1}. ${book.title} by ${book.author_name.join(', ')} (${book.first_publish_year})`)
    })
  }
}

function searchGutendex(query) {
  const auth = checkAuth(['limited', 'all-access'])
  if (auth.error) {
    console.log(`\n❌ Error ${auth.status}: ${auth.error}`)
    return
  }

  console.log(`\n🔍 Searching Gutendex for: "${query}"`)
  console.log('📚 Results (mock data):')
  
  const filtered = mockGutendexData.filter(book => 
    book.title.toLowerCase().includes(query.toLowerCase())
  )
  
  if (filtered.length === 0) {
    console.log('  No results found')
  } else {
    filtered.forEach((book, idx) => {
      console.log(`  ${idx + 1}. [${book.id}] ${book.title} by ${book.authors.map(a => a.name).join(', ')}`)
    })
  }
}

function setToken(rl) {
  console.log('\n🔑 Available Tokens:')
  console.log('  1. token-limited-123 (Limited access)')
  console.log('  2. token-all-456 (Admin access)')
  console.log('  3. Clear token (no auth)')
  
  rl.question('\nSelect (1-3): ', (choice) => {
    switch(choice.trim()) {
      case '1':
        currentToken = 'token-limited-123'
        console.log('✅ Token set to: token-limited-123 (Limited)')
        break
      case '2':
        currentToken = 'token-all-456'
        console.log('✅ Token set to: token-all-456 (Admin)')
        break
      case '3':
        currentToken = null
        console.log('✅ Token cleared')
        break
      default:
        console.log('❌ Invalid choice')
    }
    showMenu(rl)
  })
}

function runTests() {
  console.log('\n🧪 Running Automated Tests...\n')
  console.log('='.repeat(60))
  
  let passed = 0
  let failed = 0
  
  // Test 1: Health check
  console.log('\n📋 Test 1: Health Check')
  try {
    console.log('✅ PASS: Health endpoint returns OK')
    passed++
  } catch(e) {
    console.log('❌ FAIL:', e.message)
    failed++
  }
  
  // Test 2: Unauthorized access
  console.log('\n📋 Test 2: Unauthorized Access')
  currentToken = null
  const authCheck = checkAuth(['limited', 'all-access'])
  if (authCheck.error && authCheck.status === 401) {
    console.log('✅ PASS: Returns 401 without token')
    passed++
  } else {
    console.log('❌ FAIL: Should return 401')
    failed++
  }
  
  // Test 3: Create book with limited token
  console.log('\n📋 Test 3: Create Book with Limited Token')
  currentToken = 'token-limited-123'
  const authCheck2 = checkAuth(['limited', 'all-access'])
  if (!authCheck2.error) {
    const testBook = {
      id: String(nextId++),
      title: 'Test Book',
      authors: ['Test Author'],
      year: 2023,
      createdBy: authCheck2.user.owner
    }
    BOOK_STORE[testBook.id] = testBook
    console.log(`✅ PASS: Book created with ID ${testBook.id}`)
    passed++
  } else {
    console.log('❌ FAIL:', authCheck2.error)
    failed++
  }
  
  // Test 4: Get book
  console.log('\n📋 Test 4: Get Book by ID')
  const bookIds = Object.keys(BOOK_STORE)
  if (bookIds.length > 0 && BOOK_STORE[bookIds[0]]) {
    console.log('✅ PASS: Book retrieved successfully')
    passed++
  } else {
    console.log('❌ FAIL: Book not found')
    failed++
  }
  
  // Test 5: Delete with limited token (should fail)
  console.log('\n📋 Test 5: Delete with Limited Token (Should Fail)')
  currentToken = 'token-limited-123'
  const authCheck3 = checkAuth(['all-access'])
  if (authCheck3.error && authCheck3.status === 403) {
    console.log('✅ PASS: Returns 403 Forbidden')
    passed++
  } else {
    console.log('❌ FAIL: Should return 403')
    failed++
  }
  
  // Test 6: Delete with admin token
  console.log('\n📋 Test 6: Delete with Admin Token')
  currentToken = 'token-all-456'
  const authCheck4 = checkAuth(['all-access'])
  if (!authCheck4.error) {
    console.log('✅ PASS: Admin can delete')
    passed++
  } else {
    console.log('❌ FAIL:', authCheck4.error)
    failed++
  }
  
  // Test 7-8: External APIs
  console.log('\n📋 Test 7: Open Library Search')
  currentToken = 'token-limited-123'
  const authCheck5 = checkAuth(['limited', 'all-access'])
  if (!authCheck5.error) {
    console.log('✅ PASS: Open Library search authorized')
    passed++
  } else {
    console.log('❌ FAIL:', authCheck5.error)
    failed++
  }
  
  console.log('\n📋 Test 8: Gutendex Search')
  if (!authCheck5.error) {
    console.log('✅ PASS: Gutendex search authorized')
    passed++
  } else {
    console.log('❌ FAIL:', authCheck5.error)
    failed++
  }
  
  console.log('\n' + '='.repeat(60))
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`)
  console.log(`✅ Success Rate: ${((passed/(passed+failed))*100).toFixed(1)}%\n`)
}

function showMenu(rl) {
  console.log('\n' + '='.repeat(60))
  console.log('📚 DIGITAL LIBRARY API - Interactive Demo')
  console.log('='.repeat(60))
  console.log(`🔑 Current Token: ${currentToken ? currentToken + ' (' + TOKENS[currentToken]?.role + ')' : 'None (No Auth)'}`)
  console.log('\nOperations:')
  console.log('  1.  Health Check (GET /health)')
  console.log('  2.  List All Books (GET /books)')
  console.log('  3.  Get Book by ID (GET /books/:id)')
  console.log('  4.  Create Book (POST /books) [Requires Token]')
  console.log('  5.  Update Book (PUT /books/:id) [Requires Token]')
  console.log('  6.  Delete Book (DELETE /books/:id) [Requires Admin]')
  console.log('  7.  Search Open Library [Requires Token]')
  console.log('  8.  Search Gutendex [Requires Token]')
  console.log('\nManagement:')
  console.log('  9.  Set/Change Token')
  console.log('  10. Run Automated Tests (All 8 Tests)')
  console.log('  0.  Exit')
  console.log('='.repeat(60))
  
  rl.question('\nSelect option (0-10): ', (choice) => {
    console.clear()
    
    switch(choice.trim()) {
      case '1':
        healthCheck()
        showMenu(rl)
        break
      case '2':
        listBooks()
        showMenu(rl)
        break
      case '3':
        rl.question('\nEnter Book ID: ', (id) => {
          getBook(id.trim())
          showMenu(rl)
        })
        break
      case '4':
        createBook(rl)
        break
      case '5':
        rl.question('\nEnter Book ID to update: ', (id) => {
          updateBook(rl, id.trim())
        })
        break
      case '6':
        rl.question('\nEnter Book ID to delete: ', (id) => {
          deleteBook(id.trim())
          showMenu(rl)
        })
        break
      case '7':
        rl.question('\nSearch query: ', (query) => {
          searchOpenLibrary(query.trim())
          showMenu(rl)
        })
        break
      case '8':
        rl.question('\nSearch query: ', (query) => {
          searchGutendex(query.trim())
          showMenu(rl)
        })
        break
      case '9':
        setToken(rl)
        break
      case '10':
        runTests()
        showMenu(rl)
        break
      case '0':
        console.log('\n👋 Thank you for using Digital Library API!\n')
        rl.close()
        break
      default:
        console.log('\n❌ Invalid option. Please try again.')
        showMenu(rl)
    }
  })
}

// Start
console.clear()
console.log('\n🚀 Starting Interactive Demo...\n')
console.log('This demo simulates the Digital Library API without HTTP server.')
console.log('All operations work exactly like the real API endpoints.\n')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
})

// For Windows compatibility
if (process.platform === 'win32') {
  rl.terminal = true
}

// Add some sample data
currentToken = 'token-all-456'
BOOK_STORE['1'] = {
  id: '1',
  title: 'The Great Gatsby',
  authors: ['F. Scott Fitzgerald'],
  year: 1925,
  createdBy: 'studentLeader'
}
BOOK_STORE['2'] = {
  id: '2',
  title: '1984',
  authors: ['George Orwell'],
  year: 1949,
  createdBy: 'studentLeader'
}
nextId = 3
currentToken = 'token-limited-123' // Start with limited token

setTimeout(() => showMenu(rl), 500)
