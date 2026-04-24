import React, { useState, useEffect } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  useNavigate,
  Link,
  useLocation
} from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  Timestamp,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { User as AppUser, Proposal, ProposalStatus } from './types';
import { 
  LayoutDashboard, 
  Calculator, 
  FileText, 
  User as UserIcon, 
  LogOut,
  Bell,
  MessageSquare,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Menu,
  X,
  HelpCircle,
  BookOpen,
  Info,
  ChevronDown,
  Trash2,
  Filter,
  Search,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

const WHATSAPP_NUMBER = '5527999018502';

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' }>(
  ({ className, variant = 'primary', ...props }, ref) => {
    const variants = {
      primary: 'bg-brand-blue text-white hover:opacity-90 shadow-sm',
      secondary: 'bg-brand-orange text-white hover:opacity-90 shadow-sm',
      outline: 'border border-gray-300 bg-transparent hover:bg-gray-50 text-gray-700',
      ghost: 'bg-transparent hover:bg-gray-100 text-gray-600',
    };
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

const Card = ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={cn('bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden', className)}
  >
    {children}
  </div>
);

const Badge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-100',
    ANALYSIS: 'bg-brand-blue/10 text-brand-blue border-brand-blue/20',
    APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    PAID: 'bg-brand-blue/10 text-brand-blue border-brand-blue/20',
    REJECTED: 'bg-rose-50 text-rose-700 border-rose-100',
    IN_PROGRESS: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    COMPLETED: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  };

  const labels: Record<string, string> = {
    PAID: 'PAGO',
    ANALYSIS: 'EM ANÁLISE',
    APPROVED: 'APROVADO',
    REJECTED: 'REPROVADO',
    PENDING: 'PENDENTE',
    IN_PROGRESS: 'EM ANDAMENTO',
    COMPLETED: 'ATENDIDO'
  };

  return (
    <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border', styles[status] || styles.PENDING)}>
      {labels[status] || 'PENDENTE'}
    </span>
  );
};

// --- Pages ---

const Login = () => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      await signInWithPopup(auth, provider);
      // O onAuthStateChanged no App.tsx cuidará do restante (carregamento/persistência)
    } catch (error: any) {
      console.error('Login error:', error);
      setIsLoggingIn(false);
      if (error.code === 'auth/popup-blocked') {
        alert('O login foi bloqueado pelo seu navegador. Por favor, habilite popups ou abra o aplicativo em uma nova aba para entrar.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        // Ignorar
      } else {
        alert('Erro ao entrar: ' + error.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <div className="mb-8 inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-brand-blue text-white shadow-xl shadow-brand-blue/20">
          <ShieldCheck size={40} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Realcred Mobile</h1>
        <p className="text-slate-500 mb-10">Sua plataforma digital de crédito rápido, seguro e transparente.</p>
        
        <Button 
          onClick={handleLogin} 
          disabled={isLoggingIn}
          className="w-full py-4 text-lg gap-3" 
          variant="primary"
        >
          {isLoggingIn ? (
            <>
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
              />
              Entrando...
            </>
          ) : (
            'Entrar com Google'
          )}
        </Button>
        
        <p className="mt-8 text-xs text-slate-400">
          Ao entrar, você concorda com nossos Termos de Uso e Política de Privacidade.
        </p>
      </motion.div>
    </div>
  );
};

const Dashboard = ({ user }: { user: AppUser }) => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const proposalsRef = collection(db, 'proposals');
    // Adição: Admin vê todas as propostas no dashboard também
    const q = user.role === 'admin'
      ? query(proposalsRef, orderBy('createdAt', 'desc'))
      : query(proposalsRef, where('userId', '==', user.uid), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const proposalsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Proposal[];
      setProposals(proposalsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.uid, user.role]);

  const totalRequested = proposals.reduce((acc, p) => acc + (Number(p.value) || 0), 0);
  const paidProposalsCount = proposals.filter(p => p.status === 'PAID').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-3 border-brand-blue border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Olá, {user.displayName?.split(' ')[0]}</h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-slate-500">Acompanhe as solicitações</p>
            {user.role === 'admin' && (
              <span className="bg-brand-blue text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider animate-pulse">
                Modo Admin
              </span>
            )}
          </div>
        </div>
        <button className="relative p-2 text-slate-400 hover:text-brand-blue transition-colors">
          <Bell size={24} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-brand-orange rounded-full border-2 border-white"></span>
        </button>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 bg-brand-blue text-white border-none">
          <TrendingUp size={20} className="mb-2 opacity-80" />
          <div className="text-2xl font-bold">R$ {totalRequested.toLocaleString('pt-BR')}</div>
          <div className="text-[10px] uppercase font-bold opacity-70">Crédito Solicitado</div>
        </Card>
        <Card className="p-4 bg-brand-orange text-white border-none">
          <CheckCircle2 size={20} className="mb-2 opacity-80" />
          <div className="text-2xl font-bold">{paidProposalsCount}</div>
          <div className="text-[10px] uppercase font-bold opacity-70">Proposta{paidProposalsCount !== 1 ? 's' : ''} Paga{paidProposalsCount !== 1 ? 's' : ''}</div>
        </Card>
      </div>

      {/* Active Proposals */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800">Propostas Recentes</h3>
          <Link to="/proposals" className="text-xs font-bold text-brand-blue hover:underline">Ver todas</Link>
        </div>
        <div className="space-y-3">
          {proposals.length === 0 ? (
            <Card className="p-8 text-center bg-slate-50 border-dashed">
              <p className="text-slate-400 text-sm">Você ainda não possui propostas.</p>
              <Link to="/new-proposal">
                <Button variant="outline" className="mt-4 text-xs font-bold">Criar Primeira Proposta</Button>
              </Link>
            </Card>
          ) : (
            proposals.slice(0, 3).map((p) => (
              <Card key={p.id} className="p-4 flex items-center justify-between hover:border-brand-blue/20 transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center",
                    p.type === 'FGTS' ? "bg-brand-orange/10 text-brand-orange" : "bg-brand-blue/10 text-brand-blue"
                  )}>
                    <FileText size={24} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 truncate text-sm">
                      {p.type === 'FGTS' ? 'Antecipação FGTS' : 
                       p.type === 'CONSIGNADO' ? 'Consignado INSS' : 
                       p.type === 'PESSOAL' ? 'Crédito Pessoal' : 
                       p.type === 'CLT' ? 'Crédito CLT' : p.type}
                    </div>
                    {user.role === 'admin' && (
                      <div className="text-[10px] text-slate-400 font-bold truncate">
                        {(p as any).userName || 'Cliente'} • {(p as any).userEmail || ''}
                      </div>
                    )}
                    <div className="text-xs text-slate-500 mt-0.5">
                      R$ {p.value.toLocaleString('pt-BR')} • {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge status={p.status} />
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h3 className="font-bold text-slate-800 mb-4">O que você precisa hoje?</h3>
        <div className="grid grid-cols-2 gap-4">
          <Link to="/new-proposal" className="block">
            <Card className="p-4 h-full flex flex-col items-center text-center gap-2 hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center">
                <Calculator size={20} />
              </div>
              <span className="text-xs font-bold text-slate-700">Solicitar Crédito</span>
            </Card>
          </Link>
          <button onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank')} className="block">
            <Card className="p-4 h-full flex flex-col items-center text-center gap-2 hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center">
                <MessageSquare size={20} />
              </div>
              <span className="text-xs font-bold text-slate-700">Falar com Consultor</span>
            </Card>
          </button>
        </div>
      </section>

      {/* Observation Notice */}
      <div className="flex items-center gap-2 px-2 py-3 bg-slate-100/50 rounded-xl border border-slate-200/50">
        <Info size={14} className="text-slate-400 shrink-0" />
        <p className="text-[10px] text-slate-500 font-medium leading-tight">
          Obs: Os valores apresentados nas simulações podem sofrer alterações conforme a análise de crédito individual.
        </p>
      </div>
    </div>
  );
};

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Card className="mb-3 border-none shadow-[0_2px_10px_rgba(0,0,0,0.03)] focus-within:ring-2 focus-within:ring-brand-blue/20">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-left focus:outline-none"
      >
        <span className="font-bold text-slate-700 text-sm">{question}</span>
        <ChevronDown size={18} className={cn("text-slate-400 transition-transform duration-300", isOpen && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 text-xs text-slate-500 leading-relaxed border-t border-slate-50 mt-2">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

const Help = () => {
  const faqs = [
    {
      category: 'Crédito e Modalidades',
      items: [
        { q: 'O que é a Antecipação do Saque-Aniversário?', a: 'É uma modalidade onde você antecipa o valor do seu FGTS sem precisar esperar o mês do seu aniversário. Na Realcred, antecipamos até 10 parcelas com taxas competitivas e desconto direto no saldo.' },
        { q: 'Quais os documentos para o Consignado INSS?', a: 'Geralmente solicitamos RG ou CNH (frente e verso), comprovante de residência atualizado (últimos 90 dias) e o extrato de pagamento do benefício disponível no portal Meu INSS.' },
        { q: 'Quanto tempo leva para o dinheiro cair na conta?', a: 'Após a aprovação e formalização digital, o crédito costuma ser liberado entre 30 minutos e 24 horas úteis, dependendo da modalidade e do banco.' }
      ]
    },
    {
      category: 'Uso do Aplicativo',
      items: [
        { q: 'Como funciona o Simulador?', a: 'Basta selecionar a modalidade, ajustar o valor e o prazo. O simulador calculará automaticamente o valor estimado das parcelas e o custo total com base nas taxas vigentes.' }
      ]
    }
  ];

  const tutorials = [
    { title: 'Primeiro Acesso', desc: 'Conheça seu novo dashboard', icon: LayoutDashboard },
    { title: 'Como Simular', desc: 'Entenda taxas e prazos', icon: Calculator }
  ];

  return (
    <div className="space-y-6 pb-20">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Ajuda & Suporte</h2>
        <p className="text-sm text-slate-500">Encontre respostas e aprenda a usar a Realcred</p>
      </header>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={20} className="text-brand-blue" />
          <h3 className="font-bold text-slate-800">Tutoriais em Vídeo</h3>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2">
          {tutorials.map((t, i) => (
            <Card key={i} className="min-w-[180px] p-4 flex flex-col gap-4 shrink-0 hover:border-brand-blue/30 transition-colors cursor-pointer group">
              <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center group-hover:bg-brand-blue group-hover:text-white transition-colors">
                <t.icon size={24} />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900">{t.title}</div>
                <div className="text-[11px] text-slate-500 leading-tight mt-1">{t.desc}</div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <HelpCircle size={20} className="text-brand-blue" />
          <h3 className="font-bold text-slate-800">Perguntas Frequentes</h3>
        </div>
        
        {faqs.map((group, idx) => (
          <div key={idx} className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{group.category}</h4>
            {group.items.map((faq, i) => (
              <FAQItem key={i} question={faq.q} answer={faq.a} />
            ))}
          </div>
        ))}
      </section>

      <Card className="p-6 bg-brand-blue text-white border-none relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
        <div className="relative z-10 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
            <MessageSquare size={32} className="text-white" />
          </div>
          <div>
            <h4 className="font-bold text-lg">Ainda precisa de ajuda?</h4>
            <p className="text-sm opacity-90 leading-relaxed px-4">Nossa equipe de especialistas está offline agora, mas você pode deixar uma mensagem no WhatsApp.</p>
          </div>
          <Button 
            variant="secondary" 
            className="w-full shadow-lg shadow-black/20"
            onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank')}
          >
            Falar com Especialista
          </Button>
        </div>
      </Card>
    </div>
  );
};

const Simulator = () => {
  const [type, setType] = useState('FGTS');
  const [amount, setAmount] = useState(1000);
  const [installments, setInstallments] = useState(12);

  const maxInstallments: Record<string, number> = {
    FGTS: 60,
    CONSIGNADO: 96,
    PESSOAL: 36,
    CARTAO: 18,
    LUZ: 24,
    CLT: 48,
  };

  const currentMax = maxInstallments[type] || 84;

  useEffect(() => {
    if (installments > currentMax) {
      setInstallments(currentMax);
    }
  }, [type, currentMax, installments]);

  const calculateResult = () => {
    const rates: Record<string, number> = {
      FGTS: 0.0199,
      CONSIGNADO: 0.0185,
      PESSOAL: 0.0295,
      CARTAO: 0.0295,
      LUZ: 0.0295,
      CLT: 0.0295,
    };
    const rate = rates[type] || 0.02;
    const total = amount * (1 + rate * installments);
    const monthly = total / installments;
    return { monthly, total };
  };

  const handleSimulatorWhatsApp = () => {
    const typeLabels: Record<string, string> = {
      FGTS: 'Antecipação FGTS',
      CONSIGNADO: 'Consignado INSS',
      PESSOAL: 'Crédito Pessoal',
      CARTAO: 'Saque Cartão',
      LUZ: 'Crédito na Luz',
      CLT: 'Crédito CLT'
    };
    const text = `Olá! Fiz uma simulação no App Realcred:\n\n*Modalidade:* ${typeLabels[type]}\n*Valor:* R$ ${amount.toLocaleString('pt-BR')}\n*Prazo:* ${installments} meses\n\nGostaria de prosseguir com a contratação!`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const { monthly, total } = calculateResult();

  return (
    <div className="space-y-6 pb-20">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Simulador Inteligente</h2>
        <p className="text-sm text-slate-500">Escolha a melhor modalidade para você</p>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {[
          { id: 'FGTS', label: 'FGTS' },
          { id: 'CONSIGNADO', label: 'INSS' },
          { id: 'PESSOAL', label: 'Pessoal' },
          { id: 'CARTAO', label: 'Cartão' },
          { id: 'LUZ', label: 'Luz' },
          { id: 'CLT', label: 'CLT' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setType(t.id)}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all",
              type === t.id ? "bg-brand-blue text-white shadow-md" : "bg-white text-slate-500 border border-slate-200"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card className="p-6 space-y-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-slate-700">Valor Desejado</label>
            <span className="text-lg font-bold text-brand-blue">R$ {amount.toLocaleString('pt-BR')}</span>
          </div>
          <input 
            type="range" 
            min="500" 
            max="50000" 
            step="100" 
            value={amount} 
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-blue"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-bold">
            <span>R$ 500</span>
            <span>R$ 50.000</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-slate-700">Prazo (Meses)</label>
            <span className="text-lg font-bold text-brand-blue">{installments}x</span>
          </div>
          <input 
            type="range" 
            min="1" 
            max={currentMax} 
            step="1" 
            value={installments} 
            onChange={(e) => setInstallments(Number(e.target.value))}
            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-blue"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-bold">
            <span>1 mês</span>
            <span>{currentMax} meses</span>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-slate-900 text-white border-none shadow-xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-xs font-bold opacity-60 uppercase tracking-widest mb-1">Parcela Estimada</div>
            <div className="text-3xl font-bold">R$ {monthly.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="bg-brand-blue/20 p-2 rounded-xl">
            <TrendingUp size={24} className="text-brand-accent" />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
          <div>
            <div className="text-[10px] font-bold opacity-50 uppercase mb-1">Total a Pagar</div>
            <div className="text-sm font-bold">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold opacity-50 uppercase mb-1">Taxa de Juros</div>
            <div className="text-sm font-bold text-brand-orange">
              {['PESSOAL', 'CARTAO', 'LUZ', 'CLT'].includes(type) ? 'A partir de ' : ''}
              {type === 'CONSIGNADO' ? '1,85%' : '1,99%'} a.m.
            </div>
          </div>
        </div>
      </Card>

      <Button className="w-full py-4 text-lg" variant="secondary" onClick={handleSimulatorWhatsApp}>
        Solicitar Agora
      </Button>
      
      <div className="flex items-center gap-2 justify-center text-slate-400">
        <ShieldCheck size={16} />
        <span className="text-[10px] font-medium">Simulação segura e sem compromisso</span>
      </div>
    </div>
  );
};

const ProposalFlow = ({ user }: { user: AppUser }) => {
  const [step, setStep] = useState(1);
  const [type, setType] = useState('FGTS');
  const [amount, setAmount] = useState(1000);
  const [phone, setPhone] = useState(user.phone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const sanitizePhone = (p: string) => {
    const cleaned = p.replace(/\D/g, '');
    if (cleaned.length === 0) return '';
    if (cleaned.length <= 11 && !cleaned.startsWith('55')) {
      return '55' + cleaned;
    }
    return cleaned;
  };

  const handleSubmitProposal = async () => {
    const sanitizedPhone = sanitizePhone(phone);
    if (!sanitizedPhone || sanitizedPhone.length < 10) {
      alert('Por favor, informe seu número de WhatsApp com DDD');
      setStep(1.5);
      return;
    }

    try {
      setIsSubmitting(true);
      
      if (sanitizedPhone && sanitizedPhone !== user.phone) {
        await updateDoc(doc(db, 'users', user.uid), { phone: sanitizedPhone });
      }

      const proposalData = {
        userId: user.uid,
        userName: user.displayName,
        userEmail: user.email,
        userPhone: sanitizedPhone,
        type,
        value: amount,
        installments: 12,
        status: 'ANALYSIS',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'proposals'), proposalData);

      // Notificar via WhatsApp
      const typeLabels: Record<string, string> = {
        FGTS: 'Antecipação FGTS',
        CONSIGNADO: 'Consignado INSS',
        PESSOAL: 'Crédito Pessoal',
        CLT: 'Crédito CLT',
        CARTAO: 'Cartão de Crédito',
        LUZ: 'Energia'
      };
      const messageBody = `Olá! Acabei de enviar uma proposta pelo App Realcred:\n\n*Cliente:* ${user.displayName || 'Não informado'}\n*Telefone:* ${sanitizedPhone}\n*Modalidade:* ${typeLabels[type] || type}\n*Valor:* R$ ${amount.toLocaleString('pt-BR')}\n\nFico no aguardo do contato para finalizar!`;
      
      // Abrir WhatsApp com destino ao Gestor
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(messageBody)}`, '_blank');
      
      setStep(3);
    } catch (error) {
      console.error('Error submitting proposal:', error);
      alert('Erro ao enviar proposta. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    navigate('/');
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <button onClick={() => step > 1 ? setStep(step - 1) : navigate('/')} className="p-2 -ml-2 text-slate-400 hover:text-brand-blue">
          <ChevronRight size={24} className="rotate-180" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Nova Solicitação</h2>
          <div className="flex gap-1 mt-1">
            {[1, 2, 3].map(s => (
              <div key={s} className={cn("h-1 rounded-full flex-1", s <= step ? "bg-brand-blue" : "bg-slate-200")} />
            ))}
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h3 className="font-bold text-slate-800">Qual modalidade você prefere?</h3>
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'FGTS', label: 'Antecipação FGTS', desc: 'Receba até 10 parcelas do seu saque-aniversário.' },
                { id: 'CONSIGNADO', label: 'Consignado INSS', desc: 'As melhores taxas para aposentados e pensionistas.' },
                { id: 'PESSOAL', label: 'Empréstimo Pessoal', desc: 'Dinheiro na conta rápido e sem burocracia.' },
                { id: 'CLT', label: 'Crédito CLT', desc: 'Aqui está seu direito ao crédito do trabalhador.' },
              ].map(t => (
                <Card 
                  key={t.id} 
                  className={cn(
                    "p-4 cursor-pointer border-2 transition-all",
                    type === t.id ? "border-brand-blue bg-brand-blue/5" : "border-transparent hover:border-slate-200"
                  )}
                  onClick={() => setType(t.id)}
                >
                  <div className="font-bold text-slate-900">{t.label}</div>
                  <div className="text-xs text-slate-500">{t.desc}</div>
                </Card>
              ))}
            </div>
            <Button className="w-full py-4 mt-4" onClick={() => setStep(1.5)}>Próximo Passo</Button>
          </motion.div>
        )}

        {step === 1.5 && (
          <motion.div 
            key="step1.5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <h3 className="font-bold text-slate-800">Seu contato para retorno</h3>
            <Card className="p-6 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Seu WhatsApp</label>
                  <input 
                    type="tel" 
                    placeholder="(00) 00000-0000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all font-mono"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 mt-2">
                    Nossos consultores entrarão em contato através deste número.
                  </p>
                </div>
              </div>
            </Card>
            <Button className="w-full py-4" onClick={() => setStep(2)}>Confirmar e Continuar</Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <h3 className="font-bold text-slate-800">Quanto você precisa?</h3>
            <Card className="p-6 space-y-4">
              <div className="text-center">
                <div className="text-xs font-bold text-slate-400 uppercase mb-2">Valor Solicitado</div>
                <div className="text-4xl font-bold text-brand-blue">R$ {amount.toLocaleString('pt-BR')}</div>
              </div>
              <input 
                type="range" 
                min="500" 
                max="20000" 
                step="100" 
                value={amount} 
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-blue"
              />
            </Card>
            <Button 
              className="w-full py-4" 
              onClick={handleSubmitProposal}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                  />
                  Enviando Solicitação...
                </>
              ) : (
                "Solicitar Agora"
              )}
            </Button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <h3 className="font-bold text-slate-800 text-center">Tudo pronto!</h3>
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-brand-orange/10 text-brand-orange rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={40} />
              </div>
              <p className="text-slate-600">Sua proposta de <strong>{type}</strong> no valor de <strong>R$ {amount.toLocaleString('pt-BR')}</strong> foi enviada para análise.</p>
            </div>
            
            <Card className="p-4 bg-brand-blue/5 border-brand-blue/10 flex items-start gap-3">
              <AlertCircle size={20} className="text-brand-blue shrink-0 mt-0.5" />
              <p className="text-xs text-brand-blue leading-relaxed font-medium">
                Nossos consultores entrarão em contato via WhatsApp em até 15 minutos para finalizar o processo.
              </p>
            </Card>

            <div className="flex flex-col gap-3">
              <Button className="w-full py-4" variant="secondary" onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank')}>
                <MessageSquare size={18} className="mr-2" /> Falar no WhatsApp
              </Button>
              <Button variant="ghost" className="w-full text-slate-400" onClick={handleFinish}>Voltar ao Início</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Proposals = ({ user }: { user: AppUser }) => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }, []);

  const sendNotification = (title: string, body: string) => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.log('Audio blocked', e));
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          body,
          icon: 'https://cdn-icons-png.flaticon.com/512/2830/2830284.png',
          badge: 'https://cdn-icons-png.flaticon.com/512/2830/2830284.png',
          vibrate: [200, 100, 200],
          tag: 'realcred-update',
          renotify: true
        } as any);
      });
    } else if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  };

  useEffect(() => {
    const proposalsRef = collection(db, 'proposals');
    const q = user.role === 'admin' 
      ? query(proposalsRef, orderBy('createdAt', 'desc'))
      : query(proposalsRef, where('userId', '==', user.uid), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const proposalsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Proposal[];
      
      if (user.role === 'admin' && !loading) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data() as Proposal;
            sendNotification(
              "Realcred: Nova Simulação!", 
              `Nova proposta de ${(data as any).userName || 'Cliente'} (R$ ${data.value.toLocaleString('pt-BR')})`
            );
          }
        });
      }
      
      setProposals(proposalsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.uid, user.role, loading]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta proposta?')) return;
    try {
      setIsDeleting(id);
      await deleteDoc(doc(db, 'proposals', id));
    } catch (err) {
      alert('Erro ao excluir proposta.');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleUpdateStatus = async (id: string, status: ProposalStatus) => {
    try {
      await updateDoc(doc(db, 'proposals', id), { status, updatedAt: new Date().toISOString() });
    } catch (err) {
      alert('Erro ao atualizar status.');
    }
  };

  const requestNotificationPermission = () => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  };

  const filteredProposals = proposals.filter(p => {
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const matchesSearch = !searchQuery || 
      (p as any).userName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (p as any).userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-3 border-brand-blue border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {user.role === 'admin' ? 'Gestão' : 'Minhas Propostas'}
            </h2>
            <p className="text-sm text-slate-500">
              {user.role === 'admin' 
                ? `${filteredProposals.length} registros encontrados.` 
                : 'Histórico de todas as suas solicitações.'}
            </p>
          </div>
          {user.role === 'admin' && (
            <div className="flex gap-2">
              <button 
                onClick={() => sendNotification("Realcred: Teste de Notificação", "As notificações estão funcionando corretamente!")}
                className="p-2 text-slate-400 hover:text-brand-orange bg-white rounded-xl border border-slate-100 shadow-sm"
                title="Testar Notificação"
              >
                <RotateCcw size={20} />
              </button>
              <button 
                onClick={requestNotificationPermission}
                className={cn(
                  "p-2 rounded-xl border shadow-sm transition-all flex items-center gap-2",
                  "Notification" in window && Notification.permission === "granted"
                    ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                    : "text-slate-400 bg-white border-slate-100 hover:text-brand-blue"
                )}
                title={ "Notification" in window && Notification.permission === "granted" ? "Notificações Ativas" : "Ativar Notificações" }
              >
                <Bell size={20} />
                <span className="text-[10px] font-bold">
                  {"Notification" in window && Notification.permission === "granted" ? "ATIVAS" : "ATIVAR"}
                </span>
              </button>
            </div>
          )}
        </div>

        {user.role === 'admin' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar por nome, e-mail ou ID..."
                className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-brand-blue/20 outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {[
                { id: 'ALL', label: 'Todos' },
                { id: 'PENDING', label: 'Pendente' },
                { id: 'ANALYSIS', label: 'Análise' },
                { id: 'IN_PROGRESS', label: 'Andamento' },
                { id: 'APPROVED', label: 'Aprovado' },
                { id: 'COMPLETED', label: 'Atendido' },
                { id: 'REJECTED', label: 'Recusado' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap border transition-all",
                    statusFilter === f.id 
                      ? "bg-brand-blue text-white border-brand-blue" 
                      : "bg-white text-slate-500 border-slate-200"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <div className="space-y-4">
        {filteredProposals.length === 0 ? (
          <Card className="p-12 text-center bg-slate-50 border-dashed">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <FileText size={32} />
            </div>
            <p className="text-slate-400 text-sm font-medium">Nenhuma proposta encontrada.</p>
          </Card>
        ) : (
          filteredProposals.map((p) => (
            <Card key={p.id} className="overflow-visible border-slate-100/60 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <Badge status={p.status} />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider font-mono">
                      #{p.id.slice(-6)}
                    </span>
                    {user.role === 'admin' && (
                      <button 
                        onClick={() => handleDelete(p.id)}
                        disabled={isDeleting === p.id}
                        className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                    p.type === 'FGTS' ? "bg-brand-orange/10 text-brand-orange" : "bg-brand-blue/10 text-brand-blue"
                  )}>
                    <FileText size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 truncate uppercase text-xs">
                      {p.type === 'FGTS' ? 'Antecipação FGTS' : 
                       p.type === 'CONSIGNADO' ? 'Consignado INSS' : 
                       p.type === 'PESSOAL' ? 'Crédito Pessoal' : 
                       p.type === 'CLT' ? 'Crédito CLT' : 
                       p.type === 'CARTAO' ? 'Saque Cartão' :
                       p.type === 'LUZ' ? 'Crédito na Luz' : p.type}
                    </div>
                    <div className="text-sm font-bold text-brand-blue mt-0.5">
                      R$ {p.value.toLocaleString('pt-BR')}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {new Date(p.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-200" />
                </div>

                {user.role === 'admin' && (
                  <div className="mt-4 pt-4 border-t border-slate-50">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800">
                          {(p as any).userName || 'Cliente'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {(p as any).userEmail || ''}
                        </span>
                      </div>
                      <button 
                        onClick={() => {
                          const clientPhone = (p as any).userPhone || '';
                          const text = encodeURIComponent(`Olá ${(p as any).userName || ''}, vi sua simulação de R$ ${p.value.toLocaleString('pt-BR')} no App Realcred.`);
                          window.open(`https://wa.me/${clientPhone}?text=${text}`, '_blank');
                        }}
                        className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5"
                      >
                        <MessageSquare size={12} /> WHATSAPP
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                       <button 
                        onClick={() => handleUpdateStatus(p.id, 'IN_PROGRESS')}
                        className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md text-[9px] font-bold border border-indigo-100"
                      >
                        ANDAMENTO
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(p.id, 'APPROVED')}
                        className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md text-[9px] font-bold border border-emerald-100"
                      >
                        APROVAR
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(p.id, 'COMPLETED')}
                        className="bg-cyan-50 text-cyan-700 px-2 py-1 rounded-md text-[9px] font-bold border border-cyan-100"
                      >
                        ATENDIDO
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(p.id, 'REJECTED')}
                        className="bg-rose-50 text-rose-700 px-2 py-1 rounded-md text-[9px] font-bold border border-rose-100"
                      >
                        RECUSAR
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

const Profile = ({ user }: { user: AppUser }) => {
  const [phone, setPhone] = useState(user.phone || '');
  const [cpf, setCpf] = useState(user.cpf || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const cleaned = phone.replace(/\D/g, '');
      const finalPhone = cleaned.length > 0 && !cleaned.startsWith('55') ? '55' + cleaned : cleaned;

      await updateDoc(doc(db, 'users', user.uid), {
        phone: finalPhone,
        cpf: cpf.replace(/\D/g, '')
      });
      alert('Perfil atualizado com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Meu Perfil</h2>
      </header>
      <Card className="p-6">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="w-20 h-20 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center text-2xl font-bold">
            {user.displayName?.[0]}
          </div>
          <div className="text-center">
            <div className="font-bold text-lg flex items-center justify-center gap-2">
              {user.displayName}
              {user.role === 'admin' && (
                <ShieldCheck size={16} className="text-brand-orange" />
              )}
            </div>
            <p className="text-sm text-slate-400">{user.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase px-1">WhatsApp</label>
            <input 
              type="tel" 
              placeholder="Ex: 27 99999-8888"
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-blue/20 outline-none"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase px-1">CPF</label>
            <input 
              type="text" 
              placeholder="000.000.000-00"
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-blue/20 outline-none"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
            />
          </div>
          <Button 
            className="w-full mt-4" 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </Card>

      <Card className="p-4 border-dashed border-slate-200">
        <Button 
          variant="outline" 
          className="w-full text-rose-500 border-rose-100 hover:bg-rose-50"
          onClick={() => signOut(auth)}
        >
          <LogOut size={16} className="mr-2" /> Sair da Conta
        </Button>
      </Card>
    </div>
  );
};

const Layout = ({ children, user }: { children: React.ReactNode; user: AppUser }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { icon: LayoutDashboard, label: 'Início', path: '/' },
    { icon: Calculator, label: 'Simular', path: '/simulator' },
    { icon: FileText, label: user.role === 'admin' ? 'Gestão' : 'Propostas', path: '/proposals' },
    { icon: HelpCircle, label: 'Ajuda', path: '/help' },
    { icon: UserIcon, label: 'Perfil', path: '/profile' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="flex-1 p-6 max-w-md mx-auto w-full pb-24">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-3 flex justify-between items-center z-50">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                isActive ? "text-brand-blue scale-110" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-bold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

// --- App Root ---

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userRef);
          const adminEmails = ['alancolombi30@gmail.com', 'realcred.pc@gmail.com'];
          const shouldBeAdmin = adminEmails.includes(firebaseUser.email || '');
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as AppUser;
            
            if (shouldBeAdmin && userData.role !== 'admin') {
              const updatedUser = { ...userData, role: 'admin' as const };
              await setDoc(userRef, updatedUser);
              setUser(updatedUser);
            } else {
              setUser(userData);
            }
          } else {
            // Persistir novo usuário imediatamente
            const newUser: AppUser = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName,
              email: firebaseUser.email,
              role: shouldBeAdmin ? 'admin' : 'client',
              createdAt: new Date().toISOString(),
            };
            await setDoc(userRef, newUser);
            setUser(newUser);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Auth state change error:', err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {!user ? (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Layout user={user}><Dashboard user={user} /></Layout>} />
            <Route path="/simulator" element={<Layout user={user}><Simulator /></Layout>} />
            <Route path="/new-proposal" element={<Layout user={user}><ProposalFlow user={user} /></Layout>} />
            <Route path="/proposals" element={<Layout user={user}><Proposals user={user} /></Layout>} />
            <Route path="/help" element={<Layout user={user}><Help /></Layout>} />
            <Route path="/profile" element={<Layout user={user}><Profile user={user} /></Layout>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </Router>
  );
}
