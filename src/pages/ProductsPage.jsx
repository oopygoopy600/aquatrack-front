import { useEffect, useState } from 'react';
import { Boxes, Package, Pencil, Plus, Trash2 } from 'lucide-react';
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
  ErrorState,
  Field,
  FilterBar,
  Input,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
} from '../components/ui';
import useDebouncedValue from '../hooks/useDebouncedValue';
import { formatCurrency, formatNumber } from '../utils/format';
import { getApiError, getFieldErrors } from '../utils/apiError';

const EMPTY_FORM = {
  product_name: '',
  water_type: 'Purified',
  container_capacity: '5',
  selling_price: '',
  unit_cost: '',
  reorder_level: '50',
  status: 'Active',
  initial_stock: '0',
  empty_containers: '0',
  damaged_containers: '0',
};

export default function ProductsPage() {
  const { isAdmin } = useAuth();

  const [search, setSearch] = useState('');
  const [waterType, setWaterType] = useState('all');
  const [status, setStatus] = useState('Active');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const debouncedSearch = useDebouncedValue(search);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const reload = () => setRefreshKey((key) => key + 1);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, waterType, status]);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const params = { page, limit: 20, status };
        if (debouncedSearch) params.search = debouncedSearch;
        if (waterType !== 'all') params.water_type = waterType;

        const { data } = await api.get('/products', { params });
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
  }, [debouncedSearch, waterType, status, page, refreshKey]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      product_name: product.product_name || '',
      water_type: product.water_type || 'Purified',
      container_capacity: String(product.container_capacity ?? ''),
      selling_price: String(product.selling_price ?? ''),
      unit_cost: String(product.unit_cost ?? ''),
      reorder_level: String(product.reorder_level ?? ''),
      status: product.status || 'Active',
      initial_stock: '0',
      empty_containers: '0',
      damaged_containers: '0',
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

    const base = {
      product_name: form.product_name.trim(),
      water_type: form.water_type,
      container_capacity: Number(form.container_capacity),
      selling_price: Number(form.selling_price),
      unit_cost: form.unit_cost === '' ? 0 : Number(form.unit_cost),
      reorder_level: form.reorder_level === '' ? 0 : Number(form.reorder_level),
      status: form.status,
    };

    const payload = editing
      ? base
      : {
          ...base,
          initial_stock: Number(form.initial_stock || 0),
          empty_containers: Number(form.empty_containers || 0),
          damaged_containers: Number(form.damaged_containers || 0),
        };

    try {
      if (editing) {
        await api.put(`/products/${editing.product_id}`, payload);
        toast.success('Product updated');
      } else {
        await api.post('/products', payload);
        toast.success('Product created with inventory');
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

  const deleteProduct = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { data } = await api.delete(`/products/${deleteTarget.product_id}`);
      toast.success(
        data.data?.archived
          ? 'Product has sales history, so it was deactivated.'
          : 'Product deleted.'
      );
      setDeleteTarget(null);
      reload();
    } catch (requestError) {
      toast.error(getApiError(requestError));
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'product',
      header: 'Product',
      cell: (row) => (
        <div>
          <p className="font-bold text-navy-900">{row.product_name}</p>
          <p className="text-[10px] text-navy-700/50">
            {row.container_capacity} gal container
          </p>
        </div>
      ),
    },
    {
      key: 'water_type',
      header: 'Water type',
      cell: (row) => <Badge tone="aqua">{row.water_type}</Badge>,
    },
    {
      key: 'price',
      header: 'Price',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <div>
          <p className="font-bold text-navy-900">{formatCurrency(row.selling_price)}</p>
          <p className="text-[10px] text-navy-700/50">cost {formatCurrency(row.unit_cost)}</p>
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <div>
          <p className="font-bold text-navy-900">{formatNumber(row.filled_gallons)}</p>
          <p className="text-[10px] text-navy-700/50">{formatNumber(row.empty_containers)} empty</p>
        </div>
      ),
    },
    {
      key: 'reorder',
      header: 'Reorder at',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => <span className="text-navy-700/70">{formatNumber(row.reorder_level)}</span>,
    },
    {
      key: 'stock_status',
      header: 'Stock status',
      cell: (row) =>
        row.is_low_stock ? (
          <Badge tone="amber" dot>
            Low stock
          </Badge>
        ) : (
          <Badge tone="emerald" dot>
            Healthy
          </Badge>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <Badge tone={row.status === 'Active' ? 'brand' : 'slate'}>{row.status}</Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) =>
        isAdmin ? (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => openEdit(row)}
              className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy-800"
              aria-label={`Edit ${row.product_name}`}
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(row)}
              className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
              aria-label={`Delete ${row.product_name}`}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ) : (
          <span className="text-[10px] text-navy-700/40">View only</span>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Management"
        title="Products"
        description="Water products, container sizes, pricing and reorder thresholds."
        actions={
          isAdmin ? (
            <Button icon={Plus} size="sm" onClick={openCreate}>
              Add product
            </Button>
          ) : (
            <Badge tone="slate">Staff view only</Badge>
          )
        }
      />

      {!isAdmin ? (
        <div className="rounded-xl border border-brand-100 bg-brand-50/60 px-3.5 py-2.5 text-[11px] leading-relaxed text-navy-700/75">
          <span className="font-bold text-navy-900">Staff access:</span> products can be viewed, but
          creating, editing and deleting products is restricted to administrators.
        </div>
      ) : null}

      <Card>
        <CardHeader
          title="Product catalogue"
          subtitle={meta ? `${formatNumber(meta.total)} matching products` : 'Loading products'}
          icon={Package}
        />

        <div className="flex flex-col gap-3 px-5 pb-4 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search product name…"
            className="w-full lg:max-w-sm"
          />
          <FilterBar>
            <Select
              value={waterType}
              onChange={(event) => setWaterType(event.target.value)}
              className="h-10 w-auto text-xs"
            >
              <option value="all">All water types</option>
              <option value="Purified">Purified</option>
              <option value="Mineral">Mineral</option>
              <option value="Alkaline">Alkaline</option>
            </Select>
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-10 w-auto text-xs"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="all">All statuses</option>
            </Select>
          </FilterBar>
        </div>

        {error ? (
          <div className="px-5 pb-5">
            <ErrorState title="Could not load products" message={error} onRetry={reload} />
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.product_id}
            loading={loading}
            empty={{
              icon: Boxes,
              title: 'No products found',
              description: 'Change the filters or create the first product.',
              action: isAdmin ? (
                <Button size="sm" icon={Plus} onClick={openCreate}>
                  Add product
                </Button>
              ) : null,
            }}
            footer={<Pagination meta={meta} onPageChange={setPage} loading={loading} itemLabel="products" />}
          />
        )}
      </Card>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit product' : 'Add product'}
        description={
          editing
            ? 'Stock adjustments are made from the Inventory module so every change is audited.'
            : 'A matching inventory record is created automatically.'
        }
        icon={Package}
        size="lg"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" loading={saving} onClick={submitForm}>
              {editing ? 'Save changes' : 'Create product'}
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

          <Field label="Product name" htmlFor="product_name" required error={formErrors.product_name}>
            <Input
              id="product_name"
              value={form.product_name}
              onChange={(event) => updateForm('product_name', event.target.value)}
              placeholder="e.g. Purified Water - 5 Gallon"
              invalid={Boolean(formErrors.product_name)}
              autoFocus
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Water type" htmlFor="water_type" required error={formErrors.water_type}>
              <Select
                id="water_type"
                value={form.water_type}
                onChange={(event) => updateForm('water_type', event.target.value)}
                invalid={Boolean(formErrors.water_type)}
              >
                <option value="Purified">Purified</option>
                <option value="Mineral">Mineral</option>
                <option value="Alkaline">Alkaline</option>
              </Select>
            </Field>

            <Field
              label="Container capacity (gallons)"
              htmlFor="container_capacity"
              required
              error={formErrors.container_capacity}
            >
              <Input
                id="container_capacity"
                type="number"
                step="any"
                min="0.01"
                value={form.container_capacity}
                onChange={(event) => updateForm('container_capacity', event.target.value)}
                invalid={Boolean(formErrors.container_capacity)}
              />
            </Field>

            <Field label="Selling price (₱)" htmlFor="selling_price" required error={formErrors.selling_price}>
              <Input
                id="selling_price"
                type="number"
                step="0.01"
                min="0"
                value={form.selling_price}
                onChange={(event) => updateForm('selling_price', event.target.value)}
                placeholder="25.00"
                invalid={Boolean(formErrors.selling_price)}
              />
            </Field>

            <Field label="Unit cost (₱)" htmlFor="unit_cost" hint="Used for margin calculations" error={formErrors.unit_cost}>
              <Input
                id="unit_cost"
                type="number"
                step="0.01"
                min="0"
                value={form.unit_cost}
                onChange={(event) => updateForm('unit_cost', event.target.value)}
                placeholder="7.00"
                invalid={Boolean(formErrors.unit_cost)}
              />
            </Field>

            <Field label="Reorder level" htmlFor="reorder_level" hint="Low-stock alerts trigger at or below this" error={formErrors.reorder_level}>
              <Input
                id="reorder_level"
                type="number"
                min="0"
                value={form.reorder_level}
                onChange={(event) => updateForm('reorder_level', event.target.value)}
                invalid={Boolean(formErrors.reorder_level)}
              />
            </Field>

            <Field label="Status" htmlFor="status" error={formErrors.status}>
              <Select
                id="status"
                value={form.status}
                onChange={(event) => updateForm('status', event.target.value)}
                invalid={Boolean(formErrors.status)}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Select>
            </Field>
          </div>

          {!editing ? (
            <div className="grid gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 sm:grid-cols-3">
              <Field label="Initial filled stock" htmlFor="initial_stock" error={formErrors.initial_stock}>
                <Input
                  id="initial_stock"
                  type="number"
                  min="0"
                  value={form.initial_stock}
                  onChange={(event) => updateForm('initial_stock', event.target.value)}
                  invalid={Boolean(formErrors.initial_stock)}
                />
              </Field>
              <Field label="Empty containers" htmlFor="empty_containers" error={formErrors.empty_containers}>
                <Input
                  id="empty_containers"
                  type="number"
                  min="0"
                  value={form.empty_containers}
                  onChange={(event) => updateForm('empty_containers', event.target.value)}
                  invalid={Boolean(formErrors.empty_containers)}
                />
              </Field>
              <Field label="Damaged containers" htmlFor="damaged_containers" error={formErrors.damaged_containers}>
                <Input
                  id="damaged_containers"
                  type="number"
                  min="0"
                  value={form.damaged_containers}
                  onChange={(event) => updateForm('damaged_containers', event.target.value)}
                  invalid={Boolean(formErrors.damaged_containers)}
                />
              </Field>
            </div>
          ) : null}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteProduct}
        loading={deleting}
        title="Delete this product?"
        description={
          deleteTarget
            ? `${deleteTarget.product_name} will be deleted if it has no sales history. Otherwise it is deactivated so past transactions stay intact.`
            : ''
        }
        confirmLabel="Delete product"
        icon={Trash2}
      />
    </div>
  );
}
