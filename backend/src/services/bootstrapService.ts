import { prisma } from "../config/prisma.js";

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

export async function ensureBootstrapData() {
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
}
