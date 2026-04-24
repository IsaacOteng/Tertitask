import { createContext, useContext, useEffect, useState } from 'react'
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { signOut as fbSignOut } from 'firebase/auth'
import { api } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = still loading
  const [me, setMe] = useState(null)

  const loading = user === undefined

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null)
        setMe(null)
        return
      }
      setUser(firebaseUser)
      try {
        const data = await api.post('/auth/sync/', {})
        setMe(data)
      } catch {
        setMe(null)
      }
    })
    return unsub
  }, [])

  async function signIn() {
    await signInWithPopup(auth, googleProvider)
  }

  async function signOut() {
    await fbSignOut(auth)
    setUser(null)
    setMe(null)
  }

  return (
    <AuthContext.Provider value={{ user, me, loading, signIn, signOut, setMe }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
