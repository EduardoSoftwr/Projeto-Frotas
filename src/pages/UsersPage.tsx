import AppLayout, { type AppPage } from '../components/AppLayout'
import ProtectedRoute from '../components/ProtectedRoute'

interface UsersPageProps {
  onNavigate: (page: AppPage) => void
}

function UsersPage({ onNavigate }: UsersPageProps) {
  return (
    <ProtectedRoute allowedRoles={['ADMIN']} page="users" onNavigate={onNavigate}>
      <AppLayout page="users" onNavigate={onNavigate}>
        <section className="panel access-denied">
          <p className="eyebrow">ADMINISTRAÇÃO</p>
          <h1>Usuários</h1>
          <p>O gerenciamento de usuários pelo Neon será disponibilizado em uma etapa posterior.</p>
        </section>
      </AppLayout>
    </ProtectedRoute>
  )
}

export default UsersPage
