import { Client, GoogleReview, TrustpilotReview, Payment, GmailAccount, Address, Task, Expense, ClientFeedback, AdvanceTransaction, PortfolioProfile, AppSettings } from '../types';

// Keys
const CLIENTS_KEY = 'ftm_clients';
const GOOGLE_KEY = 'ftm_google';
const TRUSTPILOT_KEY = 'ftm_trustpilot';
const PAYMENTS_KEY = 'ftm_payments';
const ADVANCES_KEY = 'ftm_advances';
const GMAIL_KEY = 'ftm_gmail';
const ADDRESS_KEY = 'ftm_address';
const TASKS_KEY = 'ftm_tasks';
const EXPENSES_KEY = 'ftm_expenses';
const FEEDBACK_KEY = 'ftm_feedback';
const PORTFOLIO_KEY = 'ftm_portfolio';
const SETTINGS_KEY = 'ftm_settings';

// Helpers
const get = <T>(key: string, defaultVal: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch {
    return defaultVal;
  }
};

const set = <T>(key: string, val: T) => localStorage.setItem(key, JSON.stringify(val));

// Initial Data Seeding
const initialClients: Client[] = [
  { id: '1', name: 'Emma (HOB)' },
  { id: '2', name: 'John (TechCorp)' }
];

const initialPortfolio: PortfolioProfile = {
  name: "Arpon Chakrabortty (Alex)",
  title: "Senior Freelance Developer & Manager",
  bio: "I specialize in delivering high-quality web solutions, reputation management, and project coordination. With over 5 years of experience, I help businesses scale their digital presence.",
  profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=300&h=300",
  skills: ["React", "Project Management", "Reputation Management", "SEO", "Full Stack Dev"],
  projects: [
    {
      id: '1',
      title: "E-Commerce Scale Up",
      description: "Helped a local retail brand transition to a full online store, increasing sales by 150% in 3 months.",
      tags: ["Shopify", "Marketing"],
      imageUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?fit=crop&w=500&h=300"
    }
  ]
};

const initialSettings: AppSettings = {
  siteName: "Freelance with Arpon Chakrabortty (Alex)"
};

export const dataService = {
  getClients: () => get<Client[]>(CLIENTS_KEY, initialClients),
  saveClients: (data: Client[]) => set(CLIENTS_KEY, data),

  getGoogleReviews: () => get<GoogleReview[]>(GOOGLE_KEY, []),
  saveGoogleReviews: (data: GoogleReview[]) => set(GOOGLE_KEY, data),

  getTrustpilotReviews: () => get<TrustpilotReview[]>(TRUSTPILOT_KEY, []),
  saveTrustpilotReviews: (data: TrustpilotReview[]) => set(TRUSTPILOT_KEY, data),

  getPayments: () => get<Payment[]>(PAYMENTS_KEY, []),
  savePayments: (data: Payment[]) => set(PAYMENTS_KEY, data),

  getAdvances: () => get<AdvanceTransaction[]>(ADVANCES_KEY, []),
  saveAdvances: (data: AdvanceTransaction[]) => set(ADVANCES_KEY, data),

  getGmails: () => get<GmailAccount[]>(GMAIL_KEY, []),
  saveGmails: (data: GmailAccount[]) => set(GMAIL_KEY, data),

  getAddresses: () => get<Address[]>(ADDRESS_KEY, []),
  saveAddresses: (data: Address[]) => set(ADDRESS_KEY, data),

  getTasks: () => get<Task[]>(TASKS_KEY, []),
  saveTasks: (data: Task[]) => set(TASKS_KEY, data),

  getExpenses: () => get<Expense[]>(EXPENSES_KEY, []),
  saveExpenses: (data: Expense[]) => set(EXPENSES_KEY, data),

  getFeedback: () => get<ClientFeedback[]>(FEEDBACK_KEY, []),
  saveFeedback: (data: ClientFeedback[]) => set(FEEDBACK_KEY, data),

  getPortfolio: () => get<PortfolioProfile>(PORTFOLIO_KEY, initialPortfolio),
  savePortfolio: (data: PortfolioProfile) => set(PORTFOLIO_KEY, data),

  getSettings: () => get<AppSettings>(SETTINGS_KEY, initialSettings),
  saveSettings: (data: AppSettings) => set(SETTINGS_KEY, data),
};