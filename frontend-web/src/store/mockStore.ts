import type { User, Company, Expense, ApprovalRule, ExpenseStatus } from '../types';

// Mock Exchange Rates to simulate conversions (base: USD)
const RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.12,
  JPY: 150.20,
  AUD: 1.52,
  CAD: 1.35,
};

// --- Helpers to get/set localStorage ---
function getDb<T>(key: string): T[] {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function setDb<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Ensure the db contains the initial structures
if (!localStorage.getItem('users')) setDb('users', []);
if (!localStorage.getItem('companies')) setDb('companies', []);
if (!localStorage.getItem('expenses')) setDb('expenses', []);
if (!localStorage.getItem('approvalRules')) setDb('approvalRules', []);

// --- Core API Functions ---

export const mockStore = {
  // Users
  getUsers: () => getDb<User>('users'),
  getUserByEmail: (email: string) => getDb<User>('users').find(u => u.email === email),
  getUserById: (id: string) => getDb<User>('users').find(u => u.id === id),
  createUser: (user: User) => {
    const users = getDb<User>('users');
    users.push(user);
    setDb('users', users);
  },
  updateUserRole: (id: string, role: string) => {
    const users = getDb<User>('users');
    const u = users.find(x => x.id === id);
    if (u) {
      u.role = role as any;
      setDb('users', users);
    }
  },

  // Companies
  createCompany: (company: Company) => {
    const comps = getDb<Company>('companies');
    comps.push(company);
    setDb('companies', comps);
  },
  getCompanyById: (id: string) => getDb<Company>('companies').find(c => c.id === id),

  // Approval Rules
  getApprovalRules: () => getDb<ApprovalRule>('approvalRules'),
  createApprovalRule: (rule: ApprovalRule) => {
    const rules = getDb<ApprovalRule>('approvalRules');
    
    // Check if rule for this category exists, if so overwrite
    const existingIndex = rules.findIndex(r => r.category === rule.category);
    if (existingIndex >= 0) {
      rules[existingIndex] = rule;
    } else {
      rules.push(rule);
    }
    setDb('approvalRules', rules);
  },
  getRuleByCategory: (category: string) => getDb<ApprovalRule>('approvalRules').find(r => r.category === category),

  // Expenses
  getExpenses: () => getDb<Expense>('expenses'),
  getExpensesByEmployee: (employeeId: string) => getDb<Expense>('expenses').filter(e => e.employeeId === employeeId),
  getExpensesForManagerReview: (managerId: string) => {
    // A manager needs to review if they are the direct manager AND rule is empty OR
    // if the manager is explicitly the next pending approver in the trail
    const expenses = getDb<Expense>('expenses');
    return expenses.filter(exp => {
      if (exp.status !== 'pending') return false;
      const pendingStep = exp.approvalSteps.find(s => s.status === 'pending');
      return pendingStep?.approverId === managerId;
    });
  },
  
  createExpense: (expense: Omit<Expense, 'convertedAmount' | 'status' | 'approvalSteps'>, companyCurrency: string) => {
    // Determine converted amount based on simulated rate
    const rateExpense = RATES[expense.currency] || 1;
    const rateComp = RATES[companyCurrency] || 1;
    // convert expense to USD, then to comp currency
    const amountInUsd = expense.amount / rateExpense;
    const convertedAmount = amountInUsd * rateComp;

    // Build the approval trail based on Rules + Direct Manager
    const rules = getDb<ApprovalRule>('approvalRules');
    const rule = rules.find(r => r.category === expense.category);
    
    const employee = mockStore.getUserById(expense.employeeId);
    
    const approvalSteps: Expense['approvalSteps'] = [];

    // If there is an approval rule
    if (rule && rule.approvers.length > 0) {
      // Sort approvers by sequence
      const sortedApprovers = [...rule.approvers].sort((a, b) => a.sequence - b.sequence);
      sortedApprovers.forEach(ap => {
        approvalSteps.push({
          approverId: ap.userId,
          approverName: ap.name,
          status: 'pending',
        });
      });
    } else {
      // Fallback: send to direct manager if rule doesn't exist
      if (employee?.managerId) {
        const mgr = mockStore.getUserById(employee.managerId);
        if (mgr) {
          approvalSteps.push({
            approverId: mgr.id,
            approverName: mgr.name,
            status: 'pending'
          });
        }
      } else {
        // No rule, no manager -> default to full admin/top level approve or auto approve
        // We'll leave it pending for an admin
        const admin = getDb<User>('users').find(u => u.role === 'admin');
        if (admin) {
             approvalSteps.push({
               approverId: admin.id,
               approverName: admin.name,
               status: 'pending'
             });
        }
      }
    }

    // Determine initial status based on step size
    const initialStatus: ExpenseStatus = approvalSteps.length > 0 ? 'pending' : 'approved';

    const newExpense: Expense = {
      ...expense,
      convertedAmount,
      status: initialStatus,
      approvalSteps
    };

    const exps = getDb<Expense>('expenses');
    exps.push(newExpense);
    setDb('expenses', exps);
  },

  reviewExpenseStep: (expenseId: string, approverId: string, status: 'approved' | 'rejected', comment: string) => {
    const expenses = getDb<Expense>('expenses');
    const exp = expenses.find(e => e.id === expenseId);
    if (!exp) return;

    const stepIndex = exp.approvalSteps.findIndex(s => s.approverId === approverId && s.status === 'pending');
    if (stepIndex === -1) return;

    // Update the step
    exp.approvalSteps[stepIndex].status = status;
    exp.approvalSteps[stepIndex].comment = comment;
    exp.approvalSteps[stepIndex].timestamp = new Date().toISOString();

    // Re-evaluate entire expense status
    const rule = getDb<ApprovalRule>('approvalRules').find(r => r.category === exp.category);
    
    // If rejected by anyone, usually the entire expense is rejected (unless not required, but for simplicity let's assume one reject = rejected)
    if (status === 'rejected') {
      exp.status = 'rejected';
    } else {
      // Approved. Check if it meets criteria.
      const totalSteps = exp.approvalSteps.length;
      const approvedSteps = exp.approvalSteps.filter(s => s.status === 'approved').length;
      
      let meetsRequired = true;
      let metsPercentage = true;

      if (rule) {
         // check required approvers
         for (const rApp of rule.approvers) {
            if (rApp.isRequired) {
               const st = exp.approvalSteps.find(s => s.approverId === rApp.userId);
               if (st?.status !== 'approved') meetsRequired = false;
            }
         }
         // check minimum percentage
         const currentPct = (approvedSteps / totalSteps) * 100;
         if (currentPct < rule.minApprovalPercentage) {
            metsPercentage = false;
         }
      } else {
         // No rule, must all be approved
         if (approvedSteps < totalSteps) {
            meetsRequired = false;
         }
      }

      // If there are still pending steps, keep it pending unless criteria met
      const hasMorePending = exp.approvalSteps.some(s => s.status === 'pending');

      if (!hasMorePending) {
         exp.status = (meetsRequired && metsPercentage) ? 'approved' : 'rejected';
      } else if (meetsRequired && metsPercentage && rule) {
         // If a rule is set and we already hit the required elements, short circuit to approved
         // Actually normally we wait, let's just let it run its course or auto approve if condition is met
         exp.status = 'approved';
         // auto-skip remaining if criteria met (optional, depending on rule strictness)
      } else {
         exp.status = 'pending';
      }
    }

    setDb('expenses', expenses);
  }
};
