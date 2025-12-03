import React, { useState, useMemo, useEffect } from 'react';
import { Database, User, Settings, AlertTriangle, Play, StopCircle, LogOut, CheckCircle, XCircle, Lock, Package } from 'lucide-react';
import { supabase } from './supabase';
import AdminPanel from './AdminPanel';




// --- Ana Uygulama Bileşeni ---
export default function App() {
  const [currentPage, setCurrentPage] = useState('login'); // 'login', 'app', 'admin', 'adminLogin'
  const [currentUser, setCurrentUser] = useState(null);
  const [adminSession, setAdminSession] = useState(null);

  // Dinamik veri state'leri
  const [operators, setOperators] = useState([]);
  const [stopReasons, setStopReasons] = useState([]);
  const [errorReasons, setErrorReasons] = useState([]);

  // İYİLEŞTİRME: Makine durumunu (state) ana bileşene taşıdık.
  // Bu sayede çıkış yapıldığında durumu sıfırlayabiliriz.
  const [machineState, setMachineState] = useState('idle'); // 'idle', 'running', 'stopped'

  // Fetch data from Supabase on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch operators
        const { data: operatorsData, error: operatorsError } = await supabase
          .from('operators')
          .select('*')
          .order('id');
        if (!operatorsError && operatorsData) {
          setOperators(operatorsData);
        } else if (operatorsError) {
          console.error('Error fetching operators:', operatorsError);
        }

        // Fetch stop reasons
        const { data: stopReasonsData, error: stopReasonsError } = await supabase
          .from('stop_reasons')
          .select('*')
          .order('id');
        if (!stopReasonsError && stopReasonsData) {
          setStopReasons(stopReasonsData.map(r => r.reason));
        } else if (stopReasonsError) {
          console.error('Error fetching stop reasons:', stopReasonsError);
        }

        // Fetch error reasons
        const { data: errorReasonsData, error: errorReasonsError } = await supabase
          .from('error_reasons')
          .select('*')
          .order('id');
        if (!errorReasonsError && errorReasonsData) {
          setErrorReasons(errorReasonsData.map(r => r.reason));
        } else if (errorReasonsError) {
          console.error('Error fetching error reasons:', errorReasonsError);
        }
      } catch (error) {
        console.error('Unexpected error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  // --- LOGLAMA FONKSİYONLARI ---

  // 1. Sorunsuz Parça Loglama
  const logPartCount = async (count) => {
    const logData = {
      operator_id: currentUser.user_id,
      operator_name: currentUser.name,
      adet: parseInt(count),
    };

    try {
      const { error } = await supabase.from('sorunsuz_parca_loglari').insert([logData]);
      if (error) throw error;
      console.log('Parça sayısı kaydedildi:', count);
    } catch (error) {
      console.error('Parça kaydı hatası:', error);
      alert('Parça sayısı kaydedilirken hata oluştu: ' + error.message);
    }
  };

  // 2. Hata Loglama
  const logError = async (reason) => {
    const logData = {
      operator_id: currentUser.user_id,
      operator_name: currentUser.name,
      sebep: reason,
    };

    try {
      const { error } = await supabase.from('hata_loglari').insert([logData]);
      if (error) throw error;
      console.log('Hata kaydedildi:', reason);
    } catch (error) {
      console.error('Hata kaydı hatası:', error);
      alert('Hata kaydedilirken hata oluştu: ' + error.message);
    }
  };

  // 3. Üretim Başlatma (Yeni Session)
  const startProduction = async () => {
    console.log('--- START PRODUCTION DEBUG ---');
    const logData = {
      operator_id: currentUser.user_id,
      operator_name: currentUser.name,
      baslangic: new Date().toISOString(),
      bitis: null, // Açık session
    };
    console.log('Inserting start record:', logData);

    try {
      const { data, error } = await supabase.from('durus_loglari').insert([logData]).select();
      if (error) throw error;
      console.log('Üretim başlatıldı (Session Start). Inserted Data:', data);
    } catch (error) {
      console.error('Başlatma hatası:', error);
      alert('Üretim başlatılırken hata oluştu: ' + error.message);
    }
  };

  // 4. Üretim Durdurma (Session Stop - Update)
  const stopProduction = async (reason) => {
    try {
      console.log('--- STOP PRODUCTION DEBUG START ---');
      console.log('Current User Object:', currentUser);
      console.log('Searching for operator_id:', currentUser.user_id);

      if (!currentUser.user_id) {
        console.error('CRITICAL: currentUser.user_id is missing/null!');
        alert('Hata: Operatör kimliği (user_id) bulunamadı. Lütfen admin panelinden operatörü silip tekrar ekleyin.');
        return;
      }

      // ADIM 1: Açık olan son oturumu bul (En son başlayan)
      const { data: openSessions, error: fetchError } = await supabase
        .from('durus_loglari')
        .select('*') // Tüm sütunları görelim
        .eq('operator_id', currentUser.user_id)
        .is('bitis', null)
        .order('baslangic', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error('Açık oturum arama hatası:', fetchError);
        throw fetchError;
      }

      console.log('Bulunan açık oturumlar (Query Result):', openSessions);

      if (!openSessions || openSessions.length === 0) {
        console.warn('Kapatılacak açık bir oturum bulunamadı.');

        // DEBUG: Hiç kayıt var mı bakalım?
        console.log('DEBUG: Bu kullanıcı için TÜM kayıtları kontrol ediyorum...');
        const { data: allRows } = await supabase
          .from('durus_loglari')
          .select('*')
          .eq('operator_id', currentUser.user_id)
          .order('baslangic', { ascending: false })
          .limit(5);
        console.log('DEBUG: Son 5 kayıt (Tümü):', allRows);

        alert('Şu anda açık bir üretim kaydı görünmüyor. (Detaylar konsolda)');
        return;
      }

      const sessionToClose = openSessions[0];
      console.log('Kapatılacak oturum ID:', sessionToClose.id);

      // ADIM 2: Bulunan oturumu güncelle
      const { data: updatedData, error: updateError } = await supabase
        .from('durus_loglari')
        .update({
          bitis: new Date().toISOString(),
          sebep: reason
        })
        .eq('id', sessionToClose.id)
        .select();

      if (updateError) {
        console.error('Güncelleme hatası:', updateError);
        throw updateError;
      }

      console.log('Üretim durdurma işlemi başarılı. Güncellenen kayıt:', updatedData);
      console.log('--- STOP PRODUCTION DEBUG END ---');

    } catch (error) {
      console.error('Genel Durdurma hatası:', error);
      alert('Üretim durdurulurken hata oluştu: ' + error.message);
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
            startProduction={startProduction}
            stopProduction={stopProduction}
            logError={logError}
            logPartCount={logPartCount}
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
function MainAppPanel({ currentUser, onLogout, startProduction, stopProduction, logError, logPartCount, machineState, setMachineState, stopReasons, errorReasons }) {

  const [isStopModalOpen, setStopModalOpen] = useState(false);
  const [isErrorModalOpen, setErrorModalOpen] = useState(false);
  const [isPartCountModalOpen, setPartCountModalOpen] = useState(false);

  // Üretimi Başlat
  const handleStart = () => {
    startProduction();
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
    stopProduction(reason);
    setMachineState('stopped'); // veya 'idle'
    setStopModalOpen(false);
  };

  // Hata Sebebi Modal'ından seçim yapıldığında
  const handleErrorReasonSelect = (reason) => {
    logError(reason);
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
          <div className="grid grid-cols-2 gap-4">
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
          </div>
        )}

        {/* Sorunsuz Parça Girdisi - Her zaman görünür (veya en azından giriş yapılmışsa) */}
        <ActionButton
          text="Sorunsuz Parça Girdisi"
          onClick={() => setPartCountModalOpen(true)}
          icon={<Package size={40} />}
          colorClass="bg-gray-800 hover:bg-gray-900"
        />
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

      <PartCountModal
        isOpen={isPartCountModalOpen}
        onClose={() => setPartCountModalOpen(false)}
        onConfirm={(count) => {
          logPartCount(count);
          setPartCountModalOpen(false);
        }}
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

// Parça Sayısı Giriş Modalı
function PartCountModal({ isOpen, onClose, onConfirm }) {
  const [count, setCount] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (count) {
      onConfirm(count);
      setCount('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center border-b pb-4">
          Sorunsuz Parça Sayısını Giriniz:
        </h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className="w-full p-4 text-3xl text-center border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="0"
              autoFocus
              min="1"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 p-4 bg-gray-200 text-gray-800 rounded-xl text-xl font-bold hover:bg-gray-300 transition-all duration-200"
            >
              İptal
            </button>
            <button
              type="submit"
              className="flex-1 p-4 bg-blue-600 text-white rounded-xl text-xl font-bold hover:bg-blue-700 transition-all duration-200"
            >
              Onayla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
