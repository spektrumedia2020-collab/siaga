import { ReactNode, useEffect, useState } from 'react'
import { getUserRole, UserRole } from '../lib/roleUtils'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: string
  userId: string
  onRoleLoaded?: (role: UserRole | null) => void
}

export function ProtectedRoute({
  children,
  requiredRole,
  userId,
  onRoleLoaded
}: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [userRole, setUserRole] = useState<UserRole | null>(null)

  useEffect(() => {
    const checkRole = async () => {
      try {
        const role = await getUserRole(userId)
        setUserRole(role)
        onRoleLoaded?.(role)

        if (!requiredRole) {
          setAllowed(true)
        } else {
          setAllowed(role?.role_name === requiredRole)
        }
      } catch (err) {
        console.error('Error checking role:', err)
        setAllowed(false)
      } finally {
        setLoading(false)
      }
    }

    checkRole()
  }, [userId, requiredRole, onRoleLoaded])

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #2D5016 0%, #1a1a1a 100%)',
        color: '#FFD700'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Memuat...</h2>
          <p>Checking your access...</p>
        </div>
      </div>
    )
  }

  if (!allowed) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #2D5016 0%, #1a1a1a 100%)',
        color: '#FFD700'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2>❌ Akses Ditolak</h2>
          <p>Role Anda: {userRole?.role_name}</p>
          <p>Diperlukan: {requiredRole}</p>
          <p>Anda tidak memiliki akses ke halaman ini.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
