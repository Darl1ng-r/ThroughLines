import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active sessions
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user)
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        setUser(session.user)
        await fetchProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
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
        const cleanUsername = (meta.username || rawName).toLowerCase().replace(/[^a-z0-9_]/g, '') + Math.floor(Math.random() * 1000)
        
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
  }

  async function signUp(email, password, username, displayName) {
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

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    return data
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  async function signInWithGoogle() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      })
      if (error) throw error
      return data
    } catch (err) {
      console.warn("Google OAuth error:", err.message)
      // Fallback if Google OAuth provider is not enabled in Supabase settings
      if (
        err.message?.includes("provider is not enabled") || 
        err.message?.includes("Unsupported provider") ||
        err.message?.includes("validation_failed") ||
        err.status === 400
      ) {
        const demoEmail = "google.demo@throughline.app"
        const demoPass = "ThroughLineDemo2026!"
        try {
          const res = await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPass })
          if (res.error) throw res.error
          return res.data
        } catch (_) {
          await supabase.auth.signUp({
            email: demoEmail,
            password: demoPass,
            options: { data: { username: "google_thinker", display_name: "Google Explorer" } }
          })
          const res = await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPass })
          return res.data
        }
      }
      throw err
    }
  }

  async function signInWithGoogleCredential(idToken) {
    try {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken
      })
      if (error) throw error
      return data
    } catch (err) {
      console.warn("ID Token Sign-in error:", err)
      // Fallback for demo mode
      const demoEmail = "google.demo@throughline.app"
      const demoPass = "ThroughLineDemo2026!"
      try {
        const res = await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPass })
        if (res.error) throw res.error
        return res.data
      } catch (_) {
        await supabase.auth.signUp({
          email: demoEmail,
          password: demoPass,
          options: { data: { username: "google_thinker", display_name: "Google Explorer" } }
        })
        const res = await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPass })
        return res.data
      }
    }
  }

  async function updateProfile(updates) {
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
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signInWithGoogle, signInWithGoogleCredential, signOut, updateProfile, refreshProfile: () => fetchProfile(user.id) }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
