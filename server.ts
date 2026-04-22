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
        from: 'Realcred <onboarding@resend.dev>',
        to: ['realcred.pc@gmail.com'],
        subject: `Nova Proposta: ${user?.displayName || 'Cliente'}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; padding: 24px;">
            <h1 style="color: #2563eb;">Solicitação de Crédito</h1>
            <p><strong>Cliente:</strong> ${user?.displayName || 'Não informado'}</p>
            <p><strong>Email:</strong> ${user?.email || 'Não informado'}</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p><strong>Tipo:</strong> ${simulation.type || 'N/A'}</p>
            <p style="font-size: 24px; color: #0284c7;"><strong>Valor: R$ ${formattedValue}</strong></p>
            <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
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
