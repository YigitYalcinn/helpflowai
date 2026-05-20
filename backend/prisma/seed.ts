import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, Role, TicketPriority } from "@prisma/client";

const prisma = new PrismaClient();

const departments = [
  "İnsan Kaynakları",
  "Mali Hizmetler",
  "Fen İşleri",
  "Yazı İşleri",
  "Zabıta",
  "Kültür İşleri",
  "Destek Hizmetleri"
];

const supportUnits = [
  "Yazıcı ve Tarayıcı Destek Ekibi",
  "Ağ ve İnternet Destek Ekibi",
  "Donanım Destek Ekibi",
  "Yazılım ve Otomasyon Destek Ekibi",
  "Kamera ve Güvenlik Sistemleri Ekibi",
  "E-posta ve Hesap Yönetimi Ekibi",
  "Sistem ve Sunucu Yönetimi Ekibi",
  "Genel BT Destek Ekibi"
];

const categoryMappings = [
  ["Yazıcı / Tarayıcı", "Yazıcı ve Tarayıcı Destek Ekibi"],
  ["İnternet Bağlantısı", "Ağ ve İnternet Destek Ekibi"],
  ["Wi-Fi Sorunu", "Ağ ve İnternet Destek Ekibi"],
  ["IP / DNS Sorunu", "Ağ ve İnternet Destek Ekibi"],
  ["Bilgisayar Donanımı", "Donanım Destek Ekibi"],
  ["Bilgisayar Performansı", "Donanım Destek Ekibi"],
  ["Monitör / Klavye / Mouse", "Donanım Destek Ekibi"],
  ["Kamera Sistemi", "Kamera ve Güvenlik Sistemleri Ekibi"],
  ["Güvenlik Kayıt Cihazı", "Kamera ve Güvenlik Sistemleri Ekibi"],
  ["Kurumsal Yazılım", "Yazılım ve Otomasyon Destek Ekibi"],
  ["Belediye Otomasyon Sistemi", "Yazılım ve Otomasyon Destek Ekibi"],
  ["E-posta / Outlook", "E-posta ve Hesap Yönetimi Ekibi"],
  ["Kullanıcı Hesabı / Şifre", "E-posta ve Hesap Yönetimi Ekibi"],
  ["Dosya Paylaşımı / Ortak Klasör", "Sistem ve Sunucu Yönetimi Ekibi"],
  ["Sunucu / Sistem", "Sistem ve Sunucu Yönetimi Ekibi"],
  ["Web Sitesi / Kurumsal Uygulama", "Yazılım ve Otomasyon Destek Ekibi"],
  ["Bilgi Güvenliği", "Sistem ve Sunucu Yönetimi Ekibi"],
  ["Diğer", "Genel BT Destek Ekibi"]
] as const;

async function main() {
  const seedDemoUsers = process.env.NODE_ENV !== "production" || process.env.SEED_DEMO_USERS === "true";
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@demo.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";

  for (const name of departments) {
    await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name, description: `${name} departmanı` }
    });
  }

  for (const name of supportUnits) {
    await prisma.supportUnit.upsert({
      where: { name },
      update: {},
      create: { name, description: `${name} destek taleplerini yönetir.` }
    });
  }

  for (const [categoryName, supportUnitName] of categoryMappings) {
    const supportUnit = await prisma.supportUnit.findUniqueOrThrow({ where: { name: supportUnitName } });
    await prisma.category.upsert({
      where: { name: categoryName },
      update: { supportUnitId: supportUnit.id },
      create: {
        name: categoryName,
        description: `${supportUnitName} tarafından yönetilir.`,
        supportUnitId: supportUnit.id
      }
    });
  }

  const defaultDepartment = await prisma.department.findUniqueOrThrow({ where: { name: "Mali Hizmetler" } });
  const printerUnit = await prisma.supportUnit.findUniqueOrThrow({ where: { name: "Yazıcı ve Tarayıcı Destek Ekibi" } });
  const networkUnit = await prisma.supportUnit.findUniqueOrThrow({ where: { name: "Ağ ve İnternet Destek Ekibi" } });
  const cameraUnit = await prisma.supportUnit.findUniqueOrThrow({ where: { name: "Kamera ve Güvenlik Sistemleri Ekibi" } });
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const employeeHash = await bcrypt.hash("Employee123!", 10);
  const staffHash = await bcrypt.hash("Staff123!", 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { name: "System Admin", email: adminEmail, passwordHash, role: Role.ADMIN }
  });

  if (!seedDemoUsers) {
    return;
  }

  const employee = await prisma.user.upsert({
    where: { email: "employee@demo.com" },
    update: {},
    create: {
      name: "Demo Employee",
      email: "employee@demo.com",
      passwordHash: employeeHash,
      role: Role.EMPLOYEE,
      departmentId: defaultDepartment.id
    }
  });

  await prisma.user.upsert({
    where: { email: "printer.it@demo.com" },
    update: {},
    create: { name: "Printer IT Staff", email: "printer.it@demo.com", passwordHash: staffHash, role: Role.IT_STAFF, supportUnitId: printerUnit.id }
  });
  await prisma.user.upsert({
    where: { email: "network.it@demo.com" },
    update: {},
    create: { name: "Network IT Staff", email: "network.it@demo.com", passwordHash: staffHash, role: Role.IT_STAFF, supportUnitId: networkUnit.id }
  });
  await prisma.user.upsert({
    where: { email: "camera.it@demo.com" },
    update: {},
    create: { name: "Camera IT Staff", email: "camera.it@demo.com", passwordHash: staffHash, role: Role.IT_STAFF, supportUnitId: cameraUnit.id }
  });

  const printerCategory = await prisma.category.findUniqueOrThrow({ where: { name: "Yazıcı / Tarayıcı" } });
  await prisma.ticket.upsert({
    where: { ticketNumber: "HF-000001" },
    update: {},
    create: {
      ticketNumber: "HF-000001",
      title: "Ortak yazıcı çıktı vermiyor",
      description: "Muhasebe birimindeki ortak yazıcı çıktı vermiyor, yazdırma işleri kuyrukta bekliyor.",
      priority: TicketPriority.MEDIUM,
      createdById: employee.id,
      departmentId: defaultDepartment.id,
      categoryId: printerCategory.id,
      supportUnitId: printerUnit.id,
      location: "Mali Hizmetler 2. kat"
    }
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
