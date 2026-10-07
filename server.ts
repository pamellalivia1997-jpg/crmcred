import express from 'express';
import path from 'path';
import fs from 'fs';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Explicit JSON API route for Google Sheets expenses proxy
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
    } catch (err) {
      console.error('Erro na rota /api/expenses/sheet:', err);
      const message = err instanceof Error ? err.message : 'Erro ao obter planilha de despesas';
      return res.status(500).json({ success: false, error: message });
    }
  });

  // Catch-all API 404 handler to ensure JSON response instead of HTML
  app.use('/api', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    return res.status(404).json({ success: false, error: `Rota API não encontrada: ${req.originalUrl}` });
  });

  const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.K_SERVICE);
  const distPath = path.resolve('dist');
  const buildPath = path.resolve('build');
  const staticPath = fs.existsSync(distPath) ? distPath : (fs.existsSync(buildPath) ? buildPath : null);

  if ((isProd || !process.env.VITE_DEV) && staticPath) {
    app.use(express.static(staticPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(staticPath, 'index.html'));
    });
  } else {
    // Vite SPA Middleware for local development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, port: 3000, host: '0.0.0.0' },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });
}

startServer();
