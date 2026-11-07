import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cx, formatNumber } from '../../utils/format';

function pageNumbers(page, totalPages) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const pages = new Set([1, totalPages, page, page - 1, page + 1]);
  return [...pages].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);
}

export default function Pagination({ meta, onPageChange, loading = false, itemLabel = 'records' }) {
  if (!meta || !meta.total) return null;

  const { page, totalPages, total, limit } = meta;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const numbers = pageNumbers(page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
      <p className="text-[11px] text-navy-700/55">
        Showing <span className="font-semibold text-navy-800">{formatNumber(from)}</span>–
        <span className="font-semibold text-navy-800">{formatNumber(to)}</span> of{' '}
        <span className="font-semibold text-navy-800">{formatNumber(total)}</span> {itemLabel}
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={!meta.hasPrev || loading}
          className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-navy-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </button>

        {numbers.map((number, index) => {
          const previous = numbers[index - 1];
          const gap = previous && number - previous > 1;
          return (
            <span key={number} className="flex items-center gap-1">
              {gap ? <span className="px-1 text-[11px] text-slate-400">…</span> : null}
              <button
                type="button"
                onClick={() => onPageChange(number)}
                disabled={loading}
                aria-current={number === page ? 'page' : undefined}
                className={cx(
                  'size-8 rounded-lg border text-[11px] font-bold transition disabled:opacity-50',
                  number === page
                    ? 'border-brand-700 bg-brand-700 text-white'
                    : 'border-slate-200 bg-white text-navy-700 hover:bg-slate-50'
                )}
              >
                {number}
              </button>
            </span>
          );
        })}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!meta.hasNext || loading}
          className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-navy-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
