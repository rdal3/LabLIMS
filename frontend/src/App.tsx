import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { BarChart3, TestTubes, Users, LogOut, Key, QrCode } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { API_BASE_URL } from './services/api';
import Dashboard from './pages/Dashboard';
import AmostrasPage from './pages/AmostrasPage';
import LoginPage from './pages/LoginPage';
import UsersPage from './pages/UsersPage';
import QRScannerPage from './pages/QRScannerPage';
import logoImg from './img/LabAguaLogo.png';
import { useState } from 'react';

function ChangePasswordModal({ show, onClose }: { show: boolean; onClose: () => void }) {
  const { token } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('As senhas não conferem');
      return;
    }

    if (newPassword.length < 8) {
      setError('Nova senha deve ter no mínimo 8 caracteres');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 2000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="bg-blue-600 px-6 py-4 text-white flex justify-between items-center rounded-t-xl">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Key size={20} />
            Alterar Senha
          </h2>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border-2 border-emerald-200 text-emerald-700 p-3 rounded-lg text-sm">
              ✅ Senha alterada com sucesso!
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Senha Atual</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Nova Senha</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              minLength={8}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Confirmar Nova Senha</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-4 py-2 rounded-lg font-bold"
            >
              {loading ? 'Alterando...' : 'Alterar Senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Navigation() {
  const location = useLocation();
  const { user, logout, hasRole } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="LabÁgua" className="h-15 w-auto" />
          </div>

          <div className="flex gap-2 items-center">
            <Link
              to="/"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${isActive('/')
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <BarChart3 size={20} />
              Dashboard
            </Link>

            <Link
              to="/amostras"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${isActive('/amostras')
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <TestTubes size={20} />
              Amostras
            </Link>

            <Link
              to="/scanner"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${isActive('/scanner')
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <QrCode size={20} />
              Scanner
            </Link>

            {hasRole('ADMIN', 'PROFESSOR') && (
              <Link
                to="/users"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${isActive('/users')
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
                  }`}
              >
                <Users size={20} />
                Usuários
              </Link>
            )}

            <div className="ml-4 pl-4 border-l border-slate-200 flex items-center gap-3">
              <div className="text-sm">
                <div className="font-bold text-slate-900">{user?.full_name}</div>
                <div className="text-slate-500 text-xs">{user?.role}</div>
              </div>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                title="Alterar senha"
              >
                <Key size={20} />
              </button>
              <button
                onClick={logout}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                title="Sair"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
      <ChangePasswordModal show={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
    </nav>
  );
}

function ProtectedRoute({ children, requiredRoles }: { children: React.ReactNode; requiredRoles?: string[] }) {
  const { isAuthenticated, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && !hasRole(...requiredRoles)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <Routes>
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/amostras" element={<ProtectedRoute><AmostrasPage /></ProtectedRoute>} />
        <Route path="/scanner" element={<ProtectedRoute><QRScannerPage /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute requiredRoles={['ADMIN', 'PROFESSOR']}><UsersPage /></ProtectedRoute>} />
        <Route path="/login" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;