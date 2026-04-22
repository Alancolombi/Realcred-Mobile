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
      console.log(`[Email] Iniciando tentativa de notificação para: ${user.email}`);

      if (!resend) {
        console.error('[Email] Erro: RESEND_API_KEY não configurada no ambiente.');
        return res.status(200).json({ 
          success: false, 
          error: 'API Key não configurada',
          hint: 'Adicione a RESEND_API_KEY nos Secrets do AI Studio.' 
        });
      }

      const { data, error } = await resend.emails.send({
        from: 'Realcred <onboarding@resend.dev>',
        to: ['realcred.pc@gmail.com'],
        subject: `Nova Simulação Realizada - ${user.displayName || 'Usuário'}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
            <h1 style="color: #2563eb;">Nova Simulação Recebida!</h1>
            <p>Um usuário acaba de realizar uma simulação no aplicativo Realcred Mobile.</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
              <h2 style="margin-top: 0; font-size: 18px;">Dados do Cliente:</h2>
              <p><strong>Nome:</strong> ${user.displayName || 'Não informado'}</p>
              <p><strong>Email:</strong> ${user.email || 'Não informado'}</p>
              <p><strong>ID:</strong> ${user.uid}</p>
            </div>

            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #bae6fd;">
              <h2 style="margin-top: 0; font-size: 18px; color: #0369a1;">Detalhes da Simulação:</h2>
              <p><strong>Tipo:</strong> ${simulation.type}</p>
              <p><strong>Valor:</strong> R$ ${simulation.value.toLocaleString('pt-BR')}</p>
              <p><strong>Parcelas (est.):</strong> ${simulation.installments || 12}x</p>
              <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            </div>

            <p style="font-size: 14px; color: #64748b;">Por favor, entre em contato com o cliente o mais breve possível.</p>
          </div>
        `,
      });

      if (error) {
        console.error('[Email] Erro do Resend:', error);
        return res.status(500).json({ error: error.message });
      }

      console.log('[Email] Notificação enviada com sucesso:', data?.id);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      console.error('Server error:', err);
      res.status(500).json({ error: err.message });
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
