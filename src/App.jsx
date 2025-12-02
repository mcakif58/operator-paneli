import React, { useState, useMemo } from 'react';
import { Database, User, Settings, AlertTriangle, Play, StopCircle, LogOut, CheckCircle, XCircle, Lock } from 'lucide-react';
import { supabase } from './supabase';
import AdminPanel from './AdminPanel';

// --- VERİTABANI SİMÜLASYONU ---
// Normalde bu veriler Supabase'den gelecek.
const MOCK_OPERATORS = [
  { id: 1, name: 'Ali Yılmaz', role: 'Operatör' },
  { id: 2, name: 'Veli Demir', role: 'Operatör' },
  { id: 3, name: 'Ayşe Kaya', role: 'Vardiya Amiri' },
];

const STOP_REASONS = [
  'Makine Arızası',
  'Hammadde Bekleme',
  'Mola',
  'Mesai Bitişi / Değişimi',
  'Planlı Bakım',
  'Diğer',
];

const ERROR_REASONS = [
  'Kalite Problemi',
  'Setup Hatası',
  'Ekipman Eksiği',
  'Hatalı Parametre',
  'Personel Hatası',
  'Diğer',
];
// --- VERİTABANI SİMÜLASYONU BİTİŞİ ---


// --- Ana Uygulama Bileşeni ---
export default function App() {
  const [currentPage, setCurrentPage] = useState('login'); // 'login', 'app', 'admin', 'adminLogin'
  const [currentUser, setCurrentUser] = useState(null);
  const [adminSession, setAdminSession] = useState(null);

  // Dinamik veri state'leri
  const [operators, setOperators] = useState(MOCK_OPERATORS);
  const [stopReasons, setStopReasons] = useState(STOP_REASONS);
  const [errorReasons, setErrorReasons] = useState(ERROR_REASONS);

  // İYİLEŞTİRME: Makine durumunu (state) ana bileşene taşıdık.
  // Bu sayede çıkış yapıldığında durumu sıfırlayabiliriz.
  const [machineState, setMachineState] = useState('idle'); // 'idle', 'running', 'stopped'

  // Bu fonksiyon Supabase'e veri gönderecek
  const logEvent = async (type, reason) => {
    const timestamp = new Date().toISOString();
    const logData = {
      operator_id: currentUser.id,
      operator_name: currentUser.name,
      event_type: type, // 'START', 'STOP', 'ERROR'
      event_reason: reason, // 'Mola', 'Kalite Problemi' etc.
      timestamp: timestamp,
    };

    console.log('EVENT LOGGED TO DATABASE:', logData);

    try {
      const { error } = await supabase.from('logs').insert([logData]);
      if (error) {
        console.error('Supabase Hata:', error);
        alert('Veri kaydedilirken hata oluştu: ' + error.message);
      }
    } catch (err) {
      console.error('Beklenmeyen hata:', err);
    }
  };

  // Operatör seçildiğinde
  const handleOperatorLogin = (operator) => {
    setCurrentUser(operator);
    setCurrentPage('app');
  };

  // Çıkış yapıldığında
  const handleLogout = () => {
    setCurrentUser(null);
    setMachineState('idle'); // Makine durumunu sıfırla
    setCurrentPage('login');
  };

  // Admin girişi
  const handleAdminLoginRequest = () => {
    setCurrentPage('adminLogin');
  };

  // Admin login handler
  const handleAdminLogin = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert('Giriş hatası: ' + error.message);
      return false;
    }

    if (data.session) {
      setAdminSession(data.session);
      setCurrentPage('admin');
      return true;
    }
    return false;
  };

  // Admin çıkış
  const handleAdminLogout = async () => {
    await supabase.auth.signOut();
    setAdminSession(null);
    setCurrentPage('login');
  };

  // Hangi ekranın gösterileceğini seçen kısım
  const renderPage = () => {
    switch (currentPage) {
      case 'app':
        return (
          <MainAppPanel
            currentUser={currentUser}
            onLogout={handleLogout}
            logEvent={logEvent}
            machineState={machineState}
            setMachineState={setMachineState}
            stopReasons={stopReasons}
            errorReasons={errorReasons}
          />
        );
      case 'admin':
        return (
          <AdminPanel
            session={adminSession}
            onLogout={handleAdminLogout}
            operators={operators}
            setOperators={setOperators}
            stopReasons={stopReasons}
            setStopReasons={setStopReasons}
            errorReasons={errorReasons}
            setErrorReasons={setErrorReasons}
          />
        );
      case 'adminLogin':
        return <AdminLoginScreen onLogin={handleAdminLogin} onBack={() => setCurrentPage('login')} />;
      case 'login':
      default:
        return <OperatorSelectScreen operators={operators} onSelectOperator={handleOperatorLogin} onGoToAdmin={handleAdminLoginRequest} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {renderPage()}
      </div>
    </div>
  );
}

// --- 1. Ekran: Operatör Seçimi ---
function OperatorSelectScreen({ operators, onSelectOperator, onGoToAdmin }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-xl animate-fade-in">
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
        Operatör Seçin
      </h2>
      <div className="grid grid-cols-1 gap-4">
        {operators.map((op) => (
          <button
            key={op.id}
            onClick={() => onSelectOperator(op)}
            className="flex items-center justify-center gap-4 p-6 bg-blue-600 text-white rounded-xl text-2xl font-semibold shadow-lg hover:bg-blue-700 transition-all duration-200 transform hover:scale-105"
          >
            <User size={30} />
            {op.name}
          </button>
        ))}
      </div>
      <div className="mt-8 text-center">
        <button
          onClick={onGoToAdmin}
          className="flex items-center justify-center gap-2 w-full p-4 bg-gray-700 text-white rounded-lg text-lg font-medium hover:bg-gray-800 transition-all duration-200"
        >
          <Settings size={20} />
          Admin Paneli
        </button>
      </div>
    </div>
  );
}

// --- 2. Ekran: Ana Operatör Paneli ---
function MainAppPanel({ currentUser, onLogout, logEvent, machineState, setMachineState, stopReasons, errorReasons }) {

  const [isStopModalOpen, setStopModalOpen] = useState(false);
  const [isErrorModalOpen, setErrorModalOpen] = useState(false);

  // Üretimi Başlat
  const handleStart = () => {
    logEvent('START', 'Üretim Başlatıldı');
    setMachineState('running');
  };

  // Üretimi Durdur Butonu (Modal'ı açar)
  const handleStopClick = () => {
    setStopModalOpen(true);
  };

  // Hata Kaydı Butonu (Modal'ı açar)
  const handleErrorClick = () => {
    setErrorModalOpen(true);
  };

  // Duruş Sebebi Modal'ından seçim yapıldığında
  const handleStopReasonSelect = (reason) => {
    logEvent('STOP', reason);
    setMachineState('stopped'); // veya 'idle'
    setStopModalOpen(false);
  };

  // Hata Sebebi Modal'ından seçim yapıldığında
  const handleErrorReasonSelect = (reason) => {
    logEvent('ERROR', reason);
    setErrorModalOpen(false);
  };

  const statusConfig = useMemo(() => {
    switch (machineState) {
      case 'running':
        return { text: 'ÜRETİMDE', icon: <CheckCircle size={24} />, color: 'bg-green-100 text-green-800' };
      case 'stopped':
        return { text: 'DURUŞTA', icon: <XCircle size={24} />, color: 'bg-red-100 text-red-800' };
      case 'idle':
      default:
        return { text: 'BEKLEMEDE', icon: <Database size={24} />, color: 'bg-gray-200 text-gray-800' };
    }
  }, [machineState]);

  return (
    <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-2xl animate-fade-in">
      {/* Üst Bilgi */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
        <div>
          <span className="text-sm text-gray-500">Aktif Operatör</span>
          <h3 className="text-xl font-bold text-gray-900">{currentUser.name}</h3>
        </div>
        <button
          onClick={onLogout} // Artık App'ten gelen ana çıkış fonksiyonunu çağırıyoruz
          className="p-3 bg-gray-100 rounded-full text-gray-600 hover:bg-red-100 hover:text-red-600 transition-all duration-200"
          title="Operatör Değiştir"
        >
          <LogOut size={20} />
        </button>
      </div>

      {/* Durum Göstergesi */}
      <div className={`flex items-center justify-center gap-3 p-4 rounded-lg mb-8 text-2xl font-bold ${statusConfig.color}`}>
        {statusConfig.icon}
        {statusConfig.text}
      </div>

      {/* Ana Eylem Butonları */}
      <div className="space-y-6">
        {/* Makine BEKLEMEDE veya DURUŞTA ise */}
        {(machineState === 'idle' || machineState === 'stopped') && (
          <ActionButton
            text="Üretimi Başlat"
            onClick={handleStart}
            icon={<Play size={40} />}
            colorClass="bg-green-600 hover:bg-green-700"
          />
        )}

        {/* Makine ÜRETİMDE ise */}
        {machineState === 'running' && (
          <>
            <ActionButton
              text="Üretimi Durdur"
              onClick={handleStopClick}
              icon={<StopCircle size={40} />}
              colorClass="bg-red-600 hover:bg-red-700"
            />
            <ActionButton
              text="Hata Kaydı"
              onClick={handleErrorClick}
              icon={<AlertTriangle size={40} />}
              colorClass="bg-yellow-500 hover:bg-yellow-600"
            />
          </>
        )}
      </div>

      {/* Modallar (Açılır Pencereler) */}
      <ReasonModal
        isOpen={isStopModalOpen}
        onClose={() => setStopModalOpen(false)}
        title="Duruş Sebebi Nedir?"
        reasons={stopReasons}
        onSelect={handleStopReasonSelect}
      />

      <ReasonModal
        isOpen={isErrorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        title="Hata Sebebi Nedir?"
        reasons={errorReasons}
        onSelect={handleErrorReasonSelect}
      />
    </div>
  );
}

// --- 3. Ekran: Admin Login ---
function AdminLoginScreen({ onLogin, onBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onLogin(email, password);
    setLoading(false);
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl animate-fade-in">
      <div className="flex items-center justify-center mb-6">
        <Lock size={40} className="text-blue-600" />
      </div>
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
        Admin Girişi
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="admin@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Şifre
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full p-4 bg-blue-600 text-white rounded-lg text-lg font-medium hover:bg-blue-700 transition-all duration-200 disabled:opacity-50"
        >
          {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>
      <button
        onClick={onBack}
        className="w-full mt-4 p-3 bg-gray-200 text-gray-700 rounded-lg text-md font-medium hover:bg-gray-300 transition-all duration-200"
      >
        Geri Dön
      </button>
    </div>
  );
}


// --- YARDIMCI BİLEŞENLER ---

// Büyük Ana Eylem Butonu
function ActionButton({ text, onClick, icon, colorClass }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-6 rounded-xl text-white shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 ${colorClass}`}
    >
      <span className="text-2xl font-bold">{text}</span>
      {icon}
    </button>
  );
}

// Sebep Seçim Modalı (Duruş ve Hata için)
function ReasonModal({ isOpen, onClose, title, reasons, onSelect }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center border-b pb-4">
          {title}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {reasons.map((reason, index) => (
            <button
              key={index}
              onClick={() => onSelect(reason)}
              className="p-4 text-left bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-lg text-lg font-medium text-gray-700 hover:text-blue-700 transition-colors duration-150"
            >
              {reason}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-6 p-4 bg-gray-700 text-white rounded-lg text-lg font-medium hover:bg-gray-800 transition-all duration-200"
        >
          İptal
        </button>
      </div>
    </div>
  );
}
