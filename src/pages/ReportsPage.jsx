import { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowRight,
  BadgeCheck,
  Boxes,
  CalendarDays,
  Download,
  Droplets,
  Info,
  Package,
  Printer,
  Receipt,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Skeleton,
  StatCard,
  Tabs,
} from '../components/ui';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
} from '../utils/format';
import { getApiError } from '../utils/apiError';

const PERIODS = [
  { id: 'daily', label: 'Daily' },
  { id: 'month', label: 'Month to date' },
  { id: 'prev-month', label: 'Previous month' },
  { id: 'custom', label: 'Custom range' },
];

const EXPORTS = [
  { id: 'sales', label: 'Sales', hint: 'One row per transaction' },
  { id: 'sale-items', label: 'Sale items', hint: 'One row per product line' },
  { id: 'deliveries', label: 'Deliveries', hint: 'Trip status, fees and fuel' },
  { id: 'expenses', label: 'Expenses', hint: 'Recorded operating costs' },
  { id: 'inventory', label: 'Inventory snapshot', hint: 'Current stock, not historical' },
  { id: 'customers', label: 'Customer snapshot', hint: 'Current customer list' },
  { id: 'products', label: 'Product snapshot', hint: 'Current product catalogue' },
  { id: 'movements', label: 'Stock movements', hint: 'Filtered audit trail' },
];

const PERIOD_TITLES = {
  daily: 'Daily operations report',
  month: 'Month-to-date report',
  'prev-month': 'Previous month report',
  custom: 'Custom range report',
  days: 'Period operations report',
  'all-time': 'All-time operations report',
};

function reportTitle(period) {
  return PERIOD_TITLES[period] || 'Operations report';
}

function rangeLabel(range) {
  if (!range) return '—';
  if (!range.from && !range.to) return 'All recorded history';
  if (!range.from) return `Through ${formatDate(range.to)}`;
  if (!range.to) return `From ${formatDate(range.from)}`;
  if (range.from === range.to) return formatDate(range.from);
  return `${formatDate(range.from)} – ${formatDate(range.to)}`;
}

async function getExportError(error) {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const parsed = JSON.parse(text);
      return parsed?.errors?.[0]?.message || parsed?.message || 'The export could not be generated.';
    } catch {
      return 'The export could not be generated.';
    }
  }
  return getApiError(error);
}

function ReportSection({ title, subtitle, icon, dataset, exporting, onExport, action, children }) {
  return (
    <Card className="min-w-0 print:break-inside-avoid print:border print:border-slate-300 print:shadow-none">
      <CardHeader
        title={title}
        subtitle={subtitle}
        icon={icon}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
            {action}
            {dataset ? (
              <Button
                variant="secondary"
                size="sm"
                icon={Download}
                loading={exporting === dataset}
                onClick={() => onExport(dataset)}
              >
                CSV
              </Button>
            ) : null}
          </div>
        }
      />
      <CardBody className="space-y-4">{children}</CardBody>
    </Card>
  );
}

function MiniStat({ label, value, hint = null }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 print:border-slate-200 print:bg-white">
      <p className="truncate text-[9px] font-bold uppercase tracking-wider text-navy-700/45">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-extrabold text-navy-900">{value}</p>
      {hint ? <p className="mt-0.5 text-[10px] text-navy-700/50">{hint}</p> : null}
    </div>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState('daily');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);

  useEffect(() => {
    let active = true;

    if (period === 'custom') {
      if (!customFrom || !customTo) {
        setLoading(false);
        setError('');
        return undefined;
      }
      if (customFrom > customTo) {
        setLoading(false);
        setError('The start date must be on or before the end date.');
        return undefined;
      }
    }

    const params =
      period === 'custom' ? { from: customFrom, to: customTo } : { period };

    (async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/reports', { params });
        if (!active) return;
        setData(response.data.data);
        setFetchedAt(new Date());
      } catch (requestError) {
        if (active) setError(await getExportError(requestError));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [period, customFrom, customTo, refreshKey]);

  function changePeriod(next) {
    if (next === 'custom' && data?.range?.from && data?.range?.to) {
      setCustomFrom(data.range.from);
      setCustomTo(data.range.to);
    }
    setPeriod(next);
  }

  function rangeParams() {
    return period === 'custom' ? { from: customFrom, to: customTo } : { period };
  }

  async function downloadCsv(dataset) {
    if (period === 'custom' && (!customFrom || !customTo || customFrom > customTo)) {
      toast.error('Choose a valid date range before exporting.');
      return;
    }

    setExporting(dataset);
    try {
      const response = await api.get(`/reports/export/${dataset}`, {
        params: rangeParams(),
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const disposition = response.headers['content-disposition'] || '';
      const match = disposition.match(/filename="?([^";]+)"?/i);
      link.download = match ? match[1] : `aquatrack-demo-${dataset}.csv`;

      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      const definition = EXPORTS.find((item) => item.id === dataset);
      toast.success(`${definition?.label || 'Report'} CSV downloaded.`);
    } catch (requestError) {
      toast.error(await getExportError(requestError));
    } finally {
      setExporting(null);
    }
  }

  const kpis = data?.kpis;
  const payments = data?.payments || [];
  const products = data?.products || [];
  const topCustomers = data?.customers?.top || [];
  const deliveries = data?.deliveries;
  const expenses = data?.expenses;
  const inventory = data?.inventory;
  const movements = data?.movements;
  const daily = data?.daily || [];

  const paymentColumns = [
    {
      key: 'method',
      header: 'Payment method',
      cell: (row) => <span className="font-semibold text-navy-900">{row.payment_method}</span>,
    },
    {
      key: 'transactions',
      header: 'Transactions',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => formatNumber(row.transactions),
    },
    {
      key: 'revenue',
      header: 'Revenue',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => formatCurrency(row.revenue),
    },
    {
      key: 'share',
      header: 'Share',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => <Badge tone="brand">{formatPercent(row.share)}</Badge>,
    },
  ];

  const productColumns = [
    {
      key: 'product',
      header: 'Product',
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-semibold text-navy-900">{row.product_name}</p>
          <p className="text-[10px] text-navy-700/50">{row.water_type}</p>
        </div>
      ),
    },
    {
      key: 'units',
      header: 'Units',
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
      cell: (row) => formatCurrency(row.revenue),
    },
    {
      key: 'profit',
      header: 'Gross profit',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <div>
          <p className="font-semibold text-navy-900">{formatCurrency(row.gross_profit)}</p>
          <p className="text-[10px] text-navy-700/45">
            {formatPercent(row.margin_percent)} margin
          </p>
        </div>
      ),
    },
  ];

  const customerColumns = [
    {
      key: 'customer',
      header: 'Customer',
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-semibold text-navy-900">{row.customer_name}</p>
          <p className="text-[10px] text-navy-700/50">
            {row.customer_code} · {row.customer_type}
          </p>
        </div>
      ),
    },
    {
      key: 'orders',
      header: 'Orders',
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
      cell: (row) => formatCurrency(row.revenue),
    },
    {
      key: 'share',
      header: 'Share',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => <Badge tone="slate">{formatPercent(row.revenue_share)}</Badge>,
    },
  ];

  const expenseColumns = [
    {
      key: 'category',
      header: 'Category',
      cell: (row) => <span className="font-semibold text-navy-900">{row.category}</span>,
    },
    {
      key: 'entries',
      header: 'Entries',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => formatNumber(row.entries),
    },
    {
      key: 'amount',
      header: 'Amount',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => formatCurrency(row.amount),
    },
    {
      key: 'share',
      header: 'Share',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => <Badge tone="amber">{formatPercent(row.share)}</Badge>,
    },
  ];

  const movementColumns = [
    {
      key: 'type',
      header: 'Movement type',
      cell: (row) => <span className="font-semibold text-navy-900">{row.movement_type}</span>,
    },
    {
      key: 'movements',
      header: 'Entries',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => formatNumber(row.movements),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => formatNumber(row.quantity),
    },
  ];

  const dailyColumns = [
    {
      key: 'date',
      header: 'Date',
      cell: (row) => <span className="font-semibold text-navy-900">{formatDate(row.date)}</span>,
    },
    {
      key: 'transactions',
      header: 'Sales',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => formatNumber(row.transactions),
    },
    {
      key: 'revenue',
      header: 'Revenue',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => formatCurrency(row.revenue),
    },
    {
      key: 'gallons',
      header: 'Gallons',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => formatNumber(row.gallons),
    },
    {
      key: 'profit',
      header: 'Gross profit',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => formatCurrency(row.gross_profit),
    },
    {
      key: 'expenses',
      header: 'Expenses',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => formatCurrency(row.expenses),
    },
    {
      key: 'delivered',
      header: 'Delivered',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => formatNumber(row.delivered),
    },
  ];

  const renderBody = () => {
    if (period === 'custom' && (!customFrom || !customTo)) {
      return (
        <Card>
          <EmptyState
            icon={CalendarDays}
            title="Choose a date range"
            description="Select both a start and end date to generate a custom operations report."
          />
        </Card>
      );
    }

    if (loading && !data) {
      return (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <Card key={index} className="p-5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-4 h-8 w-28" />
                <Skeleton className="mt-3 h-3 w-32" />
              </Card>
            ))}
          </div>
          <Card className="p-5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-4 h-48 w-full" />
          </Card>
        </div>
      );
    }

    if (error) {
      return (
        <ErrorState
          title="Report unavailable"
          message={error}
          onRetry={() => setRefreshKey((key) => key + 1)}
        />
      );
    }

    if (!data) {
      return (
        <Card>
          <EmptyState
            icon={Receipt}
            title="No report rows yet"
            description="Record sales, deliveries or expenses and the report will populate from PostgreSQL."
          />
        </Card>
      );
    }

    const daysInRange = data.range.days;
    const canShowDaily = daysInRange !== null && daysInRange <= 31;

    return (
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Revenue"
            value={formatCurrency(kpis.revenue)}
            hint={`${formatNumber(kpis.transactions)} transactions · ${formatCurrency(
              kpis.average_order_value
            )} average`}
            icon={Wallet}
            tone="brand"
          />
          <StatCard
            label="Gross profit"
            value={formatCurrency(kpis.gross_profit)}
            hint={`${formatPercent(kpis.gross_margin_percent)} margin · ${formatCurrency(
              kpis.cost_of_goods
            )} cost of goods`}
            icon={TrendingUp}
            tone="emerald"
          />
          <StatCard
            label="Operating expenses"
            value={formatCurrency(kpis.operating_expenses)}
            hint={`${formatNumber(expenses.entries)} entries · includes fuel allocation`}
            icon={Receipt}
            tone="amber"
          />
          <StatCard
            label="Operating result"
            value={formatCurrency(kpis.operating_result)}
            hint="Gross profit + delivery fees − expenses"
            icon={Sparkles}
            tone={kpis.operating_result >= 0 ? 'emerald' : 'amber'}
          />
          <StatCard
            label="Gallons sold"
            value={`${formatNumber(kpis.gallons)} gal`}
            hint={`${formatNumber(kpis.units)} containers · ${formatNumber(
              kpis.unique_customers
            )} buyers`}
            icon={Droplets}
            tone="aqua"
          />
          <StatCard
            label="Delivery fees"
            value={formatCurrency(kpis.delivery_fees)}
            hint={`${formatNumber(deliveries.delivered)} delivered · ${formatCurrency(
              kpis.delivery_margin
            )} after fuel`}
            icon={Truck}
            tone="violet"
          />
        </div>

        <ReportSection
          title="Sales and payments"
          subtitle="Product revenue and the payment methods behind it"
          icon={Receipt}
          dataset="sales"
          exporting={exporting}
          onExport={downloadCsv}
          action={<Badge tone="brand">{formatNumber(kpis.transactions)} sales</Badge>}
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniStat label="Revenue" value={formatCurrency(kpis.revenue)} />
            <MiniStat label="Units sold" value={formatNumber(kpis.units)} hint="containers" />
            <MiniStat label="Gallons sold" value={formatNumber(kpis.gallons)} />
            <MiniStat
              label="Average order"
              value={formatCurrency(kpis.average_order_value)}
            />
          </div>
          <DataTable
            columns={paymentColumns}
            rows={payments}
            rowKey={(row) => row.payment_method}
            empty={{
              icon: Receipt,
              title: 'No sales in this range',
              description: 'Choose a different period or record a sale.',
            }}
          />
        </ReportSection>

        <div className="grid gap-4 xl:grid-cols-2">
          <ReportSection
            title="Product performance"
            subtitle="Revenue and gross profit by product"
            icon={Package}
            dataset="sale-items"
            exporting={exporting}
            onExport={downloadCsv}
          >
            <DataTable
              columns={productColumns}
              rows={products}
              rowKey={(row) => row.product_id}
              empty={{
                icon: Package,
                title: 'No product sales',
                description: 'No sale lines were recorded in this range.',
              }}
            />
          </ReportSection>

          <ReportSection
            title="Top customers"
            subtitle="Highest revenue in the selected range"
            icon={Users}
            dataset="customers"
            exporting={exporting}
            onExport={downloadCsv}
            action={
              <Badge tone="slate">
                {formatNumber(data.customers.buyers)} of {formatNumber(data.customers.total)} customers
              </Badge>
            }
          >
            <DataTable
              columns={customerColumns}
              rows={topCustomers}
              rowKey={(row) => row.customer_id}
              empty={{
                icon: Users,
                title: 'No customer activity',
                description: 'No sales were recorded in this range.',
              }}
            />
          </ReportSection>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ReportSection
            title="Delivery operations"
            subtitle="Trip outcomes, fees and recorded timing"
            icon={Truck}
            dataset="deliveries"
            exporting={exporting}
            onExport={downloadCsv}
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <MiniStat label="Delivered" value={formatNumber(deliveries.delivered)} />
              <MiniStat label="Cancelled" value={formatNumber(deliveries.cancelled)} />
              <MiniStat label="Still open" value={formatNumber(deliveries.open)} />
              <MiniStat label="Delivery fees" value={formatCurrency(deliveries.delivery_fees)} />
              <MiniStat label="Delivery fuel" value={formatCurrency(deliveries.delivery_fuel)} />
              <MiniStat
                label="Margin after fuel"
                value={formatCurrency(deliveries.delivery_margin)}
              />
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 print:border-slate-200 print:bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="font-semibold text-navy-800">
                  Within estimate: {formatPercent(deliveries.within_estimate_rate)}
                </span>
                <span className="text-navy-700/55">
                  {formatNumber(deliveries.within_estimate)} of{' '}
                  {formatNumber(deliveries.measured)} measured
                </span>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-navy-700/55">
                Actual average {formatNumber(deliveries.avg_actual_minutes, { decimals: true })} min
                versus {formatNumber(deliveries.avg_estimated_minutes, { decimals: true })} min
                estimated. Fuel here is the per-delivery figure; the Fuel expense category is
                allocated separately.
              </p>
            </div>
          </ReportSection>

          <ReportSection
            title="Expenses by category"
            subtitle="Recorded operating costs in the selected range"
            icon={Receipt}
            dataset="expenses"
            exporting={exporting}
            onExport={downloadCsv}
            action={<Badge tone="amber">{formatCurrency(expenses.total)}</Badge>}
          >
            <DataTable
              columns={expenseColumns}
              rows={expenses.categories}
              rowKey={(row) => row.category}
              empty={{
                icon: Receipt,
                title: 'No expenses recorded',
                description: 'No expense entries fall inside this range.',
              }}
            />
          </ReportSection>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ReportSection
            title="Inventory snapshot"
            subtitle="Current stock across all products — not a historical balance"
            icon={Boxes}
            dataset="inventory"
            exporting={exporting}
            onExport={downloadCsv}
            action={
              inventory.low_stock_products > 0 ? (
                <Badge tone="amber" dot>
                  {formatNumber(inventory.low_stock_products)} low stock
                </Badge>
              ) : (
                <Badge tone="emerald" dot>
                  Above reorder level
                </Badge>
              )
            }
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MiniStat
                label="Filled units"
                value={formatNumber(inventory.filled_units)}
                hint="containers"
              />
              <MiniStat
                label="Gallons on hand"
                value={formatNumber(inventory.filled_gallons)}
              />
              <MiniStat label="Empty" value={formatNumber(inventory.empty_containers)} />
              <MiniStat label="Damaged" value={formatNumber(inventory.damaged_containers)} />
              <MiniStat
                label="Stock at cost"
                value={formatCurrency(inventory.stock_value_cost)}
              />
              <MiniStat
                label="Stock at retail"
                value={formatCurrency(inventory.stock_value_retail)}
              />
              <MiniStat label="Products" value={formatNumber(inventory.products)} />
              <MiniStat
                label="Low stock"
                value={formatNumber(inventory.low_stock_products)}
              />
            </div>
            <p className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-[10px] leading-relaxed text-navy-700/55 print:border-slate-200 print:bg-white">
              <span className="font-bold text-navy-800">Snapshot, not history.</span>{' '}
              Inventory rows show today&apos;s stock and are not reconstructed as of the report end
              date.
            </p>
          </ReportSection>

          <ReportSection
            title="Stock movements"
            subtitle="Inventory audit trail filtered by movement date"
            icon={ArrowLeftRight}
            dataset="movements"
            exporting={exporting}
            onExport={downloadCsv}
            action={<Badge tone="slate">{formatNumber(movements.total)} entries</Badge>}
          >
            <DataTable
              columns={movementColumns}
              rows={movements.by_type}
              rowKey={(row) => row.movement_type}
              empty={{
                icon: ArrowLeftRight,
                title: 'No stock movements',
                description: 'No stock moved inside this range.',
              }}
            />
            <p className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-[10px] leading-relaxed text-navy-700/55 print:border-slate-200 print:bg-white">
              Quantities are always positive. IN adds stock, OUT and DAMAGE reduce it, and RETURN
              records reusable containers coming back.
            </p>
          </ReportSection>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <ReportSection
            title="Daily breakdown"
            subtitle={
              canShowDaily
                ? 'One row per day with recorded activity'
                : 'Daily rows are shown for ranges of 31 days or fewer'
            }
            icon={CalendarDays}
            dataset="sales"
            exporting={exporting}
            onExport={downloadCsv}
            action={<Badge tone="slate">{formatNumber(daily.length)} {daily.length === 1 ? 'day' : 'days'}</Badge>}
          >
            {canShowDaily ? (
              <DataTable
                columns={dailyColumns}
                rows={daily}
                rowKey={(row) => row.date}
                empty={{
                  icon: CalendarDays,
                  title: 'No daily activity',
                  description: 'No sales, expenses or deliveries fall inside this range.',
                }}
              />
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="Daily table hidden for long ranges"
                description="The report covers more than 31 days. Use a daily or monthly period, or a custom range of 31 days or fewer, to see the day-by-day table."
              />
            )}
          </ReportSection>

          <Card className="min-w-0 print:hidden">
            <CardHeader
              title="Export centre"
              subtitle="Downloads respect the selected period"
              icon={Download}
              action={<Badge tone="brand">{EXPORTS.length} datasets</Badge>}
            />
            <CardBody className="space-y-2">
              {EXPORTS.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-bold text-navy-900">{item.label}</p>
                    <p className="truncate text-[10px] text-navy-700/50">{item.hint}</p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Download}
                    loading={exporting === item.id}
                    onClick={() => downloadCsv(item.id)}
                  >
                    CSV
                  </Button>
                </div>
              ))}
              <p className="pt-1 text-[10px] leading-relaxed text-navy-700/50">
                Sales, sale items, deliveries, expenses and movements follow the selected dates.
                Inventory, customer and product files are current snapshots.
              </p>
            </CardBody>
          </Card>

          <Card className="min-w-0 print:break-inside-avoid print:border print:border-slate-300 print:shadow-none">
            <CardHeader
              title="How figures are calculated"
              subtitle="Plain arithmetic over recorded rows"
              icon={Info}
              action={<Badge tone="slate">No black box</Badge>}
            />
            <CardBody className="space-y-2">
              <ul className="space-y-2">
                {Object.entries(data.definitions).map(([key, text]) => (
                  <li
                    key={key}
                    className="flex gap-2 text-[10px] leading-relaxed text-navy-700/65"
                  >
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-brand-400" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
              <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-2.5 text-[10px] leading-relaxed text-navy-700/65 print:bg-white">
                <span className="font-bold text-navy-900">Demo data notice:</span> every row comes
                from the deterministic simulated dataset in PostgreSQL. The CSV files include a
                <span className="font-semibold"> Data Source</span> column and the download filename
                starts with <span className="font-mono">aquatrack-demo-</span>.
              </div>
            </CardBody>
          </Card>
        </div>

        <Card className="p-4 print:hidden">
          <div className="flex flex-col gap-2 text-[11px] text-navy-700/55 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2">
              <BadgeCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
              Reports are read-only aggregates. Nothing on this page changes a sale, delivery or
              expense record.
            </p>
            <p className="font-semibold text-navy-800 sm:whitespace-nowrap">
              {rangeLabel(data.range)} · {formatNumber(kpis.transactions)} transactions
            </p>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="print-report space-y-5">
      <div className="hidden print:block">
        <div className="flex items-start justify-between gap-4 border-b-2 border-navy-900 pb-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-brand-700">
              AquaTrack · Water Refilling Station
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-navy-900">
              {data ? reportTitle(data.range.period) : 'Operations report'}
            </h1>
            <p className="mt-1 text-sm text-navy-800">
              {data ? rangeLabel(data.range) : '—'}
              {data ? ` · Generated ${formatDateTime(data.generated_at)}` : ''}
            </p>
          </div>
          <div className="text-right text-[10px] leading-relaxed text-navy-700/70">
            <p className="font-bold uppercase tracking-wider">Simulated demo data</p>
            <p>Not a real business record</p>
            <p>Read-only operational report</p>
          </div>
        </div>
      </div>

      <div className="print:hidden">
        <PageHeader
          eyebrow="Reports and exports"
          title="Printable operations reports"
          description="Build a daily, monthly or custom report from recorded PostgreSQL rows, print it on one clean page set, or download any section as CSV."
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
              <Button size="sm" icon={Printer} onClick={() => window.print()}>
                Print
              </Button>
            </>
          }
        />
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-brand-100 bg-brand-50/60 px-3.5 py-2.5 text-[11px] leading-relaxed text-navy-700/75 print:hidden">
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-brand-600" />
        <p>
          <span className="font-bold text-navy-900">Demo data notice:</span> every figure is
          generated seed data, not a real business record. CSV downloads include a Data Source
          column that labels each row as simulated.
        </p>
      </div>

      <div className="print:hidden">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <Tabs
            tabs={PERIODS.map((item) => ({ id: item.id, label: item.label }))}
            value={period}
            onChange={changePeriod}
          />
          <div className="flex flex-wrap items-end gap-2">
            {period === 'custom' ? (
              <>
                <Input
                  type="date"
                  aria-label="Report start date"
                  value={customFrom}
                  onChange={(event) => setCustomFrom(event.target.value)}
                  className="h-9 w-full text-xs sm:w-40"
                />
                <span className="pb-2 text-[11px] text-navy-700/45">to</span>
                <Input
                  type="date"
                  aria-label="Report end date"
                  value={customTo}
                  onChange={(event) => setCustomTo(event.target.value)}
                  className="h-9 w-full text-xs sm:w-40"
                />
              </>
            ) : null}
            {data ? (
              <Badge tone="brand" dot>
                {rangeLabel(data.range)}
              </Badge>
            ) : null}
            {data ? (
              <span className="pb-1 text-[10px] text-navy-700/45">
                {data.range.days
                  ? `${formatNumber(data.range.days)} ${data.range.days === 1 ? 'day' : 'days'}`
                  : 'All history'}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {renderBody()}

      <div className="flex flex-wrap items-center gap-2 text-[10px] text-navy-700/45 print:hidden">
        <ArrowRight className="size-3" />
        Related pages: Analytics explains the trends; Delivery Optimizer covers zone economics;
        Forecasting projects the next demand window.
      </div>
    </div>
  );
}
