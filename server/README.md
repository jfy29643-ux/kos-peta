# Backend - Aplikasi Pencarian & Pemesanan Kos Berbasis Peta

Node.js + Express 5 + Supabase (PostgreSQL). Autentikasi JWT (email + password, bcrypt).

## Menjalankan
1. `npm install`
2. Salin `.env.example` menjadi `.env`, isi nilainya
3. `npm run dev` (atau `npm start`)

Akun **Admin** dibuat langsung di database (`role = 'admin'`); endpoint register hanya menerima `owner` dan `user`.

## Endpoint
| Method | Path | Akses |
|---|---|---|
| POST | /api/auth/register, /api/auth/login | publik |
| GET | /api/auth/me | login |
| GET | /api/kos, /api/kos/:id | publik (hanya kos `aktif`) |
| GET | /api/kos/saya | owner |
| POST / PUT / DELETE | /api/kos, /api/kos/:id | owner (POST wajib sudah terverifikasi) |
| GET | /api/kos/:kosId/kamar | publik |
| POST / PUT / DELETE | /api/kos/:kosId/kamar, /api/kamar/:id | owner pemilik |
| POST / DELETE | /api/kos/:kosId/foto, /api/foto/:id | owner pemilik |
| GET | /api/fasilitas | publik |
| POST / PUT / DELETE | /api/fasilitas, /api/fasilitas/:id | admin |
| POST | /api/booking | user |
| GET | /api/booking/saya | user |
| GET | /api/booking/masuk | owner |
| PATCH | /api/booking/:id/status | owner (`disetujui`, `ditolak`, `selesai`) |
| POST | /api/review | user (booking harus `selesai`) |
| GET / PATCH | /api/admin/users, /api/admin/users/:id/verifikasi | admin |
| GET / PATCH | /api/admin/kos, /api/admin/kos/:id/status | admin |
| GET | /api/admin/kamar, /api/admin/booking | admin |

## Aturan bisnis
- Status kamar mengikuti booking: `kosong` -> `dalam_booking` (disetujui) -> `terisi` (selesai).
- Booking disetujui yang `tanggal_survey`-nya sudah lewat otomatis menjadi `selesai` (dicek tiap 5 menit dan saat daftar booking dibuka).
- Satu kamar hanya boleh punya satu booking disetujui; pengajuan lain untuk kamar itu otomatis `ditolak`.
- Kos hanya bisa dibooking jika statusnya `aktif`.
