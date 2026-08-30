import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { BarChart3, ArrowRight, Zap, Shield, TrendingUp, MessageSquare } from 'lucide-react';

export default function Landing() {
  const { user } = useAuth();

  const features = [
    { icon: MessageSquare, title: 'Conversational Intelligence', desc: 'Ask natural language questions about your business data and get instant, actionable insights.' },
    { icon: TrendingUp, title: 'Real-time Analytics', desc: 'Pipeline analysis, revenue tracking, and operational metrics calculated from live Monday.com data.' },
    { icon: Shield, title: 'Data Quality Awareness', desc: 'Every insight comes with data quality context — no hidden gaps or fabricated numbers.' },
    { icon: Zap, title: 'Cross-Board Analysis', desc: 'Correlate sales pipeline with operational execution across your Deals and Work Orders boards.' },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-primary-900)_0%,_transparent_50%)] opacity-40" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--color-accent-600)_0%,_transparent_50%)] opacity-20" />

      {/* Hero */}
      <div className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 mb-8">
            <Zap className="w-4 h-4 text-primary-400" />
            <span className="text-sm text-primary-300 font-medium">Powered by AI + Monday.com</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-extrabold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
              Skylark BI Agent
            </span>
          </h1>

          <p className="text-xl sm:text-2xl text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed">
            Turn your Monday.com business data into actionable insights with conversational AI intelligence.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to={user ? '/dashboard' : '/signup'}
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold text-lg shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all hover:scale-[1.02]"
            >
              Get Started
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-white/10 text-white font-semibold text-lg hover:bg-white/5 transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className="group p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <f.icon className="w-6 h-6 text-primary-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-white/50 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
