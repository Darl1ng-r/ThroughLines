import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../services/supabaseClient'

const AuthContext = createContext({})

async function authSignUp(email, password, username, displayName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        display_name: displayName
      }
    }
  })
  if (error) throw error
  return data
}

async function authSignIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  if (error) throw error
  return data
}

async function authSignOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

async function authSignInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard`
    }
  })
  if (error) throw error
  return data
}

async function authSignInWithGoogleCredential(idToken) {
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken
  })
  if (error) throw error
  return data
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) throw error

      if (!data) {
        // Auto-create missing profile for OAuth / new users
        const { data: userData } = await supabase.auth.getUser()
        const meta = userData?.user?.user_metadata || {}
        const rawName = meta.full_name || meta.name || userData?.user?.email?.split('@')[0] || "Thinker"
        const randSuffix = (crypto.getRandomValues(new Uint32Array(1))[0] % 1000)
        const cleanUsername = (meta.username || rawName).toLowerCase().replace(/[^a-z0-9_]/g, '') + randSuffix
        
        const { data: newProfile, error: createErr } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            username: cleanUsername,
            display_name: rawName,
            bio: "Writing throughlines on evolving thoughts."
          })
          .select()
          .single()

        if (!createErr && newProfile) {
          setProfile(newProfile)
          return
        }
      }

      setProfile(data)
    } catch (err) {
      console.error('Error fetching user profile:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    // Hard 3.5s timeout: prevent Supabase latency or cold-starts from permanently freezing the app
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        setLoading(false)
      }
    }, 3500)

    // Check active sessions
    supabase.auth.getSession()
      .then(({ data }) => {
        if (!isMounted) return
        const session = data?.session
        if (session) {
          setUser(session.user)
          void fetchProfile(session.user.id)
        } else {
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error('Auth session fetch failed:', err)
        if (isMounted) setLoading(false)
      })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return
      if (session) {
        setUser(session.user)
        await fetchProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
      subscription?.unsubscribe?.()
    }
  }, [fetchProfile])

  const updateProfile = useCallback(async (updates) => {
    if (!user) return
    // Whitelist fields to prevent Mass Assignment / Over-posting vulnerabilities
    const allowed = {}
    if (updates.display_name !== undefined) allowed.display_name = String(updates.display_name).slice(0, 100)
    if (updates.bio !== undefined) allowed.bio = String(updates.bio).slice(0, 500)
    if (updates.username !== undefined) allowed.username = String(updates.username).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30)

    const { error } = await supabase
      .from('profiles')
      .update(allowed)
      .eq('id', user.id)

    if (error) throw error
    await fetchProfile(user.id)
  }, [user, fetchProfile])

  const refreshProfile = useCallback(() => {
    if (user?.id) {
      return fetchProfile(user.id)
    }
    return Promise.resolve()
  }, [user?.id, fetchProfile])

  const contextValue = useMemo(() => ({
    user,
    profile,
    loading,
    signIn: authSignIn,
    signUp: authSignUp,
    signInWithGoogle: authSignInWithGoogle,
    signInWithGoogleCredential: authSignInWithGoogleCredential,
    signOut: authSignOut,
    updateProfile,
    refreshProfile
  }), [user, profile, loading, updateProfile, refreshProfile])

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
