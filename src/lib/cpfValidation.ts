import { cpf } from 'cpf-cnpj-validator';

/**
 * Valida o formato e o checksum do CPF
 */
export const validateCPF = (value: string): boolean => {
  return cpf.isValid(value);
};

/**
 * Formata o CPF no padrão 000.000.000-00
 */
export const formatCPF = (value: string): string => {
  return cpf.format(value);
};

/**
 * Remove formatação do CPF
 */
export const stripCPF = (value: string): string => {
  return value.replace(/\D/g, '');
};

/**
 * Simula uma consulta à Receita Federal para obter a situação cadastral.
 * Em um ambiente de produção, isso chamaria um endpoint de backend que por sua vez
 * consultaria uma API oficial (Serpro, InfoSimples, etc).
 */
export const checkSituacaoCadastral = async (cpfValue: string) => {
  // Simulando chamada ao backend
  try {
    const response = await fetch('/api/validate-cpf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf: stripCPF(cpfValue) })
    });
    
    if (!response.ok) throw new Error('Erro ao consultar Receita Federal');
    
    return await response.json();
  } catch (error) {
    console.error('CPF Check Error:', error);
    return { 
      isValid: validateCPF(cpfValue), 
      situacao: 'INDISPONÍVEL', 
      error: 'Serviço de consulta offline' 
    };
  }
};
