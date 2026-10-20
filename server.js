const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'tahliller.json');

// SADECE SİZİN BİLECEĞİNİZ ŞİFREYİ BURAYA YAZIN
const GIZLI_SIFRE = "123456"; 

app.use(express.json());

// Şifre kontrolü için ara yazılım (Middleware)
const authMiddleware = (req, res, next) => {
    const password = req.headers['x-auth-password'];
    if (password === GIZLI_SIFRE) {
        next();
    } else {
        res.status(401).json({ error: 'Yetkisiz erişim! Şifre yanlış.' });
    }
};

// HTML ve JS dosyalarını doğrudan sunmak için
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'tahlil_takip.html')));
app.get('/script.js', (req, res) => res.sendFile(path.join(__dirname, 'script.js')));

// Verileri Getir (Read)
app.get('/api/tahliller', authMiddleware, (req, res) => {
    if (!fs.existsSync(DATA_FILE)) {
        return res.json([]);
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    res.json(JSON.parse(data || '[]'));
});

// Verileri Kaydet/Güncelle (Write)
app.post('/api/tahliller', authMiddleware, (req, res) => {
    const yeniVeri = req.body;
    fs.writeFileSync(DATA_FILE, JSON.stringify(yeniVeri, null, 2), 'utf8');
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda çalışıyor...`));
