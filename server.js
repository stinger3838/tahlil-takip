const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const path = require('path');

app.use(express.json());

// --- BURALARI KENDİ BİLGİLERİNİZLE DOLDURUN ---
const GIZLI_SIFRE = "123456"; // Giriş şifreniz
const GITHUB_USERNAME = "GITHUB_KULLANICI_ADINIZ";
const GITHUB_REPO = "tahlil-takip";
const GITHUB_TOKEN = "1.ADIMDA_ALDIĞINIZ_GHP_İLE_BAŞLAYAN_TOKEN";
// ----------------------------------------------

// Şifre kontrolü
const authMiddleware = (req, res, next) => {
    if (req.headers['x-auth-password'] === GIZLI_SIFRE) next();
    else res.status(401).json({ error: 'Yetkisiz erişim!' });
};

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'tahlil_takip.html')));
app.get('/script.js', (req, res) => res.sendFile(path.join(__dirname, 'script.js')));

// GitHub'dan Veri Çekme
app.get('/api/tahliller', authMiddleware, async (req, res) => {
    try {
        const response = await fetch(`https://github.com{GITHUB_USERNAME}/${GITHUB_REPO}/contents/tahliller.json`, {
            headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'User-Agent': 'TahlilApp' }
        });
        if (response.status === 404) return res.json([]); // Dosya henüz yoksa boş liste dön
        
        const data = await response.json();
        const jsonString = Buffer.from(data.content, 'base64').toString('utf-8');
        res.json(JSON.parse(jsonString));
    } catch (err) {
        res.json([]);
    }
});

// GitHub'a Veri Yazma (Kalıcı Kayıt - TÜRKÇE KARAKTER DÜZELTMELİ)
app.post('/api/tahliller', authMiddleware, async (req, res) => {
    try {
        let sha = "";
        const resGet = await fetch(`https://github.com{GITHUB_USERNAME}/${GITHUB_REPO}/contents/tahliller.json`, {
            headers: { 
                'Authorization': `token ${GITHUB_TOKEN}`, 
                'User-Agent': 'TahlilApp',
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (resGet.status === 200) {
            const dataGet = await resGet.json();
            sha = dataGet.sha;
        }

        // DÜZELTME: Türkçe karakterlerin byte hatası vermesini önlemek için 'utf-8' zorunlu kılındı
        const jsonString = JSON.stringify(req.body, null, 2);
        const yeniIcerikBase64 = Buffer.from(jsonString, 'utf-8').toString('base64');

        const resPut = await fetch(`https://github.com{GITHUB_USERNAME}/${GITHUB_REPO}/contents/tahliller.json`, {
            method: 'PUT',
            headers: { 
                'Authorization': `token ${GITHUB_TOKEN}`, 
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
            throw new Error(errData.message || `GitHub hata kodu: ${resPut.status}`);
        }

        res.json({ success: true });
    } catch (err) {
        console.error("Veri kaydetme hatası:", err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`Sunucu aktif: ${PORT}`));
