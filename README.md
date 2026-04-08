# StorePilot

A multi-tenant SaaS application for convenience store owners built with Next.js, TypeScript, Tailwind CSS, shadcn/ui, and Supabase.

## Features

- **Authentication**: Email/password and magic link sign-in with Supabase Auth
- **Multi-tenant Architecture**: Stores with role-based access control (owner, admin, manager, staff)
- **Store Management**: Create and manage multiple stores
- **Location Management**: Add multiple locations per store with full address details
- **Dashboard**: Overview of stores, locations, and key metrics
- **Responsive Design**: Mobile-friendly interface with responsive sidebar navigation

## Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with RLS policies
- **Server Actions**: Next.js Server Actions for API calls

## Setup Instructions

### 1. Clone and Install

```bash
cd storepilot/storepilot
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the SQL schema in `supabase/schema.sql` in the SQL Editor
3. Configure Auth settings (enable Email provider)

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Database Schema

### Tables

- **profiles** - User profiles extending auth.users
- **stores** - Stores owned by users
- **store_locations** - Physical locations for each store
- **store_members** - Many-to-many relationship for store access with roles

### Roles

- **owner** - Full access to store and all locations
- **admin** - Can manage store and locations
- **manager** - Can view and manage locations
- **staff** - Limited access to assigned locations

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Auth routes (login, signup)
│   ├── (dashboard)/     # Protected dashboard routes
│   ├── actions/         # Server actions
│   ├── onboarding/      # Onboarding flow
│   └── page.tsx         # Landing page
├── components/
│   ├── dashboard/       # Dashboard components
│   └── ui/              # shadcn/ui components
├── lib/
│   ├── database.types.ts # TypeScript types
│   └── supabase.ts       # Supabase clients
└── middleware.ts         # Auth middleware
```

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | Sign in |
| `/signup` | Create account |
| `/onboarding` | First-time setup (store + location) |
| `/dashboard` | Main dashboard |
| `/dashboard/stores` | List all stores |
| `/dashboard/stores/new` | Create new store |
| `/dashboard/stores/[id]` | Store details/edit |
| `/dashboard/stores/[id]/locations` | Store locations |
| `/dashboard/stores/[id]/locations/new` | Add location |
| `/dashboard/locations` | All locations across stores |
| `/dashboard/locations/[id]` | Location details/edit |
| `/dashboard/analytics` | Analytics dashboard |
| `/dashboard/settings` | Account settings |

## License

MIT
