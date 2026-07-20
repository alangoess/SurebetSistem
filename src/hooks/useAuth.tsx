import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, Database } from '@/lib/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  isBlocked: boolean
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  captureLead: (email: string, phone: string) => Promise<{ error: Error | null }>
  completeRegistration: (email: string, phone: string) => Promise<{ error: Error | null }>
}

const upsertLead = async (email: string, phone: string, status: 'abandoned' | 'registered' = 'abandoned', authUserId?: string) => {
  try {
    const { error } = await supabase
      .from('leads')
      .upsert(
        {
          email: email || null,
          phone: phone || null,
          status,
          ...(authUserId ? { auth_user_id: authUserId } : {}),
        },
        { onConflict: 'email' }
      )
    return { error: error as Error | null }
  } catch (err) {
    return { error: err as Error }
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TRIAL_DAYS = 3

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      if (error) {
        console.error('Error loading profile:', error)
        return
      }
      setProfile(data)
    } catch (err) {
      console.error('Failed to load profile:', err)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id)
  }, [user, loadProfile])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [loadProfile])

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error as Error | null }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  const captureLead = async (email: string, phone: string) => {
    return upsertLead(email, phone, 'abandoned')
  }

  const completeRegistration = async (email: string, phone: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (!userId) return { error: new Error('No authenticated session') }

      const { error } = await supabase
        .from('profiles')
        .update({
          phone,
          registration_completed: true,
          status_badge: 'lead',
          trial_started_at: new Date().toISOString(),
        })
        .eq('id', userId)
      if (error) return { error: error as Error | null }

      await upsertLead(email, phone, 'registered', userId)
      await loadProfile(userId)
      return { error: null }
    } catch (err) {
      return { error: err as Error }
    }
  }

  const isAdmin = profile?.is_admin ?? false

  const isBlocked = (() => {
    if (!user || !profile) return false
    if (profile.is_lifetime) return false
    if (profile.is_admin) return false
    if (profile.status_badge === 'cliente') {
      if (profile.expires_at) {
        const expired = new Date(profile.expires_at) < new Date()
        return expired
      }
      return false
    }
    // lead or expirado
    if (profile.status_badge === 'expirado') return true
    // lead with trial
    if (profile.trial_started_at) {
      const trialEnd = new Date(profile.trial_started_at)
      trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS)
      return new Date() > trialEnd
    }
    return false
  })()

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading, isAdmin, isBlocked,
      signUp, signIn, signOut, refreshProfile, captureLead, completeRegistration,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
