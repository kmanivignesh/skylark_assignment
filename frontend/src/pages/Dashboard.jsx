import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import {
  CheckCircle2, XCircle, Loader2, LinkIcon, Unlink,
  BarChart3, Briefcase, ClipboardList, Bot, Settings
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mondayStatus, setMondayStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const data = await api.getMondayStatus();
      setMondayStatus(data);
    } catch {
      setMondayStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const connected = mondayStatus?.connected;
  const boards = mondayStatus?.boards || {};

  return (
    <div className="min-h-screen pt-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Welcome back{user?.name ? `, ${user.name}` : ''}
          </h1>
          <p className="text-white/50 mt-1">Manage your data connections and start analyzing.</p>
        </div>

        {/* Monday.com Connection */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                connected
                  ? 'bg-green-500/10 border border-green-500/20'
                  : 'bg-white/5 border border-white/10'
              }`}>
                <LinkIcon className={`w-5 h-5 ${connected ? 'text-green-400' : 'text-white/40'}`} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Monday.com</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-white/20'}`} />
                  <span className={`text-sm ${connected ? 'text-green-400' : 'text-white/40'}`}>
                    {connected ? 'Connected via Server Config' : 'Not connected'}
                  </span>
                </div>
              </div>
            </div>
            
            {!connected && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
                <Settings className="w-4 h-4" />
                <span>Configuration Required</span>
              </div>
            )}
          </div>

          {/* Board status */}
          {connected ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <Briefcase className="w-5 h-5 text-primary-400" />
                <div>
                  <p className="text-sm font-medium text-white">Deals</p>
                  <p className="text-xs text-white/40">
                    {boards.deals ? `${boards.deals.itemCount} records` : 'Searching...'}
                  </p>
                </div>
                {boards.deals && <CheckCircle2 className="w-4 h-4 text-green-400 ml-auto" />}
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <ClipboardList className="w-5 h-5 text-accent-400" />
                <div>
                  <p className="text-sm font-medium text-white">Work Orders</p>
                  <p className="text-xs text-white/40">
                    {boards.workOrders ? `${boards.workOrders.itemCount} records` : 'Searching...'}
                  </p>
                </div>
                {boards.workOrders && <CheckCircle2 className="w-4 h-4 text-green-400 ml-auto" />}
              </div>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-sm text-white/60">
                To enable the AI Agent, you must configure your Monday.com API Token on the backend server.
              </p>
              <ol className="mt-3 list-decimal list-inside text-sm text-white/40 space-y-1">
                <li>Log into Monday.com &gt; Developers</li>
                <li>Go to <strong>My Access Tokens</strong> (or generate a Personal Access Token)</li>
                <li>Open <code className="bg-white/10 px-1 py-0.5 rounded text-white">backend/.env</code></li>
                <li>Set <code className="bg-white/10 px-1 py-0.5 rounded text-white">MONDAY_API_TOKEN=your_token</code></li>
                <li>Restart the backend server</li>
              </ol>
            </div>
          )}
        </div>

        {/* Open Agent CTA */}
        <button
          onClick={() => navigate('/agent')}
          disabled={!connected}
          className={`w-full p-6 rounded-2xl border transition-all flex items-center gap-4 group ${
            connected
              ? 'border-primary-500/20 bg-primary-500/5 hover:bg-primary-500/10 hover:border-primary-500/30 cursor-pointer'
              : 'border-white/5 bg-white/[0.01] cursor-not-allowed opacity-50'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-white">Open AI Agent</h3>
            <p className="text-sm text-white/40">
              {connected
                ? 'Ask questions about your pipeline, revenue, operations, and more'
                : 'Configure Monday.com API Token on the server first'}
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
