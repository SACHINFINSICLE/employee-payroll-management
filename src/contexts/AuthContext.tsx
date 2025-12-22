import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { UserProfile, UserRole } from '@/types/database'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  isHR: boolean
  isFinance: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFetchingProfile, setIsFetchingProfile] = useState(false)

  const fetchProfile = async (userId: string, mounted: { current: boolean }, clearTimeoutFn: () => void) => {
    // Prevent duplicate fetches
    if (isFetchingProfile) {
      console.log('[Auth] Profile fetch already in progress, skipping...')
      return
    }
    
    setIsFetchingProfile(true)
    const profileStart = performance.now()
    console.log('[Auth] Starting profile fetch for user:', userId)
    
    try {
      // Add timeout to the query itself
      const queryPromise = supabase
        .from('user_profiles')
        .select('id, role, full_name, email, created_at, updated_at')
        .eq('id', userId)
        .single()

      // Race between query and timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile query timeout after 5s')), 5000)
      })

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any

      const profileTime = performance.now() - profileStart
      console.log(`[Auth] Profile fetch completed in ${profileTime.toFixed(0)}ms`)

      if (!mounted.current) return
      
      if (error) {
        console.error('[Auth] Error fetching profile:', error)
        console.error('[Auth] This likely means:')
        console.error('[Auth] 1. user_profiles table does not exist')
        console.error('[Auth] 2. No row exists for this user ID')
        console.error('[Auth] 3. RLS policies are blocking the query')
        console.error('[Auth] Run user_profiles_migration.sql to fix')
        
        // Still set loading to false even on error
        clearTimeoutFn()
        setLoading(false)
        return
      }
      
      console.log('[Auth] Profile data received:', { role: data.role, email: data.email })
      setProfile(data)
    } catch (error) {
      console.error('[Auth] Error fetching profile:', error)
      if (error instanceof Error && error.message.includes('timeout')) {
        console.error('[Auth] ⚠️ CRITICAL: Database query is hanging!')
        console.error('[Auth] Check Supabase dashboard for slow queries')
      }
    } finally {
      setIsFetchingProfile(false)
      if (mounted.current) {
        clearTimeoutFn()
        setLoading(false)
        console.log('[Auth] Loading complete')
      }
    }
  }

  useEffect(() => {
    const mounted = { current: true }
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const clearTimeoutFn = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }

    // Safety timeout - force loading to false after 8 seconds
    // This should be enough for even slow connections
    timeoutId = setTimeout(() => {
      if (mounted.current) {
        console.error('[Auth] Initialization timeout after 8s - possible network issue')
        setLoading(false)
      }
    }, 8000)

    // Get initial session
    const initAuth = async () => {
      const totalStart = performance.now()
      console.log('[Auth] 🚀 Starting auth initialization...')
      
      try {
        const sessionStart = performance.now()
        // Use getSession which checks localStorage first (faster)
        const { data: { session }, error } = await supabase.auth.getSession()
        const sessionTime = performance.now() - sessionStart
        
        console.log(`[Auth] ✓ getSession completed in ${sessionTime.toFixed(0)}ms`)
        
        if (!mounted.current) return
        
        if (error) {
          console.error('[Auth] ❌ Error getting session:', error)
          clearTimeoutFn()
          setLoading(false)
          return
        }
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('[Auth] Session found, fetching profile...')
          // Fetch profile with the user ID
          await fetchProfile(session.user.id, mounted, clearTimeoutFn)
          const totalTime = performance.now() - totalStart
          console.log(`[Auth] ✅ Total auth initialization: ${totalTime.toFixed(0)}ms`)
        } else {
          console.log('[Auth] No session found')
          // No session - clear loading immediately
          clearTimeoutFn()
          setLoading(false)
        }
      } catch (error) {
        console.error('[Auth] ❌ Error initializing auth:', error)
        if (mounted.current) {
          clearTimeoutFn()
          setLoading(false)
        }
      }
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted.current) return
        
        console.log('[Auth] Auth state changed:', event)
        
        // Only handle specific events to avoid duplicate fetches
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(session)
          setUser(session?.user ?? null)
          
          if (session?.user && !profile) {
            // Only fetch if we don't have a profile yet
            await fetchProfile(session.user.id, mounted, () => {})
          }
        } else if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
          setProfile(null)
        }
      }
    )

    return () => {
      mounted.current = false
      clearTimeoutFn()
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error: error as Error | null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const signUp = async (email: string, password: string, fullName: string, role: UserRole) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      })
      return { error: error as Error | null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  const isHR = profile?.role === 'hr' || profile?.role === 'admin'
  const isFinance = profile?.role === 'finance' || profile?.role === 'admin'
  const isAdmin = profile?.role === 'admin'

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        isHR,
        isFinance,
        isAdmin,
      }}
    >
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
