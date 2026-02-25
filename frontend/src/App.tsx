import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { BarChart3, TestTubes, LogOut, Key, QrCode, Menu, Shield, Layers } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { API_BASE_URL } from './services/api';
import { useIsMobile } from './hooks/useIsMobile';
import Dashboard from './pages/Dashboard';
import AmostrasPage from './pages/AmostrasPage';
import LoginPage from './pages/LoginPage';
import QRScannerPage from './pages/QRScannerPage';
import AdminPanelPage from './pages/AdminPanelPage';
import WorksheetPage from './pages/WorksheetPage';
import logoImg from './img/LabAguaLogo.png';
import React, { useState } from 'react';
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
  const { isMobile } = useIsMobile();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  // Componente de Link para navegação
  const NavLink = ({ to, icon: Icon, label, showLabel = true }: { to: string; icon: any; label: string; showLabel?: boolean }) => {
    const active = isActive(to);
    return (
      <Link
        to={to}
        onClick={() => setShowMobileMenu(false)}
        className={`group relative flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-bold transition-all duration-300 ease-out 
        ${active
            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
            : 'text-slate-500 hover:bg-blue-50/80 hover:text-blue-600'
          } ${isMobile ? 'flex-col text-xs gap-1 min-w-[64px]' : 'hover:-translate-y-0.5'}`}
      >
        <Icon size={isMobile ? 24 : 20} className={`transition-transform duration-300 ${active && !isMobile ? 'scale-110' : 'group-hover:scale-110'}`} />
        {showLabel && <span className={isMobile ? 'text-[10px] tracking-tight' : ''}>{label}</span>}
      </Link>
    );
  };

  // Mobile: Bottom Tab Bar
  if (isMobile) {
    return (
      <>
        {/* Header simplificado para mobile */}
        <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/50 shadow-sm fixed top-0 left-0 right-0 z-40 transition-all">
          <div className="flex items-center justify-between px-4 h-16">
            <img src={logoImg} alt="LabÁgua" className="h-10 w-auto drop-shadow-sm" />

            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-700 max-w-[120px] truncate bg-slate-100/80 px-3 py-1.5 rounded-full">
                {user?.full_name?.split(' ')[0]}
              </span>
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2.5 text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-full shadow-sm transition-all active:scale-95 flex items-center justify-center"
              >
                <Menu size={20} />
              </button>
            </div>
          </div>
        </header>

        {/* Menu dropdown mobile */}
        {showMobileMenu && (
          <div className="fixed top-14 right-0 bg-white shadow-lg rounded-bl-xl border border-slate-200 z-50 min-w-[200px]">
            <div className="p-4 border-b border-slate-100">
              <p className="font-bold text-slate-900">{user?.full_name}</p>
              <p className="text-xs text-slate-500">{user?.role}</p>
            </div>
            <div className="p-2">
              <button
                onClick={() => {
                  setShowPasswordModal(true);
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-lg text-left"
              >
                <Key size={20} />
                Alterar Senha
              </button>
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg text-left"
              >
                <LogOut size={20} />
                Sair
              </button>
            </div>
          </div>
        )}

        {/* Backdrop para fechar menu */}
        {showMobileMenu && (
          <div
            className="fixed inset-0 z-30"
            onClick={() => setShowMobileMenu(false)}
          />
        )}

        {/* Bottom Tab Bar */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200/60 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-40 safe-area-bottom pb-safe transition-all">
          <div className="flex justify-around items-end pt-2 pb-1 px-2 h-[72px]">
            <NavLink to="/" icon={BarChart3} label="Início" />
            <NavLink to="/amostras" icon={TestTubes} label="Amostras" />

            {/* Ação Principal: Leitor QR Code Elevado */}
            <Link
              to="/scanner"
              onClick={() => setShowMobileMenu(false)}
              className={`relative -top-3 flex flex-col items-center justify-center w-[58px] h-[58px] rounded-full shadow-lg transition-all duration-300 active:scale-95 ${isActive("/scanner")
                ? "bg-blue-700 shadow-blue-500/50 text-white scale-105"
                : "bg-blue-600 shadow-blue-500/30 text-white hover:bg-blue-700 hover:scale-105"
                }`}
            >
              <QrCode size={26} className={isActive("/scanner") ? "" : "animate-[pulse_3s_ease-in-out_infinite]"} />
            </Link>

            {hasRole('ADMIN', 'PROFESSOR', 'TÉCNICO') && (
              <NavLink to="/worksheet" icon={Layers} label="Lotes" />
            )}

            {hasRole('ADMIN') && (
              <NavLink to="/admin" icon={Shield} label="Admin" />
            )}
          </div>
        </nav>

        {/* Espaçadores para conteúdo não ficar sob header/nav */}
        <div className="h-16" /> {/* Espaço para header */}

        <ChangePasswordModal show={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
      </>
    );
  }

  // Desktop: Navegação tradicional
  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] transition-all">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="LabÁgua" className="h-14 w-auto drop-shadow-sm hover:scale-105 transition-transform duration-300" />
          </div>

          <div className="flex gap-1.5 items-center">
            <NavLink to="/" icon={BarChart3} label="Dashboard" />
            <NavLink to="/amostras" icon={TestTubes} label="Amostras" />
            <NavLink to="/scanner" icon={QrCode} label="Escaneamento Rápido" />

            {hasRole('ADMIN', 'PROFESSOR', 'TÉCNICO') && (
              <NavLink to="/worksheet" icon={Layers} label="Mapas de Trabalho" />
            )}

            {hasRole('ADMIN') && (
              <NavLink to="/admin" icon={Shield} label="Admin" />
            )}

            <div className="ml-6 pl-6 border-l border-slate-200/80 flex items-center gap-4">
              <div className="text-right">
                <div className="font-bold text-slate-800 tracking-tight">{user?.full_name}</div>
                <div className="text-blue-600 font-medium text-[11px] uppercase tracking-wider">{user?.role}</div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="p-2.5 text-slate-400 bg-slate-50 hover:bg-white border border-slate-100 hover:border-blue-200 hover:text-blue-600 rounded-xl shadow-sm hover:shadow transition-all active:scale-95"
                  title="Alterar senha"
                >
                  <Key size={18} />
                </button>
                <button
                  onClick={logout}
                  className="p-2.5 text-slate-400 bg-slate-50 hover:bg-red-50 border border-slate-100 hover:border-red-200 hover:text-red-600 rounded-xl shadow-sm hover:shadow transition-all active:scale-95"
                  title="Sair"
                >
                  <LogOut size={18} />
                </button>
              </div>
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
  const { isMobile } = useIsMobile();

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
    <div className={`min-h-screen bg-slate-50 ${isMobile ? 'pb-20' : ''}`}>
      <Navigation />
      <Routes>
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/amostras" element={<ProtectedRoute><AmostrasPage /></ProtectedRoute>} />
        <Route path="/worksheet" element={<ProtectedRoute requiredRoles={['ADMIN', 'PROFESSOR', 'TÉCNICO']}><WorksheetPage /></ProtectedRoute>} />
        <Route path="/scanner" element={<ProtectedRoute><QRScannerPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute requiredRoles={['ADMIN']}><AdminPanelPage /></ProtectedRoute>} />
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