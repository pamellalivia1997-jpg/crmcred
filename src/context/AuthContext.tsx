import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, Proposta } from '../types';
import { crmStorage, subscribeToData } from '../services/crmStorage';
import { cleanPersonName } from '../utils/formatters';

import { auth, googleProvider } from '../services/firebase';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';

export interface AuthResult {
  success: boolean;
  message?: string;
  pendingApproval?: boolean;
}

interface AuthContextType {
  currentUser: User | null;
  allUsers: User[];
  login: (loginInput: string, passwordInput?: string) => AuthResult;
  loginWithGoogle: () => Promise<AuthResult>;
  logout: () => void;
  switchUser: (userId: string) => void;
  saveUser: (user: User) => void;
  approveUser: (userId: string, role?: UserRole) => void;
  deleteUser: (userId: string) => void;
  hasRole: (roles: UserRole[]) => boolean;
  canAccessFinancial: () => boolean;
  canManageTeam: () => boolean;
  canEditProposal: (proposta: Proposta) => boolean;
  isManager: boolean;
  isDigitador: boolean;
  acceptedLGPD: boolean;
  acceptLGPD: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_KEY = 'livia_credsaude_current_user_id';

function normalizeUser<T extends User | null>(user: T): T {
  if (!user) return user;
  return {
    ...user,
    name: cleanPersonName(user.name)
  } as T;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allUsers, setAllUsers] = useState<User[]>(() => 
    crmStorage.getUsers().map(u => normalizeUser(u))
  );
  
  // App starts asking for login and password
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUserId = localStorage.getItem(CURRENT_USER_KEY);
    if (savedUserId) {
      const users = crmStorage.getUsers();
      const found = users.find(u => u.id === savedUserId);
      if (found) return normalizeUser(found);
    }
    return null;
  });

  useEffect(() => {
    return subscribeToData(() => {
      const updated = crmStorage.getUsers().map(u => normalizeUser(u)!);
      setAllUsers(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(updated)) {
          return updated;
        }
        return prev;
      });
      const savedUserId = localStorage.getItem(CURRENT_USER_KEY);
      if (savedUserId) {
        const found = updated.find(u => u.id === savedUserId);
        if (found) {
          setCurrentUser(prev => {
            if (!prev || prev.id !== found.id || JSON.stringify(prev) !== JSON.stringify(found)) {
              return found;
            }
            return prev;
          });
        }
      }
    });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
  }, []);

  const isManager = Boolean(
    currentUser && (currentUser.role === 'proprietaria' || currentUser.role === 'adm' || currentUser.role === 'financeiro')
  );

  const isDigitador = Boolean(currentUser && currentUser.role === 'digitador');

  const login = (loginInput: string, passwordInput: string = ''): AuthResult => {
    const users = crmStorage.getUsers();
    const cleanInput = loginInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    if (!cleanInput && !cleanPass) {
      return {
        success: false,
        message: 'Por favor, informe o usuário e senha para continuar.'
      };
    }

    // 1. Identify user by email, name, id or alias
    let found = users.find(
      u =>
        u.email.toLowerCase() === cleanInput ||
        u.name.toLowerCase() === cleanInput ||
        u.id.toLowerCase() === cleanInput ||
        u.email.toLowerCase().split('@')[0] === cleanInput
    );

    // Support quick alias for manager testing ('123', 'gerencial', 'admin') mapped to management account
    if (!found && (cleanInput === '123' || cleanInput === 'gerencial' || cleanInput === 'admin' || cleanInput === 'proprietaria' || cleanInput === 'livia')) {
      found = users.find(u => u.email.toLowerCase() === 'pamellalivia1997@gmail.com') ||
              users.find(u => u.role === 'proprietaria') ||
              users.find(u => u.role === 'adm');
    }

    if (found) {
      // Validate status: If inativo / pendente, DENY access with approval required notice
      if (found.status === 'inativo') {
        return {
          success: false,
          pendingApproval: true,
          message: `O cadastro do usuário (${found.name}) está PENDENTE de aprovação por um Administrador (ADM). Solicite a ativação no menu de usuários.`
        };
      }

      // Check password dynamically configured in the database / user profile
      const storedPassword = found.password && found.password.trim() !== '' ? found.password.trim() : null;

      let isAuthorized = false;
      if (storedPassword) {
        isAuthorized = cleanPass === storedPassword;
      } else {
        // If password is not yet configured in database, adopt the input password and persist to database
        if (cleanPass.length > 0) {
          isAuthorized = true;
          found.password = cleanPass;
          crmStorage.saveUser(found);
        }
      }

      if (isAuthorized) {
        const norm = normalizeUser(found)!;
        setCurrentUser(norm);
        localStorage.setItem(CURRENT_USER_KEY, norm.id);
        crmStorage.logAudit({
          usuarioId: norm.id,
          usuarioNome: norm.name,
          acao: 'visualizou',
          tipoRecurso: 'usuario',
          idRecurso: norm.id,
          detalhes: `Iniciou sessão com sucesso no perfil ${norm.role.toUpperCase()} (${norm.name}).`
        });
        return { success: true };
      }

      return {
        success: false,
        message: 'Senha de acesso incorreta. Verifique os dados digitados ou altere a senha no painel de usuários.'
      };
    }

    return {
      success: false,
      message: 'Usuário não encontrado. Se é o seu primeiro acesso, registre-se via Conta Google e aguarde a aprovação do ADM.'
    };
  };

  const loginWithGoogle = async (): Promise<AuthResult> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      if (!fbUser || !fbUser.email) {
        return { success: false, message: 'Falha ao recuperar dados da conta Google.' };
      }

      const users = crmStorage.getUsers();
      let found = users.find(u => u.email.toLowerCase() === fbUser.email?.toLowerCase());

      if (!found) {
        // First time Google Sign in: Create user as INATIVO (PENDING APPROVAL BY ADM)
        found = {
          id: fbUser.uid,
          name: fbUser.displayName || cleanPersonName(fbUser.email.split('@')[0]),
          email: fbUser.email.toLowerCase(),
          role: 'vendedora',
          phone: '(81) 98000-0000',
          status: 'inativo', // PENDING APPROVAL!
          monthlySalesGoal: 75000,
          monthlyTaxPercentGoal: 10.0,
          baseSalaryCost: 2000
        };
        crmStorage.saveUser(found);

        crmStorage.logAudit({
          usuarioId: found.id,
          usuarioNome: found.name,
          acao: 'criou',
          tipoRecurso: 'usuario',
          idRecurso: found.id,
          detalhes: `Solicitação de novo cadastro via Google Auth (${found.email}). Pendente de aprovação por um ADM.`
        });

        // DO NOT LOG IN AUTOMATICALLY! Require ADM approval.
        return {
          success: false,
          pendingApproval: true,
          message: `Cadastro enviado com sucesso! Seu usuário (${found.email}) está PENDENTE de aprovação por um Administrador (ADM) no painel de usuários.`
        };
      }

      // Check if existing user is still INATIVO / PENDING
      if (found.status === 'inativo') {
        return {
          success: false,
          pendingApproval: true,
          message: `Sua solicitação de acesso (${found.email}) está PENDENTE de aprovação por um Administrador. Entre em contato com a gestão para ativação.`
        };
      }

      // Log in active user
      const norm = normalizeUser(found)!;
      setCurrentUser(norm);
      localStorage.setItem(CURRENT_USER_KEY, norm.id);
      crmStorage.logAudit({
        usuarioId: norm.id,
        usuarioNome: norm.name,
        acao: 'visualizou',
        tipoRecurso: 'usuario',
        idRecurso: norm.id,
        detalhes: `Autenticado via Firebase Google Auth (${norm.email}).`
      });
      return { success: true };
    } catch (e) {
      console.error('Erro na autenticação Firebase Auth Google:', e);
      return { success: false, message: `Erro ao autenticar: ${e instanceof Error ? e.message : 'Tente novamente.'}` };
    }
  };

  const logout = () => {
    try {
      firebaseSignOut(auth);
    } catch (e) {
      // ignore
    }
    setCurrentUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  const switchUser = (userId: string) => {
    const users = crmStorage.getUsers();
    const found = users.find(u => u.id === userId);
    if (found) {
      const norm = normalizeUser(found)!;
      setCurrentUser(norm);
      localStorage.setItem(CURRENT_USER_KEY, norm.id);
      crmStorage.logAudit({
        usuarioId: norm.id,
        usuarioNome: norm.name,
        acao: 'visualizou',
        tipoRecurso: 'usuario',
        idRecurso: norm.id,
        detalhes: `Alternou sessão para ${norm.role.toUpperCase()} (${norm.name}).`
      });
    }
  };

  const saveUser = (user: User) => {
    const norm = normalizeUser(user)!;
    crmStorage.saveUser(norm);
    const updated = crmStorage.getUsers().map(u => normalizeUser(u)!);
    setAllUsers(updated);
    if (currentUser?.id === user.id) {
      setCurrentUser(norm);
    }
  };

  const approveUser = (userId: string, role?: UserRole) => {
    const users = crmStorage.getUsers();
    const found = users.find(u => u.id === userId);
    if (found) {
      const updatedUser: User = {
        ...found,
        status: 'ativo',
        role: role || found.role || 'vendedora'
      };
      crmStorage.saveUser(updatedUser);
      const updated = crmStorage.getUsers().map(u => normalizeUser(u)!);
      setAllUsers(updated);
      crmStorage.logAudit({
        usuarioId: currentUser?.id || 'adm',
        usuarioNome: currentUser?.name || 'Administrador',
        acao: 'editou',
        tipoRecurso: 'usuario',
        idRecurso: userId,
        detalhes: `Aprovou e ativou o acesso do usuário ${updatedUser.name} (${updatedUser.email}) como ${updatedUser.role.toUpperCase()}.`
      });
    }
  };

  const deleteUser = (userId: string) => {
    crmStorage.deleteUser(userId);
    const updated = crmStorage.getUsers().map(u => normalizeUser(u)!);
    setAllUsers(updated);
    if (currentUser?.id === userId) {
      logout();
    }
  };

  // ADM, Gerencial e Financeiro têm a mesma visão de tudo e mesmos poderes!
  const hasRole = (roles: UserRole[]): boolean => {
    if (!currentUser) return false;
    if (isManager && roles.some(r => r === 'proprietaria' || r === 'adm' || r === 'financeiro')) {
      return true;
    }
    return roles.includes(currentUser.role);
  };

  const canAccessFinancial = (): boolean => {
    return isManager;
  };

  const canManageTeam = (): boolean => {
    return isManager;
  };

  const canEditProposal = (proposta: Proposta): boolean => {
    if (!currentUser) return false;
    // Gerencial, ADM e Financeiro podem editar qualquer proposta
    if (isManager) return true;
    // Vendedora só edita as propostas que ela mesma cadastrou
    return proposta.vendedora === currentUser.name || proposta.digitador === currentUser.name;
  };

  const acceptLGPD = () => {
    // LGPD consent is implicit and active in background
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        allUsers,
        login,
        loginWithGoogle,
        logout,
        switchUser,
        saveUser,
        approveUser,
        deleteUser,
        hasRole,
        canAccessFinancial,
        canManageTeam,
        canEditProposal,
        isManager,
        isDigitador,
        acceptedLGPD: true,
        acceptLGPD
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
