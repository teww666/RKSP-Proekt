import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api';
import type { Booking, Room } from '../types';
import { canConfirmBookings, useAuth } from '../context/AuthProvider';

function toLocalInput(date: Date) {
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function BookingsPage() {
  const { profile, reloadProfile } = useAuth();
  const manager = profile && canConfirmBookings(profile.role);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newBooking, setNewBooking] = useState(() => ({
    roomId: '',
    startLocal: '',
    endLocal: '',
  }));

  const activeRooms = useMemo(() => rooms.filter((room) => room.isActive), [rooms]);

  useEffect(() => {
    reloadProfile().catch(() => undefined);
    const hydrate = async () => {
      setError(null);
      try {
        const [bookingRes, roomRes] = await Promise.all([
          apiClient.get<Booking[]>('/bookings'),
          apiClient.get<Room[]>('/rooms'),
        ]);
        setBookings(bookingRes.data);
        setRooms(roomRes.data);

        const start = new Date();
        start.setMinutes(0, 0, 0);
        start.setHours(start.getHours() + 1);
        const end = new Date(start.getTime());
        end.setHours(end.getHours() + 1);
        const firstRoom = roomRes.data.find((room) => room.isActive);
        setNewBooking({
          roomId: firstRoom?.id ?? '',
          startLocal: toLocalInput(start),
          endLocal: toLocalInput(end),
        });
      } catch {
        setError('Нет связи с API либо сессия недействительна.');
      }
    };
    void hydrate();
  }, [reloadProfile]);

  const reloadBookings = async () => {
    const refreshed = await apiClient.get<Booking[]>('/bookings');
    setBookings(refreshed.data);
  };

  const createBooking = async (evt: FormEvent) => {
    evt.preventDefault();
    setMessage(null);
    if (!newBooking.roomId) {
      setMessage('Выберите комнату или дождитесь загрузки списка.');
      return;
    }
    const startISO = new Date(newBooking.startLocal).toISOString();
    const endISO = new Date(newBooking.endLocal).toISOString();
    await apiClient.post('/bookings', {
      roomId: newBooking.roomId,
      startAt: startISO,
      endAt: endISO,
    });
    setMessage('Бронирование отправлено, статус PENDING до подтверждения менеджером.');
    await reloadBookings();
  };

  const confirmBooking = async (id: string) => {
    await apiClient.patch(`/bookings/${id}/confirm`);
    await reloadBookings();
  };

  const cancelBooking = async (id: string) => {
    await apiClient.delete(`/bookings/${id}`);
    await reloadBookings();
  };

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Планирование</p>
          <h1>Бронирования и статусы</h1>
          <p className="muted">
            Пользователь видит только свои записи, менеджеры и администратор — полный журнал аудита доступа RBAC на
            API.
          </p>
        </div>
      </header>
      {(error ?? '').length > 0 && <p className="error-banner">{error}</p>}
      {(message ?? '').length > 0 && <p className="info-banner">{message}</p>}
      <form className="card form-grid dense" onSubmit={createBooking}>
        <div>
          <h2>Создать бронирование</h2>
          <p className="muted small">
            Сервер блокирует пересечение интервалов, выбор прошлых интервалов для USER и любые попытки сменить владельца
            записи через API без роли ADMIN/MANAGER.
          </p>
        </div>
        <label>
          Комната
          <select
            value={newBooking.roomId}
            onChange={(evt) =>
              setNewBooking((prev) => ({
                ...prev,
                roomId: evt.target.value,
              }))
            }
            required
          >
            {!activeRooms.length && <option value="">Комнаты загружаются…</option>}
            {activeRooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name} · до {room.capacity}
              </option>
            ))}
          </select>
        </label>
        <label>
          Начало
          <input
            type="datetime-local"
            value={newBooking.startLocal}
            onChange={(evt) =>
              setNewBooking((prev) => ({
                ...prev,
                startLocal: evt.target.value,
              }))
            }
            required
          />
        </label>
        <label>
          Окончание
          <input
            type="datetime-local"
            value={newBooking.endLocal}
            onChange={(evt) =>
              setNewBooking((prev) => ({
                ...prev,
                endLocal: evt.target.value,
              }))
            }
            required
          />
        </label>
        <button type="submit" className="primary">
          Забронировать
        </button>
      </form>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Комната</th>
              <th>Интервал</th>
              <th>Пользователь</th>
              <th>Статус</th>
              <th aria-label="действия" />
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td>{booking.room.name}</td>
                <td>
                  <div>{new Date(booking.startAt).toLocaleString()}</div>
                  <div className="muted tiny">до {new Date(booking.endAt).toLocaleString()}</div>
                </td>
                <td>
                  <div>{booking.user?.fullName ?? booking.user?.email ?? booking.userId}</div>
                  <div className="muted tiny">{booking.user?.role}</div>
                </td>
                <td>
                  <span data-status={booking.status}>{booking.status}</span>
                </td>
                <td className="row-actions">
                  {manager && booking.status !== 'CONFIRMED' && booking.status !== 'CANCELLED' && (
                    <button type="button" className="ghost" onClick={() => confirmBooking(booking.id)}>
                      Подтвердить
                    </button>
                  )}
                  {booking.status !== 'CANCELLED' && profile && (profile.role !== 'USER' || booking.userId === profile.id) && (
                    <button type="button" className="ghost danger-text" onClick={() => cancelBooking(booking.id)}>
                      Отменить
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
