import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Droplets,
  Gauge,
  Info,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TrendingUp,
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
} from '../components/ui';
import {
  formatCompactNumber,
  formatDate,
  formatDateShort,
  formatNumber,
  formatPercent,
} from '../utils/format';
import { getApiError } from '../utils/apiError';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

const HORIZONS = [
  { value: 7, label: 'Next 7 days' },
  { value: 14, label: 'Next 14 days' },
  { value: 30, label: 'Next 30 days' },
];

const RELIABILITY_TONES = {
  High: 'emerald',
  Moderate: 'aqua',
  'Low to moderate': 'amber',
  Limited: 'red',
  Unknown: 'slate',
};

export default function ForecastingPage() {
  const [horizon, setHorizon] = useState(7);
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
        const response = await api.get('/forecast', { params: { horizon } });
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
  }, [horizon, refreshKey]);

  const forecast = useMemo(() => data?.forecast || [], [data]);
  const history = useMemo(() => data?.history || [], [data]);
  const summary = data?.summary;
  const validation = data?.validation;
  const dataset = data?.dataset;
  const method = data?.method;

  const reliabilityTone = RELIABILITY_TONES[validation?.reliability?.level] || 'slate';

  const chartPayload = useMemo(() => {
    if (!data) return null;

    const labels = [
      ...history.map((row) => formatDateShort(row.sale_date)),
      ...forecast.map((row) => formatDateShort(row.sale_date)),
    ];
    const historyCount = history.length;
    const actual = [
      ...history.map((row) => Number(row.gallons)),
      ...forecast.map(() => null),
    ];
    const movingAverage = [
      ...history.map((row) => Number(row.moving_average_7)),
      ...forecast.map(() => null),
    ];

    const lastActual = historyCount ? Number(history[historyCount - 1].gallons) : null;
    const predicted = [
      ...Array.from({ length: Math.max(historyCount - 1, 0) }, () => null),
      ...(historyCount ? [lastActual] : []),
      ...forecast.map((row) => Number(row.predicted_gallons)),
    ];
    const lower = [
      ...Array.from({ length: historyCount }, () => null),
      ...forecast.map((row) => Number(row.lower_gallons)),
    ];
    const upper = [
      ...Array.from({ length: historyCount }, () => null),
      ...forecast.map((row) => Number(row.upper_gallons)),
    ];

    const chartData = {
      labels,
      datasets: [
        {
          label: 'Lower 95%',
          data: lower,
          borderWidth: 0,
          pointRadius: 0,
          pointHitRadius: 0,
          backgroundColor: 'transparent',
          fill: false,
        },
        {
          label: 'Upper 95%',
          data: upper,
          borderWidth: 0,
          pointRadius: 0,
          pointHitRadius: 0,
          backgroundColor: 'rgba(245, 158, 11, 0.14)',
          fill: '-1',
        },
        {
          label: 'Actual gallons',
          data: actual,
          borderColor: '#184edb',
          backgroundColor: 'rgba(24, 78, 219, 0.06)',
          fill: true,
          tension: 0.28,
          borderWidth: 2.4,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          label: '7-day average',
          data: movingAverage,
          borderColor: '#06b6d4',
          borderWidth: 1.6,
          borderDash: [4, 4],
          pointRadius: 0,
          pointHoverRadius: 3,
          fill: false,
        },
        {
          label: 'Forecast',
          data: predicted,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          borderWidth: 2.8,
          borderDash: [7, 5],
          tension: 0.22,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#f59e0b',
          pointHoverBorderColor: '#ffffff',
          pointHoverBorderWidth: 2,
          fill: false,
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
            padding: 14,
            color: '#475569',
            font: { size: 10, weight: '600' },
            filter: (item) => !item.text.includes('95%'),
          },
        },
        tooltip: {
          backgroundColor: '#0f172a',
          padding: 10,
          cornerRadius: 10,
          filter: (item) => !item.dataset.label.includes('95%'),
          callbacks: {
            label: (context) => {
              if (context.parsed.y === null) return '';
              return ` ${context.dataset.label}: ${formatNumber(context.parsed.y, {
                decimals: true,
              })} gal`;
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
          grid: { color: 'rgba(148, 163, 184, 0.16)' },
          border: { display: false },
          ticks: {
            color: '#94a3b8',
            font: { size: 10 },
            callback: (value) => `${formatCompactNumber(value)} gal`,
          },
        },
      },
    };

    return { chartData, chartOptions };
  }, [data, history, forecast]);

  const forecastColumns = [
    {
      key: 'sale_date',
      header: 'Date',
      cell: (row) => (
        <div>
          <p className="font-semibold text-navy-900">{formatDate(row.sale_date)}</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-navy-700/45">
            Day {row.step} of {method?.horizon_days}
          </p>
        </div>
      ),
    },
    {
      key: 'day_name',
      header: 'Day',
      cell: (row) => row.day_name,
    },
    {
      key: 'predicted_gallons',
      header: 'Predicted',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <span className="font-bold text-navy-900">
          {formatNumber(row.predicted_gallons, { decimals: true })} gal
        </span>
      ),
    },
    {
      key: 'range',
      header: '95% range',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <span className="text-[11px] text-navy-700/65">
          {formatNumber(row.lower_gallons)} – {formatNumber(row.upper_gallons)} gal
        </span>
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
            <Card className="min-w-0 p-5 lg:col-span-2">
              <Skeleton className="h-4 w-40" />
              <ChartSkeleton height="h-80" />
            </Card>
            <Card className="p-5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-5 h-12 w-24" />
              <Skeleton className="mt-4 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-3/4" />
            </Card>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <ErrorState
          title="Forecast unavailable"
          message={error}
          onRetry={() => setRefreshKey((key) => key + 1)}
        />
      );
    }

    if (!data || !forecast.length || !chartPayload) {
      return (
        <Card>
          <EmptyState
            icon={TrendingUp}
            title="Not enough history to forecast"
            description="At least 21 days of recorded sales are required before a demand forecast can be backtested."
          />
        </Card>
      );
    }

    const change = summary.change_vs_last_7_average;
    const peak = summary.peak_day;

    return (
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={`Forecast demand · ${method.horizon_days} days`}
            value={`${formatNumber(summary.forecast_total_gallons)} gal`}
            hint={`${formatNumber(summary.average_daily_gallons, {
              decimals: true,
            })} gal per day · last 7 days averaged ${formatNumber(
              dataset.last_7_days_average,
              { decimals: true }
            )} gal`}
            icon={Droplets}
            tone="brand"
          />
          <StatCard
            label="Demand outlook"
            value={change === null ? '—' : formatPercent(change)}
            hint="Forecast average vs last 7 recorded days"
            icon={TrendingUp}
            tone={change !== null && change >= 0 ? 'emerald' : 'amber'}
            trend={
              change === null
                ? null
                : {
                    value: change,
                    label: change >= 0 ? 'Higher demand' : 'Lower demand',
                  }
            }
          />
          <StatCard
            label="Peak forecast day"
            value={`${formatNumber(peak.predicted_gallons)} gal`}
            hint={`${peak.day_name} · ${formatDate(peak.sale_date)}`}
            icon={CalendarDays}
            tone="violet"
          />
          <StatCard
            label="Model reliability"
            value={validation.reliability.level}
            hint={`WAPE ${formatPercent(validation.wape)} · MAE ${formatNumber(
              validation.mae
            )} gal/day`}
            icon={ShieldAlert}
            tone={reliabilityTone === 'emerald' ? 'emerald' : 'amber'}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="min-w-0 lg:col-span-2">
            <CardHeader
              title="Actual demand and forecast"
              subtitle={`Recorded gallons through ${formatDate(
                dataset.latest_sale_date
              )}, then the next ${method.horizon_days} days`}
              icon={Activity}
              action={
                <Badge tone="amber" dot>
                  95% forecast band
                </Badge>
              }
            />
            <CardBody>
              <div className="h-80">
                <Line data={chartPayload.chartData} options={chartPayload.chartOptions} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-navy-700/50">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-4 rounded bg-brand-700" /> Recorded sales
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-4 rounded bg-aqua-500" /> 7-day average
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-4 rounded border-t-2 border-dashed border-amber-500" />
                  Forecast
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-amber-500/20" /> 95% range
                </span>
              </div>
            </CardBody>
          </Card>

          <Card className="min-w-0">
            <CardHeader
              title="Model accuracy"
              subtitle="Out-of-sample rolling backtest"
              icon={Gauge}
              action={
                <Badge tone={reliabilityTone}>
                  {validation.reliability.level} reliability
                </Badge>
              }
            />
            <CardBody className="space-y-4">
              <div>
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-navy-700/50">
                      WAPE
                    </p>
                    <p className="mt-1 text-3xl font-extrabold tracking-tight text-navy-900">
                      {formatPercent(validation.wape)}
                    </p>
                  </div>
                  <Badge tone="slate">Lower is better</Badge>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-navy-700/65">
                  {validation.reliability.message}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'MAE', value: `${formatNumber(validation.mae)} gal` },
                  { label: 'RMSE', value: `${formatNumber(validation.rmse)} gal` },
                  {
                    label: 'MAPE',
                    value:
                      validation.mape === null ? '—' : formatPercent(validation.mape),
                  },
                ].map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 text-center"
                  >
                    <p className="text-[9px] font-bold uppercase tracking-wider text-navy-700/45">
                      {metric.label}
                    </p>
                    <p className="mt-1 text-xs font-extrabold text-navy-900">{metric.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-slate-100 bg-white p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-navy-700/50">
                  Versus naive baseline
                </p>
                <div className="mt-2 space-y-2 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-navy-700/65">7-day moving average WAPE</span>
                    <span className="font-bold text-navy-900">
                      {formatPercent(validation.wape)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-navy-700/65">Naive previous-day WAPE</span>
                    <span className="font-bold text-navy-900">
                      {formatPercent(validation.baseline.wape)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                    <span className="font-semibold text-navy-800">MAE improvement</span>
                    <Badge
                      tone={
                        validation.mae_improvement_vs_baseline > 0 ? 'emerald' : 'red'
                      }
                    >
                      {formatPercent(validation.mae_improvement_vs_baseline)}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="text-[10px] leading-relaxed text-navy-700/50">
                Holdout: {formatDate(validation.validation_start)} –{' '}
                {formatDate(validation.validation_end)} ·{' '}
                {formatNumber(validation.evaluated_days)} days ·{' '}
                {formatNumber(validation.training_days)} training days. Forecasts were
                made one day at a time using only earlier observations. Metrics are
                one-step-ahead, so longer horizons carry additional uncertainty.
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="min-w-0 xl:col-span-2">
            <CardHeader
              title="Forecast by day"
              subtitle="Point estimate and approximate 95% range"
              icon={CalendarDays}
              action={
                <Badge tone="brand">
                  {formatNumber(summary.forecast_total_gallons)} gal total
                </Badge>
              }
            />
            <DataTable
              columns={forecastColumns}
              rows={forecast}
              rowKey={(row) => row.sale_date}
              footer={
                <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-[11px]">
                  <span className="text-navy-700/55">
                    Daily bands are approximate and clipped at zero; aggregate uncertainty
                    is not estimated.
                  </span>
                  <span className="font-bold text-navy-900">
                    {formatNumber(summary.forecast_total_gallons)} gal total
                  </span>
                </div>
              }
            />
          </Card>

          <Card className="min-w-0">
            <CardHeader
              title="How the forecast works"
              subtitle="Transparent method, no hidden assumptions"
              icon={Info}
            />
            <CardBody className="space-y-3">
              <div className="space-y-2.5">
                {[
                  {
                    step: '1',
                    title: 'Aggregate demand',
                    text: 'Daily gallons come from recorded sale items; days with no sale count as zero demand.',
                  },
                  {
                    step: '2',
                    title: '7-day moving average',
                    text: 'The next day uses the average of the seven most recent daily totals.',
                  },
                  {
                    step: '3',
                    title: 'Recursive horizon',
                    text: 'Each later forecast day feeds its prediction back into the seven-day window.',
                  },
                  {
                    step: '4',
                    title: 'Backtest and range',
                    text: 'The last part of history is predicted one day at a time. Holdout residuals set the 95% band, widened by the square root of the horizon.',
                  },
                ].map((item) => (
                  <div key={item.step} className="flex gap-2.5">
                    <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-brand-50 text-[10px] font-extrabold text-brand-700">
                      {item.step}
                    </span>
                    <div>
                      <p className="text-[11px] font-bold text-navy-900">{item.title}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-navy-700/65">
                        {item.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                  <p className="text-[10px] leading-relaxed text-navy-700/70">
                    <span className="font-bold text-navy-900">Use with caution.</span> The
                    demo dataset has a coefficient of variation of{' '}
                    {formatPercent(dataset.coefficient_of_variation)}, so daily demand is
                    highly variable. The range is more trustworthy than the point estimate.
                  </p>
                </div>
              </div>

              <Button
                as={Link}
                to="/analytics"
                variant="secondary"
                size="sm"
                iconRight={ArrowRight}
                className="w-full"
              >
                Review descriptive analytics
              </Button>
            </CardBody>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex flex-col gap-2 text-[11px] text-navy-700/55 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
              Accuracy is measured from out-of-sample holdout errors. No forecast accuracy
              is hardcoded or assumed.
            </p>
            <p className="font-semibold text-navy-800 sm:whitespace-nowrap">
              Data through {formatDate(dataset.latest_sale_date)} ·{' '}
              {formatNumber(dataset.total_days)} recorded days
            </p>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Predictive analytics"
        title="Demand forecasting"
        description="A short-term water demand projection built from recorded sales, with an out-of-sample accuracy report and an explicit uncertainty range."
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
          <span className="font-bold text-navy-900">Demo data notice:</span> this forecast
          uses the deterministic simulated dataset in PostgreSQL. It is an academic projection,
          not a real business commitment.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100/80 p-1">
            {HORIZONS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setHorizon(item.value)}
                className={
                  horizon === item.value
                    ? 'rounded-lg bg-white px-3 py-1.5 text-[11px] font-bold text-navy-900 shadow-sm'
                    : 'rounded-lg px-3 py-1.5 text-[11px] font-bold text-navy-700/60 transition hover:text-navy-900'
                }
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-navy-700/55">
            <Badge tone="aqua">7-day moving average</Badge>
            {method ? (
              <span>
                Horizon {method.horizon_days} days · {method.confidence_level}% band
              </span>
            ) : null}
          </div>
        </div>

        {data?.dataset ? (
          <p className="mt-3 border-t border-slate-100 pt-3 text-[10px] text-navy-700/45">
            Input window: {formatNumber(data.dataset.history_days)} days shown in the chart
            · {formatNumber(data.dataset.total_days)} recorded days used for validation ·
            latest sale {formatDate(data.dataset.latest_sale_date)}
          </p>
        ) : null}
      </Card>

      {renderBody()}
    </div>
  );
}
