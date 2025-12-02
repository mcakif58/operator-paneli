
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
          Çıkış Yap
        </button>
      </div>

      <div className="text-center py-8">
        <p className="text-lg text-gray-600 mb-4">
          Hoş geldiniz! Giriş başarılı.
        </p>
        <p className="text-sm text-gray-500">
          Email: {session?.user?.email}
        </p>
      </div>

      <div className="mt-8 p-6 bg-blue-50 rounded-lg">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Gelecek Özellikler:</h3>
        <ul className="list-disc list-inside text-gray-700 space-y-2">
          <li>Operatör Ekleme/Çıkarma</li>
          <li>Duruş ve Hata Sebeplerini Yönetme</li>
          <li>Raporlar ve İstatistikler</li>
          <li>Veri Görselleştirme</li>
        </ul>
      </div>
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