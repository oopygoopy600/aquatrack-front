import { useEffect, useMemo, useState } from 'react';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Bar, Chart, Doughnut } from 'react-chartjs-2';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Clock,
  Droplets,
  MapPin,
  Package,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import api from '../services/api';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ChartSkeleton,
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  PageHeader,
  Skeleton,
  StatCard,
} from '../components/ui';
import {
  formatCompactCurrency,
  formatCompactNumber,
  formatCurrency,
  formatDate,
  formatDateShort,
  formatNumber,
  formatPercent,
} from '../utils/format';
import { getApiError } from '../utils/apiError';

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
);

const CHART_COLORS = ['#184edb', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
const PAYMENT_COLORS = {
  Cash: '#184edb',
  GCash: '#06b6d4',
  'Bank Transfer': '#8b5cf6',
};
const WEEK_ORDER = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const PRESETS = [
  { id: '7', label: 'Last 7 days', params: { days: 7 } },
  { id: '30', label: 'Last 30 days', params: { days: 30 } },
  { id: '90', label: 'Last 90 days', params: { days: 90 } },
  { id: 'all', label: 'All time', params: {} },
];

function hourLabel(hour) {
  if (hour === 0) return '12a';
  if (hour === 12) return '12p';
  return hour < 12 ? `${hour}a` : `${hour - 12}p`;
}

function share(part, total) {
  return total > 0 ? (Number(part) / Number(total)) * 100 : 0;
}

function marginTone(margin) {
  if (margin >= 60) return 'emerald';
  if (margin >= 35) return 'amber';
  return 'red';
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [fetchedAt, setFetchedAt] = useState(null);

  const [preset, setPreset] = useState('all');
  const [range, setRange] = useState({ preset: 'all', params: {} });
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [customError, setCustomError] = useState('');

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/analytics/descriptive', { params: range.params });
        if (!active) return;
        setData(response.data.data);
        setFetchedAt(new Date());
      } catch (requestError) {
        if (active) setError(getApiError(requestError));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [range, refreshKey]);

  const selectPreset = (nextPreset) => {
    const definition = PRESETS.find((item) => item.id === nextPreset);
    setPreset(nextPreset);
    setCustomError('');
    setRange({ preset: nextPreset, params: definition.params });
  };

  const applyCustomRange = () => {
    if (!customFrom || !customTo) {
      setCustomError('Choose both a start and an end date.');
      return;
    }
    if (customFrom > customTo) {
      setCustomError('The start date must be before or equal to the end date.');
      return;
    }
    setCustomError('');
    setPreset('custom');
    setRange({ preset: 'custom', params: { from: customFrom, to: customTo } });
  };

  const totals = useMemo(() => data?.totals, [data]);
  const trend = useMemo(() => data?.daily_trend || [], [data]);
  const paymentMix = useMemo(() => data?.payment_mix || [], [data]);
  const products = useMemo(() => data?.product_performance || [], [data]);
  const customerTypes = useMemo(() => data?.customer_type_mix || [], [data]);
  const zones = useMemo(() => data?.zone_performance || [], [data]);
  const topCustomers = useMemo(() => data?.top_customers || [], [data]);
  const weekday = useMemo(() => data?.weekday_pattern || [], [data]);
  const hourly = useMemo(() => data?.hourly_pattern || [], [data]);
  const frequency = useMemo(() => data?.customer_frequency || [], [data]);
  const expenseCategories = useMemo(() => data?.expense_categories || [], [data]);

  const rangeLabel = useMemo(() => {
    if (!data?.range) return 'Loading range…';
    if (data.range.is_all_time) {
      return totals?.first_sale && totals?.last_sale
        ? `All recorded history · ${formatDate(totals.first_sale)} – ${formatDate(totals.last_sale)}`
        : 'All recorded history';
    }
    if (data.range.from && data.range.to) {
      return `${formatDate(data.range.from)} – ${formatDate(data.range.to)}`;
    }
    return 'Custom range';
  }, [data, totals]);

  const mixedTrendData = useMemo(
    () => ({
      labels: trend.map((row) => formatDateShort(row.sale_date)),
      datasets: [
        {
          label: 'Revenue',
          data: trend.map((row) => Number(row.revenue)),
          backgroundColor: 'rgba(24, 78, 219, 0.72)',
          hoverBackgroundColor: '#184edb',
          borderRadius: 4,
          maxBarThickness: 22,
          yAxisID: 'y',
          order: 2,
        },
        {
          type: 'line',
          label: 'Gallons',
          data: trend.map((row) => Number(row.gallons)),
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.12)',
          fill: true,
          tension: 0.32,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          yAxisID: 'y1',
          order: 1,
        },
      ],
    }),
    [trend]
  );

  const mixedTrendOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
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
              context.dataset.yAxisID === 'y1'
                ? ` ${formatNumber(context.parsed.y)} gallons`
                : ` ${formatCurrency(context.parsed.y)} revenue`,
            afterLabel: (context) => {
              if (context.dataset.yAxisID === 'y1') return '';
              const row = trend[context.dataIndex];
              return row ? `${formatNumber(row.transactions)} transactions` : '';
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            color: '#94a3b8',
            font: { size: 10 },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 12,
          },
        },
        y: {
          beginAtZero: true,
          position: 'left',
          grid: { color: 'rgba(148, 163, 184, 0.16)' },
          border: { display: false },
          ticks: {
            color: '#94a3b8',
            font: { size: 10 },
            callback: (value) => formatCompactCurrency(value),
          },
        },
        y1: {
          beginAtZero: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          border: { display: false },
          ticks: {
            color: '#0891b2',
            font: { size: 10 },
            callback: (value) => `${formatCompactNumber(value)} gal`,
          },
        },
      },
    }),
    [trend]
  );

  const paymentTotal = paymentMix.reduce((sum, row) => sum + Number(row.revenue || 0), 0);

  const paymentData = useMemo(
    () => ({
      labels: paymentMix.map((row) => row.payment_method),
      datasets: [
        {
          data: paymentMix.map((row) => Number(row.revenue || 0)),
          backgroundColor: paymentMix.map(
            (row, index) => PAYMENT_COLORS[row.payment_method] || CHART_COLORS[index % CHART_COLORS.length]
          ),
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    }),
    [paymentMix]
  );

  const paymentOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          padding: 10,
          cornerRadius: 10,
          callbacks: {
            label: (context) =>
              ` ${context.label}: ${formatCurrency(context.parsed)} (${formatPercent(
                share(context.parsed, paymentTotal)
              )})`,
          },
        },
      },
    }),
    [paymentTotal]
  );

  const weekdayRows = useMemo(
    () =>
      WEEK_ORDER.map((day) => weekday.find((row) => row.day_name === day)).filter(Boolean),
    [weekday]
  );

  const weekdayData = useMemo(
    () => ({
      labels: weekdayRows.map((row) => row.day_name.slice(0, 3)),
      datasets: [
        {
          label: 'Revenue',
          data: weekdayRows.map((row) => Number(row.revenue)),
          backgroundColor: 'rgba(24, 78, 219, 0.75)',
          hoverBackgroundColor: '#184edb',
          borderRadius: 6,
          maxBarThickness: 34,
        },
      ],
    }),
    [weekdayRows]
  );

  const weekdayOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          padding: 10,
          cornerRadius: 10,
          callbacks: {
            label: (context) => ` ${formatCurrency(context.parsed.y)} revenue`,
            afterLabel: (context) => {
              const row = weekdayRows[context.dataIndex];
              return row ? `${formatNumber(row.transactions)} transactions` : '';
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: '#64748b', font: { size: 10, weight: '600' } },
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
    [weekdayRows]
  );

  const hourlyRows = useMemo(() => {
    const byHour = new Map(hourly.map((row) => [Number(row.hour_of_day), row]));
    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      transactions: Number(byHour.get(hour)?.transactions || 0),
      revenue: Number(byHour.get(hour)?.revenue || 0),
    }));
  }, [hourly]);

  const hourlyData = useMemo(
    () => ({
      labels: hourlyRows.map((row) => hourLabel(row.hour)),
      datasets: [
        {
          label: 'Transactions',
          data: hourlyRows.map((row) => row.transactions),
          backgroundColor: 'rgba(6, 182, 212, 0.72)',
          hoverBackgroundColor: '#06b6d4',
          borderRadius: 4,
          maxBarThickness: 20,
        },
      ],
    }),
    [hourlyRows]
  );

  const hourlyOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          padding: 10,
          cornerRadius: 10,
          callbacks: {
            label: (context) =>
              ` ${formatNumber(context.parsed.y)} transactions`,
            afterLabel: (context) => {
              const row = hourlyRows[context.dataIndex];
              return row ? `${formatCurrency(row.revenue)} revenue` : '';
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: '#64748b', font: { size: 9 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(148, 163, 184, 0.16)' },
          border: { display: false },
          ticks: { color: '#94a3b8', font: { size: 10 }, precision: 0 },
        },
      },
    }),
    [hourlyRows]
  );

  const insights = useMemo(() => {
    if (!data || !totals || totals.transactions === 0) return [];

    const items = [];
    const bestDay = [...trend].sort((a, b) => Number(b.revenue) - Number(a.revenue))[0];
    if (bestDay) {
      items.push({
        icon: CalendarDays,
        title: 'Strongest sales day',
        text: `${formatDate(bestDay.sale_date)} produced ${formatCurrency(
          bestDay.revenue
        )} from ${formatNumber(bestDay.transactions)} transactions.`,
      });
    }

    const topProduct = products[0];
    if (topProduct) {
      items.push({
        icon: Package,
        title: 'Leading product',
        text: `${topProduct.product_name} generated ${formatCurrency(
          topProduct.revenue
        )} (${formatPercent(share(topProduct.revenue, totals.revenue))} of revenue) on ${formatNumber(
          topProduct.gallons
        )} gallons.`,
      });
    }

    const topZone = zones[0];
    if (topZone) {
      items.push({
        icon: MapPin,
        title: 'Top delivery zone',
        text: `${topZone.delivery_zone} accounts for ${formatCurrency(
          topZone.revenue
        )} (${formatPercent(share(topZone.revenue, totals.revenue))} of revenue) across ${formatNumber(
          topZone.customers
        )} customers.`,
      });
    }

    const busiestDay = [...weekday].sort(
      (a, b) => Number(b.transactions) - Number(a.transactions)
    )[0];
    if (busiestDay) {
      items.push({
        icon: TrendingUp,
        title: 'Busiest weekday',
        text: `${busiestDay.day_name} has the most recorded transactions (${formatNumber(
          busiestDay.transactions
        )}), contributing ${formatCurrency(busiestDay.revenue)}.`,
      });
    }

    const peak = [...hourly].sort((a, b) => Number(b.transactions) - Number(a.transactions))[0];
    if (peak) {
      items.push({
        icon: Clock,
        title: 'Peak hour',
        text: `${hourLabel(Number(peak.hour_of_day))} is the busiest hour with ${formatNumber(
          peak.transactions
        )} transactions worth ${formatCurrency(peak.revenue)}.`,
      });
    }

    const loyal = frequency.find((row) => row.segment === 'Loyal');
    const totalCustomers = frequency.reduce((sum, row) => sum + Number(row.customers || 0), 0);
    if (loyal) {
      items.push({
        icon: Users,
        title: 'Loyal customer base',
        text: `${formatNumber(loyal.customers)} customers (${formatPercent(
          share(loyal.customers, totalCustomers)
        )}) ordered 5+ times, producing ${formatCurrency(loyal.revenue)}.`,
      });
    }

    items.push({
      icon: Wallet,
      title: 'Revenue after expenses',
      text: `${formatCurrency(totals.revenue)} revenue less ${formatCurrency(
        totals.expenses
      )} recorded expenses leaves ${formatCurrency(
        totals.net_after_expenses
      )} before other costs and taxes.`,
    });

    return items;
  }, [data, totals, trend, products, zones, weekday, hourly, frequency]);

  const productColumns = [
    {
      key: 'product_name',
      header: 'Product',
      cell: (row) => (
        <div>
          <p className="font-semibold text-navy-900">{row.product_name}</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-navy-700/45">
            {row.water_type}
          </p>
        </div>
      ),
    },
    {
      key: 'units',
      header: 'Containers',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => formatNumber(row.units),
    },
    {
      key: 'gallons',
      header: 'Gallons',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => formatNumber(row.gallons),
    },
    {
      key: 'revenue',
      header: 'Revenue',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <div className="text-right">
          <p className="font-bold text-navy-900">{formatCurrency(row.revenue)}</p>
          <p className="mt-0.5 text-[10px] text-navy-700/45">
            {formatPercent(share(row.revenue, totals?.revenue))} share
          </p>
        </div>
      ),
    },
    {
      key: 'gross_margin',
      header: 'Margin',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <Badge tone={marginTone(row.gross_margin)}>{formatPercent(row.gross_margin)}</Badge>
      ),
    },
  ];

  const zoneColumns = [
    {
      key: 'delivery_zone',
      header: 'Zone',
      cell: (row) => <span className="font-semibold text-navy-900">{row.delivery_zone}</span>,
    },
    {
      key: 'customers',
      header: 'Customers',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => formatNumber(row.customers),
    },
    {
      key: 'transactions',
      header: 'Transactions',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => formatNumber(row.transactions),
    },
    {
      key: 'gallons',
      header: 'Gallons',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => formatNumber(row.gallons),
    },
    {
      key: 'revenue',
      header: 'Revenue',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <div className="text-right">
          <p className="font-bold text-navy-900">{formatCurrency(row.revenue)}</p>
          <p className="mt-0.5 text-[10px] text-navy-700/45">
            {formatPercent(share(row.revenue, totals?.revenue))} share
          </p>
        </div>
      ),
    },
  ];

  const customerColumns = [
    {
      key: 'customer_name',
      header: 'Customer',
      cell: (row) => (
        <div>
          <p className="font-semibold text-navy-900">{row.customer_name}</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-navy-700/45">
            {row.customer_type}
          </p>
        </div>
      ),
    },
    {
      key: 'delivery_zone',
      header: 'Zone',
      cell: (row) => row.delivery_zone || '—',
    },
    {
      key: 'transactions',
      header: 'Orders',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => formatNumber(row.transactions),
    },
    {
      key: 'last_purchase',
      header: 'Last purchase',
      cell: (row) => formatDate(row.last_purchase),
    },
    {
      key: 'revenue',
      header: 'Revenue',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <span className="font-bold text-navy-900">{formatCurrency(row.revenue)}</span>
      ),
    },
  ];

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
                <Skeleton className="size-44 rounded-full" />
              </div>
            </Card>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <ErrorState
          title="Analytics unavailable"
          message={error}
          onRetry={() => setRefreshKey((key) => key + 1)}
        />
      );
    }

    if (!data || totals.transactions === 0) {
      return (
        <Card>
          <EmptyState
            icon={BarChart3}
            title="No sales in this range"
            description="Choose a wider date range or record a sale to populate the descriptive analytics."
          />
        </Card>
      );
    }

    const maxExpenseAmount = Math.max(
      ...expenseCategories.map((row) => Number(row.total_amount)),
      1
    );
    const frequencyTotal = frequency.reduce((sum, row) => sum + Number(row.customers || 0), 0);

    return (
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Revenue"
            value={formatCurrency(totals.revenue)}
            hint={`${formatNumber(totals.transactions)} transactions · ${formatCurrency(
              totals.average_order_value
            )} average order`}
            icon={Wallet}
            tone="brand"
          />
          <StatCard
            label="Water sold"
            value={`${formatNumber(totals.gallons)} gal`}
            hint={`${formatNumber(totals.units)} containers · ${formatNumber(
              totals.average_gallons_per_order,
              { decimals: true }
            )} gal per order`}
            icon={Droplets}
            tone="aqua"
          />
          <StatCard
            label="Gross profit"
            value={formatCurrency(totals.gross_profit)}
            hint={`${formatPercent(totals.gross_margin)} gross margin on product sales`}
            icon={TrendingUp}
            tone="emerald"
          />
          <StatCard
            label="Revenue − expenses"
            value={formatCurrency(totals.net_after_expenses)}
            hint={`${formatCurrency(totals.expenses)} expenses · ${formatNumber(
              totals.expense_entries
            )} entries`}
            icon={Activity}
            tone="violet"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="min-w-0 lg:col-span-2">
            <CardHeader
              title="Revenue and water demand"
              subtitle="Daily revenue bars with gallons sold on the right axis"
              icon={Activity}
              action={
                <Badge tone="brand" dot>
                  {formatNumber(trend.length)} active sales days
                </Badge>
              }
            />
            <CardBody>
              {trend.length ? (
                <div className="h-80">
                  <Chart type="bar" data={mixedTrendData} options={mixedTrendOptions} />
                </div>
              ) : (
                <EmptyState icon={Activity} title="No daily trend in this range" />
              )}
            </CardBody>
          </Card>

          <Card className="min-w-0">
            <CardHeader
              title="Payment mix"
              subtitle="Share of revenue by payment method"
              icon={Wallet}
            />
            <CardBody>
              {paymentMix.length ? (
                <>
                  <div className="relative h-52">
                    <Doughnut data={paymentData} options={paymentOptions} />
                    <div className="pointer-events-none absolute inset-x-0 top-[42%] -translate-y-1/2 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-navy-700/50">
                        Revenue
                      </p>
                      <p className="text-lg font-extrabold tracking-tight text-navy-900">
                        {formatCurrency(paymentTotal)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {paymentMix.map((row, index) => (
                      <div
                        key={row.payment_method}
                        className="flex items-center justify-between rounded-lg bg-slate-50/70 px-2.5 py-1.5 text-[11px]"
                      >
                        <span className="flex items-center gap-1.5 font-semibold text-navy-800">
                          <span
                            className="size-2 rounded-full"
                            style={{
                              backgroundColor:
                                PAYMENT_COLORS[row.payment_method] ||
                                CHART_COLORS[index % CHART_COLORS.length],
                            }}
                          />
                          {row.payment_method}
                        </span>
                        <span className="text-right font-bold text-navy-900">
                          {formatCurrency(row.revenue)}
                          <span className="ml-1 font-medium text-navy-700/45">
                            {formatPercent(share(row.revenue, paymentTotal))}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState icon={Wallet} title="No payment data" />
              )}
            </CardBody>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="min-w-0 xl:col-span-2">
            <CardHeader
              title="Product performance"
              subtitle="Revenue, volume and margin by product"
              icon={Package}
            />
            <DataTable
              columns={productColumns}
              rows={products}
              rowKey={(row) => row.product_id}
              empty={{ icon: Package, title: 'No product sales in this range' }}
            />
          </Card>

          <Card>
            <CardHeader
              title="Customer mix"
              subtitle="Residential and commercial demand"
              icon={Users}
            />
            <CardBody className="space-y-3">
              {customerTypes.length ? (
                customerTypes.map((row, index) => (
                  <div
                    key={row.customer_type}
                    className="rounded-xl border border-slate-100 bg-slate-50/50 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-navy-900">{row.customer_type}</span>
                      <Badge tone={index === 0 ? 'brand' : 'aqua'}>
                        {formatPercent(share(row.revenue, totals.revenue))}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-lg font-extrabold tracking-tight text-navy-900">
                      {formatCurrency(row.revenue)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-navy-700/55">
                      {formatNumber(row.customers)} customers · {formatNumber(row.transactions)}{' '}
                      orders · {formatNumber(row.gallons)} gal
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/80">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-600 to-aqua-400"
                        style={{ width: `${Math.max(share(row.revenue, totals.revenue), 2)}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState icon={Users} title="No customer mix in this range" />
              )}

              <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700">
                  Purchase frequency
                </p>
                <div className="mt-2 space-y-2">
                  {frequency.map((row) => (
                    <div key={row.segment} className="text-[11px]">
                      <div className="flex items-center justify-between font-semibold text-navy-800">
                        <span>{row.segment}</span>
                        <span>
                          {formatNumber(row.customers)} customers ·{' '}
                          {formatPercent(share(row.customers, frequencyTotal))}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{
                            width: `${Math.max(share(row.customers, frequencyTotal), 2)}%`,
                          }}
                        />
                      </div>
                      <p className="mt-0.5 text-[10px] text-navy-700/50">
                        {formatCurrency(row.revenue)} revenue · {formatNumber(row.transactions)}{' '}
                        orders
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="min-w-0">
            <CardHeader
              title="Zone performance"
              subtitle="Revenue and demand by delivery zone"
              icon={MapPin}
            />
            <DataTable
              columns={zoneColumns}
              rows={zones}
              rowKey={(row) => row.delivery_zone}
              empty={{ icon: MapPin, title: 'No zone data in this range' }}
            />
          </Card>

          <Card className="min-w-0">
            <CardHeader
              title="Top customers"
              subtitle="Ten highest-revenue customers in range"
              icon={Users}
            />
            <DataTable
              columns={customerColumns}
              rows={topCustomers}
              rowKey={(row) => row.customer_id}
              empty={{ icon: Users, title: 'No customer activity in this range' }}
            />
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="min-w-0">
            <CardHeader
              title="Weekday pattern"
              subtitle="Revenue by day of week"
              icon={CalendarDays}
            />
            <CardBody>
              {weekdayRows.length ? (
                <div className="h-64">
                  <Bar data={weekdayData} options={weekdayOptions} />
                </div>
              ) : (
                <EmptyState icon={CalendarDays} title="No weekday data" />
              )}
            </CardBody>
          </Card>

          <Card className="min-w-0">
            <CardHeader
              title="Hourly pattern"
              subtitle="Transaction count by hour of day"
              icon={Clock}
            />
            <CardBody>
              {hourlyRows.some((row) => row.transactions > 0) ? (
                <div className="h-64">
                  <Bar data={hourlyData} options={hourlyOptions} />
                </div>
              ) : (
                <EmptyState icon={Clock} title="No hourly data" />
              )}
            </CardBody>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader
              title="Expense categories"
              subtitle="Recorded operating costs in the selected range"
              icon={Wallet}
              action={<Badge tone="amber">{formatCurrency(totals.expenses)}</Badge>}
            />
            <CardBody className="space-y-3">
              {expenseCategories.length ? (
                expenseCategories.map((row) => (
                  <div key={row.expense_category}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-navy-800">{row.expense_category}</span>
                      <span className="font-bold text-navy-900">
                        {formatCurrency(row.total_amount)}
                        <span className="ml-1 font-medium text-navy-700/45">
                          {formatPercent(share(row.total_amount, totals.expenses))}
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400"
                        style={{
                          width: `${Math.max(
                            share(row.total_amount, maxExpenseAmount),
                            2
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="mt-0.5 text-[10px] text-navy-700/45">
                      {formatNumber(row.entries)} entries
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState icon={Wallet} title="No expenses in this range" />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Key observations"
              subtitle="Plain-language readings of the selected range"
              icon={Sparkles}
              action={<Badge tone="violet">Data-derived</Badge>}
            />
            <CardBody className="grid gap-2.5 sm:grid-cols-2">
              {insights.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-xl border border-slate-100 bg-slate-50/50 p-3"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="grid size-6 place-items-center rounded-lg bg-white text-brand-700 shadow-sm">
                        <Icon className="size-3.5" />
                      </span>
                      <p className="text-[11px] font-bold text-navy-900">{item.title}</p>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-navy-700/65">
                      {item.text}
                    </p>
                  </div>
                );
              })}
            </CardBody>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex flex-col gap-2 text-[11px] text-navy-700/55 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Product margins use recorded unit cost at the time of sale. Revenue − expenses
              excludes taxes, depreciation and other costs not recorded in this system.
            </p>
            <p className="font-semibold text-navy-800 sm:whitespace-nowrap">
              {rangeLabel} · {formatNumber(totals.unique_customers)} unique customers
            </p>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Descriptive analytics"
        title="Business analytics"
        description="Date-filtered revenue, demand, customer and cost analysis calculated directly from the simulated PostgreSQL dataset."
        actions={
          <>
            <span className="hidden text-[11px] text-navy-700/50 sm:block">
              {fetchedAt
                ? `Updated ${fetchedAt.toLocaleTimeString('en-PH', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}`
                : '—'}
            </span>
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              loading={loading}
              onClick={() => setRefreshKey((key) => key + 1)}
            >
              Refresh
            </Button>
          </>
        }
      />

      <div className="flex items-start gap-2.5 rounded-xl border border-brand-100 bg-brand-50/60 px-3.5 py-2.5 text-[11px] leading-relaxed text-navy-700/75">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-brand-600" />
        <p>
          <span className="font-bold text-navy-900">Demo data notice:</span> every metric is
          calculated from the deterministic simulated dataset in PostgreSQL. No value is hardcoded or
          estimated, and nothing here represents a real business.
        </p>
      </div>

      <Card className="p-4">
        <FilterBar className="justify-between">
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100/80 p-1">
            {PRESETS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectPreset(item.id)}
                className={
                  preset === item.id
                    ? 'rounded-lg bg-white px-3 py-1.5 text-[11px] font-bold text-navy-900 shadow-sm'
                    : 'rounded-lg px-3 py-1.5 text-[11px] font-bold text-navy-700/60 transition hover:text-navy-900'
                }
              >
                {item.label}
              </button>
            ))}
            {preset === 'custom' ? (
              <span className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-bold text-navy-900 shadow-sm">
                Custom
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-navy-700/50">
              From
              <input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="mt-1 block h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-navy-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
              />
            </label>
            <label className="text-[10px] font-bold uppercase tracking-wider text-navy-700/50">
              To
              <input
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                className="mt-1 block h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-navy-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
              />
            </label>
            <Button variant="secondary" size="sm" onClick={applyCustomRange}>
              Apply
            </Button>
          </div>
        </FilterBar>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <p className="text-[11px] font-semibold text-navy-800">{rangeLabel}</p>
          {customError ? (
            <p className="text-[11px] font-semibold text-red-600" role="alert">
              {customError}
            </p>
          ) : (
            <p className="text-[10px] text-navy-700/45">
              Presets anchor to the latest recorded sale, not today&apos;s date.
            </p>
          )}
        </div>
      </Card>

      {renderBody()}
    </div>
  );
}
