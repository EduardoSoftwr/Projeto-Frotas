import { useState, type FormEvent } from 'react'
import AppLayout, { type AppPage } from '../components/AppLayout'
import ProtectedRoute from '../components/ProtectedRoute'
import useAuth from '../context/useAuth'
import type { ManagedUserRole, User } from '../types/auth'

interface UsersPageProps {
  onNavigate: (page: AppPage) => void
}

interface UserFormValues {
  username: string
  email: string
  password: string
  confirmPassword: string
  role: ManagedUserRole
}

type UserFormField = keyof UserFormValues
type UserFormErrors = Partial<Record<UserFormField, string>>

const emptyForm: UserFormValues = { username: '', email: '', password: '', confirmPassword: '', role: 'USUARIO' }
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function UsersPage({ onNavigate }: UsersPageProps) {
  const { user: currentUser, users, saveUser, setUserStatus } = useAuth()
  const [formValues, setFormValues] = useState<UserFormValues>(emptyForm)
  const [formErrors, setFormErrors] = useState<UserFormErrors>({})
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [notice, setNotice] = useState('')

  function openCreateForm() {
    setEditingUser(null)
    setFormValues(emptyForm)
    setFormErrors({})
    setIsFormOpen(true)
  }

  function openEditForm(account: User) {
    setEditingUser(account)
    setFormValues({ username: account.username, email: account.email, password: '', confirmPassword: '', role: account.role })
    setFormErrors({})
    setIsFormOpen(true)
  }

  function updateField(field: UserFormField, value: string) {
    setFormValues((current) => ({ ...current, [field]: value }))
    setFormErrors((current) => ({ ...current, [field]: undefined }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const username = formValues.username.trim()
    const email = formValues.email.trim()
    const errors: UserFormErrors = {}
    if (!username) errors.username = 'Informe o usuário.'
    else if (users.some((account) => account.id !== editingUser?.id && account.username.trim().toLocaleLowerCase('pt-BR') === username.toLocaleLowerCase('pt-BR'))) errors.username = 'Este usuário já está cadastrado.'
    if (!email) errors.email = 'Informe o e-mail.'
    else if (!emailPattern.test(email)) errors.email = 'Informe um e-mail válido.'
    else if (users.some((account) => account.id !== editingUser?.id && account.email.trim().toLocaleLowerCase('pt-BR') === email.toLocaleLowerCase('pt-BR'))) errors.email = 'Este e-mail já está cadastrado.'
    if (!editingUser && !formValues.password) errors.password = 'Informe a senha.'
    if (formValues.password && formValues.password !== formValues.confirmPassword) errors.confirmPassword = 'As senhas não coincidem.'
    if (!editingUser && !formValues.confirmPassword) errors.confirmPassword = 'Confirme a senha.'
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    const account: User = {
      id: editingUser?.id ?? crypto.randomUUID(),
      username,
      email,
      password: formValues.password || editingUser?.password || '',
      role: formValues.role,
      status: editingUser?.status ?? 'ATIVO',
      createdAt: editingUser?.createdAt ?? new Date().toISOString(),
    }
    const result = saveUser(account)
    if (result !== 'saved') {
      setFormErrors({
        ...(result === 'duplicate-username' ? { username: 'Este usuário já está cadastrado.' } : {}),
        ...(result === 'duplicate-email' ? { email: 'Este e-mail já está cadastrado.' } : {}),
        ...(result === 'last-admin' ? { role: 'Mantenha ao menos um administrador ativo.' } : {}),
        ...(result === 'protected-admin' ? { username: 'O administrador inicial do protótipo não pode ser alterado.' } : {}),
      })
      return
    }

    setIsFormOpen(false)
    setNotice(editingUser ? 'Usuário atualizado.' : 'Usuário cadastrado.')
  }

  function handleStatusChange(account: User) {
    const nextStatus = account.status === 'ATIVO' ? 'INATIVO' : 'ATIVO'
    if (setUserStatus(account.id, nextStatus)) {
      setNotice(nextStatus === 'ATIVO' ? 'Usuário ativado.' : 'Usuário desativado.')
      return
    }
    setNotice('Não é possível desativar o administrador inicial, sua própria conta ou o último administrador ativo.')
  }

  const sortedUsers = [...users].sort((first, second) => first.username.localeCompare(second.username, 'pt-BR'))

  return (
    <ProtectedRoute allowedRoles={['ADMIN']} page="users" onNavigate={onNavigate}>
      <AppLayout page="users" onNavigate={onNavigate}>
        <section className="users-heading">
          <div><p className="eyebrow">ADMINISTRAÇÃO</p><h1>Usuários</h1><p>Cadastre e gerencie os acessos administrativos.</p></div>
          <button className="button button--primary" type="button" onClick={openCreateForm}>+ Novo usuário</button>
        </section>
        <p className="users-security-note">Protótipo local: as senhas ainda não são protegidas por um backend.</p>
        {notice && <div className="inline-notice users-notice" role="status"><span>{notice}</span><button type="button" aria-label="Fechar aviso" onClick={() => setNotice('')}>Fechar</button></div>}
        <section className="panel users-table-panel" aria-label="Usuários cadastrados">
          <div className="users-table-summary"><strong>Contas cadastradas</strong><span>{users.length} {users.length === 1 ? 'usuário' : 'usuários'}</span></div>
          <div className="table-scroll">
            <table className="usage-table users-table">
              <thead><tr><th>Usuário</th><th>E-mail</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {sortedUsers.map((account) => (
                  <tr key={account.id}>
                    <td><strong className="users-table__username">{account.username}</strong></td>
                    <td>{account.email}</td>
                    <td><span className={`user-status-badge user-status-badge--${account.status.toLowerCase()}`}>{account.status}</span></td>
                    <td><div className="users-table__actions"><button type="button" onClick={() => openEditForm(account)}>Editar</button><button type="button" disabled={account.id === 'prototype-admin' || account.id === currentUser?.id} onClick={() => handleStatusChange(account)}>{account.status === 'ATIVO' ? 'Desativar' : 'Ativar'}</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {isFormOpen && (
          <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsFormOpen(false) }}>
            <section className="confirmation-dialog users-dialog" role="dialog" aria-modal="true" aria-labelledby="users-form-heading">
              <p className="eyebrow">ADMINISTRAÇÃO</p>
              <h2 id="users-form-heading">{editingUser ? 'Editar usuário' : 'Cadastrar usuário'}</h2>
              <p className="confirmation-dialog__intro">{editingUser ? 'Atualize os dados da conta.' : 'Preencha os dados para criar uma conta.'}</p>
              <form className="users-form" noValidate onSubmit={handleSubmit}>
                <label className="users-form__field">Usuário *
                  <input autoFocus autoComplete="username" value={formValues.username} disabled={editingUser?.id === 'prototype-admin'} onChange={(event) => updateField('username', event.target.value)} aria-invalid={Boolean(formErrors.username)} />
                  {formErrors.username && <span className="users-form__error" role="alert">{formErrors.username}</span>}
                </label>
                <label className="users-form__field">E-mail *
                  <input type="email" autoComplete="email" value={formValues.email} onChange={(event) => updateField('email', event.target.value)} aria-invalid={Boolean(formErrors.email)} />
                  {formErrors.email && <span className="users-form__error" role="alert">{formErrors.email}</span>}
                </label>
                <label className="users-form__field">{editingUser ? 'Nova senha' : 'Senha *'}
                  <input type="password" autoComplete={editingUser ? 'new-password' : 'new-password'} value={formValues.password} onChange={(event) => updateField('password', event.target.value)} aria-invalid={Boolean(formErrors.password)} disabled={editingUser?.id === 'prototype-admin'} />
                  {formErrors.password && <span className="users-form__error" role="alert">{formErrors.password}</span>}
                </label>
                <label className="users-form__field">{editingUser ? 'Confirmar nova senha' : 'Confirmar senha *'}
                  <input type="password" autoComplete="new-password" value={formValues.confirmPassword} onChange={(event) => updateField('confirmPassword', event.target.value)} aria-invalid={Boolean(formErrors.confirmPassword)} disabled={editingUser?.id === 'prototype-admin'} />
                  {formErrors.confirmPassword && <span className="users-form__error" role="alert">{formErrors.confirmPassword}</span>}
                </label>
                <label className="users-form__field">Perfil *
                  <select value={formValues.role} disabled={editingUser?.id === 'prototype-admin'} onChange={(event) => updateField('role', event.target.value as ManagedUserRole)}>
                    <option value="USUARIO">USUARIO</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                  {formErrors.role && <span className="users-form__error" role="alert">{formErrors.role}</span>}
                </label>
                {editingUser?.id === 'prototype-admin' && <p className="users-admin-note">As credenciais do administrador inicial são preservadas para acesso ao protótipo.</p>}
                <div className="confirmation-dialog__actions">
                  <button className="button button--secondary" type="button" onClick={() => setIsFormOpen(false)}>Cancelar</button>
                  <button className="button button--primary" type="submit">{editingUser ? 'Salvar alterações' : 'Cadastrar usuário'}</button>
                </div>
              </form>
            </section>
          </div>
        )}
      </AppLayout>
    </ProtectedRoute>
  )
}

export default UsersPage