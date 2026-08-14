import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import {
  normalizeScreensToFlatArray,
  safeHasOperation,
  isPermissionsAdmin,
} from '@/lib/permissions'

interface AppUserProfile {
  id: string
  name: string
  email: string
  access_level_id: string | null
  is_active: boolean
  access_levels: {
    id: string
    name: string
    permissions: Record<string, any> | null
  } | null
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: AppUserProfile | null
  permissions: string[]
  isAdmin: boolean
  canPerform: (screen: string, operation: string) => boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  resetPasswordEmail: (email: string) => Promise<{ error: any }>
  updatePassword: (password: string) => Promise<{ error: any }>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<AppUserProfile | null>(null)

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }

    let cancelled = false

    // Fetch the user's own row WITHOUT the embedded `access_levels(*)` join.
    // The join is subject to the access_levels RLS, and for users whose access
    // level does not grant the `access_levels` screen the embedded resource can
    // come back null — which then cascades into an empty permissions list and an
    // empty sidebar. Querying the columns we own directly avoids that.
    supabase
      .from('app_users')
      .select('id, name, email, access_level_id, is_active')
      .eq('id', user.id)
      .single()
      .then(async ({ data: userData, error }) => {
        if (cancelled) return
        if (error || !userData) {
          setProfile(null)
          return
        }

        let accessLevels: AppUserProfile['access_levels'] = null

        // Separately fetch the access level's permissions by id. The direct
        // SELECT on access_levels is permitted for all authenticated users, so
        // this works even for users who cannot manage access levels. Using
        // maybeSingle() so a missing/locked row simply yields null instead of
        // an error.
        if (userData.access_level_id) {
          const { data: alData } = await supabase
            .from('access_levels')
            .select('id, name, permissions')
            .eq('id', userData.access_level_id)
            .maybeSingle()
          if (!cancelled && alData) {
            accessLevels = {
              id: alData.id,
              name: alData.name,
              permissions: alData.permissions as Record<string, any> | null,
            }
          }
        }

        if (cancelled) return
        setProfile({
          id: userData.id,
          name: userData.name,
          email: userData.email,
          access_level_id: userData.access_level_id,
          is_active: userData.is_active,
          access_levels: accessLevels,
        })
      })

    return () => {
      cancelled = true
    }
  }, [user])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const resetPasswordEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error }
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    return { error }
  }

  const rawScreens = profile?.access_levels?.permissions?.screens ?? null
  const permissions: string[] = normalizeScreensToFlatArray(rawScreens)
  const isAdmin = isPermissionsAdmin(rawScreens)

  const canPerform = (screen: string, operation: string): boolean => {
    if (isAdmin) return true
    return safeHasOperation(rawScreens, screen, operation)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        permissions,
        isAdmin,
        canPerform,
        signIn,
        signOut,
        resetPasswordEmail,
        updatePassword,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
