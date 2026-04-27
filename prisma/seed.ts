import { PrismaClient, QuestionType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { normalizeIndonesianPhoneNumber } from "../src/lib/phone";

const prisma = new PrismaClient();

async function main() {
  // Admin
  const adminEmail = "admin@example.com";
  const adminPassword = "admin123";
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, passwordHash, name: "Admin" },
  });
  console.log(`Admin: ${admin.email} / ${adminPassword}`);

  // Categories
  const cats = [
    { name: "TWK", description: "Tes Wawasan Kebangsaan" },
    { name: "TIU", description: "Tes Intelegensi Umum" },
    { name: "TKP", description: "Tes Karakteristik Pribadi (Likert)" },
  ];
  const catRows = await Promise.all(
    cats.map((c) =>
      prisma.category.upsert({
        where: { name: c.name },
        update: { description: c.description },
        create: c,
      })
    )
  );
  const [twk, tiu, tkp] = catRows;

  // Wipe existing seed questions for these categories to keep idempotent
  await prisma.question.deleteMany({
    where: { categoryId: { in: catRows.map((c) => c.id) } },
  });

  // TWK (MC)
  const twkQuestions = [
    {
      text: "Pancasila sebagai dasar negara ditetapkan pada tanggal...",
      options: [
        { text: "1 Juni 1945", isCorrect: false },
        { text: "17 Agustus 1945", isCorrect: false },
        { text: "18 Agustus 1945", isCorrect: true },
        { text: "27 Desember 1949", isCorrect: false },
      ],
    },
    {
      text: "Lambang sila ke-3 Pancasila adalah...",
      options: [
        { text: "Pohon Beringin", isCorrect: true },
        { text: "Kepala Banteng", isCorrect: false },
        { text: "Padi dan Kapas", isCorrect: false },
        { text: "Rantai Emas", isCorrect: false },
      ],
    },
    {
      text: "UUD 1945 disahkan oleh...",
      options: [
        { text: "BPUPKI", isCorrect: false },
        { text: "PPKI", isCorrect: true },
        { text: "MPR", isCorrect: false },
        { text: "DPR", isCorrect: false },
      ],
    },
    {
      text: "Ibu kota Indonesia berdasarkan UU IKN adalah...",
      options: [
        { text: "Jakarta", isCorrect: false },
        { text: "Bandung", isCorrect: false },
        { text: "Nusantara", isCorrect: true },
        { text: "Surabaya", isCorrect: false },
      ],
    },
    {
      text: "Bahasa resmi Indonesia adalah...",
      options: [
        { text: "Bahasa Melayu", isCorrect: false },
        { text: "Bahasa Indonesia", isCorrect: true },
        { text: "Bahasa Jawa", isCorrect: false },
        { text: "Bahasa Sunda", isCorrect: false },
      ],
    },
  ];

  // TIU (MC)
  const tiuQuestions = [
    {
      text: "5 + 3 × 2 = ...",
      options: [
        { text: "11", isCorrect: true },
        { text: "16", isCorrect: false },
        { text: "13", isCorrect: false },
        { text: "10", isCorrect: false },
      ],
    },
    {
      text: "Sinonim dari kata 'Cermat' adalah...",
      options: [
        { text: "Teliti", isCorrect: true },
        { text: "Ceroboh", isCorrect: false },
        { text: "Lambat", isCorrect: false },
        { text: "Cepat", isCorrect: false },
      ],
    },
    {
      text: "Jika 2x + 4 = 10, maka x = ...",
      options: [
        { text: "2", isCorrect: false },
        { text: "3", isCorrect: true },
        { text: "4", isCorrect: false },
        { text: "5", isCorrect: false },
      ],
    },
    {
      text: "Lawan kata 'Optimis' adalah...",
      options: [
        { text: "Pesimis", isCorrect: true },
        { text: "Realistis", isCorrect: false },
        { text: "Skeptis", isCorrect: false },
        { text: "Antusias", isCorrect: false },
      ],
    },
    {
      text: "Deret: 2, 4, 8, 16, ... selanjutnya adalah",
      options: [
        { text: "20", isCorrect: false },
        { text: "24", isCorrect: false },
        { text: "32", isCorrect: true },
        { text: "64", isCorrect: false },
      ],
    },
  ];

  // TKP (Likert)
  const likertOptions = [
    { text: "Selalu menyelesaikan dengan teliti dan terjadwal.", score: 5 },
    { text: "Sering menyelesaikan dengan baik tepat waktu.", score: 4 },
    { text: "Cukup, biasanya selesai walau kadang terlambat.", score: 3 },
    { text: "Kurang, sering tertunda.", score: 2 },
    { text: "Tidak pernah dipikirkan secara matang.", score: 1 },
  ];
  const tkpQuestions = [
    "Saat menerima tugas baru, sikap saya adalah...",
    "Ketika menemui rekan yang melakukan kesalahan, saya...",
    "Dalam bekerja sama dengan tim, saya cenderung...",
    "Bila menghadapi tekanan deadline, saya...",
    "Terhadap perubahan kebijakan kantor, saya...",
  ];

  for (const q of twkQuestions) {
    await prisma.question.create({
      data: {
        categoryId: twk.id,
        text: q.text,
        type: QuestionType.MULTIPLE_CHOICE,
        options: {
          create: q.options.map((o, i) => ({
            text: o.text,
            isCorrect: o.isCorrect,
            score: o.isCorrect ? 5 : 0,
            order: i,
          })),
        },
      },
    });
  }
  for (const q of tiuQuestions) {
    await prisma.question.create({
      data: {
        categoryId: tiu.id,
        text: q.text,
        type: QuestionType.MULTIPLE_CHOICE,
        options: {
          create: q.options.map((o, i) => ({
            text: o.text,
            isCorrect: o.isCorrect,
            score: o.isCorrect ? 5 : 0,
            order: i,
          })),
        },
      },
    });
  }
  for (const text of tkpQuestions) {
    await prisma.question.create({
      data: {
        categoryId: tkp.id,
        text,
        type: QuestionType.LIKERT,
        options: {
          create: likertOptions.map((o, i) => ({
            text: o.text,
            score: o.score,
            isCorrect: false,
            order: i,
          })),
        },
      },
    });
  }

  // Package
  const pkgName = "Try Out CPNS Demo";
  await prisma.package.deleteMany({ where: { name: pkgName } });
  const pkg = await prisma.package.create({
    data: {
      name: pkgName,
      code: "PKG-DEMO",
      description: "Demo paket: 3 TWK + 3 TIU + 3 TKP, durasi 30 menit",
      durationMinutes: 30,
      isActive: true,
      packageCategories: {
        create: [
          { categoryId: twk.id, questionCount: 3 },
          { categoryId: tiu.id, questionCount: 3 },
          { categoryId: tkp.id, questionCount: 3 },
        ],
      },
    },
  });

  // Demo participant
  const peserta = await prisma.participant.upsert({
    where: { normalizedPhoneNumber: normalizeIndonesianPhoneNumber("081234567890") },
    update: {
      email: "peserta@example.com",
      phoneVerified: true,
    },
    create: {
      name: "Peserta Demo",
      email: "peserta@example.com",
      phone: "081234567890",
      normalizedPhoneNumber: normalizeIndonesianPhoneNumber("081234567890"),
      phoneVerified: true,
    },
  });

  // PIN for the demo participant
  await prisma.participantPin.deleteMany({
    where: { participantId: peserta.id, packageId: pkg.id },
  });
  const pin = await prisma.participantPin.create({
    data: { participantId: peserta.id, packageId: pkg.id, pin: "1234" },
  });
  console.log(`Peserta demo: ${peserta.email} / ${peserta.phone}`);
  console.log(`PIN demo: ${pin.pin} untuk paket "${pkg.name}"`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
