import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  ChevronDown,
  CheckCircle2,
  Clock3,
  Info,
  Lightbulb,
  Receipt,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';
import api from '../services/api';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  PageHeader,
  Skeleton,
  StatCard,
  Tabs,
} from '../components/ui';
import {
  formatDate,
  formatNumber,
  formatPercent,
} from '../utils/format';
import { getApiError } from '../utils/apiError';

const PRIORITY_TONES = {
  Critical: 'red',
  High: 'amber',
  Medium: 'brand',
  Low: 'slate',
};

const CONFIDENCE_TONES = {
  High: 'emerald',
  Medium: 'amber',
  Low: 'red',
  Unknown: 'slate',
};

const CATEGORY_META = {
  Inventory: { icon: Boxes, iconClass: 'bg-violet-50 text-violet-600' },
  Delivery: { icon: Truck, iconClass: 'bg-aqua-50 text-aqua-700' },
  Demand: { icon: TrendingUp, iconClass: 'bg-brand-50 text-brand-700' },
  Customer: { icon: Users, iconClass: 'bg-emerald-50 text-emerald-600' },
  Cost: { icon: Receipt, iconClass: 'bg-amber-50 text-amber-600' },
};

const STOCK_STATUS_TONES = {
  'Below reorder level': 'red',
  'Reorder soon': 'amber',
  Watch: 'amber',
  Overstock: 'violet',
  Healthy: 'emerald',
};

const PRIORITY_TAB_ORDER = ['Critical', 'High', 'Medium', 'Low'];

function RecommendationCard({ recommendation }) {
  const meta = CATEGORY_META[recommendation.category] || {
    icon: Lightbulb,
    iconClass: 'bg-slate-100 text-slate-600',
  };
  const Icon = meta.icon;

  return (
    <Card className="flex min-w-0 flex-col p-4">
      <div className="flex items-start gap-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${meta.iconClass}`}>
          <Icon className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={PRIORITY_TONES[recommendation.priority] || 'slate'} dot>
              {recommendation.priority}
            </Badge>
            <Badge tone="slate">{recommendation.category}</Badge>
            <Badge tone={CONFIDENCE_TONES[recommendation.confidence] || 'slate'}>
              {recommendation.confidence} confidence
            </Badge>
          </div>
          <h3 className="mt-2 text-sm font-extrabold leading-snug tracking-tight text-navy-900">
            {recommendation.title}
          </h3>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50/60 p-3">
        <p className="text-[9px] font-extrabold uppercase tracking-wider text-brand-700">
          Do this
        </p>
        <p className="mt-1 text-[11px] font-semibold leading-relaxed text-navy-900">
          {recommendation.action}
        </p>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-navy-700/65">
        {recommendation.rationale}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {recommendation.metrics.map((metric, index) => (
          <div
            key={`${metric.label}-${index}`}
            className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/60 p-2"
          >
            <p className="truncate text-[9px] font-bold uppercase tracking-wider text-navy-700/45">
              {metric.label}
            </p>
            <p className="mt-0.5 truncate text-[11px] font-extrabold text-navy-900">
              {metric.value}
            </p>
            {metric.hint ? (
              <p className="mt-0.5 truncate text-[9px] text-navy-700/45">{metric.hint}</p>
            ) : null}
          </div>
        ))}
      </div>

      <details className="group mt-3 rounded-xl border border-slate-100 bg-white px-3 py-2">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[10px] font-bold text-navy-800 [&::-webkit-details-marker]:hidden">
          Why this recommendation
          <ChevronDown className="size-3.5 shrink-0 text-navy-700/45 transition group-open:rotate-180" />
        </summary>
        <ul className="mt-2 space-y-1.5">
          {recommendation.evidence.map((item, index) => (
            <li
              key={index}
              className="flex gap-1.5 text-[10px] leading-relaxed text-navy-700/65"
            >
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-brand-400" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        {recommendation.confidence_note ? (
          <p className="mt-2 border-t border-slate-100 pt-2 text-[10px] leading-relaxed text-navy-700/50">
            {recommendation.confidence_note}
          </p>
        ) : null}
      </details>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-navy-700/55">
          <Clock3 className="size-3" />
          {recommendation.timing || 'No specific timing'}
        </span>
        <span className="text-[10px] text-navy-700/45">
          {recommendation.entity?.name || recommendation.entity?.label || 'Recorded data'}
        </span>
      </div>
    </Card>
  );
}

export default function RecommendationsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [priority, setPriority] = useState('all');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/recommendations');
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
  }, [refreshKey]);

  const recommendations = useMemo(() => data?.recommendations || [], [data]);
  const summary = data?.summary;
  const stockSummary = data?.stock_summary;
  const stockWatchlist = data?.stock_watchlist || [];
  const forecast = data?.forecast;
  const deliverySummary = data?.delivery_summary;
  const policy = data?.policy;

  const filteredRecommendations = useMemo(
    () =>
      recommendations.filter(
        (recommendation) =>
          (priority === 'all' || recommendation.priority === priority) &&
          (category === 'all' || recommendation.category === category)
      ),
    [recommendations, priority, category]
  );

  const priorityTabs = useMemo(
    () => [
      { id: 'all', label: 'All', count: summary?.total_recommendations || 0 },
      ...PRIORITY_TAB_ORDER.map((level) => ({
        id: level,
        label: level,
        count: summary?.by_priority?.[level] || 0,
      })),
    ],
    [summary]
  );

  const categoryCounts = summary?.by_category || {};

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
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="min-w-0 p-5 xl:col-span-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-4 h-56 w-full" />
            </Card>
            <Card className="p-5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-4 h-12 w-24" />
              <Skeleton className="mt-3 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-3/4" />
            </Card>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {[0, 1].map((index) => (
              <Card key={index} className="p-5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="mt-4 h-4 w-full" />
                <Skeleton className="mt-3 h-4 w-5/6" />
              </Card>
            ))}
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <ErrorState
          title="Recommendations unavailable"
          message={error}
          onRetry={() => setRefreshKey((key) => key + 1)}
        />
      );
    }

    if (!data) {
      return (
        <Card>
          <EmptyState
            icon={Lightbulb}
            title="No recommendations yet"
            description="Recommendations appear once the database has recorded sales, inventory and delivery activity."
          />
        </Card>
      );
    }

    const lowestCover = stockSummary?.lowest_cover;
    const demandChange = forecast?.change_vs_last_7_percent;

    return (
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Action now"
            value={formatNumber(summary.action_now)}
            hint={`${formatNumber(summary.by_priority.Critical)} critical · ${formatNumber(
              summary.by_priority.High
            )} high priority`}
            icon={AlertTriangle}
            tone="amber"
          />
          <StatCard
            label="Open deliveries"
            value={formatNumber(deliverySummary.open_stops)}
            hint={`${formatNumber(deliverySummary.pending)} pending · ${formatNumber(
              deliverySummary.in_transit
            )} in transit · ${formatNumber(deliverySummary.total_gallons)} gal`}
            icon={Truck}
            tone="brand"
          />
          <StatCard
            label="Stockout risks"
            value={formatNumber(summary.stockout_risks)}
            hint={
              lowestCover
                ? `Lowest cover ${formatNumber(lowestCover.days_of_cover, {
                    decimals: true,
                  })} days · ${lowestCover.product_name}`
                : 'No active products'
            }
            icon={Boxes}
            tone={summary.stockout_risks > 0 ? 'amber' : 'emerald'}
          />
          <StatCard
            label={`Demand · next ${forecast.horizon_days} days`}
            value={`${formatNumber(forecast.total_gallons)} gal`}
            hint={`${formatPercent(demandChange)} vs last 7 days · ${forecast.confidence} confidence`}
            icon={TrendingUp}
            tone="violet"
            trend={
              demandChange === null
                ? null
                : {
                    value: demandChange,
                    label: formatPercent(Math.abs(demandChange)),
                  }
            }
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="min-w-0 xl:col-span-2">
            <CardHeader
              title="Stock health & reorder check"
              subtitle={`${policy.activity_window_days}-day sales velocity against filled units`}
              icon={Boxes}
              action={
                <Badge
                  tone={stockSummary.reorder_now > 0 ? 'amber' : 'emerald'}
                  dot
                >
                  {stockSummary.reorder_now > 0
                    ? `${formatNumber(stockSummary.reorder_now)} need reorder`
                    : 'No reorder needed'}
                </Badge>
              }
            />
            <CardBody className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    label: 'Below reorder level',
                    value: formatNumber(stockSummary.below_reorder_level),
                  },
                  {
                    label: 'Suggested order',
                    value: `${formatNumber(stockSummary.total_suggested_reorder_units)} units`,
                  },
                  {
                    label: 'Lowest cover',
                    value: lowestCover
                      ? `${formatNumber(lowestCover.days_of_cover, { decimals: true })} days`
                      : '—',
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

              <div className="divide-y divide-slate-100">
                {stockWatchlist.map((product) => (
                  <div
                    key={product.product_id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-bold text-navy-900">
                        {product.product_name}
                      </p>
                      <p className="mt-0.5 text-[10px] text-navy-700/50">
                        {formatNumber(product.filled_units)} filled ·{' '}
                        {formatNumber(product.avg_daily_units, { decimals: true })}/day ·
                        reorder at {formatNumber(product.reorder_level)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-[11px] font-extrabold text-navy-900">
                          {product.days_of_cover === null
                            ? '—'
                            : `${formatNumber(product.days_of_cover, { decimals: true })} days`}
                        </p>
                        <p className="text-[9px] uppercase tracking-wide text-navy-700/40">
                          cover
                        </p>
                      </div>
                      <Badge tone={STOCK_STATUS_TONES[product.status] || 'slate'}>
                        {product.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-slate-100 bg-white p-3 text-[10px] leading-relaxed text-navy-700/55">
                <span className="font-bold text-navy-800">Reorder rule:</span> a product
                triggers an order when filled units are at or below its reorder level, or
                when cover falls within the{' '}
                {policy.lead_time_days + policy.safety_stock_days}-day lead/safety buffer.
                A triggered order tops stock up to{' '}
                {policy.reorder_target_days} days of cover.{' '}
                {stockSummary.reorder_now > 0
                  ? `${formatNumber(stockSummary.reorder_now)} product${
                      stockSummary.reorder_now === 1 ? '' : 's'
                    } currently ${stockSummary.reorder_now === 1 ? 'triggers' : 'trigger'}, with ${formatNumber(
                      stockSummary.total_suggested_reorder_units
                    )} units suggested.`
                  : 'No product currently triggers, so the suggested order is zero.'}
              </div>
            </CardBody>
          </Card>

          <Card className="min-w-0">
            <CardHeader
              title="Demand context"
              subtitle={`Recursive ${policy.forecast_window_days}-day moving average`}
              icon={TrendingUp}
              action={
                <Badge tone={CONFIDENCE_TONES[forecast.confidence] || 'slate'}>
                  {forecast.confidence} confidence
                </Badge>
              }
            />
            <CardBody className="space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-navy-700/50">
                  Next {forecast.horizon_days} days
                </p>
                <div className="mt-1 flex flex-wrap items-end gap-2">
                  <p className="text-3xl font-extrabold tracking-tight text-navy-900">
                    {formatNumber(forecast.total_gallons)} gal
                  </p>
                  <Badge tone={demandChange >= 0 ? 'emerald' : 'amber'}>
                    {demandChange >= 0 ? '+' : ''}
                    {formatPercent(demandChange)}
                  </Badge>
                </div>
                <p className="mt-1 text-[10px] text-navy-700/55">
                  {formatNumber(forecast.average_daily_gallons, { decimals: true })} gal/day ·
                  last 7 days {formatNumber(forecast.last_7_days_total)} gal
                </p>
              </div>

              <div className="space-y-1.5">
                {forecast.points.map((point) => {
                  const width = Math.max(
                    4,
                    (point.predicted_gallons /
                      Math.max(...forecast.points.map((item) => item.predicted_gallons))) *
                      100
                  );
                  return (
                    <div key={point.sale_date} className="flex items-center gap-2">
                      <span className="w-8 shrink-0 text-[10px] font-semibold text-navy-700/55">
                        {point.day_name.slice(0, 3)}
                      </span>
                      <div className="h-1.5 min-w-0 flex-1 rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right text-[10px] font-extrabold text-navy-900">
                        {formatNumber(point.predicted_gallons)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                  <p className="text-[10px] leading-relaxed text-navy-700/70">
                    <span className="font-bold text-navy-900">Directional only.</span>{' '}
                    Daily demand variation is {formatNumber(
                      forecast.coefficient_of_variation,
                      { decimals: true }
                    )}
                    %, so plan from the range on the forecasting page, not from a single
                    daily number.
                  </p>
                </div>
              </div>

              <Button
                as={Link}
                to="/forecasting"
                variant="secondary"
                size="sm"
                iconRight={ArrowRight}
                className="w-full"
              >
                Open full forecast
              </Button>
            </CardBody>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Tabs tabs={priorityTabs} value={priority} onChange={setPriority} />
              <div className="flex items-center gap-2">
                <label
                  htmlFor="recommendation-category"
                  className="text-[10px] font-bold uppercase tracking-wider text-navy-700/50"
                >
                  Category
                </label>
                <select
                  id="recommendation-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-bold text-navy-800 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                >
                  <option value="all">All categories</option>
                  {Object.keys(CATEGORY_META).map((item) => (
                    <option key={item} value={item}>
                      {item} ({categoryCounts[item] || 0})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[11px] text-navy-700/55">
              <span>
                Showing {filteredRecommendations.length} of{' '}
                {summary.total_recommendations} actions
              </span>
              <span>Sorted by priority, then category</span>
            </div>
          </div>
        </Card>

        {filteredRecommendations.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredRecommendations.map((recommendation) => (
              <RecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
              />
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState
              icon={CheckCircle2}
              title="No actions match these filters"
              description="Clear the priority or category filter to see the full action plan."
            />
          </Card>
        )}

        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-sm font-extrabold tracking-tight text-navy-900">
                Context observations
              </h2>
              <p className="mt-0.5 text-[11px] text-navy-700/55">
                Descriptive context behind the actions, not additional tasks.
              </p>
            </div>
            <Badge tone="slate">{data.insights.length} observations</Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data.insights.map((insight) => (
              <Card key={insight.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-navy-700/50">
                    {insight.title}
                  </p>
                  <Badge tone={insight.tone}>{insight.value}</Badge>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-navy-700/65">
                  {insight.description}
                </p>
              </Card>
            ))}
          </div>
        </div>

        <Card className="min-w-0">
          <CardHeader
            title="Decision policy & assumptions"
            subtitle="Every rule is explicit, reproducible and based on recorded PostgreSQL data"
            icon={Info}
            action={<Badge tone="slate">No hidden model</Badge>}
          />
          <CardBody className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-navy-700/50">
                Assumptions
              </p>
              <ul className="mt-2 space-y-2">
                {policy.assumptions.map((assumption, index) => (
                  <li
                    key={index}
                    className="flex gap-2 text-[11px] leading-relaxed text-navy-700/65"
                  >
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-brand-400" />
                    <span>{assumption}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-navy-700/50">
                Confidence scale
              </p>
              <div className="mt-2 space-y-2">
                {policy.confidence_scale.map((item) => (
                  <div
                    key={item.level}
                    className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5"
                  >
                    <Badge tone={CONFIDENCE_TONES[item.level] || 'slate'}>
                      {item.level}
                    </Badge>
                    <p className="mt-1 text-[10px] leading-relaxed text-navy-700/65">
                      {item.meaning}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="p-4">
          <div className="flex flex-col gap-2 text-[11px] text-navy-700/55 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
              Actions are generated from recorded sales, inventory, delivery and expense
              rows. Nothing is hardcoded, and no forecast accuracy is assumed.
            </p>
            <p className="font-semibold text-navy-800 sm:whitespace-nowrap">
              Data through {formatDate(data.dataset.latest_sale_date)} ·{' '}
              {formatNumber(data.dataset.total_recorded_days)} recorded days
            </p>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Prescriptive analytics"
        title="Recommendations"
        description="Turn recorded operations and the demand forecast into ranked, explainable actions — reorders, delivery scheduling hints, customer follow-ups and cost checks."
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
          <span className="font-bold text-navy-900">Demo data notice:</span> these
          recommendations use the deterministic simulated dataset in PostgreSQL. They are an
          academic decision-support exercise, not live business instructions.
        </p>
      </div>

      {data ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand" dot>
            {policy.activity_window_days}-day velocity
          </Badge>
          <Badge tone="aqua" dot>
            {policy.lead_time_days}-day lead + {policy.safety_stock_days}-day safety
          </Badge>
          <Badge tone="violet" dot>
            {policy.forecast_horizon_days}-day forecast context
          </Badge>
          <Badge tone="amber" dot>
            {policy.inactive_customer_days}-day inactive threshold
          </Badge>
          <span className="text-[10px] text-navy-700/45">
            {formatNumber(data.dataset.active_products)} active products ·{' '}
            {formatNumber(data.dataset.open_deliveries)} open deliveries ·{' '}
            {formatNumber(data.dataset.inactive_customers)} inactive customers
          </span>
        </div>
      ) : null}

      {renderBody()}
    </div>
  );
}
