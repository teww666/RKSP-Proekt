import { Link } from 'react-router-dom';

export function Landing() {
  return (
    <div className="hero">
      <div className="hero-card glow">
        <p className="eyebrow">ПРКСП · клиент-сервер</p>
        <h1>Сервис бронирования переговорных в коворкинге</h1>
        <p className="muted">
          Планируйте встречи, избегайте пересечений по времени и управляйте комнатами с ролями
          ADMIN / MANAGER / USER — безопасно и прозрачно.
        </p>
        <div className="hero-actions">
          <Link className="button primary" to="/login">
            Войти
          </Link>
          <Link className="button" to="/register">
            Открыть форму регистрации USER
          </Link>
        </div>
      </div>
      <aside className="hero-aside muted">
        <h3>Возможности</h3>
        <ul>
          <li>JWT-аутентификация c проверкой ролей при каждом запросе</li>
          <li>Строгое управление временными окнами и статусами бронирования</li>
          <li>Готовый контейнеризованный билд под облако</li>
        </ul>
      </aside>
    </div>
  );
}
