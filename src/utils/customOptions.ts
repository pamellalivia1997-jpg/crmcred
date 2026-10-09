/**
 * Dynamic Select Options Manager
 * Manages custom options for Operação, Banco, Convênio, and Promotora.
 * Allows ADM, Gerente, and Financeiro to dynamically register new options into the system.
 */

export type OptionCategory = 'operacao' | 'banco' | 'convenio' | 'promotora';

const DEFAULT_OPERACOES: string[] = [
  'Portabilidade',
  'Refin',
  'Refin da Port',
  'Margem',
  'FGTS',
  'Saque Complementar',
  'Conta de Energia Elétrica/Luz',
  'Cartão Novo',
  'Credcesta',
  'Cartão de Crédito',
  'Crédito do Trabalhador',
  'Pessoal'
];

const DEFAULT_BANCOS: string[] = [
  'Banco Pan',
  'C6 Consig',
  'Santander',
  'Itaú Consig',
  'Daycoval',
  'Facta',
  'Master',
  'BMG',
  'Mercantil',
  'Safra',
  'Bradesco'
];

const DEFAULT_CONVENIOS: string[] = [
  'INSS',
  'SIAPE',
  'Prefeitura de Igarassu',
  'Prefeitura do Recife',
  'Governo de PE',
  'FGTS',
  'Forças Armadas'
];

const DEFAULT_PROMOTORAS: string[] = [
  'J2 Promotora',
  'Sempre',
  'DG',
  'GFT',
  'Direto Banco'
];

const STORAGE_PREFIX = 'crm_custom_options_';

import { db } from '../services/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export function getOptionsForCategory(category: OptionCategory): string[] {
  let defaults: string[] = [];
  if (category === 'operacao') defaults = DEFAULT_OPERACOES;
  else if (category === 'banco') defaults = DEFAULT_BANCOS;
  else if (category === 'convenio') defaults = DEFAULT_CONVENIOS;
  else if (category === 'promotora') defaults = DEFAULT_PROMOTORAS;

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${category}`);
    if (raw) {
      const custom: string[] = JSON.parse(raw);
      // Combine defaults and custom without duplicates
      const set = new Set([...defaults, ...custom]);
      return Array.from(set);
    }
  } catch (e) {}

  return defaults;
}

export function addCustomOption(category: OptionCategory, newItem: string): string[] {
  const trimmed = newItem.trim();
  if (!trimmed) return getOptionsForCategory(category);

  try {
    const current = getOptionsForCategory(category);
    if (!current.includes(trimmed)) {
      const updated = [...current, trimmed];
      localStorage.setItem(`${STORAGE_PREFIX}${category}`, JSON.stringify(updated));
      
      // Async sync to Firestore so all devices (mobile and PC) have the new items
      try {
        const configRef = doc(db, 'configuracoes', 'custom_options');
        setDoc(configRef, { [category]: updated }, { merge: true }).catch(() => {});
      } catch (_) {}

      return updated;
    }
    return current;
  } catch (e) {
    return getOptionsForCategory(category);
  }
}

// Real-time synchronization of custom options across devices
if (typeof window !== 'undefined') {
  try {
    const configRef = doc(db, 'configuracoes', 'custom_options');
    onSnapshot(configRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        (['operacao', 'banco', 'convenio', 'promotora'] as OptionCategory[]).forEach(cat => {
          if (Array.isArray(data[cat])) {
            const current = getOptionsForCategory(cat);
            const merged = Array.from(new Set([...current, ...data[cat]]));
            localStorage.setItem(`${STORAGE_PREFIX}${cat}`, JSON.stringify(merged));
          }
        });
      }
    }, () => {});
  } catch (_) {}
}
