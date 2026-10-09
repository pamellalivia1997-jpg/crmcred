import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { prepareDigisacChat, DigisacContactPayload, normalizeBrazilianPhone } from './src/services/digisacService';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // CORS Middleware allowing requests from GitHub Pages, local dev, or custom frontend origins
  app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.url}`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id, x-user-role');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

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

  // Health/status check for DigiSac configuration
  app.get('/api/digisac/status', (_req, res) => {
    const hasToken = Boolean(process.env.DIGISAC_API_TOKEN || process.env.DIGISAC_TOKEN);
    const domain = process.env.DIGISAC_WEB_DOMAIN || 'https://liviacredsaude.digisac.io';
    return res.status(200).json({
      configured: hasToken,
      domain,
      authRequired: true
    });
  });

  // Protected route: Prepare and open chat in DigiSac
  app.post('/api/digisac/chat', async (req, res) => {
    try {
      // 1. Authentication check
      const authHeader = req.headers.authorization;
      const userIdHeader = req.headers['x-user-id'];

      if (!authHeader && !userIdHeader) {
        return res.status(401).json({
          success: false,
          code: 'UNAUTHORIZED',
          error: 'Acesso negado: autenticação de usuário necessária para acessar este recurso do CRM.'
        });
      }

      // 2. Secret Token retrieval
      const apiToken = process.env.DIGISAC_API_TOKEN || process.env.DIGISAC_TOKEN;
      const targetApiUrl = process.env.DIGISAC_API_URL || 'https://liviacredsaude.digisac.io/api/v1';
      const targetWebDomain = req.body?.webDomain || process.env.DIGISAC_WEB_DOMAIN || 'https://liviacredsaude.digisac.io';

      const rawPhone = String(req.body?.telefone || '').trim();
      const phoneNorm = normalizeBrazilianPhone(rawPhone);

      if (!phoneNorm.valid || !phoneNorm.normalized) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_PHONE',
          error: phoneNorm.error || 'Telefone inválido ou incompleto.',
          fallbackUrl: `https://wa.me/?text=${encodeURIComponent(req.body?.observacoes || '')}`
        });
      }

      if (!apiToken || apiToken.trim() === '') {
        const cleanDomain = targetWebDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
        return res.status(503).json({
          success: false,
          code: 'TOKEN_NOT_CONFIGURED',
          error: 'Token da API do DigiSac não configurado nas variáveis de ambiente do servidor.',
          normalizedPhone: phoneNorm.normalized,
          fallbackUrl: `https://${cleanDomain}/contacts?search=${phoneNorm.normalized}`
        });
      }

      const payload: DigisacContactPayload = {
        nome: String(req.body?.nome || '').trim(),
        telefone: phoneNorm.normalized,
        cpf: req.body?.cpf ? String(req.body.cpf).trim() : undefined,
        convenio: req.body?.convenio ? String(req.body.convenio).trim() : undefined,
        observacoes: req.body?.observacoes ? String(req.body.observacoes).trim() : undefined,
        vendedora: req.body?.vendedora ? String(req.body.vendedora).trim() : undefined
      };

      const result = await prepareDigisacChat(payload, apiToken, targetApiUrl, targetWebDomain);

      if (!result.success) {
        return res.status(result.code === 'INVALID_PHONE' ? 400 : 502).json(result);
      }

      return res.status(200).json(result);
    } catch (err: any) {
      console.error('[DigiSac API Route] Erro interno:', err?.message || err);
      return res.status(500).json({
        success: false,
        code: 'INTERNAL_ERROR',
        error: 'Erro interno ao processar conversa no DigiSac.'
      });
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
