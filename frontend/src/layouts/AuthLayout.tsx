import React from 'react';
import { Outlet } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { ThemeToggle } from '../components/ui/theme-toggle';
import { DollarSign, Sparkles } from 'lucide-react';

const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-secondary/5 blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-accent/5 blur-3xl"></div>
      </div>

      {/* Theme toggle */}
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Brand header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-4 shadow-lg shadow-primary/25">
              <DollarSign className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-gradient flex items-center justify-center space-x-2">
              <span>Spendly</span>
              <Sparkles className="h-5 w-5 text-primary" />
            </h1>
            <p className="text-muted-foreground mt-2">Smart financial management</p>
          </div>

          <Card className="glass-effect shadow-2xl border-border/50">
            <CardContent className="p-8">
              <Outlet />
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-xs text-muted-foreground">
              © 2024 Spendly. Secure financial management.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;