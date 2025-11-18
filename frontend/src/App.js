import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import HomePage from './pages/HomePage';
import CatListPage from './pages/CatListPage';
import CatDetailPage from './pages/CatDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/AdminDashboard';
import FavoritesPage from './pages/FavoritesPage';
import PrivateRoute from './components/common/PrivateRoute';
import ProfilePage from './pages/ProfilePage';

function App() {
  return (
    <div className="flex flex-col min-h-screen font-sans">
      <Navbar />

      <main className="flex-grow container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/cats" element={<CatListPage />} />
          <Route path="/cats/:id" element={<CatDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/favorites" element={<FavoritesPage />} /> 

          <Route element={<PrivateRoute requiredRole="member" />}>
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          <Route element={<PrivateRoute requiredRole="admin" />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>

          <Route path="*" element={<div className="text-center text-red-500">404 - Page Not Found</div>} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;