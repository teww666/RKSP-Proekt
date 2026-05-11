import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, busy, profile, token } = useAuth();
  const [email, setEmail] = useState('user@coworking.local');
  const [password, setPassword] = useState('User123!');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!busy && token && profile) {
      navigate('/rooms', { replace: true });
    }
  }, [busy, navigate, profile, token]);

  const submit = async (evt: FormEvent) => {
    evt.preventDefault();
    setLocalError(null);
    const ok = await login(email.trim(), password);
    if (!ok) {
      setLocalError('Не удалось войти. Используйте seed аккаунт или свой email.');
      return;
    }
    navigate('/rooms', { replace: true });
  };

  return (
    <div className="auth-grid">
      <form className="card" onSubmit={submit}>
        <h2>Вход</h2>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Пароль
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {(localError || '').length > 0 && <p className="error-banner">{localError}</p>}
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Проверяем…' : 'Войти'}
        </button>
        <p className="muted small">
          Нет аккаунта?{' '}
          <Link to="/register" className="inline-link">
            Зарегистрируйте USER аккаунт
          </Link>
        </p>
      </form>
      <div className="card subtle">
        <h3>Сидовые аккаунты</h3>
        <dl className="kv">
          <dt>ADMIN</dt>
          <dd>admin@coworking.local · Admin123!</dd>
          <dt>MANAGER</dt>
          <dd>manager@coworking.local · Manager123!</dd>
          <dt>USER</dt>
          <dd>user@coworking.local · User123!</dd>
        </dl>
      </div>
    </div>
  );
}
