import { cx } from '../../utils/format';

export function Skeleton({ className = '' }) {
  return <div className={cx('animate-pulse rounded-lg bg-slate-100', className)} />;
}

export function ChartSkeleton({ height = 'h-64' }) {
  return (
    <div className={cx('flex items-end gap-2', height)}>
      {[42, 66, 38, 78, 55, 88, 61, 73, 48, 82, 58, 70].map((heightPercent, index) => (
        <Skeleton
          key={index}
          className="flex-1 rounded-t-md"
          style={{ height: `${heightPercent}%` }}
        />
      ))}
    </div>
  );
}
