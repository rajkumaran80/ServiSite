'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Group {
  id: string;
  name: string;
  icon: string | null;
  servedFrom: string | null;
  servedUntil: string | null;
}

export default function MenuGroupsStrip({
  groups,
  tenantSlug,
}: {
  groups: Group[];
  tenantSlug: string;
}) {
  const pathname = usePathname();

  // Don't show on the menu page — it has its own tab bar
  if (pathname.endsWith('/menu') || pathname.includes('/menu?')) return null;
  if (groups.length === 0) return null;

  return (
    <div className="bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-2 overflow-x-auto py-3 scrollbar-none">
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/${tenantSlug}/menu?group=${group.id}`}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-300 text-sm font-medium text-gray-700 transition-colors"
            >
              {group.icon && <span className="text-base leading-none">{group.icon}</span>}
              <span>{group.name}</span>
              {group.servedFrom && group.servedUntil && (
                <span className="text-xs text-gray-400 font-normal hidden sm:inline">
                  {group.servedFrom}–{group.servedUntil}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
