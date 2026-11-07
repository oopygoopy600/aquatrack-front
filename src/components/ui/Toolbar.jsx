import { Search, X } from 'lucide-react';
import { cx } from '../../utils/format';

export function SearchInput({ value, onChange, placeholder = 'Search…', className = '' }) {
  return (
    <div className={cx('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm text-navy-900 shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-navy-700"
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function FilterBar({ children, className = '' }) {
  return <div className={cx('flex flex-wrap items-center gap-2', className)}>{children}</div>;
}

export function Tabs({ tabs, value, onChange, className = '' }) {
  return (
    <div
      role="tablist"
      className={cx('flex flex-wrap items-center gap-1 rounded-xl bg-slate-100/80 p-1', className)}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cx(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition',
              active
                ? 'bg-white text-navy-900 shadow-sm'
                : 'text-navy-700/60 hover:text-navy-900'
            )}
          >
            {Icon ? <Icon className="size-3.5" /> : null}
            {tab.label}
            {tab.count !== undefined ? (
              <span
                className={cx(
                  'rounded-md px-1.5 py-0.5 text-[9px] font-bold',
                  active ? 'bg-brand-50 text-brand-700' : 'bg-white/70 text-navy-700/50'
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
