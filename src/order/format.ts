export const money = (v: number): string =>
  '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const nowTime = (): string =>
  new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export const fmtDate = (d: Date): string =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const isoOf = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const parseISO = (v: string): Date => {
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d);
};
