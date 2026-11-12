/**
 * Hand-labeled sample tickets used to evaluate the rule-based triage.
 * Written in everyday employee language (not copied from the keyword lists)
 * so the score reflects realistic input. Synthetic data, not production tickets.
 */
export type LabeledTicket = { title: string; description: string; expectedCategory: string };

export const sampleTickets: LabeledTicket[] = [
  { title: "Yazıcı çıktı vermiyor", description: "2. kattaki yazıcıya gönderiyorum ama kuyrukta bekliyor, hiçbir şey basmıyor.", expectedCategory: "Yazıcı / Tarayıcı" },
  { title: "Toner bitti", description: "Muhasebe odasındaki cihazın toneri bitmiş, değişim lazım.", expectedCategory: "Yazıcı / Tarayıcı" },
  { title: "Tarama yapamıyorum", description: "Evrakları PDF olarak taramak istiyorum, tarayıcı bilgisayarı görmüyor.", expectedCategory: "Yazıcı / Tarayıcı" },
  { title: "Kağıt sıkıştı sürekli", description: "Her 5 sayfada bir kağıt sıkışıyor, işler aksıyor.", expectedCategory: "Yazıcı / Tarayıcı" },
  { title: "Wifi çekmiyor", description: "Toplantı salonunda kablosuz ağa bağlanamıyoruz.", expectedCategory: "Wi-Fi Sorunu" },
  { title: "Laptop kablosuz ağı görmüyor", description: "Dizüstü bilgisayarım ofisteki ağ listesinde hiçbir ağ göstermiyor.", expectedCategory: "Wi-Fi Sorunu" },
  { title: "İnternet yok", description: "Sabahtan beri bütün birimde internet çalışmıyor.", expectedCategory: "İnternet Bağlantısı" },
  { title: "Ethernet kablosu", description: "Masamdaki kablo takılı ama bağlantı yok uyarısı veriyor.", expectedCategory: "İnternet Bağlantısı" },
  { title: "IP çakışması uyarısı", description: "Windows ağda IP çakışması olduğunu söylüyor, internet gidip geliyor.", expectedCategory: "IP / DNS Sorunu" },
  { title: "Siteler açılmıyor ama ping atıyor", description: "DNS sunucusu yanıt vermiyor hatası alıyorum.", expectedCategory: "IP / DNS Sorunu" },
  { title: "Bilgisayar çok yavaş", description: "Açılması 10 dakika sürüyor, programlar donuyor.", expectedCategory: "Bilgisayar Performansı" },
  { title: "Sürekli kasıyor", description: "Excel ve tarayıcı aynı anda açıkken bilgisayar takılıyor.", expectedCategory: "Bilgisayar Performansı" },
  { title: "Bilgisayar açılmıyor", description: "Güç tuşuna basıyorum, ışık yanıyor ama ekrana görüntü gelmiyor.", expectedCategory: "Bilgisayar Donanımı" },
  { title: "Mavi ekran hatası", description: "Gün içinde birkaç kez mavi ekran verip yeniden başlıyor.", expectedCategory: "Bilgisayar Donanımı" },
  { title: "Fan çok ses yapıyor", description: "Kasadan yüksek ses geliyor ve çok ısınıyor.", expectedCategory: "Bilgisayar Donanımı" },
  { title: "Klavyenin bazı tuşları çalışmıyor", description: "E ve R harfleri basmıyor.", expectedCategory: "Monitör / Klavye / Mouse" },
  { title: "İkinci monitör algılanmıyor", description: "Yeni aldığımız ekranı bağladım, görüntü yok.", expectedCategory: "Monitör / Klavye / Mouse" },
  { title: "Fare imleci titriyor", description: "Mouse hareket ettirmeden ekranda kayıyor.", expectedCategory: "Monitör / Klavye / Mouse" },
  { title: "Bahçe kamerası görüntü vermiyor", description: "Otopark tarafındaki kameradan dünden beri görüntü gelmiyor.", expectedCategory: "Kamera Sistemi" },
  { title: "Güvenlik kamerası bulanık", description: "Giriş kapısındaki kamera görüntüsü çok bulanık, plaka okunmuyor.", expectedCategory: "Kamera Sistemi" },
  { title: "Kayıt cihazı dolu", description: "NVR diski dolmuş, son 3 günün kaydı alınmamış.", expectedCategory: "Güvenlik Kayıt Cihazı" },
  { title: "Geçmiş kayıtlara erişemiyoruz", description: "Dün akşamki görüntü kaydını izlemek istiyoruz ama kayıt cihazı açılmıyor.", expectedCategory: "Güvenlik Kayıt Cihazı" },
  { title: "EBYS'ye evrak yüklenmiyor", description: "Elektronik belge yönetim sisteminde evrak kaydederken hata alıyorum.", expectedCategory: "Belediye Otomasyon Sistemi" },
  { title: "Otomasyon programı hata veriyor", description: "Ruhsat modülünde kayıt açarken uygulama kapanıyor.", expectedCategory: "Belediye Otomasyon Sistemi" },
  { title: "Office lisansı sona ermiş", description: "Word açılınca ürün etkinleştirilemedi diyor.", expectedCategory: "Kurumsal Yazılım" },
  { title: "Program kurulumu", description: "Proje için bir yazılımın bilgisayarıma kurulması gerekiyor.", expectedCategory: "Kurumsal Yazılım" },
  { title: "Outlook mail almıyor", description: "Dünden beri gelen kutuma hiçbir e-posta düşmüyor.", expectedCategory: "E-posta / Outlook" },
  { title: "Eki gönderemiyorum", description: "20 MB'lık dosyayı e-postayla göndermeye çalışınca hata veriyor.", expectedCategory: "E-posta / Outlook" },
  { title: "Şifremi unuttum", description: "Bilgisayara giriş şifremi hatırlamıyorum, sıfırlanması lazım.", expectedCategory: "Kullanıcı Hesabı / Şifre" },
  { title: "Hesabım kilitlendi", description: "Birkaç kez yanlış girince hesabım kilitlendi.", expectedCategory: "Kullanıcı Hesabı / Şifre" },
  { title: "Yeni personel için hesap", description: "Pazartesi başlayacak arkadaş için kullanıcı adı açılması gerekiyor.", expectedCategory: "Kullanıcı Hesabı / Şifre" },
  { title: "Ortak klasöre erişim yok", description: "Muhasebe ortak klasörü erişim reddedildi diyor.", expectedCategory: "Dosya Paylaşımı / Ortak Klasör" },
  { title: "Z sürücüsü görünmüyor", description: "Herkesin dosya koyduğu ağ sürücüsü bilgisayarımdan kaybolmuş.", expectedCategory: "Dosya Paylaşımı / Ortak Klasör" },
  { title: "Sunucuya ulaşılamıyor", description: "Arşiv sunucusu sabahtan beri yanıt vermiyor, kimse çalışamıyor.", expectedCategory: "Sunucu / Sistem" },
  { title: "Gece yedeği alınmamış", description: "Backup raporunda dün geceki işin başarısız olduğu görünüyor.", expectedCategory: "Sunucu / Sistem" },
  { title: "Kurumsal web sitesi açılmıyor", description: "Vatandaşlar belediye sitesine giremediklerini söylüyor.", expectedCategory: "Web Sitesi / Kurumsal Uygulama" },
  { title: "Online başvuru formu çalışmıyor", description: "Portal üzerindeki başvuru formu gönder tuşunda hata veriyor.", expectedCategory: "Web Sitesi / Kurumsal Uygulama" },
  { title: "Şüpheli e-posta geldi", description: "Banka gibi görünen bir mail şifremi istiyor, linke tıkladım.", expectedCategory: "Bilgi Güvenliği" },
  { title: "Dosyalar şifrelendi", description: "Bilgisayardaki tüm dosyaların uzantısı değişti ve fidye notu çıktı.", expectedCategory: "Bilgi Güvenliği" },
  { title: "Antivirüs uyarısı", description: "Antivirüs programı USB bellekte tehdit bulduğunu söylüyor.", expectedCategory: "Bilgi Güvenliği" }
];

/**
 * Held-out set: written after the keyword rules were last changed and never used
 * to tune them. This is the more honest number.
 */
export const holdoutTickets: LabeledTicket[] = [
  { title: "Renkli çıktı soluk geliyor", description: "Sunum için bastığım sayfalarda renkler çok açık çıkıyor.", expectedCategory: "Yazıcı / Tarayıcı" },
  { title: "Fotokopi makinesi hata kodu", description: "Ön paneldeki cihaz E-302 hatası verip duruyor.", expectedCategory: "Yazıcı / Tarayıcı" },
  { title: "Misafir ağı şifresi", description: "Ziyaretçilerimiz için wifi şifresini öğrenebilir miyiz?", expectedCategory: "Wi-Fi Sorunu" },
  { title: "Bağlantı sürekli kopuyor", description: "İnternet 5 dakikada bir gidip geliyor, toplantılar kesiliyor.", expectedCategory: "İnternet Bağlantısı" },
  { title: "Bilgisayar ısınıp kapanıyor", description: "Öğleden sonra cihaz kendi kendine kapanıyor, kasası çok sıcak.", expectedCategory: "Bilgisayar Donanımı" },
  { title: "Açılış çok uzun sürüyor", description: "Sabah bilgisayarı açınca masaüstü gelene kadar 15 dakika bekliyorum.", expectedCategory: "Bilgisayar Performansı" },
  { title: "Ekran kartı görüntü titriyor", description: "Monitörde yatay çizgiler oluşuyor.", expectedCategory: "Monitör / Klavye / Mouse" },
  { title: "Kamera açısı değişmiş", description: "Arka kapıdaki kamera rüzgardan dönmüş, artık duvarı gösteriyor.", expectedCategory: "Kamera Sistemi" },
  { title: "DVR saat ayarı yanlış", description: "Kayıtlardaki saat 3 saat geride görünüyor.", expectedCategory: "Güvenlik Kayıt Cihazı" },
  { title: "Belge yönetim sisteminde imza hatası", description: "EBYS'de e-imza atarken sertifika bulunamadı diyor.", expectedCategory: "Belediye Otomasyon Sistemi" },
  { title: "PDF programı açılmıyor", description: "Adobe Reader tıklayınca hiçbir şey olmuyor.", expectedCategory: "Kurumsal Yazılım" },
  { title: "Takvim daveti gitmiyor", description: "Outlook'tan toplantı daveti gönderdiğimde karşı taraf almıyor.", expectedCategory: "E-posta / Outlook" },
  { title: "Şifre süresi doldu", description: "Sistem şifrenizin süresi doldu diyor ama değiştirme ekranı açılmıyor.", expectedCategory: "Kullanıcı Hesabı / Şifre" },
  { title: "Klasör izni talebi", description: "İnsan kaynakları paylaşım klasörüne yazma yetkisi istiyorum.", expectedCategory: "Dosya Paylaşımı / Ortak Klasör" },
  { title: "Veritabanı bağlantı hatası", description: "Muhasebe programı veritabanına bağlanamıyor diyor, tüm birim etkilendi.", expectedCategory: "Sunucu / Sistem" },
  { title: "Randevu sayfası hata veriyor", description: "Belediyenin online randevu sayfasında 500 hatası alınıyor.", expectedCategory: "Web Sitesi / Kurumsal Uygulama" },
  { title: "Bilinmeyen USB takıldı", description: "Masamda kime ait olduğunu bilmediğim bir USB bellek buldum, biri takmış olabilir.", expectedCategory: "Bilgi Güvenliği" },
  { title: "Garip açılır pencereler", description: "Tarayıcıda sürekli reklam pencereleri açılıyor, ana sayfam değişmiş.", expectedCategory: "Bilgi Güvenliği" },
  { title: "Yeni telefonuma mail kurulumu", description: "İş e-postamı cep telefonuma eklemek istiyorum.", expectedCategory: "E-posta / Outlook" },
  { title: "Excel makroları çalışmıyor", description: "Raporlama dosyasındaki makrolar güvenlik nedeniyle engellendi uyarısı veriyor.", expectedCategory: "Kurumsal Yazılım" }
];
