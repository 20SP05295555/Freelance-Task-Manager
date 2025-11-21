
export type Status = 'Live' | 'Drop' | 'Invoice Approved' | 'Pending';
export type PaymentStatus = 'Paid' | 'Unpaid' | 'Pending';
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'On Hold';
export type TaskPriority = 'Low' | 'Medium' | 'High';
export type AdvanceType = 'Received' | 'Repaid';

export interface Client {
  id: string;
  name: string;
  note?: string;
  email?: string;
  password?: string; // In a real app, this should be hashed. Storing plain for this demo tool.
  isInviteAccepted?: boolean;
}

export interface GoogleReview {
  id: string;
  clientId: string;
  companyLink: string;
  content: string;
  star: number;
  reviewerName: string;
  liveLink: string;
  reviewCount: number;
  status: Status;
  note: string;
  gmailUsed?: string;
}

export interface TrustpilotReview {
  id: string;
  clientId: string;
  link: string;
  title: string;
  content: string;
  location: string;
  name: string;
  liveLink: string;
  status: Status;
  gmailUsed: string;
  passwordUsed: string;
  invoiceNumber?: string;
}

export interface Payment {
  id: string;
  clientId: string;
  date: string;
  amount: number;
  status: PaymentStatus;
  note: string;
}

export interface AdvanceTransaction {
  id: string;
  clientId: string;
  date: string;
  amount: number;
  type: AdvanceType; // Received = Taking money, Repaid = Returning/Adjusting
  note: string;
}

export interface GmailAccount {
  id: string;
  clientId: string;
  email: string;
  oldPassword?: string;
  newPassword?: string;
  old2FA?: string;
  new2FA?: string;
  backupCode?: string;
  name?: string;
}

export interface Address {
  id: string;
  clientId: string;
  fullAddress: string;
  phone: string;
  invoiceNumber: string;
}

export interface Task {
  id: string;
  clientId: string;
  description: string;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  dependencies?: string[];
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
}

export interface ClientFeedback {
  id: string;
  clientId: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  link?: string;
  tags: string[];
}

export interface PortfolioProfile {
  name: string;
  title: string;
  bio: string;
  profileImage: string;
  skills: string[];
  projects: Project[];
}

export interface AppSettings {
  siteName: string;
}

export type ViewState = 'dashboard' | 'google' | 'trustpilot' | 'payments' | 'gmail' | 'address' | 'tasks' | 'expenses' | 'feedback' | 'portfolio' | 'settings';