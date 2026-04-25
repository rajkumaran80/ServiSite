'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { api } from '../../../services/api';
import type { CmsPage } from '../../../types/page.types';

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

export default function PagesListPage() {
  const router = useRouter();
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [navItems, setNavItems] = useState<FlatNavItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Gallery and Contact have dedicated dashboards — exclude from the page builder list
  const filteredPages = pages.filter(page => page.slug !== 'gallery' && page.slug !== 'contact');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [selectedParent, setSelectedParent] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    try {
      const [pagesRes, navRes] = await Promise.all([
        api.get('/pages/admin'),
        api.get('/navigation')
      ]);
      const pages = pagesRes.data.data || [];
      
      // Fetch home page sections
      let homeSections: any[] = [];
      try {
        const homeRes = await api.get('/tenant/current/home-sections');
        homeSections = homeRes.data.data || [];
      } catch {
        // If home sections endpoint fails, use empty array
        homeSections = [];
      }

      // Add home page as a special non-deletable page
      const homePage: CmsPage = {
        id: 'home',
        title: 'Home',
        slug: '',
        sections: homeSections,
        isPublished: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tenantId: '',
        isHomePage: true // Special flag to identify home page
      };
      
      setPages([homePage, ...pages]);
      const flatNavItems = flattenNavTree(navRes.data.data || []);
      setNavItems(flatNavItems);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const handleTitleChange = (v: string) => {
    setNewTitle(v);
    setNewSlug(slugify(v));
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newSlug.trim()) {
      toast.error('Title and slug are required');
      return;
    }
    setIsCreating(true);
    try {
      // Create the page first
      const pageRes = await api.post('/pages', { title: newTitle, slug: newSlug, sections: [], isPublished: true });
      const createdPage = pageRes.data.data;
      
      // If parent is selected, create navigation item
      if (selectedParent) {
        await api.post('/navigation', {
          label: newTitle,
          linkType: 'CUSTOM_PAGE',
          pageId: createdPage.id,
          parentId: selectedParent,
          isActive: true,
          openInNewTab: false,
        });
        toast.success('Page created and added to navigation');
      } else {
        toast.success('Page created');
      }
      
      setShowCreate(false);
      setNewTitle('');
      setNewSlug('');
      setSelectedParent('');
      load(); // Reload to get updated nav items
      router.push(`/dashboard/pages/${createdPage.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create page');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this page? This will also remove it from navigation if it exists. This cannot be undone.')) return;
    setDeletingId(id);
    try {
      // Find and delete navigation items that link to this page
      const navItemsForPage = navItems.filter(item => item.pageId === id);
      await Promise.all(navItemsForPage.map(item => api.delete(`/navigation/${item.id}`)));
      
      // Delete the page
      await api.delete(`/pages/${id}`);
      toast.success('Page deleted and removed from navigation');
      load();
    } catch {
      toast.error('Failed to delete page');
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
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pages</h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage custom pages for your website</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Page
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredPages.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="font-medium text-gray-500">No pages yet</p>
            <p className="text-sm mt-1">Create your first custom page to get started</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {filteredPages.map((page) => (
              <li key={page.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{page.title}</span>
                    {page.isHomePage && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Home</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 font-mono">{page.isHomePage ? '/' : `/${page.slug}`}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {page.sections.length} section{page.sections.length !== 1 ? 's' : ''}
                    {page.isHomePage && ' • System page'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => router.push(`/dashboard/pages/${page.id}`)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  {!page.isHomePage && (
                    <button
                      onClick={() => handleDelete(page.id)}
                      disabled={deletingId === page.id}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      {deletingId === page.id ? (
                        <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Create page modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Create New Page</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Page Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. About Us"
                  autoFocus
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                  <span className="px-3 py-2.5 bg-gray-50 text-gray-400 text-sm border-r border-gray-200">/</span>
                  <input
                    type="text"
                    value={newSlug}
                    onChange={(e) => setNewSlug(slugify(e.target.value))}
                    placeholder="about-us"
                    className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">This will be the URL: /{newSlug || 'slug'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Add to Navigation <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <select
                  value={selectedParent}
                  onChange={(e) => setSelectedParent(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowCreate(false); setNewTitle(''); setNewSlug(''); setSelectedParent(''); }}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {isCreating ? 'Creating…' : 'Create Page'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
