const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const respuestasRouter = require('./routes/respuestas');

const app = express();
const PORT = process.env.PORT || 3000;
const frontendPath = path.resolve(__dirname, '../frontend');

app.use(
  cors({
    origin: true,
    credentials: false
  })
);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'lingodate-encuesta-api' });
});

app.use('/', respuestasRouter);
app.use(express.static(frontendPath));

app.get('/', (_req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
});
