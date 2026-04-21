'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../../../services/api';
import { ImageUpload } from '../../../../components/ui/ImageUpload';
import tenantService from '../../../../services/tenant.service';
import { revalidateTenantCache } from '../../settings/actions';

// ── Types ─────────────────────────────────────────────────────────────────────

type SectionType  = 'content' | 'awards' | 'social-proof';
type PatternType  = 'none' | 'dots' | 'grid' | 'diagonal';
type Tonality     = 'auto' | 'light' | 'mid' | 'dark';

interface AwardItem { name: string; subtitle: string; }
interface StatItem  { value: string; label: string; }
interface BadgeItem { text: string; }

interface SectionForm {
  sectionType: SectionType;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  imagePosition: 'left' | 'center' | 'right';
  pattern: PatternType;
  showBorder: boolean;
  // Awards type
  awards: AwardItem[];
  // Content type extras — stat blocks
  statItems: StatItem[];
  // Social-proof type
  rating: string;
  reviewText: string;
  badges: BadgeItem[];
}

interface Section {
  id: string;
  title: string;
  imageUrl: string | null;
  data: Record<string, any>;
  isActive: boolean;
  sortOrder: number;
}

const EMPTY_FORM: SectionForm = {
  sectionType: 'content',
  title: '',
  subtitle: '',
  description: '',
  imageUrl: '',
  imagePosition: 'right',
  pattern: 'none',
  showBorder: false,
  awards: Array.from({ length: 4 }, () => ({ name: '', subtitle: '' })),
  statItems: [],
  rating: '5.0',
  reviewText: '1,000+ five-star reviews',
  badges: [{ text: '' }, { text: '' }, { text: '' }],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const SECTION_TYPES: { id: SectionType; icon: string; label: string; desc: string }[] = [
  { id: 'content',      icon: '📝', label: 'Content Block',     desc: 'Text, image, body copy' },
  { id: 'awards',       icon: '🏆', label: 'Awards Strip',      desc: 'Dark band of accolades' },
  { id: 'social-proof', icon: '⭐', label: 'Social Proof Bar',  desc: 'Ratings & trust badges' },
];

const PATTERNS: { id: PatternType; label: string; css: string }[] = [
  { id: 'none',     label: 'None',     css: 'bg-gray-50' },
  { id: 'dots',     label: 'Dots',     css: 'bg-white' },
  { id: 'grid',     label: 'Grid',     css: 'bg-white' },
  { id: 'diagonal', label: 'Lines',    css: 'bg-white' },
];

function patternPreviewStyle(p: PatternType, tonality: Tonality): React.CSSProperties {
  const dark = tonality === 'dark';
  const mid  = tonality === 'mid';
  const bg   = dark ? '#111' : mid ? '#2d2d2d' : '#fff';
  const c    = dark || mid ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.10)';
  switch (p) {
    case 'dots':
      return { background: bg, backgroundImage: `radial-gradient(circle, ${c} 1px, transparent 1px)`, backgroundSize: '12px 12px' };
    case 'grid':
      return { background: bg, backgroundImage: `linear-gradient(${c} 1px, transparent 1px), linear-gradient(to right, ${c} 1px, transparent 1px)`, backgroundSize: '12px 12px' };
    case 'diagonal':
      return { background: bg, backgroundImage: `repeating-linear-gradient(45deg, ${c} 0, ${c} 1px, transparent 0, transparent 50%)`, backgroundSize: '10px 10px' };
    default:
      return { background: bg };
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InputField({ label, value, onChange, placeholder, hint }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      <input
        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function TextareaField({ label, value, onChange, placeholder, rows = 4 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        rows={rows}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function SectionModal({
  form, setForm, onSave, onClose, saving, editingId,
}: {
  form: SectionForm;
  setForm: (f: SectionForm) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  editingId: string | null;
}) {
  const set = <K extends keyof SectionForm>(key: K, val: SectionForm[K]) =>
    setForm({ ...form, [key]: val });

  const setAward = (i: number, field: keyof AwardItem, val: string) => {
    const awards = form.awards.map((a, idx) => idx === i ? { ...a, [field]: val } : a);
    set('awards', awards);
  };
  const addAward = () => set('awards', [...form.awards, { name: '', subtitle: '' }]);
  const removeAward = (i: number) => set('awards', form.awards.filter((_, idx) => idx !== i));

  const setStat = (i: number, field: keyof StatItem, val: string) => {
    const statItems = form.statItems.map((s, idx) => idx === i ? { ...s, [field]: val } : s);
    set('statItems', statItems);
  };
  const addStat = () => set('statItems', [...form.statItems, { value: '', label: '' }]);
  const removeStat = (i: number) => set('statItems', form.statItems.filter((_, idx) => idx !== i));

  const setBadge = (i: number, val: string) => {
    const badges = form.badges.map((b, idx) => idx === i ? { text: val } : b);
    set('badges', badges);
  };
  const addBadge = () => set('badges', [...form.badges, { text: '' }]);
  const removeBadge = (i: number) => set('badges', form.badges.filter((_, idx) => idx !== i));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">{editingId ? 'Edit Section' : 'Add Section'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center">&times;</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Step 1: Section Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Section Type</label>
            <div className="grid grid-cols-3 gap-2">
              {SECTION_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => set('sectionType', t.id)}
                  className={`flex flex-col items-center text-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    form.sectionType === t.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <span className="text-2xl">{t.icon}</span>
                  <span className={`text-xs font-semibold ${form.sectionType === t.id ? 'text-blue-700' : 'text-gray-700'}`}>{t.label}</span>
                  <span className="text-[10px] text-gray-400 leading-tight">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pattern + Border (per-section) */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Background pattern</p>
              <div className="flex gap-2">
                {PATTERNS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => set('pattern', p.id)}
                    className={`flex-1 rounded-lg border-2 transition-all overflow-hidden ${
                      form.pattern === p.id ? 'border-blue-600' : 'border-gray-200'
                    }`}
                  >
                    <div className="h-8" style={patternPreviewStyle(p.id, 'light')} />
                    <p className={`text-[10px] font-medium py-1 ${form.pattern === p.id ? 'text-blue-700 bg-blue-50' : 'text-gray-500 bg-white'}`}>{p.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Section border</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Subtle outline around content area</p>
              </div>
              <button
                type="button"
                onClick={() => set('showBorder', !form.showBorder)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${form.showBorder ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.showBorder ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          {/* ── Content type fields ── */}
          {form.sectionType === 'content' && (
            <>
              <InputField label="Section Title" value={form.title} onChange={(v) => set('title', v)} placeholder="e.g. Our Story" />
              <InputField label="Eyebrow Label" value={form.subtitle} onChange={(v) => set('subtitle', v)} placeholder="e.g. About Us" />
              <TextareaField label="Body Text" value={form.description} onChange={(v) => set('description', v)} placeholder="Write your section content here…" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                <p className="text-xs text-gray-400 mb-1.5">Add body text, an image, or both — at least one is required.</p>
                <ImageUpload currentUrl={form.imageUrl} mediaType="misc" onUpload={(url) => set('imageUrl', url)} aspectRatio="free" />
              </div>
              {form.imageUrl && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Image Position</label>
                  <div className="flex gap-2">
                    {(['left', 'center', 'right'] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => set('imagePosition', v)}
                        className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium capitalize transition-colors ${
                          form.imagePosition === v ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Stat blocks */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Stat Blocks</label>
                    <p className="text-xs text-gray-400">Optional highlight numbers shown below the text (e.g. "4x" / "Good Food Awards")</p>
                  </div>
                  {form.statItems.length < 4 && (
                    <button type="button" onClick={addStat} className="text-xs text-blue-600 font-semibold hover:underline">+ Add</button>
                  )}
                </div>
                {form.statItems.length > 0 && (
                  <div className="space-y-2">
                    {form.statItems.map((s, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="4x"
                          value={s.value}
                          onChange={(e) => setStat(i, 'value', e.target.value)}
                        />
                        <input
                          className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Good Food Awards"
                          value={s.label}
                          onChange={(e) => setStat(i, 'label', e.target.value)}
                        />
                        <button type="button" onClick={() => removeStat(i)} className="text-red-400 hover:text-red-600 text-lg leading-none px-1">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Awards type fields ── */}
          {form.sectionType === 'awards' && (
            <>
              <InputField
                label="Strip Title (optional)"
                value={form.title}
                onChange={(v) => set('title', v)}
                placeholder="e.g. Award-Winning Since 2021"
                hint="Leave blank to show awards only — no heading"
              />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Award Items</label>
                  {form.awards.length < 8 && (
                    <button type="button" onClick={addAward} className="text-xs text-blue-600 font-semibold hover:underline">+ Add Award</button>
                  )}
                </div>
                <div className="space-y-2">
                  {form.awards.map((a, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <div className="flex-1 flex gap-2">
                        <input
                          className="flex-1 px-2.5 py-2 border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={`Award ${i + 1} name`}
                          value={a.name}
                          onChange={(e) => setAward(i, 'name', e.target.value)}
                        />
                        <input
                          className="flex-1 px-2.5 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Subtitle"
                          value={a.subtitle}
                          onChange={(e) => setAward(i, 'subtitle', e.target.value)}
                        />
                      </div>
                      {form.awards.length > 2 && (
                        <button type="button" onClick={() => removeAward(i)} className="text-red-400 hover:text-red-600 text-lg leading-none px-1 flex-shrink-0">×</button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">Empty rows are hidden automatically</p>
              </div>
            </>
          )}

          {/* ── Social Proof type fields ── */}
          {form.sectionType === 'social-proof' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Star Rating" value={form.rating} onChange={(v) => set('rating', v)} placeholder="e.g. 4.9" />
                <InputField label="Review Count Text" value={form.reviewText} onChange={(v) => set('reviewText', v)} placeholder="e.g. 1,806+ reviews" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Trust Badges</label>
                  {form.badges.length < 5 && (
                    <button type="button" onClick={addBadge} className="text-xs text-blue-600 font-semibold hover:underline">+ Add Badge</button>
                  )}
                </div>
                <div className="space-y-2">
                  {form.badges.map((b, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        className="flex-1 px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`e.g. #1 in ${['Sutton', 'London', 'the area'][i] || 'your area'} on TripAdvisor`}
                        value={b.text}
                        onChange={(e) => setBadge(i, e.target.value)}
                      />
                      {form.badges.length > 1 && (
                        <button type="button" onClick={() => removeBadge(i)} className="text-red-400 hover:text-red-600 text-lg leading-none px-1 flex-shrink-0">×</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <button onClick={onClose} disabled={saving} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onSave} disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Section'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Section type badge ────────────────────────────────────────────────────────

function SectionTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; color: string }> = {
    content:      { label: 'Content',      color: 'bg-blue-50 text-blue-700' },
    awards:       { label: 'Awards',       color: 'bg-amber-50 text-amber-700' },
    'social-proof': { label: 'Social Proof', color: 'bg-green-50 text-green-700' },
  };
  const { label, color } = map[type] || map.content;
  return <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${color}`}>{label}</span>;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HomeManagePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string>('');
  const [tenantSlug, setTenantSlug] = useState<string>('');
  const [showReviews, setShowReviews] = useState(true);
  const [isSavingReviews, setIsSavingReviews] = useState(false);
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
    const d = section.data || {};
    setForm({
      sectionType: d.sectionType || 'content',
      title: section.title || '',
      subtitle: d.subtitle || '',
      description: d.description || '',
      imageUrl: section.imageUrl || '',
      imagePosition: d.imagePosition || 'right',
      pattern: d.pattern || 'none',
      showBorder: d.showBorder ?? false,
      awards: d.awards?.length ? d.awards : Array.from({ length: 4 }, () => ({ name: '', subtitle: '' })),
      statItems: d.statItems || [],
      rating: d.rating || '5.0',
      reviewText: d.reviewText || '1,000+ five-star reviews',
      badges: d.badges?.length ? d.badges : [{ text: '' }, { text: '' }, { text: '' }],
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    const { sectionType, title, description, imageUrl, awards, rating, reviewText, badges } = form;

    if (sectionType === 'content' && !title.trim() && !description.trim() && !imageUrl) {
      toast.error('Add a title, text, or image'); return;
    }
    if (sectionType === 'awards' && !awards.some((a) => a.name.trim())) {
      toast.error('Add at least one award'); return;
    }
    if (sectionType === 'social-proof' && !rating.trim()) {
      toast.error('Add a star rating'); return;
    }

    setSavingSection(true);
    try {
      const data: Record<string, any> = {
        sectionType: form.sectionType,
        pattern: form.pattern,
        showBorder: form.showBorder,
      };

      if (sectionType === 'content') {
        data.subtitle = form.subtitle;
        data.description = form.description;
        data.imagePosition = form.imagePosition;
        if (form.statItems.some((s) => s.value.trim())) data.statItems = form.statItems;
      } else if (sectionType === 'awards') {
        data.awards = awards.filter((a) => a.name.trim());
      } else if (sectionType === 'social-proof') {
        data.rating = rating;
        data.reviewText = reviewText;
        data.badges = badges.filter((b) => b.text.trim());
      }

      const payload = {
        pageKey: 'home-blocks',
        title: title.trim(),
        imageUrl: sectionType === 'content' ? (form.imageUrl || undefined) : undefined,
        data,
      };

      if (editingId) {
        await api.put(`/page-entries/${editingId}`, { title: payload.title, imageUrl: payload.imageUrl, data });
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
      toast.error('Failed to reorder'); loadSections();
    } finally {
      setReordering(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this section?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/page-entries/${id}`);
      toast.success('Deleted'); loadSections();
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Home Page</h1>
        <p className="text-gray-500 text-sm mt-1">Control which sections appear on your home page</p>
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
            <p className="text-sm text-gray-400">Content blocks, award strips, and social proof bars</p>
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
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-12 text-center">
            <p className="text-3xl mb-2">✨</p>
            <p className="font-semibold text-gray-500 text-sm">No sections yet</p>
            <p className="text-xs text-gray-400 mt-1">Add a content block, awards strip, or social proof bar</p>
            <button onClick={openAdd} className="mt-4 text-sm text-blue-600 font-semibold hover:underline">Add your first section</button>
          </div>
        ) : (
          <div className="space-y-2">
            {sections.map((section, idx) => {
              const sectionType = section.data?.sectionType || 'content';
              const isDark = section.data?.darkMode;
              const hasPattern = section.data?.pattern && section.data.pattern !== 'none';
              return (
                <div key={section.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-4">
                  {/* Reorder */}
                  <div className="flex flex-col gap-0.5 flex-shrink-0 mt-1">
                    <button onClick={() => moveSection(idx, 'up')} disabled={idx === 0 || reordering} className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                    </button>
                    <button onClick={() => moveSection(idx, 'down')} disabled={idx === sections.length - 1 || reordering} className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  </div>

                  {/* Thumbnail for content type */}
                  {sectionType === 'content' && section.imageUrl && (
                    <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                      <img src={section.imageUrl} alt={section.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  {sectionType === 'awards' && (
                    <div className="w-14 h-14 rounded-lg flex-shrink-0 bg-amber-50 flex items-center justify-center text-2xl">🏆</div>
                  )}
                  {sectionType === 'social-proof' && (
                    <div className="w-14 h-14 rounded-lg flex-shrink-0 bg-green-50 flex items-center justify-center text-2xl">⭐</div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <SectionTypeBadge type={sectionType} />
                      {isDark && <span className="text-[10px] text-gray-400">Dark</span>}
                      {hasPattern && <span className="text-[10px] text-gray-400">{section.data.pattern}</span>}
                    </div>
                    <p className="font-semibold text-gray-900 truncate text-sm">
                      {section.title || (sectionType === 'awards' ? `${section.data?.awards?.length || 0} awards` : sectionType === 'social-proof' ? `${section.data?.rating}★ · ${section.data?.reviewText}` : 'Untitled')}
                    </p>
                    {section.data?.subtitle && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{section.data.subtitle}</p>
                    )}
                    {sectionType === 'content' && section.data?.description && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{section.data.description}</p>
                    )}
                    {sectionType === 'awards' && section.data?.awards?.length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {section.data.awards.map((a: AwardItem) => a.name).filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {sectionType === 'social-proof' && section.data?.badges?.length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {section.data.badges.map((b: BadgeItem) => b.text).join(' · ')}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(section)} className="text-gray-400 hover:text-gray-700 p-1.5 rounded transition-colors text-sm">✏️</button>
                    <button
                      onClick={() => handleDelete(section.id)}
                      disabled={deletingId === section.id}
                      className="text-gray-400 hover:text-red-500 p-1.5 rounded transition-colors disabled:opacity-50 text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
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
