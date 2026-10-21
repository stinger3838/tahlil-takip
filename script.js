// Giriş Yaparken Sorulacak Şifreyi Hafızada Tutma
let userPassword = localStorage.getItem('tahlil_app_password') || "";

const referanslar = {
    'Takrolimus': { min: 5, max: 15, kritikMax: 20 }, 
    'GLUKOZ': { min: 74, max: 106 },
    'Üre': { min: 17, max: 43 },
    'Kreatinin': { min: 0.7, max: 1.2 },
    'eGRF': { min: 90, max: 200 },
    'Ürik Asit': { min: 3.5, max: 7.2 },
    'Kalsiyum': { min: 8.6, max: 10.2 },
    'Sodyum': { min: 136, max: 145 },
    'Potasyum': { min: 3.5, max: 5.1 },
    'Klorür': { min: 98, max: 107 },
    'AST': { min: 0, max: 40 },
    'ALT': { min: 0, max: 41 },
    'Protein': { min: 6.6, max: 8.7 },
    'Alkalen Fosfataz': { min: 40, max: 130 }, // İsimlendirme düzeltildi
    'Albümin': { min: 3.5, max: 5.2 },
    'Fosfor': { min: 2.5, max: 4.5 },
    'LDH': { min: 135, max: 225 },
    'WBC': { min: 4.5, max: 11 },
    'HGB': { min: 13.2, max: 17.5 },
    'Magnezyum': { min: 1.6, max: 2.6 },
    'CRP': { min: 0, max: 5 },
    'Bikarbonat': { min: 22, max: 29 },
    'PROBNP': { min: 0, max: 125 }
};

const tahlilListesi = Object.keys(referanslar);
const inputGrid = document.getElementById('inputGrid');
const tabloBasliklari = document.getElementById('tabloBasliklari');

// Form ve başlık yapısını DOM'a ilk yüklemede oluşturma
tahlilListesi.forEach(tahlil => {
    const ref = referanslar[tahlil];
    const div = document.createElement('div');
    div.className = 'form-group';
    div.innerHTML = `
        <label for="t_${tahlil}">${tahlil} <span style="color:#999; font-weight:normal;">(${ref.min}-${ref.max})</span></label>
        <input type="number" step="0.001" id="t_${tahlil}" placeholder="-">
    `;
    inputGrid.appendChild(div);

    const th = document.createElement('th');
    th.innerHTML = `${tahlil}<br><span style="font-size:10px; font-weight:normal; opacity:0.8;">(${ref.min}-${ref.max})</span>`;
    tabloBasliklari.appendChild(th);
});

// Şifre sorma mekanizması (UX İyileştirmesi)
function sifreSor() {
    if(!userPassword) {
        const input = prompt("Lütfen erişim şifrenizi giriniz:");
        if(input && input.trim() !== "") {
            userPassword = input;
            localStorage.setItem('tahlil_app_password', userPassword);
        } else {
            alert("Şifre girmeden sisteme erişemezsiniz.");
        }
    }
}

// Yardımcı Fonksiyon: Tarih Formatlama (Hoisting hatası önlendi)
function tarihFormatla(tarihStr) {
    if(!tarihStr) return "-";
    const d = new Date(tarihStr);
    return isNaN(d.getTime()) ? tarihStr : d.toLocaleDateString('tr-TR');
}

// Yardımcı Fonksiyon: Renk Sınıfı Bulma
function renkSinifiBul(tahlilAdi, degerStr) {
    if (!degerStr || degerStr === "-" || degerStr === "") return "";
    const deger = parseFloat(degerStr.toString().replace(',', '.'));
    if (isNaN(deger)) return "";
    const ref = referanslar[tahlilAdi];
    if (!ref) return "";
    if (deger < ref.min) return "t-low"; 
    if (ref.kritikMax && deger >= ref.kritikMax) return "t-veryhigh"; 
    if (deger > ref.max) return "t-high"; 
    return "t-normal"; 
}

// Sunucudan Verileri Çekme
async function verileriGetir() {
    sifreSor();
    try {
        const response = await fetch(encodeURI('/api/tahliller'), {
            headers: { 'x-auth-password': String(userPassword) }
        });
        if(response.status === 401) {
            alert("Şifre yanlış! Lütfen sayfayı yenileyip tekrar deneyin.");
            localStorage.removeItem('tahlil_app_password');
            userPassword = "";
            return [];
        }
        return await response.json();
    } catch (err) {
        console.error("Veri çekme hatası:", err);
        return [];
    }
}

// Sunucuye Verileri Toplu Gönderme
async function verileriKaydet(tumVeriler) {
    const response = await fetch(encodeURI('/api/tahliller'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-auth-password': String(userPassword)
        },
        body: JSON.stringify(tumVeriler)
    });
    
    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Sunucu hata kodu döndürdü: ${response.status}`);
    }
}

// Form Gönderildiğinde Yeni Dönem Sonucu Ekleme
document.getElementById('tahlilForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const tarih = document.getElementById('tahlilTarihi').value;
    if (!tarih) {
        alert("Lütfen tahlil tarihini seçiniz!");
        return;
    }

    const submitBtn = this.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Kaydediliyor...";
    }

    try {
        const yeniKayit = { tarih: tarih, sonuclar: {} };

        tahlilListesi.forEach(tahlil => {
            const inputElement = document.getElementById(`t_${tahlil}`);
            const deger = inputElement ? inputElement.value.trim() : "";
            yeniKayit.sonuclar[tahlil] = deger !== "" ? deger : "-";
        });
        
        let kaydedilenler = [];
        try {
            kaydedilenler = await verileriGetir();
            if (!Array.isArray(kaydedilenler)) kaydedilenler = [];
        } catch (fetchErr) {
            kaydedilenler = [];
        }

        kaydedilenler = kaydedilenler.filter(k => k.tarih !== tarih);
        kaydedilenler.push(yeniKayit);
        
        await verileriKaydet(kaydedilenler);
        
        this.reset();
        alert("Tahlil sonuçları başarıyla kaydedildi!");
        await listele();

    } catch (err) {
        console.error("Kayıt sırasında genel hata:", err);
        alert("Kaydedilirken hata oluştu!\nDetay: " + err.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Sonuçları Kaydet";
        }
    }
});

// Tüm Dönemlerin Tablosunu Oluşturma ve Dinamik Hücre Düzenleme
async function listele() {
    const tbody = document.getElementById('tahlilListesi');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const kaydedilenler = await verileriGetir();
    if (!Array.isArray(kaydedilenler)) return;
    
    kaydedilenler.sort((a, b) => new Date(b.tarih) - new Date(a.tarih));

    kaydedilenler.forEach(kayit => {
        const tr = document.createElement('tr');
        
        const tdTarih = document.createElement('td');
        tdTarih.className = 'date-col';
        tdTarih.textContent = tarihFormatla(kayit.tarih);
        tr.appendChild(tdTarih);

        tahlilListesi.forEach(tahlil => {
            const td = document.createElement('td');
            td.className = 'editable';
            let mevcutSonuc = (kayit.sonuclar && kayit.sonuclar[tahlil]) ? kayit.sonuclar[tahlil] : "-";
            td.textContent = mevcutSonuc;
            
            const renkSinifi = renkSinifiBul(tahlil, mevcutSonuc);
            if(renkSinifi) td.classList.add(renkSinifi);
            
            td.addEventListener('dblclick', function() {
                if (this.querySelector('input')) return;
                
                // BUG FIX: Değeri her dblclick anında taze olarak kayit nesnesinden okuyoruz
                const anlikSonuc = kayit.sonuclar[tahlil] === "-" ? "" : kayit.sonuclar[tahlil];
                const input = document.createElement('input');
                input.type = 'number';
                input.step = '0.001';
                input.value = anlikSonuc;
                
                this.textContent = '';
                this.appendChild(input);
                input.focus();
                
                input.addEventListener('blur', async () => {
                    const yeniDeger = input.value.trim();
                    const temizDeger = yeniDeger !== "" ? yeniDeger : "-";
                    
                    // Değer değişmediyse sunucuya gereksiz istek atmayı engelliyoruz
                    if(temizDeger === kayit.sonuclar[tahlil]) {
                        td.textContent = temizDeger;
                        td.className = 'editable';
                        const ayniRenk = renkSinifiBul(tahlil, temizDeger);
                        if(ayniRenk) td.classList.add(ayniRenk);
                        return;
                    }
                    
                    let guncelListe = await verileriGetir();
                    const index = guncelListe.findIndex(k => k.tarih === kayit.tarih);
                    if (index !== -1) {
                        if (!guncelListe[index].sonuclar) guncelListe[index].sonuclar = {};
                        guncelListe[index].sonuclar[tahlil] = temizDeger;
                        try {
                            await verileriKaydet(guncelListe);
                            // BUG FIX: Lokal bellek nesnesini hemen güncelliyoruz ki ardışık çift tıklamalar bozulmasın
                            kayit.sonuclar[tahlil] = temizDeger; 
                        } catch (err) {
                            alert("Hücre güncellenirken hata oluştu: " + err.message);
                            td.textContent = kayit.sonuclar[tahlil]; // Hata durumunda eski veriyi geri basıyoruz
                            return;
                        }
                    }

                    td.textContent = temizDeger;
                    td.className = 'editable'; 
                    const yeniRenk = renkSinifiBul(tahlil, temizDeger);
                    if(yeniRenk) td.classList.add(yeniRenk);
                });
                
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') input.blur();
                });
            });

            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
}

// Uygulamayı Başlat
listele();
