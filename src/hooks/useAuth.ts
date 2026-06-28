import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { AppUser } from '../lib/types'

function getAuthRedirectUrl() {
  return `${window.location.origin}/login`
}

export function useAuth() {
  const [user, setUser]       = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [denied, setDenied]   = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) resolveRole(session.user.email!)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) resolveRole(session.user.email!)
      else { setUser(null); setLoading(false); setDenied(null) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function resolveRole(email: string) {
    setLoading(true)
    
    // 🔒 FETCH THE MASTER KEY DATA
    const { data, error } = await supabase
      .rpc('get_user_session_data', { search_email: email })

    if (error || !data) {
      setDenied(email)
      setUser(null)
    } else {
      setUser(data as AppUser)
      setDenied(null)
    }
    setLoading(false)
  }

  // Step 1: check email exists in app_users, then send magic link
  async function sendMagicLink(email: string): Promise<{ success: boolean; error?: string }> {
    const trimmed = email.toLowerCase().trim()

    // 🔒 Verify they actually exist in the database before sending a link
    const { data, error: dbError } = await supabase
      .rpc('get_user_session_data', { search_email: trimmed })

    if (dbError || !data) {
      return { success: false, error: 'This email is not registered. Contact your coordinator to be added.' }
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: getAuthRedirectUrl() },
    })

    if (error) return { success: false, error: error.message }
    return { success: true }
  }

  // Sign out the current user
  async function signOut() {
    await supabase.auth.signOut()
  }

  return {
    user,
    loading,
    denied,
    sendMagicLink,
    signOut
  }
}
