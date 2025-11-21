import { Client, GoogleReview, TrustpilotReview, Payment, GmailAccount, Address, Task, Expense, ClientFeedback } from '../types';

// Keys
const CLIENTS_KEY = 'ftm_clients';
const GOOGLE_KEY = 'ftm_google';
const TRUSTPILOT_KEY = 'ftm_trustpilot';
const PAYMENTS_KEY = 'ftm_payments';
const GMAIL_KEY = 'ftm_gmail';
const ADDRESS_KEY = 'ftm_address';
const TASKS_KEY = 'ftm_tasks';
const EXPENSES_KEY = 'ftm_expenses';
const FEEDBACK_KEY = 'ftm_feedback';

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

export const dataService = {
  getClients: () => get<Client[]>(CLIENTS_KEY, initialClients),
  saveClients: (data: Client[]) => set(CLIENTS_KEY, data),

  getGoogleReviews: () => get<GoogleReview[]>(GOOGLE_KEY, []),
  saveGoogleReviews: (data: GoogleReview[]) => set(GOOGLE_KEY, data),

  getTrustpilotReviews: () => get<TrustpilotReview[]>(TRUSTPILOT_KEY, []),
  saveTrustpilotReviews: (data: TrustpilotReview[]) => set(TRUSTPILOT_KEY, data),

  getPayments: () => get<Payment[]>(PAYMENTS_KEY, []),
  savePayments: (data: Payment[]) => set(PAYMENTS_KEY, data),

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
};