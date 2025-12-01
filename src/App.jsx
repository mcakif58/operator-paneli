import React, { useState, useMemo } from 'react';
// icon'ları lucide-react kütüphanesinden import ediyoruz
import { Database, User, Settings, AlertTriangle, Play, StopCircle, LogOut, CheckCircle, XCircle } from 'lucide-react';

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
  const [currentPage, setCurrentPage] = useState('login'); // 'login', 'app', 'admin'
  const [currentUser, setCurrentUser] = useState(null);
  
  // İYİLEŞTİRME: Makine durumunu (state) ana bileşene taşıdık.
  // Bu sayede çıkış yapıldığında durumu sıfırlayabiliriz.
  const [machineState, setMachineState] = useState('idle'); // 'idle', 'running', 'stopped'
  
  // Bu fonksiyon Supabase'e veri gönderecek (şimdilik konsola yazıyor)
  const logEvent = (type, reason) => {
    const timestamp = new Date().toISOString();
    const logData = {
      operator_id: currentUser.id,
      operator_name: currentUser.name,
      event_type: type, // 'START', 'STOP', 'ERROR'
      event_reason: reason, // 'Mola', 'Kalite Problemi' etc.
      timestamp: timestamp,
    };
    
    console.log('EVENT LOGGED TO DATABASE:', logData);
    //
    // --- SUPABASE KODU BURAYA ---
    // const { error } = await supabase.from('logs').insert([logData]);
    // if (error) console.error('Supabase Hata:', error);
    //
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
  
  // Hangi ekranın gösterileceğini seçen kısım
  const renderPage = () => {
    switch (currentPage) {
      case 'app':
        return (
          <MainAppPanel 
            currentUser={currentUser} 
            onLogout={handleLogout} 
            logEvent={logEvent} 
            machineState={machineState} // State'i prop olarak iletiyoruz
            setMachineState={setMachineState} // State'i güncelleme fonksiyonunu iletiyoruz
          />
        );
      case 'admin':
        return <AdminPanel onBack={() => setCurrentPage('login')} />;
      case 'login':
      default:
        return <OperatorSelectScreen onSelectOperator={handleOperatorLogin} onGoToAdmin={() => setCurrentPage('admin')} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {renderPage()}
      </div>
    </div>
  );
}

// --- 1. Ekran: Operatör Seçimi ---
function OperatorSelectScreen({ onSelectOperator, onGoToAdmin }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-xl animate-fade-in">
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
        Operatör Seçin
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

// --- 2. Ekran: Ana Operatör Paneli ---
// machineState ve setMachineState'i App bileşeninden prop olarak alıyoruz
function MainAppPanel({ currentUser, onLogout, logEvent, machineState, setMachineState }) {
  
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
    <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md animate-fade-in">
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

// --- 3. Ekran: Admin Paneli (Yer Tutucu) ---
function AdminPanel({ onBack }) {
  // Burası Supabase Auth ile korunacak ve operatör ekleme/çıkarma
  // formlarını içerecek (daha sonraki adım)
  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl animate-fade-in text-center">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Admin Paneli</h2>
      <p className="text-lg text-gray-600 mb-8">
        Bu alanda (Supabase Auth ile korunduktan sonra) operatör ekleyebilir,
        çıkarabilir ve duruş/hata sebeplerini yönetebilirsiniz.
      </FÇp>
      <button
        onClick={onBack}
        className="w-full p-4 bg-blue-600 text-white rounded-lg text-lg font-medium hover:bg-blue-700 transition-all duration-200"
      >
        Giriş Ekranına Dön
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
      className={`flex flex-col items-center justify-center text-white w-full h-40 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 ${colorClass}`}
    >
      {icon}
      <span className="text-3xl font-bold mt-2">{text}</span>
    </button>
  );
}

// Sebep Seçim Modalı (Duruş ve Hata için)
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
          İptal
        </button>
      </div>
    </div>
  );
}