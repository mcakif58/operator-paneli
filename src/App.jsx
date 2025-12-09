import React, { useState, useMemo, useEffect } from 'react';
import { Database, User, Settings, AlertTriangle, Play, StopCircle, LogOut, CheckCircle, XCircle, Lock, Package, Pencil, Monitor, Cpu } from 'lucide-react';
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

  // Makine Seçimi için State'ler
  const [machineId, setMachineId] = useState(null);
  const [availableMachines, setAvailableMachines] = useState([]);
  const [isLoadingMachine, setIsLoadingMachine] = useState(true);

  // İYİLEŞTİRME: Makine durumunu (state) ana bileşene taşıdık.
  const [machineState, setMachineState] = useState('idle'); // 'idle', 'running', 'stopped'

  // -------------------------------------------------------------------------
  // 1. MAKİNE KİMLİĞİ BELİRLEME (Hybrid System)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const initMachine = async () => {
      setIsLoadingMachine(true);

      // A) URL Kontrolü (Öncelik #1 - Test için)
      const params = new URLSearchParams(window.location.search);
      const urlId = params.get('id');

      if (urlId) {
        console.log('Makine ID URLden alındı:', urlId);
        setMachineId(urlId);
        setIsLoadingMachine(false);
        return;
      }

      // B) LocalStorage Kontrolü (Öncelik #2 - Prodüksiyon için)
      const storageId = localStorage.getItem('stored_machine_id');
      if (storageId) {
        console.log('Makine ID Hafızadan alındı:', storageId);
        setMachineId(storageId);
        setIsLoadingMachine(false);
        return;
      }

      // C) Hiçbiri yoksa -> Makine Seçim Ekranı için listeyi çek
      console.log('Makine ID bulunamadı, seçim ekranı hazırlanıyor...');
      const { data, error } = await supabase.from('machines').select('*').order('id');
      if (data && !error) {
        setAvailableMachines(data);
      }
      setIsLoadingMachine(false);
    };

    initMachine();
  }, []);

  // Makine Seçim Ekranından seçim yapıldığında
  const handleMachineSelect = (selectedId) => {
    localStorage.setItem('stored_machine_id', selectedId);
    setMachineId(selectedId);
    // Sayfayı yenilemeye gerek yok, state değiştiği için UI güncellenecek
  };

  // Makine değiştirmek için (Admin panelinden veya footer'dan)
  const handleChangeMachine = () => {
    if (window.confirm("Bu cihazın makine ayarını sıfırlamak istiyor musunuz?")) {
      localStorage.removeItem('stored_machine_id');
      window.location.search = ''; // URL parametrelerini de temizle
    }
  };


  // -------------------------------------------------------------------------
  // 2. VERİ ÇEKME (Data Fetching)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!machineId) return; // ID yoksa veri çekme

    const fetchData = async () => {
      try {
        // Fetch operators (Machine Isolated)
        const { data: operatorsData, error: operatorsError } = await supabase
          .from('operators')
          .select('*')
          .eq('machine_id', machineId)
          .order('id');
        if (!operatorsError && operatorsData) setOperators(operatorsData);

        // Fetch stop reasons (Machine Isolated)
        const { data: stopReasonsData, error: stopReasonsError } = await supabase
          .from('stop_reasons')
          .select('*')
          .eq('machine_id', machineId)
          .order('id');
        if (!stopReasonsError && stopReasonsData) setStopReasons(stopReasonsData.map(r => r.reason));

        // Fetch error reasons (Machine Isolated)
        const { data: errorReasonsData, error: errorReasonsError } = await supabase
          .from('error_reasons')
          .select('*')
          .eq('machine_id', machineId)
          .order('id');
        if (!errorReasonsError && errorReasonsData) setErrorReasons(errorReasonsData.map(r => r.reason));

      } catch (error) {
        console.error('Unexpected error fetching data:', error);
      }
    };

    fetchData();
  }, [machineId]);

  // -------------------------------------------------------------------------
  // 3. LOGLAMA FONKSİYONLARI
  // -------------------------------------------------------------------------

  const logPartCount = async (count) => {
    const logData = {
      operator_id: currentUser.user_id,
      operator_name: currentUser.name,
      adet: parseInt(count),
      machine_id: machineId
    };

    try {
      const { error } = await supabase.from('sorunsuz_parca_loglari').insert([logData]);
      if (error) throw error;
      console.log('Parça sayısı kaydedildi:', count);
    } catch (error) {
      alert('Hata: ' + error.message);
    }
  };

  const logError = async (reason) => {
    const logData = {
      operator_id: currentUser.user_id,
      operator_name: currentUser.name,
      sebep: reason,
      machine_id: machineId
    };

    try {
      const { error } = await supabase.from('hata_loglari').insert([logData]);
      if (error) throw error;
    } catch (error) {
      alert('Hata: ' + error.message);
    }
  };

  const startProduction = async () => {
    const logData = {
      operator_id: currentUser.user_id,
      operator_name: currentUser.name,
      baslangic: new Date().toISOString(),
      bitis: null,
      machine_id: machineId
    };

    try {
      const { data, error } = await supabase.from('durus_loglari').insert([logData]).select();
      if (error) throw error;
    } catch (error) {
      alert('Başlatma hatası: ' + error.message);
    }
  };

  const stopProduction = async (reason) => {
    try {
      // SADECE BU MAKİNE VE BU OPERATÖR İÇİN AÇIK OTURUMU BUL
      const { data: openSessions, error: fetchError } = await supabase
        .from('durus_loglari')
        .select('*')
        .eq('operator_id', currentUser.user_id)
        .eq('machine_id', machineId)
        .is('bitis', null)
        .order('baslangic', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      if (!openSessions || openSessions.length === 0) {
        alert('Şu anda açık bir üretim kaydı görünmüyor.');
        return;
      }

      const sessionToClose = openSessions[0];

      const { error: updateError } = await supabase
        .from('durus_loglari')
        .update({
          bitis: new Date().toISOString(),
          sebep: reason
        })
        .eq('id', sessionToClose.id);

      if (updateError) throw updateError;

    } catch (error) {
      alert('Durdurma hatası: ' + error.message);
    }
  };

  // -------------------------------------------------------------------------
  // 4. EKRAN YÖNETİMİ
  // -------------------------------------------------------------------------

  const handleOperatorLogin = (operator) => {
    setCurrentUser(operator);
    setCurrentPage('app');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setMachineState('idle');
    setCurrentPage('login');
  };

  const handleAdminLoginRequest = () => setCurrentPage('adminLogin');

  const handleAdminLogin = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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

  const handleAdminLogout = async () => {
    await supabase.auth.signOut();
    setAdminSession(null);
    setCurrentPage('login');
  };

  // LOADING MACHINE
  if (isLoadingMachine) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl font-semibold text-gray-600 animate-pulse">Makine bilgileri yükleniyor...</div>
      </div>
    );
  }

  // EĞER MAKİNE SEÇİLİ DEĞİLSE -> SEÇİM EKRANI (FALLBACK SCAN)
  if (!machineId) {
    return (
      <MachineSelectionScreen
        machines={availableMachines}
        onSelect={handleMachineSelect}
      />
    );
  }

  // --- ANA RENDER ---
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
            machineId={machineId}
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
            machineId={machineId}
          />
        );
      case 'adminLogin':
        return (
          <div className="scale-[1.25] origin-center">
            <AdminLoginScreen onLogin={handleAdminLogin} onBack={() => setCurrentPage('login')} />
          </div>
        );
      case 'login':
      default:
        return (
          <div className="scale-[1.25] origin-center">
            <OperatorSelectScreen
              operators={operators}
              onSelectOperator={handleOperatorLogin}
              onGoToAdmin={handleAdminLoginRequest}
              onChangeMachine={handleChangeMachine} // Yeni özellik
            />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl flex justify-center">
        {renderPage()}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// EKRAN BİLEŞENLERİ
// -------------------------------------------------------------------------

// A) MAKİNE SEÇİM EKRANI (YENİ)
function MachineSelectionScreen({ machines, onSelect }) {
  if (machines.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center">
        <AlertTriangle size={64} className="mx-auto text-red-500 mb-6" />
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Makine Bulunamadı</h2>
        <p className="text-gray-600">
          Sistemde tanımlı makine yok. Lütfen veritabanı yöneticinizle görüşün.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full text-center animate-fade-in">
      <Monitor size={64} className="mx-auto text-blue-600 mb-6" />
      <h2 className="text-3xl font-bold text-gray-800 mb-2">Kurulum</h2>
      <p className="text-gray-500 mb-8">Lütfen bu tabletin bağlı olduğu makineyi seçiniz.</p>

      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {machines.map((machine) => (
          <button
            key={machine.id}
            onClick={() => onSelect(machine.id)} // ID'yi string veya number olarak gönderir
            className="w-full p-4 flex items-center justify-between bg-gray-50 border-2 border-transparent hover:border-blue-500 hover:bg-blue-50 rounded-xl transition-all group"
          >
            <div className="flex items-center gap-4">
              <Cpu className="text-gray-400 group-hover:text-blue-600" />
              <span className="font-bold text-lg text-gray-700 group-hover:text-blue-800">{machine.name}</span>
            </div>
            <div className="px-3 py-1 bg-gray-200 text-xs font-mono rounded text-gray-600">ID: {machine.id}</div>
          </button>
        ))}
      </div>
      <p className="mt-8 text-xs text-gray-400">
        * Bu seçim cihaz hafızasına kaydedilecektir.
      </p>
    </div>
  );
}

// B) 1. Ekran: Operatör Seçimi
function OperatorSelectScreen({ operators, onSelectOperator, onGoToAdmin, onChangeMachine }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-xl animate-fade-in relative">
      {/* Makine Değiştir Butonu (Gizli köşe) */}
      <button
        onClick={onChangeMachine}
        className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 transition-colors"
        title="Makine Ayarını Sıfırla"
      >
        <Monitor size={16} />
      </button>

      <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
        Operatör Seçin
      </h2>
      <div className="grid grid-cols-1 gap-4">
        {operators.length === 0 ? (
          <div className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-200 rounded-xl">
            <p className="mb-2">Bu makine için tanımlı operatör yok.</p>
            <p className="text-sm">Admin panelinden ekleyebilirsiniz.</p>
          </div>
        ) : (
          operators.map((op) => (
            <button
              key={op.id}
              onClick={() => onSelectOperator(op)}
              className="flex items-center justify-center gap-4 p-6 bg-blue-600 text-white rounded-xl text-2xl font-semibold shadow-lg hover:bg-blue-700 transition-all duration-200 transform hover:scale-105"
            >
              <User size={30} />
              {op.name}
            </button>
          ))
        )}
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

// C) 2. Ekran: Ana Operatör Paneli
function MainAppPanel({ currentUser, onLogout, startProduction, stopProduction, logError, logPartCount, machineState, setMachineState, stopReasons, errorReasons, machineId }) {

  const [isStopModalOpen, setStopModalOpen] = useState(false);
  const [isErrorModalOpen, setErrorModalOpen] = useState(false);
  const [isPartCountModalOpen, setPartCountModalOpen] = useState(false);

  // Hata düzeltme
  const [lastError, setLastError] = useState(null);
  const [isCorrectionModalOpen, setCorrectionModalOpen] = useState(false);
  const [canEditError, setCanEditError] = useState(false);

  // Son hatayı getir
  const fetchLastError = async () => {
    try {
      const { data, error } = await supabase
        .from('hata_loglari')
        .select('*')
        .eq('operator_id', currentUser.user_id)
        .eq('machine_id', machineId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        setLastError(data[0]);
      } else {
        setLastError(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLastError();
    const interval = setInterval(() => { if (lastError) checkTimeLimit(); }, 10000);
    return () => clearInterval(interval);
  }, [currentUser, machineId]);

  useEffect(() => { checkTimeLimit(); }, [lastError]);

  const checkTimeLimit = () => {
    if (!lastError) { setCanEditError(false); return; }
    const errorTime = new Date(lastError.created_at).getTime();
    const now = new Date().getTime();
    const diffMinutes = (now - errorTime) / (1000 * 60);
    setCanEditError(diffMinutes <= 5);
  };

  const handleStart = () => { startProduction(); setMachineState('running'); };
  const handleStopClick = () => { setStopModalOpen(true); };
  const handleErrorClick = () => { setErrorModalOpen(true); };

  const handleStopReasonSelect = (reason) => {
    stopProduction(reason);
    setMachineState('stopped');
    setStopModalOpen(false);
  };

  const handleErrorReasonSelect = async (reason) => {
    await logError(reason);
    setErrorModalOpen(false);
    fetchLastError();
  };

  const handleCorrectionClick = () => {
    checkTimeLimit();
    if (canEditError) setCorrectionModalOpen(true);
    else { alert("Bu hatayı düzenleme süresi (5 dakika) dolmuştur."); fetchLastError(); }
  };

  const handleCorrectionSelect = async (newReason) => {
    if (!lastError) return;
    try {
      const { error } = await supabase
        .from('hata_loglari')
        .update({ sebep: newReason, eski_sebep: lastError.sebep, duzeltilme_zamani: new Date().toISOString() })
        .eq('id', lastError.id);
      if (error) throw error;
      setCorrectionModalOpen(false);
      fetchLastError();
    } catch (err) {
      alert('Hata düzeltilirken sorun: ' + err.message);
    }
  };

  const statusConfig = useMemo(() => {
    switch (machineState) {
      case 'running': return { text: 'ÜRETİMDE (#' + machineId + ')', icon: <CheckCircle size={24} />, color: 'bg-green-100 text-green-800' };
      case 'stopped': return { text: 'DURUŞTA (#' + machineId + ')', icon: <XCircle size={24} />, color: 'bg-red-100 text-red-800' };
      default: return { text: 'BEKLEMEDE (#' + machineId + ')', icon: <Database size={24} />, color: 'bg-gray-200 text-gray-800' };
    }
  }, [machineState, machineId]);

  return (
    <div className="bg-white p-12 rounded-2xl shadow-xl w-full max-w-3xl animate-fade-in relative pb-24">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
        <div>
          <span className="text-sm text-gray-500">Aktif Operatör</span>
          <h3 className="text-xl font-bold text-gray-900">{currentUser.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-gray-100 rounded text-xs font-mono text-gray-500">ID: {machineId}</span>
          <button onClick={onLogout} className="p-3 bg-gray-100 rounded-full text-gray-600 hover:bg-red-100 hover:text-red-600 transition-all"><LogOut size={20} /></button>
        </div>
      </div>

      <div className={`flex items-center justify-center gap-3 p-4 rounded-lg mb-8 text-2xl font-bold ${statusConfig.color}`}>
        {statusConfig.icon} {statusConfig.text}
      </div>

      <div className="space-y-6">
        {(machineState === 'idle' || machineState === 'stopped') && (
          <ActionButton text="Üretimi Başlat" onClick={handleStart} icon={<Play size={40} />} colorClass="bg-green-600 hover:bg-green-700" />
        )}
        {machineState === 'running' && (
          <div className="grid grid-cols-2 gap-4">
            <ActionButton text="Üretimi Durdur" onClick={handleStopClick} icon={<StopCircle size={40} />} colorClass="bg-red-600 hover:bg-red-700" />
            <ActionButton text="Hata Kaydı" onClick={handleErrorClick} icon={<AlertTriangle size={40} />} colorClass="bg-yellow-500 hover:bg-yellow-600" />
          </div>
        )}
        <ActionButton text="Sorunsuz Parça Girdisi" onClick={() => setPartCountModalOpen(true)} icon={<Package size={40} />} colorClass="bg-gray-800 hover:bg-gray-900" />
      </div>

      {lastError && (
        <div className="absolute bottom-0 left-0 w-full bg-gray-50 rounded-b-2xl border-t border-gray-200 p-4 px-8 flex justify-between items-center transition-all">
          <div>
            <span className="block text-xs text-gray-500 font-semibold uppercase tracking-wide">Son Kaydedilen Hata</span>
            <span className="text-gray-800 font-medium text-lg">{lastError.sebep}</span>
          </div>
          <button onClick={handleCorrectionClick} disabled={!canEditError} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors duration-200 ${canEditError ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
            <Pencil size={18} /> Değiştir
          </button>
        </div>
      )}

      <ReasonModal isOpen={isStopModalOpen} onClose={() => setStopModalOpen(false)} title="Duruş Sebebi Nedir?" reasons={stopReasons} onSelect={handleStopReasonSelect} />
      <ReasonModal isOpen={isErrorModalOpen} onClose={() => setErrorModalOpen(false)} title="Hata Sebebi Nedir?" reasons={errorReasons} onSelect={handleErrorReasonSelect} />
      <ReasonModal isOpen={isCorrectionModalOpen} onClose={() => setCorrectionModalOpen(false)} title="Yeni Hata Sebebi Seçin" reasons={errorReasons} onSelect={handleCorrectionSelect} />
      <PartCountModal isOpen={isPartCountModalOpen} onClose={() => setPartCountModalOpen(false)} onConfirm={(c) => { logPartCount(c); setPartCountModalOpen(false); }} />
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
      <div className="flex items-center justify-center mb-6"><Lock size={40} className="text-blue-600" /></div>
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">Admin Girişi</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-2">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="admin@example.com" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-2">Şifre</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="••••••••" /></div>
        <button type="submit" disabled={loading} className="w-full p-4 bg-blue-600 text-white rounded-lg text-lg font-medium hover:bg-blue-700 disabled:opacity-50">{loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}</button>
      </form>
      <button onClick={onBack} className="w-full mt-4 p-3 bg-gray-200 text-gray-700 rounded-lg text-md font-medium hover:bg-gray-300">Geri Dön</button>
    </div>
  );
}

// --- YARDIMCI BİLEŞENLER ---
function ActionButton({ text, onClick, icon, colorClass }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between p-6 rounded-xl text-white shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 ${colorClass}`}>
      <span className="text-2xl font-bold">{text}</span>
      {icon}
    </button>
  );
}

function ReasonModal({ isOpen, onClose, title, reasons, onSelect }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center border-b pb-4">{title}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {reasons.map((reason, index) => (
            <button key={index} onClick={() => onSelect(reason)} className="p-4 text-left bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-lg text-lg font-medium text-gray-700 hover:text-blue-700 transition-colors duration-150">{reason}</button>
          ))}
        </div>
        <button onClick={onClose} className="w-full mt-6 p-4 bg-gray-700 text-white rounded-lg text-lg font-medium hover:bg-gray-800 transition-all duration-200">İptal</button>
      </div>
    </div>
  );
}

function PartCountModal({ isOpen, onClose, onConfirm }) {
  const [count, setCount] = useState('');
  if (!isOpen) return null;
  const handleSubmit = (e) => { e.preventDefault(); if (count) { onConfirm(count); setCount(''); } };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center border-b pb-4">Sorunsuz Parça Sayısı:</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input type="number" value={count} onChange={(e) => setCount(e.target.value)} className="w-full p-4 text-3xl text-center border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500 outline-none" placeholder="0" autoFocus min="1" />
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 p-4 bg-gray-200 text-gray-800 rounded-xl text-xl font-bold hover:bg-gray-300">İptal</button>
            <button type="submit" className="flex-1 p-4 bg-blue-600 text-white rounded-xl text-xl font-bold hover:bg-blue-700">Onayla</button>
          </div>
        </form>
      </div>
    </div>
  );
}
