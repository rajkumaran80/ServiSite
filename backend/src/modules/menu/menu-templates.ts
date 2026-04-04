import { TenantType } from '@prisma/client';

export interface SeedGroup {
  name: string;
  icon: string;
  servedFrom?: string;
  servedUntil?: string;
  categories: {
    name: string;
    items: { name: string; price: number; description?: string; isPopular?: boolean }[];
  }[];
}

export const MENU_TEMPLATE_DATA: Partial<Record<TenantType, SeedGroup[]>> = {

  // ─── RESTAURANT ────────────────────────────────────────────────────────────
  RESTAURANT: [
    {
      name: 'Starters',
      icon: '🥗',
      categories: [
        {
          name: 'Soups & Salads',
          items: [
            { name: 'Soup of the Day', price: 5.50, description: 'Served with crusty bread and butter' },
            { name: 'Caesar Salad', price: 7.95, description: 'Crisp romaine, parmesan, croutons & Caesar dressing', isPopular: true },
            { name: 'Mixed Leaf Salad', price: 6.50, description: 'House salad with balsamic vinaigrette' },
          ],
        },
        {
          name: 'Small Plates',
          items: [
            { name: 'Prawn Cocktail', price: 8.95, description: 'King prawns, Marie Rose sauce, brown bread', isPopular: true },
            { name: 'Chicken Wings', price: 8.50, description: 'Crispy wings with buffalo or BBQ sauce' },
            { name: 'Calamari', price: 8.95, description: 'Lightly fried squid with garlic aioli' },
            { name: 'Bruschetta', price: 6.50, description: 'Toasted sourdough, tomatoes, garlic, fresh basil' },
            { name: 'Garlic Bread', price: 4.50, description: 'Toasted ciabatta with garlic butter' },
          ],
        },
      ],
    },
    {
      name: 'Mains',
      icon: '🍽️',
      categories: [
        {
          name: 'From the Grill',
          items: [
            { name: 'Sirloin Steak 8oz', price: 25.95, description: 'Served with chips, tomato & mushroom', isPopular: true },
            { name: 'Ribeye Steak 10oz', price: 29.95, description: 'Richly marbled, full-flavoured cut with chips' },
            { name: 'Grilled Chicken Breast', price: 15.95, description: 'Herb-marinated chicken with roasted vegetables' },
            { name: 'Mixed Grill', price: 22.95, description: 'Sirloin, chicken, lamb chop, sausage & chips' },
          ],
        },
        {
          name: 'Fish & Seafood',
          items: [
            { name: 'Fish & Chips', price: 14.95, description: 'Beer-battered cod with chunky chips & mushy peas', isPopular: true },
            { name: 'Grilled Sea Bass', price: 18.95, description: 'Whole sea bass with lemon, herbs & seasonal veg' },
            { name: 'Salmon Fillet', price: 17.95, description: 'Pan-seared salmon with new potatoes & greens' },
          ],
        },
        {
          name: 'Burgers',
          items: [
            { name: 'Classic Beef Burger', price: 13.50, description: '6oz beef patty, lettuce, tomato, pickles, brioche bun & fries', isPopular: true },
            { name: 'Chicken Burger', price: 12.95, description: 'Crispy chicken, slaw, mayo, brioche bun & fries' },
            { name: 'Veggie Burger', price: 11.95, description: 'Plant-based patty, lettuce, tomato, relish & fries' },
          ],
        },
        {
          name: 'Vegetarian & Pasta',
          items: [
            { name: 'Vegetable Risotto', price: 12.95, description: 'Creamy Arborio rice with seasonal vegetables & parmesan' },
            { name: 'Mushroom Tagliatelle', price: 13.50, description: 'Wild mushrooms, garlic, cream sauce, fresh pasta' },
            { name: 'Aubergine Parmigiana', price: 13.50, description: 'Layered aubergine, tomato sauce & melted mozzarella' },
          ],
        },
      ],
    },
    {
      name: 'Pizza & Wraps',
      icon: '🍕',
      categories: [
        {
          name: 'Pizza',
          items: [
            { name: 'Margherita', price: 11.95, description: 'Tomato sauce, mozzarella, fresh basil', isPopular: true },
            { name: 'Pepperoni', price: 13.95, description: 'Tomato sauce, mozzarella, pepperoni', isPopular: true },
            { name: 'BBQ Chicken', price: 13.95, description: 'BBQ sauce, grilled chicken, red onion, mozzarella' },
            { name: 'Veggie Supreme', price: 12.95, description: 'Tomato sauce, mozzarella, mixed peppers, mushrooms, olives' },
          ],
        },
        {
          name: 'Wraps & Flatbreads',
          items: [
            { name: 'Chicken Caesar Wrap', price: 9.95, description: 'Grilled chicken, romaine, parmesan, Caesar dressing' },
            { name: 'Falafel Wrap', price: 8.95, description: 'Crispy falafel, hummus, salad, tahini sauce' },
            { name: 'Steak Wrap', price: 11.95, description: 'Sliced sirloin, caramelised onions, rocket, chimichurri' },
          ],
        },
      ],
    },
    {
      name: 'Sides',
      icon: '🥔',
      categories: [
        {
          name: 'Sides',
          items: [
            { name: 'Chunky Chips', price: 4.50 },
            { name: 'Skinny Fries', price: 4.50 },
            { name: 'Mashed Potato', price: 4.50, description: 'Butter & cream mash' },
            { name: 'Onion Rings', price: 4.50 },
            { name: 'Seasonal Vegetables', price: 4.50 },
            { name: 'Garden Salad', price: 4.95 },
            { name: 'Mac & Cheese', price: 5.95, isPopular: true },
            { name: 'Garlic-Roasted Mushrooms', price: 4.95 },
          ],
        },
      ],
    },
    {
      name: 'Desserts',
      icon: '🍮',
      categories: [
        {
          name: 'Sweet Treats',
          items: [
            { name: 'Chocolate Brownie', price: 6.50, description: 'Warm brownie with vanilla ice cream & chocolate sauce', isPopular: true },
            { name: 'New York Cheesecake', price: 6.50, description: 'Classic baked cheesecake with berry compote' },
            { name: 'Sticky Toffee Pudding', price: 6.50, description: 'Warm sponge, toffee sauce & clotted cream', isPopular: true },
            { name: 'Crème Brûlée', price: 6.95, description: 'Classic vanilla custard with caramelised sugar crust' },
            { name: 'Ice Cream (3 scoops)', price: 5.50, description: 'Choose from vanilla, chocolate or strawberry' },
            { name: 'Tiramisu', price: 6.50, description: 'Coffee-soaked sponge, mascarpone cream & cocoa' },
          ],
        },
      ],
    },
    {
      name: 'Drinks',
      icon: '🥤',
      categories: [
        {
          name: 'Soft Drinks',
          items: [
            { name: 'Coke / Diet Coke / Lemonade', price: 3.00 },
            { name: 'Fresh Orange Juice', price: 3.50 },
            { name: 'Still or Sparkling Water', price: 2.50 },
            { name: 'J2O / Elderflower', price: 3.00 },
          ],
        },
        {
          name: 'Beer & Cider',
          items: [
            { name: 'Draft Beer (pint)', price: 5.50, isPopular: true },
            { name: 'Draft Beer (half)', price: 3.00 },
            { name: 'Bottled Beer', price: 4.50 },
            { name: 'Cider (pint)', price: 5.50 },
          ],
        },
        {
          name: 'Wine',
          items: [
            { name: 'House Red (glass)', price: 5.95 },
            { name: 'House White (glass)', price: 5.95 },
            { name: 'Rosé (glass)', price: 6.50 },
            { name: 'Prosecco (glass)', price: 6.50, isPopular: true },
          ],
        },
        {
          name: 'Cocktails',
          items: [
            { name: 'Mojito', price: 9.95, isPopular: true },
            { name: 'Aperol Spritz', price: 9.50, isPopular: true },
            { name: 'Espresso Martini', price: 10.95 },
            { name: 'Old Fashioned', price: 10.50 },
          ],
        },
      ],
    },
  ],

  // ─── CAFE ──────────────────────────────────────────────────────────────────
  CAFE: [
    {
      name: 'Hot Drinks',
      icon: '☕',
      categories: [
        {
          name: 'Coffee',
          items: [
            { name: 'Espresso', price: 2.50 },
            { name: 'Double Espresso', price: 3.00 },
            { name: 'Americano', price: 2.80 },
            { name: 'Flat White', price: 3.20, isPopular: true },
            { name: 'Cappuccino', price: 3.20 },
            { name: 'Latte', price: 3.50, isPopular: true },
            { name: 'Mocha', price: 3.80 },
            { name: 'Cortado', price: 2.80 },
            { name: 'Macchiato', price: 2.80 },
          ],
        },
        {
          name: 'Tea',
          items: [
            { name: 'English Breakfast Tea', price: 2.50 },
            { name: 'Earl Grey', price: 2.50 },
            { name: 'Green Tea', price: 2.50 },
            { name: 'Peppermint Tea', price: 2.50 },
            { name: 'Chamomile Tea', price: 2.50 },
          ],
        },
        {
          name: 'Speciality Hot',
          items: [
            { name: 'Hot Chocolate', price: 3.50, isPopular: true },
            { name: 'Chai Latte', price: 3.80 },
            { name: 'Matcha Latte', price: 3.80 },
            { name: 'Turmeric Latte', price: 3.80 },
          ],
        },
      ],
    },
    {
      name: 'Cold Drinks',
      icon: '🧋',
      categories: [
        {
          name: 'Iced Coffee',
          items: [
            { name: 'Iced Latte', price: 3.80, isPopular: true },
            { name: 'Iced Americano', price: 3.20 },
            { name: 'Cold Brew', price: 3.50 },
            { name: 'Iced Mocha', price: 4.20 },
            { name: 'Iced Matcha Latte', price: 4.20 },
          ],
        },
        {
          name: 'Smoothies & Shakes',
          items: [
            { name: 'Fruit Smoothie', price: 4.50, description: 'Seasonal fruit blended to order', isPopular: true },
            { name: 'Banana & Peanut Butter Shake', price: 4.95 },
            { name: 'Berry Blast', price: 4.50 },
          ],
        },
        {
          name: 'Soft Drinks',
          items: [
            { name: 'Fresh Orange Juice', price: 3.50 },
            { name: 'Still Water', price: 1.80 },
            { name: 'Sparkling Water', price: 2.00 },
            { name: 'Canned Drink', price: 2.00, description: 'Coke, Diet Coke, Lemonade' },
          ],
        },
      ],
    },
    {
      name: 'Breakfast',
      icon: '🌅',
      servedFrom: '07:00',
      servedUntil: '11:30',
      categories: [
        {
          name: 'Full Breakfast',
          items: [
            { name: 'Full English Breakfast', price: 9.95, description: 'Eggs, bacon, sausage, beans, toast, tomato & mushroom', isPopular: true },
            { name: 'Vegetarian Breakfast', price: 9.50, description: 'Eggs, veggie sausage, beans, toast, tomato & mushroom' },
            { name: 'Eggs Benedict', price: 9.50, description: 'Poached eggs, ham, hollandaise on toasted muffin', isPopular: true },
            { name: 'Eggs Royale', price: 10.50, description: 'Poached eggs, smoked salmon, hollandaise on muffin' },
            { name: 'Smashed Avocado Toast', price: 7.50, description: 'Smashed avo, poached egg, sourdough, chilli flakes', isPopular: true },
          ],
        },
        {
          name: 'Lighter Breakfast',
          items: [
            { name: 'Scrambled Eggs on Toast', price: 6.50 },
            { name: 'Yoghurt & Granola', price: 5.95, description: 'Greek yoghurt, house granola, honey & fresh fruit' },
            { name: 'Overnight Oats', price: 5.95, description: 'Rolled oats, fruit compote, seeds & nut butter' },
            { name: 'Porridge', price: 4.50, description: 'Creamy oats with honey or jam' },
          ],
        },
      ],
    },
    {
      name: 'All Day Food',
      icon: '🥐',
      categories: [
        {
          name: 'Pastries & Bakes',
          items: [
            { name: 'Butter Croissant', price: 2.80, isPopular: true },
            { name: 'Pain au Chocolat', price: 3.20 },
            { name: 'Cinnamon Roll', price: 3.50 },
            { name: 'Blueberry Muffin', price: 2.80 },
            { name: 'Banana Bread', price: 3.00 },
            { name: 'Scone with Jam & Cream', price: 3.50 },
          ],
        },
        {
          name: 'Sandwiches & Toasties',
          items: [
            { name: 'BLT on Sourdough', price: 7.50, description: 'Smoked bacon, lettuce & tomato' },
            { name: 'Chicken & Avocado Wrap', price: 8.00, description: 'Grilled chicken, avocado, salad & sweet chilli' },
            { name: 'Tuna Melt Panini', price: 7.50, description: 'Tuna mayo, cheddar, toasted panini', isPopular: true },
            { name: 'Club Sandwich', price: 8.50, description: 'Chicken, bacon, egg, lettuce & mayo' },
            { name: 'Cheese & Ham Toastie', price: 6.50 },
          ],
        },
        {
          name: 'Light Bites',
          items: [
            { name: 'Soup of the Day & Roll', price: 6.50 },
            { name: 'Caesar Salad', price: 8.00 },
            { name: 'Quiche of the Day', price: 6.50, description: 'Served with mixed salad' },
          ],
        },
      ],
    },
  ],

  // ─── BARBER SHOP ───────────────────────────────────────────────────────────
  BARBER_SHOP: [
    {
      name: 'Haircuts',
      icon: '✂️',
      categories: [
        {
          name: "Men's Cuts",
          items: [
            { name: 'Classic Cut', price: 15, description: 'Scissor or clipper cut, styled to finish', isPopular: true },
            { name: 'Skin Fade', price: 20, description: 'Skin or zero fade with styled top', isPopular: true },
            { name: 'Taper Fade', price: 18, description: 'Natural taper blend with styled top' },
            { name: 'Crop & Drop', price: 18, description: 'Textured crop with faded sides' },
            { name: 'Crew Cut', price: 12, description: 'Short, clean clipper cut all over' },
            { name: 'Buzz Cut', price: 10, description: 'All-over clipper cut, one length' },
          ],
        },
        {
          name: 'Junior & Senior',
          items: [
            { name: "Kids Cut (under 12)", price: 10, description: 'Scissor or clipper, styled finish' },
            { name: 'Senior Cut (60+)', price: 12 },
          ],
        },
        {
          name: 'Hair Design',
          items: [
            { name: 'Hair Design / Pattern (add-on)', price: 5, description: 'Lines, shapes or logos added to any cut' },
            { name: 'Fringe Trim (walk-in)', price: 8 },
          ],
        },
      ],
    },
    {
      name: 'Beard',
      icon: '🧔',
      categories: [
        {
          name: 'Beard Services',
          items: [
            { name: 'Beard Trim & Shape', price: 12, description: 'Trimmed, shaped and defined to your style', isPopular: true },
            { name: 'Full Beard Style', price: 18, description: 'Full cut, shape & hot towel finish' },
            { name: 'Hot Towel Shave', price: 22, description: 'Traditional straight razor shave with hot towels & oils', isPopular: true },
            { name: 'Moustache Trim', price: 8 },
            { name: 'Beard Wash & Condition', price: 10, description: 'Deep cleanse, condition & oil treatment' },
          ],
        },
      ],
    },
    {
      name: 'Hair Treatments',
      icon: '💆',
      categories: [
        {
          name: 'Treatments',
          items: [
            { name: 'Scalp Treatment', price: 20, description: 'Exfoliation & nourishing scalp massage' },
            { name: 'Deep Conditioning Treatment', price: 15 },
            { name: 'Grey Coverage', price: 25, description: 'Root-to-tip colour for grey coverage' },
          ],
        },
      ],
    },
    {
      name: 'Packages',
      icon: '🎁',
      categories: [
        {
          name: 'Value Deals',
          items: [
            { name: 'Cut & Beard', price: 25, description: 'Classic cut + beard trim & shape', isPopular: true },
            { name: 'Full Groom', price: 35, description: 'Cut + hot towel shave + beard condition', isPopular: true },
            { name: 'VIP Package', price: 48, description: 'Cut + hot towel shave + scalp treatment + styling' },
            { name: 'Student Special', price: 14, description: 'Classic cut — valid with student ID' },
          ],
        },
      ],
    },
  ],

  // ─── SALON ─────────────────────────────────────────────────────────────────
  SALON: [
    {
      name: 'Hair Services',
      icon: '💇',
      categories: [
        {
          name: 'Cuts & Blow Dry',
          items: [
            { name: "Women's Cut & Blow Dry", price: 50, isPopular: true },
            { name: "Men's Cut", price: 22 },
            { name: "Children's Cut (under 12)", price: 18 },
            { name: 'Blow Dry Only', price: 28 },
            { name: 'Hair Up / Updo', price: 50, description: 'Special occasion styling' },
          ],
        },
        {
          name: 'Colour & Highlights',
          items: [
            { name: 'Root Touch Up', price: 55 },
            { name: 'Full Head Colour', price: 90, isPopular: true },
            { name: 'Half Head Highlights', price: 80, description: 'Foil highlights, half head' },
            { name: 'Full Head Highlights', price: 110 },
            { name: 'Balayage / Ombre', price: 135, description: 'Hand-painted gradient colour', isPopular: true },
            { name: 'Toner', price: 35 },
          ],
        },
        {
          name: 'Treatments',
          items: [
            { name: 'Keratin Smoothing Treatment', price: 120, description: 'Frizz-free, smooth hair for up to 12 weeks' },
            { name: 'Olaplex Treatment', price: 40, description: 'Bond-repair treatment for damaged hair' },
            { name: 'Deep Conditioning', price: 25 },
            { name: 'Scalp Treatment', price: 30 },
          ],
        },
      ],
    },
    {
      name: 'Nails',
      icon: '💅',
      categories: [
        {
          name: 'Manicure',
          items: [
            { name: 'Classic Manicure', price: 22 },
            { name: 'Gel Manicure', price: 35, isPopular: true },
            { name: 'Shellac Manicure', price: 38 },
            { name: 'Russian Manicure', price: 48 },
            { name: 'Gel Extensions (full set)', price: 55 },
            { name: 'Infill', price: 35 },
          ],
        },
        {
          name: 'Pedicure',
          items: [
            { name: 'Classic Pedicure', price: 28 },
            { name: 'Gel Pedicure', price: 42, isPopular: true },
            { name: 'Luxury Pedicure', price: 55, description: 'Exfoliation, scrub, massage & gel polish' },
          ],
        },
        {
          name: 'Nail Art',
          items: [
            { name: 'Nail Art (per nail)', price: 3 },
            { name: 'Full Set Nail Art', price: 25 },
            { name: 'Chrome / Foil (add-on)', price: 10 },
          ],
        },
      ],
    },
    {
      name: 'Lashes & Brows',
      icon: '👁️',
      categories: [
        {
          name: 'Lashes',
          items: [
            { name: 'Classic Lash Extensions', price: 55, isPopular: true },
            { name: 'Russian Volume Lashes', price: 70 },
            { name: 'Hybrid Lashes', price: 62 },
            { name: 'Lash Lift & Tint', price: 48, isPopular: true },
            { name: 'Lash Tint Only', price: 18 },
            { name: 'Lash Infill', price: 38 },
            { name: 'Lash Removal', price: 20 },
          ],
        },
        {
          name: 'Brows',
          items: [
            { name: 'Brow Shape & Wax', price: 14, isPopular: true },
            { name: 'Brow Tint', price: 14 },
            { name: 'Brow Wax & Tint', price: 22 },
            { name: 'Brow Lamination', price: 42 },
            { name: 'HD Brows', price: 48 },
            { name: 'Microblading (initial)', price: 280, description: 'Semi-permanent brow treatment' },
          ],
        },
      ],
    },
    {
      name: 'Skin & Beauty',
      icon: '✨',
      categories: [
        {
          name: 'Facials',
          items: [
            { name: 'Express Facial (30min)', price: 35 },
            { name: 'Classic Facial (60min)', price: 55, description: 'Deep cleanse, exfoliate, mask & moisturise', isPopular: true },
            { name: 'Anti-Ageing Facial', price: 75 },
            { name: 'Chemical Peel', price: 85 },
          ],
        },
        {
          name: 'Waxing',
          items: [
            { name: 'Eyebrow Wax', price: 12 },
            { name: 'Upper Lip Wax', price: 8 },
            { name: 'Half Leg Wax', price: 22 },
            { name: 'Full Leg Wax', price: 38 },
            { name: 'Underarm Wax', price: 15 },
            { name: 'Brazilian / Hollywood', price: 38, isPopular: true },
            { name: 'Full Body Wax', price: 90 },
          ],
        },
        {
          name: 'Tanning',
          items: [
            { name: 'Spray Tan (full body)', price: 32, isPopular: true },
          ],
        },
      ],
    },
    {
      name: 'Spa & Massage',
      icon: '💆',
      categories: [
        {
          name: 'Massage',
          items: [
            { name: 'Back, Neck & Shoulder (30min)', price: 38 },
            { name: 'Full Body Massage (60min)', price: 68, isPopular: true },
            { name: 'Hot Stone Massage (75min)', price: 85 },
            { name: 'Indian Head Massage (45min)', price: 42 },
          ],
        },
        {
          name: 'Pamper Packages',
          items: [
            { name: 'Mini Pamper', price: 65, description: 'Express facial + gel manicure' },
            { name: 'Pamper Package', price: 105, description: 'Classic facial + gel manicure + blow dry', isPopular: true },
            { name: 'Bride Package', price: 185, description: 'Hair up + lashes + gel nails + spray tan' },
          ],
        },
      ],
    },
  ],

  // ─── GYM ───────────────────────────────────────────────────────────────────
  GYM: [
    {
      name: 'Memberships',
      icon: '🏋️',
      categories: [
        {
          name: 'Standard Access',
          items: [
            { name: 'Day Pass', price: 8, description: 'Full gym access for one day' },
            { name: 'Monthly Membership', price: 35, description: 'Full gym access, all equipment, no contract' },
            { name: '3-Month Membership', price: 95, description: 'Full access — save vs monthly', isPopular: true },
            { name: '6-Month Membership', price: 175, description: 'Full access — save £35 vs monthly' },
            { name: 'Annual Membership', price: 299, description: 'Best value — save £121 vs monthly', isPopular: true },
          ],
        },
        {
          name: 'Concessions',
          items: [
            { name: 'Student Monthly', price: 22, description: 'Full access — valid student ID required' },
            { name: 'Senior Monthly (60+)', price: 22 },
            { name: 'Family Monthly (2 adults + 2 children)', price: 85 },
          ],
        },
        {
          name: 'Premium (includes classes)',
          items: [
            { name: 'Premium Monthly', price: 52, description: 'Full gym + unlimited classes' },
            { name: 'Premium Annual', price: 499, description: 'Full gym + unlimited classes — best value' },
          ],
        },
      ],
    },
    {
      name: 'Personal Training',
      icon: '💪',
      categories: [
        {
          name: '1-to-1 Sessions',
          items: [
            { name: 'Single PT Session (1hr)', price: 50 },
            { name: '5 PT Sessions', price: 230, description: 'Save £20 vs single sessions', isPopular: true },
            { name: '10 PT Sessions', price: 440, description: 'Save £60 vs single sessions' },
            { name: '20 PT Sessions', price: 840, description: 'Save £160 — best PT value' },
          ],
        },
        {
          name: 'Online & Remote',
          items: [
            { name: 'Online Coaching (monthly)', price: 65, description: 'Custom programme + weekly check-ins via app' },
            { name: 'Nutrition Plan (one-off)', price: 80, description: 'Personalised meal plan & macro targets' },
          ],
        },
        {
          name: 'Small Group Training',
          items: [
            { name: 'Small Group PT (max 4 people)', price: 20, description: 'Per person, per session' },
          ],
        },
      ],
    },
    {
      name: 'Classes',
      icon: '🧘',
      categories: [
        {
          name: 'Mind & Body',
          items: [
            { name: 'Yoga', price: 10 },
            { name: 'Pilates', price: 12 },
            { name: 'Stretch & Flex', price: 10 },
            { name: 'Meditation', price: 8 },
          ],
        },
        {
          name: 'Cardio & Dance',
          items: [
            { name: 'Spin Cycle', price: 12, isPopular: true },
            { name: 'HIIT', price: 10, isPopular: true },
            { name: 'Zumba', price: 10 },
            { name: 'Aerobics', price: 10 },
          ],
        },
        {
          name: 'Strength & Conditioning',
          items: [
            { name: 'Boxing Fitness', price: 12, isPopular: true },
            { name: 'Kettlebell', price: 10 },
            { name: 'Bootcamp', price: 12 },
            { name: 'CrossFit', price: 15 },
          ],
        },
      ],
    },
    {
      name: 'Facilities & Add-Ons',
      icon: '🏊',
      categories: [
        {
          name: 'Add-Ons',
          items: [
            { name: 'Swimming Pool Access (monthly)', price: 15 },
            { name: 'Sauna & Steam Room (monthly)', price: 15 },
            { name: 'Squash Court (per hour)', price: 12 },
            { name: 'Locker Rental (monthly)', price: 5 },
          ],
        },
      ],
    },
  ],

  // ─── REPAIR SHOP ───────────────────────────────────────────────────────────
  REPAIR_SHOP: [
    {
      name: 'Phone Repairs',
      icon: '📱',
      categories: [
        {
          name: 'Screen Repair',
          items: [
            { name: 'iPhone Screen Repair', price: 60, description: 'From — price varies by model. Ask for a quote.', isPopular: true },
            { name: 'Samsung Screen Repair', price: 70, description: 'From — price varies by model. Ask for a quote.', isPopular: true },
            { name: 'Other Android Screen', price: 50, description: 'From — price varies by model' },
          ],
        },
        {
          name: 'Battery & Charging',
          items: [
            { name: 'iPhone Battery Replacement', price: 40, isPopular: true },
            { name: 'Samsung Battery Replacement', price: 40 },
            { name: 'Charging Port Repair', price: 35 },
          ],
        },
        {
          name: 'Other Phone Repairs',
          items: [
            { name: 'Back Glass Replacement', price: 55 },
            { name: 'Camera Repair', price: 45 },
            { name: 'Speaker / Microphone Repair', price: 40 },
            { name: 'Water Damage Diagnosis & Repair', price: 50, description: 'No fix, no fee' },
            { name: 'Software Fix / Factory Reset', price: 25 },
          ],
        },
      ],
    },
    {
      name: 'Tablet Repairs',
      icon: '📟',
      categories: [
        {
          name: 'iPad',
          items: [
            { name: 'iPad Screen Repair', price: 80, description: 'From — price varies by model' },
            { name: 'iPad Battery Replacement', price: 55 },
            { name: 'iPad Charging Port Repair', price: 40 },
          ],
        },
        {
          name: 'Other Tablets',
          items: [
            { name: 'Samsung Tab Screen Repair', price: 70 },
            { name: 'Tablet Battery Replacement', price: 50 },
          ],
        },
      ],
    },
    {
      name: 'Laptop & PC Repairs',
      icon: '💻',
      categories: [
        {
          name: 'Laptop',
          items: [
            { name: 'Laptop Screen Replacement', price: 90, description: 'From — price varies by model', isPopular: true },
            { name: 'Laptop Battery Replacement', price: 60 },
            { name: 'Keyboard Replacement', price: 70 },
            { name: 'Virus Removal & Clean-Up', price: 45, isPopular: true },
            { name: 'Data Recovery', price: 80, description: 'From — depending on storage size & damage' },
            { name: 'RAM / SSD Upgrade', price: 50, description: 'Labour only — parts extra' },
            { name: 'Laptop Not Turning On', price: 45 },
          ],
        },
        {
          name: 'PC / Desktop',
          items: [
            { name: 'PC Build & Setup', price: 80 },
            { name: 'PC Diagnostic & Repair', price: 45 },
            { name: 'Virus Removal', price: 40 },
            { name: 'OS Reinstall', price: 50, description: 'Windows / macOS clean install' },
          ],
        },
      ],
    },
    {
      name: 'Console Repairs',
      icon: '🎮',
      categories: [
        {
          name: 'PlayStation',
          items: [
            { name: 'PS5 HDMI Port Repair', price: 75 },
            { name: 'PS5 Controller Repair', price: 30 },
            { name: 'PS4 HDMI Port Repair', price: 60, isPopular: true },
            { name: 'PS4 Overheating / Fan Repair', price: 45 },
          ],
        },
        {
          name: 'Xbox & Nintendo',
          items: [
            { name: 'Xbox Disc Drive Repair', price: 70 },
            { name: 'Xbox Controller Repair', price: 28 },
            { name: 'Nintendo Switch Screen Repair', price: 80 },
            { name: 'Nintendo Switch Charging Port', price: 45 },
          ],
        },
      ],
    },
    {
      name: 'Diagnostics & Accessories',
      icon: '🔧',
      categories: [
        {
          name: 'Diagnostics',
          items: [
            { name: 'Device Diagnostic Check', price: 10, description: 'Free if repaired with us on the same visit' },
            { name: 'Data Backup Service', price: 20 },
            { name: 'Device Setup & Data Transfer', price: 30 },
          ],
        },
        {
          name: 'Accessories',
          items: [
            { name: 'Tempered Glass Screen Protector (fitted)', price: 10 },
            { name: 'Phone Case', price: 10 },
            { name: 'USB-C Cable', price: 8 },
            { name: 'Lightning Cable', price: 8 },
            { name: 'Wireless Charger', price: 15 },
          ],
        },
      ],
    },
  ],

  // ─── OTHER ─────────────────────────────────────────────────────────────────
  OTHER: [
    {
      name: 'Consultation',
      icon: '📋',
      categories: [
        {
          name: 'Initial Consultation',
          items: [
            { name: 'Free Discovery Call (15min)', price: 0, description: 'Brief call to understand your needs — no obligation' },
            { name: 'Full Consultation (1hr)', price: 75, description: 'In-depth consultation with written recommendations' },
          ],
        },
      ],
    },
    {
      name: 'Core Services',
      icon: '⚡',
      categories: [
        {
          name: 'Service Packages',
          items: [
            { name: 'Starter Package', price: 99, description: 'Essential service for individuals & small projects' },
            { name: 'Standard Package', price: 199, description: 'Full service — our most popular option', isPopular: true },
            { name: 'Premium Package', price: 399, description: 'Comprehensive service with priority turnaround', isPopular: true },
          ],
        },
      ],
    },
    {
      name: 'Add-Ons & Extras',
      icon: '➕',
      categories: [
        {
          name: 'Extras',
          items: [
            { name: 'Express / Rush Service', price: 50, description: 'Priority turnaround — added to any package' },
            { name: 'Follow-Up Session', price: 60 },
            { name: 'Report & Documentation', price: 40 },
            { name: 'Ongoing Support (monthly)', price: 75 },
          ],
        },
      ],
    },
    {
      name: 'Monthly Retainer',
      icon: '📅',
      categories: [
        {
          name: 'Ongoing Plans',
          items: [
            { name: 'Starter Retainer', price: 150, description: 'Core support — up to 3hrs/month' },
            { name: 'Professional Retainer', price: 350, description: 'Full support — up to 8hrs/month', isPopular: true },
            { name: 'Enterprise Retainer', price: 700, description: 'Dedicated resource — up to 20hrs/month' },
          ],
        },
      ],
    },
  ],

};

export const MENU_TEMPLATE_THEMES: Partial<Record<TenantType, { primaryColor: string; secondaryColor: string; fontFamily: string }>> = {
  RESTAURANT: { primaryColor: '#DC2626', secondaryColor: '#991B1B', fontFamily: 'Inter' },
  CAFE:       { primaryColor: '#92400E', secondaryColor: '#78350F', fontFamily: 'Inter' },
  BARBER_SHOP:{ primaryColor: '#1D4ED8', secondaryColor: '#1E3A8A', fontFamily: 'Inter' },
  SALON:      { primaryColor: '#BE185D', secondaryColor: '#9D174D', fontFamily: 'Inter' },
  GYM:        { primaryColor: '#EA580C', secondaryColor: '#C2410C', fontFamily: 'Inter' },
  REPAIR_SHOP:{ primaryColor: '#475569', secondaryColor: '#1E293B', fontFamily: 'Inter' },
  OTHER:      { primaryColor: '#6366F1', secondaryColor: '#4338CA', fontFamily: 'Inter' },
};
