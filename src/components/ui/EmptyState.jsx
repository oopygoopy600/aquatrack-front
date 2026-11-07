import { Inbox } from 'lucide-react';
import { cx } from '../../utils/format';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  description = null,
  action = null,
  className = '',
}) {
  return (
    <div className={cx('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <span className="grid size-14 place-items-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-100">
        <Icon className="size-6" />
      </span>
      <p className="mt-4 text-sm font-bold text-navy-900">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-navy-700/65">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
