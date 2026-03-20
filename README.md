# ServiSite - Multi-Tenant SaaS Platform for Restaurants & Local Businesses

ServiSite enables restaurants, salons, repair shops, and other local service businesses to create their own branded digital presence with a custom subdomain, menu/service catalog, gallery, and contact page.

## Architecture

- **Backend**: NestJS + TypeScript + Prisma + PostgreSQL
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Storage**: Azure Blob Storage for media
- **Auth**: JWT (access + refresh tokens), bcrypt
- **Multi-tenancy**: Subdomain-based (`{slug}.servisite.com`)
- **Infrastructure**: Docker Compose + Nginx

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- PostgreSQL 15+ (or use Docker)
- Azure Storage account

### 1. Clone and configure

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# Fill in your values
```

### 2. Start with Docker Compose

```bash
cd infrastructure
docker-compose up -d
```

### 3. Run migrations and seed

```bash
cd backend
npx prisma migrate dev
npx ts-node infrastructure/scripts/seed.ts
```

### 4. Local development (without Docker)

```bash
# Terminal 1 - Backend
cd backend
npm install
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

## Project Structure

```
ServiSite/
├── backend/                 # NestJS API
│   ├── prisma/              # Database schema & migrations
│   ├── src/
│   │   ├── common/          # Guards, decorators, interceptors
│   │   ├── modules/         # Feature modules
│   │   │   ├── auth/
│   │   │   ├── tenant/
│   │   │   ├── menu/
│   │   │   ├── media/
│   │   │   ├── contact/
│   │   │   └── gallery/
│   │   └── prisma/          # Prisma service
│   └── test/                # E2E tests
├── frontend/                # Next.js app
│   ├── app/
│   │   ├── [tenant]/        # Public tenant pages
│   │   ├── dashboard/       # Admin dashboard
│   │   └── auth/            # Auth pages
│   ├── components/
│   ├── services/            # API clients
│   ├── store/               # Zustand stores
│   └── types/
└── infrastructure/          # Docker, Nginx, scripts
```

## API Endpoints

### Auth
- `POST /api/v1/auth/login` - Login with email/password
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout (invalidate refresh token)

### Tenant
- `GET /api/v1/tenant` - List all tenants (admin)
- `POST /api/v1/tenant` - Create tenant
- `GET /api/v1/tenant/:slug` - Get tenant by slug (public)
- `PUT /api/v1/tenant/:id` - Update tenant

### Menu
- `GET /api/v1/menu/categories` - List categories
- `POST /api/v1/menu/categories` - Create category
- `PUT /api/v1/menu/categories/:id` - Update category
- `DELETE /api/v1/menu/categories/:id` - Delete category
- `GET /api/v1/menu/items` - List menu items
- `POST /api/v1/menu/items` - Create menu item
- `PUT /api/v1/menu/items/:id` - Update menu item
- `DELETE /api/v1/menu/items/:id` - Delete menu item

### Media
- `POST /api/v1/upload` - Upload file to Azure Blob Storage

### Contact
- `GET /api/v1/contact` - Get contact info
- `PUT /api/v1/contact` - Update contact info

### Gallery
- `GET /api/v1/gallery` - List gallery images
- `POST /api/v1/gallery` - Add gallery image
- `DELETE /api/v1/gallery/:id` - Delete gallery image

## Environment Variables

See `backend/.env.example` and `frontend/.env.example` for all required variables.

## Multi-Tenancy

Each tenant gets a subdomain: `{slug}.servisite.com`

The Nginx configuration routes subdomain requests to the frontend, which uses Next.js middleware to detect the subdomain and serve the correct tenant's pages. The backend uses tenant middleware to extract the tenant from the `Host` header and scope all DB queries.

## Theming

Each tenant can customize:
- **Primary color** - Main brand color
- **Secondary color** - Accent color
- **Font family** - Google Font or system font

Theme settings are stored as JSON in `Tenant.themeSettings` and applied as CSS custom properties.

## License

MIT
