import { useEffect, useMemo, useState } from 'react';
import {
  Clock,
  MapPin,
  Pencil,
  Plus,
  Route,
  Timer,
  Truck,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  DataTable,
  ErrorState,
  Field,
  FilterBar,
  Input,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Skeleton,
  Textarea,
} from '../components/ui';
import useDebouncedValue from '../hooks/useDebouncedValue';
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatPercent,
  parseDateValue,
} from '../utils/format';
import { getApiError, getFieldErrors } from '../utils/apiError';

const STATUSES = ['Pending', 'In Transit', 'Delivered', 'Cancelled'];

const statusTone = (status) => {
  if (status === 'Delivered') return 'emerald';
  if (status === 'In Transit') return 'amber';
  if (status === 'Cancelled') return 'red';
  return 'slate';
};

function nowLocalInput() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(
    now.getHours()
  )}:${pad(now.getMinutes())}`;
}

function toLocalInput(value) {
  const date = parseDateValue(String(value || '').replace(' ', 'T'));
  if (!date) return '';
  const pad = (item) => String(item).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

const emptyForm = () => ({
  sale_id: '',
  customer_id: '',
  delivery_date: nowLocalInput(),
  delivery_zone: '',
  distance_km: '0',
  delivery_fee: '0',
  fuel_cost: '0',
  delivery_status: 'Pending',
  estimated_delivery_minutes: '',
  actual_delivery_minutes: '',
  remarks: '',
});

export default function DeliveriesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [zone, setZone] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [zones, setZones] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const debouncedSearch = useDebouncedValue(search);

  const reload = () => setRefreshKey((key) => key + 1);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, zone, from, to]);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const params = { page, limit: 20 };
        if (debouncedSearch) params.search = debouncedSearch;
        if (status !== 'all') params.status = status;
        if (zone !== 'all') params.zone = zone;
        if (from) params.from = from;
        if (to) params.to = to;

        const { data } = await api.get('/deliveries', { params });
        if (!active) return;
        setRows(data.data);
        setMeta(data.meta);
      } catch (requestError) {
        if (active) setError(getApiError(requestError));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [debouncedSearch, status, zone, from, to, page, refreshKey]);

  useEffect(() => {
    let active = true;

    (async () => {
      setSummaryLoading(true);
      try {
        const params = {};
        if (from) params.from = from;
        if (to) params.to = to;
        if (zone !== 'all') params.zone = zone;
        const { data } = await api.get('/deliveries/summary', { params });
        if (active) setSummary(data.data);
      } catch {
        if (active) setSummary(null);
      } finally {
        if (active) setSummaryLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [from, to, zone, refreshKey]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const [zoneResponse, customerResponse, saleResponse] = await Promise.all([
          api.get('/deliveries/zones'),
          api.get('/customers', { params: { limit: 100, status: 'active' } }),
          api.get('/sales', { params: { limit: 100 } }),
        ]);
        if (!active) return;
        setZones(zoneResponse.data.data);
        setCustomers(customerResponse.data.data);
        setSales(saleResponse.data.data);
      } catch {
        if (active) {
          setZones([]);
          setCustomers([]);
          setSales([]);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const customerById = useMemo(
    () => new Map(customers.map((customer) => [customer.customer_id, customer])),
    [customers]
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormErrors({});
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (delivery) => {
    setEditing(delivery);
    setForm({
      sale_id: delivery.sale_id ? String(delivery.sale_id) : '',
      customer_id: String(delivery.customer_id ?? ''),
      delivery_date: toLocalInput(delivery.delivery_date),
      delivery_zone: delivery.delivery_zone || '',
      distance_km: String(delivery.distance_km ?? '0'),
      delivery_fee: String(delivery.delivery_fee ?? '0'),
      fuel_cost: String(delivery.fuel_cost ?? '0'),
      delivery_status: delivery.delivery_status || 'Pending',
      estimated_delivery_minutes:
        delivery.estimated_delivery_minutes === null ? '' : String(delivery.estimated_delivery_minutes),
      actual_delivery_minutes:
        delivery.actual_delivery_minutes === null ? '' : String(delivery.actual_delivery_minutes),
      remarks: delivery.remarks || '',
    });
    setFormErrors({});
    setFormError('');
    setFormOpen(true);
  };

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFormErrors((current) => ({ ...current, [key]: undefined }));
  };

  const selectSale = (saleId) => {
    const sale = sales.find((item) => String(item.sale_id) === String(saleId));
    setForm((current) => ({
      ...current,
      sale_id: saleId,
      customer_id: sale ? String(sale.customer_id) : current.customer_id,
    }));
    setFormErrors((current) => ({ ...current, sale_id: undefined, customer_id: undefined }));
  };

  const submitForm = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    setFormErrors({});

    if (!editing && !form.sale_id && !form.customer_id) {
      setFormError('Select a customer or link the delivery to a sale.');
      setSaving(false);
      return;
    }

    const payload = {
      delivery_date: form.delivery_date
        ? new Date(form.delivery_date).toISOString()
        : null,
      delivery_zone: form.delivery_zone || null,
      distance_km: Number(form.distance_km || 0),
      delivery_fee: Number(form.delivery_fee || 0),
      fuel_cost: Number(form.fuel_cost || 0),
      delivery_status: form.delivery_status,
      estimated_delivery_minutes:
        form.estimated_delivery_minutes === '' ? null : Number(form.estimated_delivery_minutes),
      actual_delivery_minutes:
        form.actual_delivery_minutes === '' ? null : Number(form.actual_delivery_minutes),
      remarks: form.remarks.trim() || null,
    };

    if (!editing) {
      payload.customer_id = form.customer_id ? Number(form.customer_id) : null;
      payload.sale_id = form.sale_id ? Number(form.sale_id) : null;
    }

    try {
      if (editing) {
        await api.put(`/deliveries/${editing.delivery_id}`, payload);
        toast.success('Delivery updated');
      } else {
        await api.post('/deliveries', payload);
        toast.success('Delivery order created');
      }
      setFormOpen(false);
      reload();
    } catch (requestError) {
      setFormError(getApiError(requestError));
      setFormErrors(getFieldErrors(requestError));
    } finally {
      setSaving(false);
    }
  };

  const summaryCards = [
    {
      label: 'Total deliveries',
      value: formatNumber(summary?.totals?.total_deliveries || 0),
      icon: Truck,
      tone: 'bg-brand-50 text-brand-700',
    },
    {
      label: 'Delivered',
      value: `${formatNumber(summary?.totals?.delivered || 0)} · ${formatPercent(
        summary?.totals?.completion_rate || 0
      )}`,
      icon: Wallet,
      tone: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Open orders',
      value: formatNumber(
        (summary?.totals?.pending || 0) + (summary?.totals?.in_transit || 0)
      ),
      icon: Clock,
      tone: 'bg-amber-50 text-amber-700',
    },
    {
      label: 'Avg. actual time',
      value: `${formatNumber(summary?.totals?.avg_actual_minutes || 0, { decimals: true })} min`,
      icon: Timer,
      tone: 'bg-aqua-50 text-aqua-700',
    },
  ];

  const columns = [
    {
      key: 'delivery',
      header: 'Delivery',
      cell: (row) => (
        <div>
          <p className="font-bold text-navy-900">#{row.delivery_id}</p>
          <p className="text-[10px] text-navy-700/50">{formatDateTime(row.delivery_date)}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      cell: (row) => (
        <div className="max-w-[200px]">
          <p className="truncate font-semibold text-navy-900">{row.customer_name}</p>
          <p className="truncate text-[10px] text-navy-700/50">
            {row.contact_number || row.customer_type}
          </p>
        </div>
      ),
    },
    {
      key: 'sale',
      header: 'Sale',
      cell: (row) =>
        row.transaction_code ? (
          <div>
            <p className="font-mono text-[10px] font-bold text-brand-700">{row.transaction_code}</p>
            <p className="text-[10px] text-navy-700/50">
              {formatNumber(row.gallons_ordered)} gal
            </p>
          </div>
        ) : (
          <span className="text-[10px] text-navy-700/40">Ad-hoc</span>
        ),
    },
    {
      key: 'zone',
      header: 'Zone',
      cell: (row) => (
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-[11px]">
          <MapPin className="size-3 text-slate-400" />
          {row.delivery_zone || '—'}
        </span>
      ),
    },
    {
      key: 'distance',
      header: 'Distance',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <div>
          <p className="font-semibold text-navy-900">
            {formatNumber(row.distance_km, { decimals: true })} km
          </p>
          <p className="text-[10px] text-navy-700/50">{formatCurrency(row.delivery_fee)} fee</p>
        </div>
      ),
    },
    {
      key: 'time',
      header: 'Est / actual',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <div>
          <p className="text-[11px] text-navy-800">
            {row.estimated_delivery_minutes === null
              ? '—'
              : `${formatNumber(row.estimated_delivery_minutes)} min est`}
          </p>
          <p className="text-[10px] text-navy-700/50">
            {row.actual_delivery_minutes === null
              ? 'No actual time'
              : `${formatNumber(row.actual_delivery_minutes)} min actual`}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <Badge tone={statusTone(row.delivery_status)} dot>
          {row.delivery_status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <button
          type="button"
          onClick={() => openEdit(row)}
          className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy-800"
          aria-label={`Edit delivery ${row.delivery_id}`}
        >
          <Pencil className="size-4" />
        </button>
      ),
    },
  ];

  const selectedCustomer = form.customer_id ? customerById.get(Number(form.customer_id)) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="Deliveries"
        description="Dispatch delivery orders, track status and compare estimated with actual completion time."
        actions={
          <Button
            icon={Plus}
            size="sm"
            onClick={openCreate}
            disabled={!customers.length && !sales.length}
          >
            New delivery
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-white bg-white p-4 shadow-card">
            <span className={`grid size-10 place-items-center rounded-xl ${tone}`}>
              <Icon className="size-4.5" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-navy-700/55">{label}</p>
              {summaryLoading ? (
                <Skeleton className="mt-1 h-5 w-20" />
              ) : (
                <p className="text-lg font-extrabold leading-tight text-navy-900">{value}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Delivery register"
          subtitle={meta ? `${formatNumber(meta.total)} matching delivery orders` : 'Loading deliveries'}
          icon={Truck}
        />

        <div className="flex flex-col gap-3 px-5 pb-4 pt-4 xl:flex-row xl:items-center xl:justify-between">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search customer or sale code…"
            className="w-full xl:max-w-xs"
          />
          <FilterBar>
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-10 w-auto text-xs"
              aria-label="Delivery status"
            >
              <option value="all">All statuses</option>
              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
            <Select
              value={zone}
              onChange={(event) => setZone(event.target.value)}
              className="h-10 w-auto text-xs"
              aria-label="Delivery zone"
            >
              <option value="all">All zones</option>
              {zones.map((item) => (
                <option key={item.zone_id} value={item.zone_name}>
                  {item.zone_name}
                </option>
              ))}
            </Select>
            <Input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="h-10 w-auto text-xs"
              aria-label="From date"
            />
            <Input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="h-10 w-auto text-xs"
              aria-label="To date"
            />
            {status !== 'all' || zone !== 'all' || from || to ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatus('all');
                  setZone('all');
                  setFrom('');
                  setTo('');
                }}
              >
                Clear
              </Button>
            ) : null}
          </FilterBar>
        </div>

        {error ? (
          <div className="px-5 pb-5">
            <ErrorState title="Could not load deliveries" message={error} onRetry={reload} />
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.delivery_id}
            loading={loading}
            empty={{
              icon: Truck,
              title: 'No deliveries found',
              description: 'Adjust the filters or create a new delivery order.',
              action: (
                <Button size="sm" icon={Plus} onClick={openCreate}>
                  New delivery
                </Button>
              ),
            }}
            footer={
              <Pagination
                meta={meta}
                onPageChange={setPage}
                loading={loading}
                itemLabel="deliveries"
              />
            }
          />
        )}
      </Card>

      {summary?.by_zone?.length ? (
        <Card>
          <CardHeader title="Zone performance" subtitle="Delivery volume and fuel cost by zone" icon={Route} />
          <div className="overflow-x-auto px-5 pb-5 pt-4">
            <table className="w-full min-w-[560px] text-left text-[11px]">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50/60 text-[9px] uppercase tracking-wider text-navy-700/50">
                  <th className="px-3 py-2 font-bold">Zone</th>
                  <th className="px-3 py-2 text-right font-bold">Deliveries</th>
                  <th className="px-3 py-2 text-right font-bold">Delivered</th>
                  <th className="px-3 py-2 text-right font-bold">Avg distance</th>
                  <th className="px-3 py-2 text-right font-bold">Fees</th>
                  <th className="px-3 py-2 text-right font-bold">Fuel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.by_zone.map((item) => (
                  <tr key={item.delivery_zone || 'unassigned'}>
                    <td className="px-3 py-2 font-semibold text-navy-900">
                      {item.delivery_zone || 'Unassigned'}
                    </td>
                    <td className="px-3 py-2 text-right">{formatNumber(item.deliveries)}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(item.delivered)}</td>
                    <td className="px-3 py-2 text-right">
                      {formatNumber(item.avg_distance_km, { decimals: true })} km
                    </td>
                    <td className="px-3 py-2 text-right">{formatCurrency(item.total_delivery_fees)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(item.total_fuel_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {/* Create / edit */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit delivery #${editing.delivery_id}` : 'New delivery order'}
        description={
          editing
            ? 'Update the schedule, distance, fees or status. The linked sale cannot be changed.'
            : 'Link a sale for automatic customer details, or create an ad-hoc delivery for a customer.'
        }
        icon={Truck}
        size="lg"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" loading={saving} onClick={submitForm}>
              {editing ? 'Save changes' : 'Create delivery'}
            </Button>
          </>
        }
      >
        <form onSubmit={submitForm} className="space-y-4" noValidate>
          {formError ? (
            <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
              {formError}
            </div>
          ) : null}

          {!editing ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Linked sale (optional)" htmlFor="delivery_sale" error={formErrors.sale_id}>
                <Select
                  id="delivery_sale"
                  value={form.sale_id}
                  onChange={(event) => selectSale(event.target.value)}
                  invalid={Boolean(formErrors.sale_id)}
                >
                  <option value="">No linked sale</option>
                  {sales.map((sale) => (
                    <option key={sale.sale_id} value={sale.sale_id}>
                      {sale.transaction_code} · {sale.customer_name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Customer"
                htmlFor="delivery_customer"
                required={!form.sale_id}
                error={formErrors.customer_id}
              >
                <Select
                  id="delivery_customer"
                  value={form.customer_id}
                  onChange={(event) => updateForm('customer_id', event.target.value)}
                  disabled={Boolean(form.sale_id)}
                  invalid={Boolean(formErrors.customer_id)}
                >
                  <option value="">Select a customer…</option>
                  {customers.map((customer) => (
                    <option key={customer.customer_id} value={customer.customer_id}>
                      {customer.customer_name} · {customer.delivery_zone || 'No zone'}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3 text-[11px] leading-relaxed text-navy-700/75">
              <p className="font-bold text-navy-900">{editing.customer_name}</p>
              <p className="mt-0.5">
                {editing.contact_number || 'No contact number'} ·{' '}
                {editing.delivery_address || 'No delivery address'}
              </p>
              {editing.transaction_code ? (
                <p className="mt-1 font-mono text-[10px] text-brand-700">
                  Linked sale {editing.transaction_code}
                </p>
              ) : null}
            </div>
          )}

          {!editing && selectedCustomer ? (
            <p className="rounded-xl bg-brand-50/70 px-3.5 py-2.5 text-[11px] text-navy-700/75">
              Default zone for {selectedCustomer.customer_name}:{' '}
              <span className="font-semibold text-navy-900">
                {selectedCustomer.delivery_zone || 'not assigned'}
              </span>
              {selectedCustomer.delivery_address ? ` · ${selectedCustomer.delivery_address}` : ''}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Delivery date and time" htmlFor="delivery_date" error={formErrors.delivery_date}>
              <Input
                id="delivery_date"
                type="datetime-local"
                value={form.delivery_date}
                onChange={(event) => updateForm('delivery_date', event.target.value)}
                invalid={Boolean(formErrors.delivery_date)}
              />
            </Field>

            <Field label="Delivery zone" htmlFor="delivery_zone" hint="Blank uses the customer's zone" error={formErrors.delivery_zone}>
              <Select
                id="delivery_zone"
                value={form.delivery_zone}
                onChange={(event) => updateForm('delivery_zone', event.target.value)}
                invalid={Boolean(formErrors.delivery_zone)}
              >
                <option value="">Use customer&apos;s zone</option>
                {zones.map((item) => (
                  <option key={item.zone_id} value={item.zone_name}>
                    {item.zone_name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Distance (km)" htmlFor="distance_km" error={formErrors.distance_km}>
              <Input
                id="distance_km"
                type="number"
                step="0.01"
                min="0"
                value={form.distance_km}
                onChange={(event) => updateForm('distance_km', event.target.value)}
                invalid={Boolean(formErrors.distance_km)}
              />
            </Field>

            <Field label="Delivery fee (₱)" htmlFor="delivery_fee" error={formErrors.delivery_fee}>
              <Input
                id="delivery_fee"
                type="number"
                step="0.01"
                min="0"
                value={form.delivery_fee}
                onChange={(event) => updateForm('delivery_fee', event.target.value)}
                invalid={Boolean(formErrors.delivery_fee)}
              />
            </Field>

            <Field label="Fuel cost (₱)" htmlFor="fuel_cost" error={formErrors.fuel_cost}>
              <Input
                id="fuel_cost"
                type="number"
                step="0.01"
                min="0"
                value={form.fuel_cost}
                onChange={(event) => updateForm('fuel_cost', event.target.value)}
                invalid={Boolean(formErrors.fuel_cost)}
              />
            </Field>

            <Field label="Status" htmlFor="delivery_status" error={formErrors.delivery_status}>
              <Select
                id="delivery_status"
                value={form.delivery_status}
                onChange={(event) => updateForm('delivery_status', event.target.value)}
                invalid={Boolean(formErrors.delivery_status)}
              >
                {STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Estimated minutes" htmlFor="estimated_minutes" error={formErrors.estimated_delivery_minutes}>
              <Input
                id="estimated_minutes"
                type="number"
                min="0"
                step="1"
                value={form.estimated_delivery_minutes}
                onChange={(event) =>
                  updateForm('estimated_delivery_minutes', event.target.value)
                }
                placeholder="e.g. 45"
                invalid={Boolean(formErrors.estimated_delivery_minutes)}
              />
            </Field>

            <Field label="Actual minutes" htmlFor="actual_minutes" hint="Only used when delivered" error={formErrors.actual_delivery_minutes}>
              <Input
                id="actual_minutes"
                type="number"
                min="0"
                step="1"
                value={form.actual_delivery_minutes}
                onChange={(event) => updateForm('actual_delivery_minutes', event.target.value)}
                placeholder="e.g. 52"
                invalid={Boolean(formErrors.actual_delivery_minutes)}
              />
            </Field>
          </div>

          <Field label="Remarks" htmlFor="delivery_remarks" error={formErrors.remarks}>
            <Textarea
              id="delivery_remarks"
              rows={2}
              value={form.remarks}
              onChange={(event) => updateForm('remarks', event.target.value)}
              placeholder="Driver notes, gate instructions, etc."
              invalid={Boolean(formErrors.remarks)}
            />
          </Field>

          {form.delivery_status === 'Delivered' ? (
            <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-[11px] text-emerald-800">
              Marking an order delivered stamps the completion time and keeps the actual minutes.
            </p>
          ) : form.delivery_status === 'Cancelled' ? (
            <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-[11px] text-red-700">
              Cancelling clears the completion timestamp so the order is excluded from response-time
              averages.
            </p>
          ) : null}
        </form>
      </Modal>
    </div>
  );
}
