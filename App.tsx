import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ClientSelector } from './components/ClientSelector';
import { ViewState, Client, GoogleReview, TrustpilotReview, Payment, GmailAccount, Address, Task, Expense, ClientFeedback, AdvanceTransaction, AdvanceType, TaskStatus, TaskPriority, PortfolioProfile, Project, AppSettings } from './types';
import { dataService } from './services/dataService';
import { Menu, Plus, Trash2, Copy, Wand2, LogOut, UserCheck, Eye, EyeOff, Link as LinkIcon, Send, Lock, Mail, Star, CreditCard, Users, ShieldCheck, MapPin, CheckSquare, DollarSign, TrendingDown, TrendingUp, AlertCircle, Clock, ArrowRight, Briefcase, Edit3, Save, Globe, ExternalLink, X, Settings, AlertTriangle, Link2 } from 'lucide-react';
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
  const [paymentTab, setPaymentTab] = useState<'invoices' | 'advance'>('invoices');

  // --- Data State ---
  const [clients, setClients] = useState<Client[]>([]);
  const [googleReviews, setGoogleReviews] = useState<GoogleReview[]>([]);
  const [trustpilotReviews, setTrustpilotReviews] = useState<TrustpilotReview[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [advances, setAdvances] = useState<AdvanceTransaction[]>([]);
  const [gmails, setGmails] = useState<GmailAccount[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [feedback, setFeedback] = useState<ClientFeedback[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioProfile | null>(null);
  const [settings, setSettings] = useState<AppSettings>({ siteName: "Freelance with Arpon Chakrabortty (Alex)" });
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // --- Portfolio Edit State ---
  const [isEditingPortfolio, setIsEditingPortfolio] = useState(false);

  // --- Feedback Form State ---
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');

  // --- Initialization ---
  useEffect(() => {
    // Load Data
    const loadedClients = dataService.getClients();
    setClients(loadedClients);
    setGoogleReviews(dataService.getGoogleReviews());
    setTrustpilotReviews(dataService.getTrustpilotReviews());
    setPayments(dataService.getPayments());
    setAdvances(dataService.getAdvances());
    setGmails(dataService.getGmails());
    setAddresses(dataService.getAddresses());
    setTasks(dataService.getTasks());
    setExpenses(dataService.getExpenses());
    setFeedback(dataService.getFeedback());
    setPortfolio(dataService.getPortfolio());
    setSettings(dataService.getSettings());
    
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

  const handleSubmitFeedback = () => {
    if (!feedbackComment.trim()) return;
    const newFeedback: ClientFeedback = {
      id: Date.now().toString(),
      clientId: activeClientId,
      rating: feedbackRating,
      comment: feedbackComment,
      date: new Date().toISOString().split('T')[0]
    };
    const updated = [newFeedback, ...feedback];
    setFeedback(updated);
    dataService.saveFeedback(updated);
    setFeedbackComment('');
    setFeedbackRating(5);
    alert("Thank you for your feedback!");
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

  // --- Portfolio Handlers ---
  
  const updatePortfolio = (field: keyof PortfolioProfile, value: any) => {
    if (!portfolio) return;
    const updated = { ...portfolio, [field]: value };
    setPortfolio(updated);
    dataService.savePortfolio(updated);
  };

  const addProject = () => {
    if (!portfolio) return;
    const newProject: Project = {
      id: Date.now().toString(),
      title: 'New Project',
      description: 'Project description...',
      tags: ['Tag1'],
      imageUrl: 'https://via.placeholder.com/400x200',
    };
    const updated = { ...portfolio, projects: [newProject, ...portfolio.projects] };
    setPortfolio(updated);
    dataService.savePortfolio(updated);
  };

  const updateProject = (projectId: string, field: keyof Project, value: any) => {
    if (!portfolio) return;
    const updatedProjects = portfolio.projects.map(p => 
      p.id === projectId ? { ...p, [field]: value } : p
    );
    const updated = { ...portfolio, projects: updatedProjects };
    setPortfolio(updated);
    dataService.savePortfolio(updated);
  };

  const deleteProject = (projectId: string) => {
    if (!portfolio) return;
    const updatedProjects = portfolio.projects.filter(p => p.id !== projectId);
    const updated = { ...portfolio, projects: updatedProjects };
    setPortfolio(updated);
    dataService.savePortfolio(updated);
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
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">{settings.siteName}</h2>
          
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
  
  const renderPortfolio = () => {
    if (!portfolio) return null;

    return (
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
          <div className="h-32 bg-gradient-to-r from-slate-800 to-indigo-900"></div>
          <div className="px-6 pb-6">
             <div className="flex flex-col md:flex-row items-start md:items-end gap-4 -mt-12">
               <div className="relative shrink-0">
                 <img 
                   src={portfolio.profileImage || "https://via.placeholder.com/150"} 
                   alt="Profile" 
                   className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-md object-cover bg-slate-100"
                 />
                 {!isClient && isEditingPortfolio && (
                    <input 
                       className="absolute bottom-0 left-0 w-full text-xs bg-white/90 border border-slate-300 rounded px-1"
                       placeholder="Image URL"
                       value={portfolio.profileImage}
                       onChange={e => updatePortfolio('profileImage', e.target.value)}
                    />
                 )}
               </div>
               <div className="flex-1 w-full">
                 <div className="flex justify-between items-start">
                   <div className="w-full">
                      {isEditingPortfolio ? (
                        <div className="space-y-2">
                           <input 
                             className="text-2xl font-bold text-slate-800 w-full border-b border-slate-300 focus:border-indigo-500 focus:outline-none"
                             value={portfolio.name}
                             onChange={e => updatePortfolio('name', e.target.value)}
                           />
                           <input 
                             className="text-indigo-600 font-medium w-full border-b border-slate-300 focus:border-indigo-500 focus:outline-none"
                             value={portfolio.title}
                             onChange={e => updatePortfolio('title', e.target.value)}
                           />
                        </div>
                      ) : (
                        <>
                           <h1 className="text-2xl font-bold text-slate-800">{portfolio.name}</h1>
                           <p className="text-indigo-600 font-medium">{portfolio.title}</p>
                        </>
                      )}
                   </div>
                   {!isClient && (
                     <button 
                       onClick={() => setIsEditingPortfolio(!isEditingPortfolio)}
                       className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-full transition-colors"
                     >
                       {isEditingPortfolio ? <Save size={18} className="text-emerald-600"/> : <Edit3 size={18} />}
                     </button>
                   )}
                 </div>
               </div>
             </div>
             
             <div className="mt-6 space-y-4">
                <div>
                   <h3 className="text-sm font-semibold text-slate-500 uppercase mb-1">About</h3>
                   {isEditingPortfolio ? (
                      <textarea 
                        className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24"
                        value={portfolio.bio}
                        onChange={e => updatePortfolio('bio', e.target.value)}
                      />
                   ) : (
                      <p className="text-slate-600 leading-relaxed">{portfolio.bio}</p>
                   )}
                </div>
                
                <div>
                   <h3 className="text-sm font-semibold text-slate-500 uppercase mb-2">Skills</h3>
                   <div className="flex flex-wrap gap-2">
                      {portfolio.skills.map((skill, idx) => (
                         <span key={idx} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                            {skill}
                            {isEditingPortfolio && (
                              <button 
                                onClick={() => updatePortfolio('skills', portfolio.skills.filter((_, i) => i !== idx))}
                                className="hover:text-red-500 ml-1"
                              >
                                <X size={12}/>
                              </button>
                            )}
                         </span>
                      ))}
                      {isEditingPortfolio && (
                        <button 
                          onClick={() => {
                            const newSkill = prompt("Enter new skill:");
                            if (newSkill) updatePortfolio('skills', [...portfolio.skills, newSkill]);
                          }}
                          className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-sm font-medium hover:bg-slate-200 flex items-center gap-1"
                        >
                           <Plus size={14}/> Add
                        </button>
                      )}
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Projects Section */}
        <div>
           <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800">Case Studies & Projects</h2>
              {!isClient && isEditingPortfolio && (
                 <button onClick={addProject} className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 text-sm">
                    <Plus size={16} /> <span className="hidden sm:inline">Add Project</span><span className="sm:hidden">Add</span>
                 </button>
              )}
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {portfolio.projects.map(project => (
                 <div key={project.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all group">
                    <div className="h-48 bg-slate-100 relative overflow-hidden">
                       <img src={project.imageUrl} alt={project.title} className="w-full h-full object-cover" />
                       {isEditingPortfolio && (
                          <input 
                             className="absolute bottom-0 left-0 w-full text-xs bg-black/70 text-white border-none p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                             value={project.imageUrl}
                             placeholder="Image URL"
                             onChange={e => updateProject(project.id, 'imageUrl', e.target.value)}
                          />
                       )}
                       {project.link && !isEditingPortfolio && (
                         <a href={project.link} target="_blank" rel="noopener noreferrer" className="absolute top-2 right-2 bg-white/90 p-2 rounded-full text-slate-700 hover:text-indigo-600 shadow-sm">
                            <ExternalLink size={16} />
                         </a>
                       )}
                       {isEditingPortfolio && (
                         <button 
                           onClick={() => deleteProject(project.id)}
                           className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 shadow-sm"
                         >
                            <Trash2 size={16} />
                         </button>
                       )}
                    </div>
                    <div className="p-5">
                       {isEditingPortfolio ? (
                          <div className="space-y-2">
                             <input 
                               className="font-bold text-lg w-full border-b border-slate-200 focus:outline-none focus:border-indigo-500"
                               value={project.title}
                               onChange={e => updateProject(project.id, 'title', e.target.value)}
                             />
                             <textarea 
                               className="text-sm text-slate-600 w-full border border-slate-200 rounded p-1 focus:outline-none focus:border-indigo-500 h-20"
                               value={project.description}
                               onChange={e => updateProject(project.id, 'description', e.target.value)}
                             />
                             <div className="flex items-center gap-2">
                                <LinkIcon size={14} className="text-slate-400"/>
                                <input 
                                  className="text-xs text-blue-600 w-full border-b border-slate-200 focus:outline-none"
                                  value={project.link || ''}
                                  placeholder="Project Link (https://...)"
                                  onChange={e => updateProject(project.id, 'link', e.target.value)}
                                />
                             </div>
                             <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-400">Tags:</span>
                                <input 
                                  className="text-xs w-full border-b border-slate-200 focus:outline-none"
                                  value={project.tags.join(', ')}
                                  onChange={e => updateProject(project.id, 'tags', e.target.value.split(',').map(t => t.trim()))}
                                />
                             </div>
                          </div>
                       ) : (
                          <>
                             <h3 className="font-bold text-lg text-slate-800 mb-2">{project.title}</h3>
                             <p className="text-slate-600 text-sm mb-4 line-clamp-3">{project.description}</p>
                             <div className="flex flex-wrap gap-2">
                                {project.tags.map((tag, i) => (
                                   <span key={i} className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">{tag}</span>
                                ))}
                             </div>
                          </>
                       )}
                    </div>
                 </div>
              ))}
           </div>
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
          <button onClick={addReview} className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 text-sm">
            <Plus size={16} /> <span className="hidden sm:inline">Add Review</span><span className="sm:hidden">Add</span>
          </button>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden">
            {clientReviews.length > 0 ? (
                <div className="divide-y divide-slate-200">
                    {clientReviews.map(review => (
                        <div key={review.id} className="p-4 space-y-4">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                    <label className="text-xs text-slate-500 font-medium uppercase">Reviewer</label>
                                    <input className="text-sm font-semibold w-full mt-1 p-2 border border-slate-200 rounded bg-slate-50 focus:ring-1 focus:ring-emerald-500" value={review.reviewerName} placeholder="Name" onChange={e => updateReview(review.id, 'reviewerName', e.target.value)} />
                                </div>
                                <div className="text-right shrink-0">
                                    <label className="text-xs text-slate-500 font-medium uppercase block mb-1">Status</label>
                                    <select value={review.status} onChange={e => updateReview(review.id, 'status', e.target.value)} className={`text-xs font-medium px-2 py-1.5 rounded-full border-none focus:ring-0 cursor-pointer ${ review.status === 'Live' ? 'bg-emerald-100 text-emerald-700' : review.status === 'Drop' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600' }`}>
                                        <option value="Pending">Pending</option>
                                        <option value="Live">Live</option>
                                        <option value="Drop">Drop</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Content</label>
                                <textarea className="w-full text-sm bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500 resize-y min-h-[60px] mt-1" value={review.content} placeholder="Review content..." onChange={e => updateReview(review.id, 'content', e.target.value)} />
                                {!isClient && ( <button onClick={() => generateAI(review.id, "This Company")} disabled={isGenerating} className="mt-1 text-xs flex items-center text-indigo-600 hover:text-indigo-800"><Wand2 size={12} className="mr-1" /> {isGenerating ? 'Generating...' : 'Auto-Generate'}</button> )}
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Company Link</label>
                                <input className="w-full text-sm bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500 mt-1 text-blue-600" value={review.companyLink} placeholder="Company Map Link" onChange={e => updateReview(review.id, 'companyLink', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Live Link</label>
                                <input className="w-full text-sm bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500 mt-1" value={review.liveLink} placeholder="Paste Live URL" onChange={e => updateReview(review.id, 'liveLink', e.target.value)} />
                            </div>
                            {!isClient && (
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Gmail Used</label>
                                <div className="flex items-center gap-2">
                                    <input className="w-full text-sm bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500 mt-1" value={review.gmailUsed || ''} placeholder="example@gmail.com" onChange={e => updateReview(review.id, 'gmailUsed', e.target.value)} />
                                    <button onClick={() => copyToClipboard(review.gmailUsed || '')} className="text-slate-400 hover:text-emerald-600 p-2"><Copy size={16} /></button>
                                </div>
                            </div>
                            )}
                            {!isClient && (
                                <div className="flex justify-end pt-2"><button onClick={() => deleteReview(review.id)} className="text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 text-xs"><Trash2 size={16} /> Remove</button></div>
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
                {!isClient && <th className="p-3">Gmail Used</th>}
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
                        onChange={e => updateReview(review.id, 'liveLink', e.target.value)}
                      />
                      {review.liveLink && (
                         <a href={review.liveLink} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700">
                            <LinkIcon size={14} />
                         </a>
                      )}
                     </div>
                  </td>

                   {!isClient && (
                   <td className="p-3 align-top">
                     <div className="flex items-center gap-1">
                       <input 
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none text-xs"
                        value={review.gmailUsed || ''}
                        placeholder="example@gmail.com"
                        onChange={e => updateReview(review.id, 'gmailUsed', e.target.value)}
                      />
                      <button onClick={() => copyToClipboard(review.gmailUsed || '')} className="text-slate-400 hover:text-emerald-600">
                        <Copy size={14} />
                      </button>
                     </div>
                  </td>
                  )}

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
          <button onClick={addReview} className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 text-sm">
            <Plus size={16} /> <span className="hidden sm:inline">Add Review</span><span className="sm:hidden">Add</span>
          </button>
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
                                    <input className="text-sm font-semibold w-full mt-1 p-2 border border-slate-200 rounded bg-slate-50 focus:ring-1 focus:ring-emerald-500" value={review.title} placeholder="Review Title" onChange={e => updateReview(review.id, 'title', e.target.value)} />
                                    <input className="text-xs w-full p-1 bg-transparent border-0 focus:ring-0 text-slate-500" value={review.name} placeholder="Reviewer Name" onChange={e => updateReview(review.id, 'name', e.target.value)} />
                                </div>
                                <div className="text-right shrink-0">
                                    <label className="text-xs text-slate-500 font-medium uppercase block mb-1">Status</label>
                                    <select value={review.status} onChange={e => updateReview(review.id, 'status', e.target.value)} className={`text-xs font-medium px-2 py-1.5 rounded-full border-none focus:ring-0 cursor-pointer ${ review.status === 'Live' ? 'bg-emerald-100 text-emerald-700' : review.status === 'Drop' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600' }`}>
                                        <option value="Pending">Pending</option>
                                        <option value="Live">Live</option>
                                        <option value="Drop">Drop</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Content</label>
                                <textarea className="w-full text-sm bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500 resize-y min-h-[60px] mt-1" value={review.content} placeholder="Review content..." onChange={e => updateReview(review.id, 'content', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Invoice #</label>
                                <input className="w-full text-sm bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500 mt-1" value={review.invoiceNumber || ''} placeholder="INV-001" onChange={e => updateReview(review.id, 'invoiceNumber', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Live Link</label>
                                <input className="w-full text-sm bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500 mt-1" value={review.liveLink} placeholder="Paste Live URL" onChange={e => updateReview(review.id, 'liveLink', e.target.value)} />
                            </div>
                            {!isClient && (
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Gmail Used</label>
                                <div className="flex items-center gap-2">
                                    <input className="w-full text-sm bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500 mt-1" value={review.gmailUsed || ''} placeholder="example@gmail.com" onChange={e => updateReview(review.id, 'gmailUsed', e.target.value)} />
                                    <button onClick={() => copyToClipboard(review.gmailUsed || '')} className="text-slate-400 hover:text-emerald-600 p-2"><Copy size={16} /></button>
                                </div>
                            </div>
                            )}
                            {!isClient && (
                                <div className="flex justify-end pt-2"><button onClick={() => deleteReview(review.id)} className="text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 text-xs"><Trash2 size={16} /> Remove</button></div>
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
                {!isClient && <th className="p-3">Gmail Used</th>}
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
                      onChange={e => updateReview(review.id, 'title', e.target.value)}
                    />
                    <input 
                      className="w-full text-xs bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none text-slate-500"
                      value={review.name}
                      placeholder="Reviewer Name"
                      onChange={e => updateReview(review.id, 'name', e.target.value)}
                    />
                  </td>
                  <td className="p-3 align-top">
                    <textarea 
                      className="w-full bg-transparent border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none resize-y min-h-[60px]"
                      value={review.content}
                      placeholder="Review content..."
                      onChange={e => updateReview(review.id, 'content', e.target.value)}
                    />
                  </td>
                  <td className="p-3 align-top">
                     <input 
                      className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none"
                      value={review.invoiceNumber || ''}
                      placeholder="INV-001"
                      onChange={e => updateReview(review.id, 'invoiceNumber', e.target.value)}
                    />
                  </td>
                  <td className="p-3 align-top">
                    <select 
                      value={review.status}
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
                        onChange={e => updateReview(review.id, 'liveLink', e.target.value)}
                      />
                      {review.liveLink && (
                         <a href={review.liveLink} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700">
                            <LinkIcon size={14} />
                         </a>
                      )}
                     </div>
                  </td>
                  
                   {!isClient && (
                   <td className="p-3 align-top">
                     <div className="flex items-center gap-1">
                       <input 
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none text-xs"
                        value={review.gmailUsed || ''}
                        placeholder="example@gmail.com"
                        onChange={e => updateReview(review.id, 'gmailUsed', e.target.value)}
                      />
                       <button onClick={() => copyToClipboard(review.gmailUsed || '')} className="text-slate-400 hover:text-emerald-600">
                        <Copy size={14} />
                      </button>
                     </div>
                  </td>
                  )}

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
    const clientAdvances = advances.filter(a => a.clientId === activeClientId);

    // --- Regular Payment Logic ---
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
    };

    // --- Advance Payment Logic ---
    const addAdvance = (type: AdvanceType) => {
      const newAdv: AdvanceTransaction = {
        id: Date.now().toString(),
        clientId: activeClientId,
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        type,
        note: ''
      };
      const updated = [newAdv, ...advances];
      setAdvances(updated);
      dataService.saveAdvances(updated);
    };

    const updateAdvance = (id: string, field: keyof AdvanceTransaction, value: any) => {
      const updated = advances.map(a => a.id === id ? { ...a, [field]: value } : a);
      setAdvances(updated);
      dataService.saveAdvances(updated);
    };

    const deleteAdvance = (id: string) => {
      const updated = advances.filter(a => a.id !== id);
      setAdvances(updated);
      dataService.saveAdvances(updated);
    };

    const totalReceived = clientAdvances.filter(a => a.type === 'Received').reduce((sum, a) => sum + a.amount, 0);
    const totalRepaid = clientAdvances.filter(a => a.type === 'Repaid').reduce((sum, a) => sum + a.amount, 0);
    const advanceBalance = totalReceived - totalRepaid;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Tabs */}
        <div className="border-b border-slate-200 flex">
           <button 
             onClick={() => setPaymentTab('invoices')}
             className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 text-sm font-medium transition-colors ${paymentTab === 'invoices' ? 'border-b-2 border-emerald-600 text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
           >
             Invoices
           </button>
           <button 
             onClick={() => setPaymentTab('advance')}
             className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 text-sm font-medium transition-colors ${paymentTab === 'advance' ? 'border-b-2 border-emerald-600 text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
           >
             Advance / Loans
           </button>
        </div>

        {paymentTab === 'invoices' ? (
          <>
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-slate-700">Invoice Records</h3>
              {!isClient && (
                <button onClick={addPayment} className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 text-sm">
                  <Plus size={16} /> <span className="hidden sm:inline">Add Invoice</span><span className="sm:hidden">Add</span>
                </button>
              )}
            </div>
             
            {/* Mobile List */}
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
                                        <label className="text-xs text-slate-500 font-medium uppercase block mb-1">Status</label>
                                        <select value={payment.status} disabled={isClient} onChange={e => updatePayment(payment.id, 'status', e.target.value)} className={`text-xs font-medium px-2 py-1 rounded-full border-none focus:ring-0 cursor-pointer ${ payment.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700' }`}>
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
                                    <div className="flex justify-end pt-2"><button onClick={() => deletePayment(payment.id)} className="text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 text-xs"><Trash2 size={16} /> Remove</button></div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : <p className="text-center py-6 text-slate-400">No invoices yet.</p>}
            </div>

            {/* Desktop Table */}
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
          </>
        ) : (
          <>
            {/* Advance Tab Content */}
            <div className="bg-indigo-50 p-4 border-b border-indigo-100 flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-center justify-between">
               <div className="flex flex-wrap items-center gap-4">
                 <div>
                    <p className="text-xs text-indigo-500 uppercase font-semibold">Current Balance</p>
                    <p className={`text-xl font-bold ${advanceBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {advanceBalance > 0 ? `You Owe: $${advanceBalance}` : `Credit: $${Math.abs(advanceBalance)}`}
                    </p>
                 </div>
                 <div className="hidden sm:block h-8 w-px bg-indigo-200"></div>
                 <div className="hidden sm:block text-xs text-indigo-400">
                   Received: ${totalReceived} | Repaid: ${totalRepaid}
                 </div>
               </div>
               
               {!isClient && (
                 <div className="flex gap-2 w-full sm:w-auto">
                   <button onClick={() => addAdvance('Received')} className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 text-sm">
                      <TrendingDown size={16} /> Take
                   </button>
                   <button onClick={() => addAdvance('Repaid')} className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 text-sm">
                      <TrendingUp size={16} /> Repay
                   </button>
                 </div>
               )}
            </div>

            {/* Mobile List for Advances */}
            <div className="lg:hidden">
               {clientAdvances.length > 0 ? (
                 <div className="divide-y divide-slate-200">
                    {clientAdvances.map(adv => (
                       <div key={adv.id} className={`p-4 border-l-4 ${adv.type === 'Received' ? 'border-indigo-500 bg-indigo-50/30' : 'border-emerald-500 bg-emerald-50/30'}`}>
                          <div className="flex justify-between items-start mb-2">
                             <span className={`text-xs font-bold px-2 py-0.5 rounded ${adv.type === 'Received' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {adv.type}
                             </span>
                             <input type="date" className="text-xs bg-transparent border-none p-0 text-right text-slate-500" value={adv.date} readOnly={isClient} onChange={e => updateAdvance(adv.id, 'date', e.target.value)} />
                          </div>
                          <div className="flex items-center mb-2">
                             <span className="text-lg font-bold text-slate-700 mr-1">$</span>
                             <input type="number" className="text-lg font-bold text-slate-700 w-full bg-transparent border-none p-0 focus:ring-0" value={adv.amount} readOnly={isClient} onChange={e => updateAdvance(adv.id, 'amount', Number(e.target.value))} />
                          </div>
                          <input className="w-full text-sm bg-transparent border-b border-slate-200 focus:border-indigo-500 focus:ring-0 px-0" placeholder="Note / Adjustment details" value={adv.note} readOnly={isClient} onChange={e => updateAdvance(adv.id, 'note', e.target.value)} />
                          {!isClient && (
                             <div className="flex justify-end mt-2">
                                <button onClick={() => deleteAdvance(adv.id)} className="text-slate-400 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                             </div>
                          )}
                       </div>
                    ))}
                 </div>
               ) : <p className="text-center py-6 text-slate-400">No advance history.</p>}
            </div>

            {/* Desktop Table for Advances */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Amount ($)</th>
                    <th className="p-3 w-1/2">Note</th>
                    {!isClient && <th className="p-3 w-10"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {clientAdvances.map(adv => (
                     <tr key={adv.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <input type="date" className="bg-transparent focus:outline-none" value={adv.date} readOnly={isClient} onChange={e => updateAdvance(adv.id, 'date', e.target.value)} />
                        </td>
                        <td className="p-3">
                           <select 
                              value={adv.type} 
                              disabled={isClient}
                              onChange={e => updateAdvance(adv.id, 'type', e.target.value)}
                              className={`text-xs font-bold px-2 py-1 rounded border-none focus:ring-0 ${adv.type === 'Received' ? 'text-indigo-700 bg-indigo-100' : 'text-emerald-700 bg-emerald-100'}`}
                           >
                             <option value="Received">Received (Borrow)</option>
                             <option value="Repaid">Repaid / Adjust</option>
                           </select>
                        </td>
                        <td className="p-3">
                           <input type="number" className="bg-transparent focus:outline-none font-medium" value={adv.amount} readOnly={isClient} onChange={e => updateAdvance(adv.id, 'amount', Number(e.target.value))} />
                        </td>
                        <td className="p-3">
                           <input className="w-full bg-transparent focus:outline-none" value={adv.note} placeholder="..." readOnly={isClient} onChange={e => updateAdvance(adv.id, 'note', e.target.value)} />
                        </td>
                        {!isClient && (
                          <td className="p-3 text-right">
                            <button onClick={() => deleteAdvance(adv.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                          </td>
                        )}
                     </tr>
                   ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    );
  };

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
              <Plus size={16} /> <span className="hidden sm:inline">Add Gmail</span><span className="sm:hidden">Add</span>
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
                                    <input className="w-full text-sm font-semibold bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500 mt-1" value={gmail.email} placeholder="Email" readOnly={isClient} onChange={e => updateGmail(gmail.id, 'email', e.target.value)} />
                                    <button onClick={() => copyToClipboard(gmail.email)} className="text-slate-400 hover:text-emerald-600 p-2"><Copy size={16} /></button>
                                </div>
                            </div>
                            
                            {!isClient && (
                              <>
                                <div>
                                    <label className="text-xs text-slate-500 font-medium uppercase">Password</label>
                                    <div className="flex items-center gap-2">
                                        <input className="w-full text-sm bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500 mt-1 font-mono" value={gmail.newPassword || gmail.oldPassword} placeholder="Password" onChange={e => updateGmail(gmail.id, 'newPassword', e.target.value)} />
                                        <button onClick={() => copyToClipboard(gmail.newPassword || gmail.oldPassword || '')} className="text-slate-400 hover:text-emerald-600 p-2"><Copy size={16} /></button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 font-medium uppercase">Recovery / 2FA</label>
                                    <input className="w-full text-sm bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500 mt-1" value={gmail.new2FA || gmail.old2FA} placeholder="Recovery Email or 2FA" onChange={e => updateGmail(gmail.id, 'new2FA', e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 font-medium uppercase">Backup Code</label>
                                    <input className="w-full text-sm bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500 mt-1 font-mono" value={gmail.backupCode} placeholder="Backup Code" onChange={e => updateGmail(gmail.id, 'backupCode', e.target.value)} />
                                </div>
                                <div className="flex justify-end pt-2"><button onClick={() => deleteGmail(gmail.id)} className="text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 text-xs"><Trash2 size={16} /> Remove</button></div>
                              </>
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
                {!isClient && <th className="p-3">Password</th>}
                {!isClient && <th className="p-3">Recovery / 2FA</th>}
                {!isClient && <th className="p-3">Backup Code</th>}
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
                  {!isClient && (
                    <>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <input 
                            className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none font-mono text-xs"
                            value={gmail.newPassword || gmail.oldPassword}
                            placeholder="Password"
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
                          onChange={e => updateGmail(gmail.id, 'new2FA', e.target.value)}
                        />
                      </td>
                      <td className="p-3">
                        <input 
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none font-mono text-xs"
                          value={gmail.backupCode}
                          placeholder="Backup Code"
                          onChange={e => updateGmail(gmail.id, 'backupCode', e.target.value)}
                        />
                      </td>
                      <td className="p-3 text-right">
                        <button 
                          onClick={() => deleteGmail(gmail.id)}
                          className="text-slate-300 hover:text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </>
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

    const deleteAddress = (id: string) => {
      const updated = addresses.filter(a => a.id !== id);
      setAddresses(updated);
      dataService.saveAddresses(updated);
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-semibold text-slate-700">Address Book</h3>
          {!isClient && (
            <button onClick={addAddress} className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 text-sm">
              <Plus size={16} /> <span className="hidden sm:inline">Add Address</span><span className="sm:hidden">Add</span>
            </button>
          )}
        </div>
        {/* List View */}
        <div className="divide-y divide-slate-200">
            {clientAddresses.length > 0 ? clientAddresses.map(addr => (
                <div key={addr.id} className="p-4 flex flex-col md:flex-row gap-4 items-start">
                    <div className="flex-1 w-full space-y-3">
                        <div className="flex items-start gap-2">
                            <MapPin className="text-slate-400 mt-1 shrink-0" size={16} />
                            <textarea 
                                className="w-full text-sm border border-transparent hover:border-slate-300 rounded p-1 focus:border-emerald-500 focus:outline-none resize-none" 
                                value={addr.fullAddress} 
                                placeholder="Full Address" 
                                rows={2}
                                readOnly={isClient}
                                onChange={e => updateAddress(addr.id, 'fullAddress', e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-0 md:pl-6">
                             <div>
                                <label className="text-xs text-slate-500 uppercase font-bold">Phone</label>
                                <input 
                                    className="w-full text-sm border-b border-slate-200 focus:border-emerald-500 focus:outline-none py-1" 
                                    value={addr.phone} 
                                    placeholder="Phone Number" 
                                    readOnly={isClient}
                                    onChange={e => updateAddress(addr.id, 'phone', e.target.value)} 
                                />
                             </div>
                             <div>
                                <label className="text-xs text-slate-500 uppercase font-bold">Invoice # Ref</label>
                                <input 
                                    className="w-full text-sm border-b border-slate-200 focus:border-emerald-500 focus:outline-none py-1" 
                                    value={addr.invoiceNumber} 
                                    placeholder="Associated Invoice" 
                                    readOnly={isClient}
                                    onChange={e => updateAddress(addr.id, 'invoiceNumber', e.target.value)} 
                                />
                             </div>
                        </div>
                    </div>
                    {!isClient && (
                        <button onClick={() => deleteAddress(addr.id)} className="self-end md:self-center text-slate-400 hover:text-red-500 p-2">
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            )) : <p className="text-center py-8 text-slate-400 text-sm">No addresses found.</p>}
        </div>
      </div>
    );
  };

  const renderTasks = () => {
    const clientTasks = tasks.filter(t => t.clientId === activeClientId);

    const addTask = () => {
        const newTask: Task = {
            id: Date.now().toString(),
            clientId: activeClientId,
            description: 'New Task',
            dueDate: new Date().toISOString().split('T')[0],
            status: 'Pending',
            priority: 'Medium',
            dependencies: []
        };
        const updated = [newTask, ...tasks];
        setTasks(updated);
        dataService.saveTasks(updated);
    };

    const updateTask = (id: string, field: keyof Task, value: any) => {
        const updated = tasks.map(t => t.id === id ? { ...t, [field]: value } : t);
        setTasks(updated);
        dataService.saveTasks(updated);
    };

    const addDependency = (taskId: string, dependencyId: string) => {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      
      const currentDeps = task.dependencies || [];
      if (!currentDeps.includes(dependencyId)) {
        updateTask(taskId, 'dependencies', [...currentDeps, dependencyId]);
      }
    };

    const removeDependency = (taskId: string, dependencyId: string) => {
       const task = tasks.find(t => t.id === taskId);
       if (!task || !task.dependencies) return;
       updateTask(taskId, 'dependencies', task.dependencies.filter(id => id !== dependencyId));
    };

    const deleteTask = (id: string) => {
        const updated = tasks.filter(t => t.id !== id);
        setTasks(updated);
        dataService.saveTasks(updated);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h3 className="font-semibold text-slate-700">Task List</h3>
                <button onClick={addTask} className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 text-sm">
                    <Plus size={16} /> 
                    <span className="hidden sm:inline">{isClient ? "Request Work" : "Add Task"}</span>
                    <span className="sm:hidden">Add</span>
                </button>
            </div>
            <div className="divide-y divide-slate-100">
                {clientTasks.length > 0 ? clientTasks.map(task => {
                    // Dependencies logic
                    const deps = task.dependencies || [];
                    const blockingTasks = tasks.filter(t => deps.includes(t.id) && t.status !== 'Completed');
                    const isBlocked = blockingTasks.length > 0;

                    // Status Styling
                    let statusBorderClass = 'border-l-amber-400'; // Default Pending
                    if (task.status === 'In Progress') statusBorderClass = 'border-l-blue-500';
                    else if (task.status === 'Completed') statusBorderClass = 'border-l-emerald-500';
                    else if (task.status === 'On Hold') statusBorderClass = 'border-l-slate-400';
                    
                    // Due Date Calculation
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const dueDateObj = new Date(task.dueDate);
                    dueDateObj.setHours(0,0,0,0);
                    
                    const diffTime = dueDateObj.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    let dateStatus = null;
                    if (task.status !== 'Completed') {
                        if (diffDays < 0) {
                            dateStatus = <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100"><AlertCircle size={12}/> Overdue</span>;
                        } else if (diffDays === 0) {
                             dateStatus = <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100"><Clock size={12}/> Due Today</span>;
                        } else if (diffDays <= 2) {
                             dateStatus = <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Due Soon</span>;
                        }
                    }
                    
                    return (
                      <div key={task.id} className={`p-4 hover:bg-slate-50 transition-colors border-l-4 ${statusBorderClass} ${task.status === 'Completed' ? 'bg-slate-50/50' : ''} ${isBlocked ? 'bg-amber-50/30' : ''}`}>
                          <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                  <div className="flex flex-col md:flex-row gap-3 md:items-start justify-between mb-2">
                                      <div className="w-full">
                                        <div className="flex items-center gap-2">
                                            <textarea 
                                                className={`font-medium text-slate-800 bg-transparent border-none focus:ring-0 p-0 w-full resize-none ${task.status === 'Completed' ? 'line-through text-slate-400' : ''}`}
                                                value={task.description}
                                                rows={1}
                                                onChange={e => updateTask(task.id, 'description', e.target.value)}
                                            />
                                            {dateStatus}
                                        </div>
                                        {isBlocked && (
                                          <div className="flex items-start gap-1 text-amber-600 text-xs mt-1">
                                            <AlertTriangle size={12} className="mt-0.5 shrink-0"/>
                                            <span>Waiting for: {blockingTasks.map(t => t.description).join(', ')}</span>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto shrink-0">
                                          <select 
                                              value={task.status}
                                              onChange={e => updateTask(task.id, 'status', e.target.value)}
                                              className={`text-xs font-semibold px-2 py-1 rounded-full border-none focus:ring-0 cursor-pointer ${
                                                  task.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 
                                                  task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                                  task.status === 'On Hold' ? 'bg-slate-200 text-slate-600' :
                                                  'bg-amber-100 text-amber-700'
                                              }`}
                                          >
                                              <option value="Pending">Pending</option>
                                              <option value="In Progress">In Progress</option>
                                              <option value="Completed">Completed</option>
                                              <option value="On Hold">On Hold</option>
                                          </select>
                                          {!isClient && (
                                              <button onClick={() => deleteTask(task.id)} className="text-slate-300 hover:text-red-500 p-1">
                                                  <Trash2 size={16} />
                                              </button>
                                          )}
                                      </div>
                                  </div>
                                  
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 mt-2">
                                      <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                                          <Clock size={12} />
                                          <span>Due:</span>
                                          <input 
                                              type="date" 
                                              className="bg-transparent border-none p-0 text-xs text-slate-500 focus:ring-0 w-24"
                                              value={task.dueDate}
                                              onChange={e => updateTask(task.id, 'dueDate', e.target.value)}
                                          />
                                      </div>
                                      <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                                          <span>Priority:</span>
                                          <select 
                                              value={task.priority}
                                              onChange={e => updateTask(task.id, 'priority', e.target.value)}
                                              className="bg-transparent border-none p-0 text-xs font-medium focus:ring-0 text-slate-600 cursor-pointer"
                                          >
                                              <option value="Low">Low</option>
                                              <option value="Medium">Medium</option>
                                              <option value="High">High</option>
                                          </select>
                                      </div>
                                      
                                      {/* Dependency Management */}
                                      <div className="flex items-center gap-1 border-l border-slate-200 pl-2 ml-1">
                                        <Link2 size={12} className="text-slate-400"/>
                                        <span className="hidden sm:inline mr-1">Depends on:</span>
                                        <div className="flex flex-wrap gap-1 relative">
                                          {deps.length > 0 && deps.map(depId => {
                                            const depTask = tasks.find(t => t.id === depId);
                                            if (!depTask) return null;
                                            return (
                                              <span key={depId} className="bg-white px-1.5 py-0.5 rounded flex items-center gap-1 border border-slate-200 shadow-sm">
                                                 <span className="truncate max-w-[80px]">{depTask.description}</span>
                                                 {!isClient && <button onClick={() => removeDependency(task.id, depId)} className="hover:text-red-500"><X size={10}/></button>}
                                              </span>
                                            )
                                          })}
                                          {!isClient && (
                                            <div className="relative inline-block w-4 h-4">
                                                <Plus size={14} className="cursor-pointer text-indigo-600 absolute inset-0"/>
                                                <select 
                                                  className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                                                  onChange={(e) => {
                                                    if(e.target.value) {
                                                      addDependency(task.id, e.target.value);
                                                      e.target.value = '';
                                                    }
                                                  }}
                                                >
                                                  <option value="">Add dependency...</option>
                                                  {clientTasks.filter(t => t.id !== task.id && !deps.includes(t.id)).map(t => (
                                                    <option key={t.id} value={t.id}>{t.description}</option>
                                                  ))}
                                                </select>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                    );
                }) : <p className="p-8 text-center text-slate-400 text-sm">No tasks assigned.</p>}
            </div>
        </div>
    );
  };

  const renderExpenses = () => {
    if (isClient) return null;

    const addExpense = () => {
        const newExp: Expense = {
            id: Date.now().toString(),
            description: 'New Expense',
            amount: 0,
            date: new Date().toISOString().split('T')[0],
            category: 'Software'
        };
        const updated = [newExp, ...expenses];
        setExpenses(updated);
        dataService.saveExpenses(updated);
    };

    const updateExpense = (id: string, field: keyof Expense, value: any) => {
        const updated = expenses.map(e => e.id === id ? { ...e, [field]: value } : e);
        setExpenses(updated);
        dataService.saveExpenses(updated);
    };

    const deleteExpense = (id: string) => {
        const updated = expenses.filter(e => e.id !== id);
        setExpenses(updated);
        dataService.saveExpenses(updated);
    };

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase">Total Expenses</p>
                    <h3 className="text-2xl font-bold text-slate-800 mt-1">${totalExpenses.toLocaleString()}</h3>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 className="font-semibold text-slate-700">Expense Tracker</h3>
                    <button onClick={addExpense} className="flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 text-sm">
                        <Plus size={16} /> <span className="hidden sm:inline">Add Expense</span><span className="sm:hidden">Add</span>
                    </button>
                </div>

                {/* Mobile List View */}
                <div className="lg:hidden divide-y divide-slate-200">
                    {expenses.length > 0 ? expenses.map(exp => (
                        <div key={exp.id} className="p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <input 
                                    type="date" 
                                    className="bg-transparent text-sm font-medium text-slate-500 focus:outline-none"
                                    value={exp.date}
                                    onChange={e => updateExpense(exp.id, 'date', e.target.value)}
                                />
                                <div className="flex items-center text-red-600 font-bold">
                                    <span>$</span>
                                    <input 
                                        type="number" 
                                        className="bg-transparent w-20 text-right focus:outline-none"
                                        value={exp.amount}
                                        onChange={e => updateExpense(exp.id, 'amount', Number(e.target.value))}
                                    />
                                </div>
                            </div>
                            <input 
                                className="w-full bg-transparent font-medium text-slate-800 focus:outline-none border-b border-transparent focus:border-slate-300 pb-1"
                                value={exp.description}
                                placeholder="Description"
                                onChange={e => updateExpense(exp.id, 'description', e.target.value)}
                            />
                            <div className="flex justify-between items-center">
                                <select 
                                    value={exp.category}
                                    onChange={e => updateExpense(exp.id, 'category', e.target.value)}
                                    className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-1 rounded border-none focus:ring-0"
                                >
                                    <option value="Software">Software</option>
                                    <option value="Service">Service</option>
                                    <option value="Hosting">Hosting</option>
                                    <option value="Other">Other</option>
                                </select>
                                <button onClick={() => deleteExpense(exp.id)} className="text-slate-300 hover:text-red-500 p-1">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    )) : <p className="p-6 text-center text-slate-400 text-sm">No expenses recorded.</p>}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="p-3">Date</th>
                                <th className="p-3">Description</th>
                                <th className="p-3">Category</th>
                                <th className="p-3">Amount ($)</th>
                                <th className="p-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {expenses.length > 0 ? expenses.map(exp => (
                                <tr key={exp.id} className="hover:bg-slate-50">
                                    <td className="p-3">
                                        <input 
                                            type="date" 
                                            className="bg-transparent focus:outline-none"
                                            value={exp.date}
                                            onChange={e => updateExpense(exp.id, 'date', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-3">
                                        <input 
                                            className="w-full bg-transparent focus:outline-none"
                                            value={exp.description}
                                            placeholder="Description"
                                            onChange={e => updateExpense(exp.id, 'description', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-3">
                                        <select 
                                            value={exp.category}
                                            onChange={e => updateExpense(exp.id, 'category', e.target.value)}
                                            className="bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
                                        >
                                            <option value="Software">Software</option>
                                            <option value="Service">Service</option>
                                            <option value="Hosting">Hosting</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </td>
                                    <td className="p-3">
                                        <input 
                                            type="number" 
                                            className="bg-transparent focus:outline-none font-medium"
                                            value={exp.amount}
                                            onChange={e => updateExpense(exp.id, 'amount', Number(e.target.value))}
                                        />
                                    </td>
                                    <td className="p-3 text-right">
                                        <button onClick={() => deleteExpense(exp.id)} className="text-slate-300 hover:text-red-500">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            )) : <tr><td colSpan={5} className="p-8 text-center text-slate-400">No expenses recorded.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
  };

  const renderFeedback = () => {
    if (isClient) {
      return (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-50 rounded-full text-emerald-600 mb-4">
              <Briefcase size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">How is our collaboration?</h2>
            <p className="text-slate-500 mb-8">Your feedback helps me improve our workflow and results.</p>
            
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setFeedbackRating(star)}
                  className={`p-2 rounded-full transition-all ${feedbackRating >= star ? 'text-yellow-400 scale-110' : 'text-slate-200 hover:text-yellow-200'}`}
                >
                  <Star size={32} fill={feedbackRating >= star ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
            
            <textarea 
              className="w-full border border-slate-200 rounded-xl p-4 mb-4 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
              rows={4}
              placeholder="Share your thoughts..."
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
            />
            
            <button 
              onClick={handleSubmitFeedback}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
            >
              Submit Feedback
            </button>
          </div>
        </div>
      );
    }

    // Admin View of Feedback
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">Average Rating</h3>
             <div className="flex items-end gap-2">
               <span className="text-4xl font-bold text-slate-800">
                 {feedback.length > 0 ? (feedback.reduce((acc, curr) => acc + curr.rating, 0) / feedback.length).toFixed(1) : 'N/A'}
               </span>
               <div className="flex pb-1 text-yellow-400">
                 <Star fill="currentColor" size={20} />
               </div>
             </div>
             <p className="text-xs text-slate-400 mt-1">Based on {feedback.length} reviews</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
           <div className="p-4 border-b border-slate-200 bg-slate-50">
             <h3 className="font-semibold text-slate-700">Client Feedback</h3>
           </div>
           <div className="divide-y divide-slate-100">
             {feedback.length > 0 ? feedback.map(fb => {
               const clientName = clients.find(c => c.id === fb.clientId)?.name || 'Unknown Client';
               return (
                 <div key={fb.id} className="p-6 hover:bg-slate-50">
                   <div className="flex justify-between items-start mb-2">
                     <div>
                       <h4 className="font-semibold text-slate-800">{clientName}</h4>
                       <p className="text-xs text-slate-400">{fb.date}</p>
                     </div>
                     <div className="flex text-yellow-400">
                       {[...Array(5)].map((_, i) => (
                         <Star key={i} size={14} fill={i < fb.rating ? "currentColor" : "none"} className={i < fb.rating ? "" : "text-slate-200"} />
                       ))}
                     </div>
                   </div>
                   <p className="text-slate-600 italic">"{fb.comment}"</p>
                 </div>
               )
             }) : <p className="text-center py-12 text-slate-400">No feedback received yet.</p>}
           </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    if (isClient) return null;

    return (
      <div className="max-w-2xl mx-auto">
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
               <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                  <Settings size={18} /> App Settings
               </h3>
            </div>
            <div className="p-6 space-y-6">
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Site Name / Branding</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                     <input 
                       type="text" 
                       className="flex-1 border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                       value={settings.siteName}
                       onChange={(e) => {
                          const newSettings = { ...settings, siteName: e.target.value };
                          setSettings(newSettings);
                          dataService.saveSettings(newSettings);
                       }}
                     />
                     <button className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg font-medium text-sm hover:bg-slate-200">
                        Save Automatically
                     </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">This name will appear on the login screen and dashboard header.</p>
               </div>

               <div className="pt-6 border-t border-slate-100">
                  <h4 className="text-sm font-medium text-red-600 mb-2">Danger Zone</h4>
                  <button 
                    onClick={() => {
                      if(confirm("Are you sure you want to clear ALL data? This cannot be undone.")) {
                        localStorage.clear();
                        window.location.reload();
                      }
                    }}
                    className="w-full sm:w-auto border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm hover:bg-red-50"
                  >
                     Reset Application Data
                  </button>
               </div>
            </div>
         </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        isClientView={isClient}
        siteName={settings.siteName}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => setIsMobileOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-700 p-1">
              <Menu size={24} />
            </button>
            {!isClient && currentView !== 'settings' && (
               <ClientSelector 
                 clients={clients}
                 activeClientId={activeClientId}
                 setActiveClientId={setActiveClientId}
                 onAddClient={handleAddClient}
               />
            )}
            {isClient && (
               <div className="flex items-center gap-2 text-slate-600 font-medium">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 shrink-0">
                     {user.name?.[0] || 'C'}
                  </div>
                  <span className="hidden sm:inline text-sm md:text-base truncate max-w-[150px]">Hello, {user.name}</span>
               </div>
            )}
          </div>
          <div className="flex items-center gap-2">
             {!isClient && (
               <button 
                 onClick={() => setCurrentView('settings')}
                 className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
                 title="Settings"
               >
                 <Settings size={20} />
               </button>
             )}
             <button 
               onClick={handleLogout}
               className="flex items-center gap-2 text-slate-500 hover:text-red-600 px-2 md:px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
             >
               <LogOut size={18} />
               <span className="hidden sm:inline">Sign Out</span>
             </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-100">
          {currentView === 'dashboard' && renderDashboard()}
          {currentView === 'portfolio' && renderPortfolio()}
          {currentView === 'google' && renderGoogleReviews()}
          {currentView === 'trustpilot' && renderTrustpilotReviews()}
          {currentView === 'payments' && renderPayments()}
          {currentView === 'gmail' && renderGmails()}
          {currentView === 'address' && renderAddresses()}
          {currentView === 'tasks' && renderTasks()}
          {currentView === 'expenses' && renderExpenses()}
          {currentView === 'feedback' && renderFeedback()}
          {currentView === 'settings' && renderSettings()}
        </main>
      </div>
    </div>
  );
};

export default App;