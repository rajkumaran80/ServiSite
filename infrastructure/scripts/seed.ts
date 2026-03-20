/**
 * ServiSite — Database seed script
 * Creates demo tenants with sample data for development / staging.
 *
 * Usage:
 *   npx ts-node infrastructure/scripts/seed.ts
 *   — or via the backend package.json:
 *   npm run seed   (from backend/ directory)
 */

import { PrismaClient, TenantType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const HASH_ROUNDS = 12;

async function hash(password: string): Promise<string> {
  return bcrypt.hash(password, HASH_ROUNDS);
}

async function main() {
  console.log('🌱 Starting seed...');

  // ─── 1. Demo Restaurant ──────────────────────────────────────────────────
  const restaurantSlug = 'la-bella-cucina';

  const existingRestaurant = await prisma.tenant.findUnique({
    where: { slug: restaurantSlug },
  });

  if (!existingRestaurant) {
    const restaurant = await prisma.tenant.create({
      data: {
        name: 'La Bella Cucina',
        slug: restaurantSlug,
        type: TenantType.RESTAURANT,
        description: 'Authentic Italian cuisine in the heart of the city. Family recipes passed down through generations.',
        themeSettings: {
          primaryColor: '#C0392B',
          secondaryColor: '#E67E22',
          fontFamily: 'playfair',
        },
        contactInfo: {
          create: {
            phone: '+1 (555) 123-4567',
            email: 'hello@labellacucina.com',
            address: '123 Olive Street',
            city: 'New York',
            state: 'NY',
            country: 'US',
            zipCode: '10001',
            openingHours: {
              monday: { open: '11:30', close: '22:00', closed: false },
              tuesday: { open: '11:30', close: '22:00', closed: false },
              wednesday: { open: '11:30', close: '22:00', closed: false },
              thursday: { open: '11:30', close: '22:00', closed: false },
              friday: { open: '11:30', close: '23:00', closed: false },
              saturday: { open: '12:00', close: '23:00', closed: false },
              sunday: { open: '12:00', close: '21:00', closed: false },
            },
          },
        },
        users: {
          create: {
            name: 'Mario Rossi',
            email: 'admin@labellacucina.com',
            passwordHash: await hash('Admin1234!'),
            role: UserRole.ADMIN,
          },
        },
      },
    });

    // Categories
    const [starters, pasta, mains, desserts, drinks] = await Promise.all([
      prisma.category.create({ data: { tenantId: restaurant.id, name: 'Starters', sortOrder: 0 } }),
      prisma.category.create({ data: { tenantId: restaurant.id, name: 'Pasta', sortOrder: 1 } }),
      prisma.category.create({ data: { tenantId: restaurant.id, name: 'Main Courses', sortOrder: 2 } }),
      prisma.category.create({ data: { tenantId: restaurant.id, name: 'Desserts', sortOrder: 3 } }),
      prisma.category.create({ data: { tenantId: restaurant.id, name: 'Drinks', sortOrder: 4 } }),
    ]);

    // Menu items
    await prisma.menuItem.createMany({
      data: [
        {
          tenantId: restaurant.id,
          categoryId: starters.id,
          name: 'Bruschetta al Pomodoro',
          description: 'Toasted bread with fresh tomatoes, garlic, basil and extra virgin olive oil.',
          price: 8.5,
          isAvailable: true,
          tags: ['vegetarian', 'popular'],
          sortOrder: 0,
        },
        {
          tenantId: restaurant.id,
          categoryId: starters.id,
          name: 'Burrata con Prosciutto',
          description: 'Creamy burrata cheese served with San Daniele prosciutto and rocket salad.',
          price: 14.0,
          isAvailable: true,
          tags: ['popular'],
          sortOrder: 1,
        },
        {
          tenantId: restaurant.id,
          categoryId: pasta.id,
          name: 'Spaghetti Carbonara',
          description: 'Classic Roman pasta with guanciale, egg yolk, Pecorino Romano and black pepper.',
          price: 18.0,
          isAvailable: true,
          tags: ['classic', 'popular'],
          sortOrder: 0,
        },
        {
          tenantId: restaurant.id,
          categoryId: pasta.id,
          name: 'Pappardelle al Ragù',
          description: 'Wide ribbon pasta with slow-cooked Bolognese meat sauce.',
          price: 19.5,
          isAvailable: true,
          tags: ['classic'],
          sortOrder: 1,
        },
        {
          tenantId: restaurant.id,
          categoryId: pasta.id,
          name: 'Linguine alle Vongole',
          description: 'Linguine with fresh clams, white wine, garlic and parsley.',
          price: 22.0,
          isAvailable: true,
          tags: ['seafood'],
          sortOrder: 2,
        },
        {
          tenantId: restaurant.id,
          categoryId: mains.id,
          name: 'Branzino al Forno',
          description: 'Oven-roasted sea bass with lemon, capers and olives.',
          price: 28.0,
          isAvailable: true,
          tags: ['seafood', 'gluten-free'],
          sortOrder: 0,
        },
        {
          tenantId: restaurant.id,
          categoryId: desserts.id,
          name: 'Tiramisù della Casa',
          description: 'House-made tiramisu with mascarpone cream, espresso and cocoa.',
          price: 9.0,
          isAvailable: true,
          tags: ['classic', 'popular'],
          sortOrder: 0,
        },
        {
          tenantId: restaurant.id,
          categoryId: desserts.id,
          name: 'Panna Cotta',
          description: 'Silky vanilla panna cotta with wild berry coulis.',
          price: 8.0,
          isAvailable: true,
          tags: ['vegetarian', 'gluten-free'],
          sortOrder: 1,
        },
        {
          tenantId: restaurant.id,
          categoryId: drinks.id,
          name: 'House Red Wine (Glass)',
          description: 'Chianti Classico, Tuscany.',
          price: 8.0,
          isAvailable: true,
          sortOrder: 0,
        },
        {
          tenantId: restaurant.id,
          categoryId: drinks.id,
          name: 'San Pellegrino 500ml',
          description: 'Sparkling mineral water.',
          price: 3.5,
          isAvailable: true,
          tags: ['non-alcoholic'],
          sortOrder: 1,
        },
      ],
    });

    console.log(`  ✓ Restaurant tenant created: ${restaurantSlug}`);
    console.log(`    Admin login: admin@labellacucina.com / Admin1234!`);
  } else {
    console.log(`  ⚠ Restaurant tenant '${restaurantSlug}' already exists, skipping.`);
  }

  // ─── 2. Demo Salon ────────────────────────────────────────────────────────
  const salonSlug = 'glamour-salon';

  const existingSalon = await prisma.tenant.findUnique({
    where: { slug: salonSlug },
  });

  if (!existingSalon) {
    const salon = await prisma.tenant.create({
      data: {
        name: 'Glamour Salon & Spa',
        slug: salonSlug,
        type: TenantType.SALON,
        description: 'Premium hair and beauty services. Walk-ins welcome, appointments preferred.',
        whatsappNumber: '+15559876543',
        themeSettings: {
          primaryColor: '#9B59B6',
          secondaryColor: '#F39C12',
          fontFamily: 'inter',
        },
        contactInfo: {
          create: {
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
        },
        users: {
          create: {
            name: 'Sophie Laurent',
            email: 'admin@glamoursalon.com',
            passwordHash: await hash('Admin1234!'),
            role: UserRole.ADMIN,
          },
        },
      },
    });

    // Service categories
    const [hair, nails, spa] = await Promise.all([
      prisma.category.create({ data: { tenantId: salon.id, name: 'Hair Services', sortOrder: 0 } }),
      prisma.category.create({ data: { tenantId: salon.id, name: 'Nail Care', sortOrder: 1 } }),
      prisma.category.create({ data: { tenantId: salon.id, name: 'Spa & Treatments', sortOrder: 2 } }),
    ]);

    await prisma.menuItem.createMany({
      data: [
        {
          tenantId: salon.id,
          categoryId: hair.id,
          name: "Women's Haircut & Style",
          description: 'Includes wash, cut, blow dry and style. Consultation included.',
          price: 65.0,
          isAvailable: true,
          tags: ['popular'],
          sortOrder: 0,
        },
        {
          tenantId: salon.id,
          categoryId: hair.id,
          name: "Men's Haircut",
          description: 'Classic or modern cut with wash and style finish.',
          price: 35.0,
          isAvailable: true,
          sortOrder: 1,
        },
        {
          tenantId: salon.id,
          categoryId: hair.id,
          name: 'Full Color',
          description: 'Single process color application. Price varies by hair length.',
          price: 95.0,
          isAvailable: true,
          tags: ['popular'],
          sortOrder: 2,
        },
        {
          tenantId: salon.id,
          categoryId: hair.id,
          name: 'Balayage / Highlights',
          description: 'Hand-painted highlights for a natural, sun-kissed look.',
          price: 140.0,
          isAvailable: true,
          tags: ['trending'],
          sortOrder: 3,
        },
        {
          tenantId: salon.id,
          categoryId: nails.id,
          name: 'Classic Manicure',
          description: 'Nail shaping, cuticle care, massage and polish.',
          price: 30.0,
          isAvailable: true,
          sortOrder: 0,
        },
        {
          tenantId: salon.id,
          categoryId: nails.id,
          name: 'Gel Manicure',
          description: 'Long-lasting gel polish with UV cure. Lasts up to 3 weeks.',
          price: 45.0,
          isAvailable: true,
          tags: ['popular'],
          sortOrder: 1,
        },
        {
          tenantId: salon.id,
          categoryId: spa.id,
          name: 'Deep Conditioning Treatment',
          description: '30-minute intensive hair mask treatment for dry or damaged hair.',
          price: 40.0,
          isAvailable: true,
          sortOrder: 0,
        },
        {
          tenantId: salon.id,
          categoryId: spa.id,
          name: 'Head Massage (30 min)',
          description: 'Relaxing scalp and shoulder massage.',
          price: 45.0,
          isAvailable: true,
          sortOrder: 1,
        },
      ],
    });

    console.log(`  ✓ Salon tenant created: ${salonSlug}`);
    console.log(`    Admin login: admin@glamoursalon.com / Admin1234!`);
  } else {
    console.log(`  ⚠ Salon tenant '${salonSlug}' already exists, skipping.`);
  }

  console.log('\n🌱 Seed complete!');
  console.log('\nTenant public URLs (development):');
  console.log('  Restaurant: http://localhost:3000/la-bella-cucina');
  console.log('  Salon:      http://localhost:3000/glamour-salon');
  console.log('\nDashboard login: http://localhost:3000/auth/login');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
