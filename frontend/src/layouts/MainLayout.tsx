import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  LayoutDashboard,
  Wallet,
  DollarSign,
  TrendingUp,
  Settings,
  LogOut,
  User,
  BarChart3,
  X,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { ThemeToggle } from '../components/ui/theme-toggle';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../store/slices/authSlice';
import { cn } from '../lib/utils';

const menuItems = [
  { text: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { text: 'Transactions', icon: DollarSign, path: '/transactions' },
  { text: 'Budgets', icon: Wallet, path: '/budgets' },
  { text: 'Analytics', icon: BarChart3, path: '/analytics' },
  { text: 'Net Worth', icon: TrendingUp, path: '/net-worth' },
  { text: 'Settings', icon: Settings, path: '/settings' },
];

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex h-16 items-center px-6 border-b border-border/50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-gradient">Spendly</h1>
        </div>
      </div>
      <nav className="flex-1 space-y-2 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.text}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
              className={cn(
                "w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group relative overflow-hidden",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-md"
              )}
            >
              <Icon className={cn(
                "mr-3 h-5 w-5 transition-transform duration-200",
                isActive ? "scale-110" : "group-hover:scale-105"
              )} />
              {item.text}
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/5 rounded-xl" />
              )}
            </button>
          );
        })}
      </nav>
      <div className="p-4">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/20">
          <h3 className="font-semibold text-sm mb-2">💡 Pro Tip</h3>
          <p className="text-xs text-muted-foreground">
            Set up automatic transaction imports to save time managing your finances.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden sm:flex sm:flex-col sm:w-64 bg-card/50 backdrop-blur-xl border-r border-border/50 shadow-xl">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={handleDrawerToggle} />
          <aside className="fixed left-0 top-0 h-full w-64 bg-card/95 backdrop-blur-xl border-r border-border/50 shadow-2xl">
            <div className="flex justify-end p-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDrawerToggle}
                className="rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              onClick={handleDrawerToggle}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="ml-2 text-lg font-semibold sm:ml-0">
              {menuItems.find((item) => item.path === location.pathname)?.text || 'Spendly'}
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            <ThemeToggle />
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {user?.full_name?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.full_name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 bg-gradient-to-br from-background via-background to-muted/20">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;