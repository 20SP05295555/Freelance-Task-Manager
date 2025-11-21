import React, { useState } from 'react';
import { Client } from '../types';
import { ChevronDown, Plus, Users } from 'lucide-react';

interface ClientSelectorProps {
  clients: Client[];
  activeClientId: string;
  setActiveClientId: (id: string) => void;
  onAddClient: (name: string, note: string) => void;
}

export const ClientSelector: React.FC<ClientSelectorProps> = ({ clients, activeClientId, setActiveClientId, onAddClient }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientNote, setNewClientNote] = useState('');

  const activeClient = clients.find(c => c.id === activeClientId);

  const handleAdd = () => {
    if (newClientName.trim()) {
      onAddClient(newClientName, newClientNote);
      setNewClientName('');
      setNewClientNote('');
      setIsAdding(false);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg shadow-sm transition-colors text-slate-700 font-medium"
      >
        <Users size={18} className="text-emerald-600" />
        <span>{activeClient?.name || 'Select Client'}</span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 sm:w-72 bg-white rounded-lg shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="max-h-60 overflow-y-auto">
            {clients.map(client => (
              <button
                key={client.id}
                onClick={() => {
                  setActiveClientId(client.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 ${
                  client.id === activeClientId ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600'
                }`}
              >
                <div className="flex flex-col">
                  <span>{client.name}</span>
                  {client.note && <span className="text-xs text-slate-400 truncate mt-0.5">{client.note}</span>}
                </div>
              </button>
            ))}
          </div>
          
          <div className="p-3 bg-slate-50 border-t border-slate-100">
            {isAdding ? (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="New Client Name"
                  className="px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
                <textarea
                  value={newClientNote}
                  onChange={(e) => setNewClientNote(e.target.value)}
                  placeholder="Note (Optional)"
                  className="px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none h-16"
                />
                <div className="flex gap-2">
                  <button onClick={handleAdd} className="flex-1 bg-emerald-600 text-white text-xs py-1.5 rounded hover:bg-emerald-700">Save</button>
                  <button onClick={() => setIsAdding(false)} className="flex-1 bg-slate-200 text-slate-700 text-xs py-1.5 rounded hover:bg-slate-300">Cancel</button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setIsAdding(true)}
                className="w-full flex items-center justify-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                <Plus size={16} /> Add New Client
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};