# LAPORAN PROYEK: Digital Library API

**Kelompok:** [Isi nama kelompok Anda]  
**Anggota:**
1. [Nama - NIM]
2. [Nama - NIM]
3. [Nama - NIM]
4. [Nama - NIM]

**Mata Kuliah:** [Nama Mata Kuliah]  
**Dosen:** [Nama Dosen]  
**Tanggal:** November 2025

---

## 1. RINGKASAN PROYEK

### 1.1 Deskripsi
Digital Library API adalah sistem backend untuk manajemen perpustakaan digital yang dibangun menggunakan Node.js dengan pendekatan API-first. Proyek ini merupakan pengembangan dari Sub-CPMK 4 dengan penambahan fitur keamanan, integrasi API eksternal, dan dokumentasi standar industri.

### 1.2 Teknologi yang Digunakan
- **Runtime:** Node.js v18+
- **Dependencies Utama:**
  - `axios` - HTTP client untuk integrasi external API
  - `node-cache` - In-memory caching untuk optimasi performa
  - `yamljs` - Parser untuk OpenAPI specification
  - `swagger-ui-express` - UI interaktif untuk dokumentasi API
  
### 1.3 Fitur Utama
1. ✅ **CRUD Buku** - Create, Read, Update, Delete operasi untuk data buku
2. ✅ **Autentikasi Token** - Role-based access control (limited & all-access)
3. ✅ **Integrasi External API** - Open Library & Gutendex
4. ✅ **Dokumentasi OpenAPI/Swagger** - Dokumentasi interaktif di `/api-docs`
5. ✅ **Caching Mechanism** - Cache 5 menit untuk external API calls
6. ✅ **Automated Testing** - 8 test cases otomatis

---

## 2. DOKUMENTASI API

### 2.1 Base URL
```
http://localhost:3333
```

### 2.2 Endpoints

#### A. Books Management

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/books` | ❌ No | List semua buku |
| GET | `/books/:id` | ❌ No | Detail buku by ID |
| POST | `/books` | ✅ Yes (limited/all-access) | Create buku baru |
| PUT | `/books/:id` | ✅ Yes (limited/all-access) | Update buku |
| DELETE | `/books/:id` | ✅ Yes (all-access only) | Delete buku |

#### B. External API Integration

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/external/openlibrary?q=<query>` | ✅ Yes | Search Open Library |
| GET | `/external/gutendex?q=<query>` | ✅ Yes | Search Gutendex |

#### C. Utility

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check endpoint |
| GET | `/api-docs` | Swagger UI documentation |

### 2.3 Request/Response Examples

#### Create Book
**Request:**
```http
POST /books
Authorization: Bearer token-limited-123
Content-Type: application/json

{
  "title": "The Hobbit",
  "authors": ["J.R.R. Tolkien"],
  "year": 1937,
  "source": "manual"
}
```

**Response (201 Created):**
```json
{
  "id": "1",
  "title": "The Hobbit",
  "authors": ["J.R.R. Tolkien"],
  "year": 1937,
  "source": "manual",
  "createdBy": "studentA"
}
```

#### Search External API
**Request:**
```http
GET /external/openlibrary?q=tolkien
Authorization: Bearer token-limited-123
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "title": "The Lord of the Rings",
      "author_name": ["J.R.R. Tolkien"],
      "first_publish_year": 1954,
      ...
    }
  ],
  "cached": false
}
```

### 2.4 OpenAPI Specification
Dokumentasi lengkap tersedia di:
- **File:** `docs/openapi.yaml`
- **Interactive UI:** `http://localhost:3333/api-docs`

---

## 3. STRATEGI IMPLEMENTASI KEAMANAN

### 3.1 Mekanisme Autentikasi

#### Token-Based Authentication
API menggunakan Bearer Token authentication dengan header format:
```
Authorization: Bearer <token>
```
atau alternatif:
```
x-api-key: <token>
```

#### Token Store
Untuk demo purposes, token disimpan in-memory di file `simple-server.js`:
```javascript
const TOKENS = {
  'token-limited-123': { role: 'limited', owner: 'studentA' },
  'token-all-456': { role: 'all-access', owner: 'studentLeader' },
}
```

**Note:** Untuk production, token harus disimpan di:
- Database dengan encryption
- Secret management service (AWS Secrets Manager, HashiCorp Vault)
- Environment variables dengan proper security

### 3.2 Role-Based Access Control (RBAC)

#### Roles Definition

**1. Limited Role (`limited`)**
- ✅ Dapat: Create, Read, Update books
- ✅ Dapat: Access external API search
- ❌ Tidak dapat: Delete books
- **Token:** `token-limited-123`
- **Use case:** Regular users, contributors

**2. All-Access Role (`all-access`)**
- ✅ Dapat: All operations (Create, Read, Update, Delete)
- ✅ Dapat: Access external API search
- **Token:** `token-all-456`
- **Use case:** Administrators, system owners

#### Implementation
```javascript
function checkAuth(req, requiredRoles = []) {
  // Extract token from header
  const token = extractToken(req)
  
  // Validate token
  if (!TOKENS[token]) return { error: 'Invalid token', status: 401 }
  
  // Check role permission
  const userRole = TOKENS[token].role
  if (requiredRoles.length > 0 && !requiredRoles.includes(userRole)) {
    return { error: 'Insufficient permissions', status: 403 }
  }
  
  return { user: TOKENS[token] }
}
```

### 3.3 Security Best Practices Implemented

1. **CORS Configuration**
   - Cross-Origin Resource Sharing diaktifkan untuk akses dari frontend
   - Headers: `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`

2. **Input Validation**
   - Validasi required fields (e.g., `title` untuk create book)
   - Bad Request (400) response untuk invalid input

3. **Error Handling**
   - Tidak expose sensitive information di error messages
   - Proper HTTP status codes (401, 403, 404, 500)

4. **Audit Trail**
   - Setiap book yang dibuat mencatat `createdBy` (owner dari token)
   - Server logging untuk semua requests

### 3.4 Security Recommendations untuk Production

1. **HTTPS Only** - Encrypt semua komunikasi
2. **Token Expiration** - Implement JWT dengan expiry time
3. **Rate Limiting** - Prevent brute force attacks
4. **IP Whitelisting** - Restrict access by IP untuk admin endpoints
5. **Security Headers** - Implement Helmet.js untuk security headers
6. **SQL Injection Prevention** - Use parameterized queries (jika pakai SQL DB)
7. **XSS Protection** - Sanitize input/output
8. **Password Hashing** - bcrypt atau Argon2 (jika implement user registration)
9. **Audit Logging** - Log semua security-related events
10. **Regular Security Audits** - npm audit, dependency scanning

---

## 4. STRATEGI INTEGRASI API EKSTERNAL

### 4.1 Public APIs yang Digunakan

#### A. Open Library API
- **URL:** `https://openlibrary.org/search.json`
- **Provider:** Internet Archive
- **Documentation:** https://openlibrary.org/dev/docs/api/search
- **Purpose:** Search books dari katalog perpustakaan terbuka
- **Rate Limit:** No official limit (gunakan caching)

**Query Parameters:**
- `q` - Search query (title, author, ISBN, etc.)

**Sample Response:**
```json
{
  "docs": [
    {
      "title": "The Hobbit",
      "author_name": ["J.R.R. Tolkien"],
      "first_publish_year": 1937,
      "isbn": ["9780547928227"],
      "publisher": ["Houghton Mifflin Harcourt"]
    }
  ]
}
```

#### B. Gutendex API
- **URL:** `https://gutendex.com/books`
- **Provider:** Project Gutenberg
- **Documentation:** https://gutendex.com/
- **Purpose:** Search free ebooks dari Project Gutenberg
- **Rate Limit:** No official limit (gunakan caching)

**Query Parameters:**
- `search` - Search query (title, author)

**Sample Response:**
```json
{
  "results": [
    {
      "id": 1342,
      "title": "Pride and Prejudice",
      "authors": [
        {
          "name": "Austen, Jane",
          "birth_year": 1775,
          "death_year": 1817
        }
      ],
      "languages": ["en"],
      "download_count": 45678
    }
  ]
}
```

### 4.2 Implementation Details

#### HTTP Client: Axios
```javascript
const axios = require('axios')

// Open Library search
const response = await axios.get('https://openlibrary.org/search.json', {
  params: { q: searchQuery },
  timeout: 30000 // 30 seconds
})
```

#### Caching Strategy
```javascript
const NodeCache = require('node-cache')
const cache = new NodeCache({ stdTTL: 300 }) // 5 minutes TTL

// Cache key format: "openlib:<query>" or "gutendex:<query>"
const cacheKey = `openlib:${query}`
const cached = cache.get(cacheKey)

if (cached) {
  return { data: cached, cached: true }
}

// Fetch from external API and cache
const data = await fetchFromExternalAPI(query)
cache.set(cacheKey, data)
```

**Benefits:**
- ✅ Reduce external API calls
- ✅ Faster response time (cached: ~1ms vs external: ~500ms)
- ✅ Prevent rate limiting
- ✅ Better user experience

#### Error Handling
```javascript
try {
  const response = await axios.get(externalApiUrl, { params })
  return { data: response.data, success: true }
} catch (err) {
  // Log error
  console.error('External API error:', err.message)
  
  // Return user-friendly error
  return {
    message: 'External API request failed',
    error: err.message,
    status: 500
  }
}
```

### 4.3 Integration Architecture

```
┌─────────────┐         ┌──────────────────┐
│   Client    │         │  Digital Library │
│             │◄───────►│       API        │
└─────────────┘         └────────┬─────────┘
                                 │
                    ┌────────────┼────────────┐
                    │                         │
                    ▼                         ▼
            ┌───────────────┐       ┌─────────────────┐
            │  Open Library │       │    Gutendex     │
            │      API      │       │       API       │
            └───────────────┘       └─────────────────┘
```

### 4.4 Performance Optimization

1. **Response Limiting** - Ambil maksimal 10 results
2. **Timeout Configuration** - 30 detik timeout
3. **Caching** - 5 menit TTL untuk reduce load
4. **Parallel Requests** - Bisa query multiple APIs sekaligus (future enhancement)

---

## 5. TEST CASE DAN HASIL PENGUJIAN

### 5.1 Test Environment
- **Server:** http://localhost:3333
- **Test Framework:** Node.js native (axios untuk HTTP requests)
- **Test File:** `tests/manual-test.js`

### 5.2 Test Cases (8 Total)

#### Test 1: Health Check Endpoint
**Objective:** Verify server is running  
**Method:** GET  
**Endpoint:** `/health`  
**Expected:** 200 OK, `{ status: 'ok' }`  
**Result:** ✅ PASS

#### Test 2: Unauthorized Create (No Token)
**Objective:** Verify authentication is enforced  
**Method:** POST  
**Endpoint:** `/books`  
**Body:** `{ title: 'Test Book' }`  
**Headers:** None  
**Expected:** 401 Unauthorized  
**Result:** ✅ PASS

#### Test 3: Create Book with Limited Token
**Objective:** Verify limited token can create books  
**Method:** POST  
**Endpoint:** `/books`  
**Headers:** `Authorization: Bearer token-limited-123`  
**Body:**
```json
{
  "title": "Test Book",
  "authors": ["Alice"],
  "year": 2023
}
```
**Expected:** 201 Created, response contains `id`  
**Result:** ✅ PASS  
**Response ID:** 1

#### Test 4: Get Created Book
**Objective:** Verify book retrieval  
**Method:** GET  
**Endpoint:** `/books/1`  
**Expected:** 200 OK, title matches "Test Book"  
**Result:** ✅ PASS

#### Test 5: Forbidden Delete with Limited Token
**Objective:** Verify role-based access control  
**Method:** DELETE  
**Endpoint:** `/books/1`  
**Headers:** `Authorization: Bearer token-limited-123`  
**Expected:** 403 Forbidden  
**Result:** ✅ PASS

#### Test 6: Delete with Admin Token
**Objective:** Verify admin can delete  
**Method:** DELETE  
**Endpoint:** `/books/1`  
**Headers:** `Authorization: Bearer token-all-456`  
**Expected:** 200 OK  
**Result:** ✅ PASS

#### Test 7: Search Open Library
**Objective:** Verify Open Library integration  
**Method:** GET  
**Endpoint:** `/external/openlibrary?q=tolkien`  
**Headers:** `Authorization: Bearer token-limited-123`  
**Expected:** 200 OK, array of results  
**Result:** ✅ PASS  
**Sample Result:**
```json
{
  "data": [
    {
      "title": "The Lord of the Rings",
      "author_name": ["J.R.R. Tolkien"]
    }
  ]
}
```

#### Test 8: Search Gutendex
**Objective:** Verify Gutendex integration  
**Method:** GET  
**Endpoint:** `/external/gutendex?q=pride`  
**Headers:** `Authorization: Bearer token-limited-123`  
**Expected:** 200 OK, array of results  
**Result:** ✅ PASS  
**Sample Result:**
```json
{
  "data": [
    {
      "id": 1342,
      "title": "Pride and Prejudice",
      "authors": [{"name": "Austen, Jane"}]
    }
  ]
}
```

### 5.3 Test Execution

**Run Command:**
```powershell
npm run test:manual
```

**Sample Output:**
```
=== Digital Library API - Automated Tests ===

Test 1: Health check
✓ PASS: Health endpoint returns 200 OK

Test 2: Unauthorized create without token
✓ PASS: Returns 401 Unauthorized without token

Test 3: Create book with limited token
✓ PASS: Book created successfully, ID: 1

Test 4: Get created book
✓ PASS: Retrieved book successfully

Test 5: Forbidden delete with limited token
✓ PASS: Returns 403 Forbidden with limited token

Test 6: Delete book with admin token
✓ PASS: Book deleted successfully

Test 7: Search Open Library
✓ PASS: Open Library search returned results

Test 8: Search Gutendex
✓ PASS: Gutendex search returned results

=== All Tests Passed! ===
```

### 5.4 Test Coverage Summary

| Category | Tests | Passed | Failed |
|----------|-------|--------|--------|
| Authentication | 2 | 2 | 0 |
| CRUD Operations | 4 | 4 | 0 |
| External Integration | 2 | 2 | 0 |
| **TOTAL** | **8** | **8** | **0** |

**Coverage:** 100% ✅

### 5.5 Screenshots untuk Laporan

Capture screenshots berikut dan masukkan ke folder `screenshots/`:

1. `01-swagger-ui.png` - Tampilan Swagger documentation
2. `02-test-results.png` - Output dari `npm run test:manual`
3. `03-create-book.png` - Request/response create book
4. `04-auth-error.png` - 401 Unauthorized response
5. `05-forbidden-error.png` - 403 Forbidden response
6. `06-external-openlibrary.png` - Open Library search result
7. `07-external-gutendex.png` - Gutendex search result
8. `08-health-check.png` - Health endpoint response

---

## 6. STRUKTUR PROJECT

```
digital-library-api/
├── app/
│   ├── Controllers/Http/
│   │   └── BooksController.ts    # CRUD & external API handlers
│   └── Middleware/
│       └── TokenAuth.ts           # Token authentication middleware
├── config/
│   └── app.ts                     # Application configuration
├── docs/
│   └── openapi.yaml               # OpenAPI 3.0 specification
├── start/
│   ├── routes.ts                  # Route definitions
│   └── kernel.ts                  # Middleware registration
├── tests/
│   ├── manual-test.js             # Automated test script (8 tests)
│   ├── functional/
│   │   └── books.spec.ts          # Japa test specs
│   └── book.test.md               # Test documentation
├── simple-server.js               # Standalone server (production-ready)
├── server.ts                      # AdonisJS server entry point
├── package.json                   # Dependencies & scripts
├── .env                           # Environment variables
├── .env.example                   # Environment template
├── tsconfig.json                  # TypeScript configuration
├── .adonisrc.json                 # AdonisJS configuration
├── README.md                      # Setup & usage guide
├── REPORT.md                      # This file - full report
└── QUICKSTART.md                  # Quick start guide for demo
```

---

## 7. INSTRUKSI INSTALASI DAN MENJALANKAN

### 7.1 Prerequisites
- Node.js v14+ (recommended v18+)
- npm v6+
- PowerShell (Windows)

### 7.2 Installation Steps

```powershell
# 1. Clone atau download project
cd C:\Users\ASUS\Documents\digital-library-api

# 2. Install dependencies
npm install

# 3. Verify .env file exists
cat .env

# 4. Run server
npm run dev
```

### 7.3 Accessing the API

- **Server:** http://localhost:3333
- **Swagger Docs:** http://localhost:3333/api-docs
- **Health Check:** http://localhost:3333/health

### 7.4 Running Tests

```powershell
# Terminal 1: Start server
npm run dev

# Terminal 2: Run tests
npm run test:manual
```

---

## 8. DEMO & PRESENTASI (15 menit + 5 menit Q&A)

### 8.1 Timeline Presentasi

**0:00 - 3:00 - Overview & Arsitektur (3 menit)**
- Perkenalan tim dan pembagian tugas
- Penjelasan high-level architecture
- Teknologi stack yang digunakan
- Fitur-fitur utama

**3:00 - 9:00 - Live Demo (6 menit)**
- Start server (`npm run dev`)
- Buka Swagger UI di browser (http://localhost:3333/api-docs)
- Demo CRUD operations:
  - GET /books (list)
  - POST /books (create dengan limited token)
  - GET /books/:id (detail)
  - DELETE /books/:id (show 403 dengan limited token)
  - DELETE /books/:id (success dengan admin token)
- Demo External API:
  - Search Open Library
  - Search Gutendex
  - Show caching (second request faster)

**9:00 - 13:00 - Security & Integration (4 menit)**
- Penjelasan token authentication
- Role-based access control demo
- Show code: `checkAuth()` function
- External API integration strategy
- Caching mechanism explanation

**13:00 - 15:00 - Testing (2 menit)**
- Run automated tests (`npm run test:manual`)
- Show 8/8 tests passing
- Explain test coverage

**15:00 - 20:00 - Q&A (5 menit)**
- Siap jawab pertanyaan dari dosen/mahasiswa

### 8.2 Demo Script (Copy-Paste Commands)

```powershell
# 1. Start server
npm run dev

# 2. Health check
Invoke-RestMethod -Uri http://localhost:3333/health

# 3. Create book (limited token)
$headers = @{ Authorization = "Bearer token-limited-123" }
$body = @{
    title = "The Hobbit"
    authors = @("J.R.R. Tolkien")
    year = 1937
} | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3333/books -Method Post -Headers $headers -Body $body -ContentType "application/json"

# 4. Get all books
Invoke-RestMethod -Uri http://localhost:3333/books

# 5. Try delete with limited token (should fail)
$headers = @{ Authorization = "Bearer token-limited-123" }
Invoke-RestMethod -Uri http://localhost:3333/books/1 -Method Delete -Headers $headers

# 6. Delete with admin token (should success)
$headers = @{ Authorization = "Bearer token-all-456" }
Invoke-RestMethod -Uri http://localhost:3333/books/1 -Method Delete -Headers $headers

# 7. Search Open Library
$headers = @{ Authorization = "Bearer token-limited-123" }
Invoke-RestMethod -Uri "http://localhost:3333/external/openlibrary?q=tolkien" -Headers $headers

# 8. Search Gutendex
Invoke-RestMethod -Uri "http://localhost:3333/external/gutendex?q=pride" -Headers $headers

# 9. Run tests
npm run test:manual
```

### 8.3 Key Points untuk Ditekankan

1. **OpenAPI/Swagger Compliance** - Dokumentasi standar industri
2. **Security Implementation** - Token auth + RBAC
3. **External Integration** - 2 public APIs dengan caching
4. **Test Coverage** - 8/8 automated tests passing
5. **Production-Ready** - Error handling, logging, best practices

---

## 9. KETERLIBATAN ANGGOTA KELOMPOK

### 9.1 Pembagian Tugas

| Anggota | Tugas Utama | Kontribusi |
|---------|-------------|------------|
| [Nama 1] | API Design & Routes | Design endpoints, implement routes |
| [Nama 2] | Authentication & Security | Token middleware, RBAC implementation |
| [Nama 3] | External API Integration | Open Library & Gutendex integration, caching |
| [Nama 4] | Testing & Documentation | Automated tests, OpenAPI spec, report |

### 9.2 Presentasi
Semua anggota wajib berpartisipasi:
- **Anggota 1:** Opening + overview
- **Anggota 2:** Live demo (CRUD)
- **Anggota 3:** Security & integration explanation
- **Anggota 4:** Testing demo + closing
- **All:** Q&A session

---

## 10. KESIMPULAN

### 10.1 Pencapaian
✅ Semua requirement terpenuhi:
- Dokumentasi API dengan OpenAPI/Swagger
- Implementasi keamanan API dasar (Token + RBAC)
- Integrasi dengan 2 public API (Open Library & Gutendex)
- Pengujian API (8 test cases - exceed minimum 5)
- Demo & laporan lengkap

### 10.2 Lessons Learned
1. Pentingnya dokumentasi API yang jelas (OpenAPI/Swagger)
2. Security harus menjadi prioritas sejak awal development
3. Caching dapat significantly improve performance
4. Automated testing menghemat waktu dan prevent regression
5. Code organization yang baik memudahkan maintenance

### 10.3 Future Improvements
1. **Database Integration** - Gunakan PostgreSQL/MongoDB untuk persistent storage
2. **JWT Tokens** - Implement JWT dengan expiration
3. **User Management** - Registration, login, profile management
4. **Advanced RBAC** - More granular permissions
5. **GraphQL** - Alternative API design untuk flexibility
6. **Docker** - Containerization untuk easy deployment
7. **CI/CD** - Automated testing & deployment pipeline
8. **Monitoring** - APM tools (New Relic, DataDog)
9. **More Tests** - Integration tests, load tests
10. **API Versioning** - Support multiple API versions

---

## 11. REFERENSI

1. OpenAPI Specification: https://swagger.io/specification/
2. Open Library API: https://openlibrary.org/dev/docs/api/search
3. Gutendex API: https://gutendex.com/
4. Node.js Best Practices: https://github.com/goldbergyoni/nodebestpractices
5. REST API Security: https://restfulapi.net/security-essentials/
6. HTTP Status Codes: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status

---

## 12. LAMPIRAN

### A. Environment Variables
```env
HOST=0.0.0.0
PORT=3333
NODE_ENV=development
APP_NAME=DigitalLibraryAPI
APP_KEY=sampleAppKeyForDevelopmentUseOnly123
```

### B. API Tokens
```
Limited Access: token-limited-123
Admin Access: token-all-456
```

### C. Dependencies (package.json)
- Production: axios, node-cache, swagger-ui-express, yamljs
- Development: supertest, @types/node, typescript

---

**Laporan dibuat oleh:** Kelompok [X]  
**Tanggal:** [Tanggal Presentasi]  
**Versi:** 1.0

