import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import rateLimit from 'express-rate-limit'

dotenv.config()

const app = express()
const port = process.env.PORT || 3001

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
})

app.use(limiter)

// CORS configuration - allow multiple origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean)

// CORS KETAT: semua request API wajib berasal dari origin terdaftar.
// Catatan: aplikasi mobile SIAGA tidak memakai Express API ini
// (langsung ke Supabase), sehingga request tanpa Origin ditolak.
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || !allowedOrigins.includes(origin)) {
      callback(new Error('Not allowed by CORS'))
    } else {
      callback(null, true)
    }
  },
  credentials: true,
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Health check DIPASANG SEBELUM CORS agar monitoring tools
// (tanpa Origin header) tetap bisa mengaksesnya.
// Endpoint ini tidak membocorkan data apa pun.
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Supabase admin client (service role)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// API routes
import marketsRouter from './routes/markets'
import officersRouter from './routes/officers'
import stallsRouter from './routes/stalls'
import transactionsRouter from './routes/transactions'
import usersRouter from './routes/users'
import { authenticateToken, requireAdmin } from './middleware/auth'

// Protected routes - require authentication
app.use('/api/markets', authenticateToken, marketsRouter)
app.use('/api/officers', authenticateToken, officersRouter)
app.use('/api/stalls', authenticateToken, stallsRouter)
app.use('/api/transactions', authenticateToken, transactionsRouter)

// User management routes - require admin role
app.use('/api/users', authenticateToken, requireAdmin, usersRouter)

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.listen(port, () => {
  console.log(`SIAGA API server running on port ${port}`)
})

export default app