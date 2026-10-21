const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const path = require('path');

app.use(express.json());

// --- BURALARI KENDİ GİTHUB BİLGİLERİNİZLE DOLDURUN ---
const GIZLI_SIFRE = "123456"; // Giriş yaparken prompt ekranına girilecek şifre
const GITHUB_TOKEN = "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"; // GitHub'dan aldığınız token

const GITHUB_USER = "stinger3838"; // Kendi GitHub kullanıcı adınız
const GITHUB_REPO = "tahlil_son";      // Tahlillerin saklanacağı depo adı
const GITHUB_FILE = "tahliller.json";   // Verilerin yazılacağı JSON dosya adı
// ----------------------------------------------------

// API URL'si Düzeltildi: Hem `api.` eki, hem `/repos/` yapısı hem de eksik olan \$ işareti eklendi
const GITHUB_API_URL = `https://github.com{GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`;

const authMiddleware = (req, res, next) => {
    if (req.headers['x-auth-password'] === GIZLI_SIFRE) {
        next();
    } else {
        res.status(401).json({ error: 'Yetkisiz erişim!' });
    }
};

// Statik Dosya Gönderimleri
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'tahlil_takip.html')));
app.get('/script.js', (req, res) => res.sendFile(path.join(__dirname, 'script.js')));

// GitHub'dan Veri Çekme
app.get('/api/tahliller', authMiddleware, async (req, res) => {
    try {
        const response = await fetch(GITHUB_API_URL, {
            headers: { 
                'Authorization': `Bearer ${GITHUB_TOKEN}`, 
                'User-Agent': 'TahlilApp',
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.status === 404) return res.json([]); 
        if (!response.ok) throw new Error(`GitHub API Hatası: ${response.status}`);
        
        const data = await response.json();
        // Base64 formatındaki veriyi çözüp düz metne (string) çeviriyoruz
        const jsonString = Buffer.from(data.content, 'base64').toString('utf-8');
        res.json(JSON.parse(jsonString));
    } catch (err) {
        console.error("Veri çekilirken hata oluştu:", err.message);
        res.json([]); 
    }
});

// GitHub'a Veri Yazma
app.post('/api/tahliller', authMiddleware, async (req, res) => {
    try {
        let sha = "";
        
        // Üzerine yazma hatasını engellemek için mevcut dosyanın SHA değerini kontrol ediyoruz
        const resGet = await fetch(GITHUB_API_URL, {
            headers: { 
                'Authorization': `Bearer ${GITHUB_TOKEN}`, 
                'User-Agent': 'TahlilApp',
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (resGet.status === 200) {
            const dataGet = await resGet.json();
            sha = dataGet.sha;
        }

        // Yeni verileri Base64 biçimine kodluyoruz
        const jsonString = JSON.stringify(req.body, null, 2);
        const yeniIcerikBase64 = Buffer.from(jsonString, 'utf-8').toString('base64');

        // PUT isteğiyle dosyayı güncelliyoruz
        const resPut = await fetch(GITHUB_API_URL, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${GITHUB_TOKEN}`, 
                'Content-Type': 'application/json', 
                'User-Agent': 'TahlilApp',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: "Tahlil sonuclari guncellendi",
                content: yeniIcerikBase64,
                sha: sha !== "" ? sha : undefined
            })
        });

        if (!resPut.ok) {
            const errData = await resPut.json().catch(() => ({}));
            throw new Error(errData.message || `GitHub yazma hatası kodu: ${resPut.status}`);
        }

        res.json({ success: true });
    } catch (err) {
        console.error("Veri kaydedilirken hata oluştu:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`Sunucu aktif: http://localhost:${PORT}`));
