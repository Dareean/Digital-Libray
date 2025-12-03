// ===== Configuration =====
const API_BASE_URL = 'http://localhost:3333';
let currentUser = null;
let currentSearchApi = 'openlibrary';

// ===== Authentication Check =====
function checkAuth() {
    const authData = localStorage.getItem('auth');
    
    if (!authData) {
        window.location.href = 'login.html';
        return null;
    }
    
    try {
        currentUser = JSON.parse(authData);
        updateUserDisplay();
        updatePermissions();
        return currentUser;
    } catch (error) {
        console.error('Invalid auth data:', error);
        localStorage.removeItem('auth');
        window.location.href = 'login.html';
        return null;
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('auth');
        window.location.href = 'login.html';
    }
}

function updateUserDisplay() {
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userRole').textContent = currentUser.role.toUpperCase();
    
    const avatar = document.getElementById('userAvatar');
    avatar.textContent = currentUser.role === 'admin' ? '👑' : '👤';
}

function updatePermissions() {
    const permissionsList = document.getElementById('permissionsList');
    
    if (currentUser.role === 'admin') {
        permissionsList.innerHTML = `
            <div class="permission-item">✅ View all books</div>
            <div class="permission-item">✅ Add new books</div>
            <div class="permission-item">✅ Edit any book</div>
            <div class="permission-item">✅ Delete any book</div>
            <div class="permission-item">✅ Upload images</div>
        `;
    } else {
        permissionsList.innerHTML = `
            <div class="permission-item">✅ View all books</div>
            <div class="permission-item">✅ Add new books</div>
            <div class="permission-item">✅ Upload images</div>
            <div class="permission-item">❌ Edit other's books</div>
            <div class="permission-item">❌ Delete books</div>
        `;
    }
}

// ===== API Calls =====
async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json',
        'X-API-Token': currentUser.token
    };
    
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
    console.log('Loading books...');
    const result = await apiCall('/books');
    console.log('Load books result:', result);
    
    if (result.success) {
        console.log('Books data:', result.data);
        displayBooks(result.data);
        
        // Update stats
        document.getElementById('totalBooks').textContent = result.data.length;
        const myBooksCount = result.data.filter(book => book.createdBy === currentUser.username).length;
        document.getElementById('myBooks').textContent = myBooksCount;
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
    
    booksList.innerHTML = books.map(book => {
        const isMyBook = book.createdBy === currentUser.username;
        const canEdit = currentUser.role === 'admin' || isMyBook;
        const canDelete = currentUser.role === 'admin';
        
        const coverImage = book.coverImage || 'https://via.placeholder.com/200x300/1e1e2e/6366f1?text=' + encodeURIComponent(book.title);
        
        return `
            <div class="book-card">
                <div class="book-cover">
                    <img src="${escapeHtml(coverImage)}" alt="${escapeHtml(book.title)}" onerror="this.src='https://via.placeholder.com/200x300/1e1e2e/6366f1?text=No+Image'">
                </div>
                <div class="book-card-header">
                    <div class="book-id">ID: ${book.id}</div>
                    ${isMyBook ? '<div class="book-badge">📌 Mine</div>' : ''}
                </div>
                <div class="book-title">${escapeHtml(book.title)}</div>
                <div class="book-authors">📝 ${escapeHtml(book.authors.join(', '))}</div>
                <div class="book-year">📅 ${book.year}</div>
                ${book.description ? `<div class="book-description">${escapeHtml(book.description)}</div>` : ''}
                <div class="book-meta">👤 ${escapeHtml(book.createdBy || 'Unknown')}</div>
                <div class="book-actions">
                    ${canEdit ? `<button class="btn btn-secondary btn-sm" onclick="editBook('${book.id}')">✏️ Edit</button>` : ''}
                    ${canDelete ? `<button class="btn btn-danger btn-sm" onclick="deleteBook('${book.id}', '${escapeHtml(book.title)}')">🗑️ Delete</button>` : ''}
                    ${!canEdit && !canDelete ? '<div style="color: var(--text-muted); font-size: 0.75rem;">View only</div>' : ''}
                </div>
            </div>
        `;
    }).join('');
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
        
        // Check permissions
        const canEdit = currentUser.role === 'admin' || book.createdBy === currentUser.username;
        if (!canEdit) {
            showToast('You do not have permission to edit this book', 'error');
            return;
        }
        
        document.getElementById('modalTitle').textContent = 'Edit Book';
        document.getElementById('bookId').value = book.id;
        document.getElementById('coverImage').value = book.coverImage || '';
        document.getElementById('title').value = book.title;
        document.getElementById('authors').value = book.authors.join(', ');
        document.getElementById('year').value = book.year;
        document.getElementById('description').value = book.description || '';
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
    const coverImage = document.getElementById('coverImage').value;
    const description = document.getElementById('description').value;
    
    const bookData = { 
        title, 
        authors, 
        year,
        coverImage: coverImage || undefined,
        description: description || undefined
    };
    
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
    if (currentUser.role !== 'admin') {
        showToast('Only admins can delete books', 'error');
        return;
    }
    
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
    // Check authentication first
    if (!checkAuth()) return;
    
    // Load initial data
    checkHealth();
    loadBooks();
    
    // Close modals on background click
    document.getElementById('bookModal').addEventListener('click', (e) => {
        if (e.target.id === 'bookModal') closeModal();
    });
    
    document.getElementById('searchModal').addEventListener('click', (e) => {
        if (e.target.id === 'searchModal') closeSearchModal();
    });
});
