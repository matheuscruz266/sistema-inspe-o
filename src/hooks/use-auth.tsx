import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { useState, useEffect, useCallback, useRef } from 'react'

interface Profile {
  id: string
  name: string
  email: string
  access_level_id: string | null
  access_levels: {
    id: string
    name: string
    permissions: Record<string, string[]>
  } | null
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  canPerform: (screen: string, action: string) => boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else {
        setProfile(null)
        setLoading(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('app_users')
      .select('*, access_levels(id, name, permissions)')
      .eq('id', userId)
      .single()
    setProfile(data as Profile)
    setLoading(false)
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const canPerform = (screen: string, action: string) => {
    if (!profile?.access_levels?.permissions) return false
    const perms = profile.access_levels.permissions[screen]
    return perms?.includes(action) ?? false
  }

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id)
  }

  return (
    <AuthContext.Provider
      value={{ user, session, profile, loading, signIn, signOut, canPerform, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return context
}

// ============================================
// REALTIME HOOKS (adicionado para colaboração)
// ============================================

export function useRealtimeRefresh({
  tables,
  onRefresh,
  onConflict,
  enabled = true,
}: {
  tables: string[]
  onRefresh: () => void
  onConflict?: (table: string, payload: any) => void
  enabled?: boolean
}) {
  const { profile } = useAuth()
  const channelRef = useRef<any>(null)
  const isProcessingRef = useRef(false)
  const lastEventRef = useRef<string>('')

  const handlePostgresChange = useCallback(
    (payload: any) => {
      if (!enabled) return

      const eventKey = `${payload.table}-${payload.eventType}-${payload.new?.id || payload.old?.id}-${Date.now()}`
      if (lastEventRef.current === eventKey) return
      lastEventRef.current = eventKey

      if (
        payload.eventType === 'INSERT' ||
        payload.eventType === 'UPDATE' ||
        payload.eventType === 'DELETE'
      ) {
        if (payload.new?.updated_by && payload.new.updated_by === profile?.id) return
        if (payload.old?.updated_by && payload.old.updated_by === profile?.id) return

        if (onConflict && payload.eventType === 'UPDATE' && payload.new) {
          onConflict(payload.table, payload.new)
        }

        if (!isProcessingRef.current) {
          isProcessingRef.current = true
          setTimeout(() => {
            onRefresh()
            isProcessingRef.current = false
          }, 100)
        }
      }
    },
    [enabled, onRefresh, onConflict, profile?.id],
  )

  useEffect(() => {
    if (!enabled || tables.length === 0) return

    const channelName = `realtime-refresh-${tables.join('-')}-${Date.now()}`
    const channel = supabase.channel(channelName)

    tables.forEach((table) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, handlePostgresChange)
    })

    channel.subscribe((status) => {
      if (status !== 'SUBSCRIBED') console.warn(`Realtime channel ${channelName} status:`, status)
    })

    channelRef.current = channel
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [tables.join(','), enabled, handlePostgresChange])

  const refresh = useCallback(() => onRefresh(), [onRefresh])
  return { refresh }
}

export function useRealtimeConflictDetection(openEntityId: string | null, entityType: string) {
  const { profile } = useAuth()
  const [conflict, setConflict] = useState<{ hasConflict: boolean; userName?: string }>({
    hasConflict: false,
  })

  useEffect(() => {
    if (!openEntityId) {
      setConflict({ hasConflict: false })
      return
    }
    const channel = supabase
      .channel(`conflict-${entityType}-${openEntityId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: entityType, filter: `id=eq.${openEntityId}` },
        (payload) => {
          if (payload.new?.updated_by && payload.new.updated_by !== profile?.id) {
            setConflict({
              hasConflict: true,
              userName: payload.new.updated_by_name || 'Outro usuário',
            })
          }
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
      setConflict({ hasConflict: false })
    }
  }, [openEntityId, entityType, profile?.id])

  return conflict
}
