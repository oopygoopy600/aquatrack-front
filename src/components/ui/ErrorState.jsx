import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './Button';

export default function ErrorState({
  title = 'Something went wrong',
  message = 'We could not load this data. Check that the API and PostgreSQL are running.',
  onRetry = null,
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50/60 px-6 py-10 text-center"
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-white text-red-500 shadow-sm">
        <AlertTriangle className="size-6" />
      </span>
      <p className="mt-4 text-sm font-bold text-navy-900">{title}</p>
      <p className="mt-1 max-w-md text-xs leading-relaxed text-navy-700/70">{message}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry} className="mt-5">
          Try again
        </Button>
      ) : null}
    </div>
  );
}
