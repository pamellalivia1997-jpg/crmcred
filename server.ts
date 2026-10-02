import express from 'express';
import { createServer as createViteServer } from 'vite';
import { processControladoriaGoogleSheets } from './src/services/controladoriaSyncService.js';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Explicit JSON API route BEFORE Vite middleware
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

  // Vite SPA Middleware
  const vite = await createViteServer({
    server: { middlewareMode: true, port: 3000, host: '0.0.0.0' },
    appType: 'spa'
  });

  app.use(vite.middlewares);

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

startServer();
