# Deployment Guide - SIAGA Project

## Frontend (Vite) - Deploy ke Vercel

### 1. Build production
```bash
npm run build
```

### 2. Vercel deployment
- Push ke GitHub
- Import project di Vercel
- Set environment variables:
  - `VITE_SUPABASE_URL` = your Supabase URL
  - `VITE_SUPABASE_ANON_KEY` = your anon key
  - `VITE_API_URL` = your backend URL (Supabase Edge Functions atau server)

## Backend (Express) - Deploy ke Supabase Edge Functions

### 1. Buat Edge Function untuk API
```javascript
// supabase/functions/api-users/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )
  
  // Handle users endpoints
  // ... route logic disini
})
```

### 2. Deploy Edge Functions
```bash
supabase functions deploy api-users
supabase functions deploy api-markets
# dll
```

## Alternatif: Deploy Backend ke Platform Lain

### Railway/Render/Heroku
```bash
# Set environment variables
SUPABASE_URL=your_url
SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
PORT=3001
```

## Environment Variables Production

### Frontend (.env.production)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=https://your-backend-url.com
```

### Backend (.env)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PORT=3001
FRONTEND_URL=https://your-frontend-url.vercel.app