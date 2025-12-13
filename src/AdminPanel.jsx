import React, { useState, useEffect } from 'react';
import { Plus, Trash2, LogOut } from 'lucide-react';
import { supabase } from './supabase';

export default function AdminPanel({ session, onLogout, operators, setOperators, stopReasons, setStopReasons, errorReasons, setErrorReasons, machineId, sirketId }) {
    const [activeTab, setActiveTab] = useState('operators');

    // Fetch data from Supabase on mount
    useEffect(() => {
        if (machineId) {
            fetchOperators();
            fetchStopReasons();
            fetchErrorReasons();
        }
    }, [machineId]);

    const fetchOperators = async () => {
        const { data, error } = await supabase.from('operators').select('*').eq('machine_id', machineId).order('id');
        if (!error && data) setOperators(data);
    };

    const fetchStopReasons = async () => {
        const { data, error } = await supabase.from('stop_reasons').select('*').eq('machine_id', machineId).order('id');
        if (!error && data) setStopReasons(data.map(r => r.reason));
    };

    const fetchErrorReasons = async () => {
        const { data, error } = await supabase.from('error_reasons').select('*').eq('machine_id', machineId).order('id');
        if (!error && data) setErrorReasons(data.map(r => r.reason));
    };

    const addOperator = async (name, role) => {
        // Get current user for RLS
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            alert('Oturum hatası: Kullanıcı bulunamadı.');
            return false;
        }

        const { data, error } = await supabase.from('operators').insert([{
            full_name: name,
            role,
            user_id: user.id,
            machine_id: machineId,
            company_id: sirketId
        }]).select();

        if (!error && data) {
            setOperators([...operators, data[0]]);
            return true;
        }
        alert('Hata: ' + error?.message);
        return false;
    };

    const deleteOperator = async (id) => {
        const { error } = await supabase.from('operators').delete().eq('id', id).eq('machine_id', machineId);
        if (!error) {
            setOperators(operators.filter(op => op.id !== id));
        } else {
            alert('Silme hatası: ' + error.message);
        }
    };

    const addStopReason = async (reason) => {
        const { data, error } = await supabase.from('stop_reasons').insert([{ reason, machine_id: machineId, sirket_id: sirketId }]).select();
        if (!error && data) {
            setStopReasons([...stopReasons, reason]);
            return true;
        }
        alert('Hata: ' + error?.message);
        return false;
    };

    const deleteStopReason = async (reason) => {
        const { error } = await supabase.from('stop_reasons').delete().eq('reason', reason).eq('machine_id', machineId);
        if (!error) {
            setStopReasons(stopReasons.filter(r => r !== reason));
        } else {
            alert('Silme hatası: ' + error.message);
        }
    };

    const addErrorReason = async (reason) => {
        const { data, error } = await supabase.from('error_reasons').insert([{ reason, machine_id: machineId, sirket_id: sirketId }]).select();
        if (!error && data) {
            setErrorReasons([...errorReasons, reason]);
            return true;
        }
        alert('Hata: ' + error?.message);
        return false;
    };

    const deleteErrorReason = async (reason) => {
        const { error } = await supabase.from('error_reasons').delete().eq('reason', reason).eq('machine_id', machineId);
        if (!error) {
            setErrorReasons(errorReasons.filter(r => r !== reason));
        } else {
            alert('Silme hatası: ' + error.message);
        }
    };

    return (
        <div className="bg-white p-8 rounded-2xl shadow-xl animate-fade-in w-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-3xl font-bold text-gray-800">Admin Paneli</h2>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">{session?.user?.email}</span>
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all duration-200"
                    >
                        <LogOut size={18} />
                        Çıkış Yap
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('operators')}
                    className={`px-6 py-3 font-semibold transition-all ${activeTab === 'operators'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-800'
                        }`}
                >
                    Operatörler
                </button>
                <button
                    onClick={() => setActiveTab('stopReasons')}
                    className={`px-6 py-3 font-semibold transition-all ${activeTab === 'stopReasons'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-800'
                        }`}
                >
                    Duruş Sebepleri
                </button>
                <button
                    onClick={() => setActiveTab('errorReasons')}
                    className={`px-6 py-3 font-semibold transition-all ${activeTab === 'errorReasons'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-800'
                        }`}
                >
                    Hata Sebepleri
                </button>
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
                {activeTab === 'operators' && (
                    <OperatorsTab
                        operators={operators}
                        onAdd={addOperator}
                        onDelete={deleteOperator}
                    />
                )}
                {activeTab === 'stopReasons' && (
                    <ReasonsTab
                        title="Duruş Sebepleri"
                        reasons={stopReasons}
                        onAdd={addStopReason}
                        onDelete={deleteStopReason}
                    />
                )}
                {activeTab === 'errorReasons' && (
                    <ReasonsTab
                        title="Hata Sebepleri"
                        reasons={errorReasons}
                        onAdd={addErrorReason}
                        onDelete={deleteErrorReason}
                    />
                )}
            </div>
        </div>
    );
}

// Operators Tab Component
// Operators Tab Component (Read-Only)
function OperatorsTab({ operators }) {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Operatör Listesi</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {operators.map((op) => (
                    <div key={op.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                            <p className="font-semibold text-gray-800">{op.full_name}</p>
                            <p className="text-sm text-gray-600">{op.role}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Reasons Tab Component
function ReasonsTab({ title, reasons, onAdd, onDelete }) {
    const [showForm, setShowForm] = useState(false);
    const [newReason, setNewReason] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await onAdd(newReason);
        if (success) {
            setNewReason('');
            setShowForm(false);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                >
                    <Plus size={20} />
                    Yeni Sebep
                </button>
            </div>

            {showForm && (
                <div className="mb-6 p-6 bg-blue-50 rounded-lg">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Sebep</label>
                            <input
                                type="text"
                                value={newReason}
                                onChange={(e) => setNewReason(e.target.value)}
                                required
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Yeni sebep giriniz"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Ekle
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                            >
                                İptal
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reasons.map((reason, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <p className="font-medium text-gray-800">{reason}</p>
                        <button
                            onClick={() => onDelete(reason)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
