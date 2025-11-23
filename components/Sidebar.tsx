import React from 'react';
import { LayoutDashboard, Star, ShieldCheck, CreditCard, Mail, MapPin, Menu, X, CheckSquare, DollarSign, MessageSquareHeart, Briefcase, Bot, Bell } from 'lucide-react';
import { ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  isClientView: boolean;
  siteName?: string;
  unreadCount?: number;
  adminUnreadCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, isMobileOpen, setIsMobileOpen, isClientView, siteName, unreadCount = 0, adminUnreadCount = 0 }) => {
  
  // Different nav items based on View Mode
  const navItems = isClientView 
  ? [
      { id: 'dashboard' as ViewState, label: 'Project Overview', icon: <LayoutDashboard size={20} /> },
      { id: 'notifications' as ViewState, label: 'Notifications', icon: <Bell size={20} />, badge: unreadCount > 0 ? unreadCount : 0 },
      { id: 'portfolio' as ViewState, label: 'Portfolio / About', icon: <Briefcase size={20} /> },
      { id: 'google' as ViewState, label: 'Google Reviews', icon: <Star size={20} /> },
      { id: 'trustpilot' as ViewState, label: 'Trustpilot', icon: <ShieldCheck size={20} /> },
      { id: 'tasks' as ViewState, label: 'My Tasks', icon: <CheckSquare size={20} /> },
      { id: 'address' as ViewState, label: 'My Address', icon: <MapPin size={20} /> },
      { id: 'feedback' as ViewState, label: 'Leave Feedback', icon: <MessageSquareHeart size={20} /> },
    ]
  : [
      { id: 'dashboard' as ViewState, label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
      { id: 'activity_feed' as ViewState, label: 'Activity Feed', icon: <Bell size={20} />, badge: adminUnreadCount > 0 ? adminUnreadCount : 0 },
      { id: 'tasks' as ViewState, label: 'Tasks', icon: <CheckSquare size={20} /> },
      { id: 'ai_comms' as ViewState, label: 'AI Email Studio', icon: <Bot size={20} /> },
      { id: 'portfolio' as ViewState, label: 'Portfolio', icon: <Briefcase size={20} /> },
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
          <h1 className="text-sm font-bold tracking-wider text-emerald-400 truncate leading-tight">
            {siteName || (isClientView ? 'Client Portal' : 'FreelanceHub')}
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
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 relative ${
                currentView === item.id 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.icon}
              <span className="font-medium flex-1 text-left">{item.label}</span>
              {item.badge && item.badge > 0 ? (
                <span className="bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                  {item.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
        
        <div className="p-4 bg-slate-950 text-xs text-slate-500 text-center">
          {isClientView ? 'Viewing as Client' : 'v1.3.0 • Manager Mode'}
        </div>
      </div>
    </>
  );
};