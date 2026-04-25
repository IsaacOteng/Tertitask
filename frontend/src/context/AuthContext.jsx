import { createContext, useContext, useEffect, useState } from 'react'
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { signOut as fbSignOut } from 'firebase/auth'
import { api } from '../lib/api'

const AuthContext = createContext(null)

const ONBOARDING_KEY = 'tt_onboarding_complete'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined)
  const [me, setMe] = useState(null)
  const [syncLoading, setSyncLoading] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)

  const loading = user === undefined || syncLoading

  function setMeAndCache(data) {
    setMe(data)
    // Cache onboarding state so refresh doesn't flash the modal
    if (data && !data._syncFailed) {
      localStorage.setItem(ONBOARDING_KEY, data.onboarding_complete ? '1' : '0')
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null)
        setMe(null)
        localStorage.removeItem(ONBOARDING_KEY)
        return
      }
      setUser(firebaseUser)
      setSyncLoading(true)
      try {
        await firebaseUser.getIdToken(true)
        const data = await api.post('/auth/sync/', {})
        setMeAndCache(data)
      } catch (err) {
        console.error('auth/sync failed:', err?.status, err?.message)
        // Don't show onboarding modal on sync failure — use cached value
        const cached = localStorage.getItem(ONBOARDING_KEY)
        setMe({
          onboarding_complete: cached === '1',
          email: firebaseUser.email,
          _syncFailed: true,
        })
      } finally {
        setSyncLoading(false)
      }
    })
    return unsub
  }, [])

  function openSignIn() {
    setShowSignIn(true)
  }

  async function signIn() {
    return signInWithPopup(auth, googleProvider)
  }

  async function signOut() {
    await fbSignOut(auth)
    setUser(null)
    setMe(null)
    localStorage.removeItem(ONBOARDING_KEY)
  }

  async function deleteAccount() {
    await api.delete('/me/delete/')
    // Firebase account already deleted server-side; sign out of local session.
    await fbSignOut(auth)
    setUser(null)
    setMe(null)
    localStorage.removeItem(ONBOARDING_KEY)
  }

  return (
    <AuthContext.Provider value={{ user, me, loading, signIn, openSignIn, showSignIn, setShowSignIn, signOut, deleteAccount, setMe: setMeAndCache }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
