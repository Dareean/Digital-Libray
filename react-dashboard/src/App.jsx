import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const API_BASE_URL = "http://localhost:3333";
const ADMIN_TOKEN = "token-all-456";
const USER_TOKEN = "token-limited-123";
const AUTH_STORAGE_KEY = "digital-library-auth";
const LAST_READ_STORAGE_KEY = "digital-library-last-read";
const HISTORY_STORAGE_KEY = "digital-library-history";
const LANGUAGE_STORAGE_KEY = "digital-library-language";
const MINIMUM_LIBRARY_SIZE = 25;
const DEFAULT_ADMIN = {
  name: "Administrator",
  email: "admin@library.local",
  password: "admin123",
  role: "Admin",
  avatar: "",
  bio: "Curator in chief",
};

const withProfileDefaults = (user) => ({
  avatar: "",
  bio: "",
  ...user,
});

const emptyForm = {
  id: "",
  title: "",
  authors: "",
  year: "",
  description: "",
  coverImage: "",
  externalLink: "",
  status: "available",
  content: "",
};

const emptyUserAdminForm = {
  name: "",
  email: "",
  password: "",
  role: "User",
};

const emptyRequestForm = {
  title: "",
  authors: "",
  externalLink: "",
  reason: "",
  notes: "",
};

const endpointCatalog = [
  { method: "GET", path: "/books", description: "List every stored book" },
  { method: "GET", path: "/books/:id", description: "Inspect a specific book" },
  {
    method: "POST",
    path: "/books",
    description: "Create a new book (auth required)",
  },
  { method: "PUT", path: "/books/:id", description: "Update a book (admin)" },
  {
    method: "DELETE",
    path: "/books/:id",
    description: "Remove a book (admin)",
  },
  {
    method: "GET",
    path: "/external/openlibrary",
    description: "Search OpenLibrary via proxy",
  },
  {
    method: "GET",
    path: "/external/gutendex",
    description: "Search Gutendex via proxy",
  },
];

const methodToneMap = {
  GET: "bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900",
  POST: "bg-neutral-700 text-neutral-50 dark:bg-neutral-200 dark:text-neutral-900",
  PUT: "bg-neutral-500 text-neutral-50 dark:bg-neutral-400 dark:text-neutral-900",
  DELETE:
    "bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100",
};

const availabilityBadgeClasses = (status) => {
  if (status === "available") {
    return "bg-neutral-900/90 text-neutral-50 ring-neutral-900/30 dark:bg-neutral-100/90 dark:text-neutral-900 dark:ring-neutral-100/40";
  }
  if (status === "pending") {
    return "bg-neutral-100 text-neutral-500 ring-neutral-200/70 dark:bg-neutral-900/40 dark:text-neutral-300 dark:ring-neutral-700/60";
  }
  return "bg-neutral-200 text-neutral-700 ring-neutral-400/50 dark:bg-neutral-800 dark:text-neutral-200 dark:ring-neutral-600/40";
};

const requestStatusClasses = (status) => {
  if (status === "approved") {
    return "bg-emerald-100 text-emerald-700 ring-emerald-400/40 dark:bg-emerald-900/30 dark:text-emerald-200";
  }
  if (status === "rejected") {
    return "bg-rose-100 text-rose-700 ring-rose-400/40 dark:bg-rose-900/30 dark:text-rose-200";
  }
  return "bg-amber-100 text-amber-700 ring-amber-400/30 dark:bg-amber-900/30 dark:text-amber-200";
};

const LANGUAGE_OPTIONS = [
  { value: "id", label: "Bahasa Indonesia" },
  { value: "en", label: "English" },
];

const translations = {
  id: {
    nav: {
      dashboard: "Dashboard",
      users: "Pengguna",
      books: "Buku",
      history: "Riwayat",
      requests: "Permintaan",
    },
    header: {
      brand: "Perpustakaan Digital",
      title: "Dasbor Utama",
      defaultCredentialHint: "Admin default · admin@library.local / admin123",
      refresh: "Segarkan",
      languageToggle: "",
      searchApi: "Cari API",
      editProfile: "Ubah Profil",
      logout: "Keluar",
    },
    hero: {
      kicker: "Perpustakaan Digital",
      heading: "Arsip untuk membaca tanpa distraksi.",
      body: "Masuk sebagai admin untuk mengkurasi koleksi dan akun, atau sebagai user untuk fokus membaca serta melacak riwayat.",
      statSlots: "Slot koleksi siap isi",
      statRoles: "Dashboard Admin & User",
      authLoginTitle: "Masuk",
      authLoginDesc: "Gunakan kredensial admin/user yang tersedia.",
      authRegisterTitle: "Buat akun",
      authRegisterDesc: "Daftarkan user baru dengan akses dasar.",
      nameLabel: "Nama lengkap",
      emailLabel: "Email",
      passwordLabel: "Kata sandi",
      namePlaceholder: "Jane Doe",
      emailPlaceholder: "kamu@example.com",
      passwordPlaceholder: "••••••••",
      loginButton: "Masuk",
      registerButton: "Daftar",
    },
    profile: {
      collectionLabel: "Koleksi aktif",
      historyLabel: "Riwayat",
      syncButton: "Sinkronkan buku",
    },
    dashboardCommon: {
      snapshot: "Snapshot per",
      bookStatus: "Status Buku",
      lastBook: "Bacaan Terakhir",
      continue: "Lanjutkan Membaca",
      unavailable: "Buku tidak tersedia lagi.",
      readingProgress: "Progres Membaca",
      progressHelper: "Tren 6 minggu",
      topAuthors: "Penulis Teratas",
      emptyAuthors: "Belum ada penulis favorit.",
    },
    adminDashboard: {
      cards: {
        totalBooks: { title: "Total Buku", helper: "Sinkron terakhir" },
        uniqueAuthors: { title: "Penulis Unik", helper: "Katalog terkurasi" },
        userAccounts: {
          title: "Akun Pengguna",
          helper: (admins, members) => `Admin: ${admins} · Member: ${members}`,
        },
        serverStatus: { title: "Status Server" },
      },
      actionsTitle: "Aksi",
      actions: {
        addBook: "Tambah Buku",
        refreshList: "Segarkan Daftar",
        searchExternal: "Cari API Eksternal",
        checkHealth: "Cek API Health",
      },
      permissionsTitle: "Hak Akses",
      apiSurfaceTitle: "Endpoint API",
      overviewTitle: "Ringkasan Membaca",
      curatorSpotlight: "Sorotan Kurator",
      spotlightEmpty: "Tambah buku untuk rekomendasi personal.",
    },
    userDashboard: {
      totalBooksHelper: "Terakhir diperbarui",
      uniqueAuthorsHelper: "Cakupan koleksi",
      readingActivity: "Aktivitas Membaca",
      readingActivityHelper: "Riwayat menghitung setiap detail buku",
      historyEmpty: "Belum ada catatan bacaan.",
    },
    history: {
      title: "Riwayat Bacaan",
      description: "Catatan otomatis saat kamu membuka detail buku.",
      entryCount: (count) => `${count} entri`,
      clear: "Bersihkan Riwayat",
      emptyTitle: "Belum ada riwayat",
      emptyBody:
        "Buka detail buku apa pun dan riwayatmu akan tersimpan otomatis di sini.",
      viewDetail: "Buka detail",
    },
    books: {
      manageTitle: "Manajemen Buku",
      manageDesc: "Kelola rak digital minimal 25 judul.",
      readOnlyTitle: "Koleksi Buku",
      readOnlyDesc: "Telusuri koleksi yang dikurasi administrator.",
      searchPlaceholder: "Cari buku...",
      loading: "Memuat buku...",
      error: "Terjadi kesalahan saat memuat buku.",
      noResultsTitle: "Tidak ada buku",
      noResultsBody: "Coba kata kunci lain atau kosongkan pencarian.",
      noCatalogue:
        "Belum ada buku yang tersimpan — slot cadangan akan muncul hingga 25 entri.",
      visitSource: "Kunjungi sumber",
      viewButton: "Lihat",
      editButton: "Ubah",
      deleteButton: "Hapus",
      placeholderCopy: "Slot cadangan — tambahkan buku baru untuk mengisi.",
    },
    requestForm: {
      title: "Ajukan Buku Baru",
      description: "Kirim detail buku supaya admin bisa menambahkannya.",
      cta: "Ajukan Buku",
      labels: {
        title: "Judul *",
        authors: "Penulis",
        externalLink: "Tautan Referensi",
        reason: "Alasan Permintaan *",
        notes: "Catatan Tambahan",
      },
      placeholders: {
        title: "Judul atau seri",
        authors: "Pisahkan dengan koma",
        externalLink: "https://contoh.com/sumber",
        reason: "Mengapa buku ini penting?",
        notes: "Info lain seperti edisi, ISBN, dsb.",
      },
      submit: "Kirim Permintaan",
      submitting: "Mengirim...",
      cancel: "Batal",
    },
    requests: {
      title: "Permintaan Buku",
      description:
        "Tinjau permintaan user dan ubah statusnya sebelum menambahkan ke katalog.",
      emptyTitle: "Belum ada permintaan",
      emptyBody:
        "User dapat mengajukan buku lewat tombol Ajukan Buku di tab koleksi.",
      filterLabel: "Status",
      filters: {
        all: "Semua",
        pending: "Menunggu",
        approved: "Disetujui",
        rejected: "Ditolak",
      },
      table: {
        requester: "Peminta",
        title: "Judul",
        reason: "Alasan",
        submitted: "Diajukan",
        status: "Status",
        actions: "Aksi",
      },
      actions: {
        approve: "Setujui",
        reject: "Tolak",
        revert: "Kembalikan",
        delete: "Hapus",
        convert: "Buka di Form Buku",
      },
      adminNotePlaceholder: "Catatan admin (opsional)",
      statusLabel: {
        pending: "Menunggu",
        approved: "Disetujui",
        rejected: "Ditolak",
      },
    },
    users: {
      title: "Kelola Akun",
      description: "Tambah, ubah role, dan hapus akun yang terdaftar.",
      createTitle: "Buat Pengguna",
      createDesc: "Lengkapi data di bawah ini untuk menambah akun baru.",
      nameLabel: "Nama",
      emailLabel: "Email",
      passwordLabel: "Kata sandi",
      roleLabel: "Role",
      saveButton: "Simpan Pengguna",
      listTitle: "Daftar Pengguna",
      listDesc: (total) => `Total ${total} akun terdaftar.`,
      searchPlaceholder: "Cari nama atau email...",
      actions: {
        setUser: "Jadikan User",
        setAdmin: "Jadikan Admin",
        edit: "Ubah",
        delete: "Hapus",
      },
      defaultAdminBadge: "Admin bawaan",
      registeredBadge: "Terdaftar",
    },
    historyEntry: {
      noCover: "Tidak ada sampul",
      statusUnknown: "tidak diketahui",
    },
    modals: {
      profile: {
        title: "Ubah Profil",
        name: "Nama",
        email: "Email",
        password: "Kata sandi",
        passwordPlaceholder: "Biarkan kosong jika tidak berubah",
        avatar: "URL Foto Profil",
        avatarPlaceholder: "https://contoh.com/avatar.png",
        bio: "Bio",
        bioPlaceholder: "Ceritakan tentang dirimu...",
        cancel: "Batal",
        save: "Simpan Perubahan",
      },
      book: {
        editTitle: "Ubah Buku",
        addTitle: "Tambah Buku",
        title: "Judul *",
        authors: "Penulis *",
        year: "Tahun Terbit",
        status: "Status",
        cover: "URL Sampul",
        external: "Tautan Eksternal / Sumber",
        description: "Deskripsi",
        content: "Konten Membaca",
        cancel: "Batal",
        submitEdit: "Perbarui",
        submitCreate: "Buat",
      },
      search: {
        title: "Cari API Eksternal",
        openLibrary: "Open Library",
        gutendex: "Gutendex",
        placeholder: "Cari buku...",
        button: "Cari",
        empty: "Hasil akan muncul di sini.",
        openSource: "Buka sumber",
        add: "Tambah ke Perpustakaan",
        adding: "Menambahkan…",
      },
      detail: {
        description: "Deskripsi",
        content: "Konten Membaca",
        viewSource: "Lihat sumber asli",
        noCover: "Tidak ada sampul",
      },
    },
    historyModal: {
      clearSuccess: "Riwayat dibersihkan",
    },
    placeholders: {
      unknownAuthor: "Penulis tidak diketahui",
      unknownYear: "Tahun tidak diketahui",
      noCover: "Tidak ada sampul",
      reservedShelf: (index) => `Rak Cadangan #${index}`,
    },
    toast: {
      logout: "Berhasil keluar",
      loginSuccess: (name) => `Selamat datang, ${name}`,
      accountCreated: "Akun berhasil dibuat",
      profileRequired: "Nama dan email wajib diisi",
      emailUsed: "Email sudah terpakai",
      profileUpdated: "Profil diperbarui",
      completeUserForm: "Lengkapi data pengguna",
      emailExists: "Email sudah digunakan",
      userAdded: "Pengguna baru ditambahkan",
      defaultAdminLocked: "Role admin bawaan tidak bisa diubah",
      userRoleUpdated: "Role pengguna diperbarui",
      cannotDeleteDefaultAdmin: "Tidak bisa menghapus admin utama",
      needOneAdmin: "Minimal harus ada satu admin aktif",
      cannotDeleteActive: "Tidak bisa menghapus sesi aktif",
      userDeleted: "Pengguna dihapus",
      adminOnlyAdd: "Hanya admin yang bisa menambah buku",
      adminOnlyEdit: "Hanya admin yang bisa mengubah buku",
      titleRequired: "Judul wajib diisi",
      bookUpdated: "Buku diperbarui",
      bookCreated: "Buku ditambahkan",
      bookDeleted: "Buku dihapus",
      loginForSearch: "Masuk terlebih dahulu untuk memakai pencarian",
      searchTerm: "Masukkan kata kunci",
      importLogin: "Masuk terlebih dahulu untuk impor",
      importMissingTitle: "Data eksternal tidak memiliki judul",
      importSuccess: "Buku berhasil diimpor",
      historyCleared: "Riwayat dibersihkan",
      historyMissingBook: "Koleksi tidak tersedia lagi",
      apiHealthy: "API sehat",
      apiFailed: (message) => `Koneksi API gagal: ${message}`,
      booksLoadFailed: (message) => `Gagal memuat buku: ${message}`,
      bookLoadFailed: (message) => `Gagal memuat buku: ${message}`,
      saveFailed: (message) => `Gagal menyimpan: ${message}`,
      deleteFailed: (message) => `Gagal menghapus: ${message}`,
      searchFailed: (message) => `Pencarian gagal: ${message}`,
      importFailed: (message) => `Gagal impor: ${message}`,
      requestSubmitSuccess: "Permintaan buku dikirim",
      requestSubmitFailed: (message) => `Gagal mengirim permintaan: ${message}`,
      requestStatusUpdated: "Status permintaan diperbarui",
      requestDeleted: "Permintaan dihapus",
      adminOnlyRequests: "Hanya admin yang bisa mengelola permintaan",
      requestReasonRequired: "Jelaskan alasan permintaan",
      requestLoginRequired: "Masuk terlebih dahulu untuk mengajukan buku",
    },
  },
  en: {
    nav: {
      dashboard: "Dashboard",
      users: "Users",
      books: "Books",
      history: "History",
      requests: "Requests",
    },
    header: {
      brand: "Digital Library",
      title: "Monochrome Dashboard",
      defaultCredentialHint: "Default admin · admin@library.local / admin123",
      refresh: "Refresh",
      languageToggle: "",
      searchApi: "Search APIs",
      editProfile: "Edit Profile",
      logout: "Logout",
    },
    hero: {
      kicker: "Digital Library",
      heading: "A monochrome archive for distraction-free reading.",
      body: "Sign in as admin to curate the catalogue and accounts, or as user to focus on reading and history tracking.",
      statSlots: "Ready-to-fill slots",
      statRoles: "Admin & User dashboard",
      authLoginTitle: "Sign In",
      authLoginDesc: "Use the available admin/user credentials.",
      authRegisterTitle: "Create account",
      authRegisterDesc: "Register a new user with basic access.",
      nameLabel: "Full name",
      emailLabel: "Email",
      passwordLabel: "Password",
      namePlaceholder: "Jane Doe",
      emailPlaceholder: "you@example.com",
      passwordPlaceholder: "••••••••",
      loginButton: "Sign In",
      registerButton: "Register",
    },
    profile: {
      collectionLabel: "Active collection",
      historyLabel: "History",
      syncButton: "Sync books",
    },
    dashboardCommon: {
      snapshot: "Snapshot as of",
      bookStatus: "Book Status",
      lastBook: "Last Book You Read",
      continue: "Continue Reading",
      unavailable: "Book unavailable in current catalogue.",
      readingProgress: "Reading Progress",
      progressHelper: "6-week rolling trend",
      topAuthors: "Top Authors",
      emptyAuthors: "No favorite authors yet.",
    },
    adminDashboard: {
      cards: {
        totalBooks: { title: "Total Books", helper: "Last sync" },
        uniqueAuthors: { title: "Unique Authors", helper: "Curated catalogue" },
        userAccounts: {
          title: "User Accounts",
          helper: (admins, members) => `Admin: ${admins} · Member: ${members}`,
        },
        serverStatus: { title: "Server Status" },
      },
      actionsTitle: "Actions",
      actions: {
        addBook: "Add New Book",
        refreshList: "Refresh List",
        searchExternal: "Search External APIs",
        checkHealth: "Check API Health",
      },
      permissionsTitle: "Your Permissions",
      apiSurfaceTitle: "API Surface",
      overviewTitle: "Reading Overview",
      curatorSpotlight: "Curator's Spotlight",
      spotlightEmpty: "Add books to unlock personalized recommendations.",
    },
    userDashboard: {
      totalBooksHelper: "Updated",
      uniqueAuthorsHelper: "Library coverage",
      readingActivity: "Reading Activity",
      readingActivityHelper: "History tracks each book detail you open",
      historyEmpty: "No reading history yet.",
    },
    history: {
      title: "Reading History",
      description: "Automatically tracks every book detail you open.",
      entryCount: (count) => `${count} entries`,
      clear: "Clear History",
      emptyTitle: "No history yet",
      emptyBody: "Open any book detail and it will appear here.",
      viewDetail: "View detail",
    },
    books: {
      manageTitle: "Book Management",
      manageDesc: "Maintain a digital shelf with at least 25 titles.",
      readOnlyTitle: "Book Collection",
      readOnlyDesc: "Browse the catalogue curated by administrators.",
      searchPlaceholder: "Search books...",
      loading: "Loading books...",
      error: "Failed to load books.",
      noResultsTitle: "No books found",
      noResultsBody: "Try another keyword or clear the search box.",
      noCatalogue:
        "No books saved yet — placeholder slots will appear until 25 entries.",
      visitSource: "Visit source",
      viewButton: "View",
      editButton: "Edit",
      deleteButton: "Delete",
      placeholderCopy: "Reserved slot — add a new book to fill it.",
    },
    requestForm: {
      title: "Request a Book",
      description: "Share the details and an admin will review it.",
      cta: "Request Book",
      labels: {
        title: "Title *",
        authors: "Authors",
        externalLink: "Reference Link",
        reason: "Why should we add it? *",
        notes: "Extra Notes",
      },
      placeholders: {
        title: "Title or series",
        authors: "Comma separated names",
        externalLink: "https://example.com/source",
        reason: "Give context for the request",
        notes: "Edition, ISBN, or other details",
      },
      submit: "Send Request",
      submitting: "Sending...",
      cancel: "Cancel",
    },
    requests: {
      title: "Book Requests",
      description:
        "Review submissions from readers and decide what enters the catalogue.",
      emptyTitle: "No requests yet",
      emptyBody: "Readers can submit requests from the collection tab.",
      filterLabel: "Status",
      filters: {
        all: "All",
        pending: "Pending",
        approved: "Approved",
        rejected: "Rejected",
      },
      table: {
        requester: "Requester",
        title: "Title",
        reason: "Reason",
        submitted: "Submitted",
        status: "Status",
        actions: "Actions",
      },
      actions: {
        approve: "Approve",
        reject: "Reject",
        revert: "Reopen",
        delete: "Delete",
        convert: "Prefill Book Form",
      },
      adminNotePlaceholder: "Admin note (optional)",
      statusLabel: {
        pending: "Pending",
        approved: "Approved",
        rejected: "Rejected",
      },
    },
    users: {
      title: "Manage Accounts",
      description: "Add, change roles, and delete registered users.",
      createTitle: "Create User",
      createDesc: "Complete the form below to add a new account.",
      nameLabel: "Name",
      emailLabel: "Email",
      passwordLabel: "Password",
      roleLabel: "Role",
      saveButton: "Save User",
      listTitle: "User List",
      listDesc: (total) => `Total ${total} registered accounts.`,
      searchPlaceholder: "Search name or email...",
      actions: {
        setUser: "Set User",
        setAdmin: "Set Admin",
        edit: "Edit",
        delete: "Delete",
      },
      defaultAdminBadge: "Default Admin",
      registeredBadge: "Registered",
    },
    historyEntry: {
      noCover: "No cover",
      statusUnknown: "unknown",
    },
    modals: {
      profile: {
        title: "Edit Profile",
        name: "Name",
        email: "Email",
        password: "Password",
        passwordPlaceholder: "Leave blank to keep current password",
        avatar: "Profile Photo URL",
        avatarPlaceholder: "https://example.com/avatar.png",
        bio: "Bio",
        bioPlaceholder: "Tell the library who you are...",
        cancel: "Cancel",
        save: "Save Changes",
      },
      book: {
        editTitle: "Edit Book",
        addTitle: "Add New Book",
        title: "Title *",
        authors: "Authors *",
        year: "Publication Year",
        status: "Status",
        cover: "Cover Image URL",
        external: "External Link / Source",
        description: "Description",
        content: "Reading Content",
        cancel: "Cancel",
        submitEdit: "Update",
        submitCreate: "Create",
      },
      search: {
        title: "Search External APIs",
        openLibrary: "Open Library",
        gutendex: "Gutendex",
        placeholder: "Search books...",
        button: "Search",
        empty: "Results will appear here.",
        openSource: "Open source",
        add: "Add to Library",
        adding: "Adding…",
      },
      detail: {
        description: "Description",
        content: "Reading Content",
        viewSource: "View original source",
        noCover: "No cover",
      },
    },
    placeholders: {
      unknownAuthor: "Unknown author",
      unknownYear: "Unknown year",
      noCover: "No cover",
      reservedShelf: (index) => `Reserved Shelf #${index}`,
    },
    toast: {
      logout: "You are logged out",
      loginSuccess: (name) => `Welcome back, ${name}`,
      accountCreated: "Account created as User",
      profileRequired: "Name and email are required",
      emailUsed: "Email already in use",
      profileUpdated: "Profile updated",
      completeUserForm: "Please complete user data",
      emailExists: "Email already registered",
      userAdded: "New user added",
      defaultAdminLocked: "Default admin role cannot change",
      userRoleUpdated: "User role updated",
      cannotDeleteDefaultAdmin: "Cannot delete default admin",
      needOneAdmin: "At least one admin must remain",
      cannotDeleteActive: "Cannot delete active session",
      userDeleted: "User deleted",
      adminOnlyAdd: "Only admin can add books",
      adminOnlyEdit: "Only admin can edit books",
      titleRequired: "Title is required",
      bookUpdated: "Book updated",
      bookCreated: "Book created",
      bookDeleted: "Book deleted",
      loginForSearch: "Please login to use external search",
      searchTerm: "Enter a search term",
      importLogin: "Login first to import books",
      importMissingTitle: "Missing title from external result",
      importSuccess: "Book imported into library",
      historyCleared: "History cleared",
      historyMissingBook: "Collection no longer available",
      apiHealthy: "API is healthy",
      apiFailed: (message) => `API connection failed: ${message}`,
      booksLoadFailed: (message) => `Failed to load books: ${message}`,
      bookLoadFailed: (message) => `Failed to load book: ${message}`,
      saveFailed: (message) => `Save failed: ${message}`,
      deleteFailed: (message) => `Delete failed: ${message}`,
      searchFailed: (message) => `Search failed: ${message}`,
      importFailed: (message) => `Import failed: ${message}`,
      requestSubmitSuccess: "Book request sent",
      requestSubmitFailed: (message) => `Failed to submit request: ${message}`,
      requestStatusUpdated: "Request status updated",
      requestDeleted: "Request deleted",
      adminOnlyRequests: "Only admins can manage requests",
      requestReasonRequired: "Please share a reason",
      requestLoginRequired: "Sign in to request a book",
    },
  },
};

const userPermissions = [
  "Browse entire catalogue",
  "Read book descriptions",
  "View cover and availability status",
  "Open reading content",
  "Import titles from external APIs",
];

const adminPermissions = [
  ...userPermissions,
  "Create & edit books",
  "Delete books",
  "Search & enrich catalogue",
];

const getInitialAuthState = () => {
  if (typeof window === "undefined")
    return { users: [DEFAULT_ADMIN], currentUser: null };
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return { users: [DEFAULT_ADMIN], currentUser: null };
    const parsed = JSON.parse(raw);
    const persistedUsers = Array.isArray(parsed.users)
      ? parsed.users.map(withProfileDefaults)
      : [];
    if (!persistedUsers.some((user) => user.email === DEFAULT_ADMIN.email)) {
      persistedUsers.push(withProfileDefaults(DEFAULT_ADMIN));
    }
    return {
      users: persistedUsers,
      currentUser: parsed.currentUser
        ? withProfileDefaults(parsed.currentUser)
        : null,
    };
  } catch (err) {
    console.warn("Failed to read auth state", err);
    return { users: [withProfileDefaults(DEFAULT_ADMIN)], currentUser: null };
  }
};

const getInitialLastRead = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_READ_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getHistoryStorageKey = (email) =>
  `${HISTORY_STORAGE_KEY}-${email || "guest"}`;

const getInitialHistory = (email) => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getHistoryStorageKey(email));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const getInitialLanguage = () => {
  if (typeof window === "undefined") return "id";
  return localStorage.getItem(LANGUAGE_STORAGE_KEY) || "id";
};

function App() {
  const initialAuthState = useMemo(() => getInitialAuthState(), []);
  const [users, setUsers] = useState(initialAuthState.users);
  const [currentUser, setCurrentUser] = useState(initialAuthState.currentUser);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [authError, setAuthError] = useState("");
  const [authBanner, setAuthBanner] = useState("");

  const [books, setBooks] = useState([]);
  const [booksError, setBooksError] = useState("");
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [bookForm, setBookForm] = useState(emptyForm);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [externalApi, setExternalApi] = useState("openlibrary");
  const [externalQuery, setExternalQuery] = useState("");
  const [externalResults, setExternalResults] = useState([]);
  const [externalLoading, setExternalLoading] = useState(false);
  const [importingExternalId, setImportingExternalId] = useState("");
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeBook, setActiveBook] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name || "",
    email: currentUser?.email || "",
    password: "",
    avatar: currentUser?.avatar || "",
    bio: currentUser?.bio || "",
  });
  const [lastReadEntry, setLastReadEntry] = useState(() =>
    getInitialLastRead(),
  );
  const [historyEntries, setHistoryEntries] = useState(() =>
    getInitialHistory(initialAuthState.currentUser?.email),
  );
  const [language, setLanguage] = useState(() => getInitialLanguage());
  const [userAdminForm, setUserAdminForm] = useState(emptyUserAdminForm);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [health, setHealth] = useState({ label: "Checking...", ok: false });
  const [toast, setToast] = useState({
    message: "",
    type: "success",
    visible: false,
  });
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestForm, setRequestForm] = useState(emptyRequestForm);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requests, setRequests] = useState([]);
  const [requestFilter, setRequestFilter] = useState("all");
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestNotes, setRequestNotes] = useState({});
  const toastTimer = useRef(null);

  const role = currentUser?.role || "Guest";
  const isAdmin = role === "Admin";
  const authToken = currentUser ? (isAdmin ? ADMIN_TOKEN : USER_TOKEN) : "";
  const copy = translations[language] || translations.id;
  const navItems = useMemo(
    () =>
      isAdmin
        ? [
            { id: "dashboard", label: copy.nav.dashboard },
            { id: "users", label: copy.nav.users },
            { id: "books", label: copy.nav.books },
            { id: "requests", label: copy.nav.requests },
          ]
        : [
            { id: "dashboard", label: copy.nav.dashboard },
            { id: "books", label: copy.nav.books },
            { id: "history", label: copy.nav.history },
          ],
    [isAdmin, copy.nav],
  );

  useEffect(() => {
    const validIds = navItems.map((item) => item.id);
    if (!validIds.includes(activeSection) && validIds[0]) {
      setActiveSection(validIds[0]);
    }
  }, [navItems, activeSection]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ users, currentUser }),
    );
  }, [users, currentUser]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  const showToast = useCallback((message, type = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type, visible: true });
    toastTimer.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3000);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const apiCall = useCallback(
    async (endpoint, { method = "GET", body } = {}) => {
      const headers = { "Content-Type": "application/json" };
      if (authToken) {
        headers["X-API-Token"] = authToken;
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const options = { method, headers };
      if (body !== undefined) options.body = JSON.stringify(body);

      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const text = await response.text();
        let payload = null;
        if (text) {
          try {
            payload = JSON.parse(text);
          } catch {
            payload = text;
          }
        }

        if (!response.ok) {
          const message =
            typeof payload === "object" && payload?.message
              ? payload.message
              : `HTTP ${response.status}`;
          throw new Error(message);
        }

        return payload ?? {};
      } catch (err) {
        throw new Error(err.message || "Network request failed");
      }
    },
    [authToken],
  );

  const loadBooks = useCallback(async () => {
    setLoadingBooks(true);
    setBooksError("");
    try {
      const data = await apiCall("/books");
      if (Array.isArray(data)) {
        setBooks(data);
        setLastSync(new Date());
      } else {
        setBooks([]);
      }
    } catch (err) {
      setBooks([]);
      setBooksError(err.message);
      showToast(copy.toast.booksLoadFailed(err.message), "error");
    } finally {
      setLoadingBooks(false);
    }
  }, [apiCall, showToast, copy.toast]);

  const loadRequests = useCallback(async () => {
    if (!isAdmin) {
      setRequests([]);
      setRequestNotes({});
      return;
    }

    setLoadingRequests(true);
    setRequestError("");
    try {
      const response = await apiCall("/requests");
      const list = (
        Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : []
      ).sort((left, right) => (right.createdAt || 0) - (left.createdAt || 0));
      setRequests(list);
      const noteMap = list.reduce((acc, item) => {
        acc[item.id] = item.adminNote || "";
        return acc;
      }, {});
      setRequestNotes(noteMap);
    } catch (err) {
      setRequestError(err.message);
      showToast(copy.toast.saveFailed(err.message), "error");
    } finally {
      setLoadingRequests(false);
    }
  }, [apiCall, isAdmin, showToast, copy.toast]);

  const checkHealth = useCallback(async () => {
    setHealth({ label: "Checking...", ok: false });
    try {
      await apiCall("/health");
      setHealth({ label: "Online", ok: true });
      showToast(copy.toast.apiHealthy, "success");
    } catch (err) {
      setHealth({ label: "Offline", ok: false });
      showToast(copy.toast.apiFailed(err.message), "error");
    }
  }, [apiCall, showToast, copy.toast]);

  useEffect(() => {
    checkHealth();
    loadBooks();
  }, [checkHealth, loadBooks]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (!currentUser) {
      setSearchModalOpen(false);
      setBookModalOpen(false);
      setRequestModalOpen(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    setProfileForm({
      name: currentUser.name || "",
      email: currentUser.email || "",
      password: "",
      avatar: currentUser.avatar || "",
      bio: currentUser.bio || "",
    });
  }, [currentUser]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!lastReadEntry) {
      localStorage.removeItem(LAST_READ_STORAGE_KEY);
      return;
    }
    localStorage.setItem(LAST_READ_STORAGE_KEY, JSON.stringify(lastReadEntry));
  }, [lastReadEntry]);

  useEffect(() => {
    if (typeof window === "undefined" || !currentUser?.email) return;
    localStorage.setItem(
      getHistoryStorageKey(currentUser.email),
      JSON.stringify(historyEntries),
    );
  }, [historyEntries, currentUser]);

  useEffect(() => {
    setHistoryEntries(getInitialHistory(currentUser?.email));
  }, [currentUser]);

  const filteredBooks = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return books;
    return books.filter((book) => {
      const haystack = [
        book.title,
        (book.authors || []).join(" "),
        book.createdBy,
        book.year,
        book.status,
        book.description,
        book.externalLink,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [books, searchTerm]);

  const paddedLibrary = useMemo(() => {
    if (books.length >= MINIMUM_LIBRARY_SIZE) return books;
    const deficit = MINIMUM_LIBRARY_SIZE - books.length;
    const placeholders = Array.from({ length: deficit }).map((_, index) => ({
      id: `placeholder-${index + 1}`,
      title: `Reserved Shelf #${index + 1}`,
      authors: [],
      year: "",
      description:
        "Slot disiapkan untuk penambahan katalog baru oleh administrator.",
      coverImage: "",
      status: "pending",
      placeholder: true,
    }));
    return [...books, ...placeholders];
  }, [books]);

  const booksForDisplay = useMemo(() => {
    if (searchTerm.trim()) return filteredBooks;
    return paddedLibrary;
  }, [filteredBooks, paddedLibrary, searchTerm]);

  const totalAuthors = useMemo(() => {
    const unique = new Set();
    books.forEach((book) => {
      (book.authors || []).forEach((author) => unique.add(author));
    });
    return unique.size;
  }, [books]);

  const lastReadBook = useMemo(() => {
    if (!lastReadEntry) return null;
    return (
      books.find((book) => String(book.id) === String(lastReadEntry.id)) ||
      lastReadEntry
    );
  }, [books, lastReadEntry]);

  const statusSummary = useMemo(() => {
    const available = books.filter(
      (book) => book.status === "available",
    ).length;
    const unavailable = books.length - available;
    return {
      available,
      unavailable,
      total: books.length,
      completion: books.length
        ? Math.round((available / books.length) * 100)
        : 0,
    };
  }, [books]);

  const readingProgressPoints = useMemo(() => {
    if (!books.length) return [0, 0, 0, 0, 0, 0];
    const base = Math.max(books.length, 6);
    return Array.from({ length: 6 }).map((_, index) => {
      const variance = index % 2 === 0 ? 0.8 : 1.1;
      return Math.round((base / 6) * (index + 1) * variance);
    });
  }, [books]);

  const readingProgressPeak = useMemo(
    () => Math.max(...readingProgressPoints, 1),
    [readingProgressPoints],
  );

  const spotlightBook = useMemo(() => {
    if (!books.length) return null;
    return books.reduce((selected, book) => {
      const candidateScore =
        (book.description || "").length + (book.authors?.length || 0) * 10;
      if (!selected) return { book, score: candidateScore };
      return candidateScore > selected.score
        ? { book, score: candidateScore }
        : selected;
    }, null)?.book;
  }, [books]);

  const topAuthors = useMemo(() => {
    const tally = new Map();
    books.forEach((book) => {
      (book.authors || []).forEach((author) => {
        tally.set(author, (tally.get(author) || 0) + 1);
      });
    });
    return Array.from(tally.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));
  }, [books]);

  const filteredUserList = useMemo(() => {
    const keyword = userSearchTerm.trim().toLowerCase();
    if (!keyword) return users;
    return users.filter((user) =>
      `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(keyword),
    );
  }, [users, userSearchTerm]);

  const filteredRequests = useMemo(() => {
    if (requestFilter === "all") return requests;
    return requests.filter((request) => request.status === requestFilter);
  }, [requests, requestFilter]);

  const totalUsers = users.length;
  const totalAdmins = useMemo(
    () => users.filter((user) => user.role === "Admin").length,
    [users],
  );
  const totalMembers = totalUsers - totalAdmins;

  const lastReadStillAvailable = useMemo(() => {
    if (!lastReadEntry) return false;
    return books.some((book) => String(book.id) === String(lastReadEntry.id));
  }, [books, lastReadEntry]);

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthBanner("Logged out successfully");
    showToast(copy.toast.logout, "success");
  };

  const toggleLanguage = (nextLanguage) => {
    if (nextLanguage) {
      setLanguage((prev) => (prev === nextLanguage ? prev : nextLanguage));
      return;
    }
    setLanguage((prev) => (prev === "id" ? "en" : "id"));
  };

  const openProfileModal = () => {
    if (!currentUser) return;
    setProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setProfileModalOpen(false);
    setProfileForm((prev) => ({ ...prev, password: "" }));
  };

  const handleAuthSubmit = (event) => {
    event.preventDefault();
    setAuthError("");
    const email = authForm.email.trim().toLowerCase();
    const password = authForm.password.trim();

    if (!email || !password) {
      setAuthError("Email and password are required");
      return;
    }

    if (authMode === "login") {
      const match = users.find((user) => user.email.toLowerCase() === email);
      if (!match || match.password !== password) {
        setAuthError("Invalid email or password");
        return;
      }
      setCurrentUser({
        name: match.name,
        email: match.email,
        role: match.role,
        avatar: match.avatar,
        bio: match.bio,
      });
      setAuthBanner("");
      setAuthForm({ name: "", email: "", password: "" });
      showToast(copy.toast.loginSuccess(match.name), "success");
      return;
    }

    if (!authForm.name.trim()) {
      setAuthError("Name is required for registration");
      return;
    }

    if (users.some((user) => user.email.toLowerCase() === email)) {
      setAuthError("Email already registered");
      return;
    }

    const newUser = {
      name: authForm.name.trim(),
      email,
      password,
      role: "User",
      avatar: "",
      bio: "",
    };
    setUsers((prev) => [...prev, newUser]);
    setCurrentUser({
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      avatar: newUser.avatar,
      bio: newUser.bio,
    });
    setAuthForm({ name: "", email: "", password: "" });
    showToast(copy.toast.accountCreated, "success");
  };

  const handleProfileSubmit = (event) => {
    event.preventDefault();
    if (!currentUser) return;

    const trimmedName = profileForm.name.trim();
    const trimmedEmail = profileForm.email.trim().toLowerCase();
    const trimmedAvatar = profileForm.avatar.trim();
    const trimmedBio = profileForm.bio.trim();

    if (!trimmedName || !trimmedEmail) {
      showToast(copy.toast.profileRequired, "warning");
      return;
    }

    const emailTaken = users.some(
      (user) =>
        user.email.toLowerCase() === trimmedEmail &&
        user.email !== currentUser.email,
    );
    if (emailTaken) {
      showToast(copy.toast.emailUsed, "error");
      return;
    }

    setUsers((prev) =>
      prev.map((user) => {
        if (user.email === currentUser.email) {
          return {
            ...user,
            name: trimmedName,
            email: trimmedEmail,
            password: profileForm.password
              ? profileForm.password
              : user.password,
            avatar: trimmedAvatar,
            bio: trimmedBio,
          };
        }
        return user;
      }),
    );

    setCurrentUser((prev) => ({
      ...prev,
      name: trimmedName,
      email: trimmedEmail,
      avatar: trimmedAvatar,
      bio: trimmedBio,
    }));

    setProfileForm((prev) => ({ ...prev, password: "" }));
    setProfileModalOpen(false);
    showToast(copy.toast.profileUpdated, "success");
  };

  const handleAdminUserCreate = (event) => {
    event.preventDefault();
    const trimmedName = userAdminForm.name.trim();
    const trimmedEmail = userAdminForm.email.trim().toLowerCase();
    const trimmedPassword = userAdminForm.password.trim();
    if (!trimmedName || !trimmedEmail || !trimmedPassword) {
      showToast(copy.toast.completeUserForm, "warning");
      return;
    }
    if (users.some((user) => user.email.toLowerCase() === trimmedEmail)) {
      showToast(copy.toast.emailExists, "error");
      return;
    }
    const roleToAssign = userAdminForm.role === "Admin" ? "Admin" : "User";
    const newUser = withProfileDefaults({
      name: trimmedName,
      email: trimmedEmail,
      password: trimmedPassword,
      role: roleToAssign,
    });
    setUsers((prev) => [...prev, newUser]);
    setUserAdminForm(emptyUserAdminForm);
    showToast(copy.toast.userAdded, "success");
  };

  const handleUserRoleToggle = (email) => {
    const target = users.find((user) => user.email === email);
    if (!target) return;
    if (target.email === DEFAULT_ADMIN.email) {
      showToast(copy.toast.defaultAdminLocked, "warning");
      return;
    }
    const nextRole = target.role === "Admin" ? "User" : "Admin";
    setUsers((prev) =>
      prev.map((user) =>
        user.email === email ? { ...user, role: nextRole } : user,
      ),
    );
    if (currentUser?.email === email) {
      setCurrentUser((prev) => (prev ? { ...prev, role: nextRole } : prev));
    }
    showToast(copy.toast.userRoleUpdated, "success");
  };

  const handleUserDelete = (email) => {
    const target = users.find((user) => user.email === email);
    if (!target) return;
    if (target.email === DEFAULT_ADMIN.email) {
      showToast(copy.toast.cannotDeleteDefaultAdmin, "warning");
      return;
    }
    const adminCount = users.filter((user) => user.role === "Admin").length;
    if (target.role === "Admin" && adminCount <= 1) {
      showToast(copy.toast.needOneAdmin, "warning");
      return;
    }
    if (currentUser?.email === email) {
      showToast(copy.toast.cannotDeleteActive, "warning");
      return;
    }
    setUsers((prev) => prev.filter((user) => user.email !== email));
    showToast(copy.toast.userDeleted, "success");
  };

  const openCreateModal = () => {
    if (!isAdmin) {
      showToast(copy.toast.adminOnlyAdd, "warning");
      return;
    }
    setBookForm(emptyForm);
    setBookModalOpen(true);
  };

  const handleEditBook = async (bookId) => {
    if (!isAdmin) {
      showToast(copy.toast.adminOnlyEdit, "warning");
      return;
    }
    try {
      const data = await apiCall(`/books/${bookId}`);
      setBookForm({
        id: data.id,
        title: data.title || "",
        authors: Array.isArray(data.authors) ? data.authors.join(", ") : "",
        year: data.year ? String(data.year) : "",
        description: data.description || "",
        coverImage: data.coverImage || "",
        externalLink: data.externalLink || "",
        status: data.status || "available",
        content: data.content || "",
      });
      setBookModalOpen(true);
    } catch (err) {
      showToast(copy.toast.bookLoadFailed(err.message), "error");
    }
  };

  const closeBookModal = () => {
    setBookModalOpen(false);
    setBookForm(emptyForm);
  };

  const handleBookSubmit = async (event) => {
    event.preventDefault();
    if (!isAdmin) return;

    const trimmedTitle = bookForm.title.trim();
    if (!trimmedTitle) {
      showToast(copy.toast.titleRequired, "warning");
      return;
    }

    const authors = bookForm.authors
      .split(",")
      .map((author) => author.trim())
      .filter(Boolean);

    const payload = {
      title: trimmedTitle,
      authors,
      year: Number(bookForm.year) || new Date().getFullYear(),
      description: bookForm.description.trim(),
      coverImage: bookForm.coverImage.trim(),
      externalLink: bookForm.externalLink.trim(),
      status: bookForm.status,
      content: bookForm.content.trim(),
    };

    try {
      if (bookForm.id) {
        await apiCall(`/books/${bookForm.id}`, {
          method: "PUT",
          body: payload,
        });
        showToast(copy.toast.bookUpdated, "success");
      } else {
        await apiCall("/books", { method: "POST", body: payload });
        showToast(copy.toast.bookCreated, "success");
      }
      closeBookModal();
      loadBooks();
    } catch (err) {
      showToast(copy.toast.saveFailed(err.message), "error");
    }
  };

  const handleDeleteBook = async (book) => {
    if (!isAdmin) return;
    const confirmed = window.confirm(`Delete "${book.title}"?`);
    if (!confirmed) return;

    try {
      await apiCall(`/books/${book.id}`, { method: "DELETE" });
      showToast(copy.toast.bookDeleted, "success");
      loadBooks();
    } catch (err) {
      showToast(copy.toast.deleteFailed(err.message), "error");
    }
  };

  const openRequestModal = () => {
    if (!currentUser) {
      showToast(copy.toast.requestLoginRequired, "warning");
      return;
    }
    setRequestForm(emptyRequestForm);
    setRequestModalOpen(true);
  };

  const closeRequestModal = () => {
    setRequestModalOpen(false);
    setRequestForm(emptyRequestForm);
  };

  const handleRequestSubmit = async (event) => {
    event.preventDefault();
    if (!currentUser) {
      showToast(copy.toast.requestLoginRequired, "warning");
      return;
    }

    const title = requestForm.title.trim();
    const reason = requestForm.reason.trim();
    if (!title) {
      showToast(copy.toast.titleRequired, "warning");
      return;
    }
    if (!reason) {
      showToast(copy.toast.requestReasonRequired, "warning");
      return;
    }

    const authors = requestForm.authors
      .split(",")
      .map((author) => author.trim())
      .filter(Boolean);

    const payload = {
      title,
      authors,
      reason,
      additionalNotes: requestForm.notes.trim(),
      externalLink: requestForm.externalLink.trim(),
      requesterName: currentUser.name,
      requesterEmail: currentUser.email,
    };

    setRequestSubmitting(true);
    try {
      await apiCall("/requests", { method: "POST", body: payload });
      showToast(copy.toast.requestSubmitSuccess, "success");
      setRequestForm(emptyRequestForm);
      setRequestModalOpen(false);
      if (isAdmin) loadRequests();
    } catch (err) {
      showToast(copy.toast.requestSubmitFailed(err.message), "error");
    } finally {
      setRequestSubmitting(false);
    }
  };

  const handleRequestStatusChange = async (
    requestId,
    status,
    adminNote = "",
  ) => {
    if (!isAdmin) {
      showToast(copy.toast.adminOnlyRequests, "warning");
      return;
    }
    try {
      await apiCall(`/requests/${requestId}`, {
        method: "PUT",
        body: { status, adminNote },
      });
      showToast(copy.toast.requestStatusUpdated, "success");
      loadRequests();
    } catch (err) {
      showToast(copy.toast.saveFailed(err.message), "error");
    }
  };

  const handleRequestDelete = async (requestId, title) => {
    if (!isAdmin) {
      showToast(copy.toast.adminOnlyRequests, "warning");
      return;
    }
    if (!window.confirm(`Delete request for "${title}"?`)) return;
    try {
      await apiCall(`/requests/${requestId}`, { method: "DELETE" });
      showToast(copy.toast.requestDeleted, "success");
      loadRequests();
    } catch (err) {
      showToast(copy.toast.deleteFailed(err.message), "error");
    }
  };

  const handlePrefillBookFromRequest = (request) => {
    if (!isAdmin) {
      showToast(copy.toast.adminOnlyAdd, "warning");
      return;
    }
    setBookForm({
      id: "",
      title: request.title || "",
      authors: (request.authors || []).join(", "),
      year: String(new Date().getFullYear()),
      description: request.reason || request.additionalNotes || "",
      coverImage: "",
      externalLink: request.externalLink || "",
      status: "available",
      content: request.additionalNotes || "",
    });
    setBookModalOpen(true);
    setActiveSection("books");
  };

  const handleRequestNoteChange = (requestId, value) => {
    setRequestNotes((prev) => ({ ...prev, [requestId]: value }));
  };

  const openSearchModal = () => {
    if (!currentUser) {
      showToast(copy.toast.loginForSearch, "warning");
      return;
    }
    if (!isAdmin) {
      showToast(copy.toast.adminOnlyAdd, "warning");
      return;
    }
    setSearchModalOpen(true);
    setExternalResults([]);
    setExternalQuery("");
  };

  const closeSearchModal = () => {
    setSearchModalOpen(false);
  };

  const handleExternalSearch = async () => {
    if (!externalQuery.trim()) {
      showToast(copy.toast.searchTerm, "warning");
      return;
    }

    setExternalLoading(true);
    setExternalResults([]);
    try {
      const endpoint =
        externalApi === "openlibrary"
          ? `/external/openlibrary?q=${encodeURIComponent(
              externalQuery.trim(),
            )}`
          : `/external/gutendex?q=${encodeURIComponent(externalQuery.trim())}`;
      const result = await apiCall(endpoint);
      const list = Array.isArray(result)
        ? result
        : Array.isArray(result?.data)
          ? result.data
          : [];
      const tagged = list.map((item) => ({ ...item, _source: externalApi }));
      setExternalResults(tagged);
    } catch (err) {
      showToast(copy.toast.searchFailed(err.message), "error");
    } finally {
      setExternalLoading(false);
    }
  };

  const getExternalId = (entry) =>
    entry.key || entry.id || entry.gutenberg_id || entry.title;

  const buildPayloadFromExternal = (entry) => {
    const source = entry._source || "openlibrary";
    if (source === "gutendex") {
      const authors = (entry.authors || [])
        .map((author) => author.name)
        .filter(Boolean);
      const subjectSummary = (entry.subjects || []).slice(0, 6).join(", ");
      const rawDescription =
        typeof entry.description === "string"
          ? entry.description
          : entry.description?.value;
      const coverImage =
        entry.formats?.["image/jpeg"] || entry.formats?.["image/png"] || "";
      const textLink =
        entry.formats?.["text/html; charset=utf-8"] ||
        entry.formats?.["text/html"] ||
        entry.formats?.["text/plain; charset=utf-8"] ||
        entry.formats?.["text/plain"] ||
        "";
      const externalLink = entry.id
        ? `https://www.gutenberg.org/ebooks/${entry.id}`
        : textLink;
      const primaryAuthor = entry.authors?.[0];
      const resolvedAuthors = authors.length ? authors : ["Unknown author"];
      return {
        title: entry.title || "Untitled Manuscript",
        authors: resolvedAuthors,
        year:
          Number(primaryAuthor?.birth_year) ||
          Number(primaryAuthor?.death_year) ||
          new Date().getFullYear(),
        description:
          rawDescription || subjectSummary || "Imported from Gutendex catalog.",
        coverImage,
        externalLink,
        status: "available",
        content: textLink
          ? `Read online: ${textLink}`
          : "Imported from Gutendex catalog.",
      };
    }

    const authors = entry.author_name || entry.authors || [];
    const rawDescription =
      typeof entry.description === "string"
        ? entry.description
        : entry.description?.value;
    const subjectSummary = Array.isArray(entry.subject)
      ? entry.subject.slice(0, 6).join(", ")
      : "";
    const publisherHint = Array.isArray(entry.publisher)
      ? `Published by ${entry.publisher[0]}`
      : "";
    const description =
      rawDescription || entry.subtitle || subjectSummary || publisherHint;
    const coverImage = entry.cover_i
      ? `https://covers.openlibrary.org/b/id/${entry.cover_i}-L.jpg`
      : Array.isArray(entry.isbn) && entry.isbn.length > 0
        ? `https://covers.openlibrary.org/b/isbn/${entry.isbn[0]}-L.jpg`
        : "";
    const firstSentence = Array.isArray(entry.first_sentence)
      ? entry.first_sentence[0]
      : entry.first_sentence;
    const normalizedAuthors = Array.isArray(authors)
      ? authors.filter(Boolean)
      : [authors].filter(Boolean);
    const workKey =
      entry.key ||
      entry.seed?.find(
        (item) => typeof item === "string" && item.startsWith("/works/"),
      ) ||
      entry.seed?.[0];
    const externalLink = workKey ? `https://openlibrary.org${workKey}` : "";
    return {
      title: entry.title || "Untitled Manuscript",
      authors: normalizedAuthors.length
        ? normalizedAuthors
        : ["Unknown author"],
      year:
        Number(entry.first_publish_year || entry.publish_year?.[0]) ||
        new Date().getFullYear(),
      description: description || "Imported from Open Library search result.",
      coverImage,
      externalLink,
      status: "available",
      content:
        firstSentence ||
        subjectSummary ||
        "Imported from Open Library search result.",
    };
  };

  const importExternalBook = async (entry) => {
    if (!currentUser) {
      showToast(copy.toast.importLogin, "warning");
      return;
    }
    if (!isAdmin) {
      showToast(copy.toast.adminOnlyAdd, "warning");
      return;
    }

    const payload = buildPayloadFromExternal(entry);
    if (!payload.title) {
      showToast(copy.toast.importMissingTitle, "error");
      return;
    }

    const importId = getExternalId(entry);
    setImportingExternalId(importId);
    try {
      await apiCall("/books", { method: "POST", body: payload });
      showToast(copy.toast.importSuccess, "success");
      loadBooks();
    } catch (err) {
      showToast(copy.toast.importFailed(err.message), "error");
    } finally {
      setImportingExternalId("");
    }
  };

  const appendHistoryEntry = useCallback(
    (book) => {
      if (!currentUser?.email) return;
      setHistoryEntries((prev) => {
        const baseEntry = {
          id: book.id,
          title: book.title,
          authors: book.authors || [],
          coverImage: book.coverImage || "",
          status: book.status,
          timestamp: Date.now(),
        };
        const deduped = prev.filter(
          (entry) => String(entry.id) !== String(baseEntry.id),
        );
        return [baseEntry, ...deduped].slice(0, 40);
      });
    },
    [currentUser],
  );

  const clearHistory = useCallback(() => {
    if (!currentUser?.email) {
      setHistoryEntries([]);
      return;
    }
    localStorage.removeItem(getHistoryStorageKey(currentUser.email));
    setHistoryEntries([]);
    showToast(copy.toast.historyCleared, "success");
  }, [currentUser, showToast, copy.toast]);

  const openDetailModal = (book) => {
    if (book?.placeholder) return;
    setActiveBook(book);
    setDetailModalOpen(true);
    setLastReadEntry({
      id: book.id,
      title: book.title,
      authors: book.authors,
      coverImage: book.coverImage,
      status: book.status,
      timestamp: Date.now(),
    });
    appendHistoryEntry(book);
  };

  const closeDetailModal = () => {
    setDetailModalOpen(false);
    setActiveBook(null);
  };

  const openHistoryEntry = (entry) => {
    const match = books.find((book) => String(book.id) === String(entry.id));
    if (!match) {
      showToast(copy.toast.historyMissingBook, "warning");
      return;
    }
    openDetailModal(match);
  };

  const renderAdminDashboard = () => (
    <div className="space-y-6">
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5">
        <article className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              Total Books
            </div>
            <div className="text-2xl">📚</div>
          </div>
          <div className="text-2xl font-bold">{books.length}</div>
          <div className="text-xs text-muted-foreground">
            Last sync: {lastSync ? lastSync.toLocaleTimeString() : "Never"}
          </div>
        </article>
        <article className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              Unique Authors
            </div>
            <div className="text-2xl">✍️</div>
          </div>
          <div className="text-2xl font-bold">{totalAuthors}</div>
          <div className="text-xs text-muted-foreground">Curated catalogue</div>
        </article>
        <article className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              User Accounts
            </div>
            <div className="text-2xl">👤</div>
          </div>
          <div className="text-2xl font-bold">{totalUsers}</div>
          <div className="text-xs text-muted-foreground">
            Admin: {totalAdmins} · Member: {totalMembers}
          </div>
        </article>
        <article className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              Server Status
            </div>
            <div className="text-2xl">🩺</div>
          </div>
          <div className="flex items-center justify-between">
            <div
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                health.ok
                  ? "bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                  : "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400"
              }`}
            >
              {health.label}
            </div>
            <button
              className="text-xs hover:underline text-muted-foreground"
              onClick={checkHealth}
            >
              Refresh
            </button>
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <aside className="space-y-5 lg:col-span-1">
          <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 space-y-4">
            <h3 className="font-semibold leading-none tracking-tight">
              Actions
            </h3>
            <div className="space-y-2">
              <button
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 w-full justify-start"
                onClick={openCreateModal}
                disabled={!isAdmin}
              >
                <span className="mr-2">➕</span> Add New Book
              </button>
              <button
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 w-full justify-start"
                onClick={loadBooks}
              >
                <span className="mr-2">🔄</span> Refresh List
              </button>
              <button
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 w-full justify-start"
                onClick={openSearchModal}
                disabled={!currentUser}
              >
                <span className="mr-2">🔍</span> Search External APIs
              </button>
              <button
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 w-full justify-start"
                onClick={checkHealth}
              >
                <span className="mr-2">❤️</span> Check API Health
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 space-y-4">
            <h4 className="font-semibold leading-none tracking-tight">
              Your Permissions
            </h4>
            <div className="space-y-2">
              {(isAdmin ? adminPermissions : userPermissions).map((item) => (
                <div
                  key={item}
                  className="text-sm text-muted-foreground flex items-center"
                >
                  <span className="mr-2 h-1.5 w-1.5 rounded-full bg-primary/50" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 space-y-4">
            <h4 className="font-semibold leading-none tracking-tight">
              API Surface
            </h4>
            <div className="space-y-2">
              {endpointCatalog.map((endpoint) => (
                <div
                  key={endpoint.path + endpoint.method}
                  className="flex items-center justify-between text-xs"
                >
                  <span
                    className={`font-mono font-bold px-1.5 py-0.5 rounded ${
                      methodToneMap[endpoint.method] || methodToneMap.DELETE
                    }`}
                  >
                    {endpoint.method}
                  </span>
                  <span className="font-mono text-muted-foreground truncate ml-2">
                    {endpoint.path}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="lg:col-span-3 space-y-5">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">
                  Reading Overview
                </h2>
                <p className="text-muted-foreground">
                  Snapshot as of {new Date().toLocaleString()}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <article className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 space-y-4">
                <div className="text-sm font-medium text-muted-foreground">
                  Book Status
                </div>
                <div className="text-2xl font-bold">
                  {statusSummary.total || 0} titles
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Available: {statusSummary.available}</span>
                  <span>Unavailable: {statusSummary.unavailable}</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${statusSummary.completion}%` }}
                  />
                </div>
              </article>
              <article className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 space-y-4">
                <div className="text-sm font-medium text-muted-foreground">
                  Last Book You Read
                </div>
                {lastReadBook ? (
                  <div className="flex gap-4">
                    {lastReadBook.coverImage && (
                      <img
                        src={lastReadBook.coverImage}
                        alt={lastReadBook.title}
                        className="h-24 w-16 object-cover rounded-md border border-border"
                      />
                    )}
                    <div className="space-y-2">
                      <div className="font-semibold line-clamp-1">
                        {lastReadBook.title}
                      </div>
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {(lastReadBook.authors || []).join(", ") ||
                          "Unknown author"}
                      </div>
                      {lastReadStillAvailable ? (
                        <button
                          className="inline-flex items-center justify-center rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3"
                          onClick={() => openDetailModal(lastReadBook)}
                        >
                          Continue Reading
                        </button>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          Book unavailable in current catalogue.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Start exploring the library to see your history here.
                  </p>
                )}
              </article>
              <article className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 space-y-4">
                <div className="text-sm font-medium text-muted-foreground">
                  Reading Progress
                </div>
                <div className="text-2xl font-bold">
                  {statusSummary.completion}% complete
                </div>
                <div className="flex items-end gap-2 h-16 w-full">
                  {readingProgressPoints.map((point, index) => {
                    const height = `${Math.round(
                      (point / readingProgressPeak) * 100,
                    )}%`;
                    return (
                      <div
                        key={index}
                        className="flex-1 bg-primary/20 rounded-t-sm hover:bg-primary/40 transition-colors"
                        style={{ height }}
                      />
                    );
                  })}
                </div>
                <div className="text-xs text-muted-foreground">
                  6-week rolling trend
                </div>
              </article>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <article className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 space-y-4">
                <div className="text-sm font-medium text-muted-foreground">
                  Curator's Spotlight
                </div>
                {spotlightBook ? (
                  <>
                    <h3 className="text-lg font-semibold">
                      {spotlightBook.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-4">
                      {spotlightBook.description || "No description provided."}
                    </p>
                    <button
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
                      onClick={() => openDetailModal(spotlightBook)}
                    >
                      View Details
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Add books to unlock personalized recommendations.
                  </p>
                )}
              </article>
              <article className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 space-y-4">
                <div className="text-sm font-medium text-muted-foreground">
                  Top Authors
                </div>
                {topAuthors.length > 0 ? (
                  <ul className="space-y-2">
                    {topAuthors.map((author) => (
                      <li
                        key={author.name}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="font-medium">{author.name}</span>
                        <span className="text-muted-foreground">
                          {author.count} titles
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No authors tracked yet.
                  </p>
                )}
              </article>
            </div>
          </div>
        </div>
      </section>
    </div>
  );

  const renderUserDashboard = () => (
    <div className="space-y-6">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        <article className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              Total Books
            </div>
            <div className="text-2xl">📚</div>
          </div>
          <div className="text-2xl font-bold">{books.length}</div>
          <div className="text-xs text-muted-foreground">
            Updated {lastSync ? lastSync.toLocaleTimeString() : "pending"}
          </div>
        </article>
        <article className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              Unique Authors
            </div>
            <div className="text-2xl">✍️</div>
          </div>
          <div className="text-2xl font-bold">{totalAuthors}</div>
          <div className="text-xs text-muted-foreground">Library coverage</div>
        </article>
        <article className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              Reading Activity
            </div>
            <div className="text-2xl">📖</div>
          </div>
          <div className="text-2xl font-bold">
            {historyEntries.length ? `${historyEntries.length} clicks` : "0"}
          </div>
          <div className="text-xs text-muted-foreground">
            History tab tracks what you open
          </div>
        </article>
      </section>

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Reading Overview
            </h2>
            <p className="text-muted-foreground">
              Snapshot as of {new Date().toLocaleString()}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          <article className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 space-y-4">
            <div className="text-sm font-medium text-muted-foreground">
              Book Status
            </div>
            <div className="text-2xl font-bold">
              {statusSummary.total || 0} titles
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Available: {statusSummary.available}</span>
              <span>Unavailable: {statusSummary.unavailable}</span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${statusSummary.completion}%` }}
              />
            </div>
          </article>
          <article className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 space-y-4">
            <div className="text-sm font-medium text-muted-foreground">
              Last Book You Read
            </div>
            {lastReadBook ? (
              <div className="flex gap-4">
                {lastReadBook.coverImage && (
                  <img
                    src={lastReadBook.coverImage}
                    alt={lastReadBook.title}
                    className="h-24 w-16 object-cover rounded-md border border-border"
                  />
                )}
                <div className="space-y-2">
                  <div className="font-semibold line-clamp-1">
                    {lastReadBook.title}
                  </div>
                  <div className="text-sm text-muted-foreground line-clamp-1">
                    {(lastReadBook.authors || []).join(", ") ||
                      "Unknown author"}
                  </div>
                  <button
                    className="inline-flex items-center justify-center rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3"
                    onClick={() => openDetailModal(lastReadBook)}
                  >
                    Open Detail
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Belum ada catatan bacaan.
              </p>
            )}
          </article>
          <article className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 space-y-4">
            <div className="text-sm font-medium text-muted-foreground">
              Reading Progress
            </div>
            <div className="text-2xl font-bold">
              {statusSummary.completion}% complete
            </div>
            <div className="flex items-end gap-2 h-16 w-full">
              {readingProgressPoints.map((point, index) => {
                const height = `${Math.round(
                  (point / readingProgressPeak) * 100,
                )}%`;
                return (
                  <div
                    key={index}
                    className="flex-1 bg-primary/20 rounded-t-sm hover:bg-primary/40 transition-colors"
                    style={{ height }}
                  />
                );
              })}
            </div>
            <div className="text-xs text-muted-foreground">
              6-week rolling trend
            </div>
          </article>
          <article className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 space-y-4">
            <div className="text-sm font-medium text-muted-foreground">
              Top Authors
            </div>
            {topAuthors.length > 0 ? (
              <ul className="space-y-2">
                {topAuthors.map((author) => (
                  <li
                    key={author.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-medium">{author.name}</span>
                    <span className="text-muted-foreground">
                      {author.count} titles
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Belum ada penulis favorit.
              </p>
            )}
          </article>
        </div>
      </div>
    </div>
  );

  const renderUsersSection = () => (
    <div className="space-y-5">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Kelola Akun</h2>
        <p className="text-muted-foreground">
          Tambah, ubah role, dan hapus akun yang terdaftar di digital library.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <form
          onSubmit={handleAdminUserCreate}
          className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 space-y-4"
        >
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">Buat Pengguna</h3>
            <p className="text-sm text-muted-foreground">
              Lengkapi data di bawah ini untuk menambah akun baru.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Nama</label>
            <input
              type="text"
              value={userAdminForm.name}
              onChange={(event) =>
                setUserAdminForm((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              value={userAdminForm.email}
              onChange={(event) =>
                setUserAdminForm((prev) => ({
                  ...prev,
                  email: event.target.value,
                }))
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              value={userAdminForm.password}
              onChange={(event) =>
                setUserAdminForm((prev) => ({
                  ...prev,
                  password: event.target.value,
                }))
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <select
              value={userAdminForm.role}
              onChange={(event) =>
                setUserAdminForm((prev) => ({
                  ...prev,
                  role: event.target.value,
                }))
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="User">User</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
          >
            Simpan Pengguna
          </button>
        </form>

        <div className="lg:col-span-2 rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-semibold text-lg">Daftar Pengguna</h3>
              <p className="text-sm text-muted-foreground">
                Total {totalUsers} akun terdaftar.
              </p>
            </div>
            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Cari nama atau email..."
                value={userSearchTerm}
                onChange={(event) => setUserSearchTerm(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2">Name</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Role</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUserList.map((user) => (
                  <tr key={user.email} className="border-t border-border/60">
                    <td className="py-3">
                      <div className="font-medium">{user.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {user.email === DEFAULT_ADMIN.email
                          ? "Default Admin"
                          : "Registered"}
                      </div>
                    </td>
                    <td className="py-3">{user.email}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground">
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input px-3 py-1.5 hover:bg-accent hover:text-accent-foreground"
                          onClick={() => handleUserRoleToggle(user.email)}
                        >
                          {user.role === "Admin" ? "Set User" : "Set Admin"}
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input px-3 py-1.5 hover:bg-accent hover:text-accent-foreground"
                          onClick={() => {
                            setProfileForm({
                              name: user.name,
                              email: user.email,
                              password: "",
                              avatar: user.avatar || "",
                              bio: user.bio || "",
                            });
                            setProfileModalOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-md text-xs font-medium bg-destructive text-destructive-foreground px-3 py-1.5"
                          onClick={() => handleUserDelete(user.email)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBooksSection = (readOnly) => {
    const isSearching = Boolean(searchTerm.trim());
    const visibleBooks = isSearching ? filteredBooks : booksForDisplay;
    const noResults = isSearching && filteredBooks.length === 0;
    const noCatalogue = !isSearching && books.length === 0;

    return (
      <div className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {readOnly ? "Koleksi Buku" : "Manajemen Buku"}
            </h2>
            <p className="text-muted-foreground">
              {readOnly
                ? "Telusuri koleksi yang dikurasi administrator."
                : "Kelola rak digital minimal 25 judul."}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <input
                type="text"
                placeholder="Search books..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            {readOnly && currentUser && (
              <button
                className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90"
                onClick={openRequestModal}
              >
                {copy.requestForm.cta}
              </button>
            )}
          </div>
        </div>

        {loadingBooks && (
          <div className="text-center py-12 text-muted-foreground">
            Loading books...
          </div>
        )}
        {!loadingBooks && booksError && (
          <div className="text-center py-12 text-destructive">{booksError}</div>
        )}

        {!loadingBooks && !booksError && noResults && (
          <div className="text-center py-12 space-y-4">
            <div className="text-4xl">📚</div>
            <h3 className="text-lg font-semibold">No books found</h3>
            <p className="text-muted-foreground">
              Try another keyword or clear the search box.
            </p>
          </div>
        )}

        {!loadingBooks && !booksError && !noResults && (
          <>
            {noCatalogue && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                Belum ada buku yang tersimpan — slot cadangan akan muncul hingga{" "}
                {MINIMUM_LIBRARY_SIZE} entri.
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
              {visibleBooks.map((book) => (
                <article
                  key={book.id}
                  className="group rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden hover:shadow-md transition-all"
                >
                  <div
                    className={`aspect-[2/3] bg-muted relative overflow-hidden ${
                      book.coverImage ? "" : "flex items-center justify-center"
                    }`}
                  >
                    {book.coverImage ? (
                      <img
                        src={book.coverImage}
                        alt={book.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                          event.currentTarget.parentElement?.classList.add(
                            "flex",
                            "items-center",
                            "justify-center",
                          );
                          event.currentTarget.parentElement.innerHTML =
                            '<span class="text-muted-foreground text-sm">No cover available</span>';
                        }}
                      />
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        No cover available
                      </span>
                    )}
                    <div className="absolute top-2 right-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${availabilityBadgeClasses(
                          book.status,
                        )}`}
                      >
                        {book.status || "unknown"}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">
                        ID: {book.id}
                      </div>
                      <h3
                        className="font-semibold leading-tight line-clamp-1"
                        title={book.title}
                      >
                        {book.title}
                      </h3>
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        📝 {(book.authors || []).join(", ") || "Unknown author"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        📅 {book.year || "Unknown year"}
                      </div>
                    </div>
                    {book.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {book.description}
                      </p>
                    )}
                    {book.placeholder && (
                      <p className="text-xs text-muted-foreground italic">
                        Slot cadangan — tambahkan buku baru untuk mengisi.
                      </p>
                    )}
                    {book.externalLink && !book.placeholder && (
                      <a
                        className="text-xs text-primary hover:underline inline-flex items-center"
                        href={book.externalLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Visit source <span className="ml-1">↗</span>
                      </a>
                    )}
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3"
                        onClick={() => openDetailModal(book)}
                        disabled={book.placeholder}
                      >
                        👁️ View
                      </button>
                      {!readOnly && !book.placeholder && (
                        <>
                          <button
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3"
                            onClick={() => handleEditBook(book.id)}
                          >
                            ✏️
                          </button>
                          <button
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 h-8 px-3"
                            onClick={() => handleDeleteBook(book)}
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderRequestsSection = () => {
    const visibleRequests = filteredRequests;

    return (
      <div className="space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {copy.requests.title}
            </h2>
            <p className="text-muted-foreground">{copy.requests.description}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <select
              value={requestFilter}
              onChange={(event) => setRequestFilter(event.target.value)}
              className="flex h-10 w-full sm:w-48 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="all">{copy.requests.filters.all}</option>
              <option value="pending">{copy.requests.filters.pending}</option>
              <option value="approved">{copy.requests.filters.approved}</option>
              <option value="rejected">{copy.requests.filters.rejected}</option>
            </select>
            <button
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              onClick={loadRequests}
              disabled={loadingRequests}
            >
              {loadingRequests ? copy.books.loading : copy.header.refresh}
            </button>
          </div>
        </div>

        {requestError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {requestError}
          </div>
        )}

        {loadingRequests ? (
          <div className="text-center py-12 text-muted-foreground">
            {copy.books.loading}
          </div>
        ) : visibleRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-10 text-center space-y-3">
            <div className="text-4xl">📮</div>
            <h3 className="text-lg font-semibold">
              {copy.requests.emptyTitle}
            </h3>
            <p className="text-sm text-muted-foreground">
              {copy.requests.emptyBody}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleRequests.map((request) => {
              const noteValue =
                requestNotes[request.id] ?? request.adminNote ?? "";
              const statusLabel =
                copy.requests.statusLabel[request.status] || request.status;
              return (
                <article
                  key={request.id}
                  className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-5 space-y-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        {copy.requests.table.requester}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {request.requesterName ||
                          copy.placeholders.unknownAuthor}
                        {request.requesterEmail && (
                          <span className="text-xs text-muted-foreground/80 block">
                            {request.requesterEmail}
                          </span>
                        )}
                      </p>
                      <h3 className="text-xl font-semibold leading-tight">
                        {request.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {(request.authors || []).join(", ") ||
                          copy.placeholders.unknownAuthor}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(request.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${requestStatusClasses(
                          request.status,
                        )}`}
                      >
                        {statusLabel}
                      </span>
                      {request.externalLink && (
                        <a
                          href={request.externalLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          {copy.books.visitSource} ↗
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div>
                      <span className="font-semibold text-foreground block text-xs uppercase tracking-[0.2em]">
                        {copy.requests.table.reason}
                      </span>
                      <p>{request.reason || "-"}</p>
                    </div>
                    {request.additionalNotes && (
                      <div>
                        <span className="font-semibold text-foreground block text-xs uppercase tracking-[0.2em]">
                          {copy.requestForm.labels.notes}
                        </span>
                        <p>{request.additionalNotes}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      {copy.requests.adminNotePlaceholder}
                    </label>
                    <textarea
                      rows={2}
                      value={noteValue}
                      onChange={(event) =>
                        handleRequestNoteChange(request.id, event.target.value)
                      }
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90"
                      onClick={() =>
                        handleRequestStatusChange(
                          request.id,
                          "approved",
                          requestNotes[request.id] ?? request.adminNote ?? "",
                        )
                      }
                    >
                      {copy.requests.actions.approve}
                    </button>
                    <button
                      className="inline-flex items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                      onClick={() =>
                        handleRequestStatusChange(
                          request.id,
                          "rejected",
                          requestNotes[request.id] ?? request.adminNote ?? "",
                        )
                      }
                    >
                      {copy.requests.actions.reject}
                    </button>
                    {request.status !== "pending" && (
                      <button
                        className="inline-flex items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                        onClick={() =>
                          handleRequestStatusChange(
                            request.id,
                            "pending",
                            requestNotes[request.id] ?? request.adminNote ?? "",
                          )
                        }
                      >
                        {copy.requests.actions.revert}
                      </button>
                    )}
                    <button
                      className="inline-flex items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                      onClick={() => handlePrefillBookFromRequest(request)}
                    >
                      {copy.requests.actions.convert}
                    </button>
                    <button
                      className="inline-flex items-center justify-center rounded-md bg-destructive text-destructive-foreground px-4 py-2 text-sm font-medium hover:bg-destructive/90"
                      onClick={() =>
                        handleRequestDelete(request.id, request.title)
                      }
                    >
                      {copy.requests.actions.delete}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderHistorySection = () => (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Riwayat Bacaan</h2>
          <p className="text-muted-foreground">
            Catatan otomatis saat kamu membuka detail buku.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {historyEntries.length} entri
          </span>
          <button
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
            onClick={clearHistory}
            disabled={!historyEntries.length}
          >
            Bersihkan History
          </button>
        </div>
      </div>

      {historyEntries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-10 text-center space-y-3">
          <div className="text-4xl">🕰️</div>
          <h3 className="text-lg font-semibold">Belum ada riwayat</h3>
          <p className="text-sm text-muted-foreground">
            Buka detail buku apa pun dan riwayatmu akan tersimpan otomatis di
            sini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
          {historyEntries.map((entry) => (
            <article
              key={`${entry.id}-${entry.timestamp}`}
              className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-4 flex gap-4"
            >
              <div className="h-24 w-16 rounded-lg overflow-hidden border border-border bg-muted flex-shrink-0">
                {entry.coverImage ? (
                  <img
                    src={entry.coverImage}
                    alt={entry.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    No cover
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                  <h4 className="font-semibold leading-tight line-clamp-1">
                    {entry.title}
                  </h4>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {(entry.authors || []).join(", ") || "Unknown author"}
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 ring-1 ring-border capitalize">
                    {entry.status || "unknown"}
                  </span>
                  <button
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={() => openHistoryEntry(entry)}
                  >
                    Buka detail
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );

  const renderSignedOutState = () => (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
      <div className="lg:col-span-3 space-y-5">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          Digital Library
        </p>
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
            Arsip monokrom untuk membaca tanpa distraksi.
          </h1>
          <p className="text-lg text-muted-foreground">
            Login sebagai admin untuk mengkurasi koleksi dan akun, atau masuk
            sebagai user untuk fokus membaca serta melacak history.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-2xl border border-border/80 bg-card/60 p-4 space-y-1">
            <p className="text-2xl font-semibold">{MINIMUM_LIBRARY_SIZE}+</p>
            <p className="text-muted-foreground">Slot koleksi siap isi</p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card/60 p-4 space-y-1">
            <p className="text-2xl font-semibold">2 role</p>
            <p className="text-muted-foreground">Admin & User dashboard</p>
          </div>
        </div>
      </div>
      <div className="lg:col-span-2 w-full max-w-md lg:ml-auto">
        <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                {authMode === "login" ? "Masuk" : "Buat akun"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {authMode === "login"
                  ? "Gunakan kredensial admin/user yang tersedia."
                  : "Daftarkan user baru dengan akses dasar."}
              </p>
            </div>
            {authBanner && (
              <span className="text-xs text-muted-foreground">
                {authBanner}
              </span>
            )}
          </div>
          <div className="inline-flex rounded-full border border-border p-1 text-xs font-medium">
            <button
              type="button"
              className={`flex-1 rounded-full px-4 py-1.5 transition-colors ${
                authMode === "login"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground"
              }`}
              onClick={() => setAuthMode("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={`flex-1 rounded-full px-4 py-1.5 transition-colors ${
                authMode === "register"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground"
              }`}
              onClick={() => setAuthMode("register")}
            >
              Register
            </button>
          </div>
          {authError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {authError}
            </div>
          )}
          <form className="space-y-4" onSubmit={handleAuthSubmit}>
            {authMode === "register" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama lengkap</label>
                <input
                  type="text"
                  value={authForm.name}
                  onChange={(event) =>
                    setAuthForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Jane Doe"
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                value={authForm.email}
                onChange={(event) =>
                  setAuthForm((prev) => ({
                    ...prev,
                    email: event.target.value,
                  }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <input
                type="password"
                value={authForm.password}
                onChange={(event) =>
                  setAuthForm((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90"
            >
              {authMode === "login" ? "Masuk" : "Daftar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/40">
        <div className="container mx-auto px-4 md:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              {copy.header.brand}
            </p>
            <h1 className="text-2xl font-semibold">{copy.header.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                health.ok
                  ? "bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900"
                  : "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"
              }`}
            >
              {health.label}
            </div>
            <button
              className="text-xs text-muted-foreground hover:underline"
              onClick={checkHealth}
            >
              {copy.header.refresh}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {copy.header.languageToggle}
              </span>
              <div className="inline-flex rounded-full border border-border bg-background p-1 text-xs font-medium">
                {LANGUAGE_OPTIONS.map((option) => {
                  const active = language === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-full px-3 py-1 transition-colors ${
                        active
                          ? "bg-foreground text-background shadow-sm"
                          : "text-muted-foreground"
                      }`}
                    >
                      <input
                        type="radio"
                        name="language-toggle"
                        value={option.value}
                        className="sr-only"
                        checked={active}
                        onChange={() => toggleLanguage(option.value)}
                      />
                      {option.label}
                    </label>
                  );
                })}
              </div>
            </div>
            {currentUser ? (
              <>
                <button
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                  onClick={openSearchModal}
                >
                  {copy.header.searchApi}
                </button>
                <button
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                  onClick={openProfileModal}
                >
                  {copy.header.editProfile}
                </button>
                <button
                  className="inline-flex items-center justify-center rounded-md bg-foreground text-background px-3 py-1.5 text-xs font-medium hover:bg-foreground/90"
                  onClick={handleLogout}
                >
                  {copy.header.logout}
                </button>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">
                {copy.header.defaultCredentialHint}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 space-y-6 md:space-y-7">
        {currentUser ? (
          <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-card/60 p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full border border-border bg-muted flex items-center justify-center text-xl">
                  {currentUser.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    currentUser.name?.charAt(0) || "?"
                  )}
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
                    {currentUser.role}
                  </p>
                  <p className="text-xl font-semibold leading-tight">
                    {currentUser.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {currentUser.email}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span>
                  Koleksi aktif: <strong>{books.length}</strong>
                </span>
                {!isAdmin && (
                  <span>
                    Riwayat: <strong>{historyEntries.length}</strong>
                  </span>
                )}
                <button
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                  onClick={loadBooks}
                >
                  Sinkronkan buku
                </button>
              </div>
            </section>

            <nav className="flex flex-wrap gap-2">
              {navItems.map((item) => {
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                      active
                        ? "bg-foreground text-background border-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <section className="space-y-6">
              {activeSection === "dashboard" &&
                (isAdmin ? renderAdminDashboard() : renderUserDashboard())}
              {isAdmin && activeSection === "users" && renderUsersSection()}
              {isAdmin &&
                activeSection === "requests" &&
                renderRequestsSection()}
              {activeSection === "books" && renderBooksSection(!isAdmin)}
              {!isAdmin &&
                activeSection === "history" &&
                renderHistorySection()}
            </section>
          </div>
        ) : (
          renderSignedOutState()
        )}
      </main>

      {profileModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && closeProfileModal()}
        >
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg sm:rounded-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Edit Profile</h3>
              <button
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={closeProfileModal}
              >
                <span className="sr-only">Close</span>
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="profileName"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Name
                </label>
                <input
                  id="profileName"
                  type="text"
                  value={profileForm.name}
                  onChange={(event) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="profileEmail"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Email
                </label>
                <input
                  id="profileEmail"
                  type="email"
                  value={profileForm.email}
                  onChange={(event) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="profilePassword"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Password
                </label>
                <input
                  id="profilePassword"
                  type="password"
                  value={profileForm.password}
                  onChange={(event) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      password: event.target.value,
                    }))
                  }
                  placeholder="Leave blank to keep current password"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="profileAvatar"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Profile Photo URL
                </label>
                <input
                  id="profileAvatar"
                  type="url"
                  value={profileForm.avatar}
                  onChange={(event) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      avatar: event.target.value,
                    }))
                  }
                  placeholder="https://example.com/avatar.png"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="profileBio"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Bio
                </label>
                <textarea
                  id="profileBio"
                  rows="3"
                  value={profileForm.bio}
                  onChange={(event) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      bio: event.target.value,
                    }))
                  }
                  placeholder="Tell the library who you are..."
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                  onClick={closeProfileModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {requestModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && closeRequestModal()}
        >
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-lg sm:rounded-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold">
                  {copy.requestForm.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {copy.requestForm.description}
                </p>
              </div>
              <button
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={closeRequestModal}
              >
                <span className="sr-only">Close</span>
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <form onSubmit={handleRequestSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {copy.requestForm.labels.title}
                </label>
                <input
                  type="text"
                  value={requestForm.title}
                  onChange={(event) =>
                    setRequestForm((prev) => ({
                      ...prev,
                      title: event.target.value,
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder={copy.requestForm.placeholders.title}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {copy.requestForm.labels.authors}
                </label>
                <input
                  type="text"
                  value={requestForm.authors}
                  onChange={(event) =>
                    setRequestForm((prev) => ({
                      ...prev,
                      authors: event.target.value,
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder={copy.requestForm.placeholders.authors}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {copy.requestForm.labels.externalLink}
                </label>
                <input
                  type="url"
                  value={requestForm.externalLink}
                  onChange={(event) =>
                    setRequestForm((prev) => ({
                      ...prev,
                      externalLink: event.target.value,
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder={copy.requestForm.placeholders.externalLink}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {copy.requestForm.labels.reason}
                </label>
                <textarea
                  rows="3"
                  value={requestForm.reason}
                  onChange={(event) =>
                    setRequestForm((prev) => ({
                      ...prev,
                      reason: event.target.value,
                    }))
                  }
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder={copy.requestForm.placeholders.reason}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {copy.requestForm.labels.notes}
                </label>
                <textarea
                  rows="3"
                  value={requestForm.notes}
                  onChange={(event) =>
                    setRequestForm((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder={copy.requestForm.placeholders.notes}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                  onClick={closeRequestModal}
                >
                  {copy.requestForm.cancel}
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-70"
                  disabled={requestSubmitting}
                >
                  {requestSubmitting
                    ? copy.requestForm.submitting
                    : copy.requestForm.submit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {bookModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && closeBookModal()}
        >
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-lg sm:rounded-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">
                {bookForm.id ? "Edit Book" : "Add New Book"}
              </h3>
              <button
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={closeBookModal}
              >
                <span className="sr-only">Close</span>
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <form onSubmit={handleBookSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <label
                    htmlFor="title"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Title *
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={bookForm.title}
                    onChange={(event) =>
                      setBookForm((prev) => ({
                        ...prev,
                        title: event.target.value,
                      }))
                    }
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <label
                    htmlFor="authors"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Authors *
                  </label>
                  <input
                    id="authors"
                    type="text"
                    value={bookForm.authors}
                    onChange={(event) =>
                      setBookForm((prev) => ({
                        ...prev,
                        authors: event.target.value,
                      }))
                    }
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="year"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Publication Year
                  </label>
                  <input
                    id="year"
                    type="number"
                    min="0"
                    value={bookForm.year}
                    onChange={(event) =>
                      setBookForm((prev) => ({
                        ...prev,
                        year: event.target.value,
                      }))
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="status"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Status
                  </label>
                  <select
                    id="status"
                    value={bookForm.status}
                    onChange={(event) =>
                      setBookForm((prev) => ({
                        ...prev,
                        status: event.target.value,
                      }))
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>
                <div className="space-y-2 col-span-2">
                  <label
                    htmlFor="coverImage"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Cover Image URL
                  </label>
                  <input
                    id="coverImage"
                    type="url"
                    value={bookForm.coverImage}
                    onChange={(event) =>
                      setBookForm((prev) => ({
                        ...prev,
                        coverImage: event.target.value,
                      }))
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <label
                    htmlFor="externalLink"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    External Link / Source
                  </label>
                  <input
                    id="externalLink"
                    type="url"
                    placeholder="https://example.com/book-page"
                    value={bookForm.externalLink}
                    onChange={(event) =>
                      setBookForm((prev) => ({
                        ...prev,
                        externalLink: event.target.value,
                      }))
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <label
                    htmlFor="description"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows="3"
                    value={bookForm.description}
                    onChange={(event) =>
                      setBookForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <label
                    htmlFor="content"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Reading Content
                  </label>
                  <textarea
                    id="content"
                    rows="4"
                    value={bookForm.content}
                    onChange={(event) =>
                      setBookForm((prev) => ({
                        ...prev,
                        content: event.target.value,
                      }))
                    }
                    placeholder="Paste excerpt or summary"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                  onClick={closeBookModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                  {bookForm.id ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {searchModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && closeSearchModal()}
        >
          <div className="w-full max-w-3xl rounded-lg border border-border bg-card p-6 shadow-lg sm:rounded-xl h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Search External APIs</h3>
              <button
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={closeSearchModal}
              >
                <span className="sr-only">Close</span>
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="flex flex-col flex-1 overflow-hidden space-y-4">
              <div className="flex items-center rounded-md bg-muted p-1">
                <button
                  className={`flex-1 rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    externalApi === "openlibrary"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-background/50"
                  }`}
                  onClick={() => setExternalApi("openlibrary")}
                >
                  Open Library
                </button>
                <button
                  className={`flex-1 rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    externalApi === "gutendex"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-background/50"
                  }`}
                  onClick={() => setExternalApi("gutendex")}
                >
                  Gutendex
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search books..."
                  value={externalQuery}
                  onChange={(event) => setExternalQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleExternalSearch();
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                  onClick={handleExternalSearch}
                  disabled={externalLoading}
                >
                  {externalLoading ? "Searching..." : "Search"}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {externalResults.length === 0 && !externalLoading && (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <div className="text-4xl mb-2">🔍</div>
                    <p>Results will appear here.</p>
                  </div>
                )}
                {externalResults.map((result, index) => {
                  const preview = buildPayloadFromExternal(result);
                  const previewAuthors =
                    (preview.authors || []).join(", ") || "Unknown";
                  const sourceLabel =
                    (result._source || externalApi) === "gutendex"
                      ? "Gutendex"
                      : "Open Library";
                  const importDisabled =
                    importingExternalId === getExternalId(result);
                  return (
                    <div
                      key={result.id || result.key || index}
                      className="flex flex-col sm:flex-row gap-4 p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{preview.title}</h4>
                          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                            {sourceLabel}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          📝 {previewAuthors}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          📅 {preview.year || "Unknown"}
                        </div>
                        {preview.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                            {preview.description}
                          </p>
                        )}
                        {preview.externalLink && (
                          <a
                            className="text-xs text-primary hover:underline inline-flex items-center mt-1"
                            href={preview.externalLink}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open source ↗
                          </a>
                        )}
                      </div>
                      <div className="flex items-center">
                        <button
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 whitespace-nowrap"
                          onClick={() => importExternalBook(result)}
                          disabled={importDisabled}
                        >
                          {importDisabled ? "Adding…" : "Add to Library"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {detailModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && closeDetailModal()}
        >
          <div className="w-full max-w-4xl rounded-lg border border-border bg-card p-6 shadow-lg sm:rounded-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold line-clamp-1">
                {activeBook?.title}
              </h3>
              <button
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={closeDetailModal}
              >
                <span className="sr-only">Close</span>
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              {activeBook && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-4">
                    <div className="aspect-[2/3] bg-muted rounded-lg overflow-hidden relative">
                      {activeBook.coverImage ? (
                        <img
                          src={activeBook.coverImage}
                          alt={activeBook.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          No cover
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${availabilityBadgeClasses(
                            activeBook.status,
                          )}`}
                        >
                          {activeBook.status || "unknown"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-5">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-semibold block">Authors</span>
                          <span className="text-muted-foreground">
                            {(activeBook.authors || []).join(", ") || "Unknown"}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold block">Year</span>
                          <span className="text-muted-foreground">
                            {activeBook.year || "Unknown"}
                          </span>
                        </div>
                      </div>

                      {activeBook.description && (
                        <div>
                          <span className="font-semibold block text-sm mb-1">
                            Description
                          </span>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {activeBook.description}
                          </p>
                        </div>
                      )}

                      {activeBook.externalLink && (
                        <a
                          className="inline-flex items-center text-sm text-primary hover:underline"
                          href={activeBook.externalLink}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View original source ↗
                        </a>
                      )}
                    </div>

                    {activeBook.content && (
                      <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
                        <span className="font-semibold block text-sm">
                          Reading Content
                        </span>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap font-serif">
                          {activeBook.content}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {toast.visible && (
        <div
          className={`fixed bottom-4 right-4 z-50 rounded-md border px-4 py-3 shadow-lg transition-all duration-300 ${
            toast.type === "success"
              ? "bg-neutral-100 border-neutral-200 text-neutral-800 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-100"
              : toast.type === "error"
                ? "bg-neutral-900 border-neutral-700 text-neutral-50 dark:bg-neutral-100 dark:border-neutral-200 dark:text-neutral-900"
                : "bg-background border-border text-foreground"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>
              {toast.type === "success"
                ? "✅"
                : toast.type === "error"
                  ? "❌"
                  : "ℹ️"}
            </span>
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
