import { Link } from 'react-router-dom';
import { ArrowLeft, Droplets, SearchX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';

export default function NotFoundPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="grid min-h-screen place-items-center bg-surface px-5">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-700 to-aqua-500 text-white shadow-lg shadow-brand-900/20">
          <Droplets className="size-7" />
        </div>
        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-aqua-600">
          Error 404
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-navy-900">
          This page does not exist
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-navy-700/70">
          The link may be outdated, or the page has not been built yet.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button as={Link} to={isAuthenticated ? '/dashboard' : '/login'} icon={ArrowLeft}>
            {isAuthenticated ? 'Back to dashboard' : 'Go to sign in'}
          </Button>
        </div>
        <p className="mt-8 flex items-center justify-center gap-1.5 text-[11px] text-navy-700/40">
          <SearchX className="size-3.5" />
          AquaTrack · Water Station BI
        </p>
      </div>
    </div>
  );
}
