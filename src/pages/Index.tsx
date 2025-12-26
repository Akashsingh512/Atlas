import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TrendingUp, Users, MapPin, Phone, MessageCircle, BarChart3, ArrowRight } from 'lucide-react';

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 w-96 h-96 gradient-primary opacity-10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 gradient-accent opacity-10 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
        </div>

        {/* Header */}
        <header className="container py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-bold">LeadFlow</span>
          </div>
          <Link to="/auth">
            <Button variant="outline">Sign In</Button>
          </Link>
        </header>

        {/* Hero Content */}
        <div className="container py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight animate-fade-in">
              Manage Your Sales Leads{' '}
              <span className="text-gradient">Effortlessly</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.1s' }}>
              LeadFlow helps your sales team track, manage, and convert leads with powerful 
              location-based visibility, instant communication, and real-time analytics.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <Link to="/auth">
                <Button variant="gradient" size="xl" className="w-full sm:w-auto">
                  Get Started <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container">
          <h2 className="text-3xl font-display font-bold text-center mb-12">
            Everything You Need to Close More Deals
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Users, title: 'Role-Based Access', desc: 'Admins and sales users with tailored permissions and visibility.' },
              { icon: MapPin, title: 'Location Filtering', desc: 'Assign leads by location and control user access per area.' },
              { icon: Phone, title: 'One-Tap Calling', desc: 'Click to call leads directly from the app on any device.' },
              { icon: MessageCircle, title: 'WhatsApp Integration', desc: 'Send messages with customizable templates instantly.' },
              { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Track performance, conversions, and team productivity.' },
              { icon: TrendingUp, title: 'Follow-Up Tracking', desc: 'Never miss a follow-up with complete interaction history.' },
            ].map((feature, i) => (
              <div 
                key={feature.title} 
                className="p-6 bg-card rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 animate-slide-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-display font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© 2024 LeadFlow. Built for sales teams.</p>
        </div>
      </footer>
    </div>
  );
}
