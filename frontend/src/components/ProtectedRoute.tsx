import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { profile, busy, token } = useAuth();

  if (busy) {
    return (
      <div className="page-center muted">
        <div className="spinner" />
        Подтягиваем профиль...
      </div>
    );
  }

  if (!token || !profile) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
