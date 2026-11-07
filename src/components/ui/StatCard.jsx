import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cx } from '../../utils/format';

const TONES = {
  brand: {
    icon: 'bg-brand-50 text-brand-700',
    accent: 'from-brand-500/80 to-aqua-400/70',
  },
  aqua: {
    icon: 'bg-aqua-50 text-aqua-700',
    accent: 'from-aqua-400/80 to-brand-400/70',
  },
  emerald: {
    icon: 'bg-emerald-50 text-emerald-600',
    accent: 'from-emerald-400/80 to-aqua-400/70',
  },
  amber: {
    icon: 'bg-amber-50 text-amber-600',
    accent: 'from-amber-400/80 to-orange-300/70',
  },
  violet: {
    icon: 'bg-violet-50 text-violet-600',
    accent: 'from-violet-400/80 to-brand-400/70',
  },
};

/**
 * Headline KPI card. `trend` accepts { value: number, label: string }.
 */
export default function StatCard({
  label,
  value,
  hint = null,
  icon: Icon,
  tone = 'brand',
  trend = null,
  loading = false,
  className = '',
}) {
  const palette = TONES[tone] || TONES.brand;
  const isPositive = trend?.value >= 0;

  return (
    <div
      className={cx(
        'group relative overflow-hidden rounded-2xl border border-white bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-float',
        className
      )}
    >
      <div
        className={cx(
          'absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-70',
          palette.accent
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-navy-700/60">{label}</p>
        {Icon ? (
          <span className={cx('grid size-9 place-items-center rounded-xl', palette.icon)}>
            <Icon className="size-4.5" />
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-4 space-y-2">
          <div className="h-8 w-28 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
        </div>
      ) : (
        <>
          <p className="mt-3 text-[1.65rem] font-extrabold leading-none tracking-tight text-navy-900">
            {value}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {trend ? (
              <span
                className={cx(
                  'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold',
                  isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                )}
              >
                {isPositive ? (
                  <ArrowUpRight className="size-3" />
                ) : (
                  <ArrowDownRight className="size-3" />
                )}
                {trend.label}
              </span>
            ) : null}
            {hint ? <span className="text-[11px] text-navy-700/60">{hint}</span> : null}
          </div>
        </>
      )}
    </div>
  );
}
