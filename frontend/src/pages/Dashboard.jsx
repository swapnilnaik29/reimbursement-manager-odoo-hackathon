import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { dashboardApi } from '../api/dashboard.api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { DollarSign, FileText, CheckCircle2, Clock } from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (user.role === 'Admin' || user.role === 'Manager') {
          const data = await dashboardApi.getAdminStats();
          setStats(data);
        } else {
          const data = await dashboardApi.getEmployeeStats();
          setStats(data);
        }
      } catch (err) {
        console.error("Dashboard fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user]);

  if (loading) return <div className="loading-state">Loading dashboard...</div>;

  // Role-Based Views
  if (user.role === 'Admin') return <AdminDashboard stats={stats} />;
  if (user.role === 'Manager') return <ManagerDashboard stats={stats} />;
  return <EmployeeDashboard stats={stats} />;
}

// ── ADMIN VIEW ────────────────────────────────────────────────────────────
function AdminDashboard({ stats }) {
  const pendingCount = stats?.totalExpenses?.filter(e => e.status === 'Pending_Approval').length || 0;
  const approvedCount = stats?.totalExpenses?.filter(e => e.status === 'Approved').length || 0;
  
  return (
    <div className="dashboard">
      <h2 className="dashboard-title">Company Overview</h2>
      <div className="grid grid-cols-3">
        <StatCard title="Total Company Expenses" value={stats?.totalExpenses?.length || 0} icon={<FileText />} color="blue" />
        <StatCard title="Pending Approvals" value={pendingCount} icon={<Clock />} color="yellow" />
        <StatCard title="Fully Approved" value={approvedCount} icon={<CheckCircle2 />} color="green" />
      </div>
      
      <div className="grid grid-cols-2">
        <Card className="mt-8">
          <CardHeader><CardTitle>My Actionable Queue</CardTitle></CardHeader>
          <CardContent>
            {stats?.myQueue?.length === 0 ? (
              <p className="empty-text">Your queue is clear.</p>
            ) : (
              <ul className="dashboard-list">
                {stats?.myQueue?.map(q => (
                  <li key={q.id}>
                    <div>
                      <strong>{q.expense_id?.title}</strong>
                      <p>From: {q.expense_id?.submitted_by?.full_name}</p>
                    </div>
                    <span>{q.expense_id?.original_amount} {q.expense_id?.original_currency}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── MANAGER VIEW ──────────────────────────────────────────────────────────
function ManagerDashboard({ stats }) {
  const queueCount = stats?.myQueue?.length || 0;

  return (
    <div className="dashboard">
      <h2 className="dashboard-title">Manager Hub</h2>
      <div className="grid grid-cols-2">
        <StatCard title="Your Actionable Queue" value={queueCount} icon={<Clock />} color="yellow" />
        <StatCard title="Total Team Expenses Processed" value={stats?.totalExpenses?.length || 0} icon={<CheckCircle2 />} color="blue" />
      </div>
      
      <Card className="mt-8 full-width">
        <CardHeader><CardTitle>Pending Your Review</CardTitle></CardHeader>
        <CardContent>
           {stats?.myQueue?.length === 0 ? (
              <p className="empty-text">No expenses pending your approval.</p>
            ) : (
              <ul className="dashboard-list">
                {stats?.myQueue?.map(q => (
                  <li key={q.id}>
                    <div>
                      <strong>{q.expense_id?.title}</strong>
                      <p>From: {q.expense_id?.submitted_by?.full_name}</p>
                    </div>
                    <span>{q.expense_id?.original_amount} {q.expense_id?.original_currency}</span>
                  </li>
                ))}
              </ul>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── EMPLOYEE VIEW ─────────────────────────────────────────────────────────
function EmployeeDashboard({ stats }) {
  const myPending = stats?.totalExpenses?.filter(e => e.status === 'Pending_Approval' || e.status === 'Pending').length || 0;
  const myDrafts = stats?.totalExpenses?.filter(e => e.status === 'Draft').length || 0;

  return (
    <div className="dashboard">
      <h2 className="dashboard-title">My Reimbursements</h2>
      <div className="grid grid-cols-3">
        <StatCard title="Total Submitted" value={stats?.totalExpenses?.length || 0} icon={<FileText />} color="blue" />
        <StatCard title="Pending Review" value={myPending} icon={<Clock />} color="yellow" />
        <StatCard title="Drafts (Action Req)" value={myDrafts} icon={<CheckCircle2 />} color="green" />
      </div>

      <Card className="mt-8 full-width">
        <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
        <CardContent>
           {stats?.totalExpenses?.length === 0 ? (
              <p className="empty-text">You have not submitted any expenses yet.</p>
            ) : (
              <ul className="dashboard-list">
                {stats?.totalExpenses?.slice(0,5).map(e => (
                  <li key={e.id || e._id}>
                    <div>
                      <strong>{e.title}</strong>
                      <p className={`status-text status-${e.status.toLowerCase()}`}>{e.status.replace('_', ' ')}</p>
                    </div>
                    <span>{e.original_amount} {e.original_currency}</span>
                  </li>
                ))}
              </ul>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── HELPERS ──────────────────────────────────────────────────────────────
function StatCard({ title, value, icon, color }) {
  return (
    <Card className="stat-card">
      <CardContent className="stat-card-content">
        <div className="stat-text">
          <p className="stat-title">{title}</p>
          <h3 className="stat-value">{value}</h3>
        </div>
        <div className={`stat-icon icon-${color}`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
