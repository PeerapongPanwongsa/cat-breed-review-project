import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const PrivateRoute = ({ requiredRole = 'member' }) => {
  const { isLoggedIn, isAdmin } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole === 'admin' && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;