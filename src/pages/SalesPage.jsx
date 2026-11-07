import { useEffect, useMemo, useState } from 'react';
import {
  CreditCard,
  Droplets,
  Eye,
  Plus,
  Receipt,
  ShoppingCart,
  Trash2,
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
} from '../components/ui';
import useDebouncedValue from '../hooks/useDebouncedValue';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
} from '../utils/format';
import { getApiError, getFieldErrors } from '../utils/apiError';

const PAYMENTS = ['Cash', 'GCash', 'Bank Transfer'];

const paymentTone = (method) =>
  method === 'Cash' ? 'emerald' : method === 'GCash' ? 'brand' : 'violet';

const deliveryTone = (status) => {
  if (status === 'Delivered') return 'emerald';
  if (status === 'In Transit') return 'amber';
  if (status === 'Cancelled') return 'red';
  return 'slate';
};

const emptyLine = () => ({ product_id: '', quantity: '1' });

export default function SalesPage() {
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ customer_id: '', payment_method: 'Cash', items: [emptyLine()] });
  const [formErrors, setFormErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [paymentDraft, setPaymentDraft] = useState('Cash');
  const [updatingPayment, setUpdatingPayment] = useState(false);

  const debouncedSearch = useDebouncedValue(search);

  const reload = () => setRefreshKey((key) => key + 1);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, from, to, paymentMethod]);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const params = { page, limit: 20 };
        if (debouncedSearch) params.search = debouncedSearch;
        if (from) params.from = from;
        if (to) params.to = to;
        if (paymentMethod) params.payment_method = paymentMethod;

        const { data } = await api.get('/sales', { params });
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
  }, [debouncedSearch, from, to, paymentMethod, page, refreshKey]);

  useEffect(() => {
    let active = true;

    (async () => {
      setSummaryLoading(true);
      try {
        const params = {};
        if (from) params.from = from;
        if (to) params.to = to;
        if (paymentMethod) params.payment_method = paymentMethod;
        const { data } = await api.get('/sales/summary', { params });
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
  }, [from, to, paymentMethod, refreshKey]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const [customerResponse, productResponse, inventoryResponse] = await Promise.all([
          api.get('/customers', { params: { limit: 100, status: 'active' } }),
          api.get('/products', { params: { limit: 100, status: 'Active' } }),
          api.get('/inventory'),
        ]);
        if (!active) return;
        setCustomers(customerResponse.data.data);
        setProducts(productResponse.data.data);
        setInventory(inventoryResponse.data.data);
      } catch {
        if (active) {
          setCustomers([]);
          setProducts([]);
          setInventory([]);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    if (!detailId) return undefined;
    let active = true;

    (async () => {
      setDetailLoading(true);
      setDetailError('');
      try {
        const { data } = await api.get(`/sales/${detailId}`);
        if (!active) return;
        setDetail(data.data);
        setPaymentDraft(data.data.payment_method);
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

  const stockByProduct = useMemo(
    () => new Map(inventory.map((item) => [item.product_id, Number(item.filled_gallons)])),
    [inventory]
  );

  const productById = useMemo(
    () => new Map(products.map((product) => [product.product_id, product])),
    [products]
  );

  const formTotal = form.items.reduce((sum, item) => {
    const product = productById.get(Number(item.product_id));
    if (!product) return sum;
    return sum + Number(product.selling_price) * Number(item.quantity || 0);
  }, 0);

  const formUnits = form.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  const openCreate = () => {
    setForm({ customer_id: '', payment_method: 'Cash', items: [emptyLine()] });
    setFormErrors({});
    setFormError('');
    setCreateOpen(true);
  };

  const updateLine = (index, key, value) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [key]: value } : line
      ),
    }));
    setFormError('');
  };

  const addLine = () => {
    setForm((current) => ({ ...current, items: [...current.items, emptyLine()] }));
  };

  const removeLine = (index) => {
    setForm((current) => ({
      ...current,
      items:
        current.items.length === 1
          ? current.items
          : current.items.filter((_, lineIndex) => lineIndex !== index),
    }));
  };

  const submitSale = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    setFormErrors({});

    if (!form.customer_id) {
      setFormError('Select a customer for this sale.');
      setSaving(false);
      return;
    }

    const items = form.items
      .filter((item) => item.product_id)
      .map((item) => ({
        product_id: Number(item.product_id),
        quantity: Number(item.quantity),
      }));

    if (!items.length) {
      setFormError('Add at least one product line.');
      setSaving(false);
      return;
    }

    if (items.some((item) => !item.quantity || item.quantity < 1)) {
      setFormError('Every line needs a quantity of at least 1.');
      setSaving(false);
      return;
    }

    try {
      const { data } = await api.post('/sales', {
        customer_id: Number(form.customer_id),
        payment_method: form.payment_method,
        items,
      });
      toast.success(`Sale ${data.data.transaction_code} recorded`);
      setCreateOpen(false);
      setPage(1);
      reload();
    } catch (requestError) {
      setFormError(getApiError(requestError));
      setFormErrors(getFieldErrors(requestError));
    } finally {
      setSaving(false);
    }
  };

  const savePayment = async () => {
    if (!detail) return;
    setUpdatingPayment(true);
    try {
      const { data } = await api.put(`/sales/${detail.sale_id}`, {
        payment_method: paymentDraft,
      });
      setDetail(data.data);
      toast.success('Payment method updated');
      reload();
    } catch (requestError) {
      toast.error(getApiError(requestError));
    } finally {
      setUpdatingPayment(false);
    }
  };

  const columns = [
    {
      key: 'code',
      header: 'Transaction',
      cell: (row) => (
        <div>
          <p className="font-mono text-[10px] font-bold text-brand-700">{row.transaction_code}</p>
          <p className="mt-0.5 text-[10px] text-navy-700/50">{formatDateTime(row.transaction_date)}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      cell: (row) => (
        <div className="max-w-[180px]">
          <p className="truncate font-bold text-navy-900">{row.customer_name}</p>
          <p className="text-[10px] text-navy-700/50">
            {row.customer_type} · {row.delivery_zone || 'No zone'}
          </p>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <div>
          <p className="font-semibold text-navy-900">{formatNumber(row.unit_count)} units</p>
          <p className="text-[10px] text-navy-700/50">{formatNumber(row.gallons)} gal</p>
        </div>
      ),
    },
    {
      key: 'payment',
      header: 'Payment',
      cell: (row) => <Badge tone={paymentTone(row.payment_method)}>{row.payment_method}</Badge>,
    },
    {
      key: 'delivery',
      header: 'Delivery',
      cell: (row) =>
        row.delivery_status ? (
          <Badge tone={deliveryTone(row.delivery_status)} dot>
            {row.delivery_status}
          </Badge>
        ) : (
          <span className="text-[10px] text-navy-700/40">Walk-in</span>
        ),
    },
    {
      key: 'total',
      header: 'Total',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <span className="font-bold text-navy-900">{formatCurrency(row.total_amount)}</span>
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
          onClick={() => setDetailId(row.sale_id)}
          className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-brand-50 hover:text-brand-700"
          aria-label={`View sale ${row.transaction_code}`}
        >
          <Eye className="size-4" />
        </button>
      ),
    },
  ];

  const summaryCards = [
    {
      label: 'Revenue',
      value: formatCurrency(summary?.totals?.total_revenue || 0),
      icon: Wallet,
      tone: 'bg-brand-50 text-brand-700',
    },
    {
      label: 'Transactions',
      value: formatNumber(summary?.totals?.total_transactions || 0),
      icon: Receipt,
      tone: 'bg-aqua-50 text-aqua-700',
    },
    {
      label: 'Gallons',
      value: formatNumber(summary?.totals?.total_gallons || 0),
      icon: Droplets,
      tone: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Average sale',
      value: formatCurrency(summary?.totals?.average_sale || 0),
      icon: CreditCard,
      tone: 'bg-violet-50 text-violet-700',
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="Sales"
        description="Record transactions and review revenue, payment mix and delivery status."
        actions={
          <Button icon={Plus} size="sm" onClick={openCreate} disabled={!customers.length || !products.length}>
            New sale
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
          title="Sales ledger"
          subtitle={meta ? `${formatNumber(meta.total)} matching transactions` : 'Loading transactions'}
          icon={ShoppingCart}
        />

        <div className="flex flex-col gap-3 px-5 pb-4 pt-4 xl:flex-row xl:items-center xl:justify-between">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search code or customer…"
            className="w-full xl:max-w-xs"
          />
          <FilterBar>
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
            <Select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              className="h-10 w-auto text-xs"
              aria-label="Payment method"
            >
              <option value="">All payments</option>
              {PAYMENTS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </Select>
            {from || to || paymentMethod ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFrom('');
                  setTo('');
                  setPaymentMethod('');
                }}
              >
                Clear
              </Button>
            ) : null}
          </FilterBar>
        </div>

        {error ? (
          <div className="px-5 pb-5">
            <ErrorState title="Could not load sales" message={error} onRetry={reload} />
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.sale_id}
            loading={loading}
            empty={{
              icon: ShoppingCart,
              title: 'No sales found',
              description: 'Adjust the date range or record a new transaction.',
              action: (
                <Button size="sm" icon={Plus} onClick={openCreate} disabled={!customers.length || !products.length}>
                  New sale
                </Button>
              ),
            }}
            footer={<Pagination meta={meta} onPageChange={setPage} loading={loading} itemLabel="transactions" />}
          />
        )}
      </Card>

      {/* New sale */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Record a new sale"
        description="Prices come from the product catalogue and stock is deducted inside one transaction."
        icon={ShoppingCart}
        size="xl"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" loading={saving} onClick={submitSale}>
              Record sale · {formatCurrency(formTotal)}
            </Button>
          </>
        }
      >
        <form onSubmit={submitSale} className="space-y-4" noValidate>
          {formError ? (
            <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
              {formError}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer" htmlFor="sale_customer" required error={formErrors.customer_id}>
              <Select
                id="sale_customer"
                value={form.customer_id}
                onChange={(event) => setForm((current) => ({ ...current, customer_id: event.target.value }))}
                invalid={Boolean(formErrors.customer_id)}
              >
                <option value="">Select a customer…</option>
                {customers.map((customer) => (
                  <option key={customer.customer_id} value={customer.customer_id}>
                    {customer.customer_name} · {customer.customer_type}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Payment method" htmlFor="sale_payment" required error={formErrors.payment_method}>
              <Select
                id="sale_payment"
                value={form.payment_method}
                onChange={(event) => setForm((current) => ({ ...current, payment_method: event.target.value }))}
                invalid={Boolean(formErrors.payment_method)}
              >
                {PAYMENTS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="rounded-xl border border-slate-100">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3.5 py-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-navy-700/60">
                Line items
              </p>
              <Button variant="secondary" size="sm" icon={Plus} onClick={addLine}>
                Add line
              </Button>
            </div>

            <div className="space-y-2 p-3">
              {form.items.map((line, index) => {
                const product = productById.get(Number(line.product_id));
                const available = product ? stockByProduct.get(product.product_id) : null;
                const quantityValue = Number(line.quantity || 0);
                const overStock = product && quantityValue > Number(available || 0);
                const lineTotal = product ? Number(product.selling_price) * quantityValue : 0;

                return (
                  <div
                    key={index}
                    className="grid gap-2 rounded-lg bg-slate-50/70 p-2.5 sm:grid-cols-[1fr_6rem_7rem_2rem] sm:items-start"
                  >
                    <div>
                      <Select
                        value={line.product_id}
                        onChange={(event) => updateLine(index, 'product_id', event.target.value)}
                        className="h-9 bg-white text-xs"
                        aria-label={`Product for line ${index + 1}`}
                      >
                        <option value="">Choose a product…</option>
                        {products.map((item) => (
                          <option key={item.product_id} value={item.product_id}>
                            {item.product_name} · {formatCurrency(item.selling_price)}
                          </option>
                        ))}
                      </Select>
                      {product ? (
                        <p className={`mt-1 text-[10px] ${overStock ? 'font-semibold text-red-600' : 'text-navy-700/50'}`}>
                          {overStock ? 'Only ' : 'Available: '}
                          {formatNumber(available || 0)} in stock
                        </p>
                      ) : null}
                    </div>

                    <Input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(event) => updateLine(index, 'quantity', event.target.value)}
                      className="h-9 bg-white text-xs"
                      aria-label={`Quantity for line ${index + 1}`}
                    />

                    <div className="flex h-9 items-center justify-end rounded-lg bg-white px-2.5 text-xs font-bold text-navy-900">
                      {formatCurrency(lineTotal)}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      disabled={form.items.length === 1}
                      className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Remove line ${index + 1}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3.5 py-2.5">
              <p className="text-[11px] text-navy-700/55">
                {formatNumber(formUnits)} containers selected
              </p>
              <p className="text-sm font-extrabold text-navy-900">
                Total <span className="text-brand-700">{formatCurrency(formTotal)}</span>
              </p>
            </div>
          </div>

          <p className="text-[10px] leading-relaxed text-navy-700/50">
            Unit prices are taken from the server. If stock is insufficient the entire sale is
            rolled back — no partial deduction is kept.
          </p>
        </form>
      </Modal>

      {/* Sale detail */}
      <Modal
        open={Boolean(detailId)}
        onClose={() => {
          setDetailId(null);
          setDetail(null);
        }}
        title={detail?.transaction_code || 'Sale details'}
        description={detail ? `${detail.customer_name} · ${formatDateTime(detail.transaction_date)}` : 'Loading transaction…'}
        icon={Receipt}
        size="lg"
        footer={
          detail ? (
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
          ) : null
        }
      >
        {detailLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : detailError ? (
          <ErrorState title="Could not load sale" message={detailError} />
        ) : detail ? (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl bg-brand-50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-brand-700/70">Total</p>
                <p className="mt-0.5 text-lg font-extrabold text-navy-900">
                  {formatCurrency(detail.total_amount)}
                </p>
              </div>
              <div className="rounded-xl bg-aqua-50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-aqua-700/70">Gallons</p>
                <p className="mt-0.5 text-lg font-extrabold text-navy-900">
                  {formatNumber(detail.gallons)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-navy-700/60">Payment</p>
                <div className="mt-1">
                  <Badge tone={paymentTone(detail.payment_method)}>{detail.payment_method}</Badge>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="bg-slate-50 text-[9px] uppercase tracking-wider text-navy-700/50">
                    <th className="px-3 py-2 font-bold">Product</th>
                    <th className="px-3 py-2 text-right font-bold">Qty</th>
                    <th className="px-3 py-2 text-right font-bold">Unit price</th>
                    <th className="px-3 py-2 text-right font-bold">Gallons</th>
                    <th className="px-3 py-2 text-right font-bold">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detail.items.map((item) => (
                    <tr key={item.sale_item_id}>
                      <td className="px-3 py-2 font-semibold text-navy-900">{item.product_name}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(item.quantity)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(item.gallons)}</td>
                      <td className="px-3 py-2 text-right font-bold text-navy-900">
                        {formatCurrency(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-navy-700/55">
                  <CreditCard className="size-3.5" /> Update payment method
                </p>
                <div className="mt-2 flex gap-2">
                  <Select
                    value={paymentDraft}
                    onChange={(event) => setPaymentDraft(event.target.value)}
                    className="h-9 text-xs"
                    aria-label="Payment method"
                  >
                    {PAYMENTS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </Select>
                  <Button
                    size="sm"
                    loading={updatingPayment}
                    onClick={savePayment}
                    disabled={paymentDraft === detail.payment_method}
                  >
                    Save
                  </Button>
                </div>
                <p className="mt-1.5 text-[10px] text-navy-700/45">
                  Line items are immutable after posting.
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 p-3">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-navy-700/55">
                  <Truck className="size-3.5" /> Delivery
                </p>
                {detail.delivery ? (
                  <div className="mt-2 space-y-1 text-[11px] text-navy-700/70">
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone={deliveryTone(detail.delivery.delivery_status)}>
                        {detail.delivery.delivery_status}
                      </Badge>
                      <span>{formatDate(detail.delivery.delivery_date)}</span>
                    </div>
                    <p>
                      {detail.delivery.delivery_zone || 'No zone'} ·{' '}
                      {formatNumber(detail.delivery.distance_km, { decimals: true })} km
                    </p>
                    <p>Fee {formatCurrency(detail.delivery.delivery_fee)}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-navy-700/50">
                    No delivery linked to this sale (walk-in).
                  </p>
                )}
              </div>
            </div>

            <p className="text-[10px] text-navy-700/45">
              Recorded by user #{detail.created_by ?? '—'} on {formatDateTime(detail.created_at)}
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
