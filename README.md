# SILUMNI – Professional Milestone Aggregator

> Sistem pelacakan karir alumni berbasis web untuk keperluan pelaporan akreditasi universitas.

🔗 **Live Demo:** [https://peoject-rp.vercel.app](https://peoject-rp.vercel.app)

---

## 📋 Deskripsi

SILUMNI adalah platform web yang memungkinkan universitas untuk:
- Melacak milestone karir alumni secara otomatis dari sumber publik (LinkedIn, Google Scholar, ORCID, GitHub)
- Mengelola data alumni, sertifikasi, dan milestone karir
- Menghasilkan laporan distribusi profesional alumni untuk keperluan akreditasi

---

## 👥 User Roles

| Role | Akses |
|------|-------|
| **Admin** | Dashboard analitik, manajemen alumni, monitoring tracking, export laporan |
| **Alumni** | Profil pribadi, milestone karir, sertifikasi, konfirmasi hasil tracking |

---

## 🚀 Fitur Utama

### Alumni
- ✅ Registrasi & Login
- ✅ Manajemen profil (nama, NIM, prodi, tahun lulus, LinkedIn)
- ✅ Input & kelola career milestones
- ✅ Smart Validation — konfirmasi/tolak hasil tracking otomatis
- ✅ Manajemen sertifikasi
- ✅ Pencarian alumni

### Admin
- ✅ Dashboard analitik dengan chart distribusi
- ✅ Manajemen alumni (CRUD)
- ✅ Tracking Monitor — monitoring hasil pelacakan real-time
- ✅ Search Profiles — kelola profil pencarian per alumni
- ✅ Export laporan CSV (alumni, milestone, sertifikasi)
- ✅ Vercel Cron Job — tracking otomatis setiap Senin 02:00 UTC

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + React + Tailwind CSS |
| Backend | Next.js API Routes |
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth |
| External API | Google Custom Search, SerpAPI, ORCID Public API |
| Deployment | Vercel |

---

## ⚙️ Instalasi & Menjalankan Lokal

### Prasyarat
- Node.js 18+
- Akun Supabase
- Akun Google Cloud (untuk Custom Search API)

### Langkah Instalasi

```bash
# 1. Clone repository
git clone https://github.com/mdavaarya/PeojectRP.git
cd PeojectRP

# 2. Install dependencies
npm install

# 3. Buat file environment
cp .env.example .env.local
# Isi nilai env vars sesuai akun Supabase dan API key kamu

# 4. Setup database
# Jalankan supabase/schema.sql di Supabase SQL Editor
# Jalankan supabase/migration_tracking.sql
# (Opsional) Jalankan supabase/seed.sql untuk data contoh

# 5. Jalankan development server
npm run dev
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
GOOGLE_SEARCH_API_KEY=your-google-api-key
GOOGLE_SEARCH_CX=your-search-engine-id
SERPAPI_KEY=your-serpapi-key
CRON_SECRET=your-random-secret
```

---

## 🗄️ Struktur Database

| Tabel | Fungsi |
|-------|--------|
| `users` | Data akun pengguna dan role |
| `alumni_profiles` | Profil lengkap alumni |
| `career_milestones` | Riwayat karir alumni |
| `skills_certifications` | Sertifikasi dan keahlian |
| `search_profiles` | Profil pencarian untuk tracking otomatis |
| `tracking_jobs` | Riwayat job pelacakan |
| `tracking_results` | Hasil pelacakan per alumni |
| `tracking_evidence` | Bukti detail setiap temuan |
| `notification_logs` | Log notifikasi ke alumni |

---

## 🧪 Pengujian Aplikasi

Pengujian dilakukan secara manual berdasarkan 5 aspek kualitas perangkat lunak.

### 1. Functionality (Fungsionalitas)

| No | Skenario Uji | Input | Expected Output | Hasil | Status |
|----|-------------|-------|-----------------|-------|--------|
| 1 | Registrasi alumni baru | Email, password, nama, NIM, prodi | Akun terbuat, redirect ke login | Akun tersimpan di database | ✅ Pass |
| 2 | Login sebagai admin | Email admin, password | Redirect ke Admin Dashboard | Masuk ke halaman /admin | ✅ Pass |
| 3 | Login sebagai alumni | Email alumni, password | Redirect ke Alumni Dashboard | Masuk ke halaman /dashboard | ✅ Pass |
| 4 | Input career milestone | Nama perusahaan, posisi, tanggal, klasifikasi | Milestone tersimpan dengan status pending | Data muncul di daftar milestone | ✅ Pass |
| 5 | Konfirmasi milestone (Smart Validation) | Klik tombol Confirm | Status berubah menjadi verified | Status milestone = verified | ✅ Pass |
| 6 | Tolak milestone | Klik tombol Reject | Status berubah menjadi rejected | Status milestone = rejected | ✅ Pass |
| 7 | Tambah sertifikasi | Nama sertifikat, issuer, tahun | Sertifikasi tersimpan | Data muncul di daftar sertifikasi | ✅ Pass |
| 8 | Hapus sertifikasi | Klik tombol hapus | Sertifikasi terhapus | Data hilang dari daftar | ✅ Pass |
| 9 | Pencarian alumni | Keyword nama/NIM/prodi | Daftar alumni yang sesuai | Hasil pencarian muncul | ✅ Pass |
| 10 | Generate Search Profiles | Klik "Generate Semua" | Search profile terbuat untuk semua alumni | Profile tersimpan di database | ✅ Pass |
| 11 | Jalankan Tracking Job | Klik "Jalankan Sekarang" | Job berjalan, hasil tersimpan | Log tracking muncul di terminal | ✅ Pass |
| 12 | Export CSV alumni | Klik Export CSV | File CSV terunduh | File berisi data alumni | ✅ Pass |
| 13 | Export CSV milestone | Klik Export CSV milestones | File CSV terunduh | File berisi data milestone | ✅ Pass |
| 14 | Hapus alumni (admin) | Klik tombol Delete | Alumni terhapus beserta datanya | Data hilang dari manajemen | ✅ Pass |
| 15 | View detail tracking | Klik tombol View | Modal detail muncul | Evidence dan confidence score tampil | ✅ Pass |

---

### 2. Usability (Kemudahan Penggunaan)

| No | Aspek | Kriteria | Hasil Pengujian | Status |
|----|-------|----------|-----------------|--------|
| 1 | Navigasi | Sidebar menu mudah dipahami | Semua menu berlabel jelas dengan ikon | ✅ Pass |
| 2 | Feedback aksi | Notifikasi setelah aksi (toast) | Toast muncul setelah save/delete/confirm | ✅ Pass |
| 3 | Form validasi | Error ditampilkan saat input salah | Pesan error muncul (password tidak cocok, dll) | ✅ Pass |
| 4 | Loading state | Indikator loading saat proses berlangsung | Spinner muncul saat submit/fetch | ✅ Pass |
| 5 | Responsive layout | Tampilan baik di berbagai ukuran layar | Layout menyesuaikan ukuran browser | ✅ Pass |
| 6 | Role-based UI | UI berbeda untuk admin dan alumni | Sidebar admin ≠ sidebar alumni | ✅ Pass |
| 7 | Empty state | Pesan informatif saat data kosong | Teks "Belum ada data" dengan panduan | ✅ Pass |
| 8 | Password visibility | Toggle show/hide password | Tombol mata berfungsi di form login/register | ✅ Pass |
| 9 | Step form registrasi | Proses registrasi 2 langkah | Progress bar dan navigasi back/next | ✅ Pass |
| 10 | Password strength | Indikator kekuatan password | Bar kekuatan muncul saat mengetik | ✅ Pass |

---

### 3. Performance (Performa)

| No | Skenario | Kondisi | Target | Hasil | Status |
|----|---------|---------|--------|-------|--------|
| 1 | Load halaman login | Koneksi normal | < 3 detik | ~2.5 detik | ✅ Pass |
| 2 | Load dashboard alumni | Data 2 alumni, 3 milestone | < 3 detik | ~2 detik | ✅ Pass |
| 3 | Load admin dashboard | Data 3 alumni | < 4 detik | ~3.5 detik | ✅ Pass |
| 4 | Tracking job 2 alumni | Google API + Scholar + ORCID | < 30 detik | ~17 detik | ✅ Pass |
| 5 | Pencarian alumni | 3 alumni di database | < 2 detik | ~1 detik | ✅ Pass |
| 6 | Export CSV | 3 alumni | < 3 detik | ~1.5 detik | ✅ Pass |
| 7 | Generate search profiles | 3 alumni | < 5 detik | ~2 detik | ✅ Pass |
| 8 | Load tracking monitor | 5 job history | < 3 detik | ~2 detik | ✅ Pass |

---

### 4. Security (Keamanan)

| No | Aspek Keamanan | Metode Pengujian | Hasil | Status |
|----|---------------|-----------------|-------|--------|
| 1 | Autentikasi | Akses /dashboard tanpa login | Redirect ke /login | ✅ Pass |
| 2 | Otorisasi admin | Akses /admin sebagai alumni | Redirect ke /dashboard | ✅ Pass |
| 3 | Otorisasi data | Alumni A coba akses data alumni B | Data tidak dapat diakses | ✅ Pass |
| 4 | Session management | Token expired, akses halaman protected | Redirect ke /login | ✅ Pass |
| 5 | Password hashing | Cek data di database | Password tidak tersimpan plaintext | ✅ Pass |
| 6 | Environment variables | API key tidak terekspos di frontend | Key tidak muncul di browser source | ✅ Pass |
| 7 | Row Level Security | Query langsung ke Supabase tanpa auth | Data tidak dapat diakses | ✅ Pass |
| 8 | CSRF Protection | Supabase SSR cookie handling | Cookie httpOnly, tidak bisa diakses JS | ✅ Pass |

---

### 5. Reliability (Keandalan)

| No | Skenario | Kondisi | Expected | Hasil | Status |
|----|---------|---------|----------|-------|--------|
| 1 | API eksternal tidak tersedia | Google API key tidak dikonfigurasi | Sistem tetap jalan, hasil 0 dari Google | Log warning, tracking tetap berjalan | ✅ Pass |
| 2 | Alumni tidak ditemukan di internet | Nama tidak ada di sumber publik | Status "not_found", tidak crash | Status tersimpan dengan benar | ✅ Pass |
| 3 | Input form kosong | Submit tanpa mengisi field wajib | Form tidak tersubmit, pesan error muncul | Validasi HTML5 + custom berjalan | ✅ Pass |
| 4 | Tracking job gagal di tengah | Error pada 1 alumni | Alumni lain tetap diproses | Job berlanjut, error tercatat | ✅ Pass |
| 5 | Refresh halaman saat login | Refresh browser | Session tetap aktif | Tidak logout, halaman reload normal | ✅ Pass |
| 6 | Multiple tab | Buka 2 tab dengan user berbeda | Session terisolasi per tab | Tidak saling mengganggu | ✅ Pass |
| 7 | Build production | npm run build | Build sukses tanpa error | 30/30 halaman ter-generate | ✅ Pass |
| 8 | Deploy ke Vercel | Push ke GitHub | Deployment berhasil | Status Ready di Vercel | ✅ Pass |

---

## 🔄 Alur Smart Validation

```
Alumni daftar akun → Isi profil
        ↓
Admin generate Search Profile
        ↓
Tracking Job berjalan (otomatis/manual)
        ↓
Sistem cari di Google Scholar, ORCID, LinkedIn, dll
        ↓
Confidence Score dihitung (0.0 – 1.0)
        ↓
≥ 0.75 → "Identified"     → Notifikasi ke alumni
0.40–0.74 → "Needs Review" → Admin verifikasi manual
< 0.40 → "Not Found"
        ↓
Alumni konfirmasi → Career milestone otomatis terbuat
```

---

## 📁 Struktur Proyek

```
silumni/
├── app/
│   ├── (auth)/login & register
│   ├── (dashboard)/
│   │   ├── dashboard, profile, milestones
│   │   ├── certifications, search, tracking
│   │   └── admin/ (dashboard, alumni, tracking, search-profiles, reports)
│   └── api/ (alumni & admin endpoints, tracking, cron)
├── components/
│   ├── ui/ (Button, Card, Table, Modal, Badge)
│   ├── forms/ (ProfileForm, MilestoneForm, CertificationForm)
│   ├── charts/ (ProgramDistribution, MilestoneStatus)
│   └── layout/ (Sidebar, Header)
├── services/
│   ├── alumniService.ts
│   ├── adminService.ts
│   ├── trackingOrchestrator.ts
│   ├── disambiguationEngine.ts
│   ├── externalFetcher.ts
│   ├── queryGeneratorService.ts
│   ├── searchProfileService.ts
│   └── notificationService.ts
├── lib/ (supabaseClient, supabaseServer, utils)
├── types/ (index.ts, tracking.ts)
└── supabase/ (schema.sql, migration_tracking.sql, seed.sql)
```

---

## 👨‍💻 Developer

**M. Dava Arya Nada Putra**
Teknik Informatika — Universitas Muhammadiyah Malang

---

*Dibuat sebagai bagian dari Daily Project — Sistem Informasi Alumni Berbasis Web*
