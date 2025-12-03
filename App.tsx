import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { ClientSelector } from './components/ClientSelector';
import { LoginScreen } from './components/LoginScreen';
import { ViewState, Client, GoogleReview, TrustpilotReview, Payment, GmailAccount, Address, Task, Expense, ClientFeedback, AdvanceTransaction, AdvanceType, TaskStatus, TaskPriority, PortfolioProfile, Project, AppSettings, Notification, ClientAnalysis } from './types';
import { dataService } from './services/dataService';
import { Menu, Plus, Trash2, Copy, Wand2, LogOut, UserCheck, Eye, EyeOff, Link as LinkIcon, Send, Lock, Mail, Star, CreditCard, Users, ShieldCheck, MapPin, CheckSquare, DollarSign, TrendingDown, TrendingUp, AlertCircle, Clock, ArrowRight, Briefcase, Edit3, Save, Globe, ExternalLink, X, Settings, AlertTriangle, Link2, UploadCloud, Bot, Bell, MessageSquareHeart, BrainCircuit, Sparkles, PieChart } from 'lucide-react';
import { generateReviewContent, generateEmailTemplate, analyzeClientSentiment, generateSmartProjectPlan } from './services/geminiService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// --- Constants ---
const ADMIN_PIN = "124442";
const AUTH_KEY = 'ftm_auth_session';

// --- Types for Local State ---
type UserRole = 'admin' | 'client';
interface AuthUser {
  role: UserRole;
  id?: string;
  name?: string;
}

export type LoginCredentials =
  | { type: 'admin'; pin: string }
  | { type: 'client'; clientId: string; pin: string };


// Utility to copy text
const copyToClipboard = (text: string) => {
  if (!text) return;
  navigator.clipboard.writeText(text);
  // In a real app, show a toast here
};

const App: React.FC = () => {
  // --- Synchronous Initialization (Fixes Data Loading Race Conditions) ---
  
  // 1. Load Clients First
  const [clients, setClients] = useState<Client[]>(() => dataService.getClients());

  // 2. Load User Session
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem(AUTH_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  // 3. Determine Initial Active Client ID
  const [activeClientId, setActiveClientId] = useState<string>(() => {
    // If logged in as client, MUST use their ID
    if (user?.role === 'client' && user.id) {
        return user.id;
    }
    // If admin, try to restore or use first client
    // (We could store admin's last selection, but defaulting to first is safe)
    return clients.length > 0 ? clients[0].id : '';
  });

  // --- Other Data State ---
  // Initialized lazily to avoid heavy parsing on every render if not needed, 
  // though for this size app it's negligible.
  const [googleReviews, setGoogleReviews] = useState<GoogleReview[]>(() => dataService.getGoogleReviews());
  const [trustpilotReviews, setTrustpilotReviews] = useState<TrustpilotReview[]>(() => dataService.getTrustpilotReviews());
  const [payments, setPayments] = useState<Payment[]>(() => dataService.getPayments());
  const [advances, setAdvances] = useState<AdvanceTransaction[]>(() => dataService.getAdvances());
  const [gmails, setGmails] = useState<GmailAccount[]>(() => dataService.getGmails());
  const [addresses, setAddresses] = useState<Address[]>(() => dataService.getAddresses());
  const [tasks, setTasks] = useState<Task[]>(() => dataService.getTasks());
  const [expenses, setExpenses] = useState<Expense[]>(() => dataService.getExpenses());
  const [feedback, setFeedback] = useState<ClientFeedback[]>(() => dataService.getFeedback());
  const [notifications, setNotifications] = useState<Notification[]>(() => dataService.getNotifications());
  const [portfolio, setPortfolio] = useState<PortfolioProfile | null>(() => dataService.getPortfolio());
  const [settings, setSettings] = useState<AppSettings>(() => dataService.getSettings());
  const [adminLastRead, setAdminLastRead] = useState<string>(() => dataService.getAdminLastRead());

  // --- UI State ---
  const [authError, setAuthError] = useState('');
  const [inviteClientId, setInviteClientId] = useState<string | null>(null);
  const [setupPin, setSetupPin] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [paymentTab, setPaymentTab] = useState<'invoices' | 'advance'>('invoices');
  const [loading, setLoading] = useState(false); // No longer strictly needed for data, but kept for Invite checks
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // --- AI Comms State
  const [aiEmailType, setAiEmailType] = useState('Invoice Reminder');
  const [aiEmailContext, setAiEmailContext] = useState('');
  const [aiGeneratedEmail, setAiGeneratedEmail] = useState<{subject: string, body: string} | null>(null);

  // --- AI Insights State ---
  const [analysisClientId, setAnalysisClientId] = useState<string>('');
  const [clientAnalysis, setClientAnalysis] = useState<ClientAnalysis | null>(null);
  const [smartPlanGoal, setSmartPlanGoal] = useState('');

  // --- Custom Notification State ---
  const [customNotificationClientId, setCustomNotificationClientId] = useState<string>('');
  const [customNotificationMessage, setCustomNotificationMessage] = useState<string>('');

  // --- Portfolio Edit State ---
  const [isEditingPortfolio, setIsEditingPortfolio] = useState(false);

  // --- Feedback Form State ---
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  
  // --- Derived Constants ---
  const isClient = user?.role === 'client';
  
  // CRITICAL: Always use the logged-in user's ID if they are a client.
  // This overrides any potential state desync in activeClientId.
  const effectiveClientId = isClient && user?.id ? user.id : activeClientId;

  // --- Initialization Effects ---
  useEffect(() => {
    // Check URL for Invite
    const params = new URLSearchParams(window.location.search);
    const inviteId = params.get('invite');
    if (inviteId) {
      const client = clients.find(c => c.id === inviteId);
      if (client) {
        setInviteClientId(inviteId);
      }
    }
  }, [clients]);

  // Ensure activeClientId is valid if clients change (Admin only)
  useEffect(() => {
    if (isClient) return; // Client ID is fixed to their user ID
    
    if (clients.length > 0 && !clients.find(c => c.id === activeClientId)) {
      setActiveClientId(clients[0].id);
    } else if (clients.length === 0) {
      setActiveClientId('');
    }
  }, [clients, activeClientId, isClient]);

  // Set default client for custom notification sender and AI Analysis
  useEffect(() => {
    if (clients.length > 0) {
       if (!clients.find(c => c.id === customNotificationClientId)) setCustomNotificationClientId(clients[0].id);
       if (!clients.find(c => c.id === analysisClientId)) setAnalysisClientId(clients[0].id);
    }
  }, [clients, customNotificationClientId, analysisClientId]);


  // Update admin's last read timestamp when they view the feed
  useEffect(() => {
    if (currentView === 'activity_feed' && user?.role === 'admin') {
      const now = new Date().toISOString();
      setAdminLastRead(now);
      dataService.saveAdminLastRead(now);
    }
  }, [currentView, user]);

  // --- Derived State for Notifications ---
  const unreadCount = useMemo(() => {
    if (user?.role !== 'client') return 0;
    return notifications.filter(n => n.clientId === user.id && !n.isRead).length;
  }, [notifications, user]);

  const adminUnreadCount = useMemo(() => {
    if (user?.role !== 'admin' || !adminLastRead) return 0;
    const lastReadDate = new Date(adminLastRead).getTime();
    return notifications.filter(n => new Date(n.timestamp).getTime() > lastReadDate).length;
  }, [notifications, adminLastRead, user]);

  // --- Auth Handlers ---

  const handleLogin = (credentials: LoginCredentials) => {
    setAuthError('');

    // Admin Check
    if (credentials.type === 'admin') {
      if (credentials.pin === ADMIN_PIN) {
        const adminUser: AuthUser = { role: 'admin', name: 'Admin' };
        setUser(adminUser);
        localStorage.setItem(AUTH_KEY, JSON.stringify(adminUser));
        if (clients.length > 0) setActiveClientId(clients[0].id);
        return;
      }
    }
    
    // Client Check
    if (credentials.type === 'client') {
      const { clientId, pin } = credentials;
      const client = clients.find(c => 
        c.id === clientId && c.pin === pin
      );

      if (client) {
        if (!client.isInviteAccepted) {
          setAuthError('Account not activated. Please use the invitation link.');
          return;
        }
        const clientUser: AuthUser = { role: 'client', id: client.id, name: client.name };
        setUser(clientUser);
        localStorage.setItem(AUTH_KEY, JSON.stringify(clientUser));
        setActiveClientId(client.id);
        setCurrentView('dashboard');
        return;
      }
    }

    setAuthError('Invalid credentials.');
  };

  const handleSetupPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (setupPin !== setupConfirm) {
      setAuthError("PINs do not match");
      return;
    }
    if (setupPin.length !== 6) {
      setAuthError("PIN must be exactly 6 digits");
      return;
    }

    const updatedClients = clients.map(c => {
      if (c.id === inviteClientId) {
        return { ...c, pin: setupPin, isInviteAccepted: true };
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
      
      // Create notification for admin
      const newNotification: Notification = {
        id: Date.now().toString(),
        clientId: client.id,
        message: `${client.name} has accepted their invitation and set up their account.`,
        timestamp: new Date().toISOString(),
        isRead: false, // This is for client view, doesn't affect admin
      };
      setNotifications(currentNotifications => {
        const updated = [newNotification, ...currentNotifications];
        dataService.saveNotifications(updated);
        return updated;
      });

      // Clear URL param
      window.history.replaceState({}, '', window.location.pathname);
      setInviteClientId(null);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_KEY);
    setCurrentView('dashboard');
    // Don't need to reset data state, just user context
  };

  const generateInviteLink = (client: Client) => {
    if (!client) return;
    const link = new URL(window.location.href);
    link.searchParams.set('invite', client.id);
    const linkString = link.toString();
    copyToClipboard(linkString);
    alert(`Invite link copied for ${client.name}!\n\nSend this link to the client:\n${linkString}`);
  };

  const handleSubmitFeedback = () => {
    if (!feedbackComment.trim()) return;
    const newFeedback: ClientFeedback = {
      id: Date.now().toString(),
      clientId: effectiveClientId,
      rating: feedbackRating,
      comment: feedbackComment,
      date: new Date().toISOString().split('T')[0]
    };
    const updated = [newFeedback, ...feedback];
    setFeedback(updated);
    dataService.saveFeedback(updated);
    
    // Add notification for admin
    const clientName = clients.find(c => c.id === effectiveClientId)?.name || 'A client';
    const newNotification: Notification = {
      id: (Date.now() + 1).toString(), // Ensure unique id
      clientId: effectiveClientId,
      message: `${clientName} submitted new feedback with a ${feedbackRating}-star rating.`,
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    setNotifications(currentNotifications => {
      const updated = [newNotification, ...currentNotifications];
      dataService.saveNotifications(updated);
      return updated;
    });

    setFeedbackComment('');
    setFeedbackRating(5);
    alert("Thank you for your feedback!");
  };
  
  const handleGenerateEmail = async () => {
      setIsGenerating(true);
      setAiGeneratedEmail(null);
      const result = await generateEmailTemplate(aiEmailType, aiEmailContext);
      setAiGeneratedEmail(result);
      setIsGenerating(false);
  }

  const handleSendCustomNotification = () => {
    if (!customNotificationClientId || !customNotificationMessage.trim()) {
      alert("Please select a client and enter a message.");
      return;
    }

    const newNotification: Notification = {
      id: Date.now().toString(),
      clientId: customNotificationClientId,
      message: customNotificationMessage.trim(),
      timestamp: new Date().toISOString(),
      isRead: false,
    };

    const updatedNotifications = [newNotification, ...notifications];
    setNotifications(updatedNotifications);
    dataService.saveNotifications(updatedNotifications);

    setCustomNotificationMessage('');
    alert("Notification sent successfully!");
  };
  
  const handleAnalyzeClient = async () => {
    if(!analysisClientId) return;
    setIsGenerating(true);
    const client = clients.find(c => c.id === analysisClientId);
    
    // Gather Data
    const cReviews = [
        ...googleReviews.filter(r => r.clientId === analysisClientId).map(r => r.content),
        ...trustpilotReviews.filter(r => r.clientId === analysisClientId).map(r => r.content)
    ];
    const cFeedback = feedback.filter(f => f.clientId === analysisClientId).map(f => f.comment);
    
    const result = await analyzeClientSentiment(client?.name || "Client", cReviews, cFeedback);
    setClientAnalysis(result);
    setIsGenerating(false);
  };

  const handleGenerateSmartPlan = async () => {
    if (!smartPlanGoal.trim()) return;
    setIsGenerating(true);
    const plan = await generateSmartProjectPlan(smartPlanGoal);
    
    // Convert to Tasks
    const newTasks = plan.tasks.map(t => {
        const date = new Date();
        date.setDate(date.getDate() + t.daysFromNow);
        return {
            id: (Date.now() + Math.random()).toString(),
            clientId: analysisClientId,
            description: t.description,
            priority: t.priority as TaskPriority,
            status: 'Pending' as TaskStatus,
            dueDate: date.toISOString().split('T')[0]
        };
    });
    
    const updated = [...tasks, ...newTasks];
    setTasks(updated);
    dataService.saveTasks(updated);
    
    setIsGenerating(false);
    setSmartPlanGoal('');
    alert(`Generated ${newTasks.length} tasks for the project!`);
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
    const updated = clients.map(c => c.id === effectiveClientId ? { ...c, email } : c);
    setClients(updated);
    dataService.saveClients(updated);
  };

  // --- Portfolio Handlers ---
  const handleImageUpload = async (file: File, callback: (base64: string) => void) => {
      if (file && file.type.startsWith('image/')) {
          try {
              const reader = new FileReader();
              reader.onloadend = () => {
                  callback(reader.result as string);
              };
              reader.readAsDataURL(file);
          } catch (error) {
              console.error("Error converting image to base64", error);
              alert("Failed to upload image.");
          }
      } else {
          alert("Please select a valid image file.");
      }
  };
  
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
      imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?fit=crop&w=500&h=300'
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
          <p className="text-slate-500 mb-6">Please set a secure 6-digit PIN to access your dashboard.</p>
          
          <form onSubmit={handleSetupPin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Create 6-Digit PIN</label>
              <input 
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                required 
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-center text-lg tracking-[8px] font-mono"
                value={setupPin}
                onChange={e => setSetupPin(e.target.value)}
                placeholder="••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm PIN</label>
              <input 
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                required 
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-center text-lg tracking-[8px] font-mono"
                value={setupConfirm}
                onChange={e => setSetupConfirm(e.target.value)}
                placeholder="••••••"
              />
            </div>
            {authError && <p className="text-red-500 text-sm">{authError}</p>}
            <button type="submit" className="w-full bg-emerald-600 text-white py-2 rounded hover:bg-emerald-700 font-medium">
              Set PIN & Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Login Screen
  if (!user) {
    return <LoginScreen clients={clients} onLogin={handleLogin} siteName={settings.siteName} authError={authError} setAuthError={setAuthError} />;
  }

  // 3. Main App
  const currentClient = clients.find(c => c.id === effectiveClientId);

  // --- Specific Render Helpers ---

  const renderDashboard = () => {
    const clientReviews = googleReviews.filter(r => r.clientId === effectiveClientId);
    const clientTrust = trustpilotReviews.filter(r => r.clientId === effectiveClientId);
    const clientPayments = payments.filter(p => p.clientId === effectiveClientId);
    const clientTasks = tasks.filter(t => t.clientId === effectiveClientId);

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
                    <p className="text-xs text-slate-500">Step 1: Assign Client Email (Optional, for contact)</p>
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
                    
                    <p className="text-xs text-slate-500 pt-2">Step 2: Send Invitation to Setup PIN</p>
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
  
  const renderAIInsights = () => {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
           <div className="flex items-center gap-3 mb-2">
              <BrainCircuit size={32} className="text-purple-200" />
              <h2 className="text-2xl font-bold">AI Admin Insights</h2>
           </div>
           <p className="text-purple-100">Advanced analysis, sentiment tracking, and predictive planning powered by Gemini.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {/* Column 1: Client Analysis */}
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><PieChart size={18} className="text-indigo-600"/> Client Health & Sentiment</h3>
              
              <div className="flex gap-2 mb-4">
                 <select 
                   className="flex-1 p-2 border rounded-lg bg-slate-50 text-sm focus:ring-2 focus:ring-indigo-500"
                   value={analysisClientId}
                   onChange={e => setAnalysisClientId(e.target.value)}
                 >
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
                 <button 
                   onClick={handleAnalyzeClient}
                   disabled={isGenerating || !analysisClientId}
                   className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                 >
                    {isGenerating ? 'Analyzing...' : 'Analyze'}
                 </button>
              </div>

              {clientAnalysis ? (
                 <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl">
                       <div>
                          <p className="text-xs text-slate-500 uppercase font-bold">Health Score</p>
                          <div className="text-3xl font-bold text-slate-800">{clientAnalysis.healthScore}/100</div>
                       </div>
                       <div className={`px-3 py-1 rounded-full text-sm font-bold ${clientAnalysis.sentiment === 'Positive' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {clientAnalysis.sentiment}
                       </div>
                    </div>
                    
                    <div>
                       <p className="text-xs text-slate-500 uppercase font-bold mb-2">Key Themes</p>
                       <div className="flex flex-wrap gap-2">
                          {clientAnalysis.keyThemes.map((theme, i) => (
                             <span key={i} className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-medium border border-indigo-100">{theme}</span>
                          ))}
                       </div>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                       <p className="text-xs text-amber-600 uppercase font-bold mb-1">Retention Strategy</p>
                       <p className="text-sm text-slate-700">{clientAnalysis.retentionStrategy}</p>
                    </div>
                    
                    <div>
                       <p className="text-xs text-slate-500 uppercase font-bold mb-1">Review Summary (Copy for Portfolio)</p>
                       <div className="relative">
                          <textarea className="w-full text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 h-24" readOnly value={clientAnalysis.reviewSummary} />
                          <button onClick={() => copyToClipboard(clientAnalysis.reviewSummary)} className="absolute top-2 right-2 text-slate-400 hover:text-indigo-600"><Copy size={12}/></button>
                       </div>
                    </div>
                 </div>
              ) : (
                 <div className="text-center py-10 text-slate-400">
                    <Sparkles size={40} className="mx-auto mb-2 opacity-20"/>
                    <p className="text-sm">Select a client and click Analyze to see insights.</p>
                 </div>
              )}
           </div>

           {/* Column 2: Smart Planner */}
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Wand2 size={18} className="text-emerald-600"/> Smart Task Planner</h3>
              <p className="text-sm text-slate-500 mb-4">Enter a high-level goal, and AI will break it down into specific tasks with predicted priorities and due dates.</p>
              
              <div className="space-y-4">
                 <textarea 
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 h-24 text-sm"
                    placeholder="e.g., Launch a new 50-review campaign for HOB Furniture targeting London area..."
                    value={smartPlanGoal}
                    onChange={e => setSmartPlanGoal(e.target.value)}
                 />
                 <button 
                   onClick={handleGenerateSmartPlan}
                   disabled={isGenerating || !smartPlanGoal}
                   className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                 >
                    {isGenerating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Sparkles size={16}/>}
                    Generate & Add Tasks
                 </button>
              </div>
              
              <div className="mt-6 pt-6 border-t border-slate-100">
                 <h4 className="font-bold text-slate-700 text-sm mb-2">Recent Suggestions</h4>
                 <div className="space-y-2">
                    <div className="p-3 bg-slate-50 rounded border border-slate-100 text-xs text-slate-600">
                       "Increase Trustpilot score to 4.8" &rarr; 4 Subtasks generated
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-100 text-xs text-slate-600">
                       "Onboard new client TechCorp" &rarr; 6 Subtasks generated
                    </div>
                 </div>
              </div>
           </div>
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
               <div className="relative shrink-0 group">
                 <img 
                   src={portfolio.profileImage || "https://via.placeholder.com/150"} 
                   alt="Profile" 
                   className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-md object-cover bg-slate-100"
                 />
                 {!isClient && isEditingPortfolio && (
                    <>
                      <label htmlFor="profile-image-upload" className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-bold cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                          <UploadCloud size={24} />
                      </label>
                      <input
                        id="profile-image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleImageUpload(e.target.files[0], (base64) => updatePortfolio('profileImage', base64));
                          }
                        }}
                      />
                    </>
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
                          <>
                            <label htmlFor={`project-image-upload-${project.id}`} className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                              Change Image
                            </label>
                            <input
                              id={`project-image-upload-${project.id}`}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleImageUpload(e.target.files[0], (base64) => updateProject(project.id, 'imageUrl', base64));
                                }
                              }}
                            />
                          </>
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
    // CRITICAL FIX: Use effectiveClientId to filter reviews
    const clientReviews = googleReviews.filter(r => r.clientId === effectiveClientId);

    const addReview = () => {
      const newReview: GoogleReview = {
        id: Date.now().toString(),
        clientId: effectiveClientId,
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
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Gmail Used</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500 mt-1" 
                                        value={review.gmailUsed || ''} 
                                        placeholder="example@gmail.com" 
                                        readOnly={isClient}
                                        onChange={e => updateReview(review.id, 'gmailUsed', e.target.value)} 
                                    />
                                    <button onClick={() => copyToClipboard(review.gmailUsed || '')} className="text-slate-400 hover:text-emerald-600 p-2"><Copy size={16} /></button>
                                </div>
                            </div>
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
    // CRITICAL FIX: Use effectiveClientId
    const clientReviews = trustpilotReviews.filter(r => r.clientId === effectiveClientId);

    const addReview = () => {
      const today = new Date().toISOString().split('T')[0];
      const newReview: TrustpilotReview = {
        id: Date.now().toString(),
        clientId: effectiveClientId,
        link: '',
        title: '',
        content: '',
        location: 'US',
        name: '',
        liveLink: '',
        status: 'Pending',
        gmailUsed: '',
        passwordUsed: '',
        invoiceNumber: '',
        experienceDate: today,
        postDate: today,
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
                                <label className="text-xs text-slate-500 font-medium uppercase">Target Link</label>
                                <input className="w-full text-sm bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500 mt-1 text-blue-600" value={review.link} placeholder="Company Trustpilot URL" readOnly={isClient} onChange={e => updateReview(review.id, 'link', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Content</label>
                                <textarea className="w-full text-sm bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500 resize-y min-h-[60px] mt-1" value={review.content} placeholder="Review content..." onChange={e => updateReview(review.id, 'content', e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-500 font-medium uppercase">Experience Date</label>
                                    <input type="date" className="w-full text-sm bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500 mt-1" value={review.experienceDate || ''} onChange={e => updateReview(review.id, 'experienceDate', e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 font-medium uppercase">Post Date</label>
                                    <input type="date" className="w-full text-sm bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500 mt-1" value={review.postDate || ''} onChange={e => updateReview(review.id, 'postDate', e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Invoice #</label>
                                <input className="w-full text-sm bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500 mt-1" value={review.invoiceNumber || ''} placeholder="INV-001" onChange={e => updateReview(review.id, 'invoiceNumber', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Live Link</label>
                                <input className="w-full text-sm bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500 mt-1" value={review.liveLink} placeholder="Paste Live URL" onChange={e => updateReview(review.id, 'liveLink', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Gmail Used</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500 mt-1" 
                                        value={review.gmailUsed || ''} 
                                        placeholder="example@gmail.com" 
                                        readOnly={isClient}
                                        onChange={e => updateReview(review.id, 'gmailUsed', e.target.value)} 
                                    />
                                    <button onClick={() => copyToClipboard(review.gmailUsed || '')} className="text-slate-400 hover:text-emerald-600 p-2"><Copy size={16} /></button>
                                </div>
                            </div>
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
                <th className="p-3">Target Link</th>
                <th className="p-3">Title</th>
                <th className="p-3 w-1/4">Content</th>
                <th className="p-3">Experience Date</th>
                <th className="p-3">Post Date</th>
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
                      className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none text-blue-600 text-xs"
                      value={review.link}
                      placeholder="Trustpilot URL"
                      readOnly={isClient}
                      onChange={e => updateReview(review.id, 'link', e.target.value)}
                    />
                     {review.link && (
                      <a href={review.link} target="_blank" rel="noreferrer" className="text-xs text-slate-400 hover:text-blue-600 flex items-center mt-1">
                        Open <LinkIcon size={10} className="ml-1"/>
                      </a>
                    )}
                  </td>
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
                      type="date"
                      className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none"
                      value={review.experienceDate || ''}
                      onChange={e => updateReview(review.id, 'experienceDate', e.target.value)}
                    />
                  </td>
                  <td className="p-3 align-top">
                    <input
                      type="date"
                      className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none"
                      value={review.postDate || ''}
                      onChange={e => updateReview(review.id, 'postDate', e.target.value)}
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
    // CRITICAL FIX: Use effectiveClientId
    const clientPayments = payments.filter(p => p.clientId === effectiveClientId);
    const clientAdvances = advances.filter(a => a.clientId === effectiveClientId);

    // --- Regular Payment Logic ---
    const addPayment = () => {
      const newPayment: Payment = {
        id: Date.now().toString(),
        clientId: effectiveClientId,
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
        clientId: effectiveClientId,
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
    // CRITICAL FIX: Use effectiveClientId
    const clientGmails = gmails.filter(g => g.clientId === effectiveClientId);

    const addGmail = () => {
      const newGmail: GmailAccount = {
        id: Date.now().toString(),
        clientId: effectiveClientId,
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
    };

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
                            
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Password</label>
                                <div className="flex items-center gap-2">
                                    <input className="w-full text-sm bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500 mt-1 font-mono" value={gmail.newPassword || gmail.oldPassword} placeholder="Password" readOnly={isClient} onChange={e => updateGmail(gmail.id, 'newPassword', e.target.value)} />
                                    <button onClick={() => copyToClipboard(gmail.newPassword || gmail.oldPassword || '')} className="text-slate-400 hover:text-emerald-600 p-2"><Copy size={16} /></button>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Recovery / 2FA</label>
                                <input className="w-full text-sm bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500 mt-1" value={gmail.new2FA || gmail.old2FA} placeholder="Recovery Email or 2FA" readOnly={isClient} onChange={e => updateGmail(gmail.id, 'new2FA', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Backup Code</label>
                                <input className="w-full text-sm bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500 mt-1 font-mono" value={gmail.backupCode} placeholder="Backup Code" readOnly={isClient} onChange={e => updateGmail(gmail.id, 'backupCode', e.target.value)} />
                            </div>
                            {!isClient && (
                                <div className="flex justify-end pt-2"><button onClick={() => deleteGmail(gmail.id)} className="text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 text-xs"><Trash2 size={16} /> Remove</button></div>
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
    const clientAddresses = addresses.filter(a => a.clientId === effectiveClientId);

    const addAddress = () => {
      const newAddr: Address = {
        id: Date.now().toString(),
        clientId: effectiveClientId,
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
    // CRITICAL FIX: Use effectiveClientId
    const clientTasks = tasks.filter(t => t.clientId === effectiveClientId);
    
    // --- Task Actions ---
    const addTask = () => {
        const newTask: Task = {
            id: Date.now().toString(),
            clientId: effectiveClientId,
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
        if (isClient && !['status', 'description'].includes(field)) {
            return;
        }
    
        const originalTask = tasks.find(t => t.id === id);
        if (!originalTask || originalTask[field] === value) {
            return;
        }
        
        const updatedTasks = tasks.map(t => (t.id === id ? { ...t, [field]: value } : t));
        setTasks(updatedTasks);
        dataService.saveTasks(updatedTasks);
    
        // Notification Logic
        let notificationMessage = '';
        const clientName = clients.find(c => c.id === originalTask.clientId)?.name || 'A client';
    
        if (field === 'status') {
            notificationMessage = `Task "${originalTask.description}" status was updated to ${value}.`;
        } else if (field === 'description' && isClient) {
            notificationMessage = `${clientName} updated the description for task: "${originalTask.description}".`;
        }
    
        if (notificationMessage) {
            const newNotification: Notification = {
                id: Date.now().toString(),
                clientId: originalTask.clientId,
                message: notificationMessage,
                timestamp: new Date().toISOString(),
                isRead: false,
                taskId: originalTask.id,
            };
            const updatedNotifications = [newNotification, ...notifications];
            setNotifications(updatedNotifications);
            dataService.saveNotifications(updatedNotifications);
        }
    };
    
    if (isClient) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 className="font-semibold text-slate-700">My Tasks</h3>
                    <button onClick={addTask} className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 text-sm">
                        <Plus size={16} /> Request New Work
                    </button>
                </div>
                <div className="divide-y divide-slate-100">
                    {clientTasks.length > 0 ? clientTasks.map(task => {
                        const today = new Date(); today.setHours(0,0,0,0);
                        const dueDateObj = new Date(task.dueDate); dueDateObj.setHours(0,0,0,0);
                        const diffDays = Math.ceil((dueDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        
                        let dateStatus = null;
                        if (task.status !== 'Completed') {
                            if (diffDays < 0) dateStatus = <span className="flex items-center gap-1 text-xs font-bold text-red-600"><AlertCircle size={12}/> Overdue</span>;
                            else if (diffDays === 0) dateStatus = <span className="flex items-center gap-1 text-xs font-bold text-amber-600"><Clock size={12}/> Due Today</span>;
                        }

                        return (
                            <div key={task.id} className="p-4 space-y-3">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
                                    <div className="flex-1">
                                        <textarea 
                                            className={`font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-md p-2 w-full resize-y focus:ring-1 focus:ring-emerald-500 ${task.status === 'Completed' ? 'line-through text-slate-400' : ''}`}
                                            value={task.description}
                                            rows={2}
                                            onBlur={(e) => updateTask(task.id, 'description', e.target.value)}
                                            onChange={(e) => {
                                                const updatedTasks = tasks.map(t => t.id === task.id ? { ...t, description: e.target.value } : t);
                                                setTasks(updatedTasks);
                                            }}
                                        />
                                        <p className="text-xs text-slate-500 mt-1">You can edit to add notes. Changes are saved when you click away.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {dateStatus}
                                        <select value={task.status} onChange={e => updateTask(task.id, 'status', e.target.value as TaskStatus)}
                                            className={`text-xs font-semibold px-2 py-1.5 rounded-full border-none focus:ring-emerald-500 cursor-pointer ${ task.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : task.status === 'On Hold' ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-700' }`}>
                                            <option value="Pending">Pending</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Completed">Completed</option>
                                            <option value="On Hold">On Hold</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                                    <div className="flex items-center gap-1"><Clock size={12} /><span>Due: {new Date(task.dueDate).toLocaleDateString()}</span></div>
                                    <div className="flex items-center gap-1"><span>Priority:</span><span className="font-medium text-slate-600">{task.priority}</span></div>
                                </div>
                            </div>
                        );
                    }) : <p className="p-8 text-center text-slate-400 text-sm">You have no tasks assigned.</p>}
                </div>
            </div>
        );
    }

    // Admin View
    const checkForCircularDependency = (taskId: string, newDependencyId: string): boolean => {
      const visited = new Set<string>();
      const queue = [newDependencyId];
      
      while (queue.length > 0) {
          const currentId = queue.shift()!;
          if (currentId === taskId) return true;
          if (visited.has(currentId)) continue;
          
          visited.add(currentId);
          const currentTask = tasks.find(t => t.id === currentId);
          if (currentTask?.dependencies) {
              for (const depId of currentTask.dependencies) {
                  if (!visited.has(depId)) queue.push(depId);
              }
          }
      }
      return false;
    };

    const addDependency = (taskId: string, dependencyId: string) => {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      if (checkForCircularDependency(taskId, dependencyId)) {
          alert("This would create a circular dependency and is not allowed.");
          return;
      }
      
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

    const handleBulkTaskAction = (action: 'delete' | 'status', newStatus?: TaskStatus) => {
        if (selectedTaskIds.length === 0) return;

        let updatedTasks = [...tasks];
        if (action === 'delete') {
            updatedTasks = tasks.filter(t => !selectedTaskIds.includes(t.id));
        } else if (action === 'status' && newStatus) {
            updatedTasks = tasks.map(t => selectedTaskIds.includes(t.id) ? { ...t, status: newStatus } : t);
        }
        setTasks(updatedTasks);
        dataService.saveTasks(updatedTasks);
        setSelectedTaskIds([]);
    };
    
    const handleTaskSelection = (taskId: string) => {
        setSelectedTaskIds(prev => 
            prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
        );
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
            
            {/* Bulk Actions Bar */}
            {!isClient && selectedTaskIds.length > 0 && (
                <div className="p-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-2 animate-in fade-in duration-300">
                    <span className="text-xs font-medium text-slate-600">{selectedTaskIds.length} tasks selected</span>
                    <div className="flex items-center gap-2">
                        <select onChange={(e) => handleBulkTaskAction('status', e.target.value as TaskStatus)} className="text-xs border-slate-300 rounded-md py-1 focus:ring-emerald-500">
                            <option>Change status...</option>
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="On Hold">On Hold</option>
                        </select>
                        <button onClick={() => handleBulkTaskAction('delete')} className="p-1.5 text-red-500 hover:bg-red-100 rounded-md"><Trash2 size={16}/></button>
                    </div>
                </div>
            )}

            <div className="divide-y divide-slate-100">
                {clientTasks.length > 0 ? clientTasks.map(task => {
                    const deps = task.dependencies || [];
                    const blockingTasks = tasks.filter(t => deps.includes(t.id) && t.status !== 'Completed');
                    const isBlocked = blockingTasks.length > 0;
                    
                    let statusBgClass = '';
                    if (isBlocked) {
                        statusBgClass = 'bg-amber-50/50';
                    } else {
                        switch (task.status) {
                            case 'Pending': statusBgClass = 'bg-amber-50/30'; break;
                            case 'In Progress': statusBgClass = 'bg-blue-50/30'; break;
                            case 'Completed': statusBgClass = 'bg-emerald-50/30'; break;
                            case 'On Hold': statusBgClass = 'bg-slate-100'; break;
                        }
                    }

                    const today = new Date(); today.setHours(0,0,0,0);
                    const dueDateObj = new Date(task.dueDate); dueDateObj.setHours(0,0,0,0);
                    const diffDays = Math.ceil((dueDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    
                    let dateStatus = null;
                    if (task.status !== 'Completed') {
                        if (diffDays < 0) dateStatus = <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100"><AlertCircle size={12}/> Overdue</span>;
                        else if (diffDays === 0) dateStatus = <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100"><Clock size={12}/> Due Today</span>;
                    }
                    
                    return (
                      <div key={task.id} className={`p-4 transition-colors ${statusBgClass}`}>
                          <div className="flex items-start gap-3">
                              {!isClient && <input type="checkbox" className="mt-1.5 rounded focus:ring-emerald-500 text-emerald-600" checked={selectedTaskIds.includes(task.id)} onChange={() => handleTaskSelection(task.id)} />}
                              <div className="flex-1 min-w-0">
                                  <div className="flex flex-col md:flex-row gap-3 md:items-start justify-between mb-2">
                                      <div className="w-full">
                                        <div className="flex items-center gap-2">
                                            <textarea 
                                                className={`font-medium text-slate-800 bg-transparent border-none focus:ring-0 p-0 w-full resize-none ${task.status === 'Completed' ? 'line-through text-slate-400' : ''}`}
                                                value={task.description} rows={1}
                                                onChange={e => updateTask(task.id, 'description', e.target.value)}
                                            />
                                            {dateStatus}
                                        </div>
                                        {isBlocked && <div className="flex items-start gap-1 text-amber-600 text-xs mt-1"><AlertTriangle size={12} className="mt-0.5 shrink-0"/><span>Waiting for: {blockingTasks.map(t => t.description).join(', ')}</span></div>}
                                      </div>
                                      <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto shrink-0">
                                          <select value={task.status} onChange={e => updateTask(task.id, 'status', e.target.value as TaskStatus)}
                                              className={`text-xs font-semibold px-2 py-1 rounded-full border-none focus:ring-0 cursor-pointer ${ task.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : task.status === 'On Hold' ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-700' }`}>
                                              <option value="Pending">Pending</option><option value="In Progress">In Progress</option><option value="Completed">Completed</option><option value="On Hold">On Hold</option>
                                          </select>
                                          
                                          <select value={task.priority} onChange={e => updateTask(task.id, 'priority', e.target.value as TaskPriority)}
                                              className={`text-xs font-bold px-2 py-1 rounded border-none focus:ring-0 cursor-pointer ${ task.priority === 'High' ? 'text-red-600 bg-red-50' : task.priority === 'Medium' ? 'text-amber-600 bg-amber-50' : 'text-slate-500 bg-slate-100'}`}>
                                              <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option>
                                          </select>
                                      </div>
                                  </div>
                                  
                                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                                      <div className="flex items-center gap-1">
                                          <Clock size={12}/>
                                          <input type="date" className="bg-transparent border-none p-0 text-xs focus:ring-0 text-slate-500" value={task.dueDate} onChange={e => updateTask(task.id, 'dueDate', e.target.value)} />
                                      </div>
                                      
                                      <div className="flex items-center gap-1">
                                          <Link2 size={12}/>
                                          <select 
                                              className="bg-transparent border-none p-0 text-xs focus:ring-0 text-slate-500 max-w-[150px] truncate"
                                              onChange={(e) => {
                                                  if(e.target.value) addDependency(task.id, e.target.value);
                                                  e.target.value = "";
                                              }}
                                          >
                                              <option value="">+ Add Dependency</option>
                                              {clientTasks.filter(t => t.id !== task.id && !(task.dependencies || []).includes(t.id)).map(t => (
                                                  <option key={t.id} value={t.id}>{t.description}</option>
                                              ))}
                                          </select>
                                      </div>
                                  </div>
                              </div>
                              
                              {/* Remove Dependency Button */}
                              {deps.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2 pl-6">
                                      {deps.map(depId => {
                                          const depTask = tasks.find(d => d.id === depId);
                                          return (
                                              <span key={depId} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                  <Link2 size={10}/> {depTask?.description.substring(0, 15)}...
                                                  <button onClick={() => removeDependency(task.id, depId)} className="hover:text-red-500"><X size={10}/></button>
                                              </span>
                                          )
                                      })}
                                  </div>
                              )}
                          </div>
                          {!isClient && (
                            <button onClick={() => deleteTask(task.id)} className="text-slate-300 hover:text-red-500 p-2 self-start"><Trash2 size={16} /></button>
                          )}
                      </div>
                    );
                }) : <p className="p-8 text-center text-slate-400 text-sm">No tasks found.</p>}
            </div>
        </div>
    );
  };

  const renderExpenses = () => {
    const expenseCategories = ['Software', 'Hosting', 'Service', 'Marketing & Advertising', 'Office Supplies', 'Travel', 'Professional Development', 'Other'];

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
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-semibold text-slate-700">Expense Tracker</h3>
            <p className="text-xs text-slate-500 mt-1">Total: <span className="font-bold text-slate-800">${totalExpenses.toFixed(2)}</span></p>
          </div>
          <button onClick={addExpense} className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 text-sm">
            <Plus size={16} /> <span className="hidden sm:inline">Add Expense</span><span className="sm:hidden">Add</span>
          </button>
        </div>
        
        <div className="divide-y divide-slate-100">
          {expenses.length > 0 ? expenses.map(exp => (
            <div key={exp.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 items-center">
                 <input type="date" className="text-sm bg-transparent border-none p-0 focus:ring-0 text-slate-500" value={exp.date} onChange={e => updateExpense(exp.id, 'date', e.target.value)} />
                 <select className="text-sm bg-slate-50 border-none rounded p-1 focus:ring-emerald-500" value={exp.category} onChange={e => updateExpense(exp.id, 'category', e.target.value)}>
                    {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
                 <div className="col-span-2 sm:col-span-2">
                    <input className="w-full text-sm font-medium border-b border-transparent focus:border-emerald-500 focus:outline-none" value={exp.description} placeholder="Description" onChange={e => updateExpense(exp.id, 'description', e.target.value)} />
                 </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                 <div className="flex items-center">
                    <span className="text-slate-400 mr-1">$</span>
                    <input type="number" className="w-20 font-bold text-slate-700 bg-transparent border-none p-0 focus:ring-0 text-right" value={exp.amount} onChange={e => updateExpense(exp.id, 'amount', Number(e.target.value))} />
                 </div>
                 <button onClick={() => deleteExpense(exp.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
              </div>
            </div>
          )) : <p className="text-center py-8 text-slate-400 text-sm">No expenses recorded.</p>}
        </div>
      </div>
    );
  };
  
  const renderFeedback = () => {
      // Client View: Form
      if (isClient) {
          return (
              <div className="max-w-xl mx-auto space-y-6">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-center">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">We value your feedback</h2>
                    <p className="text-slate-500 mb-6">How was your experience working with us?</p>
                    
                    <div className="flex justify-center gap-2 mb-6">
                       {[1, 2, 3, 4, 5].map(star => (
                          <button 
                            key={star} 
                            onClick={() => setFeedbackRating(star)}
                            className={`p-2 transition-transform hover:scale-110 ${star <= feedbackRating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'}`}
                          >
                             <Star size={32} fill={star <= feedbackRating ? "currentColor" : "none"} />
                          </button>
                       ))}
                    </div>
                    
                    <textarea 
                       className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none h-32 resize-none mb-4"
                       placeholder="Tell us what you liked or how we can improve..."
                       value={feedbackComment}
                       onChange={e => setFeedbackComment(e.target.value)}
                    />
                    
                    <button 
                      onClick={handleSubmitFeedback}
                      disabled={!feedbackComment.trim()}
                      className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                       Submit Feedback
                    </button>
                 </div>
                 
                 {/* Past Feedback */}
                 <div className="space-y-4">
                    <h3 className="font-bold text-slate-700 px-2">Your Past Reviews</h3>
                    {feedback.filter(f => f.clientId === effectiveClientId).length > 0 ? (
                        feedback.filter(f => f.clientId === effectiveClientId).map(f => (
                            <div key={f.id} className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                               <div className="flex justify-between items-start mb-2">
                                  <div className="flex text-yellow-400">
                                     {[...Array(5)].map((_, i) => <Star key={i} size={14} fill={i < f.rating ? "currentColor" : "none"} className={i < f.rating ? "" : "text-slate-200"} />)}
                                  </div>
                                  <span className="text-xs text-slate-400">{f.date}</span>
                               </div>
                               <p className="text-slate-600 text-sm">{f.comment}</p>
                            </div>
                        ))
                    ) : <p className="text-center text-slate-400 text-sm py-4">No reviews yet.</p>}
                 </div>
              </div>
          );
      }
      
      // Admin View: List
      return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {feedback.length > 0 ? feedback.map(f => {
                 const clientName = clients.find(c => c.id === f.clientId)?.name || 'Unknown Client';
                 return (
                     <div key={f.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-start mb-3">
                           <div>
                              <h4 className="font-bold text-slate-800">{clientName}</h4>
                              <span className="text-xs text-slate-400">{f.date}</span>
                           </div>
                           <div className="flex bg-yellow-50 px-2 py-1 rounded text-yellow-600 font-bold text-sm">
                              {f.rating} <Star size={14} className="ml-1 fill-current"/>
                           </div>
                        </div>
                        <p className="text-slate-600 text-sm italic">"{f.comment}"</p>
                     </div>
                 )
             }) : (
                 <div className="col-span-full text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                    <MessageSquareHeart size={48} className="mx-auto mb-3 opacity-20"/>
                    <p>No client feedback received yet.</p>
                 </div>
             )}
          </div>
      );
  };
  
  const renderAIComms = () => {
      return (
          <div className="max-w-4xl mx-auto">
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                   <div className="flex items-center gap-3 mb-2">
                      <Bot size={32} />
                      <h2 className="text-2xl font-bold">AI Email Studio</h2>
                   </div>
                   <p className="text-indigo-100">Instantly generate professional client communications tailored to your needs.</p>
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Email Type</label>
                         <select 
                           className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                           value={aiEmailType}
                           onChange={e => setAiEmailType(e.target.value)}
                         >
                            <option>Invoice Reminder</option>
                            <option>Project Update</option>
                            <option>Feedback Request</option>
                            <option>Onboarding Welcome</option>
                            <option>Task Completion Notice</option>
                            <option>General Follow-up</option>
                         </select>
                      </div>
                      <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Key Details / Context</label>
                         <textarea 
                           className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none h-32 text-sm"
                           placeholder="e.g., Invoice #302 is 3 days overdue, total $500..."
                           value={aiEmailContext}
                           onChange={e => setAiEmailContext(e.target.value)}
                         />
                      </div>
                      <button 
                        onClick={handleGenerateEmail}
                        disabled={isGenerating || !aiEmailContext}
                        className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                         {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Wand2 size={18}/>}
                         Generate Draft
                      </button>
                   </div>
                   
                   <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 relative min-h-[300px]">
                      {aiGeneratedEmail ? (
                         <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                            <div>
                               <label className="text-xs font-bold text-slate-400 uppercase">Subject</label>
                               <div className="flex items-center gap-2">
                                  <input className="w-full font-bold text-slate-800 bg-transparent border-none p-0 focus:ring-0" value={aiGeneratedEmail.subject} readOnly />
                                  <button onClick={() => copyToClipboard(aiGeneratedEmail.subject)} className="text-slate-400 hover:text-indigo-600"><Copy size={14}/></button>
                                </div>
                            </div>
                            <hr className="border-slate-200"/>
                            <div>
                               <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Body</label>
                               <textarea className="w-full bg-transparent border-none p-0 text-sm text-slate-600 h-64 resize-none focus:ring-0" value={aiGeneratedEmail.body} readOnly />
                               <button onClick={() => copyToClipboard(aiGeneratedEmail.body)} className="absolute bottom-4 right-4 bg-white shadow-sm border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:text-indigo-600 hover:border-indigo-200 flex items-center gap-1">
                                  <Copy size={14}/> Copy Body
                               </button>
                            </div>
                         </div>
                      ) : (
                         <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center">
                            <Bot size={48} className="mb-3 opacity-20"/>
                            <p className="text-sm">Enter details and click generate to see the AI magic.</p>
                         </div>
                      )}
                   </div>
                </div>
             </div>
          </div>
      );
  };

  const renderNotifications = () => {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
             <h3 className="font-semibold text-slate-700">Notifications</h3>
          </div>
          <div className="divide-y divide-slate-100">
             {notifications.filter(n => n.clientId === effectiveClientId).length > 0 ? (
                notifications.filter(n => n.clientId === effectiveClientId).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(n => (
                   <div key={n.id} className={`p-4 ${!n.isRead ? 'bg-blue-50/50' : ''}`}>
                      <div className="flex gap-3">
                         <div className="mt-1 bg-blue-100 text-blue-600 p-2 rounded-full shrink-0 h-fit">
                            <Bell size={16} />
                         </div>
                         <div>
                            <p className="text-slate-800 text-sm">{n.message}</p>
                            <p className="text-slate-400 text-xs mt-1">{new Date(n.timestamp).toLocaleString()}</p>
                         </div>
                      </div>
                   </div>
                ))
             ) : (
                <div className="p-8 text-center text-slate-400">
                   <Bell size={32} className="mx-auto mb-2 opacity-20"/>
                   <p>No notifications yet.</p>
                </div>
             )}
          </div>
        </div>
      </div>
    );
  };

  const renderActivityFeed = () => {
    // Custom Notification Sender Panel
    const renderCustomSender = () => (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Send size={18} className="text-indigo-600"/> Send Custom Notification</h3>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
           <div className="w-full sm:w-1/3">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">To Client</label>
              <select 
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={customNotificationClientId}
                onChange={(e) => setCustomNotificationClientId(e.target.value)}
              >
                 {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
           </div>
           <div className="w-full">
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Message</label>
               <input 
                 className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                 placeholder="Type your message here..."
                 value={customNotificationMessage}
                 onChange={(e) => setCustomNotificationMessage(e.target.value)}
               />
           </div>
           <button 
             onClick={handleSendCustomNotification}
             className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors shrink-0"
           >
             Send
           </button>
        </div>
      </div>
    );

    const allNotifications = notifications.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return (
      <div className="max-w-3xl mx-auto">
        {renderCustomSender()}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
             <h3 className="font-semibold text-slate-700">Recent Activity</h3>
             <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full">{allNotifications.length} updates</span>
          </div>
          <div className="divide-y divide-slate-100">
             {allNotifications.length > 0 ? allNotifications.map(n => {
               const clientName = clients.find(c => c.id === n.clientId)?.name || 'Unknown Client';
               return (
                   <div key={n.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex gap-4">
                         <div className="mt-1">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                               {clientName.substring(0,2).toUpperCase()}
                            </div>
                         </div>
                         <div className="flex-1">
                            <div className="flex justify-between items-start">
                               <p className="text-sm font-bold text-slate-700">{clientName}</p>
                               <span className="text-xs text-slate-400 whitespace-nowrap ml-2">{new Date(n.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-slate-600 text-sm mt-0.5">{n.message}</p>
                         </div>
                      </div>
                   </div>
               )
             }) : (
               <div className="p-12 text-center text-slate-400">
                  <Bell size={48} className="mx-auto mb-3 opacity-20"/>
                  <p>No activity recorded yet.</p>
               </div>
             )}
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
     return (
        <div className="max-w-xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
           <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">App Settings</h2>
           </div>
           <div className="p-6 space-y-6">
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Site / Application Name</label>
                 <input 
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={settings.siteName}
                    onChange={(e) => {
                       const newSettings = { ...settings, siteName: e.target.value };
                       setSettings(newSettings);
                       dataService.saveSettings(newSettings);
                    }}
                 />
                 <p className="text-xs text-slate-500 mt-1">This name appears in the browser tab and sidebar.</p>
              </div>
              <div className="pt-4 border-t border-slate-100">
                 <button onClick={handleLogout} className="text-red-600 hover:text-red-700 font-medium text-sm flex items-center gap-2">
                    <LogOut size={16} /> Sign Out Admin
                 </button>
              </div>
           </div>
        </div>
     );
  };

  // --- Main Layout Return ---
  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        isClientView={isClient}
        siteName={settings.siteName}
        unreadCount={unreadCount}
        adminUnreadCount={adminUnreadCount}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-700">
              <Menu size={24} />
            </button>
            <h2 className="text-lg font-bold text-slate-800 hidden sm:block">
              {currentView === 'dashboard' ? 'Overview' : 
               currentView === 'google' ? 'Google Reviews' :
               currentView === 'trustpilot' ? 'Trustpilot Reviews' :
               currentView === 'payments' ? 'Payments & Finance' :
               currentView === 'gmail' ? 'Gmail Inventory' : 
               currentView === 'address' ? 'Address Book' :
               currentView === 'tasks' ? 'Task Manager' :
               currentView === 'expenses' ? 'Expenses' :
               currentView === 'feedback' ? 'Feedback' :
               currentView === 'portfolio' ? 'Portfolio' :
               currentView === 'ai_comms' ? 'AI Communications' :
               currentView === 'ai_insights' ? 'AI Insights' :
               currentView === 'notifications' ? 'Notifications' :
               currentView === 'activity_feed' ? 'Activity Feed' :
               'Settings'}
            </h2>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
             {/* Client Selector (Admin Only) */}
            {!isClient && (
              <ClientSelector 
                clients={clients} 
                activeClientId={activeClientId} 
                setActiveClientId={setActiveClientId} 
                onAddClient={handleAddClient} 
              />
            )}
            
            {isClient && currentClient && (
                 <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
                    <div className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-xs">
                        {currentClient.name.substring(0, 1)}
                    </div>
                    Hello, {currentClient.name}
                 </div>
            )}

            {/* Logout Button */}
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-slate-500 hover:text-red-500 transition-colors text-sm font-medium"
              title="Logout"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          <div className="max-w-7xl mx-auto h-full">
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
            {currentView === 'ai_comms' && renderAIComms()}
            {currentView === 'ai_insights' && renderAIInsights()}
            {currentView === 'notifications' && renderNotifications()}
            {currentView === 'activity_feed' && renderActivityFeed()}
            {currentView === 'settings' && renderSettings()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
