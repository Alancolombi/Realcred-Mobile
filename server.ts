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
  
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

  app.use(express.json());

  // API Routes
  app.post('/api/notify-simulation', async (req, res) => {
    try {
      const { user, simulation } = req.body;
      console.log(`[Email] Iniciando tentativa de notificação para: ${user?.email || 'Desconhecido'}`);

      // Re-verificar API Key se resend estiver nulo (segurança extra para env vars injetados)
      const currentKey = process.env.RESEND_API_KEY;
      const resendClient = resend || (currentKey ? new Resend(currentKey) : null);

      if (!resendClient) {
        console.error('[Email] Erro: RESEND_API_KEY não encontrada nos Segredos do sistema.');
        return res.status(500).json({ 
          success: false, 
          error: 'Configuração ausente: RESEND_API_KEY',
          hint: 'Por favor, adicione sua chave do Resend.com nos Secrets do editor AI Studio.'
        });
      }

      // Validação básica dos dados recebidos
      if (!simulation || typeof simulation.value === 'undefined') {
        throw new Error('Dados da simulação incompletos ou inválidos.');
      }

      const formattedValue = typeof simulation.value === 'number' 
        ? simulation.value.toLocaleString('pt-BR') 
        : simulation.value;

      const { data, error } = await resendClient.emails.send({
        from: 'Realcred App <onboarding@resend.dev>',
        to: ['realcred.pc@gmail.com'],
        subject: `Nova Simulação - ${user?.displayName || 'Cliente'}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
            <div style="background-color: #2563eb; padding: 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Nova Simulação!!!</h1>
            </div>
            
            <div style="padding: 32px;">
              <p style="font-size: 16px; line-height: 1.5;">Olá Equipe Realcred,</p>
              <p style="font-size: 16px; line-height: 1.5;">Uma nova simulação de crédito foi realizada através do aplicativo mobile.</p>
              
              <div style="background-color: #f8fafc; padding: 24px; border-radius: 12px; margin: 24px 0;">
                <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Dados do Cliente</h2>
                <p style="margin: 8px 0;"><strong>Nome:</strong> ${user?.displayName || 'Não identificado'}</p>
                <p style="margin: 8px 0;"><strong>Email:</strong> ${user?.email || 'Não informado'}</p>
                <p style="margin: 8px 0; font-family: monospace; font-size: 12px; color: #64748b;"><strong>UID:</strong> ${user?.uid || 'N/A'}</p>
              </div>

              <div style="background-color: #f0f9ff; padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px solid #bae6fd;">
                <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #0369a1; border-bottom: 2px solid #bae6fd; padding-bottom: 8px;">Detalhes do Crédito</h2>
                <p style="margin: 8px 0;"><strong>Modalidade:</strong> ${simulation.type || 'N/A'}</p>
                <p style="margin: 8px 0; font-size: 20px; color: #0284c7;"><strong>Valor:</strong> R$ ${formattedValue}</p>
                <p style="margin: 8px 0;"><strong>Parcelas:</strong> ${simulation.installments || 12}x</p>
                <p style="margin: 8px 0; font-size: 14px; color: #64748b;"><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
              </div>

              <div style="text-align: center; margin-top: 32px;">
                <p style="font-size: 14px; color: #64748b;">Este é um aviso automático gerado pelo App Realcred Mobile.</p>
              </div>
            </div>
          </div>
        `,
      });

      if (error) {
        console.error('[Email] Erro retornado pelo Resend:', error);
        return res.status(500).json({ success: false, error: error.message });
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
