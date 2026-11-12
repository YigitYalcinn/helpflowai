import "dotenv/config";
import bcrypt from "bcryptjs";
import { Role, TicketPriority, TicketStatus } from "@prisma/client";
import { prisma } from "../src/config/prisma.js";
import { analyzeWithRules } from "../src/services/aiRules.js";
import { ensureBootstrapData } from "../src/services/bootstrapService.js";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

type DemoMessage = { from: "requester" | "staff"; text: string };

type DemoTicket = {
  number: string;
  title: string;
  description: string;
  category: string;
  requester: string;
  location: string;
  status: TicketStatus;
  createdDaysAgo: number;
  assignee?: string;
  resolvedAfterHours?: number;
  priority?: TicketPriority;
  messages?: DemoMessage[];
  note?: string;
  rating?: { score: number; comment?: string };
};

const demoStaff = [
  { email: "printer.it@demo.com", name: "Burak Yazıcı", unit: "Yazıcı ve Tarayıcı Destek Ekibi" },
  { email: "network.it@demo.com", name: "Selin Ağaoğlu", unit: "Ağ ve İnternet Destek Ekibi" },
  { email: "camera.it@demo.com", name: "Onur Demir", unit: "Kamera ve Güvenlik Sistemleri Ekibi" },
  { email: "hardware.it@demo.com", name: "Emre Kaya", unit: "Donanım Destek Ekibi" },
  { email: "accounts.it@demo.com", name: "Zeynep Arslan", unit: "E-posta ve Hesap Yönetimi Ekibi" }
];

const demoEmployees = [
  { email: "employee@demo.com", name: "Ayşe Yılmaz", department: "Mali Hizmetler" },
  { email: "employee2@demo.com", name: "Mehmet Öztürk", department: "İnsan Kaynakları" },
  { email: "employee3@demo.com", name: "Elif Şahin", department: "Yazı İşleri" }
];

const demoTickets: DemoTicket[] = [
  {
    number: "HF-000002",
    title: "Wi-Fi toplantı salonunda sürekli kopuyor",
    description: "3. kat toplantı salonunda kablosuz ağ birkaç dakikada bir kopuyor. Bugün 14:00'teki toplantıda sunum yapacağız, herkes aynı sorunu yaşıyor.",
    category: "Wi-Fi Sorunu",
    requester: "employee2@demo.com",
    location: "3. kat toplantı salonu",
    status: TicketStatus.IN_PROGRESS,
    createdDaysAgo: 0.2,
    assignee: "network.it@demo.com",
    messages: [
      { from: "staff", text: "Merhaba, erişim noktasını uzaktan kontrol ediyorum. Sorun yalnızca toplantı salonunda mı yaşanıyor?" },
      { from: "requester", text: "Evet, koridorda bağlantı normal. Salona girince kopuyor." }
    ],
    note: "AP-3K-02 üzerinde 40'tan fazla istemci var, kanal çakışması olabilir. Yerinde bakılacak."
  },
  {
    number: "HF-000003",
    title: "Outlook e-posta gönderemiyorum",
    description: "Outlook'ta e-postalar giden kutusunda kalıyor, gönderilmiyor. Gelen e-postaları alabiliyorum. Dünden beri böyle.",
    category: "E-posta / Outlook",
    requester: "employee@demo.com",
    location: "Mali Hizmetler 2. kat",
    status: TicketStatus.WAITING_USER,
    createdDaysAgo: 1.1,
    assignee: "accounts.it@demo.com",
    messages: [{ from: "staff", text: "Merhaba, posta kutunuzun kotası dolmuş görünüyor. Büyük ekli eski e-postaları silip tekrar dener misiniz?" }]
  },
  {
    number: "HF-000004",
    title: "Bilgisayarım çok yavaş açılıyor",
    description: "Bilgisayarım sabahları 10 dakikada açılıyor, programlar da çok yavaş. Özellikle Excel dosyalarında donuyor.",
    category: "Bilgisayar Performansı",
    requester: "employee3@demo.com",
    location: "Yazı İşleri 1. kat",
    status: TicketStatus.RESOLVED,
    createdDaysAgo: 3.4,
    assignee: "hardware.it@demo.com",
    resolvedAfterHours: 20,
    messages: [
      { from: "staff", text: "Merhaba, diskinizin %97'si dolu. Öğleden sonra uğrayıp temizlik yapacağım." },
      { from: "staff", text: "Geçici dosyalar temizlendi, başlangıç programları azaltıldı ve bellek 16 GB'a yükseltildi. Açılış süresi 1 dakikanın altına indi." }
    ],
    note: "RAM 8 → 16 GB yükseltildi. Disk 3 yıllık, sağlık durumu iyi."
  },
  {
    number: "HF-000005",
    title: "Şüpheli e-posta aldım, bağlantıya tıkladım",
    description: "Kargo firmasından geldiği yazan bir e-postadaki bağlantıya tıkladım, şifremi isteyen bir sayfa açıldı. Şifremi girmedim ama emin olmak istedim.",
    category: "Bilgi Güvenliği",
    requester: "employee2@demo.com",
    location: "İnsan Kaynakları 2. kat",
    status: TicketStatus.CLOSED,
    createdDaysAgo: 6.2,
    resolvedAfterHours: 2,
    messages: [
      { from: "staff", text: "Bildirdiğiniz için teşekkürler. Bilgi girmediğiniz sürece risk düşük; yine de parolanızı değiştirdik ve oturumlarınızı kapattık." },
      { from: "requester", text: "Teşekkürler, yeni parolayla giriş yapabildim." }
    ],
    rating: { score: 5, comment: "Çok hızlı dönüş yapıldı." }
  },
  {
    number: "HF-000006",
    title: "Yeni personel için kullanıcı hesabı",
    description: "Pazartesi başlayacak yeni personelimiz için kullanıcı hesabı ve e-posta adresi talep ediyorum. Acil değil, cumaya kadar yeterli.",
    category: "Kullanıcı Hesabı / Şifre",
    requester: "employee2@demo.com",
    location: "İnsan Kaynakları 2. kat",
    status: TicketStatus.CLOSED,
    createdDaysAgo: 8.5,
    assignee: "accounts.it@demo.com",
    resolvedAfterHours: 26,
    messages: [{ from: "staff", text: "Hesap ve e-posta adresi oluşturuldu, geçici parola birim amirine iletildi." }],
    rating: { score: 4 }
  },
  {
    number: "HF-000007",
    title: "Otopark kamerasında görüntü yok",
    description: "Otopark girişindeki kameradan görüntü gelmiyor, ekranda 'sinyal yok' yazıyor. Dün akşamdan beri bu şekilde.",
    category: "Kamera Sistemi",
    requester: "employee3@demo.com",
    location: "Otopark girişi",
    status: TicketStatus.OPEN,
    createdDaysAgo: 0.6
  },
  {
    number: "HF-000008",
    title: "Yazıcı tarama yapmıyor",
    description: "Kat yazıcısından e-postaya tarama gönderemiyoruz, 'sunucuya bağlanılamadı' hatası veriyor. Çıktı alabiliyoruz.",
    category: "Yazıcı / Tarayıcı",
    requester: "employee3@demo.com",
    location: "Yazı İşleri 1. kat",
    status: TicketStatus.RESOLVED,
    createdDaysAgo: 2.3,
    assignee: "printer.it@demo.com",
    resolvedAfterHours: 5,
    messages: [{ from: "staff", text: "Yazıcının SMTP ayarları güncellendi, tarama tekrar çalışıyor. Deneyip onaylar mısınız?" }]
  },
  {
    number: "HF-000009",
    title: "Tüm birimde internet yok",
    description: "Mali Hizmetler biriminde hiç kimse internete bağlanamıyor. Vatandaş bekliyor, ödeme alamıyoruz.",
    category: "İnternet Bağlantısı",
    requester: "employee@demo.com",
    location: "Mali Hizmetler 2. kat",
    status: TicketStatus.CLOSED,
    createdDaysAgo: 10.3,
    assignee: "network.it@demo.com",
    resolvedAfterHours: 1.5,
    messages: [
      { from: "staff", text: "Kat switch'inde güç kesintisi tespit edildi, yerine gidiyorum." },
      { from: "staff", text: "Switch'in güç kaynağı değiştirildi, bağlantı geri geldi." },
      { from: "requester", text: "İnternet geldi, teşekkürler." }
    ],
    note: "SW-2K-01 PSU arızası. Yedek PSU takıldı, yenisi sipariş edilecek.",
    rating: { score: 5, comment: "Sorun çok kısa sürede çözüldü." }
  },
  {
    number: "HF-000010",
    title: "Ortak klasöre erişemiyorum",
    description: "Muhasebe ortak klasörüne girmeye çalışınca 'erişim reddedildi' uyarısı alıyorum. Geçen hafta erişebiliyordum.",
    category: "Dosya Paylaşımı / Ortak Klasör",
    requester: "employee@demo.com",
    location: "Mali Hizmetler 2. kat",
    status: TicketStatus.OPEN,
    createdDaysAgo: 1.8
  },
  {
    number: "HF-000011",
    title: "Monitörde görüntü titriyor",
    description: "İkinci monitörümde ekran titriyor ve ara ara kararıyor. Kabloyu çıkarıp taktım, düzelmedi.",
    category: "Monitör / Klavye / Mouse",
    requester: "employee3@demo.com",
    location: "Yazı İşleri 1. kat",
    status: TicketStatus.IN_PROGRESS,
    createdDaysAgo: 4.2,
    assignee: "hardware.it@demo.com",
    messages: [{ from: "staff", text: "Yedek HDMI kablosuyla deneyeceğim, yarın sabah uğruyorum." }]
  },
  {
    number: "HF-000012",
    title: "Otomasyon sisteminde tahakkuk ekranı açılmıyor",
    description: "Belediye otomasyon sisteminde tahakkuk modülüne girince beyaz ekranda kalıyor. Diğer modüller çalışıyor.",
    category: "Belediye Otomasyon Sistemi",
    requester: "employee@demo.com",
    location: "Mali Hizmetler 2. kat",
    status: TicketStatus.RESOLVED,
    createdDaysAgo: 5.4,
    resolvedAfterHours: 30,
    messages: [{ from: "staff", text: "Modül güncellemesi sonrası tarayıcı önbelleği sorun çıkarıyordu; önbellek temizlendi ve sorun giderildi." }],
    rating: { score: 3, comment: "Çözüldü ama biraz uzun sürdü." }
  },
  {
    number: "HF-000013",
    title: "Yeni bir mouse talep ediyorum",
    description: "Mouse'umun tekerleği çalışmıyor, yeni bir mouse talep ediyorum. Müsait olduğunuzda değiştirebilirsiniz.",
    category: "Monitör / Klavye / Mouse",
    requester: "employee2@demo.com",
    location: "İnsan Kaynakları 2. kat",
    status: TicketStatus.CANCELLED,
    createdDaysAgo: 7.1
  },
  {
    number: "HF-000014",
    title: "Şifrem kilitlendi, giriş yapamıyorum",
    description: "Bilgisayarıma giriş yaparken 'hesabınız kilitlendi' uyarısı alıyorum. Çalışamıyorum.",
    category: "Kullanıcı Hesabı / Şifre",
    requester: "employee3@demo.com",
    location: "Yazı İşleri 1. kat",
    status: TicketStatus.CLOSED,
    createdDaysAgo: 12.4,
    assignee: "accounts.it@demo.com",
    resolvedAfterHours: 0.5,
    messages: [{ from: "staff", text: "Hesabınızın kilidi kaldırıldı, mevcut parolanızla giriş yapabilirsiniz." }],
    rating: { score: 5 }
  }
];

async function seedDemoTickets() {
  const categories = await prisma.category.findMany({ include: { supportUnit: true } });
  const users = await prisma.user.findMany({ select: { id: true, email: true, departmentId: true } });
  const userByEmail = (email: string) => users.find((user) => user.email === email);
  const now = Date.now();

  for (const demo of demoTickets) {
    if (await prisma.ticket.findUnique({ where: { ticketNumber: demo.number } })) continue;

    const category = categories.find((item) => item.name === demo.category);
    const requester = userByEmail(demo.requester);
    if (!category || !requester) continue;

    const assignee = demo.assignee ? userByEmail(demo.assignee) : undefined;
    const createdAt = new Date(now - demo.createdDaysAgo * DAY);
    const resolvedAt = demo.resolvedAfterHours ? new Date(createdAt.getTime() + demo.resolvedAfterHours * HOUR) : null;
    const closedAt = demo.status === TicketStatus.CLOSED && resolvedAt ? new Date(resolvedAt.getTime() + 3 * HOUR) : null;
    const ai = analyzeWithRules({ title: demo.title, description: demo.description, categories, fallbackCategory: demo.category });
    const staffId = assignee?.id ?? users.find((user) => user.email === (process.env.SEED_ADMIN_EMAIL ?? "admin@demo.com"))?.id ?? requester.id;

    const history: { oldStatus: TicketStatus | null; newStatus: TicketStatus; changedById: string; createdAt: Date }[] = [
      { oldStatus: null, newStatus: TicketStatus.OPEN, changedById: requester.id, createdAt }
    ];
    if (demo.status !== TicketStatus.OPEN) {
      const firstMove = demo.status === TicketStatus.CANCELLED ? TicketStatus.CANCELLED : TicketStatus.IN_PROGRESS;
      history.push({ oldStatus: TicketStatus.OPEN, newStatus: firstMove, changedById: firstMove === TicketStatus.CANCELLED ? requester.id : staffId, createdAt: new Date(createdAt.getTime() + 0.3 * HOUR) });
    }
    if (demo.status === TicketStatus.WAITING_USER) {
      history.push({ oldStatus: TicketStatus.IN_PROGRESS, newStatus: TicketStatus.WAITING_USER, changedById: staffId, createdAt: new Date(createdAt.getTime() + 2 * HOUR) });
    }
    if (resolvedAt) history.push({ oldStatus: TicketStatus.IN_PROGRESS, newStatus: TicketStatus.RESOLVED, changedById: staffId, createdAt: resolvedAt });
    if (closedAt) history.push({ oldStatus: TicketStatus.RESOLVED, newStatus: TicketStatus.CLOSED, changedById: requester.id, createdAt: closedAt });

    const span = (resolvedAt ?? new Date(Math.min(now, createdAt.getTime() + 6 * HOUR))).getTime() - createdAt.getTime();
    const messages = demo.messages ?? [];

    await prisma.ticket.create({
      data: {
        ticketNumber: demo.number,
        title: demo.title,
        description: demo.description,
        status: demo.status,
        priority: demo.priority ?? ai.priority,
        createdById: requester.id,
        departmentId: requester.departmentId,
        categoryId: category.id,
        supportUnitId: category.supportUnitId,
        assignedToId: assignee?.id ?? null,
        location: demo.location,
        createdAt,
        resolvedAt,
        closedAt,
        aiAnalysis: {
          create: {
            summary: ai.summary,
            suggestedCategory: ai.category,
            suggestedSupportUnit: ai.supportUnit,
            suggestedPriority: ai.priority,
            impact: ai.impact,
            possibleCauses: ai.possibleCauses,
            suggestedSolutions: ai.suggestedSolutions,
            questionsToAsk: ai.questionsToAsk,
            confidenceScore: ai.confidenceScore,
            rawResponse: { ...ai, source: "rules", requestedCategory: demo.category, rerouted: false },
            createdAt
          }
        },
        statusHistory: { create: history },
        assignmentHistory: assignee
          ? { create: { fromSupportUnitId: category.supportUnitId, toSupportUnitId: category.supportUnitId, toAssignedToId: assignee.id, changedById: assignee.id, reason: "Talep atandı", createdAt: new Date(createdAt.getTime() + 0.3 * HOUR) } }
          : undefined,
        messages: {
          create: messages.map((message, index) => ({
            senderId: message.from === "staff" ? staffId : requester.id,
            message: message.text,
            createdAt: new Date(createdAt.getTime() + (span * (index + 1)) / (messages.length + 1))
          }))
        },
        internalNotes: demo.note ? { create: { authorId: staffId, note: demo.note, createdAt: new Date(createdAt.getTime() + span / 2) } } : undefined,
        satisfactionRating: demo.rating
          ? { create: { userId: requester.id, score: demo.rating.score, comment: demo.rating.comment ?? null, createdAt: closedAt ?? resolvedAt ?? createdAt } }
          : undefined
      }
    });
  }
}

async function main() {
  const seedDemoUsers = process.env.NODE_ENV !== "production" || process.env.SEED_DEMO_USERS === "true";
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@demo.com").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";

  await ensureBootstrapData();

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { name: "System Admin", email: adminEmail, passwordHash: await bcrypt.hash(adminPassword, 10), role: Role.ADMIN }
  });

  if (!seedDemoUsers) return;

  const employeeHash = await bcrypt.hash("Employee123!", 10);
  const staffHash = await bcrypt.hash("Staff123!", 10);

  for (const employee of demoEmployees) {
    const department = await prisma.department.findUniqueOrThrow({ where: { name: employee.department } });
    await prisma.user.upsert({
      where: { email: employee.email },
      update: { name: employee.name },
      create: { name: employee.name, email: employee.email, passwordHash: employeeHash, role: Role.EMPLOYEE, departmentId: department.id }
    });
  }

  for (const staff of demoStaff) {
    const unit = await prisma.supportUnit.findUniqueOrThrow({ where: { name: staff.unit } });
    await prisma.user.upsert({
      where: { email: staff.email },
      update: { name: staff.name },
      create: { name: staff.name, email: staff.email, passwordHash: staffHash, role: Role.IT_STAFF, supportUnitId: unit.id }
    });
  }

  const employee = await prisma.user.findUniqueOrThrow({ where: { email: "employee@demo.com" } });
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
      departmentId: employee.departmentId,
      categoryId: printerCategory.id,
      supportUnitId: printerCategory.supportUnitId,
      location: "Mali Hizmetler 2. kat",
      statusHistory: { create: { newStatus: TicketStatus.OPEN, changedById: employee.id } }
    }
  });

  await seedDemoTickets();
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
