import { Loader2 } from 'lucide-react';
import { cx } from '../../utils/format';

const SIZES = {
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-9',
};

export default function Spinner({ size = 'md', className = '', label = 'Loading' }) {
  return (
    <span role="status" aria-label={label} className={cx('inline-flex items-center justify-center', className)}>
      <Loader2 className={cx('animate-spin text-brand-600', SIZES[size] || SIZES.md)} />
    </span>
  );
}

export function FullPageLoader({ label = 'Preparing your dashboard…' }) {
  return (
    <div className="grid min-h-screen place-items-center bg-surface">
      <div className="flex flex-col items-center gap-4">
        <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-700 to-aqua-500 text-white shadow-lg shadow-brand-900/20">
          <Loader2 className="size-6 animate-spin" />
        </div>
        <p className="text-sm font-medium text-navy-700/70">{label}</p>
      </div>
    </div>
  );
}
