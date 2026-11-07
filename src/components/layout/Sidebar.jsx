import { NavLink } from 'react-router-dom';
import { Droplets, Info, X } from 'lucide-react';
import { navSections } from '../../config/navigation';
import { useAuth } from '../../context/AuthContext';
import { cx, initials } from '../../utils/format';

function NavItem({ item, onNavigate }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cx(
          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
          isActive
            ? 'bg-white/10 text-white shadow-inner'
            : 'text-brand-100/70 hover:bg-white/5 hover:text-white'
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cx(
              'absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full transition-all',
              isActive ? 'bg-aqua-400 opacity-100' : 'opacity-0'
            )}
          />
          <Icon
            className={cx(
              'size-[1.15rem] shrink-0 transition',
              isActive ? 'text-aqua-300' : 'text-brand-200/60 group-hover:text-aqua-200'
            )}
          />
          <span className="flex-1 truncate">{item.label}</span>
          {item.soon ? (
            <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-100/70">
              {item.soon}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();

  return (
    <>
      <div
        className={cx(
          'fixed inset-0 z-40 bg-navy-950/60 backdrop-blur-sm transition-opacity lg:hidden print:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-navy-900 text-white transition-transform duration-300 lg:translate-x-0 print:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-16 top-10 size-56 rounded-full bg-brand-600/20 blur-3xl" />
          <div className="absolute -right-20 bottom-24 size-60 rounded-full bg-aqua-500/10 blur-3xl" />
        </div>

        <div className="relative flex h-16 items-center justify-between gap-3 border-b border-white/10 px-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-aqua-400 to-brand-600 text-white shadow-lg shadow-brand-950/40">
              <Droplets className="size-5" />
            </div>
            <div>
              <p className="text-base font-bold leading-tight tracking-tight">AquaTrack</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-brand-200/60">
                Water Station BI
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-lg text-brand-100/70 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X className="size-4.5" />
          </button>
        </div>

        <nav className="relative flex-1 space-y-5 overflow-y-auto px-3 py-5">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-200/40">
                {section.label}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavItem key={item.to} item={item} onNavigate={onClose} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="relative border-t border-white/10 p-4">
          

          {user ? (
            <div className="mt-3 flex items-center gap-3 rounded-xl px-2 py-2">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-aqua-400 to-brand-600 text-xs font-bold">
                {initials(user.full_name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">{user.full_name}</p>
                <p className="text-[10px] capitalize text-brand-200/60">{user.role}</p>
              </div>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
