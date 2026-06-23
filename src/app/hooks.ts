import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux'
import type { AppDispatch, RootState } from './store'

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

export const useCurrentUser = () => useAppSelector((s) => s.auth.user)
export const useIsAuthenticated = () => useAppSelector((s) => !!s.auth.accessToken && !!s.auth.user)
