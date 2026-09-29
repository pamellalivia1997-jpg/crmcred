import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, Proposta } from '../types';
import { crmStorage, subscribeToData } from '../services/crmStorage';
import { cleanPersonName } from '../utils/formatters';

interface AuthContextType {
  currentUser: User | null;
  allUsers: User[];
  login: (loginInput: string, passwordInput?: string) => boolean;
  logout: () => void;
  switchUser: (userId: string) => void;
  saveUser: (user: User) => void;
  deleteUser: (userId: string) => void;
  hasRole: (roles: UserRole[]) => boolean;
  canAccessFinancial: () => boolean;
  canManageTeam: () => boolean;
  canEditProposal: (proposta: Proposta) => boolean;
  isManager: boolean;
  isDigitador: boolean;
  acceptedLGPD: boolean;
  acceptLGPD: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_KEY = 'livia_credsaude_current_user_id';
const THEME_KEY = 'livia_credsaude_theme';

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

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
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
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const isManager = Boolean(
    currentUser && (currentUser.role === 'proprietaria' || currentUser.role === 'adm' || currentUser.role === 'financeiro')
  );

  const isDigitador = Boolean(currentUser && currentUser.role === 'digitador');

  const login = (loginInput: string, passwordInput: string = ''): boolean => {
    const users = crmStorage.getUsers();
    const cleanInput = loginInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    // 1. Gerencial access: Login em branco e senha 123 (ou digitação de "gerencial" / "livia" / "admin" com senha 123)
    if ((cleanInput === '' || cleanInput === 'gerencial' || cleanInput === 'livia' || cleanInput === 'admin') && cleanPass === '123') {
      const livia = users.find(u => u.role === 'proprietaria') || users.find(u => u.name === 'Lívia') || users[0];
      if (livia) {
        const norm = normalizeUser(livia)!;
        setCurrentUser(norm);
        localStorage.setItem(CURRENT_USER_KEY, norm.id);
        crmStorage.logAudit({
          usuarioId: norm.id,
          usuarioNome: norm.name,
          acao: 'visualizou',
          tipoRecurso: 'usuario',
          idRecurso: norm.id,
          detalhes: 'Login Gerencial autorizado (senha 123).'
        });
        return true;
      }
    }

    // 2. Individual seller or team login (vendedoras, adm, financeiro cadastrados e alterados pelo gerencial)
    const found = users.find(u => 
      u.email.toLowerCase() === cleanInput || 
      u.name.toLowerCase() === cleanInput ||
      u.id.toLowerCase() === cleanInput ||
      u.email.toLowerCase().split('@')[0] === cleanInput
    );

    if (found) {
      // Validate password (user's saved password or default '123')
      const userExpectedPassword = (found.password && found.password.trim() !== '') ? found.password.trim() : '123';
      if (cleanPass === userExpectedPassword) {
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
        return true;
      }
    }

    return false;
  };

  const logout = () => {
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
        logout,
        switchUser,
        saveUser,
        deleteUser,
        hasRole,
        canAccessFinancial,
        canManageTeam,
        canEditProposal,
        isManager,
        isDigitador,
        acceptedLGPD: true,
        acceptLGPD,
        theme,
        toggleTheme
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
