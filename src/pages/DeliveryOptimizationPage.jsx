import { useEffect, useMemo, useState } from 'react';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  Clock3,
  Compass,
  Info,
  MapPin,
  Receipt,
  RefreshCw,
  Route as RouteIcon,
  Sparkles,
  Timer,
  TrendingDown,
  Truck,
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
  PageHeader,
  Skeleton,
  StatCard,
  Tabs,
} from '../components/ui';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  parseDateValue,
} from '../utils/format';
import { getApiError } from '../utils/apiError';

ChartJS.register(
  BarElement,
  CategoryScale,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
);

const WINDOWS = [
  { id: '30', label: '30 days' },
  { id: '90', label: '90 days' },
  { id: '180', label: '180 days' },
  { id: '365', label: '1 year' },
  { id: 'all', label: 'All time' },
];

const SEVERITY_TONES = { High: 'red', Medium: 'amber', Low: 'slate' };

const CATEGORY_META = {
  Cost: { icon: Wallet, className: 'bg-amber-50 text-amber-600' },
  Routing: { icon: RouteIcon, className: 'bg-brand-50 text-brand-700' },
  Reliability: { icon: AlertTriangle, className: 'bg-red-50 text-red-600' },
  Timing: { icon: Timer, className: 'bg-violet-50 text-violet-600' },
};

const ZONE_STATUS_TONES = {
  Profitable: 'emerald',
  'Thin margin': 'amber',
  'Loss-making': 'red',
  'No delivered sample': 'slate',
};

function formatTime(value) {
  const date = parseDateValue(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function marginClass(value) {
  if (!Number.isFinite(Number(value))) return 'text-navy-900';
  return Number(value) < 0 ? 'text-red-600' : 'text-emerald-600';
}

function OpportunityCard({ opportunity }) {
  const meta = CATEGORY_META[opportunity.category] || {
    icon: Info,
    className: 'bg-slate-100 text-slate-600',
  };
  const Icon = meta.icon;

  return (
    <Card className="flex min-w-0 flex-col p-4">
      <div className="flex items-start gap-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${meta.className}`}>
          <Icon className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={SEVERITY_TONES[opportunity.severity] || 'slate'} dot>
              {opportunity.severity}
            </Badge>
            <Badge tone="slate">{opportunity.category}</Badge>
          </div>
          <h3 className="mt-2 text-sm font-extrabold leading-snug tracking-tight text-navy-900">
            {opportunity.title}
          </h3>
        </div>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-navy-700/65">
        {opportunity.finding}
      </p>

      <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50/60 p-3">
        <p className="text-[9px] font-extrabold uppercase tracking-wider text-brand-700">
          What to do
        </p>
        <p className="mt-1 text-[11px] font-semibold leading-relaxed text-navy-900">
          {opportunity.action}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {opportunity.metrics.map((metric, index) => (
          <div
            key={`${metric.label}-${index}`}
            className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/60 p-2"
          >
            <p className="truncate text-[9px] font-bold uppercase tracking-wider text-navy-700/45">
              {metric.label}
            </p>
            <p className="mt-0.5 break-words text-[11px] font-extrabold text-navy-900">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <details className="group mt-3 rounded-xl border border-slate-100 bg-white px-3 py-2">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[10px] font-bold text-navy-800 [&::-webkit-details-marker]:hidden">
          Supporting evidence
          <ChevronDown className="size-3.5 shrink-0 text-navy-700/45 transition group-open:rotate-180" />
        </summary>
        <ul className="mt-2 space-y-1.5">
          {opportunity.evidence.map((item, index) => (
            <li key={index} className="flex gap-1.5 text-[10px] leading-relaxed text-navy-700/65">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-brand-400" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </details>
    </Card>
  );
}

export default function DeliveryOptimizationPage() {
  const [windowId, setWindowId] = useState('90');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [fetchedAt, setFetchedAt] = useState(null);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/delivery-optimization', {
          params: windowId === 'all' ? {} : { days: Number(windowId) },
        });
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
  }, [windowId, refreshKey]);

  const summary = data?.summary;
  const openQueue = data?.open_queue;
  const policy = data?.policy;

  const zoneColumns = useMemo(
    () => [
      {
        key: 'zone',
        header: 'Zone',
        cell: (zone) => (
          <div className="min-w-0">
            <p className="font-bold text-navy-900">{zone.zone}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="text-[10px] text-navy-700/50">
                {formatNumber(zone.delivered)} delivered
              </span>
              {zone.cancelled > 0 ? (
                <span className="text-[10px] text-red-500">
                  {formatNumber(zone.cancelled)} cancelled
                </span>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        key: 'stops',
        header: 'Stops',
        className: 'text-right',
        headerClassName: 'text-right',
        cell: (zone) => (
          <div>
            <p className="font-bold text-navy-900">{formatNumber(zone.delivered)}</p>
            <p className="text-[10px] text-navy-700/45">
              {formatPercent(zone.share_of_stops)} of stops
            </p>
          </div>
        ),
      },
      {
        key: 'gallons',
        header: 'Gallons',
        className: 'text-right',
        headerClassName: 'text-right',
        cell: (zone) => (
          <div>
            <p className="font-bold text-navy-900">{formatNumber(zone.gallons)}</p>
            <p className="text-[10px] text-navy-700/45">
              {formatNumber(zone.gallons_per_stop, { decimals: true })} / stop
            </p>
          </div>
        ),
      },
      {
        key: 'fee',
        header: 'Fee / stop',
        className: 'text-right',
        headerClassName: 'text-right',
        cell: (zone) => (
          <p className="font-semibold text-navy-800">{formatCurrency(zone.fee_per_stop)}</p>
        ),
      },
      {
        key: 'fuel',
        header: 'Fuel / stop',
        className: 'text-right',
        headerClassName: 'text-right',
        cell: (zone) => (
          <p className="font-semibold text-navy-800">{formatCurrency(zone.fuel_per_stop)}</p>
        ),
      },
      {
        key: 'breakEven',
        header: 'Break-even',
        className: 'text-right',
        headerClassName: 'text-right',
        cell: (zone) => (
          <p className="font-semibold text-navy-700">{formatCurrency(zone.break_even_fee)}</p>
        ),
      },
      {
        key: 'margin',
        header: 'Margin',
        className: 'text-right',
        headerClassName: 'text-right',
        cell: (zone) => (
          <div>
            <p className={`font-extrabold ${marginClass(zone.margin)}`}>
              {formatCurrency(zone.margin)}
            </p>
            <p className="text-[10px] text-navy-700/45">
              {formatCurrency(zone.margin_per_stop)} / stop
            </p>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        cell: (zone) => (
          <div className="space-y-1">
            <Badge tone={ZONE_STATUS_TONES[zone.status] || 'slate'}>{zone.status}</Badge>
            {zone.cancel_rate !== null ? (
              <p className="text-[10px] text-navy-700/45">
                {formatPercent(zone.cancel_rate)} cancel rate
              </p>
            ) : null}
          </div>
        ),
      },
    ],
    []
  );

  const hourChart = useMemo(() => {
    if (!data) return null;

    const labels = data.hours.map((hour) => hour.label);
    const chartData = {
      labels,
      datasets: [
        {
          type: 'bar',
          label: 'Delivered stops',
          data: data.hours.map((hour) => hour.stops),
          backgroundColor: 'rgba(24, 78, 219, 0.78)',
          hoverBackgroundColor: 'rgba(24, 78, 219, 1)',
          borderRadius: 6,
          maxBarThickness: 26,
          yAxisID: 'y',
        },
        {
          type: 'line',
          label: 'Avg. minutes vs estimate',
          data: data.hours.map((hour) => hour.avg_variance_minutes),
          borderColor: '#f59e0b',
          backgroundColor: '#f59e0b',
          borderWidth: 2,
          pointRadius: 2.5,
          pointHoverRadius: 4,
          tension: 0.32,
          yAxisID: 'y1',
        },
      ],
    };

    const chartOptions = {
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
            padding: 12,
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
              context.dataset.type === 'line'
                ? ` ${context.dataset.label}: +${formatNumber(context.parsed.y, {
                    decimals: true,
                  })} min`
                : ` ${context.dataset.label}: ${formatNumber(context.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: '#94a3b8', font: { size: 10 }, maxRotation: 0 },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(148, 163, 184, 0.16)' },
          border: { display: false },
          ticks: {
            color: '#94a3b8',
            font: { size: 10 },
            precision: 0,
          },
          title: {
            display: true,
            text: 'Stops',
            color: '#94a3b8',
            font: { size: 9, weight: '600' },
          },
        },
        y1: {
          beginAtZero: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          border: { display: false },
          ticks: {
            color: '#b45309',
            font: { size: 10 },
            callback: (value) => `${value}m`,
          },
          title: {
            display: true,
            text: 'Overrun',
            color: '#b45309',
            font: { size: 9, weight: '600' },
          },
        },
      },
    };

    return { chartData, chartOptions };
  }, [data]);

  const renderBody = () => {
    if (loading && !data) {
      return (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((index) => (
              <Card key={index} className="p-5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-4 h-8 w-28" />
                <Skeleton className="mt-3 h-3 w-32" />
              </Card>
            ))}
          </div>
          <Card className="p-5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="mt-4 h-64 w-full" />
          </Card>
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
          title="Delivery optimization unavailable"
          message={error}
          onRetry={() => setRefreshKey((key) => key + 1)}
        />
      );
    }

    if (!data) {
      return (
        <Card>
          <EmptyState
            icon={Truck}
            title="No delivery records yet"
            description="Optimization needs recorded deliveries with distance, fee and time data."
          />
        </Card>
      );
    }

    return (
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Delivery margin"
            value={formatCurrency(summary.delivery_margin)}
            hint={`${formatCurrency(summary.delivery_fees)} fees vs ${formatCurrency(
              summary.fuel_cost
            )} fuel`}
            icon={Wallet}
            tone={summary.delivery_margin < 0 ? 'amber' : 'emerald'}
          />
          <StatCard
            label="Within estimate"
            value={formatPercent(summary.within_estimate_rate, { decimals: 1 })}
            hint={`+${formatNumber(summary.estimate_variance_percent, {
              decimals: 1,
            })}% overrun · ${formatNumber(summary.within_estimate)} of ${formatNumber(
              summary.measured_deliveries
            )} measured`}
            icon={Timer}
            tone="brand"
          />
          <StatCard
            label="Stops per operating day"
            value={formatNumber(summary.stops_per_operating_day, { decimals: true })}
            hint={`${formatNumber(summary.delivered)} stops over ${formatNumber(
              summary.operating_days
            )} operating days`}
            icon={RouteIcon}
            tone="violet"
          />
          <StatCard
            label="Open queue"
            value={formatNumber(openQueue.stops)}
            hint={`${formatNumber(openQueue.zone_runs)} zone runs · ${formatNumber(
              openQueue.gallons
            )} gal · ${formatNumber(openQueue.pending)} pending`}
            icon={Truck}
            tone="aqua"
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="min-w-0 xl:col-span-2">
            <CardHeader
              title="Delivery economics by zone"
              subtitle="Fees, fuel and margin for delivered records in the selected window"
              icon={Receipt}
              action={
                <Badge tone={summary.delivery_margin < 0 ? 'red' : 'emerald'} dot>
                  {summary.delivery_margin < 0 ? 'Fuel gap' : 'Covered'}
                </Badge>
              }
            />
            <DataTable
              columns={zoneColumns}
              rows={data.zones}
              rowKey={(zone) => zone.zone}
              empty={{
                icon: Truck,
                title: 'No delivered records in this window',
                description: 'Widen the window or record completed deliveries.',
              }}
            />
            <CardBody className="pt-0">
              <p className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-[10px] leading-relaxed text-navy-700/55">
                <span className="font-bold text-navy-800">Break-even fee</span> equals the
                recorded average fuel cost per delivered stop. It covers fuel only — it
                excludes vehicle maintenance, labour and overhead.
              </p>
            </CardBody>
          </Card>

          <Card className="min-w-0">
            <CardHeader
              title="Network snapshot"
              subtitle="Recorded delivery performance"
              icon={Compass}
            />
            <CardBody className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Delivered', value: formatNumber(summary.delivered) },
                  { label: 'Cancelled', value: formatNumber(summary.cancelled) },
                  {
                    label: 'Avg. distance',
                    value: `${formatNumber(summary.avg_distance_km, { decimals: true })} km`,
                  },
                  {
                    label: 'Gallons / km',
                    value: formatNumber(summary.gallons_per_km, { decimals: true }),
                  },
                  {
                    label: 'Fuel / km',
                    value: formatCurrency(summary.fuel_per_km),
                  },
                  {
                    label: 'Cancel rate',
                    value: formatPercent(summary.cancellation_rate),
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5"
                  >
                    <p className="text-[9px] font-bold uppercase tracking-wider text-navy-700/45">
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-navy-900">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-3">
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-brand-700">
                  Window density
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-navy-700/70">
                  {formatNumber(data.dataset.single_stop_zone_days)} of{' '}
                  {formatNumber(data.dataset.zone_days)} zone-days served a single stop.
                  Grouping same-zone orders on the same day is the clearest density lever
                  in the recorded data.
                </p>
              </div>

              <div className="space-y-1.5">
                {data.insights.map((insight) => (
                  <div
                    key={insight.id}
                    className="flex items-start justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-navy-700/45">
                        {insight.title}
                      </p>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-navy-700/60">
                        {insight.description}
                      </p>
                    </div>
                    <Badge tone={insight.tone}>{insight.value}</Badge>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        <Card className="min-w-0">
          <CardHeader
            title="Dispatch time vs estimate"
            subtitle="Delivered stops by dispatch hour and the average overrun"
            icon={Clock3}
            action={
              <Badge tone="amber" dot>
                +{formatNumber(summary.estimate_variance_minutes, { decimals: true })} min
                average
              </Badge>
            }
          />
          <CardBody>
            <div className="h-64">
              {hourChart ? (
                <Chart type="bar" data={hourChart.chartData} options={hourChart.chartOptions} />
              ) : (
                <ChartSkeleton height="h-full" />
              )}
            </div>
          </CardBody>
        </Card>

        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-sm font-extrabold tracking-tight text-navy-900">
                Open queue route plan
              </h2>
              <p className="mt-0.5 text-[11px] text-navy-700/55">
                Stops grouped by zone and ordered by promised slot. Distances are
                straight-line legs between recorded coordinates.
              </p>
            </div>
            <Badge tone="brand" dot>
              {formatNumber(openQueue.stops)} stops · {formatNumber(openQueue.zone_runs)}{' '}
              runs
            </Badge>
          </div>

          {openQueue.route_plan.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {openQueue.route_plan.map((plan) => (
                <Card key={plan.zone} className="min-w-0">
                  <CardHeader
                    title={plan.zone}
                    subtitle={`${formatNumber(plan.stop_count)} stop(s) · ${formatNumber(
                      plan.gallons
                    )} gal · ${formatNumber(plan.estimated_minutes)} est. min`}
                    icon={MapPin}
                    action={
                      <div className="flex flex-wrap items-center gap-1">
                        {plan.pending > 0 ? (
                          <Badge tone="slate">{formatNumber(plan.pending)} pending</Badge>
                        ) : null}
                        {plan.in_transit > 0 ? (
                          <Badge tone="amber">{formatNumber(plan.in_transit)} in transit</Badge>
                        ) : null}
                      </div>
                    }
                  />
                  <CardBody className="space-y-2">
                    {plan.stop_count === 1 ? (
                      <p className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 text-[10px] leading-relaxed text-navy-700/60">
                        Single-stop run. No batching opportunity in this zone today.
                      </p>
                    ) : null}

                    <div className="space-y-1.5">
                      {plan.stops.map((stop) => (
                        <div
                          key={`${plan.zone}-${stop.delivery_id}`}
                          className="flex items-start gap-2 rounded-xl border border-slate-100 bg-white p-2.5"
                        >
                          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-50 text-[10px] font-extrabold text-brand-700">
                            {stop.sequence}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <p className="truncate text-[11px] font-bold text-navy-900">
                                {stop.customer_name}
                              </p>
                              <span className="text-[10px] font-semibold text-navy-700/60">
                                {formatTime(stop.delivery_date)}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[10px] text-navy-700/50">
                              {formatNumber(stop.gallons)} gal ·{' '}
                              {formatNumber(stop.distance_km, { decimals: true })} km
                              recorded
                              {stop.leg_km !== null
                                ? ` · ${formatNumber(stop.leg_km, { decimals: true })} km leg`
                                : ''}
                            </p>
                          </div>
                          <Badge
                            tone={
                              stop.delivery_status === 'In Transit'
                                ? 'amber'
                                : stop.delivery_status === 'Pending'
                                  ? 'slate'
                                  : 'emerald'
                            }
                          >
                            {stop.delivery_status}
                          </Badge>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[10px] text-navy-700/55">
                      <span>
                        Straight-line route:{' '}
                        <span className="font-bold text-navy-800">
                          {formatNumber(plan.straight_line_km, { decimals: true })} km
                        </span>
                      </span>
                      <span>
                        Recorded per-stop sum:{' '}
                        {formatNumber(plan.recorded_distance_km, { decimals: true })} km
                      </span>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <EmptyState
                icon={BadgeCheck}
                title="No open deliveries"
                description="The queue is clear. New deliveries will appear here for routing."
              />
            </Card>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-sm font-extrabold tracking-tight text-navy-900">
                Optimization opportunities
              </h2>
              <p className="mt-0.5 text-[11px] text-navy-700/55">
                Ranked by severity, then by cost, routing, reliability and timing.
              </p>
            </div>
            <Badge tone="slate">{data.opportunities.length} findings</Badge>
          </div>

          {data.opportunities.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {data.opportunities.map((opportunity) => (
                <OpportunityCard key={opportunity.id} opportunity={opportunity} />
              ))}
            </div>
          ) : (
            <Card>
              <EmptyState
                icon={BadgeCheck}
                title="No delivery issues found"
                description="Every recorded rule passes for this window."
              />
            </Card>
          )}
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="min-w-0 xl:col-span-2">
            <CardHeader
              title="Weekday pattern"
              subtitle="Volume and cancellation mix by day of week"
              icon={TrendingDown}
            />
            <CardBody className="space-y-2">
              {(() => {
                const maxStops = Math.max(...data.weekday.map((day) => day.delivered), 1);
                return data.weekday.map((day) => (
                  <div key={day.day_name} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-[10px] font-semibold text-navy-700/60">
                      {day.day_name}
                    </span>
                    <div className="h-2 min-w-0 flex-1 rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${(day.delivered / maxStops) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-[10px] font-extrabold text-navy-900">
                      {formatNumber(day.delivered)}
                    </span>
                    <span className="w-12 shrink-0 text-right text-[10px] text-red-500">
                      {day.cancelled > 0 ? `−${formatNumber(day.cancelled)}` : '—'}
                    </span>
                  </div>
                ));
              })()}
              <p className="pt-1 text-[10px] text-navy-700/45">
                Bars show delivered stops; the right column shows cancellations.
              </p>
            </CardBody>
          </Card>

          <Card className="min-w-0">
            <CardHeader
              title="Method & assumptions"
              subtitle="Reproducible rules over recorded rows"
              icon={Info}
              action={<Badge tone="slate">No black box</Badge>}
            />
            <CardBody className="space-y-2">
              <ul className="space-y-2">
                {policy.assumptions.map((assumption, index) => (
                  <li
                    key={index}
                    className="flex gap-2 text-[10px] leading-relaxed text-navy-700/65"
                  >
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-brand-400" />
                    <span>{assumption}</span>
                  </li>
                ))}
              </ul>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 text-[10px] leading-relaxed text-navy-700/55">
                <span className="font-bold text-navy-800">Margin definition:</span>{' '}
                {policy.margin_definition} <br />
                <span className="font-bold text-navy-800">Break-even:</span>{' '}
                {policy.break_even_definition}
              </div>
            </CardBody>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex flex-col gap-2 text-[11px] text-navy-700/55 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2">
              <BadgeCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
              Figures are computed from recorded delivery rows. Route legs are
              straight-line approximations, not live traffic routing.
            </p>
            <p className="font-semibold text-navy-800 sm:whitespace-nowrap">
              {data.dataset.first_delivered_date
                ? `${formatDate(data.dataset.first_delivered_date)} – ${formatDate(
                    data.dataset.last_delivered_date
                  )}`
                : 'No delivered records'}{' '}
              · {formatNumber(data.dataset.delivered)} delivered
            </p>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Delivery optimization"
        title="Routes, costs & timing"
        description="Turn recorded delivery rows into zone economics, batch plans for the open queue and concrete opportunities to cut fuel cost and late arrivals."
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
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-brand-600" />
        <p>
          <span className="font-bold text-navy-900">Demo data notice:</span> this analysis
          uses the deterministic simulated dataset in PostgreSQL. It is an academic
          decision-support exercise, not live routing instructions.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs
          tabs={WINDOWS.map((item) => ({ id: item.id, label: item.label }))}
          value={windowId}
          onChange={setWindowId}
        />
        {data ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand" dot>
              {data.range.is_all_time
                ? 'All recorded deliveries'
                : `${formatDate(data.range.from)} – ${formatDate(data.range.to)}`}
            </Badge>
            <span className="text-[10px] text-navy-700/45">
              {formatNumber(data.dataset.zones)} zones · {formatNumber(data.dataset.zone_days)}{' '}
              zone-days
            </span>
          </div>
        ) : null}
      </div>

      {renderBody()}

      <div className="flex flex-wrap items-center gap-2 text-[10px] text-navy-700/45">
        <ArrowRight className="size-3" />
        Related pages: Deliveries records every trip; Recommendations turns stock and
        customer signals into ranked actions.
      </div>
    </div>
  );
}
