import { useState, type FormEvent } from 'react'
import Icon from '../components/Icon'
import useAuth from '../context/useAuth'

interface LoginPageProps {
  onAuthenticated: () => void
}

function LoginPage({ onAuthenticated }: LoginPageProps) {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!login(username, password)) {
      setError('Usuário ou senha inválidos.')
      return
    }
    setError('')
    onAuthenticated()
  }

  return (
    <main className="login-shell">
      <section className="login-panel" aria-labelledby="login-heading">
        <div className="login-brand"><span className="brand__mark"><Icon name="car" size={21} /></span><span className="brand__name">frota<span>.</span></span></div>
        <p className="eyebrow">GESTÃO DE FROTA</p>
        <h1 id="login-heading">Acesso ao sistema</h1>
        <p className="login-description">Entre com suas credenciais para continuar.</p>
        <form className="login-form" noValidate onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="login-username">Usuário</label>
            <input id="login-username" autoComplete="username" autoFocus value={username} onChange={(event) => { setUsername(event.target.value); setError('') }} placeholder="Digite seu usuário" />
          </div>
          <div className="form-field">
            <label htmlFor="login-password">Senha</label>
            <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); setError('') }} placeholder="Digite sua senha" />
          </div>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button className="button button--primary login-submit" type="submit">Entrar <Icon name="arrow" size={18} /></button>
        </form>
        <p className="prototype-note">Acesso provisório de protótipo: <strong>admin / admin</strong></p>
      </section>
      <aside className="login-aside" aria-hidden="true">
        <span className="login-aside__mark"><Icon name="route" size={22} /></span>
        <p className="eyebrow">CONTROLE DE UTILIZAÇÃO</p>
        <h2>Uma visão clara da sua frota.</h2>
        <div className="login-aside__vehicle"><span className="brand__mark"><Icon name="car" size={21} /></span><div><strong>Carro do G&amp;C</strong><span>Gestão de Frota</span></div><span className="sidebar__vehicle-dot" /></div>
      </aside>
    </main>
  )
}

export default LoginPage