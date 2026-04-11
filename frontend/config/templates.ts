export interface BusinessTemplate {
  type: string;
  label: string;
  icon: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  gradient: string; // Tailwind gradient classes
  menuLabel: string; // "View Menu" vs "Our Services"
  defaultCurrency: string;
}

export const BUSINESS_TEMPLATES: BusinessTemplate[] = [
  {
    type: 'RESTAURANT',
    label: 'Restaurant',
    icon: '🍽️',
    description: 'Full-service dining with menus, starters, mains & desserts',
    primaryColor: '#DC2626',
    secondaryColor: '#991B1B',
    gradient: 'from-red-600 to-red-900',
    menuLabel: 'View Menu',
    defaultCurrency: 'GBP',
  },
  {
    type: 'CAFE',
    label: 'Café',
    icon: '☕',
    description: 'Coffee shop with hot drinks, cold drinks & light bites',
    primaryColor: '#92400E',
    secondaryColor: '#78350F',
    gradient: 'from-amber-700 to-amber-950',
    menuLabel: 'View Menu',
    defaultCurrency: 'GBP',
  },
  {
    type: 'BARBER_SHOP',
    label: 'Barber Shop',
    icon: '✂️',
    description: 'Haircuts, beard services & grooming packages',
    primaryColor: '#1D4ED8',
    secondaryColor: '#1E3A8A',
    gradient: 'from-blue-600 to-blue-950',
    menuLabel: 'Our Menu',
    defaultCurrency: 'GBP',
  },
  {
    type: 'SALON',
    label: 'Salon',
    icon: '💅',
    description: 'Hair, nails & beauty treatments for everyone',
    primaryColor: '#BE185D',
    secondaryColor: '#9D174D',
    gradient: 'from-pink-600 to-pink-950',
    menuLabel: 'Our Menu',
    defaultCurrency: 'GBP',
  },
  {
    type: 'GYM',
    label: 'Gym & Fitness',
    icon: '💪',
    description: 'Memberships, personal training & group classes',
    primaryColor: '#EA580C',
    secondaryColor: '#C2410C',
    gradient: 'from-orange-600 to-orange-950',
    menuLabel: 'Our Menu',
    defaultCurrency: 'GBP',
  },
  {
    type: 'REPAIR_SHOP',
    label: 'Repair Shop',
    icon: '🔧',
    description: 'Repairs, diagnostics & technical services',
    primaryColor: '#475569',
    secondaryColor: '#1E293B',
    gradient: 'from-slate-600 to-slate-900',
    menuLabel: 'Our Menu',
    defaultCurrency: 'GBP',
  },
  {
    type: 'OTHER',
    label: 'Other Business',
    icon: '🏢',
    description: 'Any other business — start with a blank slate',
    primaryColor: '#6366F1',
    secondaryColor: '#4338CA',
    gradient: 'from-indigo-600 to-indigo-950',
    menuLabel: 'Our Menu',
    defaultCurrency: 'GBP',
  },
];

export function getTemplate(type: string): BusinessTemplate {
  return BUSINESS_TEMPLATES.find((t) => t.type === type) ?? BUSINESS_TEMPLATES[BUSINESS_TEMPLATES.length - 1];
}
