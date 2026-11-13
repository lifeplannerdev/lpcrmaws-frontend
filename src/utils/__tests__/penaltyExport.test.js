import { describe, it, expect } from 'vitest';
import {
  filterPenaltiesForExport,
  buildEmployeeSummary,
  buildPeriodLabel,
  buildPenaltyReportHtml,
} from '../penaltyExport';

const samplePenalties = [
  { id: 1, user: 10, user_name: 'Navya Rajgopal', act: 'Missed call', amount: '100.00', month: '2026-10', date: '2026-10-27' },
  { id: 2, user: 11, user_name: 'Jinu Raju', act: 'Late ad', amount: '150.00', month: '2026-10', date: '2026-10-16' },
  { id: 3, user: 11, user_name: 'Jinu Raju', act: 'Absent', amount: '200.00', month: '2026-09', date: '2026-09-15' },
  { id: 4, user: { id: 12 }, user_name: 'Aswathy Krishna', act: 'Report delay', amount: '50.00', month: '2025-10', date: '2025-10-05' },
];

describe('penaltyExport utilities', () => {
  it('filters by year and month', () => {
    const res = filterPenaltiesForExport(samplePenalties, {
      dateMode: 'month_year',
      year: '2026',
      month: '10',
    });
    expect(res.map((p) => p.id)).toEqual([1, 2]);
  });

  it('filters by year only when month is empty', () => {
    const res = filterPenaltiesForExport(samplePenalties, {
      dateMode: 'month_year',
      year: '2026',
      month: '',
    });
    expect(res.map((p) => p.id)).toEqual([1, 2, 3]);
  });

  it('filters by specific date', () => {
    const res = filterPenaltiesForExport(samplePenalties, {
      dateMode: 'date',
      specificDate: '2026-10-16',
    });
    expect(res.map((p) => p.id)).toEqual([2]);
  });

  it('filters by custom date range', () => {
    const res = filterPenaltiesForExport(samplePenalties, {
      dateMode: 'range',
      startDate: '2026-09-01',
      endDate: '2026-10-20',
    });
    expect(res.map((p) => p.id)).toEqual([2, 3]);
  });

  it('filters by single employee and multiple selected employees', () => {
    const single = filterPenaltiesForExport(samplePenalties, {
      employeeScope: 'single',
      singleEmployeeId: '11',
    });
    expect(single.map((p) => p.id)).toEqual([2, 3]);

    const multi = filterPenaltiesForExport(samplePenalties, {
      employeeScope: 'multiple',
      selectedEmployeeIds: ['10', '12'],
    });
    expect(multi.map((p) => p.id)).toEqual([1, 4]);
  });

  it('builds employee summary and report HTML with grand total', () => {
    const summary = buildEmployeeSummary(samplePenalties);
    expect(summary[0]).toEqual({ employee: 'Jinu Raju', count: 2, total: 350 });

    const label = buildPeriodLabel({ dateMode: 'month_year', year: '2026', month: '10' });
    expect(label).toBe('October 2026');

    const html = buildPenaltyReportHtml({
      penalties: samplePenalties,
      company: 'LP',
      periodLabel: 'All Time',
      employeeScopeLabel: 'All Staff',
    });
    expect(html).toContain('Penalty Management Report');
    expect(html).toContain('₹500.00');
    expect(html).toContain('Navya Rajgopal');
  });
});
