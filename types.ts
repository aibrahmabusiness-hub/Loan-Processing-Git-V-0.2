export type Role = 'ADMIN' | 'FIELD_AGENT';

export interface UserProfile {
  user_id: string;
  role: Role;
  full_name: string;
  email?: string;
  status: string;
}

export interface HeaderDetails {
  id: string;
  company_name: string;
  address: string;
  contact_email: string;
  logo_url: string;
}

export interface FieldInspectionReport {
  id: string;
  date: string;
  loan_ac_no: string;
  customer_name: string;
  loan_amount: number;
  location: string;
  bob_region?: string;
  our_region?: string;
  lar_remarks: string;
  zone?: string;
  state: string;
  payment_status: 'Pending' | 'Paid' | 'Overdue';
  invoice_status: string;
  created_by_user_id: string;
  created_at?: string;
  creator_name?: string; // Added for display/export
}

export interface PayoutReport {
  id: string;
  month: string;
  customer_name: string; 
  location: string;      
  financier: string;
  our_region: string;    
  loan_amount: number;
  payout_percentage: number;
  amount_paid: number;
  less_tds: number;
  nett_amount: number;
  
  // Split Bank Details
  beneficiary_name: string;
  account_no: string;
  ifsc_code: string;
  bank_name: string;
  
  pan_no: string;
  sm_name: string;
  contact_no: string;
  
  // Changed to string to support "SENT ON 07-01-2025"
  mail_sent: string; 
  // Changed to string to support "PAID ON 07-01-2025"
  payment_status: string;
  
  created_by_user_id: string;
  created_at?: string;
  creator_name?: string; // Added for display/export
}

export interface DashboardStats {
  totalInspections: number;
  totalPayouts: number;
  pendingPayments: number;
  totalVolume: number;
}