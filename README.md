# Dashboard Pemerataan Tenaga Kesehatan Dasar Provinsi Aceh

Aplikasi web dashboard interaktif yang dirancang untuk menganalisis, memetakan, dan menyajikan disparitas sebaran tenaga kesehatan dasar di berbagai unit Puskesmas seluruh Kabupaten/Kota di Provinsi Aceh. Dashboard ini menggunakan pendekatan berbasis data (*data-driven*) dengan visualisasi modern untuk membantu mengidentifikasi wilayah dengan alokasi tenaga kesehatan yang kritis maupun padat.

---

## 🚀 Fitur Utama

1. **Integrasi Data CSV Mandiri (Client-Side)**
   * Menggunakan pustaka **PapaParse** untuk membaca dan memproses berkas data ekspor `.csv` secara langsung di sisi klien tanpa memerlukan server backend.
   
2. **Penyimpanan Data Otomatis (`localStorage`)**
   * Menyimpan data yang telah diunggah di browser secara lokal. Saat halaman web di-refresh, dashboard akan otomatis memuat dan menampilkan data terakhir yang diunggah secara instan.

3. **Visualisasi Data Interaktif (Chart.js)**
   * **Matriks Disparitas (Bar Chart)**: Memetakan rasio nakes per Puskesmas di setiap kabupaten/kota dengan pewarnaan zona (Zona Kritis `< 30` berwarna merah, Zona Optimal/Padat `>= 30` berwarna hijau/toska).
   * **Visual Komposisi Profesi (Doughnut Chart)**: Menampilkan kontribusi persentase dari 5 profesi nakes di kabupaten/kota terpilih (Perawat, Bidan, Kesmas, Kesling, dan Gizi).
   * **Profil vs Rata-rata Provinsi (Radar Chart)**: Menunjukkan perbandingan performa sebaran nakes di daerah terpilih terhadap rata-rata provinsi Aceh secara modular.

4. **Animasi & Interaktivitas Premium**
   * **Animasi Angka (Count-Up)**: Semua indikator numerik (kapasitas faskes, total jiwa, dan rasio kepadatan) melakukan animasi bergerak saat pengguna mengganti wilayah.
   * **Animasi Grafik Dinamis**: Grafik lingkaran (*doughnut*) dan radar bergeser/berputar secara dinamis (*morfing*) saat memperbarui data wilayah terpilih tanpa berkedip.
   * **Efek Kilasan Panel**: Panel detail wilayah memberikan respon visual berupa kilasan (*pulse highlight* skala & kecerahan) saat daerah baru dipilih.

---

## 📁 Struktur Berkas

Projek ini dibangun secara terpisah agar kode rapi, modular, dan mudah dikembangkan:

```
tugas-analisis-data/
├── index.html       # Kerangka UI (Struktur layout, Tailwind CSS, & CDN libraries)
├── style.css        # Lembar Gaya (Kustomisasi scrollbar & keyframes animasi interaksi)
├── app.js           # Logika Utama (State, pipeline CSV, visualisasi Chart.js, & efek animasi)
└── README.md        # Dokumentasi Detail Projek
```

---

## 📊 Format Skema Data CSV

Agar data dapat terbaca oleh pipeline otomatis di `app.js`, berkas `.csv` yang diunggah harus memiliki header/kolom berikut (sesuai skema database ekspor Supabase):

| Nama Kolom | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `kabupaten_kota` | Teks | Nama wilayah Kabupaten/Kota |
| `jumlah_puskesmas_2024` | Angka | Jumlah unit Puskesmas di wilayah tersebut |
| `total_seluruh_nakes` | Angka | Total agregat tenaga kesehatan |
| `rasio_nakes_per_puskesmas` | Desimal | Rasio rata-rata (Total Nakes / Puskesmas) |
| `jumlah_perawat` | Angka | Jumlah profesi perawat |
| `jumlah_bidan` | Angka | Jumlah profesi bidan |
| `jumlah_kesmas` | Angka | Jumlah profesi kesehatan masyarakat (Kesmas) |
| `jumlah_kesling` | Angka | Jumlah profesi kesehatan lingkungan (Kesling) |
| `jumlah_gizi` | Angka | Jumlah profesi tenaga gizi |

---

## 🛠️ Teknologi yang Digunakan

* **HTML5 & Tailwind CSS**: Kerangka struktur semantik dan styling antarmuka modern yang responsif.
* **JavaScript (Vanilla ES6)**: Pengendali state, interaktivitas, dan manipulasi DOM secara efisien.
* **Chart.js**: Mesin rendering grafik responsif dengan animasi morfing dataset.
* **PapaParse**: Pustaka parsing CSV yang andal di browser.

---

## 💻 Cara Menjalankan Projek

1. Unduh atau clone repositori ini ke komputer Anda:
   ```bash
   git clone https://github.com/suzuy1/tugas-data-analisis.git
   ```
2. Navigasikan ke dalam folder projek dan buka berkas `index.html` langsung menggunakan penjelajah web (browser) Anda. (Sangat direkomendasikan menggunakan ekstensi **Live Server** di VS Code).
3. Siapkan berkas `.csv` yang sesuai format, kemudian **tarik & lepas (drag-and-drop)** atau klik zona upload untuk mengimpor berkas.
4. Nikmati dashboard interaktif dengan seluruh visualisasi dan animasinya.
