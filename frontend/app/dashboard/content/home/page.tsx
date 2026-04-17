'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../../../services/api';
import { ImageUpload } from '../../../../components/ui/ImageUpload';
import tenantService from '../../../../services/tenant.service';
import { revalidateTenantCache } from '../../settings/actions';


// ── Section form types ────────────────────────────────────────────────────────

interface Section {
  id: string;
  title: string;
  imageUrl: string | null;
  data: Record<string, any>;
  isActive: boolean;
  sortOrder: number;
}

interface SectionForm {
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  imagePosition: string;
}

const EMPTY_FORM: SectionForm = {
  title: '',
  subtitle: '',
  description: '',
  imageUrl: '',
  imagePosition: 'right',
};

// ── Modal ─────────────────────────────────────────────────────────────────────

function SectionModal({
  form,
  setForm,
  onSave,
  onClose,
  saving,
  editingId,
}: {
  form: SectionForm;
  setForm: (f: SectionForm) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  editingId: string | null;
}) {
  const set = (key: keyof SectionForm, val: string) => setForm({ ...form, [key]: val });
  const base = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{editingId ? 'Edit Section' : 'Add Section'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Section Title</label>
            <input className={base} placeholder="e.g. About Our Menu" value={form.title} onChange={(e) => set('title', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
            <input className={base} placeholder="e.g. Fresh ingredients every day" value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Body Text</label>
            <textarea rows={4} className={`${base} resize-y`} placeholder="Write your section content here…" value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
            <p className="text-xs text-gray-400 mb-1.5">Add body text, an image, or both — at least one is required.</p>
            <ImageUpload
              currentUrl={form.imageUrl}
              mediaType="misc"
              onUpload={(url) => set('imageUrl', url)}
              aspectRatio="free"
            />
          </div>
          {form.imageUrl && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image Position</label>
              <div className="flex gap-3">
                {([
                  { value: 'left',   label: 'Left' },
                  { value: 'center', label: 'Centre' },
                  { value: 'right',  label: 'Right' },
                ] as const).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set('imagePosition', value)}
                    className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium transition-colors ${
                      form.imagePosition === value ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} disabled={saving} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50">Cancel</button>
            <button onClick={onSave} disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Section'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HomeManagePage() {
  const [isLoading, setIsLoading] = useState(true);

  const [tenantId, setTenantId] = useState<string>('');
  const [tenantSlug, setTenantSlug] = useState<string>('');

  // Google Reviews toggle
  const [showReviews, setShowReviews] = useState(true);
  const [isSavingReviews, setIsSavingReviews] = useState(false);

  // Sections
  const [sections, setSections] = useState<Section[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SectionForm>(EMPTY_FORM);
  const [savingSection, setSavingSection] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const loadSections = useCallback(async () => {
    try {
      const res = await api.get('/page-entries/admin?pageKey=home-blocks');
      setSections(res.data.data || []);
    } catch {
      toast.error('Failed to load sections');
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await api.get<{ data: any }>('/tenant/current');
        const t = res.data.data;
        if (t) {
          setTenantId(t.id);
          setTenantSlug(t.slug);
          setShowReviews(t.themeSettings?.showReviews !== false);
        }
      } catch {
        toast.error('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };
    init();
    loadSections();
  }, [loadSections]);

  const handleToggleReviews = async (value: boolean) => {
    if (!tenantId) return;
    setShowReviews(value);
    setIsSavingReviews(true);
    try {
      await tenantService.update(tenantId, { themeSettings: { showReviews: value } });
      await revalidateTenantCache(tenantSlug);
      toast.success(value ? 'Reviews shown' : 'Reviews hidden');
    } catch {
      setShowReviews(!value);
      toast.error('Failed to update');
    } finally {
      setIsSavingReviews(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (section: Section) => {
    setEditingId(section.id);
    setForm({
      title: section.title || '',
      subtitle: section.data?.subtitle || '',
      description: section.data?.description || '',
      imageUrl: section.imageUrl || '',
      imagePosition: section.data?.imagePosition || 'right',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() && !form.imageUrl) { toast.error('Add a title, an image, or both'); return; }
    if (!form.title.trim() && !form.description.trim() && !form.imageUrl) { toast.error('Add at least an image or some text'); return; }
    setSavingSection(true);
    try {
      const payload = {
        pageKey: 'home-blocks',
        title: form.title.trim(),
        imageUrl: form.imageUrl || undefined,
        data: {
          subtitle: form.subtitle,
          description: form.description,
          imagePosition: form.imagePosition,
        },
      };
      if (editingId) {
        await api.put(`/page-entries/${editingId}`, { title: payload.title, imageUrl: payload.imageUrl, data: payload.data });
        toast.success('Section updated');
      } else {
        await api.post('/page-entries', { ...payload, sortOrder: sections.length });
        toast.success('Section added');
      }
      setShowModal(false);
      loadSections();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSavingSection(false);
    }
  };

  const moveSection = async (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newSections.length) return;
    [newSections[index], newSections[swapIdx]] = [newSections[swapIdx], newSections[index]];
    setSections(newSections);
    setReordering(true);
    try {
      await api.put('/page-entries/reorder', {
        pageKey: 'home-blocks',
        items: newSections.map((s, i) => ({ id: s.id, sortOrder: i })),
      });
    } catch {
      toast.error('Failed to reorder');
      loadSections();
    } finally {
      setReordering(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this section?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/page-entries/${id}`);
      toast.success('Deleted');
      loadSections();
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Home Page</h1>
          <p className="text-gray-500 text-sm mt-1">Control which sections appear on your home page</p>
        </div>
      </div>

      {/* Google Reviews toggle */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Google Reviews</h2>
            <p className="text-sm text-gray-400 mt-0.5">Show or hide the reviews section on your home page</p>
          </div>
          <button
            type="button"
            onClick={() => handleToggleReviews(!showReviews)}
            disabled={isSavingReviews}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${showReviews ? 'bg-blue-600' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${showReviews ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Custom Sections */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Home Page Sections</h2>
            <p className="text-sm text-gray-400">Custom sections with title, image and text — displayed on your home page</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Section
          </button>
        </div>

        {sections.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-10 text-center">
            <p className="text-3xl mb-2">📋</p>
            <p className="font-semibold text-gray-500 text-sm">No sections yet</p>
            <p className="text-xs text-gray-400 mt-1">Click "Add Section" to create your first home page section</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sections.map((section, idx) => (
              <div key={section.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-4">
                {/* Reorder arrows */}
                <div className="flex flex-col gap-0.5 flex-shrink-0 mt-1">
                  <button
                    onClick={() => moveSection(idx, 'up')}
                    disabled={idx === 0 || reordering}
                    className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    title="Move up"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveSection(idx, 'down')}
                    disabled={idx === sections.length - 1 || reordering}
                    className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    title="Move down"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                {section.imageUrl && (
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                    <img src={section.imageUrl} alt={section.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{section.title}</p>
                  {section.data?.subtitle && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{section.data.subtitle}</p>
                  )}
                  {section.data?.description && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{section.data.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => openEdit(section)} className="text-gray-400 hover:text-gray-700 p-1.5 rounded transition-colors" title="Edit">✏️</button>
                  <button
                    onClick={() => handleDelete(section.id)}
                    disabled={deletingId === section.id}
                    className="text-gray-400 hover:text-red-500 p-1.5 rounded transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">Changes take effect immediately on your website</p>

      {showModal && (
        <SectionModal
          form={form}
          setForm={setForm}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          saving={savingSection}
          editingId={editingId}
        />
      )}
    </div>
  );
}
