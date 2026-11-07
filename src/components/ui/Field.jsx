import { cx } from '../../utils/format';

const CONTROL =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-navy-900 shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

export function Field({ label, htmlFor, hint = null, error = null, required = false, children, className = '' }) {
  return (
    <div className={cx('space-y-1.5', className)}>
      {label ? (
        <label htmlFor={htmlFor} className="flex items-center gap-1 text-xs font-semibold text-navy-800">
          {label}
          {required ? <span className="text-red-500">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-[11px] font-medium text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-navy-700/55">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className = '', invalid = false, ...props }) {
  return (
    <input
      className={cx(
        CONTROL,
        'h-11',
        invalid && 'border-red-300 focus:border-red-400 focus:ring-red-500/10',
        className
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function Select({ className = '', invalid = false, children, ...props }) {
  return (
    <select
      className={cx(
        CONTROL,
        'h-11 appearance-none bg-[length:16px] bg-[right_0.9rem_center] bg-no-repeat pr-9',
        invalid && 'border-red-300 focus:border-red-400 focus:ring-red-500/10',
        className
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
      }}
      aria-invalid={invalid || undefined}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className = '', invalid = false, rows = 3, ...props }) {
  return (
    <textarea
      rows={rows}
      className={cx(
        CONTROL,
        'resize-y py-2.5',
        invalid && 'border-red-300 focus:border-red-400 focus:ring-red-500/10',
        className
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}
