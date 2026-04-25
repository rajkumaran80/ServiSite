'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import ImageUpload from '../../../../components/ui/ImageUpload';
import { api } from '../../../../services/api';
import type { CmsPage, PageSection, SectionType } from '../../../../types/page.types';

// ─── Navigation interface ─────────────────────────────────────────────────
interface NavItem {
  id: string;
  label: string;
  linkType: string;
  href: string | null;
  pageId: string | null;
  featureKey: string | null;
  parentId: string | null;
  isSystemReserved: boolean;
  sortOrder: number;
  isActive: boolean;
  openInNewTab: boolean;
  children?: NavItem[];
  depth?: number;
}

interface FlatNavItem extends Omit<NavItem, 'children'> {
  depth: number;
}

function flattenNavTree(items: NavItem[], depth = 0): FlatNavItem[] {
  const result: FlatNavItem[] = [];
  for (const item of items) {
    const { children, ...rest } = item;
    result.push({ ...rest, depth });
    if (children?.length) result.push(...flattenNavTree(children, depth + 1));
  }
  return result;
}

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
  {
    type: 'data_table',
    label: 'Price / Service Table',
    icon: '📋',
    defaultContent: {
      heading: '',
      subheading: '',
      headers: ['Service', 'Price'],
      rows: [['', '']],
      striped: true,
      showBorder: false,
    },
  },
  {
    type: 'awards',
    label: 'Awards & Badges',
    icon: '🏆',
    defaultContent: {
      heading: '',
      awards: [
        { title: 'Good Food Award', subtitle: '4x Winner, Gold Seal' },
        { title: 'UK Top 50 Cafe', subtitle: 'Small Business Awards 2025' },
        { title: 'Food Hygiene', subtitle: '5/5 Maximum Rating' },
        { title: 'TripAdvisor', subtitle: '#1 in Sutton' },
        { title: 'Gary Eats', subtitle: '10/10 Rating' },
        { title: 'Time & Leisure', subtitle: 'Food & Culture 2025' },
      ],
    },
  },
  {
    type: 'social_media',
    label: 'Social Media Feed',
    icon: '📱',
    defaultContent: {
      heading: 'Latest from the Kitchen',
      subheading: 'Daily specials, new dishes, and behind-the-scenes moments.',
      platform: 'instagram',
      username: 'lacafesutton',
      profileUrl: 'https://www.instagram.com/lacafesutton/',
      profileImageUrl: '/images/logo-profile.jpg',
      backgroundColor: '#f5f5f4',
      showFollowButton: true,
      maxPosts: 6,
      refreshInterval: 60,
    },
  },
  {
    type: 'google_reviews',
    label: 'Customer Reviews',
    icon: '⭐',
    defaultContent: {
      heading: 'What Our Customers Say',
      subheading: 'Real reviews from our valued customers',
      maxReviews: 6,
      backgroundColor: '#f5f5f4',
      showRating: true,
      showWriteReviewButton: true,
      minRating: 4,
      platforms: { google: true, tripadvisor: true, facebook: true, instagram: true },
    },
  },
  {
    type: 'review_buttons',
    label: 'Review Buttons',
    icon: '👍',
    defaultContent: {
      heading: 'Leave Us a Review',
      subheading: 'Share your experience on popular review platforms',
      buttons: [
        {
          id: '1',
          label: 'Google',
          url: 'https://maps.google.com/maps/search/?api=1&query=Google+Reviews&query_place_id=YOUR_PLACE_ID',
          platform: 'google',
          order: 1,
        },
        {
          id: '2',
          label: 'Facebook',
          url: 'https://www.facebook.com/YOUR_PAGE/reviews',
          platform: 'facebook',
          order: 2,
        },
        {
          id: '3',
          label: 'TripAdvisor',
          url: 'https://www.tripadvisor.com/UserReviewEdit',
          platform: 'tripadvisor',
          order: 3,
        },
        {
          id: '4',
          label: 'Yelp',
          url: 'https://www.yelp.com/writeareview',
          platform: 'yelp',
          order: 4,
        },
      ],
      backgroundColor: '#f5f5f4',
      buttonStyle: 'default',
      columns: 2,
      showIcons: true,
    },
  },
  {
    type: 'image_only',
    label: 'Image Only',
    icon: '🖼️',
    defaultContent: {
      imageUrl: 'https://via.placeholder.com/800x600/000000/FFFFFF?text=Sample+Image',
      alt: 'Sample image',
      backgroundColor: '#f5f5f4',
      fit: 'contain',
      maxWidth: 1200,
      linkUrl: '',
      openInNewTab: true,
    },
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
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Image</label>
        <ImageUpload
          currentUrl={content.imageUrl || ''}
          mediaType="misc"
          onUpload={(url) => onChange({ ...content, imageUrl: url })}
          aspectRatio="free"
          maxSizeMB={5}
        />
      </div>
      
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
  const [showEmojiPickers, setShowEmojiPickers] = useState<{ [key: number]: boolean }>({});

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.emoji-picker-container')) {
        setShowEmojiPickers({});
      }
    };

    if (Object.values(showEmojiPickers).some(Boolean)) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmojiPickers]);

  const commonEmojis = ['⭐', '💡', '🚀', '🎯', '🔥', '💎', '🏆', '🎨', '🛡️', '⚡', '🌟', '✨', '🎪', '🎭', '🎪', '🎯', '🔧', '🔍', '📊', '📈', '🎯', '💼', '🌱', '🌿', '🍃', '🌊', '💧', '🔥', '❄️', '🌈', '☀️', '🌙', '⭐', '🌟', '✨', '💫', '🎆', '🎇', '🎈', '🎉', '🎊', '🎁', '🎀', '🏮', '🎐', '🎌', '🎏', '🎗️', '🎫', '🎟️', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🎸', '🎺', '🎻', '🥁', '🎲', '🎯', '🎳', '🎮', '🎰', '🧩', '🎁', '🎀', '🎈', '🎉', '🎊', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🎸', '🎺', '🎻', '🥁', '🎲', '🎯', '🎳', '🎮', '🎰', '🧩'];

  const updateFeature = (index: number, field: string, value: string) => {
    // Allow empty icon values
    const updated = features.map((f: any, i: number) => i === index ? { ...f, [field]: value } : f);
    onChange({ ...content, features: updated });
  };

  const selectEmoji = (index: number, emoji: string) => {
    updateFeature(index, 'icon', emoji);
    setShowEmojiPickers({ ...showEmojiPickers, [index]: false });
  };

  const toggleEmojiPicker = (index: number) => {
    setShowEmojiPickers({ ...showEmojiPickers, [index]: !showEmojiPickers[index] });
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
              <div className="flex items-center gap-2 relative emoji-picker-container">
                <button
                  type="button"
                  onClick={() => toggleEmojiPicker(index)}
                  className="w-12 h-8 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white hover:bg-gray-50 transition-colors"
                  title="Click to choose emoji"
                >
                  {feature.icon || '🌟'}
                </button>
                {showEmojiPickers[index] && (
                  <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 w-64">
                    <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => selectEmoji(index, '')}
                        className="w-6 h-6 text-xs hover:bg-gray-100 rounded flex items-center justify-center transition-colors border border-gray-300"
                        title="None"
                      >
                        None
                      </button>
                      {commonEmojis.map((emoji, emojiIndex) => (
                        <button
                          key={emojiIndex}
                          type="button"
                          onClick={() => selectEmoji(index, emoji)}
                          className="w-6 h-6 text-sm hover:bg-gray-100 rounded flex items-center justify-center transition-colors"
                          title={emoji}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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

function DataTableEditor({ content, onChange }: { content: any; onChange: (c: any) => void }) {
  const headers: string[] = content.headers || [];
  const rows: string[][] = content.rows || [];

  const updateHeader = (ci: number, value: string) => {
    const updated = headers.map((h, i) => (i === ci ? value : h));
    onChange({ ...content, headers: updated });
  };

  const addColumn = () => {
    onChange({
      ...content,
      headers: [...headers, ''],
      rows: rows.map((row) => [...row, '']),
    });
  };

  const removeColumn = (ci: number) => {
    if (headers.length <= 1) return;
    onChange({
      ...content,
      headers: headers.filter((_, i) => i !== ci),
      rows: rows.map((row) => row.filter((_, i) => i !== ci)),
    });
  };

  const addRow = () => {
    onChange({ ...content, rows: [...rows, headers.map(() => '')] });
  };

  const removeRow = (ri: number) => {
    onChange({ ...content, rows: rows.filter((_, i) => i !== ri) });
  };

  const updateCell = (ri: number, ci: number, value: string) => {
    const updated = rows.map((row, i) =>
      i === ri ? row.map((cell, j) => (j === ci ? value : cell)) : row,
    );
    onChange({ ...content, rows: updated });
  };

  return (
    <div className="space-y-3">
      <FieldInput label="Section Heading" value={content.heading || ''} onChange={(v) => onChange({ ...content, heading: v })} />
      <FieldInput label="Subheading" value={content.subheading || ''} onChange={(v) => onChange({ ...content, subheading: v })} />

      {/* Options */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={!!content.striped}
            onChange={(e) => onChange({ ...content, striped: e.target.checked })}
            className="rounded"
          />
          Striped rows
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={!!content.showBorder}
            onChange={(e) => onChange({ ...content, showBorder: e.target.checked })}
            className="rounded"
          />
          Show border
        </label>
      </div>

      {/* Column headers */}
      <div className="border-t border-gray-100 pt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-gray-600">Columns</p>
          <button onClick={addColumn} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Column</button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {headers.map((h, ci) => (
            <div key={ci} className="flex items-center gap-1 bg-gray-50 rounded-lg px-2 py-1">
              <input
                type="text"
                value={h}
                onChange={(e) => updateHeader(ci, e.target.value)}
                className="text-xs border-none bg-transparent focus:outline-none w-24"
                placeholder={`Column ${ci + 1}`}
              />
              {headers.length > 1 && (
                <button onClick={() => removeColumn(ci)} className="text-gray-300 hover:text-red-400 transition-colors">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Rows */}
      <div className="border-t border-gray-100 pt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-gray-600">Rows</p>
          <button onClick={addRow} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Row</button>
        </div>
        <div className="space-y-2">
          {rows.map((row, ri) => (
            <div key={ri} className="flex items-center gap-2">
              {row.map((cell, ci) => (
                <input
                  key={ci}
                  type="text"
                  value={cell}
                  onChange={(e) => updateCell(ri, ci, e.target.value)}
                  className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={headers[ci] || `Col ${ci + 1}`}
                />
              ))}
              <button onClick={() => removeRow(ri)} className="flex-shrink-0 p-1.5 text-gray-300 hover:text-red-500 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">No rows yet — click + Add Row</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AwardsEditor({ content, onChange }: { content: any; onChange: (c: any) => void }) {
  const awards: any[] = content.awards || [];

  const updateAward = (index: number, field: 'title' | 'subtitle', value: string) => {
    const updated = awards.map((award, i) => 
      i === index ? { ...award, [field]: value } : award
    );
    onChange({ ...content, awards: updated });
  };

  const addAward = () => {
    onChange({ ...content, awards: [...awards, { title: '', subtitle: '' }] });
  };

  const removeAward = (index: number) => {
    onChange({ ...content, awards: awards.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <FieldInput
        label="Section Heading (Optional)"
        value={content.heading || ''}
        onChange={(v) => onChange({ ...content, heading: v })}
        hint="Optional heading for the awards section"
      />

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700">Awards & Badges</p>
          <button onClick={addAward} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Award</button>
        </div>
        
        <div className="space-y-3">
          {awards.map((award, index) => (
            <div key={index} className="bg-gray-50 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">Award #{index + 1}</span>
                <button onClick={() => removeAward(index)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <FieldInput
                label="Award Title"
                value={award.title || ''}
                onChange={(v) => updateAward(index, 'title', v)}
                hint="e.g., Good Food Award"
              />
              <FieldInput
                label="Subtitle (Optional)"
                value={award.subtitle || ''}
                onChange={(v) => updateAward(index, 'subtitle', v)}
                hint="e.g., 4x Winner, Gold Seal"
              />
            </div>
          ))}
          
          {awards.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">No awards yet — click + Add Award</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SocialMediaEditor({ content, onChange }: { content: any; onChange: (c: any) => void }) {
  return (
    <div className="space-y-4">
      <FieldInput
        label="Section Heading"
        value={content.heading || ''}
        onChange={(v) => onChange({ ...content, heading: v })}
        hint="e.g., Latest from the Kitchen"
      />

      <FieldInput
        label="Subheading"
        value={content.subheading || ''}
        onChange={(v) => onChange({ ...content, subheading: v })}
        hint="e.g., Daily specials, new dishes, and behind-the-scenes moments."
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Platform</label>
          <select
            value={content.platform || 'instagram'}
            onChange={(e) => onChange({ ...content, platform: e.target.value })}
            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
          </select>
        </div>
        <FieldInput
          label="Username"
          value={content.username || ''}
          onChange={(v) => onChange({ ...content, username: v })}
          hint="e.g., lacafesutton"
        />
      </div>

      <FieldInput
        label="Profile URL"
        value={content.profileUrl || ''}
        onChange={(v) => onChange({ ...content, profileUrl: v })}
        hint="e.g., https://www.instagram.com/lacafesutton/"
      />

      <FieldInput
        label="Profile Image URL"
        value={content.profileImageUrl || ''}
        onChange={(v) => onChange({ ...content, profileImageUrl: v })}
        hint="Optional: e.g., /images/logo-profile.jpg"
      />

      <div className="grid grid-cols-2 gap-3">
        <FieldInput
          label="Background Color"
          value={content.backgroundColor || '#f5f5f4'}
          onChange={(v) => onChange({ ...content, backgroundColor: v })}
          hint="e.g., #f5f5f4"
        />
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Max Posts</label>
          <input
            type="number"
            min="1"
            max="12"
            value={content.maxPosts || 6}
            onChange={(e) => onChange({ ...content, maxPosts: parseInt(e.target.value) || 6 })}
            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="showFollowButton"
          checked={content.showFollowButton !== false}
          onChange={(e) => onChange({ ...content, showFollowButton: e.target.checked })}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="showFollowButton" className="text-xs text-gray-700">Show Follow Button</label>
      </div>

      {/* Live Feed Info */}
      <div className="border-t pt-4">
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-sm font-medium text-blue-900 mb-2">Live Feed Integration</p>
          <p className="text-xs text-blue-700 mb-3">
            This section automatically pulls posts from your connected social media accounts. 
            Connect your accounts in Dashboard Settings to display live posts.
          </p>
          <div className="bg-white rounded-lg p-2 border border-blue-200">
            <p className="text-xs text-blue-800">
              <strong>To set up:</strong><br/>
              1. Go to Dashboard Settings → Social<br/>
              2. Connect your Instagram and/or Facebook accounts<br/>
              3. Posts will automatically appear here
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const REVIEW_PLATFORMS = [
  { value: 'google',      label: 'Google' },
  { value: 'tripadvisor', label: 'TripAdvisor' },
  { value: 'facebook',    label: 'Facebook' },
  { value: 'instagram',   label: 'Instagram' },
  { value: 'other',       label: 'Other' },
] as const;

function GoogleReviewsEditor({ content, onChange }: { content: any; onChange: (c: any) => void }) {
  const manualReviews: any[] = content.manualReviews || [];

  const addManualReview = () => {
    const newReview = {
      id: `review_${Date.now()}`,
      authorName: '',
      rating: 5,
      text: '',
      platform: 'google',
      time: '',
      profilePhotoUrl: '',
      reviewUrl: '',
    };
    onChange({ ...content, manualReviews: [...manualReviews, newReview] });
  };

  const updateManualReview = (index: number, field: string, value: any) => {
    const updated = manualReviews.map((r, i) => i === index ? { ...r, [field]: value } : r);
    onChange({ ...content, manualReviews: updated });
  };

  const removeManualReview = (index: number) => {
    onChange({ ...content, manualReviews: manualReviews.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <FieldInput
        label="Section Heading"
        value={content.heading || ''}
        onChange={(v) => onChange({ ...content, heading: v })}
        hint="e.g., What Our Customers Say"
      />

      <FieldInput
        label="Subheading"
        value={content.subheading || ''}
        onChange={(v) => onChange({ ...content, subheading: v })}
        hint="e.g., Real reviews from our valued customers"
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Max Reviews</label>
          <input
            type="number"
            min="1"
            max="20"
            value={content.maxReviews || 6}
            onChange={(e) => onChange({ ...content, maxReviews: parseInt(e.target.value) || 6 })}
            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Minimum Rating</label>
          <select
            value={content.minRating || 4}
            onChange={(e) => onChange({ ...content, minRating: parseInt(e.target.value) })}
            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1">All Reviews</option>
            <option value="2">2+ Stars</option>
            <option value="3">3+ Stars</option>
            <option value="4">4+ Stars</option>
            <option value="5">5 Stars Only</option>
          </select>
        </div>
      </div>

      <FieldInput
        label="Background Color"
        value={content.backgroundColor || '#f5f5f4'}
        onChange={(v) => onChange({ ...content, backgroundColor: v })}
        hint="e.g., #f5f5f4"
      />

      {/* Google Reviews Toggle */}
      <div className="border-t pt-4">
        <div className="bg-blue-50 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-blue-900">Google Reviews Control</p>
              <p className="text-xs text-blue-700">Turn off Google reviews if they're incorrect or outdated</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={content.platforms?.google !== false}
                onChange={(e) => onChange({ ...content, platforms: { ...content.platforms, google: e.target.checked } })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          {!content.platforms?.google && (
            <p className="text-xs text-blue-600 mt-2">⚠️ Google reviews are currently hidden from visitors</p>
          )}
        </div>
      </div>

      {/* Other Platform Toggles */}
      <div className="border-t pt-4">
        <p className="text-xs font-medium text-gray-600 mb-2">Other Review Platforms</p>
        <p className="text-xs text-gray-400 mb-3">Show "Add a Review" buttons for these platforms using URLs from Social settings.</p>
        <div className="space-y-2">
          {([
            { key: 'tripadvisor', label: 'TripAdvisor', color: 'text-green-600' },
            { key: 'facebook',    label: 'Facebook',    color: 'text-indigo-600' },
            { key: 'instagram',   label: 'Instagram',   color: 'text-pink-600' },
          ] as const).map(({ key, label, color }) => (
            <div key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`platform-${key}`}
                checked={!!content.platforms?.[key]}
                onChange={(e) => onChange({ ...content, platforms: { ...content.platforms, [key]: e.target.checked } })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor={`platform-${key}`} className={`text-xs font-medium ${color}`}>{label}</label>
            </div>
          ))}
        </div>
      </div>

      {/* Manual Reviews */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-gray-700">Manual Reviews</p>
            <p className="text-xs text-gray-400 mt-0.5">Add reviews from any platform manually. These show alongside auto-fetched Google reviews.</p>
          </div>
          <button onClick={addManualReview} className="text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap">+ Add Review</button>
        </div>

        <div className="space-y-3">
          {manualReviews.map((review, index) => (
            <div key={review.id || index} className="bg-gray-50 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">Review #{index + 1}</span>
                <button onClick={() => removeManualReview(index)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <FieldInput
                  label="Author Name"
                  value={review.authorName || ''}
                  onChange={(v) => updateManualReview(index, 'authorName', v)}
                />
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Platform</label>
                  <select
                    value={review.platform || 'google'}
                    onChange={(e) => updateManualReview(index, 'platform', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {REVIEW_PLATFORMS.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Rating</label>
                  <select
                    value={review.rating || 5}
                    onChange={(e) => updateManualReview(index, 'rating', parseInt(e.target.value))}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="5">★★★★★ 5 stars</option>
                    <option value="4">★★★★☆ 4 stars</option>
                    <option value="3">★★★☆☆ 3 stars</option>
                    <option value="2">★★☆☆☆ 2 stars</option>
                    <option value="1">★☆☆☆☆ 1 star</option>
                  </select>
                </div>
                <FieldInput
                  label="Date / Time"
                  value={review.time || ''}
                  onChange={(v) => updateManualReview(index, 'time', v)}
                  hint='e.g., "2 months ago"'
                />
              </div>

              <FieldTextarea
                label="Review Text"
                value={review.text || ''}
                onChange={(v) => updateManualReview(index, 'text', v)}
                rows={3}
              />

              <FieldInput
                label="Profile Photo URL (optional)"
                value={review.profilePhotoUrl || ''}
                onChange={(v) => updateManualReview(index, 'profilePhotoUrl', v)}
              />

              <FieldInput
                label="Review URL (optional)"
                value={review.reviewUrl || ''}
                onChange={(v) => updateManualReview(index, 'reviewUrl', v)}
                hint="Link to the original review"
              />
            </div>
          ))}

          {manualReviews.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-3">No manual reviews yet — click + Add Review</p>
          )}
        </div>
      </div>

    </div>
  );
}

function ReviewButtonsEditor({ content, onChange }: { content: any; onChange: (c: any) => void }) {
  const buttons: any[] = content.buttons || [];

  const updateButton = (index: number, field: string, value: any) => {
    const updated = buttons.map((button, i) => 
      i === index ? { ...button, [field]: value } : button
    );
    onChange({ ...content, buttons: updated });
  };

  const addButton = () => {
    onChange({ 
      ...content, 
      buttons: [...buttons, { 
        id: `button_${Date.now()}`, 
        label: '', 
        url: '',
        platform: '',
        order: buttons.length + 1
      }] 
    });
  };

  const removeButton = (index: number) => {
    onChange({ ...content, buttons: buttons.filter((_, i) => i !== index) });
  };

  const moveButton = (index: number, direction: 'up' | 'down') => {
    const newButtons = [...buttons];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < buttons.length) {
      [newButtons[index], newButtons[newIndex]] = [newButtons[newIndex], newButtons[index]];
      onChange({ ...content, buttons: newButtons });
    }
  };

  const platforms = [
    'google', 'facebook', 'instagram', 'tripadvisor', 'yelp', 'zomato', 'opentable', 'foursquare'
  ];

  return (
    <div className="space-y-4">
      <FieldInput
        label="Section Heading"
        value={content.heading || ''}
        onChange={(v) => onChange({ ...content, heading: v })}
        hint="e.g., Leave Us a Review"
      />

      <FieldInput
        label="Subheading"
        value={content.subheading || ''}
        onChange={(v) => onChange({ ...content, subheading: v })}
        hint="e.g., Share your experience on popular review platforms"
      />

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Button Style</label>
          <select
            value={content.buttonStyle || 'default'}
            onChange={(e) => onChange({ ...content, buttonStyle: e.target.value })}
            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="default">Default</option>
            <option value="rounded">Rounded</option>
            <option value="outlined">Outlined</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Columns</label>
          <select
            value={content.columns || 2}
            onChange={(e) => onChange({ ...content, columns: parseInt(e.target.value) })}
            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1">1 Column</option>
            <option value="2">2 Columns</option>
            <option value="3">3 Columns</option>
            <option value="4">4 Columns</option>
          </select>
        </div>
        <div className="flex items-center gap-2 pt-4">
          <input
            type="checkbox"
            id="showIcons"
            checked={content.showIcons !== false}
            onChange={(e) => onChange({ ...content, showIcons: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="showIcons" className="text-xs text-gray-700">Show Icons</label>
        </div>
      </div>

      <FieldInput
        label="Background Color"
        value={content.backgroundColor || '#f5f5f4'}
        onChange={(v) => onChange({ ...content, backgroundColor: v })}
        hint="e.g., #f5f5f4"
      />

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700">Review Buttons</p>
          <button onClick={addButton} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Button</button>
        </div>
        
        <div className="space-y-3">
          {buttons.map((button, index) => (
            <div key={button.id || index} className="bg-gray-50 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">Button #{index + 1}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveButton(index, 'up')}
                    disabled={index === 0}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed p-1"
                    title="Move up"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveButton(index, 'down')}
                    disabled={index === buttons.length - 1}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed p-1"
                    title="Move down"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button onClick={() => removeButton(index)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <FieldInput
                  label="Label"
                  value={button.label || ''}
                  onChange={(v) => updateButton(index, 'label', v)}
                  hint="e.g., Google Reviews"
                />
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Platform</label>
                  <select
                    value={button.platform || ''}
                    onChange={(e) => updateButton(index, 'platform', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Custom</option>
                    {platforms.map(platform => (
                      <option key={platform} value={platform}>{platform.charAt(0).toUpperCase() + platform.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <FieldInput
                label="Review URL"
                value={button.url || ''}
                onChange={(v) => updateButton(index, 'url', v)}
                hint="Direct link to leave a review"
              />

              <FieldInput
                label="Custom Icon URL (optional)"
                value={button.imageUrl || ''}
                onChange={(v) => updateButton(index, 'imageUrl', v)}
                hint="Custom icon image URL"
              />

              <FieldInput
                label="Button Color (optional)"
                value={button.color || ''}
                onChange={(v) => updateButton(index, 'color', v)}
                hint="e.g., #1877F2 (uses primary color if empty)"
              />

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Order</label>
                <input
                  type="number"
                  min="1"
                  value={button.order || index + 1}
                  onChange={(e) => updateButton(index, 'order', parseInt(e.target.value) || index + 1)}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ))}
          
          {buttons.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">No buttons yet — click + Add Button</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ImageOnlyEditor({ content, onChange }: { content: any; onChange: (c: any) => void }) {
  return (
    <div className="space-y-4">
      <FieldInput
        label="Image URL"
        value={content.imageUrl || ''}
        onChange={(v) => onChange({ ...content, imageUrl: v })}
        hint="URL of the image to display"
      />

      <FieldInput
        label="Alt Text"
        value={content.alt || ''}
        onChange={(v) => onChange({ ...content, alt: v })}
        hint="Descriptive text for accessibility and SEO"
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Image Fit</label>
          <select
            value={content.fit || 'contain'}
            onChange={(e) => onChange({ ...content, fit: e.target.value })}
            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="contain">Contain (show full image)</option>
            <option value="cover">Cover (fill container)</option>
            <option value="fill">Fill (stretch to fit)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Max Width (px)</label>
          <input
            type="number"
            min="100"
            max="2000"
            step="100"
            value={content.maxWidth || 1200}
            onChange={(e) => onChange({ ...content, maxWidth: parseInt(e.target.value) || 1200 })}
            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">Max width for non-portrait images</p>
        </div>
      </div>

      <FieldInput
        label="Background Color"
        value={content.backgroundColor || '#f5f5f4'}
        onChange={(v) => onChange({ ...content, backgroundColor: v })}
        hint="e.g., #f5f5f4 or transparent"
      />

      <div className="border-t pt-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Link Options (optional)</p>
        
        <FieldInput
          label="Link URL"
          value={content.linkUrl || ''}
          onChange={(v) => onChange({ ...content, linkUrl: v })}
          hint="URL to open when image is clicked"
        />

        {content.linkUrl && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="openInNewTab"
              checked={content.openInNewTab !== false}
              onChange={(e) => onChange({ ...content, openInNewTab: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="openInNewTab" className="text-xs text-gray-700">Open in new tab</label>
          </div>
        )}
      </div>

      {/* Image Display Info */}
      <div className="border-t pt-4">
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-sm font-medium text-blue-900 mb-2">Smart Image Display</p>
          <p className="text-xs text-blue-700 mb-3">
            This section automatically adjusts the image layout based on its orientation:
          </p>
          <div className="bg-white rounded-lg p-2 border border-blue-200">
            <p className="text-xs text-blue-800">
              <strong>Layout Rules:</strong><br/>
              • <strong>Portrait</strong> (taller than wide): Full width, centered<br/>
              • <strong>Vertical</strong> (significantly tall): With gaps on both sides<br/>
              • <strong>Landscape</strong> (wider than tall): Standard container with gaps
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionEditor({ section, onChange }: { section: PageSection; onChange: (content: any) => void }) {
  switch (section.type) {
    case 'hero': return <HeroEditor content={section.content} onChange={onChange} />;
    case 'text': return <TextEditor content={section.content} onChange={onChange} />;
    case 'image_text': return <ImageTextEditor content={section.content} onChange={onChange} />;
    case 'features': return <FeaturesEditor content={section.content} onChange={onChange} />;
    case 'cta': return <CtaEditor content={section.content} onChange={onChange} />;
    case 'contact_info': return <ContactInfoEditor content={section.content} onChange={onChange} />;
    case 'divider': return <DividerEditor content={section.content} onChange={onChange} />;
    case 'data_table': return <DataTableEditor content={section.content} onChange={onChange} />;
    case 'awards': return <AwardsEditor content={section.content} onChange={onChange} />;
    case 'social_media': return <SocialMediaEditor content={section.content} onChange={onChange} />;
    case 'google_reviews': return <GoogleReviewsEditor content={section.content} onChange={onChange} />;
    case 'review_buttons': return <ReviewButtonsEditor content={section.content} onChange={onChange} />;
    case 'image_only': return <ImageOnlyEditor content={section.content} onChange={onChange} />;
    case 'gallery': return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="font-medium text-amber-800">Gallery Section (Deprecated)</span>
        </div>
        <p className="text-sm text-amber-700 mb-3">
          Gallery sections are no longer supported. Please use the Gallery dashboard instead.
        </p>
        <button
          onClick={() => {
            // This section will be handled by the parent component
            console.log('Gallery section should be removed');
          }}
          className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          Gallery Section Deprecated
        </button>
      </div>
    );
    default: return null;
  }
}

export default function PageBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const pageId = params.id as string;

  const [page, setPage] = useState<CmsPage | null>(null);
  const [sections, setSections] = useState<PageSection[]>([]);
  const [title, setTitle] = useState('');
  const [navItems, setNavItems] = useState<FlatNavItem[]>([]);
  const [selectedParent, setSelectedParent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);

  const load = useCallback(async () => {
    try {
      // Special handling for home page
      if (pageId === 'home') {
        const [homeRes, navRes] = await Promise.all([
          api.get('/tenant/current/home-sections'),
          api.get('/navigation/admin')
        ]);

        const homeSections = homeRes.data.data || [];
        const flatNavItems = flattenNavTree(navRes.data.data || []);
        
        const homePage: CmsPage = {
          id: 'home',
          title: 'Home',
          slug: '',
          sections: homeSections,
          isPublished: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tenantId: '',
          isHomePage: true
        };
        
        setPage(homePage);
        setTitle(homePage.title);
        setSections(homeSections);
        setNavItems(flatNavItems);
        setSelectedParent(''); // Home page has no parent
        setIsLoading(false);
        return;
      }

      const [pagesRes, navRes] = await Promise.all([
        api.get('/pages/admin'),
        api.get('/navigation/admin')
      ]);

      const found = pagesRes.data.data?.find((p: CmsPage) => p.id === pageId);
      if (!found) {
        toast.error('Page not found');
        router.push('/dashboard/pages');
        return;
      }

      // Find navigation item for this page
      const flatNavItems = flattenNavTree(navRes.data.data || []);
      const currentNavItems = flatNavItems.filter((item: NavItem) => item.pageId === pageId);
      const currentNavItem = currentNavItems[0];

      setPage(found);
      setTitle(found.title);
      setSections(found.sections || []);
      setNavItems(flatNavItems);
      setSelectedParent(currentNavItem?.parentId || '');
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
      // Special handling for home page
      if (pageId === 'home') {
        // Save home page sections to tenant settings
        const reordered = sections.map((s, i) => ({ ...s, order: i }));
        await api.put('/tenant/current/home-sections', { sections: reordered });
        
        // Invalidate Next.js cache for home sections
        try {
          // Get current tenant slug from the page URL or API
          const currentSlug = window.location.hostname.split('.')[0]; // Extract from subdomain
          await fetch('/api/revalidate', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-revalidate-secret': process.env.NEXT_PUBLIC_REVALIDATE_SECRET || 'development-secret'
            },
            body: JSON.stringify({ 
              slug: currentSlug,
              tags: ['home-sections']
            }),
          });
        } catch (error) {
          console.warn('Failed to revalidate cache:', error);
        }
        
        setSections(reordered);
        setHasChanges(false);
        toast.success('Home page updated successfully');
        setIsSaving(false);
        return;
      }

      // Save page content
      const reordered = sections.map((s, i) => ({ ...s, order: i }));
      await api.put(`/pages/${pageId}`, { title, sections: reordered });
      setSections(reordered);

      // Handle navigation parent changes
      const currentNavItems = navItems.filter((item: NavItem) => item.pageId === pageId);
      const currentNavItem = currentNavItems[0];
      
      if (selectedParent && currentNavItems.length === 0) {
        // Create new navigation item only if none exists
        await api.post('/navigation', {
          label: title,
          linkType: 'CUSTOM_PAGE',
          pageId: pageId,
          parentId: selectedParent,
          isActive: true,
          openInNewTab: false,
        });
        toast.success('Page saved and added to navigation');
      } else if (!selectedParent && currentNavItems.length > 0) {
        // Remove all navigation items for this page
        await Promise.all(currentNavItems.map(item => api.delete(`/navigation/${item.id}`)));
        toast.success('Page saved and removed from navigation');
      } else if (selectedParent && currentNavItems.length > 0) {
        // Update the first navigation item and delete duplicates
        const firstItem = currentNavItems[0];
        const duplicates = currentNavItems.slice(1);
        
        // Update the first item if needed
        if (firstItem.parentId !== selectedParent || firstItem.label !== title) {
          await api.put(`/navigation/${firstItem.id}`, {
            label: title,
            parentId: selectedParent,
          });
        }
        
        // Delete duplicate items
        if (duplicates.length > 0) {
          await Promise.all(duplicates.map(item => api.delete(`/navigation/${item.id}`)));
          toast.success('Page saved and navigation updated (duplicates removed)');
        } else {
          toast.success('Page saved and navigation updated');
        }
      } else {
        toast.success('Page saved');
      }

      // Reload navigation items
      const navRes = await api.get('/navigation/admin');
      const newFlatNavItems = flattenNavTree(navRes.data.data || []);

      // Find the updated navigation item for this page
      const updatedNavItem = newFlatNavItems.find((item: NavItem) => item.pageId === pageId);

      setNavItems(newFlatNavItems);
      setSelectedParent(updatedNavItem?.parentId || '');
      
      setHasChanges(false);
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
    setSections((prev) => prev.map((s) => s.id === id ? { ...s, content: content } : s));
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

// Filter out gallery sections from the available section types
const AVAILABLE_SECTION_DEFS = SECTION_DEFS.filter(def => def.type !== 'gallery');

  const handleParentChange = (newParent: string) => {
    setSelectedParent(newParent);
    setHasChanges(true);
  };

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

      {/* Navigation Parent Selection */}
      {pageId !== 'home' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-900">Navigation Parent</h3>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Add to Navigation <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <select
              value={selectedParent}
              onChange={(e) => handleParentChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Don't add to navigation</option>
              {navItems
                .filter(item => (item.depth || 0) < 2) // Allow nesting up to 3 levels (depth 0, 1, 2)
                .map(item => (
                  <option key={item.id} value={item.id}>
                    {'  '.repeat(item.depth || 0) + `Under "${item.label}"`} {(item.depth || 0) > 0 && `(L${(item.depth || 0) + 1})`}
                  </option>
                ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Choose a parent navigation item to place this page under</p>
          </div>
        </div>
      )}

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
              {AVAILABLE_SECTION_DEFS.map((def) => (
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
