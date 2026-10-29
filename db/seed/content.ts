/**
 * Konten pembelajaran demo: 3 misi Matematika dan 3 misi untuk tiap tingkat 4-6
 * pada IPAS, Bahasa Indonesia, dan Bahasa Inggris.
 *
 * Setiap soal punya `verification.expression` (aritmetika yang ditulis terpisah
 * dari jawaban) yang diuji di tests/content.test.ts dengan aritmetika rasional
 * eksak. Jadi jawaban tidak bisa "salah hitung" tanpa membuat test gagal.
 */

import type { TopicKey } from "../../src/lib/topics";
import { additionalMissions } from "./curriculum-content";

export type SeedQuestionType = "multiple_choice" | "numeric";

export type SeedQuestion = {
  type: SeedQuestionType;
  prompt: string;
  options?: string[];
  answer: string;
  unitLabel?: string;
  explanation: string;
  hint: string;
  difficulty: "mudah" | "sedang" | "tantangan";
  verification?: { expression: string };
};

export type SeedMission = {
  slug: string;
  title: string;
  description: string;
  story: string;
  learningObjectives: string[];
  orderIndex: number;
  /** public = belajar mandiri setingkat; class_only = anggota kelas dengan kurikulum yang cocok. */
  audience: "public" | "class_only";
  /** Tingkat kelas SD yang menjadi sasaran konten ini. */
  gradeLevel: number;
  /** Slug dari tabel referensi `subjects`. */
  subject: string;
  /** Slug dari tabel referensi `mission_topics`. */
  topic: string;
  /** Topik tiap soal, sejajar dengan `questions` (slot 1..n). */
  questionTopics: TopicKey[];
  questions: SeedQuestion[];
};

/** Soal varian untuk satu slot: dipilih acak saat siswa memulai percobaan baru. */
export type SeedVariant = SeedQuestion & {
  slot: number;
  topic: TopicKey;
};

const originalMissions: SeedMission[] = [
  {
    slug: "pasar-pintar",
    title: "Pasar Pintar",
    description:
      "Bantu Rani berbelanja di pasar dengan uang pas-pasan. Hitung harga, kembalian, dan diskon supaya semua kebutuhan dapur terbeli.",
    story:
      "Pagi ini Pasar Cempaka ramai sekali. Rani ditugaskan ibunya berbelanja dengan daftar belanja dan uang yang sudah dihitung matang. Tapi ada satu masalah: kalau Rani salah menghitung, uangnya bisa tidak cukup. Bantu Rani menghitung total belanja, uang kembalian, dan harga setelah diskon di setiap lapak.",
    learningObjectives: [
      "Menjumlahkan dan mengurangkan bilangan bulat dalam konteks uang",
      "Menghitung total belanja dan uang kembalian",
      "Mengalikan harga satuan dengan berat atau jumlah barang",
      "Menghitung harga setelah diskon persen sederhana",
    ],
    orderIndex: 1,
    audience: "public",
    gradeLevel: 5,
    subject: "matematika",
    topic: "uang-belanja",
    questionTopics: [
      "penjumlahan-pengurangan",
      "perkalian-pembagian",
      "penjumlahan-pengurangan",
      "desimal",
      "persen-diskon",
      "persen-diskon",
      "desimal",
      "penjumlahan-pengurangan",
      "perkalian-pembagian",
      "penjumlahan-pengurangan",
    ],
    questions: [
      {
        type: "numeric",
        prompt:
          "Rani membawa uang Rp50.000. Ia membeli buku tulis seharga Rp18.500 dan pensil seharga Rp6.000. Berapa rupiah uang Rani yang tersisa?",
        answer: "25500",
        unitLabel: "rupiah",
        difficulty: "mudah",
        hint: "Jumlahkan dulu semua harga barang, lalu kurangkan dari uang Rani.",
        explanation:
          "Total belanja = Rp18.500 + Rp6.000 = Rp24.500. Sisa uang = Rp50.000 - Rp24.500 = Rp25.500.",
        verification: { expression: "50000 - 18500 - 6000" },
      },
      {
        type: "numeric",
        prompt:
          "Ibu membeli 3 buku gambar masing-masing Rp4.500 dan 2 penghapus masing-masing Rp2.000. Berapa rupiah total yang harus dibayar?",
        answer: "17500",
        unitLabel: "rupiah",
        difficulty: "mudah",
        hint: "Hitung harga buku seluruhnya dan harga penghapus seluruhnya, lalu jumlahkan.",
        explanation:
          "Buku gambar = 3 x Rp4.500 = Rp13.500. Penghapus = 2 x Rp2.000 = Rp4.000. Total = Rp13.500 + Rp4.000 = Rp17.500.",
        verification: { expression: "3 * 4500 + 2 * 2000" },
      },
      {
        type: "multiple_choice",
        prompt:
          "Rani membayar belanjaan Rp13.750 dengan selembar uang Rp20.000. Berapa uang kembalian yang ia terima?",
        options: ["Rp6.250", "Rp5.250", "Rp7.250", "Rp6.750"],
        answer: "Rp6.250",
        difficulty: "mudah",
        hint: "Kembalian = uang yang dibayar dikurangi harga belanja.",
        explanation:
          "Kembalian = Rp20.000 - Rp13.750 = Rp6.250. Cara cepat: Rp20.000 - Rp13.000 = Rp7.000, lalu kurangi Rp750 menjadi Rp6.250.",
        verification: { expression: "20000 - 13750" },
      },
      {
        type: "numeric",
        prompt:
          "Rani membeli 2,5 kg apel dengan harga Rp12.000 per kg. Berapa rupiah yang harus ia bayar?",
        answer: "30000",
        unitLabel: "rupiah",
        difficulty: "sedang",
        hint: "Kalikan harga per kg dengan berat apel yang dibeli.",
        explanation:
          "Harga = 2,5 x Rp12.000. Bisa dipecah: 2 x Rp12.000 = Rp24.000 dan 0,5 x Rp12.000 = Rp6.000. Totalnya Rp30.000.",
        verification: { expression: "2.5 * 12000" },
      },
      {
        type: "multiple_choice",
        prompt:
          "Di lapak sepatu ada diskon 10% untuk semua barang. Sepatu yang Rani lihat harganya Rp40.000. Berapa besar potongannya?",
        options: ["Rp3.000", "Rp5.000", "Rp4.000", "Rp6.000"],
        answer: "Rp4.000",
        difficulty: "sedang",
        hint: "10% sama dengan sepersepuluh. Bagilah harga dengan 10.",
        explanation:
          "Diskon 10% = 10/100 x Rp40.000 = Rp4.000. Harga yang dibayar menjadi Rp40.000 - Rp4.000 = Rp36.000.",
        verification: { expression: "10 / 100 * 40000" },
      },
      {
        type: "numeric",
        prompt:
          "Sebuah tas harganya Rp25.000 dan mendapat diskon 20%. Berapa rupiah yang harus dibayar setelah diskon?",
        answer: "20000",
        unitLabel: "rupiah",
        difficulty: "sedang",
        hint: "Hitung dulu potongannya (20% dari Rp25.000), lalu kurangkan dari harga awal.",
        explanation:
          "Diskon = 20/100 x Rp25.000 = Rp5.000. Harga bayar = Rp25.000 - Rp5.000 = Rp20.000. Cara lain: membayar 80% x Rp25.000 = Rp20.000.",
        verification: { expression: "25000 - (20 / 100 * 25000)" },
      },
      {
        type: "multiple_choice",
        prompt:
          "Rani menimbang 0,75 kg gula dan 0,5 kg tepung. Berapa berat keduanya jika digabung?",
        options: ["1,15 kg", "1,30 kg", "1,50 kg", "1,25 kg"],
        answer: "1,25 kg",
        difficulty: "sedang",
        hint: "Jumlahkan bagian bulat dan bagian desimalnya dengan rapi.",
        explanation:
          "0,75 + 0,50 = 1,25. Jadi berat seluruhnya 1,25 kg. Perhatikan bahwa 0,5 sama dengan 0,50.",
        verification: { expression: "0.75 + 0.5" },
      },
      {
        type: "numeric",
        prompt:
          "Rani berbelanja total Rp64.300 dan membayar dengan uang Rp100.000. Berapa rupiah kembaliannya?",
        answer: "35700",
        unitLabel: "rupiah",
        difficulty: "sedang",
        hint: "Kurangkan Rp64.300 dari Rp100.000. Bisa dibantu dengan membulatkan ke Rp65.000 lebih dulu.",
        explanation:
          "Kembalian = Rp100.000 - Rp64.300 = Rp35.700. Cara cepat: Rp100.000 - Rp65.000 = Rp35.000, lalu tambah Rp700 karena Rp65.000 lebih besar Rp700 dari harga asli.",
        verification: { expression: "100000 - 64300" },
      },
      {
        type: "numeric",
        prompt:
          "Di lapak buah, 4 apel dijual dengan harga paket Rp11.600. Berapa rupiah harga satu apel?",
        answer: "2900",
        unitLabel: "rupiah",
        difficulty: "tantangan",
        hint: "Bagi harga paket dengan banyaknya apel di dalamnya.",
        explanation:
          "Harga satu apel = Rp11.600 : 4 = Rp2.900. Bandingkan dengan paket lain: Rp9.000 : 3 = Rp3.000, jadi paket ini lebih murah per buah.",
        verification: { expression: "11600 / 4" },
      },
      {
        type: "numeric",
        prompt:
          "Total belanja Rani Rp47.500. Ia membayar dengan 2 lembar uang Rp20.000 dan 1 lembar uang Rp10.000. Berapa rupiah kembaliannya?",
        answer: "2500",
        unitLabel: "rupiah",
        difficulty: "tantangan",
        hint: "Hitung dulu jumlah uang yang diberikan Rani, baru kurangkan total belanja.",
        explanation:
          "Uang yang dibayar = (2 x Rp20.000) + Rp10.000 = Rp50.000. Kembalian = Rp50.000 - Rp47.500 = Rp2.500.",
        verification: { expression: "2 * 20000 + 10000 - 47500" },
      },
    ],
  },
  {
    slug: "koki-pecahan",
    title: "Koki Pecahan",
    description:
      "Bantu Chef Nara menyiapkan pesanan dengan takaran pecahan. Salah takaran sedikit, kue bisa gagal!",
    story:
      "Dapur Kue Pelangi menerima banyak pesanan untuk pesta sekolah. Chef Nara sedang sibuk dan meminta bantuanmu membaca resep. Resepnya memakai pecahan: setengah sendok, tiga per empat gelas, seperempat kilogram. Bantu Chef Nara mengubah takaran itu menjadi jumlah yang tepat agar semua pesanan selesai.",
    learningObjectives: [
      "Membaca dan membandingkan pecahan sederhana",
      "Menjumlahkan dan mengurangkan pecahan berpenyebut berbeda",
      "Mengubah pecahan menjadi satuan berat (gram dan kilogram)",
      "Menghubungkan pecahan dengan takaran resep sehari-hari",
    ],
    orderIndex: 2,
    audience: "public",
    gradeLevel: 5,
    subject: "matematika",
    topic: "pecahan",
    questionTopics: [
      "pecahan-operasi",
      "pecahan-banding",
      "pecahan-satuan",
      "pecahan-operasi",
      "pecahan-operasi",
      "pecahan-banding",
      "pecahan-satuan",
      "pecahan-operasi",
      "desimal",
      "pecahan-operasi",
    ],
    questions: [
      {
        type: "multiple_choice",
        prompt:
          "Resep bolu membutuhkan 1/2 gelas susu untuk adonan dan 1/4 gelas susu untuk lapisan atas. Berapa gelas susu seluruhnya?",
        options: ["2/6 gelas", "1/6 gelas", "3/4 gelas", "1/2 gelas"],
        answer: "3/4 gelas",
        difficulty: "mudah",
        hint: "Samakan penyebutnya dulu. 1/2 sama dengan 2/4.",
        explanation:
          "1/2 = 2/4. Jadi 2/4 + 1/4 = 3/4 gelas. Penyebut tetap 4 karena satuannya sudah sama.",
        verification: { expression: "1/2 + 1/4" },
      },
      {
        type: "multiple_choice",
        prompt:
          "Chef Nara ingin memakai takaran terbanyak. Mana yang lebih besar, 2/3 atau 3/5?",
        options: ["2/3", "3/5", "Sama besar", "Tidak bisa dibandingkan"],
        answer: "2/3",
        difficulty: "mudah",
        hint: "Samakan penyebut menjadi 15, lalu bandingkan pembilangnya.",
        explanation:
          "2/3 = 10/15 dan 3/5 = 9/15. Karena 10/15 lebih besar dari 9/15, maka 2/3 lebih besar. Dalam bentuk desimal: 0,667 lebih besar dari 0,6.",
        verification: { expression: "2/3" },
      },
      {
        type: "numeric",
        prompt:
          "Resep membutuhkan 3/4 kg tepung. Berapa gram tepung yang harus ditimbang? (1 kg = 1.000 gram)",
        answer: "750",
        unitLabel: "gram",
        difficulty: "mudah",
        hint: "Bagi 1.000 gram menjadi 4 bagian sama besar, lalu ambil 3 bagian.",
        explanation:
          "1.000 gram : 4 = 250 gram untuk setiap seperempat. Tiga bagian = 3 x 250 = 750 gram.",
        verification: { expression: "3/4 * 1000" },
      },
      {
        type: "multiple_choice",
        prompt:
          "Chef Nara punya 1 gelas mentega dan sudah memakai 3/8 gelas. Berapa gelas mentega yang tersisa?",
        options: ["3/8 gelas", "4/8 gelas", "5/8 gelas", "6/8 gelas"],
        answer: "5/8 gelas",
        difficulty: "sedang",
        hint: "Tulis 1 sebagai 8/8 supaya penyebutnya sama dengan 3/8.",
        explanation:
          "1 = 8/8. Sisa = 8/8 - 3/8 = 5/8 gelas. Pembilang dikurangi, penyebut tetap.",
        verification: { expression: "1 - 3/8" },
      },
      {
        type: "numeric",
        prompt:
          "Satu porsi puding membutuhkan 1/2 liter susu. Berapa liter susu untuk 3 porsi? (tulis dalam liter)",
        answer: "1.5",
        unitLabel: "liter",
        difficulty: "sedang",
        hint: "Kalikan takaran satu porsi dengan jumlah porsi.",
        explanation:
          "3 x 1/2 = 3/2 = 1,5 liter. Bisa juga dihitung: setengah + setengah + setengah = 1,5.",
        verification: { expression: "1/2 * 3" },
      },
      {
        type: "multiple_choice",
        prompt:
          "Chef Nara perlu menambahkan sedikit gula, yaitu pecahan yang nilainya kurang dari 1/2. Mana yang tepat?",
        options: ["4/6", "3/5", "5/8", "2/5"],
        answer: "2/5",
        difficulty: "sedang",
        hint: "Ubah setiap pecahan menjadi desimal, lalu cari yang kurang dari 0,5.",
        explanation:
          "2/5 = 0,4; 3/5 = 0,6; 4/6 = 0,667; 5/8 = 0,625. Hanya 2/5 yang nilainya kurang dari 0,5.",
        verification: { expression: "2/5" },
      },
      {
        type: "numeric",
        prompt: "Resep memakai 0,25 kg mentega. Berapa gram mentega itu?",
        answer: "250",
        unitLabel: "gram",
        difficulty: "mudah",
        hint: "0,25 sama dengan seperempat. Bagilah 1.000 gram menjadi 4 bagian.",
        explanation: "0,25 kg = 0,25 x 1.000 gram = 250 gram. Ingat, 0,25 = 1/4.",
        verification: { expression: "0.25 * 1000" },
      },
      {
        type: "multiple_choice",
        prompt:
          "Untuk lapisan kue, Chef Nara mencampur 3/4 gelas krim dan 1/8 gelas cokelat cair. Berapa gelas campuran itu?",
        options: ["4/12 gelas", "1/2 gelas", "6/8 gelas", "7/8 gelas"],
        answer: "7/8 gelas",
        difficulty: "tantangan",
        hint: "Ubah 3/4 menjadi per delapan: 3/4 = 6/8.",
        explanation:
          "3/4 = 6/8. Jadi 6/8 + 1/8 = 7/8 gelas. Penyebut disamakan dulu sebelum pembilang dijumlahkan.",
        verification: { expression: "3/4 + 1/8" },
      },
      {
        type: "numeric",
        prompt:
          "Chef Nara punya 2,5 kg gula. Sebanyak 0,75 kg sudah dipakai untuk pesanan pertama. Berapa kg gula yang tersisa?",
        answer: "1.75",
        unitLabel: "kilogram",
        difficulty: "tantangan",
        hint: "Susun pengurangan bersusun dengan tanda koma sejajar.",
        explanation:
          "2,50 - 0,75 = 1,75. Karena 0,50 tidak cukup dikurangi 0,75, pinjam 1 kg (menjadi 1,50) sehingga 1,50 - 0,75 = 0,75, ditambah 1 kg sisa = 1,75 kg.",
        verification: { expression: "2.5 - 0.75" },
      },
      {
        type: "multiple_choice",
        prompt:
          "Chef Nara memakai 1/3 dari 12 butir telur untuk satu loyang kue. Berapa butir telur yang dipakai?",
        options: ["3 butir", "4 butir", "6 butir", "8 butir"],
        answer: "4 butir",
        difficulty: "mudah",
        hint: "Bagi 12 menjadi 3 kelompok sama banyak, lalu ambil satu kelompok.",
        explanation:
          "1/3 dari 12 berarti 12 : 3 = 4. Jadi 4 butir telur dipakai untuk satu loyang.",
        verification: { expression: "12 / 3" },
      },
    ],
  },
  {
    slug: "arsitek-mini",
    title: "Arsitek Mini",
    description:
      "Rancang taman sekolah bersama Pak Bima. Hitung keliling pagar, luas rumput, dan volume kolam.",
    story:
      "Sekolahmu mendapat hadiah tanah kosong di belakang gedung. Pak Bima, arsitek sekolah, meminta kelasmu merancang taman di atasnya. Sebelum mulai membangun, semua ukuran harus dihitung: panjang pagar, luas rumput, dan volume kolam. Bantu Pak Bima menghitung agar bahan bangunan tidak terbuang.",
    learningObjectives: [
      "Menghitung keliling persegi dan persegi panjang",
      "Menghitung luas persegi dan persegi panjang",
      "Menghitung volume kubus dan balok",
      "Memilih satuan panjang, luas, dan volume yang tepat",
    ],
    orderIndex: 3,
    audience: "public",
    gradeLevel: 5,
    subject: "matematika",
    topic: "geometri-dasar",
    questionTopics: ["keliling", "luas", "keliling", "volume", "luas", "keliling", "satuan", "keliling", "volume", "luas"],
    questions: [
      {
        type: "numeric",
        prompt:
          "Taman berbentuk persegi panjang dengan panjang 8 m dan lebar 5 m. Berapa meter keliling taman itu?",
        answer: "26",
        unitLabel: "meter",
        difficulty: "mudah",
        hint: "Keliling persegi panjang = 2 x (panjang + lebar).",
        explanation:
          "Keliling = 2 x (8 + 5) = 2 x 13 = 26 m. Artinya pagar yang dibutuhkan sepanjang 26 m.",
        verification: { expression: "2 * (8 + 5)" },
      },
      {
        type: "numeric",
        prompt: "Sebuah taman berbentuk persegi dengan sisi 7 m. Berapa meter persegi luasnya?",
        answer: "49",
        unitLabel: "meter persegi",
        difficulty: "mudah",
        hint: "Luas persegi = sisi x sisi.",
        explanation: "Luas = 7 x 7 = 49 m². Satuan luas selalu memakai meter persegi (m²).",
        verification: { expression: "7 * 7" },
      },
      {
        type: "multiple_choice",
        prompt: "Kolam berbentuk persegi dengan sisi 6 m akan dipasangi batu di sekelilingnya. Berapa meter panjang batu yang dibutuhkan?",
        options: ["12 m", "24 m", "36 m", "6 m"],
        answer: "24 m",
        difficulty: "mudah",
        hint: "Persegi punya 4 sisi yang panjangnya sama.",
        explanation:
          "Keliling persegi = 4 x sisi = 4 x 6 = 24 m. Angka 36 m adalah luasnya, bukan kelilingnya.",
        verification: { expression: "4 * 6" },
      },
      {
        type: "numeric",
        prompt:
          "Bak air berbentuk balok dengan panjang 4 m, lebar 3 m, dan tinggi 2 m. Berapa meter kubik volumenya?",
        answer: "24",
        unitLabel: "meter kubik",
        difficulty: "sedang",
        hint: "Volume balok = panjang x lebar x tinggi.",
        explanation: "Volume = 4 x 3 x 2 = 24 m³. Satuannya meter kubik karena mengukur ruang.",
        verification: { expression: "4 * 3 * 2" },
      },
      {
        type: "multiple_choice",
        prompt: "Area rumput berbentuk persegi panjang berukuran 9 m x 6 m. Berapa luas area rumput itu?",
        options: ["15 m²", "54 m²", "30 m²", "108 m²"],
        answer: "54 m²",
        difficulty: "sedang",
        hint: "Luas persegi panjang = panjang x lebar. Jangan menjumlahkan panjang dan lebar.",
        explanation: "Luas = 9 x 6 = 54 m². Angka 15 m adalah kelilingnya bila rumus keliling dipakai salah.",
        verification: { expression: "9 * 6" },
      },
      {
        type: "numeric",
        prompt: "Papan pengumuman berbentuk persegi dengan sisi 12 cm. Berapa cm kelilingnya?",
        answer: "48",
        unitLabel: "sentimeter",
        difficulty: "sedang",
        hint: "Kalikan panjang sisi dengan 4.",
        explanation: "Keliling = 4 x 12 = 48 cm.",
        verification: { expression: "4 * 12" },
      },
      {
        type: "multiple_choice",
        prompt: "Pak Bima mengukur luas lantai kelas. Satuan apa yang paling tepat dipakai?",
        options: ["meter", "meter kubik (m³)", "meter persegi (m²)", "liter"],
        answer: "meter persegi (m²)",
        difficulty: "mudah",
        hint: "Luas adalah besar daerah yang tertutup, bukan panjang garis atau isi ruang.",
        explanation:
          "Luas memakai satuan meter persegi (m²) karena mengukur daerah dua dimensi. Meter untuk panjang, meter kubik untuk volume, dan liter untuk isi cairan.",
      },
      {
        type: "numeric",
        prompt:
          "Taman berukuran panjang 10 m dan lebar 6 m akan dipagari kelilingnya. Berapa meter pagar yang dibutuhkan?",
        answer: "32",
        unitLabel: "meter",
        difficulty: "sedang",
        hint: "Tambahkan panjang dan lebar, lalu kalikan dua.",
        explanation: "Keliling = 2 x (10 + 6) = 2 x 16 = 32 m.",
        verification: { expression: "2 * (10 + 6)" },
      },
      {
        type: "multiple_choice",
        prompt: "Kotak tanaman berbentuk kubus dengan rusuk 5 cm. Berapa volume kotak itu?",
        options: ["125 cm³", "25 cm³", "75 cm³", "150 cm³"],
        answer: "125 cm³",
        difficulty: "tantangan",
        hint: "Volume kubus = rusuk x rusuk x rusuk.",
        explanation: "Volume = 5 x 5 x 5 = 125 cm³. Hati-hati, 25 cm² adalah luas salah satu sisinya.",
        verification: { expression: "5 * 5 * 5" },
      },
      {
        type: "numeric",
        prompt:
          "Lantai berukuran 4 m x 3 m akan ditutup keramik berukuran 1 m² per kotak. Berapa kotak keramik yang dibutuhkan?",
        answer: "12",
        unitLabel: "kotak",
        difficulty: "tantangan",
        hint: "Hitung luas lantai lebih dulu, lalu bagi dengan luas satu kotak keramik.",
        explanation:
          "Luas lantai = 4 x 3 = 12 m². Karena satu kotak keramik menutup 1 m², dibutuhkan 12 kotak.",
        verification: { expression: "(4 * 3) / 1" },
      },
    ],
  },
  {
    slug: "detektif-makhluk-hidup",
    title: "Detektif Makhluk Hidup",
    description:
      "Jadi detektif alam bersama Bima: amati tumbuhan, hewan, dan perubahan wujud benda di sekitar sekolah.",
    story:
      "Kebun sekolah punya masalah: beberapa tanaman layu, ulat banyak memakan daun, dan es di kantin cepat mencair. Bima, detektif cilik kelas 5, diminta menyelidiki. Setiap jawaban benar membuka satu petunjuk, dan petunjuk itu menjelaskan cara makhluk hidup bertahan serta bagaimana benda berubah wujud.",
    learningObjectives: [
      "Menjelaskan proses fotosintesis dan kebutuhan tumbuhan",
      "Mengurutkan rantai makanan serta memperkirakan perubahan populasi",
      "Membedakan ciri makhluk hidup dengan benda tak hidup",
      "Mengenali perubahan wujud zat dan penyebabnya",
    ],
    orderIndex: 1,
    audience: "class_only",
    gradeLevel: 5,
    subject: "ipa",
    topic: "makhluk-hidup",
    questionTopics: [
      "makhluk-hidup",
      "makhluk-hidup",
      "makhluk-hidup",
      "makhluk-hidup",
      "makhluk-hidup",
      "makhluk-hidup",
      "makhluk-hidup",
      "wujud-zat",
      "wujud-zat",
      "wujud-zat",
    ],
    questions: [
      {
        type: "multiple_choice",
        prompt:
          "Tumbuhan membuat makanan sendiri melalui fotosintesis. Apa dua hasil utama fotosintesis yang dimanfaatkan makhluk lain?",
        options: [
          "Karbon dioksida dan air",
          "Oksigen dan glukosa",
          "Nitrogen dan protein",
          "Garam mineral dan uap air",
        ],
        answer: "Oksigen dan glukosa",
        difficulty: "mudah",
        hint: "Tumbuhan menghasilkan gas yang kita hirup dan zat gula sebagai cadangan makanan.",
        explanation:
          "Fotosintesis memakai air dan karbon dioksida dengan bantuan cahaya matahari. Hasilnya oksigen yang dilepas ke udara dan glukosa sebagai makanan tumbuhan.",
      },
      {
        type: "multiple_choice",
        prompt: "Bagian tumbuhan yang paling banyak menyerap air dan garam mineral dari dalam tanah adalah ...",
        options: ["Daun", "Bunga", "Akar", "Buah"],
        answer: "Akar",
        difficulty: "mudah",
        hint: "Bagian ini tertanam di tanah dan bercabang halus.",
        explanation:
          "Akar memiliki rambut-rambut akar yang memperluas permukaan penyerapan. Air lalu diangkut ke daun melalui pembuluh xilem.",
      },
      {
        type: "multiple_choice",
        prompt: "Hewan yang makanan utamanya tumbuhan disebut ...",
        options: ["Herbivora", "Karnivora", "Omnivora", "Insektivora"],
        answer: "Herbivora",
        difficulty: "mudah",
        hint: "Kata 'herba' berkaitan dengan tumbuhan.",
        explanation:
          "Herbivora seperti sapi dan ulat memakan tumbuhan. Karnivora pemakan daging, omnivora pemakan keduanya, dan insektivora pemakan serangga.",
      },
      {
        type: "multiple_choice",
        prompt:
          "Di sawah terdapat rantai makanan: padi -> tikus -> ular. Jika banyak ular ditangkap, apa yang paling mungkin terjadi?",
        options: [
          "Populasi padi bertambah karena tikus berkurang",
          "Populasi ular bertambah karena makanan melimpah",
          "Semua populasi tetap karena rantai makanan berhenti",
          "Populasi tikus bertambah karena tidak ada pemangsa",
        ],
        answer: "Populasi tikus bertambah karena tidak ada pemangsa",
        difficulty: "sedang",
        hint: "Ular berperan sebagai pemangsa tikus.",
        explanation:
          "Tanpa ular, tikus kehilangan pemangsa alami sehingga jumlahnya naik. Akibat lanjutannya, padi bisa banyak dimakan tikus.",
      },
      {
        type: "multiple_choice",
        prompt: "Ulat berubah menjadi kepompong, lalu menjadi kupu-kupu. Proses ini disebut ...",
        options: [
          "Metamorfosis tidak sempurna",
          "Perkembangbiakan vegetatif",
          "Metamorfosis sempurna",
          "Penyerbukan silang",
        ],
        answer: "Metamorfosis sempurna",
        difficulty: "sedang",
        hint: "Bentuk hewan muda berbeda jauh dari bentuk dewasanya dan ada tahap kepompong.",
        explanation:
          "Metamorfosis sempurna punya empat tahap: telur, larva (ulat), pupa (kepompong), dan imago (kupu-kupu). Belalang hanya melalui tiga tahap.",
      },
      {
        type: "multiple_choice",
        prompt: "Manakah yang merupakan ciri makhluk hidup tetapi tidak dimiliki benda mati?",
        options: [
          "Tumbuh dan berkembang",
          "Memiliki massa",
          "Menempati ruang",
          "Berubah suhu saat dipanaskan",
        ],
        answer: "Tumbuh dan berkembang",
        difficulty: "mudah",
        hint: "Batu juga punya massa dan ruang, tetapi tidak bertambah besar dengan sendirinya.",
        explanation:
          "Tumbuh, bernapas, dan berkembang biak adalah ciri makhluk hidup. Massa, ruang, dan perubahan suhu juga berlaku pada benda mati.",
      },
      {
        type: "numeric",
        prompt:
          "Pada rantai makanan: rumput -> belalang -> katak -> ular, produsen berada di tingkat 1. Di tingkat berapa ular berada?",
        answer: "4",
        unitLabel: "tingkat",
        difficulty: "sedang",
        hint: "Hitung berurutan: rumput tingkat 1, belalang tingkat 2, dan seterusnya.",
        explanation:
          "Rumput tingkat 1, belalang tingkat 2, katak tingkat 3, dan ular tingkat 4. Semakin tinggi tingkatnya, energi yang tersedia semakin sedikit.",
        verification: { expression: "1 + 3" },
      },
      {
        type: "multiple_choice",
        prompt: "Air di dalam cetakan berubah menjadi es setelah dimasukkan ke freezer. Perubahan wujud ini terjadi karena ...",
        options: [
          "Air dipanaskan hingga menguap",
          "Air didinginkan hingga membeku",
          "Air menyerap panas dari udara",
          "Air bereaksi dengan logam cetakan",
        ],
        answer: "Air didinginkan hingga membeku",
        difficulty: "mudah",
        hint: "Freezer mengeluarkan panas dari air.",
        explanation:
          "Membeku adalah perubahan cair menjadi padat karena suhu turun. Kebalikannya, mencair terjadi saat es menerima panas.",
      },
      {
        type: "multiple_choice",
        prompt: "Titik-titik air di luar gelas es terbentuk karena uap air di udara berubah menjadi cair. Perubahan wujud ini disebut ...",
        options: ["Menyublim", "Membeku", "Mencair", "Mengembun"],
        answer: "Mengembun",
        difficulty: "sedang",
        hint: "Uap air (gas) berubah menjadi titik air (cair).",
        explanation:
          "Mengembun adalah perubahan gas menjadi cair, seperti titik air di gelas dingin. Menyublim adalah padat menjadi gas, misalnya kamper yang mengecil.",
      },
      {
        type: "multiple_choice",
        prompt: "Kaktus dapat hidup di daerah panas dan kering karena ...",
        options: [
          "Daunnya berbentuk duri untuk mengurangi penguapan",
          "Akarnya pendek agar tidak menyerap air",
          "Batangnya berongga besar berisi udara",
          "Daunnya lebar untuk menampung hujan",
        ],
        answer: "Daunnya berbentuk duri untuk mengurangi penguapan",
        difficulty: "tantangan",
        hint: "Semakin kecil permukaan daun, semakin sedikit air yang hilang.",
        explanation:
          "Daun berbentuk duri memperkecil penguapan, sedangkan batang tebal menyimpan air. Akar kaktus justru panjang dan menyebar untuk menangkap air hujan.",
      },
    ],
  },
  {
    slug: "my-daily-words",
    title: "My Daily Words",
    description:
      "Latihan kosakata bahasa Inggris sehari-hari: benda di sekolah, sapaan, warna, angka, dan kalimat sederhana.",
    story:
      "Kelas 5 kedatangan guru tamu dari Inggris. Ia menempelkan label bahasa Inggris di benda-benda kelas, lalu menantang murid menyebutkan kata yang tepat. Setiap kata yang benar membuat label baru terpasang, sampai seluruh kelas menjadi ruang belajar dua bahasa.",
    learningObjectives: [
      "Menyebutkan kosakata bahasa Inggris untuk benda di sekitar",
      "Menggunakan sapaan dan ungkapan sopan sederhana",
      "Mengenali angka dan warna dalam bahasa Inggris",
      "Menyusun kalimat sederhana dengan to be dan kata kerja dasar",
    ],
    orderIndex: 1,
    audience: "class_only",
    gradeLevel: 5,
    subject: "bahasa-inggris",
    topic: "kosa-kata-inggris",
    questionTopics: [
      "kosa-kata-inggris",
      "kosa-kata-inggris",
      "kosa-kata-inggris",
      "kosa-kata-inggris",
      "kosa-kata-inggris",
      "kosa-kata-inggris",
      "kosa-kata-inggris",
      "kosa-kata-inggris",
      "kosa-kata-inggris",
      "kosa-kata-inggris",
    ],
    questions: [
      {
        type: "multiple_choice",
        prompt: "Apa bahasa Inggris dari kata 'buku'?",
        options: ["Pencil", "Bag", "Book", "Table"],
        answer: "Book",
        difficulty: "mudah",
        hint: "Benda yang kamu baca setiap hari di kelas.",
        explanation: "'Book' berarti buku. 'Pencil' pensil, 'bag' tas, dan 'table' meja.",
      },
      {
        type: "multiple_choice",
        prompt: "Ucapan 'Selamat pagi' dalam bahasa Inggris adalah ...",
        options: ["Good night", "Good morning", "Good afternoon", "Good bye"],
        answer: "Good morning",
        difficulty: "mudah",
        hint: "Dipakai saat bertemu guru pada pagi hari.",
        explanation:
          "'Good morning' dipakai pagi hari, 'good afternoon' siang, 'good night' sebelum tidur, dan 'good bye' saat berpisah.",
      },
      {
        type: "multiple_choice",
        prompt: "Kata 'merah' dalam bahasa Inggris adalah ...",
        options: ["Blue", "Green", "Red", "Yellow"],
        answer: "Red",
        difficulty: "mudah",
        hint: "Warna bendera Indonesia salah satunya warna ini.",
        explanation: "'Red' merah, 'blue' biru, 'green' hijau, dan 'yellow' kuning.",
      },
      {
        type: "multiple_choice",
        prompt: "Kalimat 'I ___ a student' yang benar adalah ...",
        options: ["am", "is", "are", "be"],
        answer: "am",
        difficulty: "sedang",
        hint: "Kata 'I' selalu berpasangan dengan 'am'.",
        explanation:
          "To be untuk 'I' adalah 'am', untuk 'he/she/it' adalah 'is', dan untuk 'you/we/they' adalah 'are'.",
      },
      {
        type: "multiple_choice",
        prompt: "Apa bahasa Inggris dari 'sepatu'?",
        options: ["Socks", "Shirt", "Hat", "Shoes"],
        answer: "Shoes",
        difficulty: "mudah",
        hint: "Dipakai di kaki saat berangkat sekolah.",
        explanation: "'Shoes' sepatu, 'socks' kaus kaki, 'shirt' kemeja, dan 'hat' topi.",
      },
      {
        type: "multiple_choice",
        prompt: "Pertanyaan 'How many books do you have?' menanyakan tentang ...",
        options: ["Warna buku", "Harga buku", "Jumlah buku", "Pemilik buku"],
        answer: "Jumlah buku",
        difficulty: "sedang",
        hint: "'How many' dipakai untuk menanyakan banyaknya sesuatu.",
        explanation:
          "'How many' menanyakan jumlah benda yang bisa dihitung, misalnya 'How many books?'. Untuk warna dipakai 'what colour'.",
      },
      {
        type: "multiple_choice",
        prompt: "Angka setelah 'eleven' dalam bahasa Inggris adalah ...",
        options: ["Twelve", "Twenty", "Ten", "Thirteen"],
        answer: "Twelve",
        difficulty: "mudah",
        hint: "Sebelas, lalu dua belas.",
        explanation:
          "Urutannya ten, eleven, twelve, thirteen. 'Twenty' adalah dua puluh.",
      },
      {
        type: "multiple_choice",
        prompt: "Kalimat 'She ___ to school every day' yang benar adalah ...",
        options: ["go", "goes", "going", "gone"],
        answer: "goes",
        difficulty: "sedang",
        hint: "Subjek 'she' memakai bentuk kata kerja berakhiran -s.",
        explanation:
          "Untuk he, she, dan it, kata kerja simple present ditambah -s atau -es: 'she goes'. Untuk I dan they dipakai 'go'.",
      },
      {
        type: "multiple_choice",
        prompt: "Manakah kata bahasa Inggris yang termasuk buah?",
        options: ["Carrot", "Potato", "Onion", "Apple"],
        answer: "Apple",
        difficulty: "mudah",
        hint: "Biasanya berwarna merah atau hijau dan manis.",
        explanation:
          "'Apple' berarti apel dan termasuk buah. Carrot (wortel), potato (kentang), dan onion (bawang) adalah sayuran.",
      },
      {
        type: "multiple_choice",
        prompt: "Ungkapan 'Terima kasih' dalam bahasa Inggris adalah ...",
        options: ["Thank you", "I am sorry", "Excuse me", "See you"],
        answer: "Thank you",
        difficulty: "mudah",
        hint: "Diucapkan setelah menerima bantuan atau pemberian.",
        explanation:
          "'Thank you' berarti terima kasih. 'I am sorry' minta maaf, 'excuse me' permisi, dan 'see you' sampai jumpa.",
      },
    ],
  },
  {
    slug: "petualangan-membaca",
    title: "Petualangan Membaca",
    description:
      "Latihan memahami bacaan pendek, menemukan makna kata, memakai tanda baca, dan mengenali kata baku.",
    story:
      "Di perpustakaan sekolah ada buku harian tua yang halamannya saling bertukar. Untuk menyusunnya kembali, Sinta harus membaca setiap potongan cerita, menebak makna kata, dan memperbaiki tanda bacanya. Bantu Sinta membaca dengan teliti.",
    learningObjectives: [
      "Menemukan informasi tersurat dan tersirat dalam teks pendek",
      "Menentukan makna kata, sinonim, dan antonim dalam konteks",
      "Menggunakan tanda baca dan kata baku dengan tepat",
      "Mengenali jenis paragraf dan letak kalimat utama",
    ],
    orderIndex: 1,
    audience: "class_only",
    gradeLevel: 5,
    subject: "bahasa-indonesia",
    topic: "membaca-teks",
    questionTopics: [
      "membaca-teks",
      "membaca-teks",
      "membaca-teks",
      "membaca-teks",
      "membaca-teks",
      "membaca-teks",
      "membaca-teks",
      "membaca-teks",
      "membaca-teks",
      "membaca-teks",
    ],
    questions: [
      {
        type: "multiple_choice",
        prompt:
          "Bacalah: 'Hujan turun deras sejak pagi. Rani tetap berangkat sekolah dengan jas hujan.' Mengapa Rani tetap berangkat?",
        options: [
          "Karena ia lupa membawa payung",
          "Karena sekolah diliburkan",
          "Karena ia ingin tetap belajar meski hujan",
          "Karena hujan berhenti sebelum siang",
        ],
        answer: "Karena ia ingin tetap belajar meski hujan",
        difficulty: "mudah",
        hint: "Perhatikan sikap Rani terhadap sekolah, bukan cuacanya.",
        explanation:
          "Teks menyebut Rani tetap berangkat dengan jas hujan. Sikap itu menunjukkan ia tidak mau melewatkan sekolah karena hujan.",
      },
      {
        type: "multiple_choice",
        prompt: "Kata 'deras' pada kalimat 'Hujan turun deras sejak pagi' bermakna ...",
        options: ["Sangat pelan", "Sangat lebat", "Sangat dingin", "Sangat singkat"],
        answer: "Sangat lebat",
        difficulty: "mudah",
        hint: "Bayangkan air yang turun banyak dan cepat.",
        explanation:
          "'Deras' menggambarkan air yang turun banyak dan cepat, jadi maknanya sangat lebat, bukan pelan atau singkat.",
      },
      {
        type: "multiple_choice",
        prompt: "Kalimat yang menggunakan tanda baca dengan benar adalah ...",
        options: [
          "Ibu membeli apel jeruk, dan mangga.",
          "Ibu membeli apel, jeruk dan, mangga.",
          "Ibu membeli apel, jeruk, dan mangga.",
          "Ibu membeli apel jeruk dan, mangga.",
        ],
        answer: "Ibu membeli apel, jeruk, dan mangga.",
        difficulty: "sedang",
        hint: "Tanda koma memisahkan setiap unsur dalam perincian.",
        explanation:
          "Dalam perincian, koma diletakkan di antara unsur dan sebelum kata 'dan' pada unsur terakhir: apel, jeruk, dan mangga.",
      },
      {
        type: "multiple_choice",
        prompt: "Sinonim dari kata 'pandai' adalah ...",
        options: ["Cerdas", "Malas", "Ramah", "Berani"],
        answer: "Cerdas",
        difficulty: "mudah",
        hint: "Sinonim berarti kata yang maknanya hampir sama.",
        explanation:
          "'Pandai' dan 'cerdas' sama-sama berarti cepat memahami pelajaran. 'Malas', 'ramah', dan 'berani' maknanya berbeda.",
      },
      {
        type: "multiple_choice",
        prompt: "Antonim dari kata 'tinggi' adalah ...",
        options: ["Panjang", "Besar", "Luas", "Rendah"],
        answer: "Rendah",
        difficulty: "mudah",
        hint: "Antonim berarti lawan kata.",
        explanation:
          "Lawan kata 'tinggi' adalah 'rendah'. 'Panjang' lawannya pendek, 'besar' lawannya kecil.",
      },
      {
        type: "multiple_choice",
        prompt:
          "Bacalah: 'Ani rajin membaca. Ia selalu membawa buku ke mana pun pergi.' Sifat Ani berdasarkan teks adalah ...",
        options: ["Pemalas", "Pemarah", "Rajin", "Penakut"],
        answer: "Rajin",
        difficulty: "mudah",
        hint: "Teks menyebut kebiasaan Ani secara langsung.",
        explanation:
          "Teks menyatakan Ani rajin membaca dan selalu membawa buku. Bukti itu menunjukkan sifat rajin.",
      },
      {
        type: "multiple_choice",
        prompt: "Penulisan kata baku yang benar adalah ...",
        options: ["aktivitas", "aktifitas", "aktipitas", "aktifitet"],
        answer: "aktivitas",
        difficulty: "sedang",
        hint: "Kata baku mengikuti kaidah bahasa Indonesia, bukan ucapan sehari-hari.",
        explanation:
          "Bentuk baku menurut kamus adalah 'aktivitas'. Bentuk 'aktifitas' sering muncul dalam percakapan tetapi tidak baku.",
      },
      {
        type: "multiple_choice",
        prompt: "Paragraf yang berisi ajakan kepada pembaca disebut paragraf ...",
        options: ["Narasi", "Persuasi", "Deskripsi", "Eksposisi"],
        answer: "Persuasi",
        difficulty: "tantangan",
        hint: "Kata kuncinya 'ajakan' atau 'membujuk'.",
        explanation:
          "Paragraf persuasi bertujuan membujuk pembaca melakukan sesuatu. Narasi menceritakan, deskripsi menggambarkan, dan eksposisi memaparkan informasi.",
      },
      {
        type: "multiple_choice",
        prompt: "Lawan kata dari 'menang' adalah ...",
        options: ["Seri", "Berlomba", "Berhasil", "Kalah"],
        answer: "Kalah",
        difficulty: "mudah",
        hint: "Kebalikan hasil pertandingan.",
        explanation:
          "Lawan kata 'menang' adalah 'kalah'. 'Seri' berarti hasil imbang, bukan lawan kata.",
      },
      {
        type: "multiple_choice",
        prompt: "Dalam satu paragraf, kalimat utama umumnya terletak di ...",
        options: ["Awal paragraf", "Tengah paragraf", "Akhir paragraf", "Judul teks"],
        answer: "Awal paragraf",
        difficulty: "sedang",
        hint: "Kalimat ini memuat gagasan pokok yang dijelaskan kalimat lain.",
        explanation:
          "Kalimat utama paling sering berada di awal paragraf (deduktif), walau bisa juga di akhir. Kalimat lain berfungsi menjelaskan gagasan pokok tersebut.",
      },
    ],
  },
];

export const seedMissions: SeedMission[] = [...originalMissions, ...additionalMissions];

/**
 * Bank soal varian. Setiap entri mengisi slot yang sama dengan soal utama,
 * sehingga siswa bisa mendapat angka/konteks berbeda pada percobaan berikutnya
 * tanpa menambah jumlah soal per percobaan.
 */
export const seedVariants: Record<string, SeedVariant[]> = {
  "pasar-pintar": [
    {
      slot: 3,
      topic: "penjumlahan-pengurangan",
      type: "multiple_choice",
      prompt:
        "Rani membayar belanjaan Rp18.400 dengan selembar uang Rp25.000. Berapa uang kembalian yang ia terima?",
      options: ["Rp6.400", "Rp7.600", "Rp6.600", "Rp7.400"],
      answer: "Rp6.600",
      difficulty: "mudah",
      hint: "Kembalian = uang dibayar - harga belanja.",
      explanation:
        "Kembalian = Rp25.000 - Rp18.400 = Rp6.600. Cara cepat: Rp25.000 - Rp18.000 = Rp7.000, lalu kurangi Rp400 menjadi Rp6.600.",
      verification: { expression: "25000 - 18400" },
    },
    {
      slot: 7,
      topic: "desimal",
      type: "numeric",
      prompt:
        "Rani membeli 1,25 kg jeruk dan 0,8 kg anggur. Berapa kilogram berat seluruh buah yang dibeli?",
      answer: "2.05",
      unitLabel: "kilogram",
      difficulty: "sedang",
      hint: "Tulis 0,8 sebagai 0,80 supaya jumlah angka di belakang koma sama.",
      explanation:
        "1,25 + 0,80 = 2,05. Menyejajarkan tanda koma membuat penjumlahan desimal lebih rapi.",
      verification: { expression: "1.25 + 0.8" },
    },
  ],
  "koki-pecahan": [
    {
      slot: 1,
      topic: "pecahan-operasi",
      type: "multiple_choice",
      prompt:
        "Chef Nara mencampur 1/4 gelas air dan 1/3 gelas sirup. Berapa gelas isi campuran itu?",
      options: ["2/7 gelas", "7/12 gelas", "5/12 gelas", "1/12 gelas"],
      answer: "7/12 gelas",
      difficulty: "sedang",
      hint: "Penyebut 4 dan 3 bisa disamakan menjadi 12.",
      explanation:
        "1/4 = 3/12 dan 1/3 = 4/12. Jumlahnya 3/12 + 4/12 = 7/12 gelas. Penyebut tidak dijumlahkan.",
      verification: { expression: "1/4 + 1/3" },
    },
    {
      slot: 9,
      topic: "desimal",
      type: "numeric",
      prompt:
        "Chef Nara punya 3,5 kg beras dan sudah memakai 1,25 kg. Berapa kilogram beras yang tersisa?",
      answer: "2.25",
      unitLabel: "kilogram",
      difficulty: "tantangan",
      hint: "Tulis 3,5 sebagai 3,50 lalu kurangkan bersusun.",
      explanation:
        "Kurangkan bagian desimal dulu: 0,50 - 0,25 = 0,25. Lalu bagian bulat: 3 - 1 = 2. Hasilnya 2,25 kg.",
      verification: { expression: "3.5 - 1.25" },
    },
  ],
  "arsitek-mini": [
    {
      slot: 2,
      topic: "luas",
      type: "numeric",
      prompt: "Kebun berbentuk persegi dengan sisi 9 m. Berapa meter persegi luas kebun itu?",
      answer: "81",
      unitLabel: "meter persegi",
      difficulty: "mudah",
      hint: "Luas persegi = sisi x sisi.",
      explanation: "Luas = 9 x 9 = 81 m². Kelilingnya berbeda: 4 x 9 = 36 m.",
      verification: { expression: "9 * 9" },
    },
    {
      slot: 4,
      topic: "volume",
      type: "numeric",
      prompt: "Kolam berbentuk balok dengan panjang 5 m, lebar 2 m, dan kedalaman 1,5 m. Berapa meter kubik volume kolam itu?",
      answer: "15",
      unitLabel: "meter kubik",
      difficulty: "tantangan",
      hint: "Kalikan panjang, lebar, lalu kedalaman. 5 x 2 = 10 lebih dulu.",
      explanation: "Volume = 5 x 2 x 1,5 = 10 x 1,5 = 15 m³.",
      verification: { expression: "5 * 2 * 1.5" },
    },
  ],
};
