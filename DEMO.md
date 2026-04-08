# StorePilot Demo Account

## Quick Setup

### Option 1: Using the UI (Recommended)
1. Start the development server: `npm run dev`
2. Go to the signup page: http://localhost:3000/signup
3. Click "Create Demo Account" button
4. The demo account will be created with credentials displayed
5. Click "Sign In to Demo Account" to log in

### Option 2: Using the API
Send a POST request to create a demo account:

```bash
curl -X POST http://localhost:3000/api/demo/setup
```

Or use the browser: visit `http://localhost:3000/api/demo/setup` in your browser

### Option 3: Direct Script (Admin only)
Run the demo setup function directly (requires service role key):

```typescript
import { createDemoAccount } from '@/app/actions/demo-setup'

const result = await createDemoAccount()
console.log(result)
```

## Demo Account Credentials

After creation, the demo account will be:

- **Email:** `demo@storepilot.app`
- **Password:** `Demo123!`
- **Name:** Demo User

## What's Included

The demo account comes with:

1. **Demo Store** - "Demo Store" with full settings
2. **Demo Location** - "Main Location" with address
3. **Categories:**
   - Electronics (blue)
   - Clothing (green)
   - Food & Beverage (yellow)
   - Home & Garden (purple)

4. **Sample Products (8):**
   - Wireless Headphones (45 in stock)
   - Smart Watch (8 in stock - low!)
   - Cotton T-Shirt (120 in stock)
   - Jeans (3 in stock - critical!)
   - Organic Coffee Beans (35 in stock)
   - Tea Set (0 in stock - out!)
   - Garden Tools Set (12 in stock)
   - LED Desk Lamp (28 in stock)

5. **Sample Sales Data:**
   - Yesterday's metrics with $1,245.67 in sales
   - 23 transactions, 34 items sold
   - Sample refunds/voids data

## Troubleshooting

### "fetch failed" on signup or signin
This usually means:
1. **Supabase project is paused** (most common - free tier pauses after 7 days of inactivity)
2. Supabase is not configured (missing env vars)
3. Network connectivity issues

**Fix:**
1. Go to https://app.supabase.com
2. Find your project (vqglrexlyzngnmridscf)
3. Click "Resume Project"
4. Wait a minute for it to start
5. Refresh the StorePilot page

You can also test the connection by visiting:
`http://localhost:3000/api/debug/connection`

This will tell you if:
- Environment variables are set
- Connection to Supabase is working
- Any specific error messages

### Demo account already exists
If you see "Demo account already exists", the credentials will still be returned. You can sign in with:
- Email: `demo@storepilot.app`
- Password: `Demo123!`

Or click the "Sign in with Demo Account" button on the login page.

### Reset demo data
To recreate the demo account with fresh data:
1. Delete the user from Supabase Auth dashboard
2. Clear related data from the database
3. Click "Create Demo Account" again

## Environment Variables

Make sure these are set in your `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The service role key is required for the demo account creation to work.
