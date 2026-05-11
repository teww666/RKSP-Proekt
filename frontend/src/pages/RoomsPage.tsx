import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { apiClient } from '../api';
import type { Room } from '../types';
import { canDestroyRooms, useAuth } from '../context/AuthProvider';

interface RoomFormState {
  name: string;
  capacity: number;
  description?: string;
  location?: string;
}

const emptyRoom: RoomFormState = {
  name: '',
  capacity: 4,
  description: '',
  location: '',
};

export function RoomsPage() {
  const { profile, reloadProfile } = useAuth();
  const canModerateRooms = profile?.role === 'ADMIN' || profile?.role === 'MANAGER';

  const [rooms, setRooms] = useState<Room[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyRoom);

  useEffect(() => {
    reloadProfile().catch(() => undefined);
    const loadRooms = async () => {
      setError(null);
      try {
        const res = await apiClient.get<Room[]>('/rooms');
        setRooms(res.data);
      } catch {
        setError('Не удалось загрузить переговорные.');
      }
    };
    void loadRooms();
  }, [reloadProfile]);

  const createRoom = async (evt: FormEvent) => {
    evt.preventDefault();
    await apiClient.post('/rooms', {
      ...form,
      capacity: Number(form.capacity),
    });
    setForm(emptyRoom);
    const res = await apiClient.get<Room[]>('/rooms');
    setRooms(res.data);
  };

  const toggleActive = async (room: Room) => {
    await apiClient.patch(`/rooms/${room.id}`, { isActive: !room.isActive });
    setRooms(await apiClient.get<Room[]>('/rooms').then((r) => r.data));
  };

  const removeRoom = async (room: Room) => {
    if (!window.confirm(`Удалить комнату «${room.name}»? Связанные бронирования удалятся каскадно.`)) {
      return;
    }
    await apiClient.delete(`/rooms/${room.id}`);
    setRooms(await apiClient.get<Room[]>('/rooms').then((r) => r.data));
  };

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Каталог</p>
          <h1>Переговорные площадки</h1>
          <p className="muted">
            Прозрачные характеристики площадок и возможность временно исключить комнату из выдачи.
          </p>
        </div>
      </header>
      {(error ?? '').length > 0 && <p className="error-banner">{error}</p>}
      <div className="grid-cards">
        {rooms.map((room) => (
          <article key={room.id} className={`mini-card ${room.isActive ? '' : 'muted-card'}`}>
            <header>
              <div>
                <h3>{room.name}</h3>
                <p className="muted">{room.location ?? 'Локация не указана'}</p>
              </div>
              <span className="capacity-pill">до {room.capacity} человек</span>
            </header>
            <p>{room.description ?? 'Описание отсутствует'}</p>
            <footer>
              <small className="muted">{room.isActive ? 'Активна' : 'Скрыта'}</small>
              {canModerateRooms && (
                <button type="button" className="ghost" onClick={() => toggleActive(room)}>
                  {room.isActive ? 'Выключить' : 'Включить'}
                </button>
              )}
              {profile && canDestroyRooms(profile.role) && (
                <button type="button" className="ghost danger-text" onClick={() => removeRoom(room)}>
                  Удалить (ADMIN)
                </button>
              )}
            </footer>
          </article>
        ))}
      </div>

      {canModerateRooms && (
        <form className="card form-grid" onSubmit={createRoom}>
          <div>
            <h2>Создание новой комнаты</h2>
            <p className="muted small">Доступно ролям MANAGER или ADMIN после проверки JWT.</p>
          </div>
          <label>
            Название
            <input
              required
              value={form.name}
              onChange={(evt) => setForm((prev) => ({ ...prev, name: evt.target.value }))}
            />
          </label>
          <label>
            Вместимость
            <input
              type="number"
              min={1}
              max={120}
              value={form.capacity}
              onChange={(evt) =>
                setForm((prev) => ({
                  ...prev,
                  capacity: Number(evt.target.value),
                }))
              }
            />
          </label>
          <label>
            Локация
            <input
              value={form.location ?? ''}
              onChange={(evt) =>
                setForm((prev) => ({
                  ...prev,
                  location: evt.target.value,
                }))
              }
            />
          </label>
          <label className="full-width">
            Описание оборудования
            <textarea
              rows={3}
              value={form.description ?? ''}
              onChange={(evt) =>
                setForm((prev) => ({
                  ...prev,
                  description: evt.target.value,
                }))
              }
            />
          </label>
          <button type="submit" className="primary">
            Сохранить
          </button>
        </form>
      )}
    </div>
  );
}
