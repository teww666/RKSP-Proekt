import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';

export function AppLayout() {
  const navigate = useNavigate();
  const { profile, logout, canModerateRooms } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="logo-dot" aria-hidden />
          <div>
            <strong>MeetingHub</strong>
            <p className="muted">коворкинг · переговорные</p>
          </div>
        </div>
        <nav className="links">
          <NavLink end to="/rooms" className={({ isActive }) => (isActive ? 'active' : '')}>
            Комнаты
          </NavLink>
          <NavLink to="/bookings" className={({ isActive }) => (isActive ? 'active' : '')}>
            Брони
          </NavLink>
        </nav>
        <div className="identity">
          <div>
            <div className="email">{profile?.email}</div>
            <div className="role-pill">{profile?.role}</div>
            {canModerateRooms && (
              <p className="muted tiny">Вы можете добавлять и редактировать переговорные.</p>
            )}
          </div>
          <button type="button" className="ghost" onClick={handleLogout}>
            Выйти
          </button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
