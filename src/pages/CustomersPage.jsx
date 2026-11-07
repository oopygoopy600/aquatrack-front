import { useEffect, useState } from 'react';
import {
  Archive,
  Droplets,
  Eye,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Receipt,
  Truck,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorState,
  Field,
  FilterBar,
  Input,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Textarea,
} from '../components/ui';
import useDebouncedValue from '../hooks/useDebouncedValue';
import { formatCurrency, formatDate, formatNumber } from '../utils/format';
import { getApiError, getFieldErrors } from '../utils/apiError';

const EMPTY_FORM = {
  customer_name: '',
  customer_type: 'Residential',
  contact_number: '',
  delivery_address: '',
  delivery_zone: '',
  latitude: '',
  longitude: '',
};

export default function CustomersPage() {
  const { isAdmin } = useAuth();

  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [zone, setZone] = useState('all');
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [zones, setZones] = useState([]);

  const debouncedSearch = useDebouncedValue(search);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving, setArchiving] = useState(false);

  const reload = () => setRefreshKey((key) => key + 1);

  useEffect(() => {
    let active = true;
    api
      .get('/deliveries/zones')
      .then(({ data }) => {
        if (active) setZones(data.data);
      })
      .catch(() => {
        if (active) setZones([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, type, zone, status]);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const params = { page, limit: 20, status };
        if (debouncedSearch) params.search = debouncedSearch;
        if (type !== 'all') params.type = type;
        if (zone !== 'all') params.zone = zone;

        const { data } = await api.get('/customers', { params });
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
  }, [debouncedSearch, type, zone, status, page, refreshKey]);

  useEffect(() => {
    if (!detailId) return undefined;
    let active = true;

    (async () => {
      setDetailLoading(true);
      setDetailError('');
      try {
        const { data } = await api.get(`/customers/${detailId}`);
        if (active) setDetail(data.data);
      } catch (requestError) {
        if (active) setDetailError(getApiError(requestError));
      } finally {
        if (active) setDetailLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [detailId, refreshKey]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (customer) => {
    setEditing(customer);
    setForm({
      customer_name: customer.customer_name || '',
      customer_type: customer.customer_type || 'Residential',
      contact_number: customer.contact_number || '',
      delivery_address: customer.delivery_address || '',
      delivery_zone: customer.delivery_zone || '',
      latitude: customer.latitude ?? '',
      longitude: customer.longitude ?? '',
    });
    setFormErrors({});
    setFormError('');
    setFormOpen(true);
  };

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFormErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submitForm = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    setFormErrors({});

    const payload = {
      customer_name: form.customer_name.trim(),
      customer_type: form.customer_type,
      contact_number: form.contact_number.trim() || null,
      delivery_address: form.delivery_address.trim() || null,
      delivery_zone: form.delivery_zone || null,
      latitude: form.latitude === '' ? null : Number(form.latitude),
      longitude: form.longitude === '' ? null : Number(form.longitude),
    };

    try {
      if (editing) {
        await api.put(`/customers/${editing.customer_id}`, payload);
        toast.success('Customer updated');
      } else {
        await api.post('/customers', payload);
        toast.success('Customer added');
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

  const archiveCustomer = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await api.delete(`/customers/${archiveTarget.customer_id}`);
      toast.success('Customer archived. History was preserved.');
      setArchiveTarget(null);
      reload();
    } catch (requestError) {
      toast.error(getApiError(requestError));
    } finally {
      setArchiving(false);
    }
  };

  const columns = [
    {
      key: 'customer',
      header: 'Customer',
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-bold text-navy-900">{row.customer_name}</p>
          <p className="font-mono text-[10px] text-navy-700/50">{row.customer_code}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      cell: (row) => (
        <Badge tone={row.customer_type === 'Commercial' ? 'aqua' : 'brand'}>
          {row.customer_type}
        </Badge>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      cell: (row) => <span className="whitespace-nowrap">{row.contact_number || '—'}</span>,
    },
    {
      key: 'zone',
      header: 'Zone',
      cell: (row) => (
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          <MapPin className="size-3 text-slate-400" />
          {row.delivery_zone || '—'}
        </span>
      ),
    },
    {
      key: 'orders',
      header: 'Orders',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => <span className="font-semibold">{formatNumber(row.total_orders)}</span>,
    },
    {
      key: 'spent',
      header: 'Total spent',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <span className="font-bold text-navy-900">{formatCurrency(row.total_spent)}</span>
      ),
    },
    {
      key: 'last',
      header: 'Last purchase',
      cell: (row) => (
        <span className="whitespace-nowrap text-[11px] text-navy-700/60">
          {row.last_purchase ? formatDate(row.last_purchase) : 'Never'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <Badge tone={row.is_active ? 'emerald' : 'slate'} dot>
          {row.is_active ? 'Active' : 'Archived'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            onClick={() => setDetailId(row.customer_id)}
            className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-brand-50 hover:text-brand-700"
            aria-label={`View ${row.customer_name}`}
          >
            <Eye className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy-800"
            aria-label={`Edit ${row.customer_name}`}
          >
            <Pencil className="size-4" />
          </button>
          {isAdmin && row.is_active ? (
            <button
              type="button"
              onClick={() => setArchiveTarget(row)}
              className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
              aria-label={`Archive ${row.customer_name}`}
            >
              <Archive className="size-4" />
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Management"
        title="Customers"
        description="Residential and commercial accounts, contact details and purchase history."
        actions={
          <Button icon={Plus} size="sm" onClick={openCreate}>
            Add customer
          </Button>
        }
      />

      <Card>
        <CardHeader
          title="Customer directory"
          subtitle={meta ? `${formatNumber(meta.total)} matching accounts` : 'Loading accounts'}
          icon={Users}
        />

        <div className="flex flex-col gap-3 px-5 pb-4 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search name, code, contact or address…"
            className="w-full lg:max-w-sm"
          />
          <FilterBar>
            <Select value={type} onChange={(event) => setType(event.target.value)} className="h-10 w-auto text-xs">
              <option value="all">All types</option>
              <option value="Residential">Residential</option>
              <option value="Commercial">Commercial</option>
            </Select>
            <Select value={zone} onChange={(event) => setZone(event.target.value)} className="h-10 w-auto text-xs">
              <option value="all">All zones</option>
              {zones.map((item) => (
                <option key={item.zone_name} value={item.zone_name}>
                  {item.zone_name}
                </option>
              ))}
            </Select>
            <Select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 w-auto text-xs">
              <option value="active">Active</option>
              <option value="inactive">Archived</option>
              <option value="all">All statuses</option>
            </Select>
          </FilterBar>
        </div>

        {error ? (
          <div className="px-5 pb-5">
            <ErrorState title="Could not load customers" message={error} onRetry={reload} />
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.customer_id}
            loading={loading}
            empty={{
              icon: Users,
              title: 'No customers found',
              description: 'Adjust the filters or add the first customer account.',
              action: (
                <Button size="sm" icon={Plus} onClick={openCreate}>
                  Add customer
                </Button>
              ),
            }}
            footer={<Pagination meta={meta} onPageChange={setPage} loading={loading} itemLabel="customers" />}
          />
        )}
      </Card>

      {/* Create / edit */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit customer' : 'Add customer'}
        description={
          editing
            ? `Update the record for ${editing.customer_name}.`
            : 'Customer codes are generated automatically on save.'
        }
        icon={Users}
        size="lg"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" loading={saving} onClick={submitForm}>
              {editing ? 'Save changes' : 'Create customer'}
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

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer name" htmlFor="customer_name" required error={formErrors.customer_name}>
              <Input
                id="customer_name"
                value={form.customer_name}
                onChange={(event) => updateForm('customer_name', event.target.value)}
                placeholder="e.g. Maria Santos"
                invalid={Boolean(formErrors.customer_name)}
                autoFocus
              />
            </Field>

            <Field label="Customer type" htmlFor="customer_type" required error={formErrors.customer_type}>
              <Select
                id="customer_type"
                value={form.customer_type}
                onChange={(event) => updateForm('customer_type', event.target.value)}
                invalid={Boolean(formErrors.customer_type)}
              >
                <option value="Residential">Residential</option>
                <option value="Commercial">Commercial</option>
              </Select>
            </Field>

            <Field label="Contact number" htmlFor="contact_number" error={formErrors.contact_number}>
              <Input
                id="contact_number"
                value={form.contact_number}
                onChange={(event) => updateForm('contact_number', event.target.value)}
                placeholder="09xx xxx xxxx"
                invalid={Boolean(formErrors.contact_number)}
              />
            </Field>

            <Field label="Delivery zone" htmlFor="delivery_zone" error={formErrors.delivery_zone}>
              <Select
                id="delivery_zone"
                value={form.delivery_zone}
                onChange={(event) => updateForm('delivery_zone', event.target.value)}
                invalid={Boolean(formErrors.delivery_zone)}
              >
                <option value="">No zone assigned</option>
                {zones.map((item) => (
                  <option key={item.zone_name} value={item.zone_name}>
                    {item.zone_name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Delivery address" htmlFor="delivery_address" error={formErrors.delivery_address}>
            <Textarea
              id="delivery_address"
              rows={2}
              value={form.delivery_address}
              onChange={(event) => updateForm('delivery_address', event.target.value)}
              placeholder="House number, street, barangay, city"
              invalid={Boolean(formErrors.delivery_address)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Latitude" htmlFor="latitude" hint="Optional map coordinate" error={formErrors.latitude}>
              <Input
                id="latitude"
                type="number"
                step="any"
                value={form.latitude}
                onChange={(event) => updateForm('latitude', event.target.value)}
                placeholder="15.03"
                invalid={Boolean(formErrors.latitude)}
              />
            </Field>
            <Field label="Longitude" htmlFor="longitude" hint="Optional map coordinate" error={formErrors.longitude}>
              <Input
                id="longitude"
                type="number"
                step="any"
                value={form.longitude}
                onChange={(event) => updateForm('longitude', event.target.value)}
                placeholder="120.69"
                invalid={Boolean(formErrors.longitude)}
              />
            </Field>
          </div>
        </form>
      </Modal>

      {/* Detail */}
      <Modal
        open={Boolean(detailId)}
        onClose={() => {
          setDetailId(null);
          setDetail(null);
        }}
        title={detail?.customer?.customer_name || 'Customer details'}
        description={detail?.customer?.customer_code ? `Customer code ${detail.customer.customer_code}` : 'Loading profile…'}
        icon={Users}
        size="lg"
        footer={
          detail?.customer ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setDetailId(null);
                  setDetail(null);
                }}
              >
                Close
              </Button>
              <Button size="sm" icon={Pencil} onClick={() => openEdit(detail.customer)}>
                Edit customer
              </Button>
            </>
          ) : null
        }
      >
        {detailLoading ? (
          <div className="space-y-3">
            <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
          </div>
        ) : detailError ? (
          <ErrorState title="Could not load customer" message={detailError} />
        ) : detail ? (
          <div className="space-y-5">
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl bg-brand-50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-brand-700/70">Orders</p>
                <p className="mt-0.5 text-lg font-extrabold text-navy-900">
                  {formatNumber(detail.stats.total_orders)}
                </p>
              </div>
              <div className="rounded-xl bg-aqua-50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-aqua-700/70">Total spent</p>
                <p className="mt-0.5 text-lg font-extrabold text-navy-900">
                  {formatCurrency(detail.stats.total_spent)}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700/70">Gallons</p>
                <p className="mt-0.5 text-lg font-extrabold text-navy-900">
                  {formatNumber(detail.stats.total_gallons)}
                </p>
              </div>
            </div>

            <div className="grid gap-2 rounded-xl border border-slate-100 p-3.5 text-xs sm:grid-cols-2">
              <div className="flex items-center gap-2 text-navy-700/75">
                <Phone className="size-3.5 text-slate-400" />
                {detail.customer.contact_number || 'No contact number'}
              </div>
              <div className="flex items-center gap-2 text-navy-700/75">
                <MapPin className="size-3.5 text-slate-400" />
                {detail.customer.delivery_zone || 'No zone'} · {detail.customer.customer_type}
              </div>
              <div className="sm:col-span-2 text-navy-700/60">
                {detail.customer.delivery_address || 'No delivery address on file.'}
              </div>
              <div className="text-navy-700/60">
                First purchase: {detail.stats.first_purchase ? formatDate(detail.stats.first_purchase) : '—'}
              </div>
              <div className="text-navy-700/60">
                Last purchase: {detail.stats.last_purchase ? formatDate(detail.stats.last_purchase) : '—'}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2">
                <Receipt className="size-4 text-brand-600" />
                <h3 className="text-xs font-bold text-navy-900">Recent purchases</h3>
              </div>
              {detail.recent_purchases.length ? (
                <div className="overflow-hidden rounded-xl border border-slate-100">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="bg-slate-50 text-[9px] uppercase tracking-wider text-navy-700/50">
                        <th className="px-3 py-2 font-bold">Code</th>
                        <th className="px-3 py-2 font-bold">Date</th>
                        <th className="px-3 py-2 font-bold">Gallons</th>
                        <th className="px-3 py-2 font-bold">Payment</th>
                        <th className="px-3 py-2 text-right font-bold">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detail.recent_purchases.map((purchase) => (
                        <tr key={purchase.sale_id}>
                          <td className="px-3 py-2 font-mono text-[9px] font-semibold text-brand-700">
                            {purchase.transaction_code}
                          </td>
                          <td className="px-3 py-2 text-navy-700/70">{formatDate(purchase.transaction_date)}</td>
                          <td className="px-3 py-2 text-navy-700/70">{formatNumber(purchase.gallons)}</td>
                          <td className="px-3 py-2 text-navy-700/70">{purchase.payment_method}</td>
                          <td className="px-3 py-2 text-right font-bold text-navy-900">
                            {formatCurrency(purchase.total_amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-[11px] text-navy-700/55">
                  No purchases recorded yet.
                </p>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2">
                <Truck className="size-4 text-aqua-600" />
                <h3 className="text-xs font-bold text-navy-900">Recent deliveries</h3>
              </div>
              {detail.recent_deliveries.length ? (
                <ul className="space-y-1.5">
                  {detail.recent_deliveries.map((delivery) => (
                    <li
                      key={delivery.delivery_id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px]"
                    >
                      <span className="font-semibold text-navy-800">
                        {formatDate(delivery.delivery_date)}
                      </span>
                      <span className="text-navy-700/60">{delivery.delivery_zone || 'No zone'}</span>
                      <span className="text-navy-700/60">{formatNumber(delivery.distance_km, { decimals: true })} km</span>
                      <Badge
                        tone={
                          delivery.delivery_status === 'Delivered'
                            ? 'emerald'
                            : delivery.delivery_status === 'Cancelled'
                              ? 'red'
                              : delivery.delivery_status === 'In Transit'
                                ? 'amber'
                                : 'slate'
                        }
                      >
                        {delivery.delivery_status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-[11px] text-navy-700/55">
                  No deliveries recorded yet.
                </p>
              )}
            </div>
          </div>
        ) : (
          <EmptyState icon={Droplets} title="No profile data" />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={archiveCustomer}
        loading={archiving}
        title="Archive this customer?"
        description={
          archiveTarget
            ? `${archiveTarget.customer_name} will be marked inactive and removed from new sales and deliveries. Their historical transactions stay intact.`
            : ''
        }
        confirmLabel="Archive customer"
        icon={Archive}
      />
    </div>
  );
}
