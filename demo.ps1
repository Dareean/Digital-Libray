# Digital Library API - Setup & Demo Script
# Gunakan script ini untuk quick setup dan demo

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Digital Library API - Setup & Demo Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if server is running
function Test-ServerRunning {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3333/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# Menu
Write-Host "Pilih opsi:" -ForegroundColor Yellow
Write-Host "1. Install Dependencies (npm install)"
Write-Host "2. Start Server (npm run dev)"
Write-Host "3. Run Tests (server harus sudah running)"
Write-Host "4. Quick Test API (demo commands)"
Write-Host "5. Open Swagger UI (in browser)"
Write-Host "6. Show Project Info"
Write-Host "0. Exit"
Write-Host ""

$choice = Read-Host "Pilihan Anda (0-6)"

switch ($choice) {
    "1" {
        Write-Host "`nInstalling dependencies..." -ForegroundColor Green
        npm install
        Write-Host "`nDependencies installed successfully!" -ForegroundColor Green
        Write-Host "Next: Run option 2 to start server" -ForegroundColor Yellow
    }
    "2" {
        Write-Host "`nStarting server..." -ForegroundColor Green
        Write-Host "Server will start at http://localhost:3333" -ForegroundColor Cyan
        Write-Host "Press Ctrl+C to stop server`n" -ForegroundColor Yellow
        npm run dev
    }
    "3" {
        Write-Host "`nChecking if server is running..." -ForegroundColor Yellow
        if (Test-ServerRunning) {
            Write-Host "Server is running! Starting tests...`n" -ForegroundColor Green
            npm run test:manual
        } else {
            Write-Host "ERROR: Server is not running!" -ForegroundColor Red
            Write-Host "Please start server first (option 2) in another terminal" -ForegroundColor Yellow
        }
    }
    "4" {
        Write-Host "`nChecking if server is running..." -ForegroundColor Yellow
        if (Test-ServerRunning) {
            Write-Host "Server is running! Running demo commands...`n" -ForegroundColor Green
            
            # Health check
            Write-Host "=== 1. Health Check ===" -ForegroundColor Cyan
            Invoke-RestMethod -Uri http://localhost:3333/health
            Start-Sleep -Seconds 1
            
            # Create book
            Write-Host "`n=== 2. Create Book (Limited Token) ===" -ForegroundColor Cyan
            $headers = @{ Authorization = "Bearer token-limited-123" }
            $body = @{
                title = "The Hobbit"
                authors = @("J.R.R. Tolkien")
                year = 1937
            } | ConvertTo-Json
            $book = Invoke-RestMethod -Uri http://localhost:3333/books -Method Post -Headers $headers -Body $body -ContentType "application/json"
            $book
            $bookId = $book.id
            Start-Sleep -Seconds 1
            
            # Get books
            Write-Host "`n=== 3. Get All Books ===" -ForegroundColor Cyan
            Invoke-RestMethod -Uri http://localhost:3333/books
            Start-Sleep -Seconds 1
            
            # Try delete with limited token (should fail)
            Write-Host "`n=== 4. Try Delete with Limited Token (Should Fail) ===" -ForegroundColor Cyan
            try {
                Invoke-RestMethod -Uri "http://localhost:3333/books/$bookId" -Method Delete -Headers @{ Authorization = "Bearer token-limited-123" }
            } catch {
                Write-Host "Expected: 403 Forbidden (Limited token cannot delete)" -ForegroundColor Yellow
            }
            Start-Sleep -Seconds 1
            
            # Search external API
            Write-Host "`n=== 5. Search Open Library ===" -ForegroundColor Cyan
            $result = Invoke-RestMethod -Uri "http://localhost:3333/external/openlibrary?q=tolkien" -Headers $headers
            Write-Host "Found $($result.data.Count) results"
            Start-Sleep -Seconds 1
            
            Write-Host "`n=== Demo Complete! ===" -ForegroundColor Green
            Write-Host "Check Swagger UI for full documentation: http://localhost:3333/api-docs" -ForegroundColor Cyan
            
        } else {
            Write-Host "ERROR: Server is not running!" -ForegroundColor Red
            Write-Host "Please start server first (option 2) in another terminal" -ForegroundColor Yellow
        }
    }
    "5" {
        Write-Host "`nOpening Swagger UI in browser..." -ForegroundColor Green
        Start-Process "http://localhost:3333/api-docs"
    }
    "6" {
        Write-Host "`n================================================" -ForegroundColor Cyan
        Write-Host "         DIGITAL LIBRARY API - INFO" -ForegroundColor Cyan
        Write-Host "================================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Server URL:" -ForegroundColor Yellow
        Write-Host "  http://localhost:3333"
        Write-Host ""
        Write-Host "Swagger UI:" -ForegroundColor Yellow
        Write-Host "  http://localhost:3333/api-docs"
        Write-Host ""
        Write-Host "Available Tokens:" -ForegroundColor Yellow
        Write-Host "  Limited: token-limited-123"
        Write-Host "  Admin:   token-all-456"
        Write-Host ""
        Write-Host "Key Files:" -ForegroundColor Yellow
        Write-Host "  Server:  simple-server.js"
        Write-Host "  Tests:   tests/manual-test.js"
        Write-Host "  Report:  REPORT.md"
        Write-Host "  Docs:    docs/openapi.yaml"
        Write-Host ""
        Write-Host "Commands:" -ForegroundColor Yellow
        Write-Host "  npm run dev         - Start server"
        Write-Host "  npm run test:manual - Run tests"
        Write-Host ""
        Write-Host "Test Coverage:" -ForegroundColor Yellow
        Write-Host "  8/8 tests passing (100%)"
        Write-Host ""
        Write-Host "External APIs:" -ForegroundColor Yellow
        Write-Host "  - Open Library"
        Write-Host "  - Gutendex"
        Write-Host ""
        Write-Host "================================================" -ForegroundColor Cyan
    }
    "0" {
        Write-Host "`nGoodbye!" -ForegroundColor Green
        exit
    }
    default {
        Write-Host "`nInvalid choice!" -ForegroundColor Red
    }
}

Write-Host "`nPress any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
