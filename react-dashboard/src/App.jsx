import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const API_BASE_URL = 'http://localhost:3333'
const ADMIN_TOKEN = 'token-all-456'
const USER_TOKEN = 'token-limited-123'
const AUTH_STORAGE_KEY = 'digital-library-auth'
const LAST_READ_STORAGE_KEY = 'digital-library-last-read'
const DEFAULT_ADMIN = {
  name: 'Administrator',
  email: 'admin@library.local',
  password: 'admin123',
  role: 'Admin',
  avatar: '',
  bio: 'Curator in chief'
}

const withProfileDefaults = (user) => ({
  avatar: '',
  bio: '',
  ...user
})

const emptyForm = {
  id: '',
  title: '',
  authors: '',
  year: '',
  description: '',
  coverImage: '',
  externalLink: '',
  status: 'available',
  content: ''
}

const endpointCatalog = [
  { method: 'GET', path: '/books', description: 'List every stored book' },
  { method: 'GET', path: '/books/:id', description: 'Inspect a specific book' },
  { method: 'POST', path: '/books', description: 'Create a new book (auth required)' },
  { method: 'PUT', path: '/books/:id', description: 'Update a book (admin)' },
  { method: 'DELETE', path: '/books/:id', description: 'Remove a book (admin)' },
  { method: 'GET', path: '/external/openlibrary', description: 'Search OpenLibrary via proxy' },
  { method: 'GET', path: '/external/gutendex', description: 'Search Gutendex via proxy' }
]

const userPermissions = [
  'Browse entire catalogue',
  'Read book descriptions',
  'View cover and availability status',
  'Open reading content',
  'Import titles from external APIs'
]

const adminPermissions = [
  ...userPermissions,
  'Create & edit books',
  'Delete books',
  'Search & enrich catalogue'
]

const getInitialAuthState = () => {
  if (typeof window === 'undefined') return { users: [DEFAULT_ADMIN], currentUser: null }
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return { users: [DEFAULT_ADMIN], currentUser: null }
    const parsed = JSON.parse(raw)
    const persistedUsers = Array.isArray(parsed.users) ? parsed.users.map(withProfileDefaults) : []
    if (!persistedUsers.some((user) => user.email === DEFAULT_ADMIN.email)) {
      persistedUsers.push(withProfileDefaults(DEFAULT_ADMIN))
    }
    return {
      users: persistedUsers,
      currentUser: parsed.currentUser ? withProfileDefaults(parsed.currentUser) : null
    }
  } catch (err) {
    console.warn('Failed to read auth state', err)
    return { users: [withProfileDefaults(DEFAULT_ADMIN)], currentUser: null }
  }
}

const getInitialLastRead = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LAST_READ_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function App() {
  const initialAuthState = useMemo(() => getInitialAuthState(), [])
  const [users, setUsers] = useState(initialAuthState.users)
  const [currentUser, setCurrentUser] = useState(initialAuthState.currentUser)
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [authError, setAuthError] = useState('')
  const [authBanner, setAuthBanner] = useState('')

  const [books, setBooks] = useState([])
  const [booksError, setBooksError] = useState('')
  const [loadingBooks, setLoadingBooks] = useState(false)
  const [lastSync, setLastSync] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeSection, setActiveSection] = useState('dashboard')
  const [bookModalOpen, setBookModalOpen] = useState(false)
  const [bookForm, setBookForm] = useState(emptyForm)
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [externalApi, setExternalApi] = useState('openlibrary')
  const [externalQuery, setExternalQuery] = useState('')
  const [externalResults, setExternalResults] = useState([])
  const [externalLoading, setExternalLoading] = useState(false)
  const [importingExternalId, setImportingExternalId] = useState('')
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [activeBook, setActiveBook] = useState(null)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    password: '',
    avatar: currentUser?.avatar || '',
    bio: currentUser?.bio || ''
  })
  const [lastReadEntry, setLastReadEntry] = useState(() => getInitialLastRead())
  const [health, setHealth] = useState({ label: 'Checking...', ok: false })
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false })
  const toastTimer = useRef(null)

  const role = currentUser?.role || 'Guest'
  const isAdmin = role === 'Admin'
  const authToken = currentUser ? (isAdmin ? ADMIN_TOKEN : USER_TOKEN) : ''

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ users, currentUser }))
  }, [users, currentUser])

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, type, visible: true })
    toastTimer.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }))
    }, 3000)
  }, [])

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  const apiCall = useCallback(async (endpoint, { method = 'GET', body } = {}) => {
    const headers = { 'Content-Type': 'application/json' }
    if (authToken) headers['X-API-Token'] = authToken

    const options = { method, headers }
    if (body !== undefined) options.body = JSON.stringify(body)

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, options)
      const text = await response.text()
      let payload = null
      if (text) {
        try {
          payload = JSON.parse(text)
        } catch {
          payload = text
        }
      }

      if (!response.ok) {
        const message = typeof payload === 'object' && payload?.message
          ? payload.message
          : `HTTP ${response.status}`
        throw new Error(message)
      }

      return payload ?? {}
    } catch (err) {
      throw new Error(err.message || 'Network request failed')
    }
  }, [authToken])

  const loadBooks = useCallback(async () => {
    setLoadingBooks(true)
    setBooksError('')
    try {
      const data = await apiCall('/books')
      if (Array.isArray(data)) {
        setBooks(data)
        setLastSync(new Date())
      } else {
        setBooks([])
      }
    } catch (err) {
      setBooks([])
      setBooksError(err.message)
      showToast(`Failed to load books: ${err.message}`, 'error')
    } finally {
      setLoadingBooks(false)
    }
  }, [apiCall, showToast])

  const checkHealth = useCallback(async () => {
    setHealth({ label: 'Checking...', ok: false })
    try {
      await apiCall('/health')
      setHealth({ label: 'Online', ok: true })
      showToast('API is healthy', 'success')
    } catch (err) {
      setHealth({ label: 'Offline', ok: false })
      showToast(`API connection failed: ${err.message}`, 'error')
    }
  }, [apiCall, showToast])

  useEffect(() => {
    checkHealth()
    loadBooks()
  }, [checkHealth, loadBooks])

  useEffect(() => {
    if (!currentUser) {
      setSearchModalOpen(false)
      setBookModalOpen(false)
    }
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) return
    setProfileForm({
      name: currentUser.name || '',
      email: currentUser.email || '',
      password: '',
      avatar: currentUser.avatar || '',
      bio: currentUser.bio || ''
    })
  }, [currentUser])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!lastReadEntry) {
      localStorage.removeItem(LAST_READ_STORAGE_KEY)
      return
    }
    localStorage.setItem(LAST_READ_STORAGE_KEY, JSON.stringify(lastReadEntry))
  }, [lastReadEntry])

  const filteredBooks = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()
    if (!keyword) return books
    return books.filter((book) => {
      const haystack = [
        book.title,
        (book.authors || []).join(' '),
        book.createdBy,
        book.year,
        book.status,
        book.description,
        book.externalLink
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(keyword)
    })
  }, [books, searchTerm])

  const totalAuthors = useMemo(() => {
    const unique = new Set()
    books.forEach((book) => {
      ;(book.authors || []).forEach((author) => unique.add(author))
    })
    return unique.size
  }, [books])

  const lastReadBook = useMemo(() => {
    if (!lastReadEntry) return null
    return books.find((book) => String(book.id) === String(lastReadEntry.id)) || lastReadEntry
  }, [books, lastReadEntry])

  const statusSummary = useMemo(() => {
    const available = books.filter((book) => book.status === 'available').length
    const unavailable = books.length - available
    return {
      available,
      unavailable,
      total: books.length,
      completion: books.length ? Math.round((available / books.length) * 100) : 0
    }
  }, [books])

  const readingProgressPoints = useMemo(() => {
    if (!books.length) return [0, 0, 0, 0, 0, 0]
    const base = Math.max(books.length, 6)
    return Array.from({ length: 6 }).map((_, index) => {
      const variance = (index % 2 === 0 ? 0.8 : 1.1)
      return Math.round((base / 6) * (index + 1) * variance)
    })
  }, [books])

  const readingProgressPeak = useMemo(() => Math.max(...readingProgressPoints, 1), [readingProgressPoints])

  const spotlightBook = useMemo(() => {
    if (!books.length) return null
    return books.reduce((selected, book) => {
      const candidateScore = (book.description || '').length + (book.authors?.length || 0) * 10
      if (!selected) return { book, score: candidateScore }
      return candidateScore > selected.score ? { book, score: candidateScore } : selected
    }, null)?.book
  }, [books])

  const topAuthors = useMemo(() => {
    const tally = new Map()
    books.forEach((book) => {
      ;(book.authors || []).forEach((author) => {
        tally.set(author, (tally.get(author) || 0) + 1)
      })
    })
    return Array.from(tally.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }))
  }, [books])

  const lastReadStillAvailable = useMemo(() => {
    if (!lastReadEntry) return false
    return books.some((book) => String(book.id) === String(lastReadEntry.id))
  }, [books, lastReadEntry])

  const handleLogout = () => {
    setCurrentUser(null)
    setAuthBanner('Logged out successfully')
    showToast('You are logged out', 'success')
  }

  const openProfileModal = () => {
    if (!currentUser) return
    setProfileModalOpen(true)
  }

  const closeProfileModal = () => {
    setProfileModalOpen(false)
    setProfileForm((prev) => ({ ...prev, password: '' }))
  }

  const handleAuthSubmit = (event) => {
    event.preventDefault()
    setAuthError('')
    const email = authForm.email.trim().toLowerCase()
    const password = authForm.password.trim()

    if (!email || !password) {
      setAuthError('Email and password are required')
      return
    }

    if (authMode === 'login') {
      const match = users.find((user) => user.email.toLowerCase() === email)
      if (!match || match.password !== password) {
        setAuthError('Invalid email or password')
        return
      }
      setCurrentUser({
        name: match.name,
        email: match.email,
        role: match.role,
        avatar: match.avatar,
        bio: match.bio
      })
      setAuthBanner('')
      setAuthForm({ name: '', email: '', password: '' })
      showToast(`Welcome back, ${match.name}`, 'success')
      return
    }

    if (!authForm.name.trim()) {
      setAuthError('Name is required for registration')
      return
    }

    if (users.some((user) => user.email.toLowerCase() === email)) {
      setAuthError('Email already registered')
      return
    }

    const newUser = {
      name: authForm.name.trim(),
      email,
      password,
      role: 'User',
      avatar: '',
      bio: ''
    }
    setUsers((prev) => [...prev, newUser])
    setCurrentUser({
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      avatar: newUser.avatar,
      bio: newUser.bio
    })
    setAuthForm({ name: '', email: '', password: '' })
    showToast('Account created as User', 'success')
  }

  const handleProfileSubmit = (event) => {
    event.preventDefault()
    if (!currentUser) return

    const trimmedName = profileForm.name.trim()
    const trimmedEmail = profileForm.email.trim().toLowerCase()
    const trimmedAvatar = profileForm.avatar.trim()
    const trimmedBio = profileForm.bio.trim()

    if (!trimmedName || !trimmedEmail) {
      showToast('Name and email are required', 'warning')
      return
    }

    const emailTaken = users.some((user) => user.email.toLowerCase() === trimmedEmail && user.email !== currentUser.email)
    if (emailTaken) {
      showToast('Email already in use', 'error')
      return
    }

    setUsers((prev) => prev.map((user) => {
      if (user.email === currentUser.email) {
        return {
          ...user,
          name: trimmedName,
          email: trimmedEmail,
          password: profileForm.password ? profileForm.password : user.password,
          avatar: trimmedAvatar,
          bio: trimmedBio
        }
      }
      return user
    }))

    setCurrentUser((prev) => ({
      ...prev,
      name: trimmedName,
      email: trimmedEmail,
      avatar: trimmedAvatar,
      bio: trimmedBio
    }))

    setProfileForm((prev) => ({ ...prev, password: '' }))
    setProfileModalOpen(false)
    showToast('Profile updated', 'success')
  }

  const openCreateModal = () => {
    if (!isAdmin) {
      showToast('Only admin can add books', 'warning')
      return
    }
    setBookForm(emptyForm)
    setBookModalOpen(true)
  }

  const handleEditBook = async (bookId) => {
    if (!isAdmin) {
      showToast('Only admin can edit books', 'warning')
      return
    }
    try {
      const data = await apiCall(`/books/${bookId}`)
      setBookForm({
        id: data.id,
        title: data.title || '',
        authors: Array.isArray(data.authors) ? data.authors.join(', ') : '',
        year: data.year ? String(data.year) : '',
        description: data.description || '',
        coverImage: data.coverImage || '',
        externalLink: data.externalLink || '',
        status: data.status || 'available',
        content: data.content || ''
      })
      setBookModalOpen(true)
    } catch (err) {
      showToast(`Failed to load book: ${err.message}`, 'error')
    }
  }

  const closeBookModal = () => {
    setBookModalOpen(false)
    setBookForm(emptyForm)
  }

  const handleBookSubmit = async (event) => {
    event.preventDefault()
    if (!isAdmin) return

    const trimmedTitle = bookForm.title.trim()
    if (!trimmedTitle) {
      showToast('Title is required', 'warning')
      return
    }

    const authors = bookForm.authors
      .split(',')
      .map((author) => author.trim())
      .filter(Boolean)

    const payload = {
      title: trimmedTitle,
      authors,
      year: Number(bookForm.year) || new Date().getFullYear(),
      description: bookForm.description.trim(),
      coverImage: bookForm.coverImage.trim(),
      externalLink: bookForm.externalLink.trim(),
      status: bookForm.status,
      content: bookForm.content.trim()
    }

    try {
      if (bookForm.id) {
        await apiCall(`/books/${bookForm.id}`, { method: 'PUT', body: payload })
        showToast('Book updated', 'success')
      } else {
        await apiCall('/books', { method: 'POST', body: payload })
        showToast('Book created', 'success')
      }
      closeBookModal()
      loadBooks()
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error')
    }
  }

  const handleDeleteBook = async (book) => {
    if (!isAdmin) return
    const confirmed = window.confirm(`Delete "${book.title}"?`)
    if (!confirmed) return

    try {
      await apiCall(`/books/${book.id}`, { method: 'DELETE' })
      showToast('Book deleted', 'success')
      loadBooks()
    } catch (err) {
      showToast(`Delete failed: ${err.message}`, 'error')
    }
  }

  const openSearchModal = () => {
    if (!currentUser) {
      showToast('Please login to use external search', 'warning')
      return
    }
    setSearchModalOpen(true)
    setExternalResults([])
    setExternalQuery('')
  }

  const closeSearchModal = () => {
    setSearchModalOpen(false)
  }

  const handleExternalSearch = async () => {
    if (!externalQuery.trim()) {
      showToast('Enter a search term', 'warning')
      return
    }

    setExternalLoading(true)
    setExternalResults([])
    try {
      const endpoint = externalApi === 'openlibrary'
        ? `/external/openlibrary?q=${encodeURIComponent(externalQuery.trim())}`
        : `/external/gutendex?q=${encodeURIComponent(externalQuery.trim())}`
      const result = await apiCall(endpoint)
      const list = Array.isArray(result)
        ? result
        : Array.isArray(result?.data)
          ? result.data
          : []
      const tagged = list.map((item) => ({ ...item, _source: externalApi }))
      setExternalResults(tagged)
    } catch (err) {
      showToast(`Search failed: ${err.message}`, 'error')
    } finally {
      setExternalLoading(false)
    }
  }

  const getExternalId = (entry) => entry.key || entry.id || entry.gutenberg_id || entry.title

  const buildPayloadFromExternal = (entry) => {
    const source = entry._source || 'openlibrary'
    if (source === 'gutendex') {
      const authors = (entry.authors || []).map((author) => author.name).filter(Boolean)
      const subjectSummary = (entry.subjects || []).slice(0, 6).join(', ')
      const rawDescription = typeof entry.description === 'string'
        ? entry.description
        : entry.description?.value
      const coverImage = entry.formats?.['image/jpeg'] || entry.formats?.['image/png'] || ''
      const textLink = entry.formats?.['text/html; charset=utf-8']
        || entry.formats?.['text/html']
        || entry.formats?.['text/plain; charset=utf-8']
        || entry.formats?.['text/plain']
        || ''
      const externalLink = entry.id ? `https://www.gutenberg.org/ebooks/${entry.id}` : textLink
      const primaryAuthor = entry.authors?.[0]
      const resolvedAuthors = authors.length ? authors : ['Unknown author']
      return {
        title: entry.title || 'Untitled Manuscript',
        authors: resolvedAuthors,
        year: Number(primaryAuthor?.birth_year) || Number(primaryAuthor?.death_year) || new Date().getFullYear(),
        description: rawDescription || subjectSummary || 'Imported from Gutendex catalog.',
        coverImage,
        externalLink,
        status: 'available',
        content: textLink ? `Read online: ${textLink}` : 'Imported from Gutendex catalog.'
      }
    }

    const authors = entry.author_name || entry.authors || []
    const rawDescription = typeof entry.description === 'string'
      ? entry.description
      : entry.description?.value
    const subjectSummary = Array.isArray(entry.subject) ? entry.subject.slice(0, 6).join(', ') : ''
    const publisherHint = Array.isArray(entry.publisher) ? `Published by ${entry.publisher[0]}` : ''
    const description = rawDescription || entry.subtitle || subjectSummary || publisherHint
    const coverImage = entry.cover_i
      ? `https://covers.openlibrary.org/b/id/${entry.cover_i}-L.jpg`
      : Array.isArray(entry.isbn) && entry.isbn.length > 0
        ? `https://covers.openlibrary.org/b/isbn/${entry.isbn[0]}-L.jpg`
        : ''
    const firstSentence = Array.isArray(entry.first_sentence)
      ? entry.first_sentence[0]
      : entry.first_sentence
    const normalizedAuthors = Array.isArray(authors) ? authors.filter(Boolean) : [authors].filter(Boolean)
    const workKey = entry.key
      || entry.seed?.find((item) => typeof item === 'string' && item.startsWith('/works/'))
      || entry.seed?.[0]
    const externalLink = workKey ? `https://openlibrary.org${workKey}` : ''
    return {
      title: entry.title || 'Untitled Manuscript',
      authors: normalizedAuthors.length ? normalizedAuthors : ['Unknown author'],
      year: Number(entry.first_publish_year || entry.publish_year?.[0]) || new Date().getFullYear(),
      description: description || 'Imported from Open Library search result.',
      coverImage,
      externalLink,
      status: 'available',
      content: firstSentence || subjectSummary || 'Imported from Open Library search result.'
    }
  }

  const importExternalBook = async (entry) => {
    if (!currentUser) {
      showToast('Login first to import books', 'warning')
      return
    }

    const payload = buildPayloadFromExternal(entry)
    if (!payload.title) {
      showToast('Missing title from external result', 'error')
      return
    }

    const importId = getExternalId(entry)
    setImportingExternalId(importId)
    try {
      await apiCall('/books', { method: 'POST', body: payload })
      showToast('Book imported into library', 'success')
      loadBooks()
    } catch (err) {
      showToast(`Import failed: ${err.message}`, 'error')
    } finally {
      setImportingExternalId('')
    }
  }

  const openDetailModal = (book) => {
    setActiveBook(book)
    setDetailModalOpen(true)
    setLastReadEntry({
      id: book.id,
      title: book.title,
      authors: book.authors,
      coverImage: book.coverImage,
      status: book.status,
      timestamp: Date.now()
    })
  }

  const closeDetailModal = () => {
    setDetailModalOpen(false)
    setActiveBook(null)
  }

  const statusPillClass = health.ok ? 'status-pill ok' : 'status-pill offline'

  if (!currentUser) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <h1>Welcome Back</h1>
          <p className="subtitle">Digital Library System</p>
          {authBanner && <div className="auth-banner">{authBanner}</div>}
          <form onSubmit={handleAuthSubmit} className="auth-form">
            {authMode === 'register' && (
              <label>
                <span>Name</span>
                <input
                  type="text"
                  value={authForm.name}
                  onChange={(event) => setAuthForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Your full name"
                />
              </label>
            )}
            <label>
              <span>Email</span>
              <input
                type="email"
                value={authForm.email}
                onChange={(event) => setAuthForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="you@example.com"
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                value={authForm.password}
                onChange={(event) => setAuthForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="Enter your password"
              />
            </label>
            {authError && <p className="auth-error">{authError}</p>}
            <button type="submit" className="btn btn-primary btn-block">
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
          <p className="auth-footer">
            {authMode === 'login' ? "Don't have an account?" : 'Already registered?'}{' '}
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setAuthMode((prev) => (prev === 'login' ? 'register' : 'login'))
                setAuthError('')
              }}
            >
              {authMode === 'login' ? 'Sign up' : 'Back to login'}
            </button>
          </p>
          <div className="auth-hint">
            Admin demo: {DEFAULT_ADMIN.email} / {DEFAULT_ADMIN.password}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="brand">Digital Library</div>
        <nav className="nav-links">
          <span
            className={`nav-link ${activeSection === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveSection('dashboard')}
          >
            Dashboard
          </span>
          <span
            className={`nav-link ${activeSection === 'koleksi' ? 'active' : ''}`}
            onClick={() => setActiveSection('koleksi')}
          >
            Koleksi
          </span>
          <span className="nav-link">History</span>
          <span className="nav-link">Referensi</span>
          {isAdmin && <span className="nav-link">Admin</span>}
        </nav>
        <div className="nav-actions">
          <div className="chip">{role}</div>
          <button className="btn btn-secondary" onClick={openProfileModal}>
            Edit Profile
          </button>
          <div
            className={`user-avatar ${currentUser.avatar ? 'has-photo' : ''}`}
            onClick={openProfileModal}
            title="Edit profile"
          >
            {currentUser.avatar && (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                  event.currentTarget.parentElement?.classList.remove('has-photo')
                }}
              />
            )}
            <span className="avatar-letter">{currentUser.name?.[0]?.toUpperCase() || 'U'}</span>
          </div>
          <button className="btn btn-secondary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className="container">
        <section className="stats-grid">
          <article className="stat-card">
            <div className="stat-icon">📚</div>
            <div>
              <div className="stat-label">Total Books</div>
              <div className="stat-value">{books.length}</div>
              <div className="book-meta">Last sync: {lastSync ? lastSync.toLocaleTimeString() : 'Never'}</div>
            </div>
          </article>
          <article className="stat-card">
            <div className="stat-icon">✍️</div>
            <div>
              <div className="stat-label">Unique Authors</div>
              <div className="stat-value">{totalAuthors}</div>
              <div className="book-meta">Active role: {role}</div>
            </div>
          </article>
          <article className="stat-card">
            <div className="stat-icon">🩺</div>
            <div>
              <div className="stat-label">Server Status</div>
              <div className="stat-value">
                <span className={statusPillClass}>{health.label}</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={checkHealth}>
                Refresh
              </button>
            </div>
          </article>
        </section>

        <section className="main-content">
          <aside className="sidebar">
            <div className="action-section">
              <h3>Actions</h3>
              <button className="btn btn-primary btn-block" onClick={openCreateModal} disabled={!isAdmin}>
                ➕ Add New Book
              </button>
              <button className="btn btn-secondary btn-block" onClick={loadBooks}>
                🔄 Refresh List
              </button>
              <button className="btn btn-secondary btn-block" onClick={openSearchModal} disabled={!currentUser}>
                🔍 Search External APIs
              </button>
              <button className="btn btn-secondary btn-block" onClick={checkHealth}>
                ❤️ Check API Health
              </button>
            </div>

            <div className="user-permissions">
              <h4>Your Permissions</h4>
              <div className="permission-list">
                {(isAdmin ? adminPermissions : userPermissions).map((item) => (
                  <div key={item} className="permission-item">{item}</div>
                ))}
              </div>
            </div>

            <div className="api-info">
              <h4>API Surface</h4>
              <div className="endpoint-list">
                {endpointCatalog.map((endpoint) => (
                  <div key={endpoint.path + endpoint.method} className="endpoint-item">
                    <span className={`method ${endpoint.method.toLowerCase()}`}>{endpoint.method}</span>
                    <span className="path">{endpoint.path}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className="content">
            {activeSection === 'dashboard' && (
              <div className="dashboard-view">
                <div className="content-header">
                  <div>
                    <h2>Reading Overview</h2>
                    <p className="subtitle">Snapshot as of {new Date().toLocaleString()}</p>
                  </div>
                </div>
                <div className="dashboard-grid">
                  <article className="summary-card">
                    <div className="summary-label">Book Status</div>
                    <div className="summary-value">{statusSummary.total || 0} titles</div>
                    <div className="summary-meta">
                      <span>Available: {statusSummary.available}</span>
                      <span>Unavailable: {statusSummary.unavailable}</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${statusSummary.completion}%` }} />
                    </div>
                  </article>
                  <article className="summary-card last-read-card">
                    <div className="summary-label">Last Book You Read</div>
                    {lastReadBook ? (
                      <div className="last-read-body">
                        {lastReadBook.coverImage && (
                          <img src={lastReadBook.coverImage} alt={lastReadBook.title} />
                        )}
                        <div>
                          <div className="summary-value">{lastReadBook.title}</div>
                          <div className="summary-meta">
                            {(lastReadBook.authors || []).join(', ') || 'Unknown author'}
                          </div>
                          {lastReadStillAvailable ? (
                            <button className="btn btn-secondary btn-sm" onClick={() => openDetailModal(lastReadBook)}>
                              Continue Reading
                            </button>
                          ) : (
                            <p className="summary-meta">Book unavailable in current catalogue.</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="summary-meta">Start exploring the library to see your history here.</p>
                    )}
                  </article>
                  <article className="summary-card progress-card">
                    <div className="summary-label">Reading Progress</div>
                    <div className="summary-value">{statusSummary.completion}% complete</div>
                    <div className="sparkline" aria-label="Weekly reading progress">
                      {readingProgressPoints.map((point, index) => {
                        const height = `${Math.round((point / readingProgressPeak) * 100)}%`
                        return <div key={index} className="sparkline-bar" style={{ height }} />
                      })}
                    </div>
                    <div className="summary-meta">6-week rolling trend</div>
                  </article>
                </div>

                <div className="dashboard-grid showcase-row">
                  <article className="spotlight-card">
                    <div className="summary-label">Curator's Spotlight</div>
                    {spotlightBook ? (
                      <>
                        <h3>{spotlightBook.title}</h3>
                        <p className="book-description" style={{ WebkitLineClamp: 4 }}>{spotlightBook.description || 'No description provided.'}</p>
                        <button className="btn btn-primary btn-sm" onClick={() => openDetailModal(spotlightBook)}>
                          View Details
                        </button>
                      </>
                    ) : (
                      <p className="summary-meta">Add books to unlock personalized recommendations.</p>
                    )}
                  </article>
                  <article className="leaderboard-card">
                    <div className="summary-label">Top Authors</div>
                    {topAuthors.length > 0 ? (
                      <ul>
                        {topAuthors.map((author) => (
                          <li key={author.name}>
                            <span>{author.name}</span>
                            <span>{author.count} titles</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="summary-meta">No authors tracked yet.</p>
                    )}
                  </article>
                </div>
              </div>
            )}

            {activeSection === 'koleksi' && (
              <div className="koleksi-view">
                <div className="content-header">
                  <div>
                    <h2>Koleksi Buku</h2>
                    <p className="subtitle">Filter dan kelola koleksi</p>
                  </div>
                  <div className="search-box">
                    <input
                      type="text"
                      placeholder="Search books, authors, or status"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                    />
                  </div>
                </div>

                {loadingBooks && <div className="loading-state">Loading books...</div>}
                {!loadingBooks && booksError && (
                  <div className="loading-state" style={{ color: 'var(--danger)' }}>
                    {booksError}
                  </div>
                )}

                {!loadingBooks && !booksError && filteredBooks.length === 0 && (
                  <div className="empty-state">
                    <div className="empty-icon">📚</div>
                    <h3>No books found</h3>
                    <p>Add new books or try a different search keyword.</p>
                    {isAdmin && (
                      <button className="btn btn-primary" onClick={openCreateModal}>
                        Add Book
                      </button>
                    )}
                  </div>
                )}

                {!loadingBooks && !booksError && filteredBooks.length > 0 && (
                  <div className="books-grid">
                    {filteredBooks.map((book) => (
                      <article key={book.id} className="book-card">
                        <div className={`book-cover ${book.coverImage ? 'has-image' : 'no-image'}`}>
                          {book.coverImage && (
                            <img
                              src={book.coverImage}
                              alt={book.title}
                              onError={(event) => {
                                event.currentTarget.style.display = 'none'
                                event.currentTarget.parentElement?.classList.add('no-image')
                              }}
                            />
                          )}
                          <div className="book-cover-fallback">
                            <span>No cover available</span>
                          </div>
                        </div>
                        <div className="book-card-header">
                          <span className="book-id">ID: {book.id}</span>
                          <span className={`status-tag ${book.status === 'available' ? 'available' : 'unavailable'}`}>
                            {book.status || 'unknown'}
                          </span>
                        </div>
                        <div className="book-title">{book.title}</div>
                        <div className="book-authors">📝 {(book.authors || []).join(', ') || 'Unknown author'}</div>
                        <div className="book-year">📅 {book.year || 'Unknown year'}</div>
                        {book.description && <p className="book-description">{book.description}</p>}
                        {book.externalLink && (
                          <a
                            className="book-link"
                            href={book.externalLink}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Visit source ↗
                          </a>
                        )}
                        <div className="book-actions">
                          <button className="btn btn-secondary btn-sm" onClick={() => openDetailModal(book)}>
                            👁️ View
                          </button>
                          {isAdmin && (
                            <>
                              <button className="btn btn-secondary btn-sm" onClick={() => handleEditBook(book.id)}>
                                ✏️ Edit
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteBook(book)}>
                                🗑️ Delete
                              </button>
                            </>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </section>
      </div>

      <div
        className={`modal ${profileModalOpen ? 'active' : ''}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeProfileModal()
        }}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h3>Edit Profile</h3>
            <button className="close-btn" onClick={closeProfileModal}>
              &times;
            </button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleProfileSubmit} className="profile-form">
              <div className="form-group">
                <label htmlFor="profileName">Name</label>
                <input
                  id="profileName"
                  type="text"
                  value={profileForm.name}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="profileEmail">Email</label>
                <input
                  id="profileEmail"
                  type="email"
                  value={profileForm.email}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="profilePassword">Password</label>
                <input
                  id="profilePassword"
                  type="password"
                  value={profileForm.password}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Leave blank to keep current password"
                />
              </div>
              <div className="form-group">
                <label htmlFor="profileAvatar">Profile Photo URL</label>
                <input
                  id="profileAvatar"
                  type="url"
                  value={profileForm.avatar}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, avatar: event.target.value }))}
                  placeholder="https://example.com/avatar.png"
                />
              </div>
              <div className="form-group">
                <label htmlFor="profileBio">Bio</label>
                <textarea
                  id="profileBio"
                  rows="3"
                  value={profileForm.bio}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, bio: event.target.value }))}
                  placeholder="Tell the library who you are..."
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeProfileModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div
        className={`modal ${bookModalOpen ? 'active' : ''}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeBookModal()
        }}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h3>{bookForm.id ? 'Edit Book' : 'Add New Book'}</h3>
            <button className="close-btn" onClick={closeBookModal}>
              &times;
            </button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleBookSubmit}>
              <div className="form-group">
                <label htmlFor="title">Title *</label>
                <input
                  id="title"
                  type="text"
                  value={bookForm.title}
                  onChange={(event) => setBookForm((prev) => ({ ...prev, title: event.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="authors">Authors *</label>
                <input
                  id="authors"
                  type="text"
                  value={bookForm.authors}
                  onChange={(event) => setBookForm((prev) => ({ ...prev, authors: event.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="year">Publication Year</label>
                <input
                  id="year"
                  type="number"
                  min="0"
                  value={bookForm.year}
                  onChange={(event) => setBookForm((prev) => ({ ...prev, year: event.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="coverImage">Cover Image URL</label>
                <input
                  id="coverImage"
                  type="url"
                  value={bookForm.coverImage}
                  onChange={(event) => setBookForm((prev) => ({ ...prev, coverImage: event.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="externalLink">External Link / Source</label>
                <input
                  id="externalLink"
                  type="url"
                  placeholder="https://example.com/book-page"
                  value={bookForm.externalLink}
                  onChange={(event) => setBookForm((prev) => ({ ...prev, externalLink: event.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  value={bookForm.status}
                  onChange={(event) => setBookForm((prev) => ({ ...prev, status: event.target.value }))}
                >
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  rows="3"
                  value={bookForm.description}
                  onChange={(event) => setBookForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="content">Reading Content</label>
                <textarea
                  id="content"
                  rows="4"
                  value={bookForm.content}
                  onChange={(event) => setBookForm((prev) => ({ ...prev, content: event.target.value }))}
                  placeholder="Paste excerpt or summary"
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeBookModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {bookForm.id ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div
        className={`modal ${searchModalOpen ? 'active' : ''}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeSearchModal()
        }}
      >
        <div className="modal-content modal-large">
          <div className="modal-header">
            <h3>Search External APIs</h3>
            <button className="close-btn" onClick={closeSearchModal}>
              &times;
            </button>
          </div>
          <div className="modal-body">
            <div className="search-tabs">
              <button
                className={`tab-btn ${externalApi === 'openlibrary' ? 'active' : ''}`}
                onClick={() => setExternalApi('openlibrary')}
              >
                Open Library
              </button>
              <button
                className={`tab-btn ${externalApi === 'gutendex' ? 'active' : ''}`}
                onClick={() => setExternalApi('gutendex')}
              >
                Gutendex
              </button>
            </div>
            <div className="search-actions">
              <input
                type="text"
                placeholder="Search books..."
                value={externalQuery}
                onChange={(event) => setExternalQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleExternalSearch()
                }}
              />
              <button className="btn btn-primary" onClick={handleExternalSearch} disabled={externalLoading}>
                {externalLoading ? 'Searching...' : 'Search'}
              </button>
            </div>
            <div className="search-results">
              {externalResults.length === 0 && !externalLoading && (
                <div className="search-info">Results will appear here.</div>
              )}
              {externalResults.map((result, index) => {
                const preview = buildPayloadFromExternal(result)
                const previewAuthors = (preview.authors || []).join(', ') || 'Unknown'
                const sourceLabel = (result._source || externalApi) === 'gutendex' ? 'Gutendex' : 'Open Library'
                const importDisabled = importingExternalId === getExternalId(result)
                return (
                  <div key={result.id || result.key || index} className="search-result-item">
                    <div className="book-title">
                      {preview.title}
                      <span className="status-tag" style={{ marginLeft: '0.5rem' }}>
                        {sourceLabel}
                      </span>
                    </div>
                    <div className="book-authors">📝 {previewAuthors}</div>
                    <div className="book-year">📅 {preview.year || 'Unknown'}</div>
                    {preview.description && (
                      <p className="book-description" style={{ WebkitLineClamp: 3 }}>
                        {preview.description}
                      </p>
                    )}
                    {preview.externalLink && (
                      <a
                        className="book-link"
                        href={preview.externalLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open source ↗
                      </a>
                    )}
                    <div className="book-actions" style={{ borderTop: 'none', marginTop: '0.5rem', paddingTop: 0 }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => importExternalBook(result)}
                        disabled={importDisabled}
                      >
                        {importDisabled ? 'Adding…' : 'Add to Library'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div
        className={`modal ${detailModalOpen ? 'active' : ''}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDetailModal()
        }}
      >
        <div className="modal-content modal-large">
          <div className="modal-header">
            <h3>{activeBook?.title}</h3>
            <button className="close-btn" onClick={closeDetailModal}>
              &times;
            </button>
          </div>
          <div className="modal-body">
            {activeBook && (
              <div className="detail-grid">
                <div className="detail-cover">
                  {activeBook.coverImage ? (
                    <img src={activeBook.coverImage} alt={activeBook.title} />
                  ) : (
                    <div className="placeholder-cover">No cover</div>
                  )}
                  <span className={`status-tag ${activeBook.status === 'available' ? 'available' : 'unavailable'}`}>
                    {activeBook.status || 'unknown'}
                  </span>
                </div>
                <div className="detail-info">
                  <p><strong>Authors:</strong> {(activeBook.authors || []).join(', ') || 'Unknown'}</p>
                  <p><strong>Year:</strong> {activeBook.year || 'Unknown'}</p>
                  {activeBook.description && (
                    <p><strong>Description:</strong> {activeBook.description}</p>
                  )}
                  {activeBook.externalLink && (
                    <a
                      className="detail-link"
                      href={activeBook.externalLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View original source ↗
                    </a>
                  )}
                  {activeBook.content && (
                    <div className="reading-box">
                      <strong>Reading Content</strong>
                      <p>{activeBook.content}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`toast ${toast.type} ${toast.visible ? 'show' : ''}`}>
        {toast.message}
      </div>
    </div>
  )
}

export default App
