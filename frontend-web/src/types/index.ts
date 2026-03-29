export type Role = 'admin' | 'manager' | 'employee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  managerId?: string;       
  companyId: string;
}

export interface Company {
  id: string;
  name: string;
  currency: string;         
  country: string;
}

export type ExpenseStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export interface Expense {
  id: string;
  employeeId: string;
  amount: number;
  currency: string;         
  convertedAmount: number;  
  category: string;
  description: string;
  date: string;
  status: ExpenseStatus;
  receiptUrl?: string;
  approvalSteps: ApprovalStep[];
}

export interface ApprovalStep {
  approverId: string;
  approverName: string;
  status: 'pending' | 'approved' | 'rejected';
  comment?: string;
  timestamp?: string;
}

export interface ApprovalRule {
  id: string;
  name: string;
  category: string;
  approvers: RuleApprover[];
  minApprovalPercentage: number;   
  isManagerApproverFirst: boolean;
}

export interface RuleApprover {
  userId: string;
  name: string;
  sequence: number;        
  isRequired: boolean;
}
