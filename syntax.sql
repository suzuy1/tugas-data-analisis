-- ============================================================
-- ANALISIS RASIO TENAGA KESEHATAN PER PUSKESMAS
-- Dataset : Satu Data Kesehatan Indonesia
-- Tujuan  : Menghitung rata-rata jumlah tenaga kesehatan
--           pada setiap Puskesmas di tingkat Kabupaten/Kota.
--
-- Catatan:
-- 1. Menghindari double counting pada data tenaga kesehatan.
-- 2. Menangani data Bidan yang memiliki nilai jenis_kelamin = NULL.
-- 3. Menyesuaikan perbedaan nama kolom kunci antar dataset.
-- ============================================================


-- ============================================================
-- CTE 1
-- Membuat ringkasan jumlah Perawat dan Bidan
-- berdasarkan setiap Kabupaten/Kota
-- ============================================================

WITH ringkasan_perawat_bidan AS (

    -- Mengambil kode dan nama kabupaten/kota
    SELECT
        kemendagri_kode_kabupatenkota,
        kemendagri_nama_kabupatenkota,

        -- Menghitung total Perawat + Bidan
        -- Perawat hanya mengambil data "laki-laki + perempuan"
        -- agar tidak terjadi double counting.
        -- Bidan langsung dihitung karena jenis_kelamin bernilai NULL.
        SUM(
            CASE
                WHEN jenis_tenaga_di_puskesmas = 'perawat'
                     AND jenis_kelamin = 'laki-laki + perempuan'
                THEN jumlah_tenaga_di_puskesmas

                WHEN jenis_tenaga_di_puskesmas = 'bidan'
                THEN jumlah_tenaga_di_puskesmas

                ELSE 0
            END
        ) AS total_perawat_bidan,

        -- Menghitung total Perawat saja
        SUM(
            CASE
                WHEN jenis_tenaga_di_puskesmas = 'perawat'
                     AND jenis_kelamin = 'laki-laki + perempuan'
                THEN jumlah_tenaga_di_puskesmas
                ELSE 0
            END
        ) AS jumlah_perawat,

        -- Menghitung total Bidan saja
        SUM(
            CASE
                WHEN jenis_tenaga_di_puskesmas = 'bidan'
                THEN jumlah_tenaga_di_puskesmas
                ELSE 0
            END
        ) AS jumlah_bidan

    -- Mengambil data dari tabel tenaga Perawat dan Bidan
    FROM jumlah_tenaga_perawat_bidan_di_puskesmas

    -- Mengelompokkan data berdasarkan Kabupaten/Kota
    GROUP BY
        kemendagri_kode_kabupatenkota,
        kemendagri_nama_kabupatenkota
)



-- ============================================================
-- CTE 2
-- Menghitung jumlah tenaga kesehatan masyarakat,
-- kesehatan lingkungan dan tenaga gizi.
-- ============================================================

, ringkasan_kesmas_gizi AS (

    SELECT

        -- Mengambil kode Kabupaten/Kota
        kemendagri_kode_kabupatenkota,

        -- Menghitung total seluruh tenaga kesehatan
        SUM(jumlah_tenaga_kesehatan)
        AS total_kesmas_gizi,

        -- Menghitung tenaga kesehatan masyarakat
        SUM(
            CASE
                WHEN jenis_tenaga_kesehatan =
                'tenaga kesehatan masyarakat'
                THEN jumlah_tenaga_kesehatan
                ELSE 0
            END
        ) AS jumlah_kesmas,

        -- Menghitung tenaga kesehatan lingkungan
        SUM(
            CASE
                WHEN jenis_tenaga_kesehatan =
                'tenaga kesehatan lingkungan'
                THEN jumlah_tenaga_kesehatan
                ELSE 0
            END
        ) AS jumlah_kesling,

        -- Menghitung tenaga gizi
        SUM(
            CASE
                WHEN jenis_tenaga_kesehatan =
                'tenaga gizi'
                THEN jumlah_tenaga_kesehatan
                ELSE 0
            END
        ) AS jumlah_gizi

    FROM jumlah_tenaga_kesehatan_masyarakat_di_puskesmas

    -- Hanya mengambil data total
    -- agar tidak terjadi double counting
    WHERE jenis_kelamin = 'laki-laki + perempuan'

    GROUP BY
        kemendagri_kode_kabupatenkota
)



-- ============================================================
-- CTE 3
-- Mengambil jumlah Puskesmas
-- pada setiap Kabupaten/Kota
-- ============================================================

, ringkasan_puskesmas AS (

    SELECT

        -- Mengambil kode Kabupaten/Kota
        -- (nama kolom berbeda dengan dataset lain)
        kemendagri_kode_kabupaten_kota,

        -- Mengambil jumlah Puskesmas
        jumlah_puskesmas

    FROM jumlah_puskesmas_menurut_kabupaten_kota
)



-- ============================================================
-- QUERY UTAMA
-- Menggabungkan seluruh hasil CTE
-- lalu menghitung rasio tenaga kesehatan
-- per Puskesmas.
-- ============================================================

SELECT

    -- Menampilkan nama Kabupaten/Kota
    pb.kemendagri_nama_kabupatenkota
    AS kabupaten_kota,

    -- Menampilkan jumlah Puskesmas
    p.jumlah_puskesmas
    AS jumlah_puskesmas_2024,

    -- Menghitung total seluruh tenaga kesehatan
    (
        COALESCE(pb.total_perawat_bidan,0)
        +
        COALESCE(kg.total_kesmas_gizi,0)
    )
    AS total_seluruh_nakes,

    -- Menghitung rasio tenaga kesehatan
    -- per satu Puskesmas
    ROUND(

        (
            COALESCE(pb.total_perawat_bidan,0)
            +
            COALESCE(kg.total_kesmas_gizi,0)
        )::numeric

        /

        -- NULLIF digunakan untuk menghindari
        -- pembagian dengan angka 0
        NULLIF(p.jumlah_puskesmas,0),

        -- Menampilkan dua angka di belakang koma
        2

    ) AS rasio_nakes_per_puskesmas,

    -- Menampilkan rincian setiap jenis tenaga kesehatan
    pb.jumlah_perawat,
    pb.jumlah_bidan,
    kg.jumlah_kesmas,
    kg.jumlah_kesling,
    kg.jumlah_gizi

-- Menggunakan hasil CTE pertama
FROM ringkasan_perawat_bidan pb

-- Menggabungkan data Kesmas, Kesling dan Gizi
LEFT JOIN ringkasan_kesmas_gizi kg

ON pb.kemendagri_kode_kabupatenkota =
   kg.kemendagri_kode_kabupatenkota

-- Menggabungkan data jumlah Puskesmas
LEFT JOIN ringkasan_puskesmas p

-- Perbedaan nama kolom disesuaikan
ON pb.kemendagri_kode_kabupatenkota =
   p.kemendagri_kode_kabupaten_kota

-- Mengurutkan hasil dari rasio terkecil
-- ke rasio terbesar
ORDER BY
rasio_nakes_per_puskesmas ASC;