const express = require('express');
const fetch = require('node-fetch');
const app = express();

// Читаем реальный URL Cloudflare Worker из переменной окружения
const REAL_RELAY_URL = process.env.RELAY_URL;

if (!REAL_RELAY_URL) {
  console.error('FATAL: RELAY_URL environment variable is not set!');
  process.exit(1);
}

// Разрешаем CORS для запросов из Roblox
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Парсим JSON тело запроса
app.use(express.json());

// Проксируем все запросы на Cloudflare Worker
app.all('*', async (req, res) => {
  try {
    // Строим целевой URL: базовый URL воркера + путь из запроса
    const targetUrl = REAL_RELAY_URL + req.path;

    console.log(`Proxying ${req.method} ${req.path} -> ${targetUrl}`);

    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
      },
    };

    // Если есть тело запроса, добавляем его
    if (req.body && Object.keys(req.body).length > 0) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();

    // Прокидываем статус ответа и тип контента
    res.status(response.status);
    res.set('Content-Type', response.headers.get('Content-Type') || 'application/json');
    res.send(data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(502).json({ error: 'Proxy error', details: error.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Relay proxy listening on port ${port}`);
  console.log(`Forwarding to: ${REAL_RELAY_URL}`);
});
