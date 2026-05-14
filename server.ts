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
  app.post('/api/validate-cpf', async (req, res) => {
    try {
      const { cpf: cpfValue } = req.body;
      
      if (!cpfValue || cpfValue.length !== 11) {
        return res.status(400).json({ isValid: false, error: 'CPF inválido' });
      }

      // IMPORTANTE: Em produção, você usaria uma API real aqui (Ex: Serpro, InfoSimples, Hubla)
      // Exemplo com InfoSimples (necessita KEY):
      // const response = await axios.get(`https://api.infosimples.com/api/v2/consultar/receita-federal/cpf?token=${process.env.INFOSIMPLES_TOKEN}&cpf=${cpfValue}`);
      
      // Para este app, vamos realizar a validação matemática e simular a "Situação Cadastral"
      // como sendo REGULAR se o checksum estiver correto.
      
      const { cpf } = await import('cpf-cnpj-validator');
      const isValid = cpf.isValid(cpfValue);

      if (!isValid) {
        return res.json({ 
          isValid: false, 
          situacao: 'INVÁLIDO',
          nome_rfb: null,
          mensagem: 'O CPF informado não possui um formato ou dígito verificador válido.'
        });
      }

      // Simulação de retorno da Receita Federal
      // Nota: CPFs que começam com "000" ou terminam com "00" poderiam simular casos especiais se desejado
      res.json({
        isValid: true,
        cpf: cpf.format(cpfValue),
        nome_rfb: 'NOME OCULTO (SIMULAÇÃO RFB)', // APIs reais retornam o nome completo
        situacao: 'REGULAR', // REGULAR, SUSPENSA, CANCELADA, TITULAR FALECIDO
        data_consulta: new Date().toISOString(),
        fonte: 'Simulação Receita Federal via API Realcred'
      });
      
    } catch (err: any) {
      console.error('[CPF] Erro na validação:', err);
      res.status(500).json({ success: false, error: 'Erro interno ao validar CPF' });
    }
  });

  app.post('/api/notify-simulation', async (req, res) => {
    try {
      console.log('[Email] Recebido POST em /api/notify-simulation');
      console.log('[Email] Body:', JSON.stringify(req.body, null, 2));
      
      const { user, simulation } = req.body;
      
      if (!user) {
        console.error('[Email] Erro: Dados do usuário ausentes no body.');
        return res.status(400).json({ success: false, error: 'Dados do usuário ausentes' });
      }

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
        console.error('[Email] Erro: Dados da simulação incompletos.');
        return res.status(400).json({ success: false, error: 'Dados da simulação incompletos' });
      }

      const rawValue = simulation.value;
      const formattedValue = typeof rawValue === 'number' 
        ? rawValue.toLocaleString('pt-BR') 
        : rawValue;

      let dateString;
      try {
        dateString = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      } catch (e) {
        dateString = new Date().toISOString();
      }

      console.log(`[Email] Tentando enviar notificação. Remetente: notificacoes@alancolombiagencia.com.br`);

      const { data, error } = await resendClient.emails.send({
        from: 'Realcred <notificacoes@alancolombiagencia.com.br>',
        to: ['realcred.pc@gmail.com'],
        bcc: ['alancolombi30@gmail.com'], // Enviar cópia oculta para o seu e-mail pessoal para teste
        subject: `Nova Proposta Realcred - ${user.displayName || 'Cliente'}`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #2563eb;">Nova Solicitação de Crédito</h2>
            <p><strong>Nome:</strong> ${user.displayName || 'Não informado'}</p>
            <p><strong>E-mail do Cliente:</strong> ${user.email || 'Não informado'}</p>
            <hr />
            <p><strong>Modalidade:</strong> ${simulation.type || 'N/A'}</p>
            <p style="font-size: 20px;"><strong>Valor: R$ ${formattedValue}</strong></p>
            <p><strong>Data da Solicitação:</strong> ${dateString}</p>
            <br />
            <p style="font-size: 12px; color: #666;">Notificação automática via alancolombiagencia.com.br</p>
          </div>
        `,
      });

      if (error) {
        console.error('[Email] Resend retornou erro:', JSON.stringify(error));
        return res.status(200).json({ success: false, error: error.message, detail: error });
      }

      console.log(`[Email] Sucesso! ID do Envio: ${data?.id}`);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      console.error('[Email] Erro interno crítico:', err);
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
