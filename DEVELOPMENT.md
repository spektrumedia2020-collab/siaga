# Frontend Development Guide

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Create .env.local (copy template di bawah)
cp .env.template .env.local

# 3. Start development server
npm run dev
```

## Environment Setup

### .env.local Template

```env
# Supabase Configuration
# Get values from: https://app.supabase.com/project/[YOUR-PROJECT]/settings/api

VITE_SUPABASE_URL=https://hlvsbmxpkqvniemunygh.supabase.co
VITE_SUPABASE_ANON_KEY=
```

### Getting Supabase Credentials

1. Go to https://app.supabase.com
2. Select your project
3. Click Settings → API
4. Copy:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` → `VITE_SUPABASE_ANON_KEY`

## Project Structure

```
src/
├── App.tsx                 # Main app component
├── App.css                 # App styles
├── main.tsx                # React entry point
├── index.css               # Global styles
└── lib/
    └── supabase.ts         # Supabase client initialization
```

## Available Scripts

```bash
# Start development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Using Supabase Client

```typescript
import { supabase } from './lib/supabase'

// Query data
const { data, error } = await supabase
  .from('tables_name')
  .select()

// Insert data
const { data, error } = await supabase
  .from('table_name')
  .insert([{ column: 'value' }])

// Subscribe to real-time changes
supabase
  .from('table_name')
  .on('*', payload => {
    console.log('Change:', payload)
  })
  .subscribe()
```

## Component Examples

### Authentication

```typescript
// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password'
})

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

// Get current user
const { data } = await supabase.auth.getSession()
```

### Querying Data

```typescript
// Select all
const { data } = await supabase.from('stalls').select()

// With filter
const { data } = await supabase
  .from('stalls')
  .select()
  .eq('status', 'AKTIF')

// With pagination
const { data } = await supabase
  .from('stalls')
  .select()
  .range(0, 9)

// With ordering
const { data } = await supabase
  .from('stalls')
  .select()
  .order('created_at', { ascending: false })
```

## Database Tables Reference

### Core Tables
- **markets** - Pasar/lokasi
- **stalls** - Lapak/toko
- **stall_owners** - Pemilik lapak
- **market_sectors** - Sektor dalam pasar
- **officers** - Petugas retribusi
- **transactions** - Transaksi retribusi

### Support Tables
- **retribution_types** - Jenis retribusi
- **retribution_rates** - Tarif retribusi
- **officer_attendance** - Absensi petugas
- **officer_deposits** - Setoran petugas
- **reconciliations** - Rekonsiliasi
- **activity_logs** - Audit log

See `../Brief/SIAGA_schema_supabase.sql` untuk schema lengkap.

## Styling

### Global Styles
Edit `src/index.css` untuk global styles.

### Component Styles
Setiap component bisa punya file `.css` sendiri:
- `App.tsx` → `App.css`
- `Login.tsx` → `Login.css`

## Tips

- Use `React.StrictMode` untuk development warnings
- Check browser DevTools untuk debugging
- Use Supabase realtime untuk live updates
- Implement proper error handling dengan `try-catch`
- Validate input sebelum kirim ke database

## Common Issues

### .env.local not working
- Prefix variable dengan `VITE_`
- Restart dev server setelah update
- File harus di root folder `frontend/`

### Cannot find module '@supabase/supabase-js'
```bash
npm install @supabase/supabase-js
```

### CORS errors
Supabase handle ini otomatis. Jika masih error:
1. Check Supabase CORS settings
2. Verify Anon Key permissions

## Next Steps

1. Create auth components (Login, Register, Profile)
2. Build market/stall listing pages
3. Implement transaction creation form
4. Add dashboard with analytics
5. Implement QR code scanning

## Resources

- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
