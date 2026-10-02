import React, { useState, useEffect } from 'react';
import { Calendar, Layers, Clock, Filter } from 'lucide-react';

export type FilterMode = 'mes' | 'semana' | 'personalizado';

interface SmartFilterProps {
  dataInicio: string; // YYYY-MM-DD
  dataFim: string; // YYYY-MM-DD
  onChangeRange: (range: { dataInicio: string; dataFim: string }) => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const SmartFilter: React.FC<SmartFilterProps> = ({
  dataInicio,
  dataFim,
  onChangeRange
}) => {
  const [mode, setMode] = useState<FilterMode>('mes');

  // Month mode state (e.g., year=2026, month=9 for September)
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    if (dataInicio) {
      const y = parseInt(dataInicio.substring(0, 4), 10);
      if (!isNaN(y)) return y;
    }
    return 2026;
  });

  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    if (dataInicio) {
      const m = parseInt(dataInicio.substring(5, 7), 10);
      if (!isNaN(m)) return m;
    }
    return 9; // Default September
  });

  // Week mode state (1..4)
  const [selectedWeek, setSelectedWeek] = useState<number>(1);

  // Custom date state
  const [customStart, setCustomStart] = useState<string>(dataInicio || '2026-09-01');
  const [customEnd, setCustomEnd] = useState<string>(dataFim || '2026-09-30');

  // Helper to calculate last day of a month
  const getLastDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  // Helper to apply month range
  const handleApplyMonth = (y: number, m: number) => {
    const startStr = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = getLastDayOfMonth(y, m);
    const endStr = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    onChangeRange({ dataInicio: startStr, dataFim: endStr });
  };

  // Helper to apply week range
  const handleApplyWeek = (y: number, m: number, w: number) => {
    const lastDay = getLastDayOfMonth(y, m);
    let startDay = 1;
    let endDay = 7;

    if (w === 1) {
      startDay = 1;
      endDay = 7;
    } else if (w === 2) {
      startDay = 8;
      endDay = 14;
    } else if (w === 3) {
      startDay = 15;
      endDay = 21;
    } else if (w === 4) {
      startDay = 22;
      endDay = lastDay;
    }

    const mStr = String(m).padStart(2, '0');
    const startStr = `${y}-${mStr}-${String(startDay).padStart(2, '0')}`;
    const endStr = `${y}-${mStr}-${String(endDay).padStart(2, '0')}`;
    onChangeRange({ dataInicio: startStr, dataFim: endStr });
  };

  // When Mode changes
  const handleModeChange = (newMode: FilterMode) => {
    setMode(newMode);
    if (newMode === 'mes') {
      handleApplyMonth(selectedYear, selectedMonth);
    } else if (newMode === 'semana') {
      handleApplyWeek(selectedYear, selectedMonth, selectedWeek);
    } else if (newMode === 'personalizado') {
      onChangeRange({ dataInicio: customStart, dataFim: customEnd });
    }
  };

  const availableYears = [2025, 2026, 2027];

  return (
    <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      {/* Selector Mode Tabs */}
      <div className="flex items-center gap-1 sm:gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl w-full sm:w-auto overflow-x-auto scrollbar-none shrink-0">
        <button
          type="button"
          onClick={() => handleModeChange('mes')}
          className={`min-w-0 flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            mode === 'mes'
              ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            Mês<span className="hidden sm:inline"> Fechado</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('semana')}
          className={`min-w-0 flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            mode === 'semana'
              ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Semanal</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('personalizado')}
          className={`min-w-0 flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            mode === 'personalizado'
              ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Personalizado</span>
        </button>
      </div>

      {/* Mode Controls */}
      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end">
        {mode === 'mes' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedMonth}
              onChange={(e) => {
                const m = parseInt(e.target.value, 10);
                setSelectedMonth(m);
                handleApplyMonth(selectedYear, m);
              }}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none flex-1 sm:flex-initial"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => {
                const y = parseInt(e.target.value, 10);
                setSelectedYear(y);
                handleApplyMonth(y, selectedMonth);
              }}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none flex-1 sm:flex-initial"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        )}

        {mode === 'semana' && (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedMonth}
              onChange={(e) => {
                const m = parseInt(e.target.value, 10);
                setSelectedMonth(m);
                handleApplyWeek(selectedYear, m, selectedWeek);
              }}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none flex-1 sm:flex-initial"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => {
                const y = parseInt(e.target.value, 10);
                setSelectedYear(y);
                handleApplyWeek(y, selectedMonth, selectedWeek);
              }}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none flex-1 sm:flex-initial"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>

            <select
              value={selectedWeek}
              onChange={(e) => {
                const w = parseInt(e.target.value, 10);
                setSelectedWeek(w);
                handleApplyWeek(selectedYear, selectedMonth, w);
              }}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none w-full sm:w-auto"
            >
              <option value={1}>Semana 1 (01 a 07)</option>
              <option value={2}>Semana 2 (08 a 14)</option>
              <option value={3}>Semana 3 (15 a 21)</option>
              <option value={4}>
                Semana 4 (22 a {getLastDayOfMonth(selectedYear, selectedMonth)})
              </option>
            </select>
          </div>
        )}

        {mode === 'personalizado' && (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:flex-initial flex items-center gap-1.5 min-w-[130px]">
              <span className="text-[11px] font-semibold text-slate-500 shrink-0">De:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => {
                  setCustomStart(e.target.value);
                  onChangeRange({ dataInicio: e.target.value, dataFim: customEnd });
                }}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-xl px-2.5 py-1.5 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div className="flex-1 sm:flex-initial flex items-center gap-1.5 min-w-[130px]">
              <span className="text-[11px] font-semibold text-slate-500 shrink-0">Até:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => {
                  setCustomEnd(e.target.value);
                  onChangeRange({ dataInicio: customStart, dataFim: e.target.value });
                }}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-xl px-2.5 py-1.5 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
