import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { User } from '@/types'

// Auth state. The access token lives here (and is mirrored to localStorage so a
// page reload survives the MSW phase). The refresh token is an httpOnly cookie —
// never readable by JS — and is exercised by baseQueryWithReauth on 401.
interface AuthState {
  accessToken: string | null
  user: User | null
  // Set while a super admin is impersonating a Business Admin (HLD §3.2).
  impersonating: { orgName: string } | null
}

const TOKEN_KEY = 'cos.accessToken'
const USER_KEY = 'cos.user'

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

const initialState: AuthState = {
  accessToken: localStorage.getItem(TOKEN_KEY),
  user: loadUser(),
  impersonating: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ accessToken: string; user: User }>) {
      state.accessToken = action.payload.accessToken
      state.user = action.payload.user
      localStorage.setItem(TOKEN_KEY, action.payload.accessToken)
      localStorage.setItem(USER_KEY, JSON.stringify(action.payload.user))
    },
    // Used by baseQueryWithReauth after a successful /auth/refresh.
    setAccessToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload
      localStorage.setItem(TOKEN_KEY, action.payload)
    },
    loggedOut(state) {
      state.accessToken = null
      state.user = null
      state.impersonating = null
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    },
    // Super admin starts impersonating a Business Admin — swap the acting user,
    // keep the access token.
    setActingUser(state, action: PayloadAction<{ user: User; orgName: string }>) {
      state.user = action.payload.user
      state.impersonating = { orgName: action.payload.orgName }
      localStorage.setItem(USER_KEY, JSON.stringify(action.payload.user))
    },
    clearImpersonation(state, action: PayloadAction<{ user: User }>) {
      state.user = action.payload.user
      state.impersonating = null
      localStorage.setItem(USER_KEY, JSON.stringify(action.payload.user))
    },
  },
})

export const { setCredentials, setAccessToken, loggedOut, setActingUser, clearImpersonation } = authSlice.actions
export default authSlice.reducer
