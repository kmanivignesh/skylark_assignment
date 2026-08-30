import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Agent from './pages/Agent';

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-surface-950">
        <Navbar />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/agent" element={
            <ProtectedRoute><Agent /></ProtectedRoute>
          } />
        </Routes>
      </div>
    </AuthProvider>
  );
}
