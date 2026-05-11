import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, busy, profile, token } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password123');
  const [fullName, setFullName] = useState('');
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (!busy && token && profile) {
      navigate('/rooms', { replace: true });
    }
  }, [busy, navigate, profile, token]);

  const submit = async (evt: FormEvent) => {
    evt.preventDefault();
    setHint(null);
    const ok = await register({ email: email.trim(), password, fullName: fullName || undefined });
    if (!ok) {
      setHint('Пароль должен включать заглавную, строчную букву латиницы и цифру, не менее 8 символов.');
      return;
    }
    navigate('/rooms');
  };

  return (
    <div className="auth-grid narrow">
      <form className="card" onSubmit={submit}>
        <h2>Регистрация</h2>
        <p className="muted small">
          Новые аккаунты получают роль <strong>USER</strong> автоматически — без эскалации прав.
        </p>
        <label>
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Полное имя <span className="muted tiny">необязательно</span>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <label>
          Пароль <span className="muted tiny">латиница · цифра · заглавная/строчная</span>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {(hint ?? '').length > 0 && <p className="error-banner">{hint}</p>}
        <button type="submit" className="primary">
          Зарегистрироваться
        </button>
        <Link to="/login" className="inline-link">
          Есть аккаунт — войти
        </Link>
      </form>
    </div>
  );
}
