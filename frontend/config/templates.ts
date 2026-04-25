export interface BusinessTemplate {
  type: string;
  serviceProfile: 'FOOD_SERVICE' | 'GENERAL_SERVICE';
  label: string;
  icon: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  gradient: string;
  menuLabel: string;
  defaultCurrency: string;
}

export const BUSINESS_TEMPLATES: BusinessTemplate[] = [
  {
    type: 'RESTAURANT',
    serviceProfile: 'FOOD_SERVICE',
    label: 'Food & Drink',
    icon: '🍽️',
    description: 'Restaurant, café, bakery, food truck — any food business with a menu',
    primaryColor: '#DC2626',
    secondaryColor: '#991B1B',
    gradient: 'from-red-600 to-red-900',
    menuLabel: 'View Menu',
    defaultCurrency: 'GBP',
  },
  {
    type: 'OTHER',
    serviceProfile: 'GENERAL_SERVICE',
    label: 'Other Business',
    icon: '🏢',
    description: 'Salon, barber, gym, repair shop, or any service business',
    primaryColor: '#6366F1',
    secondaryColor: '#4338CA',
    gradient: 'from-indigo-600 to-indigo-950',
    menuLabel: 'Our Services',
    defaultCurrency: 'GBP',
  },
];

export function getTemplate(type: string): BusinessTemplate {
  return BUSINESS_TEMPLATES.find((t) => t.type === type) ?? BUSINESS_TEMPLATES[BUSINESS_TEMPLATES.length - 1];
}
