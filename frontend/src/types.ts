export type Role = 'ADMIN' | 'MANAGER' | 'USER';

export interface Profile {
  id: string;
  email: string;
  fullName?: string | null;
  role: Role;
  createdAt: string;
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  description?: string | null;
  location?: string | null;
  isActive: boolean;
  createdAt: string;
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface Booking {
  id: string;
  userId: string;
  roomId: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  createdAt: string;
  room: Room;
  user?: { id: string; email: string; fullName?: string | null; role: Role };
}
