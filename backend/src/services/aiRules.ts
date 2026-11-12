import { TicketPriority } from "@prisma/client";

/**
 * Rule-based triage used when no OPENAI_API_KEY is configured or the model
 * call fails. It keeps the product usable (and the demo meaningful) offline:
 * keyword matching picks a category, simple heuristics pick a priority, and a
 * small knowledge base supplies causes, first steps and follow-up questions.
 */

export type RuleCategory = { name: string; supportUnit: { name: string } };

export type RuleAnalysis = {
  summary: string;
  category: string;
  supportUnit: string;
  priority: TicketPriority;
  impact: string;
  possibleCauses: string[];
  suggestedSolutions: string[];
  questionsToAsk: string[];
  confidenceScore: number;
};

/** Lower-cases and strips Turkish diacritics so "Yazıcı" matches "yazici". */
export function normalize(text: string) {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ç/g, "c")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/â/g, "a")
    .replace(/î/g, "i");
}

type Knowledge = { keywords: string[]; causes: string[]; solutions: string[]; questions: string[] };

const knowledge: Record<string, Knowledge> = {
  "Yazıcı / Tarayıcı": {
    keywords: ["yazici", "printer", "tarayici", "scanner", "toner", "kartus", "cikti", "yazdir", "kagit sikis", "fotokopi"],
    causes: ["Yazdırma kuyruğu takılmış olabilir.", "Yazıcı ağ bağlantısını kaybetmiş veya çevrimdışı olabilir.", "Sürücü bozulmuş ya da toner/kâğıt bitmiş olabilir."],
    solutions: ["Yazıcıyı kapatıp açın ve bekleyen yazdırma işlerini iptal edin.", "Yazıcının ağ kablosunu ve ekrandaki hata mesajını kontrol edin.", "Sorun sürerse yazıcıyı kaldırıp yeniden ekleyin."],
    questions: ["Yazıcının ekranında bir hata kodu görünüyor mu?", "Sorun tek bilgisayarda mı, birimdeki herkeste mi?", "Yazıcının marka/modeli ve bulunduğu yer nedir?"]
  },
  "Wi-Fi Sorunu": {
    keywords: ["wifi", "wi-fi", "kablosuz", "wireless"],
    causes: ["Erişim noktası (AP) kapsama dışında veya arızalı olabilir.", "Cihaz yanlış ağa bağlanmış ya da kayıtlı parola eskimiş olabilir.", "Aynı anda çok fazla cihaz bağlı olabilir."],
    solutions: ["Wi-Fi'ı kapatıp açın ve ağı unutup yeniden bağlanın.", "Aynı noktada başka bir cihazla bağlantıyı deneyin.", "Mümkünse kablolu bağlantıya geçip çalışmaya devam edin."],
    questions: ["Hangi kablosuz ağa (SSID) bağlanmaya çalışıyorsunuz?", "Sorun binanın belirli bir noktasında mı yaşanıyor?", "Aynı yerde başka kullanıcılar da etkileniyor mu?"]
  },
  "IP / DNS Sorunu": {
    keywords: ["ip adres", "ip cakis", "dns", "dhcp", "ip alam"],
    causes: ["IP çakışması veya DHCP havuzunun dolması.", "DNS sunucusuna erişilemiyor olabilir.", "Elle girilmiş hatalı ağ ayarları."],
    solutions: ["Ağ bağdaştırıcısını devre dışı bırakıp yeniden etkinleştirin.", "Bilgisayarı yeniden başlatarak yeni IP almasını sağlayın.", "Ekrandaki IP/DNS hata mesajının görüntüsünü paylaşın."],
    questions: ["Ekranda görünen tam hata mesajı nedir?", "Bilgisayar adı veya mevcut IP adresi nedir?", "Sorun ne zaman başladı, öncesinde bir değişiklik yapıldı mı?"]
  },
  "İnternet Bağlantısı": {
    keywords: ["internet", "baglanti", "ethernet", "network", "modem", "ag kablo", "siteler acilmiyor", "cevrimdisi"],
    causes: ["Ağ kablosu çıkmış veya priz/switch portu arızalı olabilir.", "Birimin switch'i ya da ana hat kesintide olabilir.", "Güvenlik duvarı veya proxy ayarı erişimi engelliyor olabilir."],
    solutions: ["Ağ kablosunun iki ucunun da takılı olduğunu kontrol edin.", "Bilgisayarı yeniden başlatın ve farklı bir siteyi deneyin.", "Yanınızdaki bilgisayarlarda internetin çalışıp çalışmadığına bakın."],
    questions: ["Sorun yalnızca sizde mi, tüm birimde mi?", "Kablolu mu kablosuz mu bağlanıyorsunuz?", "Bağlantı tamamen mi yok, yoksa yavaş mı?"]
  },
  "Bilgisayar Performansı": {
    keywords: ["yavas", "donuyor", "kasiyor", "performans", "takiliyor", "isiniyor", "gec aciliyor"],
    causes: ["Bellek (RAM) veya disk doluluğu.", "Arka planda çalışan güncelleme ya da antivirüs taraması.", "Disk arızasının ilk belirtileri olabilir."],
    solutions: ["Bilgisayarı yeniden başlatın ve kullanılmayan programları kapatın.", "Diskte en az %15 boş alan olduğundan emin olun.", "Yavaşlamanın hangi programda başladığını not edin."],
    questions: ["Yavaşlık sürekli mi, belirli bir programda mı?", "Bilgisayar en son ne zaman yeniden başlatıldı?", "Cihazın yaşı ve modeli nedir?"]
  },
  "Monitör / Klavye / Mouse": {
    keywords: ["monitor", "klavye", "mouse", "goruntu gelmiyor", "ekran kararr", "ekran titr", "ekran acilm", "ekrana goruntu"],
    causes: ["Kablo gevşemiş veya port arızalı olabilir.", "Kablosuz çevre biriminin pili bitmiş olabilir.", "Donanımın kendisi arızalanmış olabilir."],
    solutions: ["Kabloyu çıkarıp farklı bir porta takın.", "Kablosuz ise pili değiştirin ve alıcıyı yeniden takın.", "Mümkünse başka bir bilgisayarda deneyin."],
    questions: ["Arızalı olan cihaz hangisi (monitör, klavye, mouse)?", "Cihaz kablolu mu kablosuz mu?", "Başka bir bilgisayarda denediniz mi?"]
  },
  "Bilgisayar Donanımı": {
    keywords: ["donanim", "kasa", "harddisk", "disk ariza", "guc kayna", "guc tus", "adaptor", "batarya", "sarj", "mavi ekran", "bilgisayar acilm", "bilgisayarim acilm", "laptop acilm", "bip ses"],
    causes: ["Güç kaynağı veya adaptör arızası.", "Bellek ya da disk arızası.", "Aşırı ısınma veya toz birikimi."],
    solutions: ["Güç kablosunu ve prizi kontrol edin, farklı bir prizde deneyin.", "Cihaza takılı USB aygıtlarını çıkarıp yeniden başlatın.", "Ekranda görünen hata kodunu veya bip sesini not edin."],
    questions: ["Cihaz hiç açılmıyor mu, açılıp kapanıyor mu?", "Ekranda hata kodu ya da mavi ekran görüyor musunuz?", "Cihazın demirbaş/envanter numarası nedir?"]
  },
  "Kamera Sistemi": {
    keywords: ["kamera", "goruntu yok", "cctv"],
    causes: ["Kameranın enerjisi veya ağ bağlantısı kesilmiş olabilir.", "PoE switch portu arızalı olabilir.", "Kamera lensi kirlenmiş ya da yönü değişmiş olabilir."],
    solutions: ["Kameranın üzerindeki ışıkların yanıp yanmadığını kontrol edin.", "Görüntü gelmeyen kameranın numarasını/konumunu bildirin.", "Sorunun başladığı saati paylaşın."],
    questions: ["Hangi kamera(lar) etkileniyor?", "Görüntü tamamen mi yok, bulanık mı?", "Bölgede elektrik veya ağ çalışması yapıldı mı?"]
  },
  "Güvenlik Kayıt Cihazı": {
    keywords: ["kayit cihazi", "dvr", "nvr", "kayit yapmiyor", "kayit alinmiyor"],
    causes: ["Kayıt diski dolmuş veya arızalanmış olabilir.", "Cihazın saat/tarih ayarı bozulmuş olabilir.", "Cihaz güç kesintisinden sonra açılmamış olabilir."],
    solutions: ["Cihazın açık olduğunu ve disk ışığının yandığını kontrol edin.", "Eksik kaydın tarih ve saat aralığını bildirin.", "Cihaz ekranındaki uyarı mesajını paylaşın."],
    questions: ["Hangi tarih/saat aralığındaki kayıt eksik?", "Cihaz üzerinde uyarı veya bip sesi var mı?", "Tüm kameralarda mı kayıt yok?"]
  },
  "E-posta / Outlook": {
    keywords: ["e-posta", "eposta", "mail", "outlook", "posta kutusu"],
    causes: ["Posta kutusu kotası dolmuş olabilir.", "Outlook profili bozulmuş veya parola değişmiş olabilir.", "Sunucu bağlantısında geçici sorun olabilir."],
    solutions: ["Outlook'u kapatıp açın ve web posta üzerinden giriş yapmayı deneyin.", "Gelen kutusunda eski/büyük ekleri temizleyin.", "Aldığınız hata mesajının ekran görüntüsünü paylaşın."],
    questions: ["Posta gönderemiyor musunuz, alamıyor musunuz?", "Web posta üzerinden giriş yapabiliyor musunuz?", "Ekranda görünen hata mesajı nedir?"]
  },
  "Kullanıcı Hesabı / Şifre": {
    keywords: ["sifre", "parola", "hesap kilit", "hesabim kilit", "giris yapam", "oturum ac", "kullanici hesab", "yetki"],
    causes: ["Parola süresi dolmuş olabilir.", "Art arda hatalı giriş nedeniyle hesap kilitlenmiş olabilir.", "Kullanıcının ilgili sistemde yetkisi tanımlı olmayabilir."],
    solutions: ["Caps Lock ve klavye dilini kontrol ederek yeniden deneyin.", "15 dakika bekleyip tekrar giriş yapmayı deneyin.", "Hangi sisteme giremediğinizi ve kullanıcı adınızı bildirin."],
    questions: ["Hangi sisteme giriş yapamıyorsunuz?", "Kullanıcı adınız nedir?", "Ekranda 'hesap kilitlendi' veya 'parola süresi doldu' uyarısı var mı?"]
  },
  "Belediye Otomasyon Sistemi": {
    keywords: ["otomasyon", "ebys", "belediye sistem", "tahakkuk", "evrak sistem"],
    causes: ["Kullanıcı yetkisi veya modül tanımı eksik olabilir.", "Uygulama sunucusunda geçici bir sorun olabilir.", "Tarayıcı önbelleği veya sürüm uyumsuzluğu."],
    solutions: ["Uygulamadan çıkıp yeniden giriş yapın.", "Farklı bir tarayıcıda veya gizli sekmede deneyin.", "Hata aldığınız ekranın ve işlemin görüntüsünü paylaşın."],
    questions: ["Hangi modülde ve hangi işlemde hata alıyorsunuz?", "Hata mesajının tam metni nedir?", "Aynı işlemi başka kullanıcılar yapabiliyor mu?"]
  },
  "Kurumsal Yazılım": {
    keywords: ["yazilim", "program", "uygulama", "lisans", "office", "excel", "word", "kurulum", "guncelleme", "yuklen"],
    causes: ["Lisans süresi dolmuş veya etkinleştirme yapılmamış olabilir.", "Eksik güncelleme ya da bozuk kurulum.", "Kullanıcının kurulum yetkisi olmayabilir."],
    solutions: ["Programı kapatıp bilgisayarı yeniden başlatın.", "Hata mesajının ekran görüntüsünü alın.", "Kurulum talebiyse yazılımın adını ve sürümünü belirtin."],
    questions: ["Hangi yazılım ve hangi sürüm?", "Hata ne zaman, hangi işlem sırasında oluşuyor?", "Bu bir arıza mı, yeni kurulum talebi mi?"]
  },
  "Dosya Paylaşımı / Ortak Klasör": {
    keywords: ["ortak klasor", "paylasim", "paylasilan", "dosya sunucu", "klasore eris", "ag surucu"],
    causes: ["Kullanıcının klasör yetkisi tanımlı olmayabilir.", "Ağ sürücüsü bağlantısı kopmuş olabilir.", "Dosya sunucusuna erişim geçici olarak kesilmiş olabilir."],
    solutions: ["Bilgisayarı yeniden başlatıp ağ sürücüsüne tekrar bağlanın.", "Erişmek istediğiniz klasörün tam yolunu paylaşın.", "Yetki talebiyse birim amirinizin onayını ekleyin."],
    questions: ["Erişemediğiniz klasörün yolu nedir?", "Daha önce bu klasöre erişebiliyor muydunuz?", "Aldığınız hata 'erişim reddedildi' mi, 'yol bulunamadı' mı?"]
  },
  "Sunucu / Sistem": {
    keywords: ["sunucu", "server", "yedek", "backup", "sistem coktu", "veritabani"],
    causes: ["Sunucu kaynakları (disk, bellek) tükenmiş olabilir.", "Planlı bakım veya servis yeniden başlatması.", "Donanım ya da sanallaştırma katmanında arıza."],
    solutions: ["Etkilenen sistemin adını ve hata saatini bildirin.", "Kritik işlemleri sorun çözülene kadar erteleyin.", "Hata mesajını veya log çıktısını paylaşın."],
    questions: ["Hangi sistem/servis etkileniyor?", "Kaç kullanıcı veya birim etkileniyor?", "Sorun ne zaman başladı?"]
  },
  "Web Sitesi / Kurumsal Uygulama": {
    keywords: ["web site", "site acilmiyor", "portal", "sayfa acilmiyor", "kurumsal site"],
    causes: ["Uygulama sunucusu veya SSL sertifikası sorunu.", "Tarayıcı önbelleği veya uyumsuzluğu.", "Yayına alınan son değişiklik hataya yol açmış olabilir."],
    solutions: ["Sayfayı Ctrl+F5 ile yenileyin veya farklı tarayıcıda deneyin.", "Hata veren sayfanın adresini (URL) paylaşın.", "Hata ekranının görüntüsünü ekleyin."],
    questions: ["Hangi adreste (URL) hata alıyorsunuz?", "Hata kurum içinden mi, dışarıdan mı görülüyor?", "Ekranda bir hata kodu (404, 500 vb.) var mı?"]
  },
  "Bilgi Güvenliği": {
    keywords: ["virus", "zararli", "phishing", "oltalama", "supheli", "guvenlik ihlal", "fidye", "hack", "dolandiric"],
    causes: ["Oltalama (phishing) e-postası veya zararlı ek açılmış olabilir.", "Zararlı yazılım bulaşmış olabilir.", "Hesap bilgileri ele geçirilmiş olabilir."],
    solutions: ["Şüpheli bağlantıya tıklamayın, eki açmayın.", "Bilgisayarın ağ kablosunu çıkarın ve cihazı kapatmayın.", "Bilgi girdiyseniz parolanızı hemen başka bir cihazdan değiştirin."],
    questions: ["Şüpheli e-posta veya dosyayı açtınız mı, bilgi girdiniz mi?", "Olay ne zaman gerçekleşti?", "Başka kullanıcılar da aynı iletiyi aldı mı?"]
  }
};

const genericKnowledge: Omit<Knowledge, "keywords"> = {
  causes: ["Sorunun kapsamı ve teknik ayrıntıları henüz net değil."],
  solutions: ["Cihazı yeniden başlatıp sorunun tekrarlanıp tekrarlanmadığını kontrol edin.", "Hata mesajının ekran görüntüsünü talebe ekleyin."],
  questions: ["Sorun ne zaman başladı?", "Ekranda bir hata mesajı var mı?", "Sorun yalnızca sizi mi, tüm birimi mi etkiliyor?"]
};

const urgentWords = ["tum birim", "herkes", "hic kimse", "kimse calisam", "tamamen durdu", "coktu", "fidye", "veri kayb", "tum kat", "tum bina"];
const highWords = ["calisamiyorum", "is durdu", "islem yapam", "bugun", "toplanti", "hic acilmiyor", "mesai", "vatandas bekliyor", "odeme"];
const lowWords = ["musait oldugunuz", "talep ediyorum", "bilgi almak", "yeni bir", "degisim talebi"];
// "acil" must match as a whole word: "açılmıyor" normalizes to "acilmiyor".
const urgentPattern = /(^|[^a-z])acil([^a-z]|$)/;
const notUrgentPattern = /acil\s+degil/;
const wideImpactWords = ["tum birim", "herkes", "hic kimse", "birimdeki", "tum kat", "tum bina", "ortak", "butun"];

function countHits(text: string, words: string[]) {
  return words.reduce((total, word) => (text.includes(word) ? total + 1 : total), 0);
}

function firstSentence(text: string, max = 220) {
  const clean = text.replace(/\s+/g, " ").trim();
  const sentence = clean.split(/(?<=[.!?])\s/)[0] ?? clean;
  return sentence.length > max ? `${sentence.slice(0, max - 1)}…` : sentence;
}

export function analyzeWithRules(input: { title: string; description: string; categories: RuleCategory[]; fallbackCategory?: string }): RuleAnalysis {
  const title = normalize(input.title);
  const body = normalize(input.description);
  const text = `${title} ${body}`;

  let best: { category: RuleCategory; score: number } | null = null;
  for (const category of input.categories) {
    const entry = knowledge[category.name];
    if (!entry) continue;
    // Title matches count double: people put the device or system name there.
    const score = countHits(title, entry.keywords) * 2 + countHits(body, entry.keywords);
    if (score > 0 && (!best || score > best.score)) best = { category, score };
  }

  const fallback =
    input.categories.find((item) => item.name === input.fallbackCategory) ??
    input.categories.find((item) => item.name === "Diğer") ??
    input.categories[0];
  const chosen = best?.category ?? fallback;
  const entry = chosen ? knowledge[chosen.name] ?? genericKnowledge : genericKnowledge;
  const wideImpact = countHits(text, wideImpactWords) > 0;

  let priority: TicketPriority = TicketPriority.MEDIUM;
  const notUrgent = notUrgentPattern.test(text);
  const saysUrgent = !notUrgent && urgentPattern.test(text);
  if (saysUrgent || countHits(text, urgentWords) > 0 || (chosen?.name === "Bilgi Güvenliği" && best)) priority = TicketPriority.URGENT;
  else if (countHits(text, highWords) > 0 || wideImpact) priority = TicketPriority.HIGH;
  else if (notUrgent || countHits(text, lowWords) > 0) priority = TicketPriority.LOW;

  return {
    summary: firstSentence(`${input.title.trim().replace(/[.!?]+$/, "")}. ${input.description}`),
    category: chosen?.name ?? "Diğer",
    supportUnit: chosen?.supportUnit.name ?? "Genel BT Destek Ekibi",
    priority,
    impact: wideImpact ? "Birden fazla kullanıcı veya birim etkileniyor" : "Tek kullanıcı etkileniyor",
    possibleCauses: entry.causes,
    suggestedSolutions: entry.solutions,
    questionsToAsk: entry.questions,
    // Capped below the auto-reroute threshold: keyword matches may suggest a
    // category but never override the one the employee picked.
    confidenceScore: best ? Math.min(0.7, 0.4 + best.score * 0.1) : 0.3
  };
}
