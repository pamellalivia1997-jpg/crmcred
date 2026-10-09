/**
 * Formatters and validators for Lívia Cred Saúde CRM (pt-BR)
 */

export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Normaliza nomes de pessoas removendo sufixos e títulos antigos:
 * - "Lívia Cristina" -> "Lívia"
 * - "Pamella Lívia" -> "Pamella"
 */
export function cleanPersonName(name?: string | null): string {
  if (!name) return '';
  let cleaned = name;
  cleaned = cleaned.replace(/\s*\([^)]*\)/g, '');
  cleaned = cleaned.replace(/\s+Balc[ãa]o/gi, '');
  return cleaned.trim();
}

export function normalizeSellerName(name?: string | null): string {
  if (!name) return '';
  let n = name.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Specific legacy mappings for consistency
  if (n === 'TACY' || n === 'TACIANA') return 'TACIANA SILVA';
  if (n === 'LOJA IGARASSU' || n === 'LOJA_IGARASSU' || n === 'IGARASSU' || n.includes('IGARASSU')) return 'BIANCA';
  if (n === 'ANA' || n === 'ANINHA' || n === 'ANA PAULA' || n === 'ANA PAULA (DIGITADORA DEDICADA)') return 'ANA PAULA';
  
  // Support for Hellen and Lucélia variations
  if (n.includes('HELLEN')) return 'HELLEN';
  if (n.includes('LUCELIA')) return 'LUCELIA';
  if (n.includes('ANA')) return 'ANA PAULA';
  
  return n;
}

export function isSameSeller(name1?: string | null, name2?: string | null): boolean {
  if (!name1 || !name2) return false;
  return normalizeSellerName(name1) === normalizeSellerName(name2);
}

export function formatPercent(value: number | undefined | null, decimals = 1): string {
  if (value === undefined || value === null || isNaN(value)) return '0,0%';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value) + '%';
}

export function cleanDigits(value: string | undefined | null): string {
  if (!value) return '';
  return value.replace(/\D/g, '');
}

export function formatCPF(cpf: string | undefined | null): string {
  const digits = cleanDigits(cpf);
  if (digits.length !== 11) return cpf || '';
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function maskCPFInput(value: string): string {
  const digits = cleanDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function validateCPF(cpf: string): boolean {
  const digits = cleanDigits(cpf);
  if (digits.length !== 11) return false;
  // All same digits check
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(digits.substring(i - 1, i), 10) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits.substring(9, 10), 10)) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(digits.substring(i - 1, i), 10) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits.substring(10, 11), 10)) return false;

  return true;
}

export function formatPhone(phone: string | undefined | null): string {
  const digits = cleanDigits(phone);
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone || '';
}

export function maskPhoneInput(value: string): string {
  const digits = cleanDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  try {
    const [year, month, day] = dateStr.split('T')[0].split('-');
    if (year && month && day) {
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const date = d.toLocaleDateString('pt-BR');
    const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${date} às ${time}`;
  } catch {
    return dateStr;
  }
}

export function getMonthYearLabel(mesAno: string): string {
  // mesAno: '2026-09'
  const [year, month] = mesAno.split('-');
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const mIndex = parseInt(month, 10) - 1;
  return `${months[mIndex] || month} de ${year}`;
}

export function calculateAge(dateStr: string | undefined | null): number | null {
  if (!dateStr) return null;
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length !== 3) return null;
    const [y, m, d] = parts.map(Number);
    if (!y || !m || !d) return null;

    const today = new Date();
    let age = today.getFullYear() - y;
    const monthDiff = today.getMonth() + 1 - m;
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) {
      age--;
    }
    return age >= 0 ? age : null;
  } catch {
    return null;
  }
}

export function formatBirthDateWithAge(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  const formatted = formatDate(dateStr);
  const age = calculateAge(dateStr);
  if (age !== null) {
    return `${formatted} (${age} anos)`;
  }
  return formatted;
}

export interface BirthdayInfo {
  isThisWeek: boolean;
  isToday: boolean;
  isTomorrow: boolean;
  daysDiff: number;
  turningAge: number;
  dayMonth: string;
  dayOfWeekLabel: string;
  badgeLabel: string;
}

export function getBirthdayInfo(dateStr: string | undefined | null, now = new Date()): BirthdayInfo | null {
  if (!dateStr) return null;
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length !== 3) return null;
    const [birthYear, birthMonth, birthDay] = parts.map(Number);
    if (!birthYear || !birthMonth || !birthDay) return null;

    // Use current year
    const currentYear = now.getFullYear();
    let bdayThisYear = new Date(currentYear, birthMonth - 1, birthDay);

    // Normalize today to midnight
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Difference in milliseconds and days
    const diffMs = bdayThisYear.getTime() - todayMidnight.getTime();
    let diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    // If already passed by more than 3 days, but end of year/beginning of next year
    if (diffDays < -3 && now.getMonth() === 11 && birthMonth === 1) {
      bdayThisYear = new Date(currentYear + 1, birthMonth - 1, birthDay);
      diffDays = Math.round((bdayThisYear.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
    }

    const turningAge = bdayThisYear.getFullYear() - birthYear;
    const isToday = diffDays === 0;
    const isTomorrow = diffDays === 1;

    // Aniversário esta semana: de 1 dia atrás até os próximos 6 dias (janela semanal ativa)
    const isThisWeek = diffDays >= -1 && diffDays <= 6;

    const daysOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const dayOfWeek = daysOfWeek[bdayThisYear.getDay()];

    let badgeLabel = '';
    if (isToday) {
      badgeLabel = 'Hoje! 🎉';
    } else if (isTomorrow) {
      badgeLabel = 'Amanhã';
    } else if (diffDays === -1) {
      badgeLabel = 'Ontem';
    } else if (diffDays > 1) {
      badgeLabel = `Em ${diffDays} dias (${dayOfWeek})`;
    } else {
      badgeLabel = dayOfWeek;
    }

    const dayMonth = `${birthDay.toString().padStart(2, '0')}/${birthMonth.toString().padStart(2, '0')}`;

    return {
      isThisWeek,
      isToday,
      isTomorrow,
      daysDiff: diffDays,
      turningAge,
      dayMonth,
      dayOfWeekLabel: dayOfWeek,
      badgeLabel
    };
  } catch {
    return null;
  }
}

export interface IndicationInfo {
  isPostSale3to7Days: boolean;
  daysSincePayment: number;
  badgeLabel: string;
}

export function getPostSaleIndicationInfo(dateStr: string | undefined | null, now = new Date()): IndicationInfo | null {
  if (!dateStr) return null;
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length !== 3) return null;
    const [pYear, pMonth, pDay] = parts.map(Number);
    if (!pYear || !pMonth || !pDay) return null;

    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const pMidnight = new Date(pYear, pMonth - 1, pDay);
    
    const diffMs = todayMidnight.getTime() - pMidnight.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    const isPostSale3to7Days = diffDays >= 3 && diffDays <= 7;
    let badgeLabel = '';
    if (diffDays === 3) badgeLabel = 'Pago/Digitado há 3 dias (Janela Ideal para Indicação)';
    else if (diffDays === 4) badgeLabel = 'Pago/Digitado há 4 dias';
    else if (diffDays === 5) badgeLabel = 'Pago/Digitado há 5 dias';
    else if (diffDays === 6) badgeLabel = 'Pago/Digitado há 6 dias';
    else if (diffDays === 7) badgeLabel = 'Pago/Digitado há 7 dias (Fim da janela de indicação)';
    else if (diffDays < 3 && diffDays >= 0) badgeLabel = `Pago/Digitado há ${diffDays} dia(s) (Recente)`;
    else badgeLabel = `Pago/Digitado há ${diffDays} dias`;

    return {
      isPostSale3to7Days,
      daysSincePayment: diffDays,
      badgeLabel
    };
  } catch {
    return null;
  }
}
