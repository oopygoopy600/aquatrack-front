import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronDown, LogOut, Menu, ShieldCheck, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { getPageMeta } from '../../config/navigation';
import { useAuth } from '../../context/AuthContext';
import { initials, todayLong } from '../../utils/format';

export default function Topbar({ onMenu }) {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const meta = getPageMeta(location.pathname);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    toast.success('You have been signed out.');
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-md print:hidden">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenu}
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-navy-700 shadow-sm hover:bg-slate-50 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold tracking-tight text-navy-900">{meta.title}</p>
          {meta.subtitle ? (
            <p className="hidden truncate text-[11px] text-navy-700/60 sm:block">{meta.subtitle}</p>
          ) : null}
        </div>

        <div className="hidden items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 md:inline-flex">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          Live PostgreSQL data
        </div>

        <div className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-navy-700/70 xl:inline-flex">
          <CalendarDays className="size-3.5" />
          {todayLong()}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-2.5 shadow-sm transition hover:bg-slate-50"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-brand-700 to-aqua-500 text-[11px] font-bold text-white">
              {initials(user?.full_name)}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block max-w-32 truncate text-xs font-bold leading-tight text-navy-900">
                {user?.full_name}
              </span>
              <span className="block text-[10px] capitalize leading-tight text-navy-700/55">
                {user?.role}
              </span>
            </span>
            <ChevronDown className="size-3.5 text-slate-400" />
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="animate-float-up absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-float"
            >
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="truncate text-sm font-bold text-navy-900">{user?.full_name}</p>
                <p className="truncate text-[11px] text-navy-700/60">{user?.email}</p>
                <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">
                  <ShieldCheck className="size-3" />
                  {isAdmin ? 'Administrator' : 'Staff'}
                </div>
              </div>
              <div className="p-1.5">
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-navy-700 hover:bg-slate-50"
                  onClick={() => {
                    setMenuOpen(false);
                    toast('Profile settings arrive in a later phase.', { icon: 'ℹ️' });
                  }}
                >
                  <UserRound className="size-4 text-slate-400" />
                  Profile
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
