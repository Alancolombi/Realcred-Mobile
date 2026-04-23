import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

async function testResend() {
  const key = process.env.RESEND_API_KEY?.trim();
  console.log('Chave encontrada:', key ? `${key.substring(0, 7)}...` : 'NENHUMA');
  
  if (!key) {
    console.error('ERRO: RESEND_API_KEY não definida no ambiente.');
    return;
  }

  const resend = new Resend(key);
  try {
    const { data, error } = await resend.emails.send({
      from: 'Realcred App <notificacoes@alancolombiagencia.com.br>',
      to: ['realcred.pc@gmail.com'],
      subject: 'Teste de Conexão com Domínio Próprio - Realcred',
      html: '<p>Teste de envio direto do servidor usando o domínio alancolombiagencia.com.br.</p>'
    });

    if (error) {
      console.error('Resend Error:', JSON.stringify(error, null, 2));
    } else {
      console.log('Sucesso!', data);
    }
  } catch (e) {
    console.error('Fatal Error:', e);
  }
}

testResend();
