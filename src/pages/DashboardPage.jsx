import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Droplets,
  MapPin,
  PackageCheck,
  Receipt,
  RefreshCw,
  ShoppingCart,
  Truck,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import PageHeader from '../components/ui/PageHeader';
import { ChartSkeleton, Skeleton } from '../components/ui/Skeleton';
import StatCard from '../components/ui/StatCard';
import {
  formatCompactCurrency,
  formatCurrency,
  formatDateShort,
  formatDateTime,
  formatNumber,
  formatPercent,
  parseDateValue,
} from '../utils/format';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend
);

const PAYMENT_COLORS = ['#184edb', '#06b6d4', '#8b5cf6', '#f59e0b'];

function dateKey(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function buildTrendSeries(dailyTrend = [], days = 14) {
  if (!dailyTrend.length) return { labels: [], revenue: [], transactions: [] };

  const byDate = new Map(dailyTrend.map((row) => [String(row.sale_date).slice(0, 10), row]));
  const latest = parseDateValue(dailyTrend[dailyTrend.length - 1].sale_date) || new Date();

  const labels = [];
  const revenue = [];
  const transactions = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(latest);
    date.setDate(latest.getDate() - offset);
    const key = dateKey(date);
    const row = byDate.get(key);
    labels.push(formatDateShort(key));
    revenue.push(Number(row?.revenue || 0));
    transactions.push(Number(row?.transactions || 0));
  }

  return { labels, revenue, transactions };
}

function ProgressRow({ children }) {
  return <div className="space-y-1.5">{children}</div>;
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');

    const results = await Promise.allSettled([
      api.get('/sales/summary'),
      api.get('/inventory'),
      api.get('/inventory/low-stock'),
      api.get('/deliveries/summary'),
      api.get('/expenses/summary'),
      api.get('/customers', { params: { limit: 1, status: 'all' } }),
      api.get('/sales', { params: { limit: 6 } }),
    ]);

    const allFailed = results.every((result) => result.status === 'rejected');
    if (allFailed) {
      setError(
        results[0]?.reason?.response?.data?.message ||
          'The dashboard could not reach the API. Confirm the server and PostgreSQL are running.'
      );
      setLoading(false);
      return;
    }

    const value = (index, fallback) =>
      results[index].status === 'fulfilled' ? results[index].value.data.data : fallback;
    const meta = (index, fallback) =>
      results[index].status === 'fulfilled' ? results[index].value.data.meta : fallback;

    setData({
      sales: value(0, null),
      inventory: value(1, []),
      lowStock: value(2, []),
      deliveries: value(3, null),
      expenses: value(4, null),
      customerTotal: meta(5, {})?.total ?? 0,
      recentSales: value(6, []),
    });
    setLastUpdated(new Date());
    setLoading(false);

    if (silent) toast.success('Dashboard refreshed');
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const metrics = useMemo(() => {
    const totals = data?.sales?.totals;
    const expenseTotal = Number(data?.expenses?.totals?.total_amount || 0);
    const revenue = Number(totals?.total_revenue || 0);
    const stock = (data?.inventory || []).reduce(
      (accumulator, row) => ({
        filled: accumulator.filled + Number(row.filled_gallons || 0),
        empty: accumulator.empty + Number(row.empty_containers || 0),
        damaged: accumulator.damaged + Number(row.damaged_containers || 0),
      }),
      { filled: 0, empty: 0, damaged: 0 }
    );

    return {
      revenue,
      expenses: expenseTotal,
      net: revenue - expenseTotal,
      gallons: Number(totals?.total_gallons || 0),
      transactions: Number(totals?.total_transactions || 0),
      averageSale: Number(totals?.average_sale || 0),
      units: Number(totals?.total_units || 0),
      stock,
      lowStockCount: (data?.lowStock || []).length,
      customers: Number(data?.customerTotal || 0),
      deliveries: data?.deliveries?.totals || null,
    };
  }, [data]);

  const trend = useMemo(
    () => buildTrendSeries(data?.sales?.daily_trend || [], 14),
    [data]
  );

  const lineData = useMemo(
    () => ({
      labels: trend.labels,
      datasets: [
        {
          label: 'Revenue',
          data: trend.revenue,
          borderColor: '#184edb',
          backgroundColor: 'rgba(34, 211, 238, 0.12)',
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: '#06b6d4',
          pointHoverBorderColor: '#ffffff',
          pointHoverBorderWidth: 2,
        },
      ],
    }),
    [trend]
  );

  const lineOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          padding: 10,
          cornerRadius: 10,
          displayColors: false,
          titleFont: { size: 11 },
          bodyFont: { size: 12, weight: 'bold' },
          callbacks: {
            label: (context) => `${formatCurrency(context.parsed.y)} revenue`,
            afterLabel: (context) =>
              `${formatNumber(trend.transactions[context.dataIndex] || 0)} transactions`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: '#94a3b8', font: { size: 10 }, maxRotation: 0, autoSkipPadding: 12 },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(148, 163, 184, 0.16)' },
          border: { display: false },
          ticks: {
            color: '#94a3b8',
            font: { size: 10 },
            callback: (value) => formatCompactCurrency(value),
          },
        },
      },
    }),
    [trend]
  );

  const paymentBreakdown = useMemo(
    () => data?.sales?.payment_breakdown || [],
    [data]
  );
  const paymentTotal = paymentBreakdown.reduce(
    (sum, row) => sum + Number(row.revenue || 0),
    0
  );

  const doughnutData = useMemo(
    () => ({
      labels: paymentBreakdown.map((row) => row.payment_method),
      datasets: [
        {
          data: paymentBreakdown.map((row) => Number(row.revenue || 0)),
          backgroundColor: paymentBreakdown.map(
            (_, index) => PAYMENT_COLORS[index % PAYMENT_COLORS.length]
          ),
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    }),
    [paymentBreakdown]
  );

  const doughnutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 7,
            boxHeight: 7,
            padding: 14,
            color: '#475569',
            font: { size: 10, weight: '600' },
          },
        },
        tooltip: {
          backgroundColor: '#0f172a',
          padding: 10,
          cornerRadius: 10,
          callbacks: {
            label: (context) =>
              ` ${context.label}: ${formatCurrency(context.parsed)} (${formatPercent(
                paymentTotal ? (context.parsed / paymentTotal) * 100 : 0
              )})`,
          },
        },
      },
    }),
    [paymentTotal]
  );

  const topCustomers = data?.sales?.top_customers || [];
  const maxCustomerRevenue = Math.max(...topCustomers.map((row) => Number(row.revenue || 0)), 1);

  const deliveryZones = data?.deliveries?.by_zone || [];
  const maxZoneDeliveries = Math.max(...deliveryZones.map((row) => Number(row.deliveries || 0)), 1);

  const recentSales = data?.recentSales || [];

  const renderBody = () => {
    if (loading && !data) {
      return (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((index) => (
              <Card key={index} className="p-5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-4 h-8 w-32" />
                <Skeleton className="mt-3 h-3 w-20" />
              </Card>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <Skeleton className="h-4 w-40" />
              <ChartSkeleton height="h-72" />
            </Card>
            <Card className="p-5">
              <Skeleton className="h-4 w-32" />
              <div className="mt-6 grid place-items-center">
                <Skeleton className="size-48 rounded-full" />
              </div>
            </Card>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <ErrorState
          title="Dashboard data unavailable"
          message={error}
          onRetry={() => loadDashboard()}
        />
      );
    }

    return (
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total revenue"
            value={formatCurrency(metrics.revenue)}
            hint={`${formatNumber(metrics.transactions)} transactions · ${formatCurrency(
              metrics.averageSale
            )} avg sale`}
            icon={Wallet}
            tone="brand"
          />
          <StatCard
            label="Water sold"
            value={`${formatNumber(metrics.gallons)} gal`}
            hint={`${formatNumber(metrics.units)} containers delivered`}
            icon={Droplets}
            tone="aqua"
          />
          <StatCard
            label="Deliveries completed"
            value={formatNumber(metrics.deliveries?.delivered || 0)}
            hint={`${formatPercent(metrics.deliveries?.completion_rate || 0)} completion · ${formatNumber(
              (metrics.deliveries?.pending || 0) + (metrics.deliveries?.in_transit || 0)
            )} open`}
            icon={Truck}
            tone="emerald"
          />
          <StatCard
            label="Revenue − expenses"
            value={formatCurrency(metrics.net)}
            hint={`${formatCurrency(metrics.expenses)} recorded expenses`}
            icon={CircleDollarSign}
            tone="violet"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="min-w-0 lg:col-span-2">
            <CardHeader
              title="Revenue trend"
              subtitle="Last 14 days of recorded transactions"
              icon={Activity}
              action={
                <Badge tone="brand" dot>
                  {formatCurrency(trend.revenue.reduce((sum, value) => sum + value, 0))} in period
                </Badge>
              }
            />
            <CardBody>
              {trend.labels.length ? (
                <div className="h-72">
                  <Line data={lineData} options={lineOptions} />
                </div>
              ) : (
                <EmptyState
                  icon={TrendingUp}
                  title="No sales in this period"
                  description="Revenue will chart here as soon as transactions are recorded."
                />
              )}
            </CardBody>
          </Card>

          <Card className="min-w-0">
            <CardHeader
              title="Payment mix"
              subtitle="Share of revenue by method"
              icon={ShoppingCart}
            />
            <CardBody>
              {paymentBreakdown.length ? (
                <>
                  <div className="relative h-56">
                    <Doughnut data={doughnutData} options={doughnutOptions} />
                    <div className="pointer-events-none absolute inset-x-0 top-[38%] -translate-y-1/2 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-navy-700/50">
                        Revenue
                      </p>
                      <p className="text-xl font-extrabold tracking-tight text-navy-900">
                        {formatCurrency(paymentTotal)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {paymentBreakdown.map((row, index) => (
                      <div
                        key={row.payment_method}
                        className="flex items-center justify-between rounded-lg bg-slate-50/70 px-2.5 py-1.5 text-[11px]"
                      >
                        <span className="flex items-center gap-1.5 font-semibold text-navy-800">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: PAYMENT_COLORS[index % PAYMENT_COLORS.length] }}
                          />
                          {row.payment_method}
                        </span>
                        <span className="font-bold text-navy-900">
                          {formatCurrency(row.revenue)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState icon={ShoppingCart} title="No payment data" />
              )}
            </CardBody>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="min-w-0">
            <CardHeader
              title="Top customers"
              subtitle="Ranked by revenue"
              icon={Users}
              action={
                <Link
                  to="/customers"
                  className="text-[11px] font-bold text-brand-700 hover:text-brand-800"
                >
                  View all
                </Link>
              }
            />
            <CardBody>
              {topCustomers.length ? (
                <div className="space-y-3.5">
                  {topCustomers.map((customer, index) => {
                    const width = Math.max(
                      6,
                      Math.round((Number(customer.revenue) / maxCustomerRevenue) * 100)
                    );
                    return (
                      <ProgressRow key={customer.customer_id}>
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-brand-50 text-[10px] font-bold text-brand-700">
                              {index + 1}
                            </span>
                            <span className="truncate font-semibold text-navy-900">
                              {customer.customer_name}
                            </span>
                            <span className="hidden shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 sm:inline">
                              {customer.customer_type}
                            </span>
                          </span>
                          <span className="shrink-0 font-bold text-navy-900">
                            {formatCurrency(customer.revenue)}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-brand-600 to-aqua-500"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </ProgressRow>
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon={Users} title="No customer activity yet" />
              )}
            </CardBody>
          </Card>

          <Card className="min-w-0">
            <CardHeader
              title="Stock alerts"
              subtitle="Products at or below reorder level"
              icon={AlertTriangle}
              action={
                metrics.lowStockCount ? (
                  <Badge tone="red" dot>
                    {metrics.lowStockCount} low
                  </Badge>
                ) : (
                  <Badge tone="emerald" dot>
                    Healthy
                  </Badge>
                )
              }
            />
            <CardBody>
              {metrics.lowStockCount ? (
                <div className="space-y-3">
                  {data.lowStock.map((row) => (
                    <div
                      key={row.inventory_id}
                      className="rounded-xl border border-amber-100 bg-amber-50/50 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-bold text-navy-900">
                          {row.product_name}
                        </p>
                        <Badge tone="amber">{formatNumber(row.shortage)} short</Badge>
                      </div>
                      <p className="mt-1 text-[11px] text-navy-700/60">
                        {formatNumber(row.filled_gallons)} filled · reorder at{' '}
                        {formatNumber(row.reorder_level)}
                      </p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-amber-500"
                          style={{
                            width: `${Math.min(
                              100,
                              row.reorder_level
                                ? (row.filled_gallons / row.reorder_level) * 100
                                : 0
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <span className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="size-6" />
                  </span>
                  <p className="mt-3 text-xs font-bold text-navy-900">All products stocked</p>
                  <p className="mt-1 max-w-[15rem] text-[11px] text-navy-700/60">
                    Nothing is at or below its reorder level right now.
                  </p>
                </div>
              )}

              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
                <div className="rounded-lg bg-slate-50 px-2 py-2 text-center">
                  <p className="text-sm font-extrabold text-navy-900">
                    {formatNumber(metrics.stock.filled)}
                  </p>
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-navy-700/55">
                    Filled
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 px-2 py-2 text-center">
                  <p className="text-sm font-extrabold text-navy-900">
                    {formatNumber(metrics.stock.empty)}
                  </p>
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-navy-700/55">
                    Empty
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 px-2 py-2 text-center">
                  <p className="text-sm font-extrabold text-navy-900">
                    {formatNumber(metrics.stock.damaged)}
                  </p>
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-navy-700/55">
                    Damaged
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="min-w-0 lg:col-span-2">
            <CardHeader
              title="Recent transactions"
              subtitle="Latest six sales recorded in PostgreSQL"
              icon={Receipt}
              action={
                <Link
                  to="/sales"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:text-brand-800"
                >
                  View sales
                  <ArrowRight className="size-3" />
                </Link>
              }
            />
            <CardBody className="px-0 pb-2 pt-2">
              {recentSales.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-xs">
                    <thead>
                      <tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase tracking-wider text-navy-700/50">
                        <th className="px-5 py-2 font-bold">Transaction</th>
                        <th className="px-3 py-2 font-bold">Customer</th>
                        <th className="px-3 py-2 font-bold">Gallons</th>
                        <th className="px-3 py-2 font-bold">Payment</th>
                        <th className="px-3 py-2 text-right font-bold">Amount</th>
                        <th className="px-5 py-2 text-right font-bold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentSales.map((sale) => (
                        <tr key={sale.sale_id} className="transition hover:bg-slate-50/70">
                          <td className="px-5 py-2.5 font-mono text-[10px] font-semibold text-brand-700">
                            {sale.transaction_code}
                          </td>
                          <td className="max-w-[180px] truncate px-3 py-2.5 font-semibold text-navy-900">
                            {sale.customer_name}
                          </td>
                          <td className="px-3 py-2.5 text-navy-700/70">
                            {formatNumber(sale.gallons)} gal
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge
                              tone={
                                sale.payment_method === 'Cash'
                                  ? 'emerald'
                                  : sale.payment_method === 'GCash'
                                    ? 'brand'
                                    : 'violet'
                              }
                            >
                              {sale.payment_method}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-navy-900">
                            {formatCurrency(sale.total_amount)}
                          </td>
                          <td className="whitespace-nowrap px-5 py-2.5 text-right text-[11px] text-navy-700/55">
                            {formatDateTime(sale.transaction_date)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState icon={Receipt} title="No transactions recorded" />
              )}
            </CardBody>
          </Card>

          <Card className="min-w-0">
            <CardHeader title="Delivery zones" subtitle="Volume and fuel cost by zone" icon={MapPin} />
            <CardBody>
              {deliveryZones.length ? (
                <div className="space-y-3.5">
                  {deliveryZones.map((zone) => {
                    const width = Math.max(
                      8,
                      Math.round((Number(zone.deliveries) / maxZoneDeliveries) * 100)
                    );
                    return (
                      <div key={zone.delivery_zone || 'unassigned'} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-navy-900">
                            {zone.delivery_zone || 'Unassigned'}
                          </span>
                          <span className="text-[11px] font-bold text-navy-700/70">
                            {formatNumber(zone.deliveries)} trips
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-aqua-500 to-brand-500"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-navy-700/55">
                          <span>
                            {formatNumber(zone.delivered)} delivered ·{' '}
                            {formatNumber(zone.avg_distance_km, { decimals: true })} km avg
                          </span>
                          <span className="font-semibold">{formatCurrency(zone.total_fuel_cost)} fuel</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon={Truck} title="No delivery zones yet" />
              )}

              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-center">
                <div className="rounded-lg bg-slate-50 px-2 py-2">
                  <p className="flex items-center justify-center gap-1 text-sm font-extrabold text-navy-900">
                    <PackageCheck className="size-3.5 text-emerald-500" />
                    {formatPercent(metrics.deliveries?.success_rate || 0)}
                  </p>
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-navy-700/55">
                    Success rate
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 px-2 py-2">
                  <p className="text-sm font-extrabold text-navy-900">
                    {formatNumber(metrics.customers)}
                  </p>
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-navy-700/55">
                    Customers
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Business overview"
        title="Dashboard"
        description="Sales, stock and delivery performance pulled live from PostgreSQL. Every figure is based on the simulated demo dataset."
        actions={
          <>
            <span className="hidden text-[11px] text-navy-700/50 sm:block">
              {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}` : '—'}
            </span>
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              loading={loading}
              onClick={() => loadDashboard({ silent: true })}
            >
              Refresh
            </Button>
            <Button as={Link} to="/sales" size="sm" iconRight={ArrowRight}>
              Sales
            </Button>
          </>
        }
      />

      <div className="flex items-start gap-2.5 rounded-xl border border-brand-100 bg-brand-50/60 px-3.5 py-2.5 text-[11px] leading-relaxed text-navy-700/75">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-brand-600" />
        <p>
          <span className="font-bold text-navy-900">Demo data notice:</span> this build uses a
          deterministic seeded dataset (80 customers, 908 sales, 180 days of history). It is
          simulated for academic demonstration — never a real business record.
        </p>
      </div>

      {renderBody()}

      {!loading && !error ? (
        <p className="flex items-center justify-end gap-1.5 text-[10px] text-navy-700/40">
          <Activity className="size-3" />
          Source: PostgreSQL views and aggregate queries · no hardcoded analytics
        </p>
      ) : null}
    </div>
  );
}
