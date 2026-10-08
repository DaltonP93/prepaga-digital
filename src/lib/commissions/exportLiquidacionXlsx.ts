import type { Workbook, Worksheet } from 'exceljs';
import type {
  CommissionAdjustment,
  CommissionExportRow,
  CommissionPeriod,
} from '@/types/commissions';
import { saleTypeReportCode } from '@/lib/saleTypes';

/**
 * Exporta una o varias liquidaciones al formato de la planilla "Comisiones
 * <mes>.xlsx": una hoja por liquidación y un Resumen que las junta.
 *
 * EL DISEÑO ES EL MISMO que genera scripts/comisiones/build_plantilla_liquidacion.py
 * (bloque fijo de arriba B4:B9 / E4:E11, tabla desde la fila 13). Si se cambia
 * acá hay que cambiarlo allá y viceversa. La única diferencia es que acá no hay
 * columnas "manual": una liquidación cerrada no se recalcula.
 *
 * Lo liquidado es un dato contable inmutable, así que las FILAS llevan los
 * valores del snapshot (nunca se recalculan con parámetros de hoy). Lo que sí es
 * fórmula: los subtotales, el pie y el Resumen, que dependen de los ajustes del
 * período (que son celdas de insumo) y no del cálculo de una comisión cerrada.
 */

const HEADER_ROW = 13;
const FIRST_DATA_ROW = 14;
const COLUMNS = [
  'Bloque', 'Rec', 'Fec', 'Nombre', 'Plan', 'M', 'Cto N°', 'Vidas', 'Total',
  'G Adm', 'Cuota', 'Cuota-IVA', '%', 'Comisión', 'Adicional', 'Obs',
] as const;
type Column = (typeof COLUMNS)[number];

const MONEY_COLS: Column[] = ['Total', 'G Adm', 'Cuota', 'Cuota-IVA', 'Comisión', 'Adicional'];
const FMT_GS = '#,##0';
const FMT_PCT = '0.00%';
const FMT_DATE = 'dd/mm/yyyy';

const FILL_INPUT = 'FFFFF9C4';
const FILL_HEAD = 'FFDDE7F3';
const FILL_TOTAL = 'FFC8E6C9';

const BASE_LABEL: Record<string, string> = {
  plan_price: 'precio del plan',
  sale_total_amount: 'total de la venta',
  per_adherent: 'por adherente',
  net_of_fee_and_tax: 'neta de gasto adm. e IVA',
};

const BOX = {
  top: { style: 'thin' as const },
  left: { style: 'thin' as const },
  bottom: { style: 'thin' as const },
  right: { style: 'thin' as const },
};

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
const orNull = (value: unknown): number | null => (value == null || value === '' ? null : toNumber(value));

/** `YYYY-MM-DD` → fecha a medianoche UTC. Nunca `new Date(str)`: en UTC-4 retrocede un día (bug conocido #1). */
const parseDateOnly = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
};

const formatDateOnlyEs = (value: string) => value.slice(0, 10).split('-').reverse().join('/');

export interface PeriodFooter {
  viatico: number;
  recupero: number;
  bonifBase: number;
  bonifPct: number;
  adicionalExtra: number;
  descuentos: number;
  notes: Partial<Record<'viatico' | 'recupero' | 'bonif' | 'adicionalExtra' | 'descuentos', string>>;
}

/**
 * Reparte los ajustes del período en los insumos del pie. La suma
 * `viatico + recupero + bonif + adicional + extra − descuentos` coincide con
 * `Σ sign × amount` de la vista `commission_period_payable`.
 *
 * Un `adicional` ligado a un ítem va a la columna Adicional de SU fila, no acá;
 * un ajuste ligado a un ítem de otro concepto se trata como del período.
 */
export function summarizeAdjustments(adjustments: CommissionAdjustment[]): PeriodFooter {
  const footer: PeriodFooter = {
    viatico: 0, recupero: 0, bonifBase: 0, bonifPct: 1, adicionalExtra: 0, descuentos: 0, notes: {},
  };
  const bonif: CommissionAdjustment[] = [];
  const notes: Record<string, string[]> = {};
  const note = (key: string, adj: CommissionAdjustment) => {
    const label = adj.notes ? `${adj.notes}: ` : '';
    (notes[key] ||= []).push(`${label}${toNumber(adj.amount).toLocaleString('es-PY')}`);
  };

  for (const adj of adjustments) {
    const amount = toNumber(adj.amount);
    switch (adj.concept) {
      case 'viatico': footer.viatico += adj.sign * amount; note('viatico', adj); break;
      case 'recupero': footer.recupero += adj.sign * amount; note('recupero', adj); break;
      case 'bonificacion': bonif.push(adj); break;
      case 'adicional':
        if (adj.item_id) break; // va en la fila del ítem
        footer.adicionalExtra += adj.sign * amount; note('adicionalExtra', adj); break;
      case 'descuento': footer.descuentos += amount; note('descuentos', adj); break;
      default: // 'otro': el signo decide de qué lado del pie cae
        if (adj.sign === 1) { footer.adicionalExtra += amount; note('adicionalExtra', adj); }
        else { footer.descuentos += amount; note('descuentos', adj); }
    }
  }

  const bonifTotal = bonif.reduce((acc, adj) => acc + adj.sign * toNumber(adj.amount), 0);
  const only = bonif.length === 1 ? bonif[0] : null;
  const exact = only?.calc_mode === 'percent' && only.base_amount != null && only.percent != null
    && Math.abs(toNumber(only.base_amount) * toNumber(only.percent) / 100 - toNumber(only.amount)) < 1e-6;
  if (only && exact) {
    footer.bonifBase = toNumber(only.base_amount);
    footer.bonifPct = toNumber(only.percent) / 100;
  } else {
    // Varias bonificaciones, monto fijo o redondeo distinto: B6 lleva el monto y B7 = 100 %.
    footer.bonifBase = bonifTotal;
    footer.bonifPct = 1;
  }
  bonif.forEach((adj) => note('bonif', adj));

  for (const [key, list] of Object.entries(notes)) {
    footer.notes[key as keyof PeriodFooter['notes']] = list.join(' · ');
  }
  return footer;
}

interface SheetRow {
  values: Record<Column, string | number | Date | null>;
}

function buildRows(rows: CommissionExportRow[], adjustments: CommissionAdjustment[]): SheetRow[] {
  const adicionalByItem = new Map<string, number>();
  for (const adj of adjustments) {
    if (adj.concept === 'adicional' && adj.item_id) {
      adicionalByItem.set(adj.item_id, (adicionalByItem.get(adj.item_id) ?? 0) + adj.sign * toNumber(adj.amount));
    }
  }
  return rows.map((r) => {
    const net = r.base_type === 'net_of_fee_and_tax';
    const gross = orNull(r.gross_amount);
    const fee = orNull(r.admin_fee);
    const obs: string[] = [];
    if (r.client_display_id) obs.push(r.client_display_id);
    if (!net && r.base_type) obs.push(`Base ${BASE_LABEL[r.base_type] ?? r.base_type}: ${toNumber(r.base_amount).toLocaleString('es-PY')}`);
    if (r.calc_mode === 'fixed') obs.push('Monto fijo');
    return {
      values: {
        Bloque: r.group_type ?? '',
        Rec: null, // el sistema no registra el medio de cobro
        Fec: parseDateOnly(r.sale_date),
        Nombre: r.client_name,
        Plan: r.report_code || r.plan_name,
        M: saleTypeReportCode(r.sale_type),
        'Cto N°': r.contract_number,
        Vidas: orNull(r.lives),
        // Sólo valores del snapshot: sales.total_amount de hoy puede haber cambiado desde que se liquidó.
        Total: gross ?? (r.base_type === 'sale_total_amount' ? orNull(r.base_amount) : null),
        'G Adm': fee,
        Cuota: gross != null && fee != null ? gross - fee : null,
        'Cuota-IVA': net ? toNumber(r.base_amount) : null,
        '%': r.calc_mode === 'fixed' || r.percent == null ? null : toNumber(r.percent) / 100,
        Comisión: toNumber(r.commission_amount),
        Adicional: adicionalByItem.get(r.item_id) ?? 0,
        Obs: obs.join(' | ') || null,
      },
    };
  });
}

const stripAccents = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '');
const sheetNameOf = (raw: string) =>
  stripAccents(raw).replace(/[[\]:*?/\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 28).replace(/^'+|'+$/g, '').trim() || 'Liquidacion';

/** Nombres de hoja únicos sin distinguir mayúsculas, y sin pisar "Resumen". */
function uniqueSheetNames(periods: CommissionPeriod[]): string[] {
  const used = new Set<string>(['resumen']);
  return periods.map((period) => {
    const base = sheetNameOf(period.salesperson_name || period.liquidation_number);
    let name = base;
    for (let n = 2; used.has(name.toLowerCase()); n += 1) name = `${base.slice(0, 25)} (${n})`;
    used.add(name.toLowerCase());
    return name;
  });
}

const tableNameOf = (sheetName: string, index: number) => {
  const slug = stripAccents(sheetName).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'Liq';
  return `T_${slug}_${index + 1}`;
};

const structuredColumn = (table: string, column: Column) => `${table}[${column.replace(/(['[\]#])/g, "'$1")}]`;

interface SheetTotals {
  vidas: number;
  ventas: number;
  comision: number;
  bonificacion: number;
  viatico: number;
  recupero: number;
  adicional: number;
  descuentos: number;
  total: number;
}

function buildPeriodSheet(
  wb: Workbook,
  sheetName: string,
  tableName: string,
  period: CommissionPeriod,
  rows: SheetRow[],
  footer: PeriodFooter,
): SheetTotals {
  const ws = wb.addWorksheet(sheetName);
  const bold = { bold: true };

  ws.getCell('A1').value = 'LIQUIDACIÓN DE COMISIONES';
  ws.getCell('A1').font = { bold: true, size: 14 };
  const labelsA: Array<[number, string]> = [
    [2, 'Vendedor'], [3, 'Período'], [4, 'Viático'], [5, 'Recupero'], [6, 'Base bonificación'],
    [7, '% bonificación'], [8, 'Adicional extra'], [9, 'Descuentos (positivo)'],
  ];
  for (const [r, label] of labelsA) {
    ws.getCell(r, 1).value = label;
    ws.getCell(r, 1).font = bold;
  }

  ws.getCell('B2').value = period.salesperson_name;
  ws.getCell('B3').value = `${formatDateOnlyEs(period.period_start)} – ${formatDateOnlyEs(period.period_end)}`;
  ws.getCell('D3').value = 'Liquidación';
  ws.getCell('D3').font = bold;
  ws.getCell('E3').value = period.liquidation_number;

  const inputs: Array<[string, number, string, string?]> = [
    ['B4', footer.viatico, FMT_GS, footer.notes.viatico],
    ['B5', footer.recupero, FMT_GS, footer.notes.recupero],
    ['B6', footer.bonifBase, FMT_GS, footer.notes.bonif],
    ['B7', footer.bonifPct, FMT_PCT],
    ['B8', footer.adicionalExtra, FMT_GS, footer.notes.adicionalExtra],
    ['B9', footer.descuentos, FMT_GS, footer.notes.descuentos],
  ];
  for (const [ref, value, fmt, note] of inputs) {
    const cell = ws.getCell(ref);
    cell.value = value;
    cell.numFmt = fmt;
    if (note) cell.note = note;
  }
  for (const ref of ['B2', 'B3', 'E3', ...inputs.map(([r]) => r)]) {
    const cell = ws.getCell(ref);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FILL_INPUT } };
    cell.border = BOX;
  }

  // --- Tabla (valores del snapshot) -------------------------------------
  const body: Array<Array<string | number | Date | null>> = rows.length
    ? rows.map((r) => COLUMNS.map((c) => r.values[c]))
    : [COLUMNS.map(() => null)]; // un ListObject necesita al menos una fila
  ws.addTable({
    name: tableName,
    ref: `A${HEADER_ROW}`,
    headerRow: true,
    totalsRow: false,
    style: { theme: 'TableStyleLight9', showRowStripes: true },
    columns: COLUMNS.map((name) => ({ name, filterButton: true })),
    rows: body,
  });
  const last = FIRST_DATA_ROW + body.length - 1;
  COLUMNS.forEach((name, j) => {
    const col = j + 1;
    ws.getCell(HEADER_ROW, col).font = bold;
    ws.getCell(HEADER_ROW, col).alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
    for (let r = FIRST_DATA_ROW; r <= last; r += 1) {
      const cell = ws.getCell(r, col);
      if (MONEY_COLS.includes(name)) cell.numFmt = FMT_GS;
      else if (name === '%') cell.numFmt = FMT_PCT;
      else if (name === 'Fec') cell.numFmt = FMT_DATE;
      else if (name === 'Cto N°' || name === 'Vidas') cell.numFmt = '0';
      if (name === 'Obs') cell.alignment = { wrapText: true, vertical: 'top' };
    }
  });

  // --- Totales: fórmulas con referencias estructuradas -------------------
  const sum = (column: Column) => rows.reduce((acc, r) => acc + toNumber(r.values[column]), 0);
  const subtotal = (bloque: string) => rows
    .filter((r) => r.values.Bloque === bloque)
    .reduce((acc, r) => acc + toNumber(r.values['Comisión']), 0);
  const comision = sum('Comisión');
  const bonificacion = footer.bonifBase * footer.bonifPct;
  const adicionalTotal = sum('Adicional') + footer.adicionalExtra;
  const total = comision + footer.viatico + footer.recupero + bonificacion + adicionalTotal - footer.descuentos;

  const calc: Array<[number, string, string, number, string]> = [
    [4, 'Vidas', `SUM(${structuredColumn(tableName, 'Vidas')})`, sum('Vidas'), '#,##0'],
    [5, 'Ventas (Total)', `SUM(${structuredColumn(tableName, 'Total')})`, sum('Total'), FMT_GS],
    [6, 'Comisión', `SUM(${structuredColumn(tableName, 'Comisión')})`, comision, FMT_GS],
    [7, 'Bonificación', 'B6*B7', bonificacion, FMT_GS],
    [8, 'Adicional total', `SUM(${structuredColumn(tableName, 'Adicional')})+B8`, adicionalTotal, FMT_GS],
    [9, 'Subtotal Individual', `SUMIF(${structuredColumn(tableName, 'Bloque')},"INDIVIDUAL",${structuredColumn(tableName, 'Comisión')})`, subtotal('INDIVIDUAL'), FMT_GS],
    [10, 'Subtotal Grupal', `SUMIF(${structuredColumn(tableName, 'Bloque')},"GRUPAL",${structuredColumn(tableName, 'Comisión')})`, subtotal('GRUPAL'), FMT_GS],
  ];
  for (const [r, label, formula, result, fmt] of calc) {
    ws.getCell(r, 4).value = label;
    ws.getCell(r, 4).font = bold;
    const cell = ws.getCell(r, 5);
    cell.value = { formula, result };
    cell.numFmt = fmt;
    cell.border = BOX;
  }
  ws.getCell('A11').value = 'TOTAL A COBRAR';
  ws.getCell('E11').value = { formula: 'E6+B4+B5+E7+E8-B9', result: total };
  ws.getCell('E11').numFmt = FMT_GS;
  ws.getCell('E11').border = BOX;
  for (const ref of ['A11', 'E11']) {
    ws.getCell(ref).font = { bold: true, size: 12 };
    ws.getCell(ref).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FILL_TOTAL } };
  }

  const widths: Record<Column, number> = {
    Bloque: 12, Rec: 9, Fec: 11, Nombre: 28, Plan: 10, M: 6, 'Cto N°': 9, Vidas: 6, Total: 12,
    'G Adm': 10, Cuota: 12, 'Cuota-IVA': 12, '%': 8, Comisión: 12, Adicional: 11, Obs: 34,
  };
  COLUMNS.forEach((name, j) => { ws.getColumn(j + 1).width = widths[name]; });
  ws.getColumn(1).width = 20;
  ws.getColumn(2).width = 24;
  ws.getColumn(4).width = 28;
  ws.getColumn(5).width = 16;
  ws.getRow(HEADER_ROW).height = 30;
  ws.views = [{ state: 'frozen', ySplit: HEADER_ROW }];

  return {
    vidas: sum('Vidas'),
    ventas: sum('Total'),
    comision,
    bonificacion,
    viatico: footer.viatico,
    recupero: footer.recupero,
    adicional: adicionalTotal,
    descuentos: footer.descuentos,
    total,
  };
}

function buildResumenSheet(
  wb: Workbook,
  entries: Array<{ vendedor: string; hoja: string; totals: SheetTotals }>,
  subtitle: string,
): Worksheet {
  const ws = wb.addWorksheet('Resumen');
  ws.getCell('A1').value = 'RESUMEN DE LIQUIDACIÓN DE COMISIONES';
  ws.getCell('A1').font = { bold: true, size: 14 };
  ws.getCell('A2').value = subtitle;
  const heads = ['Vendedor', 'Hoja', 'Vidas', 'Ventas', 'Comisión', 'Bonificación', 'Viático',
    'Recupero', 'Adicional', 'Descuentos', 'Total', 'Control'];
  heads.forEach((h, j) => {
    const cell = ws.getCell(3, j + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FILL_HEAD } };
    cell.border = BOX;
  });

  // Mismas celdas fijas que lee la planilla de la Fase 1.
  const source: Array<[string, string, keyof SheetTotals]> = [
    ['C', '$E$4', 'vidas'], ['D', '$E$5', 'ventas'], ['E', '$E$6', 'comision'], ['F', '$E$7', 'bonificacion'],
    ['G', '$B$4', 'viatico'], ['H', '$B$5', 'recupero'], ['I', '$E$8', 'adicional'], ['J', '$B$9', 'descuentos'],
  ];
  const first = 4;
  entries.forEach(({ vendedor, hoja, totals }, k) => {
    const r = first + k;
    ws.getCell(`A${r}`).value = vendedor;
    ws.getCell(`B${r}`).value = hoja;
    const ind = (cell: string) => `INDIRECT("'"&SUBSTITUTE($B${r},"'","''")&"'!${cell}")`;
    for (const [col, cell, key] of source) {
      ws.getCell(`${col}${r}`).value = { formula: ind(cell), result: totals[key] };
    }
    ws.getCell(`K${r}`).value = { formula: `E${r}+F${r}+G${r}+H${r}+I${r}-J${r}`, result: totals.total };
    ws.getCell(`L${r}`).value = { formula: `K${r}-${ind('$E$11')}`, result: 0 };
    for (const col of 'CDEFGHIJKL') ws.getCell(`${col}${r}`).numFmt = FMT_GS;
  });
  const lastRow = first + entries.length - 1;
  const tr = lastRow + 1;
  ws.getCell(`A${tr}`).value = 'TOTAL';
  for (const col of 'CDEFGHIJKL') {
    const hit = source.find(([c]) => c === col);
    const result = entries.reduce((acc, e) => acc + (hit ? e.totals[hit[2]] : col === 'K' ? e.totals.total : 0), 0);
    ws.getCell(`${col}${tr}`).value = { formula: `SUM(${col}${first}:${col}${lastRow})`, result };
    ws.getCell(`${col}${tr}`).numFmt = FMT_GS;
  }
  for (const col of 'ABCDEFGHIJKL') {
    ws.getCell(`${col}${tr}`).font = { bold: true };
    ws.getCell(`${col}${tr}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FILL_TOTAL } };
  }
  ws.getCell('N3').value = 'Control = Total del Resumen − TOTAL A COBRAR de la hoja (E11). Tiene que dar 0.';
  ws.getCell('N3').font = { italic: true, size: 9, color: { argb: 'FF555555' } };
  ws.getColumn(1).width = 26;
  ws.getColumn(2).width = 22;
  for (const col of 'CDEFGHIJKL') ws.getColumn(col).width = 14;
  ws.views = [{ state: 'frozen', ySplit: 3 }];
  return ws;
}

export interface LiquidacionExportInput {
  periods: CommissionPeriod[];
  rows: CommissionExportRow[];
  adjustments: CommissionAdjustment[];
}

export async function buildLiquidacionWorkbook({ periods, rows, adjustments }: LiquidacionExportInput): Promise<ArrayBuffer> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SAMAP Prepaga Digital';
  wb.created = new Date();

  const names = uniqueSheetNames(periods);
  const entries = periods.map((period, index) => {
    const periodAdjustments = adjustments.filter((a) => a.period_id === period.id);
    const periodRows = buildRows(rows.filter((r) => r.period_id === period.id), periodAdjustments);
    const footer = summarizeAdjustments(periodAdjustments);
    const totals = buildPeriodSheet(wb, names[index], tableNameOf(names[index], index), period, periodRows, footer);
    return { vendedor: period.salesperson_name, hoja: names[index], totals };
  });

  const starts = periods.map((p) => p.period_start).sort();
  const ends = periods.map((p) => p.period_end).sort();
  buildResumenSheet(
    wb,
    entries,
    starts.length ? `${formatDateOnlyEs(starts[0])} – ${formatDateOnlyEs(ends[ends.length - 1])}` : '',
  );
  wb.calcProperties.fullCalcOnLoad = true;
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

export function liquidacionFileName(periods: CommissionPeriod[]): string {
  if (periods.length === 1) {
    return `liquidacion-${periods[0].liquidation_number.replace(/[^A-Za-z0-9_-]+/g, '_')}.xlsx`;
  }
  const starts = periods.map((p) => p.period_start).sort();
  const ends = periods.map((p) => p.period_end).sort();
  return `liquidaciones-${starts[0]}_${ends[ends.length - 1]}.xlsx`;
}
