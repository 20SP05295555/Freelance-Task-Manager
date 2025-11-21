
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ClientSelector } from './components/ClientSelector';
import { ViewState, Client, GoogleReview, TrustpilotReview, Payment, GmailAccount, Address, Task, Expense, ClientFeedback } from './types';
import { dataService } from './services/dataService';
import { Menu, Plus, Trash2, Copy, Wand2, LogOut, UserCheck, Eye, EyeOff, Link as LinkIcon, Send, Lock, Mail, Star, CreditCard, Users } from 'lucide-react';
import { generateReviewContent } from './services/geminiService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// --- Constants ---
const ADMIN_EMAIL = "arponchakrabortty@gmail.com";
const ADMIN_PASS = "Arponch1149@";
const AUTH_KEY = 'ftm_auth_session';

// --- Types for Local State ---
type UserRole = 'admin' | 'client';
interface AuthUser {
  role: UserRole;
  id?: string;
  name?: string;
}

// Utility to copy text
const copyToClipboard = (text: string) => {
  if (!text) return;
  navigator.clipboard.writeText(text);
  // In a real app, show a toast here
};

const App: React.FC = () => {
  // --- Auth State ---
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [authError, setAuthError] = useState('');
  
  // --- Invite/Setup State ---
  const [inviteClientId, setInviteClientId] = useState<string | null>(null);
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');

  // --- App State ---
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [activeClientId, setActiveClientId] = useState<string>(''); 

  // --- Data State ---
  const [clients, setClients] = useState<Client[]>([]);
  const [googleReviews, setGoogleReviews] = useState<GoogleReview[]>([]);
  const [trustpilotReviews, setTrustpilotReviews] = useState<TrustpilotReview[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [gmails, setGmails] = useState<GmailAccount[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [feedback, setFeedback] = useState<ClientFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // --- Initialization ---
  useEffect(() => {
    // Load Data
    const loadedClients = dataService.getClients();
    setClients(loadedClients);
    setGoogleReviews(dataService.getGoogleReviews());
    setTrustpilotReviews(dataService.getTrustpilotReviews());
    setPayments(dataService.getPayments());
    setGmails(dataService.getGmails());
    setAddresses(dataService.getAddresses());
    setTasks(dataService.getTasks());
    setExpenses(dataService.getExpenses());
    setFeedback(dataService.getFeedback());
    
    // Check Auth Session
    const storedAuth = localStorage.getItem(AUTH_KEY);
    if (storedAuth) {
      setUser(JSON.parse(storedAuth));
    }

    if (loadedClients.length > 0) {
      // Ensure activeClientId is valid
      setActiveClientId(loadedClients[0].id);
    }

    // Check URL for Invite
    const params = new URLSearchParams(window.location.search);
    const inviteId = params.get('invite');
    if (inviteId) {
      const client = loadedClients.find(c => c.id === inviteId);
      if (client) {
        setInviteClientId(inviteId);
      }
    }

    setLoading(false);
  }, []);

  // Ensure activeClientId is valid if clients change
  useEffect(() => {
    if (clients.length > 0 && !clients.find(c => c.id === activeClientId)) {
      setActiveClientId(clients[0].id);
    } else if (clients.length === 0) {
      setActiveClientId('');
    }
  }, [clients, activeClientId]);

  // --- Auth Handlers ---

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const email = loginEmail.trim();
    const pass = loginPass; // Passwords can have spaces, though rare

    // Admin Check
    if (email === ADMIN_EMAIL && pass === ADMIN_PASS) {
      const adminUser: AuthUser = { role: 'admin', name: 'Admin' };
      setUser(adminUser);
      localStorage.setItem(AUTH_KEY, JSON.stringify(adminUser));
      return;
    }

    // Client Check
    const client = clients.find(c => 
      c.email && 
      c.email.trim().toLowerCase() === email.toLowerCase() && 
      c.password === pass
    );

    if (client) {
      if (!client.isInviteAccepted) {
        setAuthError('Account not activated yet. Please use the invitation link provided by your manager.');
        return;
      }
      const clientUser: AuthUser = { role: 'client', id: client.id, name: client.name };
      setUser(clientUser);
      localStorage.setItem(AUTH_KEY, JSON.stringify(clientUser));
      setActiveClientId(client.id);
      setCurrentView('dashboard');
      return;
    }

    setAuthError('Invalid email or password.');
  };

  const handleSetupPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (setupPassword !== setupConfirm) {
      setAuthError("Passwords do not match");
      return;
    }
    if (setupPassword.length < 6) {
      setAuthError("Password must be at least 6 characters");
      return;
    }

    const updatedClients = clients.map(c => {
      if (c.id === inviteClientId) {
        return { ...c, password: setupPassword, isInviteAccepted: true };
      }
      return c;
    });

    setClients(updatedClients);
    dataService.saveClients(updatedClients);
    
    // Log them in automatically
    const client = updatedClients.find(c => c.id === inviteClientId);
    if (client) {
      const clientUser: AuthUser = { role: 'client', id: client.id, name: client.name };
      setUser(clientUser);
      localStorage.setItem(AUTH_KEY, JSON.stringify(clientUser));
      setActiveClientId(client.id);
      
      // Clear URL param
      window.history.replaceState({}, '', window.location.pathname);
      setInviteClientId(null);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_KEY);
    setLoginEmail('');
    setLoginPass('');
    setCurrentView('dashboard');
  };

  const generateInviteLink = (client: Client) => {
    if (!client) return;
    const link = `${window.location.origin}${window.location.pathname}?invite=${client.id}`;
    copyToClipboard(link);
    alert(`Invite link copied for ${client.name}!\n\nSend this link to the client:\n${link}`);
  };

  // --- Data Handlers ---

  const handleAddClient = (name: string, note: string) => {
    const newClient: Client = {
      id: Date.now().toString(),
      name,
      note,
      email: '', // Can be edited later
      isInviteAccepted: false
    };
    const updated = [...clients, newClient];
    setClients(updated);
    dataService.saveClients(updated);
    setActiveClientId(newClient.id);
  };

  const updateClientEmail = (email: string) => {
    const updated = clients.map(c => c.id === activeClientId ? { ...c, email } : c);
    setClients(updated);
    dataService.saveClients(updated);
  };

  // --- Renderers ---

  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-900 text-white">Loading...</div>;

  // 1. Invite/Setup Screen
  if (inviteClientId) {
    const inviteClient = clients.find(c => c.id === inviteClientId);
    if (!inviteClient) return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center">
          <h2 className="text-xl font-bold">Invalid or Expired Invite Link</h2>
          <p className="text-slate-400 mt-2">Please contact your manager for a new link.</p>
          <a href="/" className="text-emerald-400 mt-4 inline-block hover:underline">Go to Login</a>
        </div>
      </div>
    );

    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome, {inviteClient.name}</h2>
          <p className="text-slate-500 mb-6">Please set a secure password to access your dashboard.</p>
          
          <form onSubmit={handleSetupPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Create Password</label>
              <input 
                type="password" 
                required 
                className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500"
                value={setupPassword}
                onChange={e => setSetupPassword(e.target.value)}
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
              <input 
                type="password" 
                required 
                className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500"
                value={setupConfirm}
                onChange={e => setSetupConfirm(e.target.value)}
                minLength={6}
              />
            </div>
            {authError && <p className="text-red-500 text-sm">{authError}</p>}
            <button type="submit" className="w-full bg-emerald-600 text-white py-2 rounded hover:bg-emerald-700 font-medium">
              Set Password & Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Login Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-emerald-100 p-3 rounded-full">
              <Lock className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">Freelance Portal Login</h2>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input 
                type="email" 
                required 
                className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input 
                type="password" 
                required 
                className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500"
                value={loginPass}
                onChange={e => setLoginPass(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
            {authError && <p className="text-red-500 text-sm text-center">{authError}</p>}
            <button type="submit" className="w-full bg-emerald-600 text-white py-2 rounded hover:bg-emerald-700 font-medium transition-colors">
              Sign In
            </button>
          </form>
          <p className="text-center text-xs text-slate-400 mt-6">Protected Client Access System</p>
        </div>
      </div>
    );
  }

  // 3. Main App
  const isClient = user.role === 'client';
  const currentClient = clients.find(c => c.id === activeClientId);

  // --- Specific Render Helpers ---

  const renderDashboard = () => {
    const clientReviews = googleReviews.filter(r => r.clientId === activeClientId);
    const clientTrust = trustpilotReviews.filter(r => r.clientId === activeClientId);
    const clientPayments = payments.filter(p => p.clientId === activeClientId);
    const clientTasks = tasks.filter(t => t.clientId === activeClientId);

    const totalPaid = clientPayments.filter(p => p.status === 'Paid').reduce((acc, curr) => acc + curr.amount, 0);
    const pendingTasks = clientTasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length;

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Total Reviews</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{clientReviews.length + clientTrust.length}</h3>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Star size={20} /></div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
             <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Pending Tasks</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{pendingTasks}</h3>
              </div>
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600"><Wand2 size={20} /></div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
             <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Total Paid</p>
                <h3 className="text-2xl font-bold text-emerald-700 mt-1">${totalPaid.toLocaleString()}</h3>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><CreditCard size={20} /></div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
             <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Client Satisfaction</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">
                  {feedback.length > 0 ? (feedback.reduce((acc, curr) => acc + curr.rating, 0) / feedback.length).toFixed(1) : 'N/A'}
                </h3>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><UserCheck size={20} /></div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4">Payment History</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clientPayments.slice(-6)}>
                  <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                  <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Client Access Card (Admin Only) */}
          {!isClient && (
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
               <h3 className="font-semibold text-slate-800 mb-4">Client Access Management</h3>
               {currentClient ? (
                 <div className="space-y-4">
                    <p className="text-xs text-slate-500">Step 1: Assign Client Email</p>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                       <div className="flex items-center gap-3 w-full">
                          <Mail className="text-slate-400" size={18} />
                          <input 
                            className="bg-transparent border-none text-sm focus:ring-0 p-0 w-full"
                            placeholder="Enter Client Email"
                            value={currentClient.email || ''}
                            onChange={(e) => updateClientEmail(e.target.value)}
                          />
                       </div>
                    </div>
                    
                    <p className="text-xs text-slate-500 pt-2">Step 2: Send Invitation</p>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => generateInviteLink(currentClient)}
                        className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
                      >
                        <LinkIcon size={16} /> Copy Invite Link
                      </button>
                    </div>
                    
                    <div className="text-xs bg-slate-50 p-2 rounded text-center border border-slate-100">
                        Status: {currentClient.isInviteAccepted ? 
                          <span className="text-emerald-600 font-semibold flex items-center justify-center gap-1"><UserCheck size={12}/> Account Active</span> : 
                          <span className="text-amber-600 font-semibold">Waiting for Invite</span>
                        }
                    </div>
                 </div>
               ) : (
                 <div className="text-center py-8 text-slate-400">
                    <Users className="mx-auto mb-2 opacity-50" size={32} />
                    <p className="text-sm">Please select or create a client to manage access.</p>
                 </div>
               )}
             </div>
          )}
        </div>
      </div>
    );
  };

  const renderGoogleReviews = () => {
    const clientReviews = googleReviews.filter(r => r.clientId === activeClientId);

    const addReview = () => {
      const newReview: GoogleReview = {
        id: Date.now().toString(),
        clientId: activeClientId,
        companyLink: '',
        content: '',
        star: 5,
        reviewerName: '',
        liveLink: '',
        reviewCount: 1,
        status: 'Pending',
        note: '',
        gmailUsed: ''
      };
      const updated = [newReview, ...googleReviews];
      setGoogleReviews(updated);
      dataService.saveGoogleReviews(updated);
    };

    const updateReview = (id: string, field: keyof GoogleReview, value: any) => {
      const updated = googleReviews.map(r => r.id === id ? { ...r, [field]: value } : r);
      setGoogleReviews(updated);
      dataService.saveGoogleReviews(updated);
    };

    const generateAI = async (id: string, company: string) => {
      setIsGenerating(true);
      const content = await generateReviewContent(company || "Generic Company", 'google', "excellent service, professional team, recommended");
      updateReview(id, 'content', content);
      setIsGenerating(false);
    };
    
    const deleteReview = (id: string) => {
        const updated = googleReviews.filter(r => r.id !== id);
        setGoogleReviews(updated);
        dataService.saveGoogleReviews(updated);
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-semibold text-slate-700">Google Reviews</h3>
          {!isClient && (
            <button onClick={addReview} className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 text-sm">
              <Plus size={16} /> Add Review
            </button>
          )}
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden">
            {clientReviews.length > 0 ? (
                <div className="divide-y divide-slate-200">
                    {clientReviews.map(review => (
                        <div key={review.id} className="p-4 space-y-4">
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <label className="text-xs text-slate-500 font-medium uppercase">Reviewer</label>
                                    <input className="text-sm font-semibold w-full mt-1 p-0 bg-transparent border-0 focus:ring-0" value={review.reviewerName} placeholder="Name" readOnly={isClient} onChange={e => updateReview(review.id, 'reviewerName', e.target.value)} />
                                </div>
                                <div className="text-right">
                                    <label className="text-xs text-slate-500 font-medium uppercase block">Status</label>
                                    <select value={review.status} disabled={isClient} onChange={e => updateReview(review.id, 'status', e.target.value)} className={`mt-1 text-xs font-medium px-2 py-1 rounded-full border-none focus:ring-0 cursor-pointer ${ review.status === 'Live' ? 'bg-emerald-100 text-emerald-700' : review.status === 'Drop' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600' }`}>
                                        <option value="Pending">Pending</option>
                                        <option value="Live">Live</option>
                                        <option value="Drop">Drop</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Content</label>
                                <textarea className="w-full text-sm bg-transparent border-0 p-0 focus:ring-0 resize-y min-h-[40px] mt-1" value={review.content} placeholder="Review content..." readOnly={isClient} onChange={e => updateReview(review.id, 'content', e.target.value)} />
                                {!isClient && ( <button onClick={() => generateAI(review.id, "This Company")} disabled={isGenerating} className="mt-1 text-xs flex items-center text-indigo-600 hover:text-indigo-800"><Wand2 size={12} className="mr-1" /> {isGenerating ? 'Generating...' : 'Auto-Generate'}</button> )}
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Company Link</label>
                                <input className="w-full text-sm bg-transparent border-0 p-0 focus:ring-0 mt-1 text-blue-600" value={review.companyLink} placeholder="Company Map Link" readOnly={isClient} onChange={e => updateReview(review.id, 'companyLink', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Live Link</label>
                                <input className="w-full text-sm bg-transparent border-0 p-0 focus:ring-0 mt-1" value={review.liveLink} placeholder="Paste Live URL" readOnly={isClient} onChange={e => updateReview(review.id, 'liveLink', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Gmail Used</label>
                                <div className="flex items-center gap-2">
                                    <input className="w-full text-sm bg-transparent border-0 p-0 focus:ring-0 mt-1" value={review.gmailUsed || ''} placeholder="example@gmail.com" readOnly={isClient} onChange={e => updateReview(review.id, 'gmailUsed', e.target.value)} />
                                    <button onClick={() => copyToClipboard(review.gmailUsed || '')} className="text-slate-400 hover:text-emerald-600"><Copy size={14} /></button>
                                </div>
                            </div>
                            {!isClient && (
                                <div className="flex justify-end pt-2"><button onClick={() => deleteReview(review.id)} className="text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 text-xs"><Trash2 size={14} /> Remove</button></div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-center text-sm text-slate-400 py-8">No Google reviews for this client yet.</p>
            )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="p-3">Reviewer</th>
                <th className="p-3 w-1/3">Content</th>
                <th className="p-3">Link</th>
                <th className="p-3">Status</th>
                <th className="p-3">Live Link</th>
                <th className="p-3">Gmail Used</th>
                {!isClient && <th className="p-3 w-10"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clientReviews.map(review => (
                <tr key={review.id} className="hover:bg-slate-50 group">
                  <td className="p-3 align-top">
                    <input 
                      className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none"
                      value={review.reviewerName}
                      placeholder="Name"
                      readOnly={isClient}
                      onChange={e => updateReview(review.id, 'reviewerName', e.target.value)}
                    />
                    <div className="flex items-center mt-1 text-xs text-slate-400">
                      <Star size={10} className="text-yellow-400 fill-yellow-400 mr-1"/> 5 Stars
                    </div>
                  </td>
                  <td className="p-3 align-top">
                    <textarea 
                      className="w-full bg-transparent border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none resize-y min-h-[60px]"
                      value={review.content}
                      placeholder="Review content..."
                      readOnly={isClient}
                      onChange={e => updateReview(review.id, 'content', e.target.value)}
                    />
                    {!isClient && (
                      <button 
                        onClick={() => generateAI(review.id, "This Company")}
                        disabled={isGenerating}
                        className="mt-1 text-xs flex items-center text-indigo-600 hover:text-indigo-800"
                      >
                        <Wand2 size={12} className="mr-1" /> {isGenerating ? 'Generating...' : 'Auto-Generate'}
                      </button>
                    )}
                  </td>
                  <td className="p-3 align-top">
                     <input 
                      className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none text-blue-600"
                      value={review.companyLink}
                      placeholder="Company Map Link"
                      readOnly={isClient}
                      onChange={e => updateReview(review.id, 'companyLink', e.target.value)}
                    />
                     {review.companyLink && (
                      <a href={review.companyLink} target="_blank" rel="noreferrer" className="text-xs text-slate-400 hover:text-blue-600 flex items-center mt-1">
                        Open Link <LinkIcon size={10} className="ml-1"/>
                      </a>
                    )}
                  </td>
                  <td className="p-3 align-top">
                    <select 
                      value={review.status}
                      disabled={isClient}
                      onChange={e => updateReview(review.id, 'status', e.target.value)}
                      className={`text-xs font-medium px-2 py-1 rounded-full border-none focus:ring-0 cursor-pointer ${
                        review.status === 'Live' ? 'bg-emerald-100 text-emerald-700' :
                        review.status === 'Drop' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Live">Live</option>
                      <option value="Drop">Drop</option>
                    </select>
                  </td>
                  
                   <td className="p-3 align-top">
                     <div className="flex items-center gap-1">
                      <input 
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none text-xs"
                        value={review.liveLink}
                        placeholder="Paste Live URL"
                        readOnly={isClient}
                        onChange={e => updateReview(review.id, 'liveLink', e.target.value)}
                      />
                      {review.liveLink && (
                         <a href={review.liveLink} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700">
                            <LinkIcon size={14} />
                         </a>
                      )}
                     </div>
                  </td>

                   <td className="p-3 align-top">
                     <div className="flex items-center gap-1">
                       <input 
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none text-xs"
                        value={review.gmailUsed || ''}
                        placeholder="example@gmail.com"
                        readOnly={isClient}
                        onChange={e => updateReview(review.id, 'gmailUsed', e.target.value)}
                      />
                      <button onClick={() => copyToClipboard(review.gmailUsed || '')} className="text-slate-400 hover:text-emerald-600">
                        <Copy size={14} />
                      </button>
                     </div>
                  </td>

                  {!isClient && (
                    <td className="p-3 align-top text-right">
                      <button 
                        onClick={() => deleteReview(review.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderTrustpilotReviews = () => {
    const clientReviews = trustpilotReviews.filter(r => r.clientId === activeClientId);

    const addReview = () => {
      const newReview: TrustpilotReview = {
        id: Date.now().toString(),
        clientId: activeClientId,
        link: '',
        title: '',
        content: '',
        location: 'US',
        name: '',
        liveLink: '',
        status: 'Pending',
        gmailUsed: '',
        passwordUsed: '',
        invoiceNumber: ''
      };
      const updated = [newReview, ...trustpilotReviews];
      setTrustpilotReviews(updated);
      dataService.saveTrustpilotReviews(updated);
    };

    const updateReview = (id: string, field: keyof TrustpilotReview, value: any) => {
      const updated = trustpilotReviews.map(r => r.id === id ? { ...r, [field]: value } : r);
      setTrustpilotReviews(updated);
      dataService.saveTrustpilotReviews(updated);
    };
    
    const deleteReview = (id: string) => {
      const updated = trustpilotReviews.filter(r => r.id !== id);
      setTrustpilotReviews(updated);
      dataService.saveTrustpilotReviews(updated);
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-semibold text-slate-700">Trustpilot Reviews</h3>
          {!isClient && (
            <button onClick={addReview} className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 text-sm">
              <Plus size={16} /> Add Review
            </button>
          )}
        </div>
        
        {/* Mobile Card View */}
        <div className="lg:hidden">
            {clientReviews.length > 0 ? (
                <div className="divide-y divide-slate-200">
                    {clientReviews.map(review => (
                        <div key={review.id} className="p-4 space-y-4">
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <label className="text-xs text-slate-500 font-medium uppercase">Title</label>
                                    <input className="text-sm font-semibold w-full mt-1 p-0 bg-transparent border-0 focus:ring-0" value={review.title} placeholder="Review Title" readOnly={isClient} onChange={e => updateReview(review.id, 'title', e.target.value)} />
                                    <input className="text-xs w-full p-0 bg-transparent border-0 focus:ring-0 text-slate-500" value={review.name} placeholder="Reviewer Name" readOnly={isClient} onChange={e => updateReview(review.id, 'name', e.target.value)} />
                                </div>
                                <div className="text-right">
                                    <label className="text-xs text-slate-500 font-medium uppercase block">Status</label>
                                    <select value={review.status} disabled={isClient} onChange={e => updateReview(review.id, 'status', e.target.value)} className={`mt-1 text-xs font-medium px-2 py-1 rounded-full border-none focus:ring-0 cursor-pointer ${ review.status === 'Live' ? 'bg-emerald-100 text-emerald-700' : review.status === 'Drop' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600' }`}>
                                        <option value="Pending">Pending</option>
                                        <option value="Live">Live</option>
                                        <option value="Drop">Drop</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Content</label>
                                <textarea className="w-full text-sm bg-transparent border-0 p-0 focus:ring-0 resize-y min-h-[40px] mt-1" value={review.content} placeholder="Review content..." readOnly={isClient} onChange={e => updateReview(review.id, 'content', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Invoice #</label>
                                <input className="w-full text-sm bg-transparent border-0 p-0 focus:ring-0 mt-1" value={review.invoiceNumber || ''} placeholder="INV-001" readOnly={isClient} onChange={e => updateReview(review.id, 'invoiceNumber', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Live Link</label>
                                <input className="w-full text-sm bg-transparent border-0 p-0 focus:ring-0 mt-1" value={review.liveLink} placeholder="Paste Live URL" readOnly={isClient} onChange={e => updateReview(review.id, 'liveLink', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Gmail Used</label>
                                <div className="flex items-center gap-2">
                                    <input className="w-full text-sm bg-transparent border-0 p-0 focus:ring-0 mt-1" value={review.gmailUsed || ''} placeholder="example@gmail.com" readOnly={isClient} onChange={e => updateReview(review.id, 'gmailUsed', e.target.value)} />
                                    <button onClick={() => copyToClipboard(review.gmailUsed || '')} className="text-slate-400 hover:text-emerald-600"><Copy size={14} /></button>
                                </div>
                            </div>
                            {!isClient && (
                                <div className="flex justify-end pt-2"><button onClick={() => deleteReview(review.id)} className="text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 text-xs"><Trash2 size={14} /> Remove</button></div>
                            )}
                        </div>
                    ))}
                </div>
             ) : (
                <p className="text-center text-sm text-slate-400 py-8">No Trustpilot reviews for this client yet.</p>
            )}
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="p-3">Title</th>
                <th className="p-3 w-1/4">Content</th>
                <th className="p-3">Invoice #</th>
                <th className="p-3">Status</th>
                <th className="p-3">Live Link</th>
                <th className="p-3">Gmail Used</th>
                {!isClient && <th className="p-3 w-10"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clientReviews.map(review => (
                <tr key={review.id} className="hover:bg-slate-50 group">
                  <td className="p-3 align-top">
                    <input 
                      className="w-full font-medium bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none mb-1"
                      value={review.title}
                      placeholder="Review Title"
                      readOnly={isClient}
                      onChange={e => updateReview(review.id, 'title', e.target.value)}
                    />
                    <input 
                      className="w-full text-xs bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none text-slate-500"
                      value={review.name}
                      placeholder="Reviewer Name"
                      readOnly={isClient}
                      onChange={e => updateReview(review.id, 'name', e.target.value)}
                    />
                  </td>
                  <td className="p-3 align-top">
                    <textarea 
                      className="w-full bg-transparent border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none resize-y min-h-[60px]"
                      value={review.content}
                      placeholder="Review content..."
                      readOnly={isClient}
                      onChange={e => updateReview(review.id, 'content', e.target.value)}
                    />
                  </td>
                  <td className="p-3 align-top">
                     <input 
                      className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none"
                      value={review.invoiceNumber || ''}
                      placeholder="INV-001"
                      readOnly={isClient}
                      onChange={e => updateReview(review.id, 'invoiceNumber', e.target.value)}
                    />
                  </td>
                  <td className="p-3 align-top">
                    <select 
                      value={review.status}
                      disabled={isClient}
                      onChange={e => updateReview(review.id, 'status', e.target.value)}
                      className={`text-xs font-medium px-2 py-1 rounded-full border-none focus:ring-0 cursor-pointer ${
                        review.status === 'Live' ? 'bg-emerald-100 text-emerald-700' :
                        review.status === 'Drop' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Live">Live</option>
                      <option value="Drop">Drop</option>
                    </select>
                  </td>
                  
                   <td className="p-3 align-top">
                     <div className="flex items-center gap-1">
                      <input 
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none text-xs"
                        value={review.liveLink}
                        placeholder="Paste Live URL"
                        readOnly={isClient}
                        onChange={e => updateReview(review.id, 'liveLink', e.target.value)}
                      />
                      {review.liveLink && (
                         <a href={review.liveLink} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700">
                            <LinkIcon size={14} />
                         </a>
                      )}
                     </div>
                  </td>
                  
                   <td className="p-3 align-top">
                     <div className="flex items-center gap-1">
                       <input 
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none text-xs"
                        value={review.gmailUsed || ''}
                        placeholder="example@gmail.com"
                        readOnly={isClient}
                        onChange={e => updateReview(review.id, 'gmailUsed', e.target.value)}
                      />
                       <button onClick={() => copyToClipboard(review.gmailUsed || '')} className="text-slate-400 hover:text-emerald-600">
                        <Copy size={14} />
                      </button>
                     </div>
                  </td>

                  {!isClient && (
                    <td className="p-3 align-top text-right">
                      <button 
                        onClick={() => deleteReview(review.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPayments = () => {
    const clientPayments = payments.filter(p => p.clientId === activeClientId);

    const addPayment = () => {
      const newPayment: Payment = {
        id: Date.now().toString(),
        clientId: activeClientId,
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        status: 'Unpaid',
        note: ''
      };
      const updated = [newPayment, ...payments];
      setPayments(updated);
      dataService.savePayments(updated);
    };

    const updatePayment = (id: string, field: keyof Payment, value: any) => {
      const updated = payments.map(p => p.id === id ? { ...p, [field]: value } : p);
      setPayments(updated);
      dataService.savePayments(updated);
    };
    
    const deletePayment = (id: string) => {
        const updated = payments.filter(p => p.id !== id);
        setPayments(updated);
        dataService.savePayments(updated);
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-semibold text-slate-700">Payment Records</h3>
          {!isClient && (
            <button onClick={addPayment} className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 text-sm">
              <Plus size={16} /> Add Payment
            </button>
          )}
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden">
            {clientPayments.length > 0 ? (
                <div className="divide-y divide-slate-200">
                    {clientPayments.map(payment => (
                        <div key={payment.id} className="p-4 space-y-4">
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <label className="text-xs text-slate-500 font-medium uppercase">Amount</label>
                                    <div className="flex items-center">
                                        <span className="text-lg font-bold text-emerald-600 mr-1">$</span>
                                        <input type="number" className="text-lg font-bold text-emerald-600 w-full p-0 bg-transparent border-0 focus:ring-0" value={payment.amount} readOnly={isClient} onChange={e => updatePayment(payment.id, 'amount', Number(e.target.value))} />
                                    </div>
                                </div>
                                <div className="text-right">
                                    <label className="text-xs text-slate-500 font-medium uppercase block">Status</label>
                                    <select value={payment.status} disabled={isClient} onChange={e => updatePayment(payment.id, 'status', e.target.value)} className={`mt-1 text-xs font-medium px-2 py-1 rounded-full border-none focus:ring-0 cursor-pointer ${ payment.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700' }`}>
                                        <option value="Pending">Pending</option>
                                        <option value="Paid">Paid</option>
                                        <option value="Unpaid">Unpaid</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Date</label>
                                <input type="date" className="w-full text-sm bg-transparent border-0 p-0 focus:ring-0 mt-1" value={payment.date} readOnly={isClient} onChange={e => updatePayment(payment.id, 'date', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Note</label>
                                <input className="w-full text-sm bg-transparent border-0 p-0 focus:ring-0 mt-1" value={payment.note} placeholder="Description..." readOnly={isClient} onChange={e => updatePayment(payment.id, 'note', e.target.value)} />
                            </div>
                            {!isClient && (
                                <div className="flex justify-end pt-2"><button onClick={() => deletePayment(payment.id)} className="text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 text-xs"><Trash2 size={14} /> Remove</button></div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-center text-sm text-slate-400 py-8">No payment records for this client yet.</p>
            )}
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Amount ($)</th>
                <th className="p-3">Note</th>
                <th className="p-3">Status</th>
                {!isClient && <th className="p-3 w-10"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clientPayments.map(payment => (
                <tr key={payment.id} className="hover:bg-slate-50">
                  <td className="p-3">
                    <input 
                      type="date"
                      className="bg-transparent focus:outline-none"
                      value={payment.date}
                      readOnly={isClient}
                      onChange={e => updatePayment(payment.id, 'date', e.target.value)}
                    />
                  </td>
                  <td className="p-3">
                    <input 
                      type="number"
                      className="bg-transparent focus:outline-none w-24 font-medium"
                      value={payment.amount}
                      readOnly={isClient}
                      onChange={e => updatePayment(payment.id, 'amount', Number(e.target.value))}
                    />
                  </td>
                  <td className="p-3">
                    <input 
                      className="w-full bg-transparent focus:outline-none"
                      value={payment.note}
                      placeholder="Description..."
                      readOnly={isClient}
                      onChange={e => updatePayment(payment.id, 'note', e.target.value)}
                    />
                  </td>
                  <td className="p-3">
                     <select 
                      value={payment.status}
                      disabled={isClient}
                      onChange={e => updatePayment(payment.id, 'status', e.target.value)}
                      className={`text-xs font-medium px-2 py-1 rounded-full border-none focus:ring-0 cursor-pointer ${
                        payment.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-amber-100 text-amber-700'
                      }`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                      <option value="Unpaid">Unpaid</option>
                    </select>
                  </td>
                  {!isClient && (
                    <td className="p-3 text-right">
                      <button 
                        onClick={() => deletePayment(payment.id)}
                        className="text-slate-300 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------
  // --- Missing Render Functions (Gmails, Addresses) ---
  // -------------------------------------------------------

  const renderGmails = () => {
    const clientGmails = gmails.filter(g => g.clientId === activeClientId);

    const addGmail = () => {
      const newGmail: GmailAccount = {
        id: Date.now().toString(),
        clientId: activeClientId,
        email: '',
        oldPassword: '',
        newPassword: '',
        old2FA: '',
        new2FA: '',
        backupCode: ''
      };
      const updated = [...gmails, newGmail];
      setGmails(updated);
      dataService.saveGmails(updated);
    };

    const updateGmail = (id: string, field: keyof GmailAccount, value: string) => {
      const updated = gmails.map(g => g.id === id ? { ...g, [field]: value } : g);
      setGmails(updated);
      dataService.saveGmails(updated);
    };
    
    const deleteGmail = (id: string) => {
        const updated = gmails.filter(g => g.id !== id);
        setGmails(updated);
        dataService.saveGmails(updated);
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-semibold text-slate-700">Gmail Inventory</h3>
          {!isClient && (
            <button onClick={addGmail} className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 text-sm">
              <Plus size={16} /> Add Gmail
            </button>
          )}
        </div>
        
        {/* Mobile Card View */}
        <div className="lg:hidden">
            {clientGmails.length > 0 ? (
                <div className="divide-y divide-slate-200">
                    {clientGmails.map(gmail => (
                        <div key={gmail.id} className="p-4 space-y-4">
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Email</label>
                                <div className="flex items-center gap-2">
                                    <input className="w-full text-sm font-semibold bg-transparent border-0 p-0 focus:ring-0 mt-1" value={gmail.email} placeholder="Email" readOnly={isClient} onChange={e => updateGmail(gmail.id, 'email', e.target.value)} />
                                    <button onClick={() => copyToClipboard(gmail.email)} className="text-slate-400 hover:text-emerald-600"><Copy size={14} /></button>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Password</label>
                                <div className="flex items-center gap-2">
                                    <input className="w-full text-sm bg-transparent border-0 p-0 focus:ring-0 mt-1 font-mono" value={gmail.newPassword || gmail.oldPassword} placeholder="Password" readOnly={isClient} onChange={e => updateGmail(gmail.id, 'newPassword', e.target.value)} />
                                    <button onClick={() => copyToClipboard(gmail.newPassword || gmail.oldPassword || '')} className="text-slate-400 hover:text-emerald-600"><Copy size={14} /></button>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Recovery / 2FA</label>
                                <input className="w-full text-sm bg-transparent border-0 p-0 focus:ring-0 mt-1" value={gmail.new2FA || gmail.old2FA} placeholder="Recovery Email or 2FA" readOnly={isClient} onChange={e => updateGmail(gmail.id, 'new2FA', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Backup Code</label>
                                <input className="w-full text-sm bg-transparent border-0 p-0 focus:ring-0 mt-1 font-mono" value={gmail.backupCode} placeholder="Backup Code" readOnly={isClient} onChange={e => updateGmail(gmail.id, 'backupCode', e.target.value)} />
                            </div>
                            {!isClient && (
                                <div className="flex justify-end pt-2"><button onClick={() => deleteGmail(gmail.id)} className="text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 text-xs"><Trash2 size={14} /> Remove</button></div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-center text-sm text-slate-400 py-8">No Gmail accounts for this client yet.</p>
            )}
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="p-3">Email</th>
                <th className="p-3">Password</th>
                <th className="p-3">Recovery / 2FA</th>
                <th className="p-3">Backup Code</th>
                {!isClient && <th className="p-3 w-10"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clientGmails.map(gmail => (
                <tr key={gmail.id} className="hover:bg-slate-50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <input 
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none"
                        value={gmail.email}
                        placeholder="Email"
                        readOnly={isClient}
                        onChange={e => updateGmail(gmail.id, 'email', e.target.value)}
                      />
                      <button onClick={() => copyToClipboard(gmail.email)} className="text-slate-300 hover:text-emerald-600">
                        <Copy size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <input 
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none font-mono text-xs"
                        value={gmail.newPassword || gmail.oldPassword}
                        placeholder="Password"
                        readOnly={isClient}
                        onChange={e => updateGmail(gmail.id, 'newPassword', e.target.value)}
                      />
                      <button onClick={() => copyToClipboard(gmail.newPassword || gmail.oldPassword || '')} className="text-slate-300 hover:text-emerald-600">
                        <Copy size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="p-3">
                    <input 
                      className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none"
                      value={gmail.new2FA || gmail.old2FA}
                      placeholder="Recovery Email or 2FA"
                      readOnly={isClient}
                      onChange={e => updateGmail(gmail.id, 'new2FA', e.target.value)}
                    />
                  </td>
                  <td className="p-3">
                    <input 
                      className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none font-mono text-xs"
                      value={gmail.backupCode}
                      placeholder="Backup Code"
                      readOnly={isClient}
                      onChange={e => updateGmail(gmail.id, 'backupCode', e.target.value)}
                    />
                  </td>
                  {!isClient && (
                    <td className="p-3 text-right">
                      <button 
                        onClick={() => deleteGmail(gmail.id)}
                        className="text-slate-300 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderAddresses = () => {
    const clientAddresses = addresses.filter(a => a.clientId === activeClientId);

    const addAddress = () => {
      const newAddr: Address = {
        id: Date.now().toString(),
        clientId: activeClientId,
        fullAddress: '',
        phone: '',
        invoiceNumber: ''
      };
      const updated = [...addresses, newAddr];
      setAddresses(updated);
      dataService.saveAddresses(updated);
    };

    const updateAddress = (id: string, field: keyof Address, value: string) => {
      const updated = addresses.map(a => a.id === id ? { ...a, [field]: value } : a);
      setAddresses(updated);
      dataService.saveAddresses(updated);
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-semibold text-slate-700">Address Book</h3>
          {!isClient && (
            <button onClick={addAddress} className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 text-sm">
              <Plus size={16} /> Add Address
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          {clientAddresses.map(addr => (
            <div key={addr.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-slate-50 relative group">
              {!isClient && (
                <button 
                  onClick={() => {
                    const updated = addresses.filter(a => a.id !== addr.id);
                    setAddresses(updated);
                    dataService.saveAddresses(updated);
                  }}
                  className="absolute top-2 right-2 text-slate-300 hover:text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 font-medium uppercase">Address</label>
                  <textarea 
                    className="w-full bg-white border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none h-20"
                    value={addr.fullAddress}
                    readOnly={isClient}
                    onChange={e => updateAddress(addr.id, 'fullAddress', e.target.value)}
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 font-medium uppercase">Phone</label>
                    <input 
                      className="w-full bg-white border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      value={addr.phone}
                      readOnly={isClient}
                      onChange={e => updateAddress(addr.id, 'phone', e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 font-medium uppercase">Inv #</label>
                    <input 
                      className="w-full bg-white border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      value={addr.invoiceNumber}
                      readOnly={isClient}
                      onChange={e => updateAddress(addr.id, 'invoiceNumber', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
          {clientAddresses.length === 0 && (
            <div className="col-span-full text-center py-8 text-slate-400 text-sm italic">
              No addresses saved for this client.
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTasks = () => (
    <div className="text-center p-10 text-slate-500 bg-white rounded-lg border border-slate-200">
      <Wand2 className="mx-auto mb-2 text-slate-300" size={32}/>
      Task Management Coming Soon
    </div>
  );
  const renderExpenses = () => (
     <div className="text-center p-10 text-slate-500 bg-white rounded-lg border border-slate-200">
      <Wand2 className="mx-auto mb-2 text-slate-300" size={32}/>
      Expense Tracker Coming Soon
    </div>
  );
  const renderFeedback = () => (
     <div className="text-center p-10 text-slate-500 bg-white rounded-lg border border-slate-200">
      <Wand2 className="mx-auto mb-2 text-slate-300" size={32}/>
      Feedback System Coming Soon
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        isClientView={isClient}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-700">
              <Menu size={24} />
            </button>
            {/* Always show ClientSelector for Admin, even if list is empty, so they can Add New */}
            {!isClient && (
              <ClientSelector 
                clients={clients} 
                activeClientId={activeClientId} 
                setActiveClientId={setActiveClientId}
                onAddClient={handleAddClient}
              />
            )}
            {isClient && (
               <h2 className="text-lg font-semibold text-slate-800">{user.name}</h2>
            )}
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                {user.role === 'admin' ? 'Admin' : 'Client View'}
             </div>
             <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors" title="Logout">
               <LogOut size={20} />
             </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-800">
                {currentView === 'dashboard' ? 'Dashboard Overview' : 
                 currentView === 'google' ? 'Google Reviews Management' :
                 currentView === 'trustpilot' ? 'Trustpilot Reviews' :
                 currentView === 'gmail' ? 'Gmail Accounts' :
                 currentView === 'address' ? 'Addresses' :
                 currentView === 'payments' ? 'Payments & Invoices' :
                 currentView.charAt(0).toUpperCase() + currentView.slice(1)}
              </h2>
              <p className="text-slate-500 text-sm">
                {isClient ? `Welcome back, ${user.name}` : `Managing data for ${clients.find(c => c.id === activeClientId)?.name || 'Selected Client'}`}
              </p>
            </div>

            {currentView === 'dashboard' && renderDashboard()}
            {currentView === 'google' && renderGoogleReviews()}
            {currentView === 'trustpilot' && renderTrustpilotReviews()}
            {currentView === 'payments' && renderPayments()}
            {currentView === 'gmail' && renderGmails()}
            {currentView === 'address' && renderAddresses()}
            {currentView === 'tasks' && renderTasks()}
            {currentView === 'expenses' && renderExpenses()}
            {currentView === 'feedback' && renderFeedback()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;