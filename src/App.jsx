import React, { useState, useMemo } from 'react';
import { Database, User, Settings, AlertTriangle, Play, StopCircle, LogOut, CheckCircle, XCircle, Lock } from 'lucide-react';
import { supabase } from './supabase';
import AdminPanel from './AdminPanel';

// --- VER─░TABANI S─░M├£LASYONU ---
// Normalde bu veriler Supabase'den gelecek.
const MOCK_OPERATORS = [
  { id: 1, name: 'Ali Y─▒lmaz', role: 'Operat├Âr' },
  { id: 2, name: 'Veli Demir', role: 'Operat├Âr' },
  { id: 3, name: 'Ay┼şe Kaya', role: 'Vardiya Amiri' },
];

const STOP_REASONS = [
  'Makine Ar─▒zas─▒',
  'Hammadde Bekleme',
  'Mola',
  'Mesai Biti┼şi / De─şi┼şimi',
  'Planl─▒ Bak─▒m',
  'Di─şer',
];

const ERROR_REASONS = [
  'Kalite Problemi',
  'Setup Hatas─▒',
  'Ekipman Eksi─şi',
  'Hatal─▒ Parametre',
  'Personel Hatas─▒',
  'Di─şer',
];
// --- VER─░TABANI S─░M├£LASYONU B─░T─░┼Ş─░ ---


// --- Ana Uygulama Bile┼şeni ---
export default function App() {
  const [currentPage, setCurrentPage] = useState('login'); // 'login', 'app', 'admin', 'adminLogin'
  const [currentUser, setCurrentUser] = useState(null);
  const [adminSession, setAdminSession] = useState(null);

  // Dinamik veri state'leri
  const [operators, setOperators] = useState(MOCK_OPERATORS);
  const [stopReasons, setStopReasons] = useState(STOP_REASONS);
  const [errorReasons, setErrorReasons] = useState(ERROR_REASONS);

  // ─░Y─░LE┼ŞT─░RME: Makine durumunu (state) ana bile┼şene ta┼ş─▒d─▒k.
  // Bu sayede ├ğ─▒k─▒┼ş yap─▒ld─▒─ş─▒nda durumu s─▒f─▒rlayabiliriz.
  const [machineState, setMachineState] = useState('idle'); // 'idle', 'running', 'stopped'

  // Bu fonksiyon Supabase'e veri g├Ânderecek
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
        alert('Veri kaydedilirken hata olu┼ştu: ' + error.message);
      }
    } catch (err) {
      console.error('Beklenmeyen hata:', err);
    }
  };

  // Operat├Âr se├ğildi─şinde
  const handleOperatorLogin = (operator) => {
    setCurrentUser(operator);
    setCurrentPage('app');
  };

  // ├ç─▒k─▒┼ş yap─▒ld─▒─ş─▒nda
  const handleLogout = () => {
    setCurrentUser(null);
    setMachineState('idle'); // Makine durumunu s─▒f─▒rla
    setCurrentPage('login');
  };

  // Admin giri┼şi
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
      alert('Giri┼ş hatas─▒: ' + error.message);
      return false;
    }

    if (data.session) {
      setAdminSession(data.session);
      setCurrentPage('admin');
      return true;
    }
    return false;
  };

  // Admin ├ğ─▒k─▒┼ş
  const handleAdminLogout = async () => {
    await supabase.auth.signOut();
    setAdminSession(null);
    setCurrentPage('login');
  };

  // Hangi ekran─▒n g├Âsterilece─şini se├ğen k─▒s─▒m
  const renderPage = () => {
    switch (currentPage) {
      case 'app':
        return (
          <MainAppPanel
            currentUser={currentUser}
            onLogout={handleLogout}
            logEvent={logEvent}
            machineState={machineState} // State'i prop olarak iletiyoruz
            setMachineState={setMachineState} // State'i g├╝ncelleme fonksiyonunu iletiyoruz
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
        return <OperatorSelectScreen onSelectOperator={handleOperatorLogin} onGoToAdmin={handleAdminLoginRequest} />;
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

// --- 1. Ekran: Operat├Âr Se├ğimi ---
function OperatorSelectScreen({ onSelectOperator, onGoToAdmin }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-xl animate-fade-in">
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
        Operat├Âr Se├ğin
      </h2>
      <div className="grid grid-cols-1 gap-4">
        {MOCK_OPERATORS.map((op) => (
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

// --- 2. Ekran: Ana Operat├Âr Paneli ---
// machineState ve setMachineState'i App bile┼şeninden prop olarak al─▒yoruz
function MainAppPanel({ currentUser, onLogout, logEvent, machineState, setMachineState }) {

  const [isStopModalOpen, setStopModalOpen] = useState(false);
  const [isErrorModalOpen, setErrorModalOpen] = useState(false);

  // ├£retimi Ba┼şlat
  const handleStart = () => {
    logEvent('START', '├£retim Ba┼şlat─▒ld─▒');
    setMachineState('running');
  };

  // ├£retimi Durdur Butonu (Modal'─▒ a├ğar)
  const handleStopClick = () => {
    setStopModalOpen(true);
  };

  // Hata Kayd─▒ Butonu (Modal'─▒ a├ğar)
  const handleErrorClick = () => {
    setErrorModalOpen(true);
  };

  // Duru┼ş Sebebi Modal'─▒ndan se├ğim yap─▒ld─▒─ş─▒nda
  const handleStopReasonSelect = (reason) => {
    logEvent('STOP', reason);
    setMachineState('stopped'); // veya 'idle'
    setStopModalOpen(false);
  };

  // Hata Sebebi Modal'─▒ndan se├ğim yap─▒ld─▒─ş─▒nda
  const handleErrorReasonSelect = (reason) => {
    logEvent('ERROR', reason);
    setErrorModalOpen(false);
  };

  const statusConfig = useMemo(() => {
    switch (machineState) {
      case 'running':
        return { text: '├£RET─░MDE', icon: <CheckCircle size={24} />, color: 'bg-green-100 text-green-800' };
      case 'stopped':
        return { text: 'DURU┼ŞTA', icon: <XCircle size={24} />, color: 'bg-red-100 text-red-800' };
      case 'idle':
      default:
        return { text: 'BEKLEMEDE', icon: <Database size={24} />, color: 'bg-gray-200 text-gray-800' };
    }
  }, [machineState]);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md animate-fade-in">
      {/* ├£st Bilgi */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
        <div>
          <span className="text-sm text-gray-500">Aktif Operat├Âr</span>
          <h3 className="text-xl font-bold text-gray-900">{currentUser.name}</h3>
        </div>
        <button
          onClick={onLogout} // Art─▒k App'ten gelen ana ├ğ─▒k─▒┼ş fonksiyonunu ├ğa─ş─▒r─▒yoruz
          className="p-3 bg-gray-100 rounded-full text-gray-600 hover:bg-red-100 hover:text-red-600 transition-all duration-200"
          title="Operat├Âr De─şi┼ştir"
        >
          <LogOut size={20} />
        </button>
      </div>

      {/* Durum G├Âstergesi */}
      <div className={`flex items-center justify-center gap-3 p-4 rounded-lg mb-8 text-2xl font-bold ${statusConfig.color}`}>
        {statusConfig.icon}
        {statusConfig.text}
      </div>

      {/* Ana Eylem Butonlar─▒ */}
      <div className="space-y-6">
        {/* Makine BEKLEMEDE veya DURU┼ŞTA ise */}
        {(machineState === 'idle' || machineState === 'stopped') && (
          <ActionButton
            text="├£retimi Ba┼şlat"
            onClick={handleStart}
            icon={<Play size={40} />}
            colorClass="bg-green-600 hover:bg-green-700"
          />
        )}

        {/* Makine ├£RET─░MDE ise */}
        {machineState === 'running' && (
          <>
            <ActionButton
              text="├£retimi Durdur"
              onClick={handleStopClick}
              icon={<StopCircle size={40} />}
              colorClass="bg-red-600 hover:bg-red-700"
            />
            <ActionButton
              text="Hata Kayd─▒"
              onClick={handleErrorClick}
              icon={<AlertTriangle size={40} />}
              colorClass="bg-yellow-500 hover:bg-yellow-600"
            />
          </>
        )}
      </div>

      {/* Modallar (A├ğ─▒l─▒r Pencereler) */}
      <ReasonModal
        isOpen={isStopModalOpen}
        onClose={() => setStopModalOpen(false)}
        title="Duru┼ş Sebebi Nedir?"
        reasons={STOP_REASONS}
        onSelect={handleStopReasonSelect}
      />

      <ReasonModal
        isOpen={isErrorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        title="Hata Sebebi Nedir?"
        reasons={ERROR_REASONS}
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
        Admin Giri┼şi
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
            ┼Şifre
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="ÔÇóÔÇóÔÇóÔÇóÔÇóÔÇóÔÇóÔÇó"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full p-4 bg-blue-600 text-white rounded-lg text-lg font-medium hover:bg-blue-700 transition-all duration-200 disabled:opacity-50"
        >
          {loading ? 'Giri┼ş yap─▒l─▒yor...' : 'Giri┼ş Yap'}
        </button>
      </form>
      <button
        onClick={onBack}
        className="w-full mt-4 p-3 bg-gray-200 text-gray-700 rounded-lg text-md font-medium hover:bg-gray-300 transition-all duration-200"
      >
        Geri D├Ân
      </button>
    </div>
  );
}

// --- 4. Ekran: Admin Paneli ---
function AdminPanel({ session, onLogout }) {
  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl animate-fade-in">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
        <h2 className="text-3xl font-bold text-gray-800">Admin Paneli</h2>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 p-3 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all duration-200"
        >
          <LogOut size={20} />
          ├ç─▒k─▒┼ş Yap
        </button>
      </div>

      <div className="text-center py-8">
        <p className="text-lg text-gray-600 mb-4">
          Ho┼ş geldiniz! Giri┼ş ba┼şar─▒l─▒.
        </p>
        <p className="text-sm text-gray-500">
          Email: {session?.user?.email}
        </p>
      </div>

      <div className="mt-8 p-6 bg-blue-50 rounded-lg">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Gelecek ├ûzellikler:</h3>
        <ul className="list-disc list-inside text-gray-700 space-y-2">
          <li>Operat├Âr Ekleme/├ç─▒karma</li>
          <li>Duru┼ş ve Hata Sebeplerini Y├Ânetme</li>
          <li>Raporlar ve ─░statistikler</li>
          <li>Veri G├Ârselle┼ştirme</li>
        </ul>
      </div>
    </div>
  );
}


// --- YARDIMCI B─░LE┼ŞENLER ---

// B├╝y├╝k Ana Eylem Butonu
function ActionButton({ text, onClick, icon, colorClass }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center text-white w-full h-40 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 ${colorClass}`}
    >
      {icon}
      <span className="text-3xl font-bold mt-2">{text}</span>
    </button>
  );
}

// Sebep Se├ğim Modal─▒ (Duru┼ş ve Hata i├ğin)
function ReasonModal({ isOpen, onClose, title, reasons, onSelect }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 animate-fade-in-fast z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-xl">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">{title}</h3>
        <div className="grid grid-cols-2 gap-4">
          {reasons.map((reason) => (
            <button
              key={reason}
              onClick={() => onSelect(reason)}
              className="p-5 bg-gray-100 text-gray-800 rounded-lg text-lg font-medium text-center hover:bg-blue-100 hover:text-blue-700 transition-all duration-150"
            >
              {reason}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-6 p-4 bg-gray-700 text-white rounded-lg text-lg font-medium hover:bg-gray-800 transition-all duration-200"
        >
          ─░ptal
        </button>
      </div>
    </div>
  );
}
