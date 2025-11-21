import React from 'react';
import { LayoutDashboard, Star, ShieldCheck, CreditCard, Mail, MapPin, Menu, X, CheckSquare, DollarSign, MessageSquareHeart } from 'lucide-react';
import { ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  isClientView: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, isMobileOpen, setIsMobileOpen, isClientView }) => {
  
  // Different nav items based on View Mode
  const navItems = isClientView 
  ? [
      { id: 'dashboard' as ViewState, label: 'Project Overview', icon: <LayoutDashboard size={20} /> },
      { id: 'tasks' as ViewState, label: 'My Tasks', icon: <CheckSquare size={20} /> },
      { id: 'feedback' as ViewState, label: 'Community Trust', icon: <MessageSquareHeart size={20} /> },
    ]
  : [
      { id: 'dashboard' as ViewState, label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
      { id: 'tasks' as ViewState, label: 'Tasks', icon: <CheckSquare size={20} /> },
      { id: 'google' as ViewState, label: 'Google Reviews', icon: <Star size={20} /> },
      { id: 'trustpilot' as ViewState, label: 'Trustpilot', icon: <ShieldCheck size={20} /> },
      { id: 'payments' as ViewState, label: 'Payments', icon: <CreditCard size={20} /> },
      { id: 'expenses' as ViewState, label: 'Expenses', icon: <DollarSign size={20} /> },
      { id: 'gmail' as ViewState, label: 'Gmail Accounts', icon: <Mail size={20} /> },
      { id: 'address' as ViewState, label: 'Addresses', icon: <MapPin size={20} /> },
      { id: 'feedback' as ViewState, label: 'Client Feedback', icon: <MessageSquareHeart size={20} /> },
    ];

  const baseClasses = "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0";
  const mobileClasses = isMobileOpen ? "translate-x-0" : "-translate-x-full";

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div className={`${baseClasses} ${mobileClasses} flex flex-col shadow-xl`}>
        <div className={`h-16 flex items-center justify-between px-6 ${isClientView ? 'bg-indigo-950' : 'bg-slate-950'}`}>
          <h1 className="text-xl font-bold tracking-wider text-emerald-400">
            {isClientView ? 'Client Portal' : 'FreelanceHub'}
          </h1>
          <button onClick={() => setIsMobileOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id);
                setIsMobileOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                currentView === item.id 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="p-4 bg-slate-950 text-xs text-slate-500 text-center">
          {isClientView ? 'Viewing as Client' : 'v1.2.0 • Manager Mode'}
        </div>
      </div>
    </>
  );
};