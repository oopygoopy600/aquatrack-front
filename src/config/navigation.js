import {
  BarChart3,
  Boxes,
  FileText,
  LayoutDashboard,
  Lightbulb,
  Package,
  Receipt,
  Route,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';

/**
 * Single source of truth for the sidebar and page headings.
 * Items marked `soon` are placeholders until their phase lands.
 */
export const navSections = [
  {
    label: 'Overview',
    items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Operations',
    items: [
      { to: '/sales', label: 'Sales', icon: ShoppingCart },
      { to: '/inventory', label: 'Inventory', icon: Boxes },
      { to: '/deliveries', label: 'Deliveries', icon: Truck },
    ],
  },
  {
    label: 'Management',
    items: [
      { to: '/customers', label: 'Customers', icon: Users },
      { to: '/products', label: 'Products', icon: Package },
      { to: '/expenses', label: 'Expenses', icon: Receipt },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/forecasting', label: 'Forecasting', icon: TrendingUp },
      { to: '/recommendations', label: 'Recommendations', icon: Lightbulb },
      { to: '/delivery-optimization', label: 'Delivery Optimizer', icon: Route },
      { to: '/reports', label: 'Reports', icon: FileText },
    ],
  },
];

export const pageMeta = {
  '/dashboard': {
    title: 'Dashboard',
    subtitle: 'A live snapshot of sales, stock and delivery performance.',
  },
  '/sales': { title: 'Sales', subtitle: 'Transactions and revenue records.' },
  '/inventory': { title: 'Inventory', subtitle: 'Stock levels, movements and reorder alerts.' },
  '/deliveries': { title: 'Deliveries', subtitle: 'Delivery orders, zones and completion.' },
  '/customers': { title: 'Customers', subtitle: 'Residential and commercial accounts.' },
  '/products': { title: 'Products', subtitle: 'Water products, pricing and containers.' },
  '/expenses': { title: 'Expenses', subtitle: 'Operating costs recorded by category.' },
  '/analytics': { title: 'Descriptive Analytics', subtitle: 'Trends, rankings and business drivers.' },
  '/forecasting': { title: 'Demand Forecasting', subtitle: 'Short-term demand projections.' },
  '/recommendations': { title: 'Recommendations', subtitle: 'Prescriptive business guidance.' },
  '/delivery-optimization': {
    title: 'Delivery Optimization',
    subtitle: 'Zone economics, batching and timing.',
  },
  '/reports': { title: 'Reports', subtitle: 'Printable and exportable summaries.' },
};

export function getPageMeta(pathname) {
  if (pageMeta[pathname]) return pageMeta[pathname];
  const match = Object.keys(pageMeta).find((path) => pathname.startsWith(`${path}/`));
  return match ? pageMeta[match] : { title: 'AquaTrack', subtitle: '' };
}
