import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Droplets,
  Eye,
  EyeOff,
  Info,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Truck,
  UserRound,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';

const highlights = [
  { icon: BarChart3, title: 'Descriptive analytics', note: 'Revenue, demand and zone performance' },
  { icon: Sparkles, title: 'Predictive forecasting', note: 'Short-term demand projections' },
  { icon: Truck, title: 'Delivery insights', note: 'Routes, completion and cost per zone' },
];

const demoAccounts = [
  { label: 'Admin', identifier: 'admin', password: 'Admin@123' },
  { label: 'Staff', identifier: 'staff', password: 'Staff@123' },
];

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const redirectTo = location.state?.from?.pathname || '/dashboard';

  if (isAuthenticated) return <Navigate to={redirectTo} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!identifier.trim() || !password) {
      setError('Enter your username or email and your password.');
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(identifier.trim(), password);
      toast.success(`Welcome back, ${user.full_name.split(' ')[0]}.`);
      navigate(redirectTo, { replace: true });
    } catch (requestError) {
      const data = requestError.response?.data;
      const fieldMessage = data?.errors?.[0]?.message;
      if (!requestError.response) {
        setError('Cannot reach the API. Make sure the Express server is running, then try again.');
      } else {
        setError(fieldMessage || data?.message || 'Unable to sign in. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (account) => {
    setIdentifier(account.identifier);
    setPassword(account.password);
    setError('');
  };

  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <section className="relative hidden overflow-hidden bg-navy-950 text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 size-96 rounded-full bg-brand-600/30 blur-3xl" />
          <div className="absolute right-[-10rem] top-1/3 size-[28rem] rounded-full bg-aqua-500/20 blur-3xl" />
          <div className="absolute bottom-[-8rem] left-1/4 size-80 rounded-full bg-brand-400/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)",
              backgroundSize: '56px 56px',
            }}
          />
        </div>

        <div className="relative flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-aqua-400 to-brand-600 shadow-lg shadow-brand-950/40">
            <Droplets className="size-6" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight">AquaTrack</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-aqua-200/70">
              Water Station BI
            </p>
          </div>
        </div>

        <div className="relative max-w-lg animate-float-up">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold text-aqua-100">
            <ShieldCheck className="size-3.5" />
            Capstone business analytics system
          </span>

          <p className="mt-6 text-[2.6rem] font-extrabold leading-[1.08] tracking-tight">
            Run the station.
            <span className="mt-1 block bg-gradient-to-r from-aqua-300 to-brand-300 bg-clip-text text-transparent">
              Understand the business.
            </span>
          </p>

          <p className="mt-5 max-w-md text-sm leading-relaxed text-brand-100/70">
            Sales, inventory, deliveries and expenses in one place - backed by real PostgreSQL queries,
            with descriptive, predictive and prescriptive analytics on top.
          </p>

          <ul className="mt-8 space-y-3">
            {highlights.map(({ icon: Icon, title, note }) => (
              <li key={title} className="flex items-start gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-aqua-400/15 text-aqua-300">
                  <Icon className="size-4.5" />
                </span>
                <div>
                  <p className="text-xs font-bold text-white">{title}</p>
                  <p className="text-[11px] text-brand-100/60">{note}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11px] leading-relaxed text-brand-100/45">
          Demo environment. All customers, sales and expenses are simulated seed data and do not
          represent a real business.
        </p>
      </section>

      {/* Form panel */}
      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md animate-float-up">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-700 to-aqua-500 text-white shadow-lg shadow-brand-900/20">
              <Droplets className="size-6" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight text-navy-900">AquaTrack</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-navy-700/50">
                Water Station BI
              </p>
            </div>
          </div>

          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-aqua-600">
            Secure sign in
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-navy-900">
            Welcome back
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-navy-700/70">
            Use your station account to open the dashboard.
          </p>

          {error ? (
            <div
              role="alert"
              className="mt-6 flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-xs font-medium text-red-700"
            >
              <Info className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <Field label="Username or email" htmlFor="identifier" required>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="identifier"
                  name="identifier"
                  autoComplete="username"
                  placeholder="admin"
                  className="pl-10"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  disabled={submitting}
                  autoFocus
                />
              </div>
            </Field>

            <Field label="Password" htmlFor="password" required>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-10 pr-11"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>

            <Button
              type="submit"
              size="lg"
              loading={submitting}
              iconRight={ArrowRight}
              className="w-full"
            >
              {submitting ? 'Signing in…' : 'Sign in to dashboard'}
            </Button>
          </form>

          <div className="mt-7 rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 p-4">
            
            <div className="mt-3 grid grid-cols-2 gap-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.identifier}
                  type="button"
                  onClick={() => fillDemo(account)}
                  disabled={submitting}
                  className="rounded-xl border border-brand-100 bg-white px-3 py-2 text-left transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-60"
                >
                  <span className="block text-xs font-bold text-navy-900">{account.label}</span>
                  <span className="block font-mono text-[10px] text-navy-700/55">
                    {account.identifier}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-[11px] leading-relaxed text-navy-700/50">
            Accounts are created by an administrator. Contact the owner if you need access.
          </p>
        </div>
      </section>
    </div>
  );
}
