# Digital Library API - Quick Start Guide

## Setup Cepat (First Time)

1. Install dependencies (sudah dilakukan):
```powershell
npm install
```

2. Jalankan server:
```powershell
npm run dev
```

3. Buka browser dan akses:
- API Docs: http://localhost:3333/api-docs
- Health Check: http://localhost:3333/health

## Testing

Pastikan server sudah berjalan, kemudian di terminal baru:

```powershell
npm run test:manual
```

## Demo untuk Presentasi

### 1. Start Server
```powershell
npm run dev
```

### 2. Test Endpoints (di terminal PowerShell baru)

#### Health Check
```powershell
Invoke-RestMethod -Uri http://localhost:3333/health
```

#### Create Book (Limited Token)
```powershell
$headers = @{ Authorization = "Bearer token-limited-123" }
$body = @{
    title = "The Hobbit"
    authors = @("J.R.R. Tolkien")
    year = 1937
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3333/books -Method Post -Headers $headers -Body $body -ContentType "application/json"
```

#### Get All Books
```powershell
Invoke-RestMethod -Uri http://localhost:3333/books
```

#### Search Open Library
```powershell
$headers = @{ Authorization = "Bearer token-limited-123" }
Invoke-RestMethod -Uri "http://localhost:3333/external/openlibrary?q=tolkien" -Headers $headers
```

#### Search Gutendex
```powershell
$headers = @{ Authorization = "Bearer token-limited-123" }
Invoke-RestMethod -Uri "http://localhost:3333/external/gutendex?q=pride" -Headers $headers
```

#### Try Delete with Limited Token (Should Fail - 403)
```powershell
$headers = @{ Authorization = "Bearer token-limited-123" }
Invoke-RestMethod -Uri http://localhost:3333/books/1 -Method Delete -Headers $headers
```

#### Delete with Admin Token (Should Success)
```powershell
$headers = @{ Authorization = "Bearer token-all-456" }
Invoke-RestMethod -Uri http://localhost:3333/books/1 -Method Delete -Headers $headers
```

### 3. Run Automated Tests
```powershell
npm run test:manual
```

### 4. View Swagger Documentation
Buka browser: http://localhost:3333/api-docs

## Tokens Available

1. **Limited Access**: `token-limited-123`
   - Can: Create, Read, Update, Search External APIs
   - Cannot: Delete

2. **Admin Access**: `token-all-456`
   - Can: All operations including Delete

## Screenshots untuk Laporan

Capture:
1. Swagger UI (http://localhost:3333/api-docs)
2. Test results (npm run test:manual)
3. Contoh request/response untuk setiap endpoint
4. Error handling (401, 403)

## Troubleshooting

### Port 3333 sudah digunakan
Ubah PORT di file `.env`:
```
PORT=3334
```

### Dependencies error
```powershell
Remove-Item node_modules -Recurse -Force
npm install
```
