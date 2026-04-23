export type ProposalType = 'CONSIGNADO' | 'FGTS' | 'PESSOAL' | 'CARTAO' | 'LUZ' | 'CLT';
export type ProposalStatus = 'PENDING' | 'ANALYSIS' | 'APPROVED' | 'PAID' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED';
export type DocumentType = 'RG' | 'RESIDENCE' | 'PAYSLIP';
export type DocumentStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  phone?: string;
  cpf?: string;
  role: 'client' | 'admin';
  createdAt: string;
}

export interface Proposal {
  id: string;
  userId: string;
  type: ProposalType;
  value: number;
  installments: number;
  status: ProposalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentMetadata {
  id: string;
  proposalId: string;
  userId: string;
  type: DocumentType;
  url: string;
  status: DocumentStatus;
  createdAt: string;
}
