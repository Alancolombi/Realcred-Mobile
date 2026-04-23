import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  // Log de inicialização para verificar variáveis de ambiente
  console.log('[Server] Verificando RESEND_API_KEY...');
  if (process.env.RESEND_API_KEY) {
    const key = process.env.RESEND_API_KEY.trim();
    console.log(`[Server] Chave encontrada! Começa com: ${key.substring(0, 7)}...`);
  } else {
    console.warn('[Server] AVISO: RESEND_API_KEY não foi encontrada nas variáveis de ambiente na inicialização.');
  }

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY.trim()) : null;

  app.use(express.json());

  // Debug Route
  app.get('/api/debug-email', (req, res) => {
    const key = process.env.RESEND_API_KEY;
    res.json({
      resendInitialized: !!resend,
      envKeyFound: !!key,
      keyPrefix: key ? `${key.substring(0, 7)}...` : 'not found',
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  });

  // API Routes
  app.post('/api/notify-simulation', async (req, res) => {
    try {
      const { user, simulation } = req.body;
      console.log(`[Email] Iniciando tentativa de notificação para: ${user?.email || 'Desconhecido'}`);

      // Re-verificar API Key se resend estiver nulo
      const currentKey = process.env.RESEND_API_KEY?.trim();
      const resendClient = resend || (currentKey ? new Resend(currentKey) : null);

      if (!resendClient) {
        console.error('[Email] Erro: RESEND_API_KEY está vazia ou nula.');
        return res.status(200).json({ 
          success: false, 
          error: 'Chave de API não configurada',
          detail: 'Verifique se a variável RESEND_API_KEY foi adicionada aos Secrets do AI Studio.' 
        });
      }

      // Validação básica dos dados recebidos
      if (!simulation || typeof simulation.value === 'undefined') {
        throw new Error('Dados da simulação incompletos.');
      }

      const formattedValue = typeof simulation.value === 'number' 
        ? simulation.value.toLocaleString('pt-BR') 
        : simulation.value;

      console.log(`[Email] Tentando enviar para realcred.pc@gmail.com com key: ${currentKey?.substring(0, 7)}...`);

      const { data, error } = await resendClient.emails.send({
        from: 'Realcred App <notificacoes@alancolombiagencia.com.br>',
        to: ['realcred.pc@gmail.com'],
        subject: `Nova Proposta: ${user?.displayName || 'Cliente'}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
            <div style="background-color: #2563eb; padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: -0.025em;">Nova Solicitação de Crédito</h1>
            </div>
            
            <div style="padding: 32px; background-color: #ffffff;">
              <p style="font-size: 16px; line-height: 1.5; color: #475569;">Olá Equipe Realcred,</p>
              <p style="font-size: 16px; line-height: 1.5; color: #475569;">Uma nova simulação foi finalizada no aplicativo. Confira os detalhes abaixo:</p>
              
              <div style="background-color: #f8fafc; padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px solid #f1f5f9;">
                <h2 style="margin: 0 0 16px 0; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Dados do Cliente</h2>
                <p style="margin: 8px 0; font-size: 16px;"><strong>Nome:</strong> ${user?.displayName || 'Não identificado'}</p>
                <p style="margin: 8px 0; font-size: 16px;"><strong>Email:</strong> ${user?.email || 'Não informado'}</p>
              </div>

              <div style="background-color: #f0f9ff; padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px solid #e0f2fe;">
                <h2 style="margin: 0 0 16px 0; font-size: 14px; color: #0369a1; text-transform: uppercase; letter-spacing: 0.05em;">Detalhes da Proposta</h2>
                <p style="margin: 8px 0; font-size: 16px;"><strong>Modalidade:</strong> ${simulation.type || 'N/A'}</p>
                <p style="margin: 8px 0; font-size: 24px; color: #2563eb;"><strong>Valor: R$ ${formattedValue}</strong></p>
                <p style="margin: 8px 0; font-size: 14px; color: #64748b;"><strong>Data:</strong> ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
              </div>

              <div style="text-align: center; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 24px;">
                <p style="font-size: 12px; color: #94a3b8; margin: 0;">Este é um aviso automático do Sistema Realcred.</p>
              </div>
            </div>
          </div>
        `,
      });

      if (error) {
        console.error('[Email] Resend retornou erro:', JSON.stringify(error));
        return res.status(200).json({ success: false, error: error.message, detail: error });
      }

      console.log(`[Email] Sucesso! Notificação enviada. ID: ${data?.id}`);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      console.error('[Email] Erro fatal no servidor:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
