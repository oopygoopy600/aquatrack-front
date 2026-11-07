import { Loader2 } from 'lucide-react';
import { cx } from '../../utils/format';

const VARIANTS = {
  primary:
    'bg-brand-700 text-white shadow-lg shadow-brand-900/20 hover:bg-brand-800 focus-visible:outline-brand-700',
  aqua: 'bg-aqua-600 text-white shadow-lg shadow-aqua-900/20 hover:bg-aqua-700 focus-visible:outline-aqua-600',
  secondary:
    'border border-slate-200 bg-white text-navy-800 shadow-sm hover:bg-slate-50 focus-visible:outline-brand-600',
  ghost: 'text-navy-700 hover:bg-slate-100 focus-visible:outline-brand-600',
  danger: 'bg-red-600 text-white shadow-lg shadow-red-900/20 hover:bg-red-700 focus-visible:outline-red-600',
};

const SIZES = {
  sm: 'h-9 gap-1.5 px-3 text-xs',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-11 gap-2 px-5 text-sm',
  icon: 'size-10 justify-center',
};

/**
 * Shared button. Pass `as={Link}` plus `to` to render a router link instead.
 */
export default function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon = null,
  iconRight: IconRight = null,
  className = '',
  children,
  disabled = false,
  type = 'button',
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <Component
      type={Component === 'button' ? type : undefined}
      disabled={Component === 'button' ? isDisabled : undefined}
      aria-disabled={isDisabled || undefined}
      className={cx(
        'inline-flex select-none items-center justify-center rounded-xl font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant] || VARIANTS.primary,
        SIZES[size] || SIZES.md,
        className
      )}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : Icon ? <Icon className="size-4" /> : null}
      {children}
      {IconRight && !loading ? <IconRight className="size-4" /> : null}
    </Component>
  );
}
