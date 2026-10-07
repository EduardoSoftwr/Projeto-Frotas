import type { ReactNode } from 'react'
import useFleet from '../context/useFleet'
import useAuth from '../context/useAuth'
import Icon from './Icon'

export type AppPage = 'dashboard' | 'new-usage' | 'return-usage' | 'history' | 'reports' | 'users' | 'login'

interface AppLayoutProps {
  page: AppPage
  onNavigate: (page: AppPage) => void
  children: ReactNode
}

function AppLayout({ page, onNavigate, children }: AppLayoutProps) {
  const { vehicle } = useFleet()
  const { user, logout } = useAuth()
  const canViewHistory = user?.role === 'ADMIN' || user?.role === 'GESTOR'
  const canManageUsers = user?.role === 'ADMIN'

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Navegação principal">
        <a className="brand" href="#inicio" aria-label="Gestão de Frota, início" onClick={(event) => { event.preventDefault(); onNavigate('dashboard') }}>
          <span className="brand__mark"><Icon name="car" size={21} /></span>
          <span className="brand__name">frota<span>.</span></span>
        </a>
        <div className="sidebar__group">
          <span className="sidebar__label">MENU</span>
          <button className={`nav-item${page === 'dashboard' ? ' nav-item--active' : ''}`} type="button" onClick={() => onNavigate('dashboard')}>
            <span className="nav-item__glyph"><Icon name="route" size={18} /></span> Dashboard
          </button>
          <button className={`nav-item${page === 'new-usage' ? ' nav-item--active' : ''}`} type="button" onClick={() => onNavigate('new-usage')}>
            <span className="nav-item__glyph"><Icon name="plus" size={18} /></span> Nova utilização
          </button>
          {canViewHistory && !canManageUsers && <button className={`nav-item${page === 'history' ? ' nav-item--active' : ''}`} type="button" onClick={() => onNavigate('history')}>
            <span className="nav-item__glyph"><Icon name="history" size={18} /></span> Histórico
          </button>}
        </div>
        {canManageUsers && <div className="sidebar__admin-group">
          <span className="sidebar__label">ADMINISTRAÇÃO</span>
          <button className={`nav-item${page === 'users' ? ' nav-item--active' : ''}`} type="button" onClick={() => onNavigate('users')}><span className="nav-item__glyph"><Icon name="user" size={18} /></span> Usuários</button>
          <button className={`nav-item${page === 'history' ? ' nav-item--active' : ''}`} type="button" onClick={() => onNavigate('history')}><span className="nav-item__glyph"><Icon name="history" size={18} /></span> Histórico</button>
          <button className={`nav-item${page === 'reports' ? ' nav-item--active' : ''}`} type="button" onClick={() => onNavigate('reports')}><span className="nav-item__glyph"><Icon name="arrow" size={18} /></span> Relatórios</button>
        </div>}
        <div className="sidebar__bottom"><span className="sidebar__vehicle-dot" /><span><strong>1 veículo</strong><small>na sua frota</small></span></div>
      </aside>

      <div className="workspace" id="inicio">
        <header className="topbar">
          <div className="topbar__crumb"><span>Frota</span><span className="topbar__separator">/</span><strong>{page === 'dashboard' ? 'Dashboard' : page === 'new-usage' ? 'Nova utilização' : page === 'history' ? 'Histórico' : page === 'reports' ? 'Relatórios' : page === 'users' ? 'Usuários' : 'Registrar devolução'}</strong></div>
          <div className="topbar__actions">
            <div className="topbar__vehicle"><span className={`topbar__vehicle-dot${vehicle.status === 'in_use' ? ' topbar__vehicle-dot--in-use' : ''}`} /><span>{vehicle.name}</span></div>
            {user && <><span className="topbar__user">{user.name}</span><button className="logout-button" type="button" onClick={() => { logout(); onNavigate('dashboard') }}><Icon name="logout" size={16} /> Sair</button></>}
          </div>
        </header>
        <div className="dashboard-content">{children}</div>
      </div>
    </main>
  )
}

export default AppLayout