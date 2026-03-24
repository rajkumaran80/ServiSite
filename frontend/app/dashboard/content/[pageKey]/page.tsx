'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { api } from '../../../../services/api';
import { getPredefinedPage, type PredefinedPage, type PageField } from '../../../../config/predefined-pages';
import { ImageUpload } from '../../../../components/ui/ImageUpload';
import { MultiImageUpload } from '../../../../components/ui/MultiImageUpload';

interface Entry {
  id: string;
  title: string;
  imageUrl: string | null;
  data: Record<string, any>;
  isActive: boolean;
  sortOrder: number;
}

type FormValue = string | string[];
type FormState = Record<string, FormValue>;

function buildEmptyForm(page: PredefinedPage): FormState {
  const form: FormState = { title: '' };
  for (const field of page.itemFields) {
    if (field.key !== 'title') {
      form[field.key] = field.type === 'images' ? [] : '';
    }
  }
  return form;
}

function entryToForm(entry: Entry, page: PredefinedPage): FormState {
  const form: FormState = { title: entry.title };
  for (const field of page.itemFields) {
    if (field.key !== 'title') {
      const stored = entry.data[field.key];
      if (field.type === 'images') {
        form[field.key] = Array.isArray(stored) ? stored : [];
      } else {
        form[field.key] = stored ?? '';
      }
    }
  }
  return form;
}

function formToPayload(form: FormState, page: PredefinedPage) {
  const data: Record<string, FormValue> = {};
  for (const field of page.itemFields) {
    if (field.key !== 'title' && field.key !== 'imageUrl') {
      data[field.key] = field.type === 'images' ? (form[field.key] as string[]) : (form[field.key] || '');
    }
  }
  return {
    pageKey: page.key,
    title: form.title as string,
    imageUrl: (form.imageUrl as string) || undefined,
    data,
  };
}

// ─── Field renderer ────────────────────────────────────────────────────────────

function FieldEditor({
  field,
  value,
  onChange,
}: {
  field: PageField;
  value: FormValue;
  onChange: (v: FormValue) => void;
}) {
  const base =
    'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  if (field.type === 'textarea') {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </label>
        <textarea
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className={`${base} resize-y`}
        />
      </div>
    );
  }

  if (field.type === 'image') {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
        <ImageUpload
          currentUrl={value as string}
          mediaType="misc"
          onUpload={(url) => onChange(url)}
          aspectRatio="free"
        />
      </div>
    );
  }

  if (field.type === 'images') {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
        <MultiImageUpload
          urls={value as string[]}
          onChange={(urls) => onChange(urls)}
        />
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.label} {field.required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={field.type === 'date' ? 'date' : 'text'}
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className={base}
      />
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ContentManagerPage() {
  const params = useParams();
  const router = useRouter();
  const pageKey = params.pageKey as string;
  const pageDef = getPredefinedPage(pageKey);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({});
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/page-entries/admin?pageKey=${pageKey}`);
      setEntries(res.data.data || []);
    } catch {
      toast.error('Failed to load entries');
    } finally {
      setIsLoading(false);
    }
  }, [pageKey]);

  useEffect(() => { load(); }, [load]);

  if (!pageDef) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg font-medium">Unknown page type: {pageKey}</p>
        <button onClick={() => router.push('/dashboard/navigation')} className="mt-4 text-blue-600 underline text-sm">
          Back to Navigation
        </button>
      </div>
    );
  }

  const openAdd = () => {
    setEditingId(null);
    setForm(buildEmptyForm(pageDef));
    setShowForm(true);
  };

  const openEdit = (entry: Entry) => {
    setEditingId(entry.id);
    setForm(entryToForm(entry, pageDef));
    setShowForm(true);
  };

  const handleSave = async () => {
    // Validate required fields
    for (const field of pageDef.itemFields) {
      if (field.required && typeof form[field.key] === 'string' && !(form[field.key] as string).trim()) {
        toast.error(`${field.label} is required`);
        return;
      }
    }
    setIsSaving(true);
    try {
      const payload = formToPayload(form, pageDef);
      if (editingId) {
        await api.put(`/page-entries/${editingId}`, {
          title: payload.title,
          imageUrl: payload.imageUrl,
          data: payload.data,
        });
        toast.success(`${pageDef.itemLabel} updated`);
      } else {
        await api.post('/page-entries', { ...payload, sortOrder: entries.length });
        toast.success(`${pageDef.itemLabel} added`);
      }
      setShowForm(false);
      load();
    } catch {
      toast.error('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete this ${pageDef.itemLabel.toLowerCase()}?`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/page-entries/${id}`);
      toast.success('Deleted');
      load();
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleActive = async (entry: Entry) => {
    try {
      await api.put(`/page-entries/${entry.id}`, { isActive: !entry.isActive });
      setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, isActive: !e.isActive } : e));
    } catch {
      toast.error('Failed to update');
    }
  };

  const moveEntry = async (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= entries.length) return;
    const updated = [...entries];
    [updated[index], updated[next]] = [updated[next], updated[index]];
    const reordered = updated.map((e, i) => ({ id: e.id, sortOrder: i }));
    setEntries(updated.map((e, i) => ({ ...e, sortOrder: i })));
    try {
      await api.put('/page-entries/reorder', { items: reordered });
    } catch {
      toast.error('Failed to save order');
      load();
    }
  };

  // Find the imageUrl field key if any
  const imageFieldKey = pageDef.itemFields.find((f) => f.type === 'image')?.key;

  // Find a "subtitle" field for card preview (date, djName, etc.)
  const subtitleField = pageDef.itemFields.find((f) =>
    ['date', 'djName', 'discount', 'validUntil'].includes(f.key)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push('/dashboard/navigation')}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{pageDef.icon}</span>
            <h1 className="text-2xl font-bold text-gray-900">{pageDef.label}</h1>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">{pageDef.description}</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add {pageDef.itemLabel}
        </button>
      </div>

      {/* Entry grid */}
      {entries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <div className="text-5xl mb-4">{pageDef.icon}</div>
          <p className="font-semibold text-gray-500">No {pageDef.label} yet</p>
          <p className="text-sm text-gray-400 mt-1">Click "Add {pageDef.itemLabel}" to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map((entry, index) => {
            const imageUrl = imageFieldKey ? (entry.data[imageFieldKey] || entry.imageUrl) : entry.imageUrl;
            const subtitle = subtitleField ? entry.data[subtitleField.key] : null;

            return (
              <div
                key={entry.id}
                className={`bg-white rounded-2xl border overflow-hidden shadow-sm transition-all ${
                  entry.isActive ? 'border-gray-100' : 'border-gray-100 opacity-60'
                }`}
              >
                {/* Image */}
                {imageUrl ? (
                  <div className="h-40 bg-gray-100 overflow-hidden">
                    <img src={imageUrl} alt={entry.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                    <span className="text-4xl opacity-30">{pageDef.icon}</span>
                  </div>
                )}

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{entry.title}</p>
                      {subtitle && (
                        <p className="text-sm text-gray-400 mt-0.5">
                          {subtitleField!.label}: {subtitle}
                        </p>
                      )}
                    </div>
                    {!entry.isActive && (
                      <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full flex-shrink-0">hidden</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                    <div className="flex gap-0.5 flex-shrink-0">
                      <button onClick={() => moveEntry(index, -1)} disabled={index === 0} className="p-1.5 text-gray-300 hover:text-gray-500 disabled:opacity-30 rounded transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                      </button>
                      <button onClick={() => moveEntry(index, 1)} disabled={index === entries.length - 1} className="p-1.5 text-gray-300 hover:text-gray-500 disabled:opacity-30 rounded transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                    </div>
                    <div className="flex-1" />
                    <button onClick={() => toggleActive(entry)} title={entry.isActive ? 'Hide' : 'Show'} className={`p-1.5 rounded-lg transition-colors ${entry.isActive ? 'text-green-500 hover:bg-green-50' : 'text-gray-300 hover:bg-gray-50'}`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={entry.isActive ? "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" : "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"} />
                      </svg>
                    </button>
                    <button onClick={() => openEdit(entry)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(entry.id)} disabled={deletingId === entry.id} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      {deletingId === entry.id ? (
                        <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? `Edit ${pageDef.itemLabel}` : `Add ${pageDef.itemLabel}`}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
              {pageDef.itemFields.map((field) => (
                <FieldEditor
                  key={field.key}
                  field={field}
                  value={form[field.key] ?? (field.type === 'images' ? [] : '')}
                  onChange={(v) => setForm((prev) => ({ ...prev, [field.key]: v }))}
                />
              ))}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {isSaving ? 'Saving…' : editingId ? 'Save Changes' : `Add ${pageDef.itemLabel}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
