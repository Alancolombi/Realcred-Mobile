import axios from 'axios';

export interface BankSimulationResponse {
  success: boolean;
  margin: number;
  installments: number;
  monthlyValue: number;
  isMock?: boolean;
  message?: string;
  bankRef?: string;
}

export const BankService = {
  /**
   * Realiza uma simulação real consultando a margem do cliente no banco
   */
  async simulateRealMargin(cpf: string, type: string, value: number): Promise<BankSimulationResponse> {
    try {
      const response = await axios.post('/api/bank/simulate', { cpf, type, value });
      return response.data;
    } catch (error: any) {
      console.error('Erro na simulação bancária:', error);
      throw new Error(error.response?.data?.error || 'Erro ao conectar com o servidor do banco.');
    }
  },

  /**
   * Envia a proposta definitivamente para o sistema do banco
   */
  async submitToBank(proposalId: string, userData: any): Promise<{ success: boolean; bankRef: string }> {
    try {
      const response = await axios.post('/api/bank/submit-proposal', { proposalId, user: userData });
      return response.data;
    } catch (error: any) {
      console.error('Erro ao enviar proposta ao banco:', error);
      throw new Error('Falha na integração com o sistema bancário.');
    }
  }
};
