const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const path = require('path');

app.use(express.json());

// --- BURALARI KENDİ BİLGİLERİNİZLE DOLDURUN ---
const GIZLI_SIFRE = "123456"; 
const GITHUB_USERNAME = "stinger3838"; // <-- Buraya kendi kullanıcı adınızı yazın
const GITHUB_REPO = "tahlil-takip";               // <-- Buraya repo adınızı yazın
const GITHUB_TOKEN = "process.env.GITHUB_TOKEN";                  // <-- Buraya ghp_ ile başlayan tokenınızı yazın
// ----------------------------------------------

const authMiddleware = (req, res, next) => {
    if (req.headers['x-auth-password'] === GIZLI_SIFRE) next();
    else res.status(401).json({ error: 'Yetkisiz erişim!' });
};

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'tahlil_takip.html')));
app.get('/script.js', (req, res) => res.sendFile(path.join(__dirname, 'script.js')));

// GitHub'dan Veri Çekme
app.get('/api/tahliller', authMiddleware, async (req, res) => {
    try {
        // DÜZELTİLDİ: ://github.com adres yapısı ve dolar (\$) işaretleri eklendi
        const url = `https://://github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/tahliller.json`;
        const response = await fetch(url, {
            headers: { 
                'Authorization': `token ${GITHUB_TOKEN}`, 
                'User-Agent': 'TahlilApp',
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.status === 404) return res.json([]); 
        
        const data = await response.json();
        const jsonString = Buffer.from(data.content, 'base64').toString('utf-8');
        res.json(JSON.parse(jsonString));
    } catch (err) {
        res.json([]);
    }
});

// GitHub'a Veri Yazma
app.post('/api/tahliller', authMiddleware, async (req, res) => {
    try {
        let sha = "";
        const url = `https://://github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/tahliller.json`;
        
        const resGet = await fetch(url, {
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

        const jsonString = JSON.stringify(req.body, null, 2);
        const yeniIcerikBase64 = Buffer.from(jsonString, 'utf-8').toString('base64');

        const resPut = await fetch(url, {
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
            const errData = await resPut.ok ? {} : await resPut.json().catch(() => ({}));
            throw new Error(errData.message || `Sunucu hata kodu: ${resPut.status}`);
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`Sunucu aktif: ${PORT}`));
