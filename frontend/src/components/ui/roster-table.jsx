import React from 'react';
import { getPersonInitial } from '../../lib/utils';

// Shared Student/Email/Year/Department/Register No roster: mobile card list +
// desktop table. `extraColumns` appends up to a couple of action/status
// columns (Admin Access, Remove, Add) on desktop; `mobileTopRight`/
// `mobileFooter` render the same affordances on the mobile card layout
// without forking the whole table per caller.
export function RosterTable({
  rows,
  calculateYear,
  emptyMessage = 'No results found.',
  extraColumns = [],
  mobileTopRight,
  mobileFooter,
}) {
  if (rows.length === 0) {
    return <div className="px-4 py-10 text-sm text-text-secondary dark:text-text-dark-secondary">{emptyMessage}</div>;
  }

  return (
    <>
      <div className="space-y-3 p-3 md:hidden">
        {rows.map((row) => {
          const initial = getPersonInitial(row);
          return (
            <article key={row.id} className="rounded-xl border border-border-subtle bg-surface-panel p-3 shadow-soft-sm dark:border-border-strong dark:bg-surface-canvas/65">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {row.picture ? (
                    <img src={row.picture} alt={row.name || 'Student'} className="h-9 w-9 rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{initial}</div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold" title={row.name || 'Unnamed student'}>{row.name || 'Unnamed student'}</p>
                    <p className="truncate text-xs text-text-secondary dark:text-text-dark-secondary" title={row.email || '-'}>{row.email || '-'}</p>
                  </div>
                </div>
                {mobileTopRight ? mobileTopRight(row) : null}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg bg-surface-muted px-2 py-1.5 dark:bg-border-strong/55">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Year</p>
                  <p className="mt-1 font-semibold">{calculateYear ? calculateYear(row.batch, row.degree, row.register_number) : (row.year || '-')}</p>
                </div>
                <div className="rounded-lg bg-surface-muted px-2 py-1.5 dark:bg-border-strong/55">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Dept</p>
                  <p className="mt-1 truncate font-semibold">{row.department || '-'}</p>
                </div>
                <div className="rounded-lg bg-surface-muted px-2 py-1.5 dark:bg-border-strong/55">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Reg No</p>
                  <p className="mt-1 truncate font-semibold" title={row.register_number || '-'}>{row.register_number || '-'}</p>
                </div>
              </div>
              {mobileFooter ? mobileFooter(row) : null}
            </article>
          );
        })}
      </div>

      <div className="hidden md:block">
        <table className="w-full min-w-176 table-fixed">
          <colgroup>
            <col className="w-[26%]" />
            <col className="w-[24%]" />
            <col className="w-[9%]" />
            <col className="w-[16%]" />
            <col className="w-[13%]" />
            {extraColumns.map((column) => <col key={column.label} className="w-[12%]" />)}
          </colgroup>
          <thead className="bg-surface-muted dark:bg-border-strong/55">
            <tr className="border-b border-border-subtle dark:border-border-strong">
              {['Student', 'Email', 'Year', 'Department', 'Register No', ...extraColumns.map((column) => column.label)].map((header) => (
                <th
                  key={header}
                  className={`px-5 py-3.5 text-xs font-bold uppercase tracking-[0.12em] text-text-secondary dark:text-text-dark-secondary ${extraColumns.some((column) => column.label === header) ? 'text-center' : 'text-left'}`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const initial = getPersonInitial(row);
              return (
                <tr key={row.id} className="border-b border-border-subtle transition-colors hover:bg-surface-muted dark:border-border-strong dark:hover:bg-border-strong/50">
                  <td className="px-5 py-4 align-middle">
                    <div className="flex items-center gap-3">
                      {row.picture ? (
                        <img src={row.picture} alt={row.name || 'Student'} className="h-9 w-9 rounded-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{initial}</div>
                      )}
                      <span className="block truncate text-sm font-semibold" title={row.name || 'Unnamed student'}>{row.name || 'Unnamed student'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 align-middle text-sm text-text-secondary dark:text-text-dark-secondary">
                    <span className="block truncate" title={row.email || '-'}>{row.email || '-'}</span>
                  </td>
                  <td className="px-5 py-4 align-middle text-sm">{calculateYear ? calculateYear(row.batch, row.degree, row.register_number) : (row.year || '-')}</td>
                  <td className="px-5 py-4 align-middle text-sm">{row.department || '-'}</td>
                  <td className="px-5 py-4 align-middle text-sm">
                    <span className="block truncate" title={row.register_number || '-'}>{row.register_number || '-'}</span>
                  </td>
                  {extraColumns.map((column) => (
                    <td key={column.label} className="px-5 py-4 align-middle text-center">{column.render(row)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
