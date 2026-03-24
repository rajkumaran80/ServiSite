import { PrismaClient, TenantType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function hash(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

type ItemSeed = {
  name: string;
  description: string;
  price: number;
  currency?: string;
  isAvailable?: boolean;
  isPopular?: boolean;
  allergens?: string[];
  sortOrder: number;
  categoryIds: string[];
};

async function createItems(tenantId: string, items: ItemSeed[]) {
  for (const { categoryIds, ...rest } of items) {
    await prisma.menuItem.create({
      data: {
        ...rest,
        tenantId,
        currency: rest.currency ?? 'GBP',
        isAvailable: rest.isAvailable ?? true,
        isPopular: rest.isPopular ?? false,
        allergens: rest.allergens ?? [],
        categories: { connect: categoryIds.map((id) => ({ id })) },
      },
    });
  }
}

async function main() {
  console.log('🌱 Starting seed...');

  // ─── 1. The Crown & Anchor (Restaurant) ───────────────────────────────────
  const restaurantSlug = 'the-crown-pub';
  const existingRestaurant = await prisma.tenant.findUnique({ where: { slug: restaurantSlug } });

  if (!existingRestaurant) {
    const restaurant = await prisma.tenant.create({
      data: {
        name: 'The Crown & Anchor',
        slug: restaurantSlug,
        type: TenantType.RESTAURANT,
        currency: 'GBP',
        themeSettings: { primaryColor: '#1a3a5c', secondaryColor: '#c9a84c', fontFamily: 'playfair' },
        whatsappNumber: '+447700900123',
      },
    });

    await prisma.user.create({
      data: {
        tenantId: restaurant.id,
        email: 'admin@thecrownpub.co.uk',
        passwordHash: await hash('Admin1234!'),
        role: UserRole.ADMIN,
      },
    });

    await prisma.contactInfo.create({
      data: {
        tenantId: restaurant.id,
        phone: '+44 20 7946 0123',
        email: 'hello@thecrownpub.co.uk',
        address: '12 High Street',
        city: 'London',
        state: 'England',
        country: 'GB',
        zipCode: 'EC1A 1BB',
        openingHours: {
          monday: { open: '07:00', close: '23:00', closed: false },
          tuesday: { open: '07:00', close: '23:00', closed: false },
          wednesday: { open: '07:00', close: '23:00', closed: false },
          thursday: { open: '07:00', close: '23:00', closed: false },
          friday: { open: '07:00', close: '23:30', closed: false },
          saturday: { open: '08:00', close: '23:30', closed: false },
          sunday: { open: '08:00', close: '22:00', closed: false },
        },
      },
    });

    // ── Breakfast Group ──
    const breakfastGroup = await prisma.menuGroup.create({
      data: { tenantId: restaurant.id, name: 'Breakfast', icon: '🍳', servedFrom: '07:00', servedUntil: '11:30', isActive: true, sortOrder: 0 },
    });
    const [bfStarters, bfMain, bfLight] = await Promise.all([
      prisma.category.create({ data: { tenantId: restaurant.id, menuGroupId: breakfastGroup.id, name: 'Starters', sortOrder: 0 } }),
      prisma.category.create({ data: { tenantId: restaurant.id, menuGroupId: breakfastGroup.id, name: 'Main Breakfast', sortOrder: 1 } }),
      prisma.category.create({ data: { tenantId: restaurant.id, menuGroupId: breakfastGroup.id, name: 'Light Bites', sortOrder: 2 } }),
    ]);
    await createItems(restaurant.id, [
      { name: 'Fresh Fruit Bowl', description: 'Seasonal mixed fruits with honey and mint.', price: 4.50, allergens: [], sortOrder: 0, categoryIds: [bfStarters.id] },
      { name: 'Yogurt & Granola', description: 'Greek yogurt with house-made granola and berry compote.', price: 5.00, allergens: ['dairy', 'gluten'], sortOrder: 1, categoryIds: [bfStarters.id] },
      { name: 'Toast with Butter & Jam', description: 'Thick-sliced sourdough with local butter and seasonal jam.', price: 3.50, allergens: ['gluten', 'dairy'], sortOrder: 2, categoryIds: [bfStarters.id] },
      { name: 'Full English Breakfast', description: 'Bacon, eggs, sausage, beans, grilled tomato, mushrooms and toast.', price: 9.99, isPopular: true, allergens: ['gluten', 'dairy', 'eggs'], sortOrder: 0, categoryIds: [bfMain.id] },
      { name: 'Scrambled Eggs on Toast', description: 'Free-range eggs gently scrambled on sourdough toast.', price: 7.50, allergens: ['gluten', 'dairy', 'eggs'], sortOrder: 1, categoryIds: [bfMain.id] },
      { name: 'Eggs Benedict', description: 'Poached eggs with ham on English muffin with hollandaise sauce.', price: 8.50, allergens: ['gluten', 'dairy', 'eggs'], sortOrder: 2, categoryIds: [bfMain.id] },
      { name: 'Avocado Toast', description: 'Smashed avocado on sourdough with cherry tomatoes and chilli flakes.', price: 7.00, allergens: ['gluten'], sortOrder: 3, categoryIds: [bfMain.id] },
      { name: 'Pancakes with Maple Syrup', description: 'Fluffy buttermilk pancakes served with maple syrup and butter.', price: 6.50, allergens: ['gluten', 'dairy', 'eggs'], sortOrder: 0, categoryIds: [bfLight.id] },
      { name: 'Porridge with Honey', description: 'Creamy Scottish oats with local honey and a pinch of sea salt.', price: 4.50, allergens: ['gluten', 'dairy'], sortOrder: 1, categoryIds: [bfLight.id] },
      { name: 'Croissants', description: 'Freshly baked butter croissants served with jam and cream.', price: 3.00, allergens: ['gluten', 'dairy', 'eggs'], sortOrder: 2, categoryIds: [bfLight.id] },
    ]);

    // ── Lunch Group ──
    const lunchGroup = await prisma.menuGroup.create({
      data: { tenantId: restaurant.id, name: 'Lunch', icon: '🥪', servedFrom: '12:00', servedUntil: '15:00', isActive: true, sortOrder: 1 },
    });
    const [lunchStarters, lunchMain, lunchDesserts] = await Promise.all([
      prisma.category.create({ data: { tenantId: restaurant.id, menuGroupId: lunchGroup.id, name: 'Starters', sortOrder: 0 } }),
      prisma.category.create({ data: { tenantId: restaurant.id, menuGroupId: lunchGroup.id, name: 'Main Course', sortOrder: 1 } }),
      prisma.category.create({ data: { tenantId: restaurant.id, menuGroupId: lunchGroup.id, name: 'Desserts', sortOrder: 2 } }),
    ]);
    await createItems(restaurant.id, [
      { name: 'Tomato Soup', description: 'Roasted tomato and basil soup with crusty bread.', price: 5.50, allergens: ['gluten', 'dairy'], sortOrder: 0, categoryIds: [lunchStarters.id] },
      { name: 'Garlic Bread', description: 'Toasted sourdough with garlic butter and fresh herbs.', price: 4.00, allergens: ['gluten', 'dairy'], sortOrder: 1, categoryIds: [lunchStarters.id] },
      { name: 'Chicken Caesar Salad', description: 'Crispy romaine, grilled chicken, parmesan and house Caesar dressing.', price: 8.50, allergens: ['dairy', 'eggs', 'fish'], sortOrder: 2, categoryIds: [lunchStarters.id] },
      { name: 'Fish and Chips', description: 'Beer-battered cod with thick-cut chips, mushy peas and tartare sauce.', price: 14.99, isPopular: true, allergens: ['gluten', 'fish', 'eggs'], sortOrder: 0, categoryIds: [lunchMain.id] },
      { name: 'Beef Burger with Fries', description: '6oz beef patty with lettuce, tomato, pickles and house sauce on brioche bun.', price: 12.99, allergens: ['gluten', 'dairy', 'eggs'], sortOrder: 1, categoryIds: [lunchMain.id] },
      { name: 'Grilled Chicken Sandwich', description: 'Marinated grilled chicken breast with avocado and aioli on ciabatta.', price: 11.50, allergens: ['gluten', 'eggs'], sortOrder: 2, categoryIds: [lunchMain.id] },
      { name: "Shepherd's Pie", description: 'Slow-cooked minced lamb with root vegetables under a creamy mash crust.', price: 13.50, allergens: ['dairy'], sortOrder: 3, categoryIds: [lunchMain.id] },
      { name: 'Apple Crumble', description: 'Warm spiced apple crumble with vanilla custard or ice cream.', price: 6.50, allergens: ['gluten', 'dairy'], sortOrder: 0, categoryIds: [lunchDesserts.id] },
      { name: 'Sticky Toffee Pudding', description: 'Classic British pudding with toffee sauce and clotted cream.', price: 6.50, allergens: ['gluten', 'dairy', 'eggs'], sortOrder: 1, categoryIds: [lunchDesserts.id] },
      { name: 'Ice Cream', description: "Three scoops of artisan ice cream. Ask for today's flavours.", price: 4.50, allergens: ['dairy', 'eggs'], sortOrder: 2, categoryIds: [lunchDesserts.id] },
    ]);

    // ── Dinner Group ──
    const dinnerGroup = await prisma.menuGroup.create({
      data: { tenantId: restaurant.id, name: 'Dinner', icon: '🍽️', servedFrom: '17:00', servedUntil: '22:00', isActive: true, sortOrder: 2 },
    });
    const [dinnerStarters, dinnerMain, chefSpecials, dinnerDesserts] = await Promise.all([
      prisma.category.create({ data: { tenantId: restaurant.id, menuGroupId: dinnerGroup.id, name: 'Starters', sortOrder: 0 } }),
      prisma.category.create({ data: { tenantId: restaurant.id, menuGroupId: dinnerGroup.id, name: 'Main Course', sortOrder: 1 } }),
      prisma.category.create({ data: { tenantId: restaurant.id, menuGroupId: dinnerGroup.id, name: 'Chef Specials', sortOrder: 2 } }),
      prisma.category.create({ data: { tenantId: restaurant.id, menuGroupId: dinnerGroup.id, name: 'Desserts', sortOrder: 3 } }),
    ]);
    await createItems(restaurant.id, [
      { name: 'Prawn Cocktail', description: 'Classic prawn cocktail with marie rose sauce and brown bread.', price: 8.50, allergens: ['shellfish', 'gluten', 'eggs'], sortOrder: 0, categoryIds: [dinnerStarters.id] },
      { name: 'Soup of the Day', description: "Ask your server for today's freshly made soup. Served with crusty bread.", price: 6.00, allergens: ['gluten', 'dairy'], sortOrder: 1, categoryIds: [dinnerStarters.id] },
      { name: 'Bruschetta', description: 'Toasted sourdough with heritage tomatoes, basil oil and sea salt.', price: 6.50, allergens: ['gluten'], sortOrder: 2, categoryIds: [dinnerStarters.id] },
      { name: 'Roast Beef with Yorkshire Pudding', description: 'Slow-roasted British beef with Yorkshire pudding, roasties and seasonal greens.', price: 18.99, isPopular: true, allergens: ['gluten', 'dairy', 'eggs'], sortOrder: 0, categoryIds: [dinnerMain.id] },
      { name: 'Grilled Salmon', description: 'Fresh Atlantic salmon fillet with lemon butter sauce and seasonal vegetables.', price: 16.99, allergens: ['fish', 'dairy'], sortOrder: 1, categoryIds: [dinnerMain.id] },
      { name: 'Lamb Chops', description: 'Two Welsh lamb chops with rosemary jus, dauphinoise potatoes and green beans.', price: 19.99, allergens: ['dairy'], sortOrder: 2, categoryIds: [dinnerMain.id] },
      { name: 'Chicken Pie', description: 'Free-range chicken and leek pie with shortcrust pastry and mash.', price: 14.99, allergens: ['gluten', 'dairy', 'eggs'], sortOrder: 3, categoryIds: [dinnerMain.id] },
      { name: 'Steak with Peppercorn Sauce', description: '10oz ribeye steak with peppercorn sauce, chunky chips and side salad.', price: 24.99, isPopular: true, allergens: ['dairy'], sortOrder: 0, categoryIds: [chefSpecials.id] },
      { name: 'Duck Breast', description: 'Pan-roasted duck breast with cherry jus, fondant potato and tenderstem broccoli.', price: 22.99, allergens: ['dairy'], sortOrder: 1, categoryIds: [chefSpecials.id] },
      { name: 'Seafood Platter', description: 'Selection of prawns, scallops, mussels and crab claws with garlic butter.', price: 26.99, allergens: ['shellfish', 'fish', 'dairy'], sortOrder: 2, categoryIds: [chefSpecials.id] },
      { name: 'Chocolate Fondant', description: 'Warm dark chocolate fondant with vanilla ice cream and raspberry coulis.', price: 7.50, allergens: ['gluten', 'dairy', 'eggs'], sortOrder: 0, categoryIds: [dinnerDesserts.id] },
      { name: 'Cheesecake', description: 'Baked vanilla cheesecake with seasonal berry compote.', price: 6.50, allergens: ['gluten', 'dairy', 'eggs'], sortOrder: 1, categoryIds: [dinnerDesserts.id] },
      { name: 'Bread & Butter Pudding', description: 'Traditional bread and butter pudding with nutmeg custard.', price: 6.50, allergens: ['gluten', 'dairy', 'eggs'], sortOrder: 2, categoryIds: [dinnerDesserts.id] },
    ]);

    // ── Drinks Group ──
    const drinksGroup = await prisma.menuGroup.create({
      data: { tenantId: restaurant.id, name: 'Drinks', icon: '🍷', isActive: true, sortOrder: 3 },
    });
    const [alcoholic, wine, cocktails, nonAlcoholic] = await Promise.all([
      prisma.category.create({ data: { tenantId: restaurant.id, menuGroupId: drinksGroup.id, name: 'Alcoholic', sortOrder: 0 } }),
      prisma.category.create({ data: { tenantId: restaurant.id, menuGroupId: drinksGroup.id, name: 'Wine', sortOrder: 1 } }),
      prisma.category.create({ data: { tenantId: restaurant.id, menuGroupId: drinksGroup.id, name: 'Cocktails', sortOrder: 2 } }),
      prisma.category.create({ data: { tenantId: restaurant.id, menuGroupId: drinksGroup.id, name: 'Non-Alcoholic', sortOrder: 3 } }),
    ]);
    await createItems(restaurant.id, [
      { name: 'Beer', description: 'Draught pint of house ale.', price: 4.50, allergens: ['gluten'], sortOrder: 0, categoryIds: [alcoholic.id] },
      { name: 'Lager', description: 'Draught pint of premium lager.', price: 4.50, allergens: ['gluten'], sortOrder: 1, categoryIds: [alcoholic.id] },
      { name: 'Cider', description: 'Draught pint of dry cider.', price: 4.50, allergens: [], sortOrder: 2, categoryIds: [alcoholic.id] },
      { name: 'Red Wine', description: 'Glass of house Merlot (175ml).', price: 6.50, allergens: ['sulphites'], sortOrder: 0, categoryIds: [wine.id] },
      { name: 'White Wine', description: 'Glass of house Sauvignon Blanc (175ml).', price: 6.00, allergens: ['sulphites'], sortOrder: 1, categoryIds: [wine.id] },
      { name: 'Rosé', description: 'Glass of house rosé (175ml).', price: 6.00, allergens: ['sulphites'], sortOrder: 2, categoryIds: [wine.id] },
      { name: 'Mojito', description: 'White rum, fresh lime, mint, sugar syrup and soda.', price: 9.50, allergens: [], sortOrder: 0, categoryIds: [cocktails.id] },
      { name: 'Espresso Martini', description: 'Vodka, coffee liqueur and fresh espresso shot.', price: 10.00, allergens: [], sortOrder: 1, categoryIds: [cocktails.id] },
      { name: 'Gin & Tonic', description: 'Premium gin with tonic water, cucumber and lime.', price: 8.50, allergens: [], sortOrder: 2, categoryIds: [cocktails.id] },
      { name: 'Soft Drinks', description: 'Coca-Cola, Diet Coke, Lemonade or Juice.', price: 3.00, allergens: [], sortOrder: 0, categoryIds: [nonAlcoholic.id] },
      { name: 'Mocktails', description: "Ask your server for today's alcohol-free cocktail selection.", price: 5.50, allergens: [], sortOrder: 1, categoryIds: [nonAlcoholic.id] },
      { name: 'Juices', description: 'Freshly squeezed orange, apple or grapefruit juice.', price: 3.50, allergens: [], sortOrder: 2, categoryIds: [nonAlcoholic.id] },
    ]);

    console.log(`  ✓ Restaurant created: ${restaurantSlug}`);
    console.log(`    Login: admin@thecrownpub.co.uk / Admin1234!`);
  } else {
    console.log(`  ⚠ Restaurant '${restaurantSlug}' already exists, skipping.`);
  }

  // ─── 2. Glamour Salon ─────────────────────────────────────────────────────
  const salonSlug = 'glamour-salon';
  const existingSalon = await prisma.tenant.findUnique({ where: { slug: salonSlug } });

  if (!existingSalon) {
    const salon = await prisma.tenant.create({
      data: {
        name: 'Glamour Salon & Spa',
        slug: salonSlug,
        type: TenantType.SALON,
        whatsappNumber: '+15559876543',
        themeSettings: { primaryColor: '#9B59B6', secondaryColor: '#F39C12', fontFamily: 'inter' },
      },
    });

    await prisma.user.create({
      data: {
        tenantId: salon.id,
        email: 'admin@glamoursalon.com',
        passwordHash: await hash('Admin1234!'),
        role: UserRole.ADMIN,
      },
    });

    await prisma.contactInfo.create({
      data: {
        tenantId: salon.id,
        phone: '+1 (555) 987-6543',
        email: 'bookings@glamoursalon.com',
        address: '456 Beauty Ave',
        city: 'Los Angeles',
        state: 'CA',
        country: 'US',
        zipCode: '90001',
        openingHours: {
          monday: { open: '09:00', close: '19:00', closed: false },
          tuesday: { open: '09:00', close: '19:00', closed: false },
          wednesday: { open: '09:00', close: '19:00', closed: false },
          thursday: { open: '09:00', close: '20:00', closed: false },
          friday: { open: '09:00', close: '20:00', closed: false },
          saturday: { open: '10:00', close: '18:00', closed: false },
          sunday: { closed: true },
        },
      },
    });

    const [hair, nails, spa] = await Promise.all([
      prisma.category.create({ data: { tenantId: salon.id, name: 'Hair Services', sortOrder: 0 } }),
      prisma.category.create({ data: { tenantId: salon.id, name: 'Nail Care', sortOrder: 1 } }),
      prisma.category.create({ data: { tenantId: salon.id, name: 'Spa & Treatments', sortOrder: 2 } }),
    ]);

    await createItems(salon.id, [
      { name: "Women's Haircut & Style", description: 'Includes wash, cut, blow dry and style.', price: 65.0, currency: 'GBP', isPopular: true, allergens: [], sortOrder: 0, categoryIds: [hair.id] },
      { name: "Men's Haircut", description: 'Classic or modern cut with wash and style finish.', price: 35.0, currency: 'GBP', allergens: [], sortOrder: 1, categoryIds: [hair.id] },
      { name: 'Full Color', description: 'Single process color application. Price varies by hair length.', price: 95.0, currency: 'GBP', allergens: [], sortOrder: 2, categoryIds: [hair.id] },
      { name: 'Balayage / Highlights', description: 'Hand-painted highlights for a natural, sun-kissed look.', price: 140.0, currency: 'GBP', isPopular: true, allergens: [], sortOrder: 3, categoryIds: [hair.id] },
      { name: 'Classic Manicure', description: 'Nail shaping, cuticle care, massage and polish.', price: 30.0, currency: 'GBP', allergens: [], sortOrder: 0, categoryIds: [nails.id] },
      { name: 'Gel Manicure', description: 'Long-lasting gel polish with UV cure. Lasts up to 3 weeks.', price: 45.0, currency: 'GBP', allergens: [], sortOrder: 1, categoryIds: [nails.id] },
      { name: 'Deep Conditioning Treatment', description: '30-minute intensive hair mask for dry or damaged hair.', price: 40.0, currency: 'GBP', allergens: [], sortOrder: 0, categoryIds: [spa.id] },
      { name: 'Head Massage (30 min)', description: 'Relaxing scalp and shoulder massage.', price: 45.0, currency: 'GBP', allergens: [], sortOrder: 1, categoryIds: [spa.id] },
    ]);

    console.log(`  ✓ Salon created: ${salonSlug}`);
    console.log(`    Login: admin@glamoursalon.com / Admin1234!`);
  } else {
    console.log(`  ⚠ Salon '${salonSlug}' already exists, skipping.`);
  }

  // ─── 3. Platform Tenant + Super Admin ───────────────────────────────────────
  const platformSlug = 'platform';
  const superAdminEmail = 'superadmin@servisite.com';

  const existingPlatform = await prisma.tenant.findUnique({ where: { slug: platformSlug } });
  if (!existingPlatform) {
    const platform = await prisma.tenant.create({
      data: {
        name: 'ServiSite Platform',
        slug: platformSlug,
        type: TenantType.OTHER,
        currency: 'GBP',
      },
    });

    await prisma.user.create({
      data: {
        tenantId: platform.id,
        email: superAdminEmail,
        passwordHash: await hash('SuperAdmin1234!'),
        role: UserRole.SUPER_ADMIN,
      },
    });
    console.log(`  ✓ Super admin created: ${superAdminEmail} / SuperAdmin1234!`);
  } else {
    console.log(`  ⚠ Platform tenant already exists, skipping.`);
  }

  console.log('\n🌱 Seed complete!');
  console.log('\nDashboard: http://localhost:3000/auth/login');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
