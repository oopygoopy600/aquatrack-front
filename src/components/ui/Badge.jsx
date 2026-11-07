import { cx } from '../../utils/format';

const TONES = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-100',
  aqua: 'bg-aqua-50 text-aqua-700 ring-aqua-100',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  red: 'bg-red-50 text-red-600 ring-red-100',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-100',
};

const DOTS = {
  brand: 'bg-brand-500',
  aqua: 'bg-aqua-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  slate: 'bg-slate-400',
  violet: 'bg-violet-500',
};

export default function Badge({ tone = 'slate', dot = false, className = '', children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset',
        TONES[tone] || TONES.slate,
        className
      )}
    >
      {dot ? <span className={cx('size-1.5 rounded-full', DOTS[tone] || DOTS.slate)} /> : null}
      {children}
    </span>
  );
}
