import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  ClipboardList,
  Droplets,
  PackageCheck,
  Plus,
  RefreshCcw,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
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
  Tabs,
  Textarea,
} from '../components/ui';
import useDebouncedValue from '../hooks/useDebouncedValue';
import { formatDateTime, formatNumber } from '../utils/format';
import { getApiError, getFieldErrors } from '../utils/apiError';

const MOVEMENT_TYPES = [
  { value: 'IN', label: 'Stock in (restock)', tone: 'emerald' },
  { value: 'OUT', label: 'Stock out (issued)', tone: 'amber' },
  { value: 'RETURN', label: 'Empty containers returned', tone: 'aqua' },
  { value: 'DAMAGE', label: 'Damaged containers', tone: 'red' },
];

const TYPE_LABELS = {
  IN: 'Stock in',
  OUT: 'Stock out',
  RETURN: 'Return',
  DAMAGE: 'Damage',
  ADJUSTMENT: 'Adjustment',
};

const TYPE_TONES = {
  IN: 'emerald',
  OUT: 'amber',
  RETURN: 'aqua',
  DAMAGE: 'red',
  ADJUSTMENT: 'slate',
};

function nowLocalInput() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(
    now.getHours()
  )}:${pad(now.getMinutes())}`;
}

const emptyMovement = () => ({
  product_id: '',
  movement_type: 'IN',
  quantity: '1',
  movement_date: nowLocalInput(),
  remarks: '',
});

export default function InventoryPage() {
  const { isAdmin } = useAuth();

  const [tab, setTab] = useState('stock');
  const [refreshKey, setRefreshKey] = useState(0);
  const reload = () => setRefreshKey((key) => key + 1);

  const [inventory, setInventory] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState('');

  const [stockSearch, setStockSearch] = useState('');
  const [waterType, setWaterType] = useState('all');
  const [lowOnly, setLowOnly] = useState(false);

  const [movementProduct, setMovementProduct] = useState('all');
  const [movementType, setMovementType] = useState('all');
  const [movementFrom, setMovementFrom] = useState('');
  const [movementTo, setMovementTo] = useState('');
  const [movementPage, setMovementPage] = useState(1);
  const [movements, setMovements] = useState([]);
  const [movementMeta, setMovementMeta] = useState(null);
  const [movementsLoading, setMovementsLoading] = useState(true);
  const [movementsError, setMovementsError] = useState('');

  const [movementOpen, setMovementOpen] = useState(false);
  const [movementForm, setMovementForm] = useState(emptyMovement);
  const [movementFormErrors, setMovementFormErrors] = useState({});
  const [movementFormError, setMovementFormError] = useState('');
  const [movementSaving, setMovementSaving] = useState(false);

  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState(null);
  const [correctionForm, setCorrectionForm] = useState({
    filled_gallons: '0',
    empty_containers: '0',
    damaged_containers: '0',
    remarks: '',
  });
  const [correctionErrors, setCorrectionErrors] = useState({});
  const [correctionError, setCorrectionError] = useState('');
  const [correctionSaving, setCorrectionSaving] = useState(false);

  const debouncedStockSearch = useDebouncedValue(stockSearch);

  useEffect(() => {
    let active = true;

    (async () => {
      setInventoryLoading(true);
      setInventoryError('');
      try {
        const { data } = await api.get('/inventory');
        if (active) setInventory(data.data);
      } catch (requestError) {
        if (active) setInventoryError(getApiError(requestError));
      } finally {
        if (active) setInventoryLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    setMovementPage(1);
  }, [movementProduct, movementType, movementFrom, movementTo]);

  useEffect(() => {
    let active = true;

    (async () => {
      setMovementsLoading(true);
      setMovementsError('');
      try {
        const params = { page: movementPage, limit: 20 };
        if (movementProduct !== 'all') params.product_id = Number(movementProduct);
        if (movementType !== 'all') params.movement_type = movementType;
        if (movementFrom) params.from = movementFrom;
        if (movementTo) params.to = movementTo;

        const { data } = await api.get('/inventory/movements', { params });
        if (!active) return;
        setMovements(data.data);
        setMovementMeta(data.meta);
      } catch (requestError) {
        if (active) setMovementsError(getApiError(requestError));
      } finally {
        if (active) setMovementsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [movementProduct, movementType, movementFrom, movementTo, movementPage, refreshKey]);

  const stats = useMemo(() => {
    return inventory.reduce(
      (totals, item) => ({
        filled: totals.filled + Number(item.filled_gallons),
        empty: totals.empty + Number(item.empty_containers),
        damaged: totals.damaged + Number(item.damaged_containers),
        low: totals.low + (item.is_low_stock ? 1 : 0),
      }),
      { filled: 0, empty: 0, damaged: 0, low: 0 }
    );
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    const term = debouncedStockSearch.trim().toLowerCase();
    return inventory.filter((item) => {
      if (waterType !== 'all' && item.water_type !== waterType) return false;
      if (lowOnly && !item.is_low_stock) return false;
      if (term && !item.product_name.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [inventory, debouncedStockSearch, waterType, lowOnly]);

  const productOptions = useMemo(() => inventory, [inventory]);

  const openMovement = (productId = '') => {
    setMovementForm({ ...emptyMovement(), product_id: productId ? String(productId) : '' });
    setMovementFormErrors({});
    setMovementFormError('');
    setMovementOpen(true);
  };

  const submitMovement = async (event) => {
    event.preventDefault();
    setMovementSaving(true);
    setMovementFormError('');
    setMovementFormErrors({});

    try {
      await api.post('/inventory/movements', {
        product_id: Number(movementForm.product_id),
        movement_type: movementForm.movement_type,
        quantity: Number(movementForm.quantity),
        movement_date: movementForm.movement_date
          ? new Date(movementForm.movement_date).toISOString()
          : null,
        remarks: movementForm.remarks.trim() || null,
      });
      toast.success('Stock movement recorded');
      setMovementOpen(false);
      reload();
    } catch (requestError) {
      setMovementFormError(getApiError(requestError));
      setMovementFormErrors(getFieldErrors(requestError));
    } finally {
      setMovementSaving(false);
    }
  };

  const openCorrection = (item) => {
    setCorrectionTarget(item);
    setCorrectionForm({
      filled_gallons: String(item.filled_gallons),
      empty_containers: String(item.empty_containers),
      damaged_containers: String(item.damaged_containers),
      remarks: '',
    });
    setCorrectionErrors({});
    setCorrectionError('');
    setCorrectionOpen(true);
  };

  const submitCorrection = async (event) => {
    event.preventDefault();
    if (!correctionTarget) return;
    setCorrectionSaving(true);
    setCorrectionError('');
    setCorrectionErrors({});

    try {
      await api.put(`/inventory/${correctionTarget.inventory_id}`, {
        filled_gallons: Number(correctionForm.filled_gallons),
        empty_containers: Number(correctionForm.empty_containers),
        damaged_containers: Number(correctionForm.damaged_containers),
        remarks: correctionForm.remarks.trim() || null,
      });
      toast.success('Stock corrected and audited');
      setCorrectionOpen(false);
      reload();
    } catch (requestError) {
      setCorrectionError(getApiError(requestError));
      setCorrectionErrors(getFieldErrors(requestError));
    } finally {
      setCorrectionSaving(false);
    }
  };

  const stockColumns = [
    {
      key: 'product',
      header: 'Product',
      cell: (row) => (
        <div>
          <p className="font-bold text-navy-900">{row.product_name}</p>
          <p className="text-[10px] text-navy-700/50">
            {row.water_type} · {row.container_capacity} gal container
          </p>
        </div>
      ),
    },
    {
      key: 'filled',
      header: 'Filled',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <span className="font-bold text-navy-900">{formatNumber(row.filled_gallons)}</span>
      ),
    },
    {
      key: 'empty',
      header: 'Empty',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => <span className="text-navy-700/75">{formatNumber(row.empty_containers)}</span>,
    },
    {
      key: 'damaged',
      header: 'Damaged',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <span className={Number(row.damaged_containers) ? 'font-semibold text-red-600' : 'text-navy-700/75'}>
          {formatNumber(row.damaged_containers)}
        </span>
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
      key: 'status',
      header: 'Stock status',
      cell: (row) =>
        row.is_low_stock ? (
          <Badge tone="amber" dot>
            Low · short {formatNumber(row.shortage)}
          </Badge>
        ) : (
          <Badge tone="emerald" dot>
            Healthy
          </Badge>
        ),
    },
    {
      key: 'updated',
      header: 'Last updated',
      cell: (row) => (
        <span className="whitespace-nowrap text-[10px] text-navy-700/55">
          {formatDateTime(row.last_updated)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => openMovement(row.product_id)}
            className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-brand-50 hover:text-brand-700"
            aria-label={`Record movement for ${row.product_name}`}
          >
            <Plus className="size-4" />
          </button>
          {isAdmin ? (
            <button
              type="button"
              onClick={() => openCorrection(row)}
              className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-700"
              aria-label={`Correct stock for ${row.product_name}`}
            >
              <RefreshCcw className="size-4" />
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  const movementColumns = [
    {
      key: 'date',
      header: 'Date',
      cell: (row) => (
        <span className="whitespace-nowrap text-[11px] text-navy-700/70">
          {formatDateTime(row.movement_date)}
        </span>
      ),
    },
    {
      key: 'product',
      header: 'Product',
      cell: (row) => (
        <div>
          <p className="font-semibold text-navy-900">{row.product_name}</p>
          <p className="text-[10px] text-navy-700/50">{row.water_type}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      cell: (row) => (
        <Badge tone={TYPE_TONES[row.movement_type] || 'slate'}>
          {TYPE_LABELS[row.movement_type] || row.movement_type}
        </Badge>
      ),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <span className="font-bold text-navy-900">{formatNumber(row.quantity)}</span>
      ),
    },
    {
      key: 'reference',
      header: 'Reference',
      cell: (row) => (
        <span className="text-[10px] text-navy-700/60">
          {row.reference_type}
          {row.reference_id ? ` #${row.reference_id}` : ''}
        </span>
      ),
    },
    {
      key: 'by',
      header: 'Recorded by',
      cell: (row) => (
        <span className="text-[11px] text-navy-700/70">{row.created_by_name || 'System'}</span>
      ),
    },
    {
      key: 'remarks',
      header: 'Remarks',
      cell: (row) => (
        <span className="block max-w-[220px] truncate text-[11px] text-navy-700/60">
          {row.remarks || '—'}
        </span>
      ),
    },
  ];

  const correctionDeltas = correctionTarget
    ? {
        filled: Number(correctionForm.filled_gallons || 0) - Number(correctionTarget.filled_gallons),
        empty: Number(correctionForm.empty_containers || 0) - Number(correctionTarget.empty_containers),
        damaged:
          Number(correctionForm.damaged_containers || 0) - Number(correctionTarget.damaged_containers),
      }
    : { filled: 0, empty: 0, damaged: 0 };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="Inventory"
        description="Filled, empty and damaged container counts with a full audit trail of every stock change."
        actions={
          <Button icon={Plus} size="sm" onClick={() => openMovement()}>
            Record movement
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Filled containers', value: stats.filled, icon: Droplets, tone: 'bg-brand-50 text-brand-700' },
          { label: 'Empty containers', value: stats.empty, icon: PackageCheck, tone: 'bg-aqua-50 text-aqua-700' },
          { label: 'Damaged containers', value: stats.damaged, icon: TriangleAlert, tone: 'bg-red-50 text-red-600' },
          { label: 'Low-stock products', value: stats.low, icon: Boxes, tone: 'bg-amber-50 text-amber-700' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-white bg-white p-4 shadow-card">
            <span className={`grid size-10 place-items-center rounded-xl ${tone}`}>
              <Icon className="size-4.5" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-navy-700/55">{label}</p>
              {inventoryLoading ? (
                <Skeleton className="mt-1 h-5 w-16" />
              ) : (
                <p className="text-lg font-extrabold leading-tight text-navy-900">
                  {formatNumber(value)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {!isAdmin ? (
        <div className="rounded-xl border border-brand-100 bg-brand-50/60 px-3.5 py-2.5 text-[11px] leading-relaxed text-navy-700/75">
          <span className="font-bold text-navy-900">Staff access:</span> you can record stock
          movements. Absolute stock corrections are restricted to administrators.
        </div>
      ) : null}

      <Tabs
        tabs={[
          { id: 'stock', label: 'Stock levels', icon: Boxes },
          { id: 'ledger', label: 'Movement ledger', icon: ClipboardList },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'stock' ? (
        <Card>
          <CardHeader
            title="Stock levels"
            subtitle={`${formatNumber(filteredInventory.length)} of ${formatNumber(inventory.length)} products`}
            icon={Boxes}
            action={
              lowOnly ? (
                <Badge tone="amber" dot>
                  Low-stock filter on
                </Badge>
              ) : null
            }
          />

          <div className="flex flex-col gap-3 px-5 pb-4 pt-4 lg:flex-row lg:items-center lg:justify-between">
            <SearchInput
              value={stockSearch}
              onChange={setStockSearch}
              placeholder="Search product…"
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
              <Button
                variant={lowOnly ? 'aqua' : 'secondary'}
                size="sm"
                icon={lowOnly ? ShieldCheck : TriangleAlert}
                onClick={() => setLowOnly((current) => !current)}
              >
                {lowOnly ? 'Showing low stock' : 'Low stock only'}
              </Button>
            </FilterBar>
          </div>

          {inventoryError ? (
            <div className="px-5 pb-5">
              <ErrorState title="Could not load inventory" message={inventoryError} onRetry={reload} />
            </div>
          ) : (
            <DataTable
              columns={stockColumns}
              rows={filteredInventory}
              rowKey={(row) => row.inventory_id}
              loading={inventoryLoading}
              empty={{
                icon: Boxes,
                title: 'No stock records match',
                description: 'Clear the filters or create a product to start tracking stock.',
              }}
            />
          )}
        </Card>
      ) : (
        <Card>
          <CardHeader
            title="Movement ledger"
            subtitle={
              movementMeta
                ? `${formatNumber(movementMeta.total)} recorded movements`
                : 'Loading movements'
            }
            icon={ClipboardList}
          />

          <div className="flex flex-col gap-3 px-5 pb-4 pt-4 xl:flex-row xl:items-center xl:justify-between">
            <FilterBar className="w-full">
              <Select
                value={movementProduct}
                onChange={(event) => setMovementProduct(event.target.value)}
                className="h-10 w-auto max-w-[16rem] text-xs"
                aria-label="Filter by product"
              >
                <option value="all">All products</option>
                {productOptions.map((item) => (
                  <option key={item.product_id} value={item.product_id}>
                    {item.product_name}
                  </option>
                ))}
              </Select>
              <Select
                value={movementType}
                onChange={(event) => setMovementType(event.target.value)}
                className="h-10 w-auto text-xs"
                aria-label="Filter by movement type"
              >
                <option value="all">All movement types</option>
                <option value="IN">Stock in</option>
                <option value="OUT">Stock out</option>
                <option value="RETURN">Return</option>
                <option value="DAMAGE">Damage</option>
                <option value="ADJUSTMENT">Adjustment</option>
              </Select>
              <Input
                type="date"
                value={movementFrom}
                onChange={(event) => setMovementFrom(event.target.value)}
                className="h-10 w-auto text-xs"
                aria-label="From date"
              />
              <Input
                type="date"
                value={movementTo}
                onChange={(event) => setMovementTo(event.target.value)}
                className="h-10 w-auto text-xs"
                aria-label="To date"
              />
              {movementProduct !== 'all' || movementType !== 'all' || movementFrom || movementTo ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMovementProduct('all');
                    setMovementType('all');
                    setMovementFrom('');
                    setMovementTo('');
                  }}
                >
                  Clear
                </Button>
              ) : null}
            </FilterBar>
          </div>

          {movementsError ? (
            <div className="px-5 pb-5">
              <ErrorState title="Could not load movements" message={movementsError} onRetry={reload} />
            </div>
          ) : (
            <DataTable
              columns={movementColumns}
              rows={movements}
              rowKey={(row) => row.movement_id}
              loading={movementsLoading}
              empty={{
                icon: ClipboardList,
                title: 'No movements found',
                description: 'Adjust the filters or record the first stock movement.',
                action: (
                  <Button size="sm" icon={Plus} onClick={() => openMovement()}>
                    Record movement
                  </Button>
                ),
              }}
              footer={
                <Pagination
                  meta={movementMeta}
                  onPageChange={setMovementPage}
                  loading={movementsLoading}
                  itemLabel="movements"
                />
              }
            />
          )}
        </Card>
      )}

      {/* Movement entry */}
      <Modal
        open={movementOpen}
        onClose={() => setMovementOpen(false)}
        title="Record stock movement"
        description="Stock in adds filled containers. Returns increase empties. Damage moves filled containers to damaged."
        icon={RefreshCcw}
        size="lg"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setMovementOpen(false)} disabled={movementSaving}>
              Cancel
            </Button>
            <Button size="sm" loading={movementSaving} onClick={submitMovement}>
              Record movement
            </Button>
          </>
        }
      >
        <form onSubmit={submitMovement} className="space-y-4" noValidate>
          {movementFormError ? (
            <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
              {movementFormError}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Product" htmlFor="movement_product" required error={movementFormErrors.product_id}>
              <Select
                id="movement_product"
                value={movementForm.product_id}
                onChange={(event) =>
                  setMovementForm((current) => ({ ...current, product_id: event.target.value }))
                }
                invalid={Boolean(movementFormErrors.product_id)}
              >
                <option value="">Select a product…</option>
                {productOptions.map((item) => (
                  <option key={item.product_id} value={item.product_id}>
                    {item.product_name} · {formatNumber(item.filled_gallons)} in stock
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Movement type" htmlFor="movement_type" required error={movementFormErrors.movement_type}>
              <Select
                id="movement_type"
                value={movementForm.movement_type}
                onChange={(event) =>
                  setMovementForm((current) => ({ ...current, movement_type: event.target.value }))
                }
                invalid={Boolean(movementFormErrors.movement_type)}
              >
                {MOVEMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Quantity (containers)" htmlFor="movement_quantity" required error={movementFormErrors.quantity}>
              <Input
                id="movement_quantity"
                type="number"
                min="1"
                step="1"
                value={movementForm.quantity}
                onChange={(event) =>
                  setMovementForm((current) => ({ ...current, quantity: event.target.value }))
                }
                invalid={Boolean(movementFormErrors.quantity)}
              />
            </Field>

            <Field label="Movement date" htmlFor="movement_date" error={movementFormErrors.movement_date}>
              <Input
                id="movement_date"
                type="datetime-local"
                value={movementForm.movement_date}
                onChange={(event) =>
                  setMovementForm((current) => ({ ...current, movement_date: event.target.value }))
                }
                invalid={Boolean(movementFormErrors.movement_date)}
              />
            </Field>
          </div>

          <Field label="Remarks" htmlFor="movement_remarks" hint="Optional note for the audit trail" error={movementFormErrors.remarks}>
            <Textarea
              id="movement_remarks"
              rows={2}
              value={movementForm.remarks}
              onChange={(event) =>
                setMovementForm((current) => ({ ...current, remarks: event.target.value }))
              }
              placeholder="e.g. Morning restock from supplier"
              invalid={Boolean(movementFormErrors.remarks)}
            />
          </Field>

          {movementForm.movement_type === 'OUT' || movementForm.movement_type === 'DAMAGE' ? (
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[11px] leading-relaxed text-amber-800">
              <ArrowDownLeft className="mt-0.5 size-3.5 shrink-0" />
              This movement reduces filled stock. The request is rejected if there are not enough
              filled containers.
            </p>
          ) : (
            <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-[11px] leading-relaxed text-emerald-800">
              <ArrowUpRight className="mt-0.5 size-3.5 shrink-0" />
              {movementForm.movement_type === 'RETURN'
                ? 'Returned empties increase the empty-container count without changing filled stock.'
                : 'Stock in increases the filled-container count immediately.'}
            </p>
          )}
        </form>
      </Modal>

      {/* Admin absolute correction */}
      <Modal
        open={correctionOpen}
        onClose={() => setCorrectionOpen(false)}
        title="Correct absolute stock counts"
        description="Admin-only. Use this after a physical count; every difference is written to the audit ledger."
        icon={ShieldCheck}
        size="lg"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setCorrectionOpen(false)} disabled={correctionSaving}>
              Cancel
            </Button>
            <Button size="sm" loading={correctionSaving} onClick={submitCorrection}>
              Save correction
            </Button>
          </>
        }
      >
        <form onSubmit={submitCorrection} className="space-y-4" noValidate>
          {correctionError ? (
            <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
              {correctionError}
            </div>
          ) : null}

          {correctionTarget ? (
            <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-3.5 py-3 text-[11px] leading-relaxed text-amber-900">
              <p className="font-bold">{correctionTarget.product_name}</p>
              <p className="mt-0.5">
                Current: {formatNumber(correctionTarget.filled_gallons)} filled ·{' '}
                {formatNumber(correctionTarget.empty_containers)} empty ·{' '}
                {formatNumber(correctionTarget.damaged_containers)} damaged
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Filled" htmlFor="correction_filled" error={correctionErrors.filled_gallons}>
              <Input
                id="correction_filled"
                type="number"
                min="0"
                step="1"
                value={correctionForm.filled_gallons}
                onChange={(event) =>
                  setCorrectionForm((current) => ({ ...current, filled_gallons: event.target.value }))
                }
                invalid={Boolean(correctionErrors.filled_gallons)}
              />
            </Field>
            <Field label="Empty" htmlFor="correction_empty" error={correctionErrors.empty_containers}>
              <Input
                id="correction_empty"
                type="number"
                min="0"
                step="1"
                value={correctionForm.empty_containers}
                onChange={(event) =>
                  setCorrectionForm((current) => ({ ...current, empty_containers: event.target.value }))
                }
                invalid={Boolean(correctionErrors.empty_containers)}
              />
            </Field>
            <Field label="Damaged" htmlFor="correction_damaged" error={correctionErrors.damaged_containers}>
              <Input
                id="correction_damaged"
                type="number"
                min="0"
                step="1"
                value={correctionForm.damaged_containers}
                onChange={(event) =>
                  setCorrectionForm((current) => ({
                    ...current,
                    damaged_containers: event.target.value,
                  }))
                }
                invalid={Boolean(correctionErrors.damaged_containers)}
              />
            </Field>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px]">
            <Badge tone={correctionDeltas.filled === 0 ? 'slate' : correctionDeltas.filled > 0 ? 'emerald' : 'red'}>
              Filled {correctionDeltas.filled > 0 ? '+' : ''}
              {formatNumber(correctionDeltas.filled)}
            </Badge>
            <Badge tone={correctionDeltas.empty === 0 ? 'slate' : correctionDeltas.empty > 0 ? 'aqua' : 'red'}>
              Empty {correctionDeltas.empty > 0 ? '+' : ''}
              {formatNumber(correctionDeltas.empty)}
            </Badge>
            <Badge
              tone={correctionDeltas.damaged === 0 ? 'slate' : correctionDeltas.damaged > 0 ? 'amber' : 'emerald'}
            >
              Damaged {correctionDeltas.damaged > 0 ? '+' : ''}
              {formatNumber(correctionDeltas.damaged)}
            </Badge>
          </div>

          <Field label="Reason for correction" htmlFor="correction_remarks" hint="Recommended for audit clarity" error={correctionErrors.remarks}>
            <Textarea
              id="correction_remarks"
              rows={2}
              value={correctionForm.remarks}
              onChange={(event) =>
                setCorrectionForm((current) => ({ ...current, remarks: event.target.value }))
              }
              placeholder="e.g. End-of-day physical count"
              invalid={Boolean(correctionErrors.remarks)}
            />
          </Field>

          <p className="text-[10px] leading-relaxed text-navy-700/50">
            Counts are absolute values, not deltas. Increases are logged as stock in / returns;
            decreases are logged as adjustments so the ledger always reconciles.
          </p>
        </form>
      </Modal>
    </div>
  );
}
