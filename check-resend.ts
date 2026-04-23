import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

async function checkDomain() {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return;
  const resend = new Resend(key);
  try {
    const list = await resend.domains.list();
    console.log('Domínios no Resend:', JSON.stringify(list, null, 2));
    
    // Testar envio para um destinatário diferente também
    const testUser = 'alancolombi30@gmail.com'; // O próprio e-mail do usuário logado
    console.log(`Tentando envio de teste para: ${testUser}`);
    
    const { data, error } = await resend.emails.send({
      from: 'Realcred <notificacoes@alancolombiagencia.com.br>',
      to: [testUser],
      subject: 'Teste de Verificação de Domínio',
      html: '<p>Este é um teste para validar se a entrega está funcionando para o seu e-mail pessoal.</p>'
    });
    
    if (error) {
      console.error('Erro no envio de teste:', error);
    } else {
      console.log('Envio de teste aceito:', data);
    }
    
  } catch (e) {
    console.error('Erro ao verificar domínios:', e);
  }
}

checkDomain();
