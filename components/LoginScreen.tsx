import React, { useState, useEffect } from 'react';
import { Shield, User, Lock } from 'lucide-react';
import { Client } from '../types';

export type LoginCredentials =
  | { type: 'admin'; pin: string }
  | { type: 'client'; clientId: string; pin: string };

interface LoginScreenProps {
  clients: Client[];
  onLogin: (credentials: LoginCredentials) => void;
  siteName: string;
  authError: string;
  setAuthError: (error: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ clients, onLogin, siteName, authError, setAuthError }) => {
  const [activeTab, setActiveTab] = useState<'admin' | 'client'>('admin');
  
  const [adminPin, setAdminPin] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientPin, setClientPin] = useState('');

  const activeClients = clients.filter(c => c.isInviteAccepted);

  useEffect(() => {
    if (activeClients.length > 0) {
        setSelectedClientId(activeClients[0].id);
    }
  }, [clients]);

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (adminPin.length !== 6) {
      setAuthError('PIN must be 6 digits.');
      return;
    }
    onLogin({ type: 'admin', pin: adminPin });
  };

  const handleClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!selectedClientId) {
      setAuthError('Please select your name.');
      return;
    }
    if (clientPin.length !== 6) {
      setAuthError('PIN must be 6 digits.');
      return;
    }
    onLogin({ type: 'client', clientId: selectedClientId, pin: clientPin });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-emerald-100 p-3 rounded-full">
              <Lock className="w-8 h-8 text-emerald-600" aria-label="Secure Login" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">{siteName}</h2>
          <p className="text-center text-sm text-slate-500 mb-6">Welcome back! Please sign in.</p>
        </div>

        <div>
          <div className="flex" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === 'admin'}
              onClick={() => {
                setActiveTab('admin');
                setAuthError('');
              }}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'admin' 
                ? 'bg-slate-100 text-emerald-700 border-b-2 border-emerald-600' 
                : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Shield size={16} aria-label="Admin Login" /> Admin Login
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'client'}
              onClick={() => {
                setActiveTab('client');
                setAuthError('');
              }}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'client' 
                ? 'bg-slate-100 text-emerald-700 border-b-2 border-emerald-600' 
                : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <User size={16} aria-label="Client Login" /> Client Login
            </button>
          </div>

          <div className="p-8 bg-slate-50">
            {activeTab === 'admin' ? (
              <form onSubmit={handleAdminSubmit} className="space-y-4 animate-in fade-in duration-300">
                <div>
                  <label htmlFor="admin-pin" className="block text-sm font-medium text-slate-700 mb-1">Admin PIN</label>
                  <input
                    id="admin-pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={6}
                    required
                    aria-required="true"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-center text-lg tracking-[8px] font-mono"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    placeholder="••••••"
                    autoFocus
                    aria-describedby={authError ? "admin-auth-error" : undefined}
                  />
                </div>
                {authError && (
                  <p id="admin-auth-error" role="alert" aria-live="polite" className="text-red-500 text-sm text-center">
                    {authError}
                  </p>
                )}
                <button type="submit" className="w-full bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 font-medium transition-colors">
                  Unlock
                </button>
              </form>
            ) : (
              <form onSubmit={handleClientSubmit} className="space-y-4 animate-in fade-in duration-300">
                <div>
                  <label htmlFor="client-select" className="block text-sm font-medium text-slate-700 mb-1">Your Name</label>
                   <select 
                     id="client-select"
                     className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                     value={selectedClientId}
                     onChange={(e) => setSelectedClientId(e.target.value)}
                     autoFocus
                     required
                     aria-required="true"
                   >
                     {activeClients.length > 0 ? (
                        activeClients.map(client => (
                            <option key={client.id} value={client.id}>{client.name}</option>
                        ))
                     ) : (
                        <option value="" disabled>No active clients</option>
                     )}
                   </select>
                </div>
                <div>
                  <label htmlFor="client-pin" className="block text-sm font-medium text-slate-700 mb-1">Your PIN</label>
                  <input
                    id="client-pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={6}
                    required
                    aria-required="true"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-center text-lg tracking-[8px] font-mono"
                    value={clientPin}
                    onChange={(e) => setClientPin(e.target.value)}
                    placeholder="••••••"
                    aria-describedby={authError ? "client-auth-error" : undefined}
                  />
                </div>
                {authError && (
                  <p id="client-auth-error" role="alert" aria-live="polite" className="text-red-500 text-sm text-center">
                    {authError}
                  </p>
                )}
                <button type="submit" className="w-full bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 font-medium transition-colors">
                  Sign In
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};