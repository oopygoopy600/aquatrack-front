import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CircleDollarSign,
  Pencil,
  Plus,
  Receipt,
  Tags,
  Trash2,
  Wallet,
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
import { formatCurrency, formatDate, formatNumber } from '../utils/format';
import { getApiError, getFieldErrors } from '../utils/apiError';

const CATEGORIES = [
  'Fuel',
  'Electricity',
  'Water Treatment',
  'Maintenance',
  'Supplies',
  'Rent',
  'Salary',
  'Other',
];

const CATEGORY_TONES = {
  Fuel: 'amber',
  Electricity: 'violet',
  'Water Treatment': 'aqua',
  Maintenance: 'brand',
  Supplies: 'emerald',
  Rent: 'slate',
  Salary: 'red',
  Other: 'slate',
};

function todayInput() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const emptyForm = () => ({
  expense_category: 'Fuel',
  description: '',
  amount: '',
  expense_date: todayInput(),
});

export default function ExpensesPage() {
  const { isAdmin } = useAuth();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
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

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const debouncedSearch = useDebouncedValue(search);

  const reload = () => setRefreshKey((key) => key + 1);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category, from, to]);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const params = { page, limit: 20 };
        if (debouncedSearch) params.search = debouncedSearch;
        if (category !== 'all') params.category = category;
        if (from) params.from = from;
        if (to) params.to = to;

        const { data } = await api.get('/expenses', { params });
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
  }, [debouncedSearch, category, from, to, page, refreshKey]);

  useEffect(() => {
    let active = true;

    (async () => {
      setSummaryLoading(true);
      try {
        const params = {};
        if (from) params.from = from;
        if (to) params.to = to;
        const { data } = await api.get('/expenses/summary', { params });
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
  }, [from, to, refreshKey]);

  const topCategory = useMemo(() => {
    const first = summary?.by_category?.[0];
    if (!first) return null;
    return {
      name: first.expense_category,
      total: Number(first.total_amount),
    };
  }, [summary]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormErrors({});
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (expense) => {
    setEditing(expense);
    setForm({
      expense_category: expense.expense_category,
      description: expense.description || '',
      amount: String(expense.amount ?? ''),
      expense_date: String(expense.expense_date || '').slice(0, 10),
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
      expense_category: form.expense_category,
      description: form.description.trim(),
      amount: Number(form.amount),
      expense_date: form.expense_date,
    };

    try {
      if (editing) {
        await api.put(`/expenses/${editing.expense_id}`, payload);
        toast.success('Expense updated');
      } else {
        await api.post('/expenses', payload);
        toast.success('Expense recorded');
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

  const deleteExpense = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/expenses/${deleteTarget.expense_id}`);
      toast.success('Expense deleted');
      setDeleteTarget(null);
      reload();
    } catch (requestError) {
      toast.error(getApiError(requestError));
    } finally {
      setDeleting(false);
    }
  };

  const summaryCards = [
    {
      label: 'Total expenses',
      value: formatCurrency(summary?.totals?.total_amount || 0),
      icon: Wallet,
      tone: 'bg-brand-50 text-brand-700',
    },
    {
      label: 'Entries',
      value: formatNumber(summary?.totals?.entries || 0),
      icon: Receipt,
      tone: 'bg-aqua-50 text-aqua-700',
    },
    {
      label: 'Average entry',
      value: formatCurrency(summary?.totals?.average_amount || 0),
      icon: CircleDollarSign,
      tone: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Top category',
      value: topCategory ? `${topCategory.name}` : '—',
      hint: topCategory ? formatCurrency(topCategory.total) : null,
      icon: Tags,
      tone: 'bg-violet-50 text-violet-700',
    },
  ];

  const columns = [
    {
      key: 'date',
      header: 'Date',
      cell: (row) => (
        <span className="whitespace-nowrap text-[11px] font-medium text-navy-800">
          {formatDate(row.expense_date)}
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      cell: (row) => (
        <Badge tone={CATEGORY_TONES[row.expense_category] || 'slate'}>
          {row.expense_category}
        </Badge>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      cell: (row) => (
        <span className="block max-w-[320px] truncate text-[11px] text-navy-700/80">
          {row.description}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <span className="font-bold text-navy-900">{formatCurrency(row.amount, { precise: true })}</span>
      ),
    },
    {
      key: 'by',
      header: 'Recorded by',
      cell: (row) => (
        <span className="text-[11px] text-navy-700/65">{row.created_by_name || '—'}</span>
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
            onClick={() => openEdit(row)}
            className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy-800"
            aria-label={`Edit expense ${row.expense_id}`}
          >
            <Pencil className="size-4" />
          </button>
          {isAdmin ? (
            <button
              type="button"
              onClick={() => setDeleteTarget(row)}
              className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
              aria-label={`Delete expense ${row.expense_id}`}
            >
              <Trash2 className="size-4" />
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
        title="Expenses"
        description="Log operating costs and see how spending splits across categories and dates."
        actions={
          <Button icon={Plus} size="sm" onClick={openCreate}>
            Add expense
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ label, value, hint, icon: Icon, tone }) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-white bg-white p-4 shadow-card">
            <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone}`}>
              <Icon className="size-4.5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-navy-700/55">{label}</p>
              {summaryLoading ? (
                <Skeleton className="mt-1 h-5 w-20" />
              ) : (
                <>
                  <p className="truncate text-lg font-extrabold leading-tight text-navy-900">{value}</p>
                  {hint ? <p className="text-[10px] text-navy-700/50">{hint}</p> : null}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Expense register"
          subtitle={
            meta
              ? `${formatNumber(meta.total)} entries · ${formatCurrency(meta.total_amount, {
                  precise: true,
                })} in current filters`
              : 'Loading expenses'
          }
          icon={Receipt}
        />

        <div className="flex flex-col gap-3 px-5 pb-4 pt-4 xl:flex-row xl:items-center xl:justify-between">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search description…"
            className="w-full xl:max-w-xs"
          />
          <FilterBar>
            <Select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-10 w-auto text-xs"
              aria-label="Expense category"
            >
              <option value="all">All categories</option>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
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
            {category !== 'all' || from || to ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCategory('all');
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
            <ErrorState title="Could not load expenses" message={error} onRetry={reload} />
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.expense_id}
            loading={loading}
            empty={{
              icon: Receipt,
              title: 'No expenses found',
              description: 'Adjust the filters or record a new operating cost.',
              action: (
                <Button size="sm" icon={Plus} onClick={openCreate}>
                  Add expense
                </Button>
              ),
            }}
            footer={
              <Pagination
                meta={meta}
                onPageChange={setPage}
                loading={loading}
                itemLabel="expenses"
              />
            }
          />
        )}
      </Card>

      {summary?.by_category?.length ? (
        <Card>
          <CardHeader title="Spending by category" subtitle="Based on the selected date range" icon={Tags} />
          <div className="space-y-2 px-5 pb-5 pt-4">
            {summary.by_category.map((item) => {
              const max = Number(summary.by_category[0].total_amount) || 1;
              const share = Math.round((Number(item.total_amount) / max) * 100);
              return (
                <div key={item.expense_category} className="flex items-center gap-2 sm:gap-3">
                  <span className="w-24 shrink-0 truncate text-[11px] font-semibold text-navy-800 sm:w-32">
                    {item.expense_category}
                  </span>
                  <div className="hidden h-2 flex-1 overflow-hidden rounded-full bg-slate-100 sm:block">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right text-[10px] text-navy-700/55 sm:w-14">
                    {formatNumber(item.entries)} ent.
                  </span>
                  <span className="w-16 shrink-0 text-right text-[11px] font-bold text-navy-900 sm:w-24">
                    {formatCurrency(item.total_amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      {/* Create / edit */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit expense' : 'Add expense'}
        description={
          editing
            ? 'Update this expense entry. Changes are reflected in the summary immediately.'
            : 'Record an operating cost. Entries are tied to the signed-in user.'
        }
        icon={Receipt}
        size="md"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" loading={saving} onClick={submitForm}>
              {editing ? 'Save changes' : 'Record expense'}
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
            <Field label="Category" htmlFor="expense_category" required error={formErrors.expense_category}>
              <Select
                id="expense_category"
                value={form.expense_category}
                onChange={(event) => updateForm('expense_category', event.target.value)}
                invalid={Boolean(formErrors.expense_category)}
              >
                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Expense date" htmlFor="expense_date" required error={formErrors.expense_date}>
              <Input
                id="expense_date"
                type="date"
                value={form.expense_date}
                onChange={(event) => updateForm('expense_date', event.target.value)}
                invalid={Boolean(formErrors.expense_date)}
              />
            </Field>
          </div>

          <Field label="Amount (₱)" htmlFor="expense_amount" required error={formErrors.amount}>
            <Input
              id="expense_amount"
              type="number"
              step="0.01"
              min="0.01"
              value={form.amount}
              onChange={(event) => updateForm('amount', event.target.value)}
              placeholder="0.00"
              invalid={Boolean(formErrors.amount)}
              autoFocus
            />
          </Field>

          <Field label="Description" htmlFor="expense_description" required error={formErrors.description}>
            <Textarea
              id="expense_description"
              rows={3}
              value={form.description}
              onChange={(event) => updateForm('description', event.target.value)}
              placeholder="e.g. Diesel for delivery truck"
              invalid={Boolean(formErrors.description)}
            />
          </Field>

          {editing ? (
            <p className="flex items-center gap-1.5 text-[10px] text-navy-700/50">
              <CalendarDays className="size-3.5" />
              Recorded {formatDate(editing.expense_date)}
              {editing.created_by_name ? ` by ${editing.created_by_name}` : ''}
            </p>
          ) : null}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteExpense}
        loading={deleting}
        title="Delete this expense?"
        description={
          deleteTarget
            ? `${deleteTarget.expense_category} · ${formatCurrency(deleteTarget.amount, {
                precise: true,
              })} on ${formatDate(deleteTarget.expense_date)} will be permanently removed from the register.`
            : ''
        }
        confirmLabel="Delete expense"
        icon={Trash2}
      />
    </div>
  );
}
