# SPPD Web App - Google Apps Script

## File utama
- `Code.gs`: backend (login, CRUD, absensi, anggaran bertingkat, hitung biaya, terbilang, export PDF)
- `Index.html`, `CSS.html`, `JS.html`: frontend modern responsive
- `TemplateSPT.html`, `TemplateSPPD.html`, `TemplateLaporan.html`, `TemplateKwitansi.html`: template cetak

## Setup Google Sheet
Buat spreadsheet utama (untuk Apps Script) dengan sheet berikut:
1. Database_Pegawai
2. Absensi
3. Anggaran
4. Standar_Harga
5. SPT
6. SPT_Detail
7. SPPD
8. Laporan
9. Kwitansi
10. Monitoring
11. Users
12. Log_Aktivitas
13. Setting

### Header minimal per sheet
- `Users`: username, password, nama, role
- `SPT`: nomor_spt, tanggal, dasar, maksud, tujuan, tanggal_berangkat, tanggal_kembali, lama_hari, sumber_dana, kegiatan, sub_kegiatan, objek_belanja, kode_rekening, catatan_pejabat
- `SPT_Detail`: id_detail, nomor_spt, id_qr
- `SPPD`: nomor_sppd, nomor_spt, pejabat_pemberi_tugas, tujuan, lama_hari, tanggal, rute, status_perjalanan
- `Laporan`: id_laporan, nomor_sppd, dasar, tujuan, hasil, kesimpulan, saran, penutup
- `Kwitansi`: id_kwitansi, nomor_spt, nomor_sppd, id_qr, penginapan, makan, uang_saku, transport, total, terbilang
- `Monitoring`: id_qr, nomor_sppd, status_perjalanan, jumlah_perjalanan, tanggal_mulai, tanggal_selesai
- `Anggaran`: kegiatan, sub_kegiatan, objek_belanja, kode_rekening, nama_kegiatan, sumber_dana
- `Standar_Harga`: kode_lokasi, penginapan, makan, uang_saku, transport
- `Setting`: key, value, file_id
- `Log_Aktivitas`: waktu, user, modul, aksi, data

## Integrasi sumber eksternal
- Database pegawai otomatis dari spreadsheet ID: `1vQBjRbWOH3IpODEuX6lnJum0M0Jcnh8Eo-kKEHz8k4o`
- Absensi otomatis dari spreadsheet ID: `1s1zVQStEiZ9va2HGH-LTOZ6blW-OvajopNjgfEv3EsE` sheet `Absensi`

## Deploy Web App
1. Buka spreadsheet utama → Extensions → Apps Script.
2. Salin semua file proyek ini ke Apps Script project.
3. Pastikan izin Drive, Spreadsheet, dan UserProperties diberikan.
4. Deploy → New deployment → Type: Web app.
5. Execute as: **Me**.
6. Who has access: sesuai kebutuhan (domain/internal/public).
7. Klik Deploy, simpan URL Web App.

## Catatan
- Nilai kosong di-normalisasi menjadi `-` agar tidak tampil #N/A.
- Validasi absensi ketat tersedia di `checkAbsensiForPegawai`.
- Status `TL` memerlukan konfirmasi dan pencatatan log aktivitas.
