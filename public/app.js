// ===== Configuration =====
const API_BASE_URL = 'http://localhost:3333';
let currentToken = null;
let currentSearchApi = 'openlibrary';

// ===== Token Management =====
function setLimitedToken() {
    currentToken = 'token-limited-123';
    updateTokenDisplay();
    showToast('Limited token set', 'success');
    loadBooks();
}

function setAdminToken() {
    currentToken = 'token-all-456';
    updateTokenDisplay();
    showToast('Admin token set', 'success');
    loadBooks();
}

function clearToken() {
    currentToken = null;
    updateTokenDisplay();
    showToast('Token cleared', 'warning');
    document.getElementById('booksList').innerHTML = '';
    document.getElementById('emptyState').style.display = 'block';
}

function updateTokenDisplay() {
    const tokenElement = document.getElementById('currentToken');
    const roleElement = document.getElementById('tokenRole');
    const authStatus = document.getElementById('authStatus');
    
    if (currentToken) {
        tokenElement.textContent = currentToken;
        const role = currentToken.includes('all-456') ? 'Admin' : 'Limited';
        roleElement.textContent = role;
        authStatus.textContent = role;
    } else {
        tokenElement.textContent = 'Not set';
        roleElement.textContent = '';
        authStatus.textContent = 'None';
    }
}

// ===== API Calls =====
async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (currentToken) {
        headers['X-API-Token'] = currentToken;
    }
    
    const options = {
        method,
        headers
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || `HTTP ${response.status}`);
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, error: error.message };
    }
}

// ===== Health Check =====
async function checkHealth() {
    const apiStatus = document.getElementById('apiStatus');
    apiStatus.textContent = 'Checking...';
    
    const result = await apiCall('/health');
    
    if (result.success) {
        apiStatus.textContent = 'Online ✓';
        showToast('API is healthy', 'success');
    } else {
        apiStatus.textContent = 'Offline ✗';
        showToast('API connection failed', 'error');
    }
}

// ===== Books Management =====
async function loadBooks() {
    if (!currentToken) {
        showToast('Please set an auth token first', 'warning');
        return;
    }
    
    console.log('Loading books...');
    const result = await apiCall('/books');
    console.log('Load books result:', result);
    
    if (result.success) {
        console.log('Books data:', result.data);
        displayBooks(result.data);
        document.getElementById('totalBooks').textContent = result.data.length;
    } else {
        console.error('Failed to load books:', result.error);
        showToast(`Failed to load books: ${result.error}`, 'error');
        document.getElementById('emptyState').style.display = 'block';
    }
}

function displayBooks(books) {
    console.log('Displaying books:', books);
    const booksList = document.getElementById('booksList');
    const emptyState = document.getElementById('emptyState');
    
    if (!books || books.length === 0) {
        booksList.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    booksList.innerHTML = books.map(book => `
        <div class="book-card">
            <div class="book-card-header">
                <div class="book-id">ID: ${book.id}</div>
            </div>
            <div class="book-title">${escapeHtml(book.title)}</div>
            <div class="book-authors">📝 ${escapeHtml(book.authors.join(', '))}</div>
            <div class="book-year">📅 ${book.year}</div>
            ${book.createdBy ? `<div class="book-year">👤 Created by: ${book.createdBy}</div>` : ''}
            <div class="book-actions">
                <button class="btn btn-secondary btn-sm" onclick="editBook('${book.id}')">
                    ✏️ Edit
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteBook('${book.id}', '${escapeHtml(book.title)}')">
                    🗑️ Delete
                </button>
            </div>
        </div>
    `).join('');
}

function filterBooks() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const bookCards = document.querySelectorAll('.book-card');
    
    bookCards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}

// ===== Modal Management =====
function showCreateModal() {
    if (!currentToken) {
        showToast('Please set an auth token first', 'warning');
        return;
    }
    
    document.getElementById('modalTitle').textContent = 'Add New Book';
    document.getElementById('bookForm').reset();
    document.getElementById('bookId').value = '';
    document.getElementById('bookModal').classList.add('active');
}

function closeModal() {
    document.getElementById('bookModal').classList.remove('active');
}

async function editBook(bookId) {
    const result = await apiCall(`/books/${bookId}`);
    
    if (result.success) {
        const book = result.data;
        document.getElementById('modalTitle').textContent = 'Edit Book';
        document.getElementById('bookId').value = book.id;
        document.getElementById('title').value = book.title;
        document.getElementById('authors').value = book.authors.join(', ');
        document.getElementById('year').value = book.year;
        document.getElementById('bookModal').classList.add('active');
    } else {
        showToast(`Failed to load book: ${result.error}`, 'error');
    }
}

async function handleBookSubmit(event) {
    event.preventDefault();
    
    const bookId = document.getElementById('bookId').value;
    const title = document.getElementById('title').value;
    const authors = document.getElementById('authors').value.split(',').map(a => a.trim());
    const year = parseInt(document.getElementById('year').value);
    
    const bookData = { title, authors, year };
    
    let result;
    if (bookId) {
        // Update existing book
        result = await apiCall(`/books/${bookId}`, 'PUT', bookData);
    } else {
        // Create new book
        result = await apiCall('/books', 'POST', bookData);
    }
    
    console.log('Book submit result:', result);
    
    if (result.success) {
        showToast(`Book ${bookId ? 'updated' : 'created'} successfully`, 'success');
        closeModal();
        console.log('Reloading books after create/update...');
        await loadBooks();
    } else {
        showToast(`Failed to ${bookId ? 'update' : 'create'} book: ${result.error}`, 'error');
    }
}

async function deleteBook(bookId, title) {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
        return;
    }
    
    const result = await apiCall(`/books/${bookId}`, 'DELETE');
    
    if (result.success) {
        showToast('Book deleted successfully', 'success');
        loadBooks();
    } else {
        showToast(`Failed to delete book: ${result.error}`, 'error');
    }
}

// ===== External API Search =====
function showSearchModal() {
    if (!currentToken) {
        showToast('Please set an auth token first', 'warning');
        return;
    }
    
    document.getElementById('searchModal').classList.add('active');
    document.getElementById('searchResults').innerHTML = '';
}

function closeSearchModal() {
    document.getElementById('searchModal').classList.remove('active');
}

function switchSearchTab(api) {
    currentSearchApi = api;
    
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    
    document.getElementById('searchResults').innerHTML = '';
}

function handleSearchKeypress(event) {
    if (event.key === 'Enter') {
        searchExternal();
    }
}

async function searchExternal() {
    const query = document.getElementById('externalSearchInput').value.trim();
    
    if (!query) {
        showToast('Please enter a search term', 'warning');
        return;
    }
    
    const endpoint = currentSearchApi === 'openlibrary' 
        ? `/external/openlibrary?q=${encodeURIComponent(query)}`
        : `/external/gutendex?q=${encodeURIComponent(query)}`;
    
    document.getElementById('searchResults').innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">Searching...</div>';
    
    const result = await apiCall(endpoint);
    
    if (result.success) {
        displaySearchResults(result.data);
    } else {
        showToast(`Search failed: ${result.error}`, 'error');
        document.getElementById('searchResults').innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--danger);">Search failed</div>';
    }
}

function displaySearchResults(results) {
    const resultsContainer = document.getElementById('searchResults');
    
    if (!results || results.length === 0) {
        resultsContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">No results found</div>';
        return;
    }
    
    if (currentSearchApi === 'openlibrary') {
        resultsContainer.innerHTML = results.map(book => `
            <div class="search-result-item">
                <div class="book-title">${escapeHtml(book.title)}</div>
                <div class="book-authors">📝 ${book.author_name ? escapeHtml(book.author_name.join(', ')) : 'Unknown'}</div>
                <div class="book-year">📅 ${book.first_publish_year || 'Unknown'}</div>
            </div>
        `).join('');
    } else {
        resultsContainer.innerHTML = results.map(book => `
            <div class="search-result-item">
                <div class="book-title">${escapeHtml(book.title)}</div>
                <div class="book-authors">📝 ${book.authors ? escapeHtml(book.authors.map(a => a.name).join(', ')) : 'Unknown'}</div>
                <div class="book-year">🆔 ${book.id}</div>
            </div>
        `).join('');
    }
}

// ===== Utility Functions =====
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Initialize on Load =====
document.addEventListener('DOMContentLoaded', () => {
    checkHealth();
    updateTokenDisplay();
    
    // Close modals on background click
    document.getElementById('bookModal').addEventListener('click', (e) => {
        if (e.target.id === 'bookModal') closeModal();
    });
    
    document.getElementById('searchModal').addEventListener('click', (e) => {
        if (e.target.id === 'searchModal') closeSearchModal();
    });
});
