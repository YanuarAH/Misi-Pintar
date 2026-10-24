/**
 * Konten pembelajaran MVP: 3 misi Matematika, 30 soal.
 *
 * Setiap soal punya `verification.expression` (aritmetika yang ditulis terpisah
 * dari jawaban) yang diuji di tests/content.test.ts dengan aritmetika rasional
 * eksak. Jadi jawaban tidak bisa "salah hitung" tanpa membuat test gagal.
 */

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
  questions: SeedQuestion[];
};

export const seedMissions: SeedMission[] = [
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
];
