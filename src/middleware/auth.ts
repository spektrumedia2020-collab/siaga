import { Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Middleware to verify Supabase JWT token
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      return res.status(403).json({ error: 'Invalid or expired token' })
    }

    // Attach user to request for downstream use
    ;(req as any).user = user
    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return res.status(500).json({ error: 'Authentication error' })
  }
}

// Middleware to check user role
export const checkRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const { data, error } = await supabaseAdmin
        .from('user_roles')
        .select(`
          role_id,
          market_id,
          roles (name)
        `)
        .eq('user_id', user.id)

      if (error || !data || data.length === 0) {
        return res.status(403).json({ error: 'No role assigned' })
      }

      const userRoles = data.map((r: any) => r.roles?.name || r.role_name)
      const hasAllowedRole = userRoles.some((role: string) => 
        allowedRoles.includes(role.toUpperCase())
      )

      if (!hasAllowedRole) {
        return res.status(403).json({ error: 'Insufficient permissions' })
      }

      next()
    } catch (error) {
      console.error('Role check error:', error)
      return res.status(500).json({ error: 'Authorization error' })
    }
  }
}

// Specific role middlewares
export const requireAdmin = checkRole(['ADMIN'])
export const requireMarketHead = checkRole(['MARKET_HEAD', 'MARKET_ADMIN', 'ADMIN_PASAR', 'PASAR_ADMIN'])
export const requireOfficer = checkRole(['OFFICER'])