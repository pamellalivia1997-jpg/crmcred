import express from 'express';
import { createServer as createViteServer } from 'vite';
import { processControladoriaGoogleSheets } from './src/services/controladoriaSyncService.ts';
import path from 'path';
import fs from 'fs';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Explicit JSON API route BEFORE Vite middleware
  app.get('/api/expenses/sheet', async (_req, res) => {
    try {
      const spreadsheetId = '1MBHNJUfDSqKU0U3_4gBFHtmm524IiEa8umUWcyxcUTk';
      const csvUrl = process.env.GOOGLE_SHEETS_EXPENSES_URL || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`;
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const csvText = await response.text();
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      return res.status(200).send(csvText);
    } catch (err: any) {
      console.error('Erro na rota /api/expenses/sheet:', err);
      return res.status(500).json({ success: false, error: err.message || 'Erro ao obter planilha de despesas' });
    }
  });

  app.post('/api/controladoria/sync', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { propostas } = req.body;
      if (!propostas || !Array.isArray(propostas)) {
        return res.status(400).json({ success: false, error: 'Propostas inválidas enviadas na requisição.' });
      }

      const commissions = await processControladoriaGoogleSheets(propostas);
      return res.status(200).json({ success: true, commissions });
    } catch (err: any) {
      console.error('Erro na rota /api/controladoria/sync:', err);
      return res.status(500).json({ success: false, error: err.message || 'Erro interno ao sincronizar planilha' });
    }
  });

  // Catch-all API 404 handler to ensure JSON response instead of HTML
  app.use('/api', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    return res.status(404).json({ success: false, error: `Rota API não encontrada: ${req.originalUrl}` });
  });

  const isProd = process.env.NODE_ENV === 'production';
  const distPath = path.resolve('dist');

  if (isProd && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Vite SPA Middleware for development
    const vite = await createViteServer({
      server: { middlewareMode: true, port: 3000, host: '0.0.0.0' },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

startServer();
