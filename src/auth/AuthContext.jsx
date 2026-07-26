import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, cloudEnabled, dataEnvironment, db } from '../storage/firebaseClient.js'

const AuthContext = createContext(null)
const provider = new GoogleAuthProvider()
provider.setCustomParameters({ prompt: 'select_account' })

const BOOTSTRAP_ACCOUNTS = {
  'owo2002@gmail.com': {
    enabled: true,
    role: 'owner',
    displayName: '관리자',
    canMigrateLegacy: true,
  },
  'shjo1218@gmail.com': {
    enabled: true,
    role: 'user',
    displayName: '조성현',
    canMigrateLegacy: true,
  },
}

async function readInvitation(user) {
  if (!user) return null
  const invitationRef = doc(db, 'allowedUsers', user.uid)
  const snapshot = await getDoc(invitationRef)
  if (snapshot.exists()) {
    return snapshot.data().enabled !== false ? snapshot.data() : null
  }

  const email = user.email?.toLowerCase()
  const bootstrap = user.emailVerified ? BOOTSTRAP_ACCOUNTS[email] : null
  if (!bootstrap) return null
  const invitation = { ...bootstrap, email, createdBy: 'bootstrap-allowlist' }
  await setDoc(invitationRef, invitation)
  return invitation
}

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    loading: cloudEnabled,
    user: null,
    invitation: null,
    error: '',
  })

  useEffect(() => {
    if (!cloudEnabled) return undefined
    setPersistence(auth, browserLocalPersistence).catch(() => {})
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ loading: false, user: null, invitation: null, error: '' })
        return
      }
      try {
        const invitation = await readInvitation(user)
        if (!invitation) {
          await signOut(auth)
          setState({
            loading: false,
            user: null,
            invitation: null,
            error: '초대되지 않은 Google 계정입니다.',
          })
          return
        }
        setState({ loading: false, user, invitation, error: '' })
      } catch {
        setState({
          loading: false,
          user: null,
          invitation: null,
          error: '사용 권한을 확인하지 못했습니다. Firebase 보안 규칙과 초대 목록을 확인해 주세요.',
        })
      }
    })
  }, [])

  const login = async () => {
    setState((value) => ({ ...value, error: '' }))
    try {
      await signInWithPopup(auth, provider)
    } catch (error) {
      if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/cancelled-popup-request') {
        await signInWithRedirect(auth, provider)
        return
      }
      if (error?.code !== 'auth/popup-closed-by-user') {
        setState((value) => ({ ...value, error: 'Google 로그인에 실패했습니다.' }))
      }
    }
  }

  const value = useMemo(() => ({
    ...state,
    cloudEnabled,
    dataEnvironment,
    login,
    logout: () => signOut(auth),
  }), [state])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

export function AuthGate({ children }) {
  const authState = useAuth()
  if (!authState.cloudEnabled) return children
  if (authState.loading) return <div className="loading-screen">🔐 계정 확인 중…</div>
  if (authState.user) return children

  return (
    <main className="auth-screen">
      <div className="card auth-card">
        <div style={{ fontSize: 36, marginBottom: 12 }}>🌲</div>
        <h1>학습 플래너</h1>
        <p className="hint">초대받은 Google 계정으로 로그인해 주세요.</p>
        {authState.error && <div className="auth-error">{authState.error}</div>}
        <button className="btn" type="button" onClick={authState.login}>
          Google 계정으로 로그인
        </button>
      </div>
    </main>
  )
}
