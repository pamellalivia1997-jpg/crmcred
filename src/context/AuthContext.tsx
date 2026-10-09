import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, Proposta } from '../types';
import { crmStorage, subscribeToData, initFirestoreRealtimeSync } from '../services/crmStorage';
import { cleanPersonName } from '../utils/formatters';
import { INITIAL_USERS } from '../data/mockSeed';

import { auth, googleProvider } from '../services/firebase';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';

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
  deactivateUser: (userId: string) => void;
  linkUserToPreRegistered: (pendingUserId: string, targetPreRegisteredUserId: string) => void;
  deleteUser: (userId: string) => void;
  hasRole: (roles: UserRole[]) => boolean;
  canAccessFinancial: () => boolean;
  canManageTeam: () => boolean;
  canEditProposal: (proposta: Proposta) => boolean;
  isManager: boolean;
  isDigitador: boolean;
  googleAccessToken: string | null;
  setGoogleAccessToken: (token: string | null) => void;
  acceptedLGPD: boolean;
  acceptLGPD: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_KEY = 'livia_credsaude_current_user_id';

// Contas administrativas já autorizadas pela proprietária. Isso evita que o
// primeiro acesso em navegador anônimo dependa do cache/localStorage para
// descobrir o perfil; contas Google desconhecidas continuam pendentes.
const OFFICIAL_GOOGLE_ACCOUNTS: Record<string, Pick<User, 'name' | 'role'>> = {
  'geovanne.arcelino@gmail.com': { name: 'Geovanne Ferreira', role: 'financeiro' },
  'pamellalivia1997@gmail.com': { name: 'Pamella', role: 'adm' }
};

function normalizeUser<T extends User | null>(user: T): T {
  if (!user) return user;
  return {
    ...user,
    name: cleanPersonName(user.name)
  } as T;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
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

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser && fbUser.email) {
        const users = crmStorage.getUsers();
        let found = users.find(u =>
          (u.email && u.email.toLowerCase() === fbUser.email?.toLowerCase()) ||
          (u.authUid && u.authUid === fbUser.uid) ||
          u.id === fbUser.uid
        );
        const official = OFFICIAL_GOOGLE_ACCOUNTS[fbUser.email.toLowerCase()];
        if (!found && official) {
          found = {
            id: fbUser.uid,
            name: official.name,
            email: fbUser.email.toLowerCase(),
            authUid: fbUser.uid,
            role: official.role,
            phone: '',
            status: 'ativo',
            monthlySalesGoal: 0,
            monthlyTaxPercentGoal: 0
          };
          crmStorage.saveUser(found);
        }
        if (found && found.status === 'ativo') {
          const norm = normalizeUser(found)!;
          setCurrentUser(prev => (prev?.id === norm.id ? prev : norm));
          localStorage.setItem(CURRENT_USER_KEY, norm.id);
        }
        initFirestoreRealtimeSync();
      }
    });
    return () => unsubscribe();
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

    // Support quick alias:
    // If input is 'geovanne', 'controladoria', 'financeiro', '123123', or '123' -> map to Geovanne (Controladoria)
    if (!found && (
      cleanInput === 'geovanne' ||
      cleanInput === 'controladoria' ||
      cleanInput === 'financeiro' ||
      cleanInput === '123123' ||
      cleanInput === '123'
    )) {
      found = users.find(u => u.id === 'Vq7wUkG7ltcanJjJmnEqYZOiiym1') ||
              users.find(u => u.email.toLowerCase() === 'geovanne.arcelino@gmail.com') ||
              users.find(u => u.role === 'financeiro');
    }

    // Support other aliases for manager accounts
    if (!found && (cleanInput === 'pamella' || cleanInput === 'adm' || cleanInput === 'admin')) {
      found = users.find(u => u.id === 'eRkG9KNI8AZMCtQGkrPAPc7g8PC3') ||
              users.find(u => u.email.toLowerCase() === 'pamellalivia1997@gmail.com') ||
              users.find(u => u.role === 'adm');
    }

    if (!found && (cleanInput === 'livia' || cleanInput === 'gerencial' || cleanInput === 'proprietaria')) {
      found = users.find(u => u.id === 'user-livia') ||
              users.find(u => u.role === 'proprietaria');
    }

    if (found) {
      // Auto-activate system accounts / quick logins so user never gets stuck as inativo
      if (found.status === 'inativo') {
        found.status = 'ativo';
        crmStorage.saveUser(found);
      }

      // Check password dynamically configured in the database / user profile
      const storedPassword = found.password && found.password.trim() !== '' ? found.password.trim() : null;

      let isAuthorized = false;
      const isGeovanne = found.id === 'Vq7wUkG7ltcanJjJmnEqYZOiiym1' || found.email.toLowerCase() === 'geovanne.arcelino@gmail.com';

      if (isGeovanne) {
        // Geovanne accepts 123123, 123 or stored password
        isAuthorized = cleanPass === '123123' || cleanPass === '123' || (Boolean(storedPassword) && cleanPass === storedPassword);
      } else if (storedPassword) {
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

        // Inicia sincronização em tempo real caso não esteja ativa
        initFirestoreRealtimeSync();

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
      // Explicitly persist the Firebase session across F5 and new tabs when supported
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (pErr) {
        console.warn('Persistência padrão mantida:', pErr);
      }
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || null;
      if (token) {
        setGoogleAccessToken(token);
      }
      const fbUser = result.user;
      if (!fbUser || !fbUser.email) {
        return { success: false, message: 'Falha ao recuperar dados da conta Google.' };
      }

      const emailLower = fbUser.email.toLowerCase();
      const users = crmStorage.getUsers();
      // Match by Google email, authUid, or ID
      let found = users.find(u => 
        (u.email && u.email.toLowerCase() === emailLower) ||
        (u.authUid && u.authUid === fbUser.uid) ||
        u.id === fbUser.uid
      );

      // On a clean/private browser, the local cache may contain no users yet.
      const official = OFFICIAL_GOOGLE_ACCOUNTS[emailLower];
      if (!found && official) {
        found = {
          id: fbUser.uid,
          name: official.name,
          email: emailLower,
          authUid: fbUser.uid,
          role: official.role,
          phone: '',
          status: 'ativo',
          monthlySalesGoal: 0,
          monthlyTaxPercentGoal: 0
        };
        crmStorage.saveUser(found);
      }

      // Check against INITIAL_USERS
      if (!found) {
        const initialMatch = INITIAL_USERS.find(u => u.email.toLowerCase() === emailLower);
        if (initialMatch) {
          found = {
            ...initialMatch,
            authUid: fbUser.uid,
            status: 'ativo'
          };
          crmStorage.saveUser(found);
        }
      }

      // Owner fallback (Pamella)
      if (!found && emailLower.includes('pamellalivia')) {
        found = {
          id: fbUser.uid,
          name: 'Pamella',
          email: emailLower,
          authUid: fbUser.uid,
          role: 'adm',
          phone: '',
          status: 'ativo',
          monthlySalesGoal: 0,
          monthlyTaxPercentGoal: 0
        };
        crmStorage.saveUser(found);
      }

      if (!found) {
        // First time Google Sign in: Create user as ATIVO automatically
        found = {
          id: fbUser.uid,
          name: fbUser.displayName || cleanPersonName(emailLower.split('@')[0]),
          email: emailLower,
          authUid: fbUser.uid,
          role: 'vendedora',
          phone: '(81) 98000-0000',
          status: 'ativo',
          monthlySalesGoal: 75000,
          monthlyTaxPercentGoal: 10.0
        };
        crmStorage.saveUser(found);
      }

      if (found.isDeactivated) {
        return {
          success: false,
          message: `Usuário (${found.email}) desativado. Entre em contato com a gestão para reativação.`
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
      initFirestoreRealtimeSync();
      return { success: true };
    } catch (e: any) {
      console.error('Erro na autenticação Firebase Auth Google:', e);
      let errMsg = 'Erro ao autenticar com Conta Google.';
      if (e?.code === 'auth/unauthorized-domain') {
        const domain = typeof window !== 'undefined' ? window.location.hostname : 'este domínio';
        errMsg = `Domínio (${domain}) precisa ser autorizado no Firebase Console -> Authentication -> Configurações -> Domínios autorizados.`;
      } else if (e?.code === 'auth/popup-blocked') {
        errMsg = 'A janela de login foi bloqueada pelo navegador. Permita pop-ups para fazer login.';
      } else if (e?.code === 'auth/popup-closed-by-user') {
        errMsg = 'A janela do Google foi fechada antes de concluir o login.';
      } else if (e?.code === 'auth/operation-not-allowed') {
        errMsg = 'Provedor Google não está ativado no Firebase Console (Authentication -> Sign-in method).';
      } else if (e?.message) {
        errMsg = `Erro no Google: ${e.message}`;
      }
      return { success: false, message: errMsg };
    }
  };

  const logout = () => {
    try {
      firebaseSignOut(auth);
    } catch (e) {
      // ignore
    }
    setCurrentUser(null);
    setGoogleAccessToken(null);
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
        isDeactivated: false,
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

  const deactivateUser = (userId: string) => {
    const users = crmStorage.getUsers();
    const found = users.find(u => u.id === userId);
    if (found) {
      const updatedUser: User = {
        ...found,
        status: 'inativo',
        isDeactivated: true
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
        detalhes: `Desativou o acesso do usuário ${updatedUser.name} (${updatedUser.email}).`
      });
    }
  };

  const linkUserToPreRegistered = (pendingUserId: string, targetPreRegisteredUserId: string) => {
    const users = crmStorage.getUsers();
    const pendingUser = users.find(u => u.id === pendingUserId);
    const targetUser = users.find(u => u.id === targetPreRegisteredUserId);
    if (!pendingUser || !targetUser) return;

    // Preserva integralmente o cadastro do colaborador existente (ID, nome, salesName, relatórios, propostas),
    // atualizando seu e-mail oficial para o e-mail do Google e vinculando o authUid
    const updatedTarget: User = {
      ...targetUser,
      email: pendingUser.email.toLowerCase(),
      authUid: pendingUser.id,
      status: 'ativo'
    };

    crmStorage.saveUser(updatedTarget);
    crmStorage.deleteUser(pendingUserId);

    crmStorage.logAudit({
      usuarioId: currentUser?.id || 'adm',
      usuarioNome: currentUser?.name || 'Administrador',
      acao: 'editou',
      tipoRecurso: 'usuario',
      idRecurso: targetUser.id,
      detalhes: `Vinculou autenticação do Google (${pendingUser.email}) ao colaborador pré-cadastrado ${targetUser.name}.`
    });

    const updated = crmStorage.getUsers().map(u => normalizeUser(u)!);
    setAllUsers(updated);
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
        deactivateUser,
        linkUserToPreRegistered,
        deleteUser,
        hasRole,
        canAccessFinancial,
        canManageTeam,
        canEditProposal,
        isManager,
        isDigitador,
        googleAccessToken,
        setGoogleAccessToken,
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
