import type { ReactNode } from 'react'
import type { UserRole } from '../types/auth'
import useAuth from '../context/useAuth'
import AppLayout, { type AppPage } from './AppLayout'

interface ProtectedRouteProps {
  allowedRoles: UserRole[]
  page?: AppPage
  onNavigate: (page: AppPage) => void
  children: ReactNode
}

function ProtectedRoute({ allowedRoles, page = 'history', onNavigate, children }: ProtectedRouteProps) {
  const { user, isAuthLoading } = useAuth()

  if (user && allowedRoles.includes(user.role)) return children

  return (
    <AppLayout page={page} onNavigate={onNavigate}>
      <section className="access-denied panel" role="alert">
        <span className="access-denied__icon"><IconLock /></span>
        <p className="eyebrow">ACESSO RESTRITO</p>
        <h1>{isAuthLoading ? 'Validando sessão…' : user ? 'Acesso não autorizado.' : 'Entre para continuar.'}</h1>
        <p>{isAuthLoading ? 'Consultando a sessão com o servidor.' : user ? 'Seu perfil não tem permissão para acessar esta área.' : 'Esta área está disponível somente para usuários autorizados.'}</p>
        {!isAuthLoading && <div className="access-denied__actions"><button className="button button--primary" type="button" onClick={() => onNavigate(user ? 'dashboard' : 'login')}>{user ? 'Voltar para o Dashboard' : 'Entrar'}</button>{user && <button className="button button--secondary" type="button" onClick={() => onNavigate('login')}>Trocar usuário</button>}</div>}
      </section>
    </AppLayout>
  )
}

function IconLock() {
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
    </svg>
  )
}

export default ProtectedRoute
