import { cx } from '../../utils/format';

export function Card({ className = '', children, ...props }) {
  return (
    <section
      className={cx('rounded-2xl border border-white bg-white shadow-card', className)}
      {...props}
    >
      {children}
    </section>
  );
}

export function CardHeader({ title, subtitle = null, icon: Icon = null, action = null, className = '' }) {
  return (
    <div className={cx('flex flex-wrap items-start justify-between gap-3 px-5 pt-5', className)}>
      <div className="flex items-start gap-3">
        {Icon ? (
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <Icon className="size-4.5" />
          </span>
        ) : null}
        <div>
          <h2 className="text-sm font-bold tracking-tight text-navy-900">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-navy-700/65">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className = '', children }) {
  return <div className={cx('px-5 pb-5 pt-3', className)}>{children}</div>;
}
