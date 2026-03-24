'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { api } from '../../../../services/api';
import type { CmsPage, PageSection, SectionType } from '../../../../types/page.types';

// ─── Section type definitions ─────────────────────────────────────────────────

interface SectionDef {
  type: SectionType;
  label: string;
  icon: string;
  defaultContent: Record<string, any>;
}

const SECTION_DEFS: SectionDef[] = [
  {
    type: 'hero',
    label: 'Hero Banner',
    icon: '🖼️',
    defaultContent: { heading: 'Welcome', subheading: '', imageUrl: '', buttonLabel: '', buttonHref: '', overlay: true },
  },
  {
    type: 'text',
    label: 'Text Block',
    icon: '📝',
    defaultContent: { heading: '', body: 'Enter your text here...', align: 'left' },
  },
  {
    type: 'image_text',
    label: 'Image + Text',
    icon: '📸',
    defaultContent: { heading: '', body: '', imageUrl: '', imageAlt: '', imagePosition: 'left', buttonLabel: '', buttonHref: '' },
  },
  {
    type: 'features',
    label: 'Features / Benefits',
    icon: '✨',
    defaultContent: {
      heading: 'Why Choose Us',
      subheading: '',
      columns: 3,
      features: [
        { icon: '⭐', title: 'Feature 1', description: 'Description of this feature' },
        { icon: '💡', title: 'Feature 2', description: 'Description of this feature' },
        { icon: '🚀', title: 'Feature 3', description: 'Description of this feature' },
      ],
    },
  },
  {
    type: 'gallery',
    label: 'Gallery',
    icon: '🖼',
    defaultContent: { heading: 'Gallery', images: [] },
  },
  {
    type: 'cta',
    label: 'Call to Action',
    icon: '📣',
    defaultContent: { heading: 'Ready to get started?', subheading: '', buttonLabel: 'Contact Us', buttonHref: '/contact', variant: 'primary' },
  },
  {
    type: 'contact_info',
    label: 'Contact Info',
    icon: '📍',
    defaultContent: { heading: 'Find Us', showMap: true, showHours: true },
  },
  {
    type: 'divider',
    label: 'Divider',
    icon: '➖',
    defaultContent: { style: 'line' },
  },
];

// ─── Field editors for each section type ─────────────────────────────────────

function FieldInput({ label, value, onChange, type = 'text', hint }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function FieldTextarea({ label, value, onChange, rows = 4 }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
      />
    </div>
  );
}

function FieldSelect({ label, value, options, onChange }: {
  label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function HeroEditor({ content, onChange }: { content: any; onChange: (c: any) => void }) {
  return (
    <div className="space-y-3">
      <FieldInput label="Heading" value={content.heading || ''} onChange={(v) => onChange({ ...content, heading: v })} />
      <FieldInput label="Subheading" value={content.subheading || ''} onChange={(v) => onChange({ ...content, subheading: v })} />
      <FieldInput label="Background Image URL" value={content.imageUrl || ''} onChange={(v) => onChange({ ...content, imageUrl: v })} hint="Leave empty to use a color gradient" />
      <div className="grid grid-cols-2 gap-3">
        <FieldInput label="Button Label" value={content.buttonLabel || ''} onChange={(v) => onChange({ ...content, buttonLabel: v })} />
        <FieldInput label="Button URL" value={content.buttonHref || ''} onChange={(v) => onChange({ ...content, buttonHref: v })} />
      </div>
    </div>
  );
}

function TextEditor({ content, onChange }: { content: any; onChange: (c: any) => void }) {
  return (
    <div className="space-y-3">
      <FieldInput label="Heading (optional)" value={content.heading || ''} onChange={(v) => onChange({ ...content, heading: v })} />
      <FieldTextarea label="Body Text" value={content.body || ''} onChange={(v) => onChange({ ...content, body: v })} rows={6} />
      <FieldSelect
        label="Text Alignment"
        value={content.align || 'left'}
        options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]}
        onChange={(v) => onChange({ ...content, align: v })}
      />
    </div>
  );
}

function ImageTextEditor({ content, onChange }: { content: any; onChange: (c: any) => void }) {
  return (
    <div className="space-y-3">
      <FieldInput label="Heading (optional)" value={content.heading || ''} onChange={(v) => onChange({ ...content, heading: v })} />
      <FieldTextarea label="Body Text" value={content.body || ''} onChange={(v) => onChange({ ...content, body: v })} />
      <FieldInput label="Image URL" value={content.imageUrl || ''} onChange={(v) => onChange({ ...content, imageUrl: v })} />
      <FieldInput label="Image Alt Text" value={content.imageAlt || ''} onChange={(v) => onChange({ ...content, imageAlt: v })} />
      <FieldSelect
        label="Image Position"
        value={content.imagePosition || 'left'}
        options={[{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }]}
        onChange={(v) => onChange({ ...content, imagePosition: v })}
      />
      <div className="grid grid-cols-2 gap-3">
        <FieldInput label="Button Label" value={content.buttonLabel || ''} onChange={(v) => onChange({ ...content, buttonLabel: v })} />
        <FieldInput label="Button URL" value={content.buttonHref || ''} onChange={(v) => onChange({ ...content, buttonHref: v })} />
      </div>
    </div>
  );
}

function FeaturesEditor({ content, onChange }: { content: any; onChange: (c: any) => void }) {
  const features = content.features || [];

  const updateFeature = (index: number, field: string, value: string) => {
    const updated = features.map((f: any, i: number) => i === index ? { ...f, [field]: value } : f);
    onChange({ ...content, features: updated });
  };

  const addFeature = () => {
    onChange({ ...content, features: [...features, { icon: '⭐', title: 'New Feature', description: '' }] });
  };

  const removeFeature = (index: number) => {
    onChange({ ...content, features: features.filter((_: any, i: number) => i !== index) });
  };

  return (
    <div className="space-y-3">
      <FieldInput label="Section Heading" value={content.heading || ''} onChange={(v) => onChange({ ...content, heading: v })} />
      <FieldInput label="Subheading" value={content.subheading || ''} onChange={(v) => onChange({ ...content, subheading: v })} />
      <FieldSelect
        label="Columns"
        value={String(content.columns || 3)}
        options={[{ value: '2', label: '2 Columns' }, { value: '3', label: '3 Columns' }, { value: '4', label: '4 Columns' }]}
        onChange={(v) => onChange({ ...content, columns: parseInt(v) })}
      />
      <div className="border-t border-gray-100 pt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-gray-600">Features</p>
          <button onClick={addFeature} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add</button>
        </div>
        <div className="space-y-3">
          {features.map((feature: any, index: number) => (
            <div key={index} className="bg-gray-50 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={feature.icon || ''}
                  onChange={(e) => updateFeature(index, 'icon', e.target.value)}
                  className="w-12 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="🌟"
                />
                <input
                  type="text"
                  value={feature.title || ''}
                  onChange={(e) => updateFeature(index, 'title', e.target.value)}
                  className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Feature title"
                />
                <button onClick={() => removeFeature(index)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <input
                type="text"
                value={feature.description || ''}
                onChange={(e) => updateFeature(index, 'description', e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Description"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CtaEditor({ content, onChange }: { content: any; onChange: (c: any) => void }) {
  return (
    <div className="space-y-3">
      <FieldInput label="Heading" value={content.heading || ''} onChange={(v) => onChange({ ...content, heading: v })} />
      <FieldInput label="Subheading" value={content.subheading || ''} onChange={(v) => onChange({ ...content, subheading: v })} />
      <div className="grid grid-cols-2 gap-3">
        <FieldInput label="Button Label" value={content.buttonLabel || ''} onChange={(v) => onChange({ ...content, buttonLabel: v })} />
        <FieldInput label="Button URL" value={content.buttonHref || ''} onChange={(v) => onChange({ ...content, buttonHref: v })} />
      </div>
      <FieldSelect
        label="Style"
        value={content.variant || 'primary'}
        options={[{ value: 'primary', label: 'Primary color' }, { value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]}
        onChange={(v) => onChange({ ...content, variant: v })}
      />
    </div>
  );
}

function GalleryEditor({ content, onChange }: { content: any; onChange: (c: any) => void }) {
  const images = content.images || [];

  const addImage = () => {
    onChange({ ...content, images: [...images, { url: '', caption: '' }] });
  };

  const updateImage = (index: number, field: string, value: string) => {
    const updated = images.map((img: any, i: number) => i === index ? { ...img, [field]: value } : img);
    onChange({ ...content, images: updated });
  };

  const removeImage = (index: number) => {
    onChange({ ...content, images: images.filter((_: any, i: number) => i !== index) });
  };

  return (
    <div className="space-y-3">
      <FieldInput label="Section Heading" value={content.heading || ''} onChange={(v) => onChange({ ...content, heading: v })} />
      <div className="border-t border-gray-100 pt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-gray-600">Images</p>
          <button onClick={addImage} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Image</button>
        </div>
        <div className="space-y-2">
          {images.map((img: any, index: number) => (
            <div key={index} className="bg-gray-50 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={img.url || ''}
                  onChange={(e) => updateImage(index, 'url', e.target.value)}
                  className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Image URL"
                />
                <button onClick={() => removeImage(index)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <input
                type="text"
                value={img.caption || ''}
                onChange={(e) => updateImage(index, 'caption', e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Caption (optional)"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContactInfoEditor({ content, onChange }: { content: any; onChange: (c: any) => void }) {
  return (
    <div className="space-y-3">
      <FieldInput label="Section Heading" value={content.heading || ''} onChange={(v) => onChange({ ...content, heading: v })} />
      <p className="text-xs text-gray-400">Contact details are pulled from your Contact settings automatically.</p>
    </div>
  );
}

function DividerEditor({ content, onChange }: { content: any; onChange: (c: any) => void }) {
  return (
    <FieldSelect
      label="Divider Style"
      value={content.style || 'line'}
      options={[{ value: 'line', label: 'Line' }, { value: 'dots', label: 'Dots' }]}
      onChange={(v) => onChange({ ...content, style: v })}
    />
  );
}

function SectionEditor({ section, onChange }: { section: PageSection; onChange: (content: any) => void }) {
  switch (section.type) {
    case 'hero': return <HeroEditor content={section.content} onChange={onChange} />;
    case 'text': return <TextEditor content={section.content} onChange={onChange} />;
    case 'image_text': return <ImageTextEditor content={section.content} onChange={onChange} />;
    case 'features': return <FeaturesEditor content={section.content} onChange={onChange} />;
    case 'gallery': return <GalleryEditor content={section.content} onChange={onChange} />;
    case 'cta': return <CtaEditor content={section.content} onChange={onChange} />;
    case 'contact_info': return <ContactInfoEditor content={section.content} onChange={onChange} />;
    case 'divider': return <DividerEditor content={section.content} onChange={onChange} />;
    default: return null;
  }
}

// ─── Main page component ───────────────────────────────────────────────────────

export default function PageBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const pageId = params.id as string;

  const [page, setPage] = useState<CmsPage | null>(null);
  const [sections, setSections] = useState<PageSection[]>([]);
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const load = useCallback(async () => {
    try {
      const allRes = await api.get('/pages/admin');
      const found = allRes.data.data?.find((p: CmsPage) => p.id === pageId);
      if (!found) {
        toast.error('Page not found');
        router.push('/dashboard/pages');
        return;
      }
      setPage(found);
      setTitle(found.title);
      const sorted = [...(found.sections || [])].sort((a, b) => a.order - b.order);
      setSections(sorted);
    } catch {
      toast.error('Failed to load page');
    } finally {
      setIsLoading(false);
    }
  }, [pageId, router]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const reordered = sections.map((s, i) => ({ ...s, order: i }));
      await api.put(`/pages/${pageId}`, { title, sections: reordered });
      setSections(reordered);
      setHasChanges(false);
      toast.success('Page saved');
    } catch {
      toast.error('Failed to save page');
    } finally {
      setIsSaving(false);
    }
  };

  const addSection = (def: SectionDef) => {
    const newSection: PageSection = {
      id: uuidv4(),
      type: def.type,
      order: sections.length,
      content: { ...def.defaultContent } as any,
    };
    setSections((prev) => [...prev, newSection]);
    setExpandedId(newSection.id);
    setShowAddPanel(false);
    setHasChanges(true);
  };

  const updateSection = (id: string, content: any) => {
    setSections((prev) => prev.map((s) => s.id === id ? { ...s, content } : s));
    setHasChanges(true);
  };

  const deleteSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
    setHasChanges(true);
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= sections.length) return;
    const updated = [...sections];
    [updated[index], updated[next]] = [updated[next], updated[index]];
    setSections(updated);
    setHasChanges(true);
  };

  const getSectionDef = (type: SectionType) => SECTION_DEFS.find((d) => d.type === type);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!page) return null;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push('/dashboard/pages')}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setHasChanges(true); }}
            className="text-2xl font-bold text-gray-900 bg-transparent border-b-2 border-transparent focus:border-blue-400 focus:outline-none w-full pb-0.5 transition-colors"
          />
          <p className="text-sm text-gray-400 font-mono mt-0.5">/{page.slug}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
            hasChanges
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {isSaving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* Sections */}
      <div className="space-y-3 mb-4">
        {sections.map((section, index) => {
          const def = getSectionDef(section.type);
          const isExpanded = expandedId === section.id;

          return (
            <div key={section.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Section header */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/50 transition-colors select-none"
                onClick={() => setExpandedId(isExpanded ? null : section.id)}
              >
                <span className="text-lg flex-shrink-0">{def?.icon || '📄'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{def?.label || section.type}</p>
                  {section.type === 'text' && (section.content as any).heading && (
                    <p className="text-xs text-gray-400 truncate">{(section.content as any).heading}</p>
                  )}
                  {section.type === 'hero' && (
                    <p className="text-xs text-gray-400 truncate">{(section.content as any).heading}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => moveSection(index, -1)}
                    disabled={index === 0}
                    className="p-1.5 text-gray-300 hover:text-gray-600 disabled:opacity-30 transition-colors rounded"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveSection(index, 1)}
                    disabled={index === sections.length - 1}
                    className="p-1.5 text-gray-300 hover:text-gray-600 disabled:opacity-30 transition-colors rounded"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteSection(section.id)}
                    className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded ml-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ml-1 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Expanded editor */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-4 bg-gray-50/30">
                  <SectionEditor
                    section={section}
                    onChange={(content) => updateSection(section.id, content)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add section button */}
      <button
        onClick={() => setShowAddPanel(true)}
        className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors text-sm font-medium flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Section
      </button>

      {/* Add section panel */}
      {showAddPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Add Section</h2>
              <button
                onClick={() => setShowAddPanel(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {SECTION_DEFS.map((def) => (
                <button
                  key={def.type}
                  onClick={() => addSection(def)}
                  className="flex items-center gap-3 p-4 border border-gray-100 rounded-xl hover:border-blue-200 hover:bg-blue-50 transition-colors text-left"
                >
                  <span className="text-2xl flex-shrink-0">{def.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{def.label}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
