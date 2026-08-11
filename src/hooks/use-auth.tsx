import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

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
  permissions: string[] | null
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
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
    if (user) {
      supabase
        .from('app_users')
        .select('*, access_levels(*)')
        .eq('id', user.id)
        .single()
        .then(({ data }) => setProfile(data as AppUserProfile | null))
    } else {
      setProfile(null)
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

  const rawScreens = profile?.access_levels?.permissions?.screens ?? null
  const permissions: string[] | null = Array.isArray(rawScreens)
    ? (rawScreens as string[])
    : rawScreens && typeof rawScreens === 'object'
      ? Object.entries(rawScreens)
          .filter(([, ops]: [string, any]) => ops?.SELECT === true)
          .map(([key]: [string, any]) => key)
      : null
  const isAdmin = !!permissions?.includes('access_levels') || !!permissions?.includes('users')

  return (
    <AuthContext.Provider
      value={{ user, session, profile, permissions, isAdmin, signIn, signOut, loading }}
    >
      {children}
    </AuthContext.Provider>
  )
}
