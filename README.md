# SPPD Web App - Google Apps Script

## File utama
- `Code.gs`: backend (login, CRUD, absensi, anggaran bertingkat, hitung biaya, terbilang, export PDF)
- `Index.html`, `CSS.html`, `JS.html`: frontend modern responsive
- `TemplateSPT.html`, `TemplateSPPD.html`, `TemplateLaporan.html`, `TemplateKwitansi.html`: template cetak

## Setup Otomatis Sheet + Trigger (BARU)
1. Buka spreadsheet utama → **Extensions → Apps Script**.
2. Paste semua file proyek.
3. Jalankan fungsi `setupApp()` sekali dari editor Apps Script.
4. Fungsi ini otomatis:
   - membuat seluruh sheet wajib jika belum ada,
   - membuat header standar tiap sheet,
   - memasang trigger time-driven `autoGenerateSheetsTrigger()` setiap 1 jam.
5. Jika ada sheet terhapus/tidak lengkap header, trigger akan membangunkan ulang struktur otomatis.

## Struktur sheet yang akan dibuat otomatis
- Database_Pegawai
- Absensi
- Anggaran
- Standar_Harga
- SPT
- SPT_Detail
- SPPD
- Laporan
- Kwitansi
- Monitoring
- Users
- Log_Aktivitas
- Setting

## Header minimal per sheet
- `Users`: username, password, nama, role
- `SPT`: nomor_spt, tanggal, dasar, maksud, tujuan, berangkat_dari, tanggal_berangkat, tanggal_kembali, lama_hari, sumber_dana, kegiatan, sub_kegiatan, objek_belanja, kode_rekening, nama_kegiatan, catatan_pejabat
- `SPT_Detail`: id_detail, nomor_spt, id_qr
- `SPPD`: nomor_sppd, nomor_spt, pejabat_pemberi_tugas, id_qr, nama, pangkat_golongan, jabatan, tujuan, lama_hari, anggaran, tanggal, rute, tanda_tangan, status_perjalanan
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
