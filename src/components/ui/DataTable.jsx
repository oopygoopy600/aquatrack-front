import EmptyState from './EmptyState';
import { Skeleton } from './Skeleton';
import { cx } from '../../utils/format';

/**
 * Lightweight data table with horizontal scrolling, loading skeletons and an
 * empty state. Column cells receive the row and can return any node.
 */
export default function DataTable({
  columns,
  rows,
  rowKey = (row) => row.id,
  loading = false,
  skeletonRows = 6,
  empty = {},
  footer = null,
  onRowClick = null,
  className = '',
}) {
  const isEmpty = !loading && rows.length === 0;

  return (
    <div className={className}>
      {loading ? (
        <div className="space-y-3 px-5 py-5">
          {Array.from({ length: skeletonRows }).map((_, index) => (
            <div key={index} className="flex items-center gap-4">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      ) : isEmpty ? (
        <EmptyState {...empty} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead>
              <tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase tracking-wider text-navy-700/50">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={cx('whitespace-nowrap px-4 py-2.5 font-bold first:pl-5 last:pr-5', column.headerClassName)}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cx(
                    'transition hover:bg-slate-50/70',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cx(
                        'px-4 py-3 align-middle text-navy-700/80 first:pl-5 last:pr-5',
                        column.className
                      )}
                    >
                      {column.cell ? column.cell(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {footer ? <div className="border-t border-slate-100">{footer}</div> : null}
    </div>
  );
}
