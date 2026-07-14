'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Train, Menu, X, User, LogOut, LayoutDashboard, Shield, Zap, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/trains/search', label: 'Search Trains' },
  { href: '/timetable', label: 'Live Timetable' },
  { href: '/food', label: 'Order Food' },
  { href: '/stations', label: 'Stations Directory' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    const loadNotifs = () => {
      const saved = localStorage.getItem('rail_notifications');
      if (saved) {
        setNotifications(JSON.parse(saved));
      } else {
        const defaults = [
          { id: 'n-1', message: 'Welcome to RailConnect. Search and book your journeys.', type: 'ticket', timestamp: new Date(Date.now() - 1000 * 60 * 10).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), read: false },
          { id: 'n-2', message: 'Train 12951 Mumbai Rajdhani delay prediction calculated: on-time.', type: 'delay', timestamp: new Date(Date.now() - 1000 * 60 * 30).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), read: false }
        ];
        localStorage.setItem('rail_notifications', JSON.stringify(defaults));
        setNotifications(defaults);
      }
    };
    loadNotifs();

    window.addEventListener('notifications-update', loadNotifs);
    return () => window.removeEventListener('notifications-update', loadNotifs);
  }, []);

  const markAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    localStorage.setItem('rail_notifications', JSON.stringify(updated));
    setNotifications(updated);
  };

  const clearNotifications = () => {
    localStorage.setItem('rail_notifications', JSON.stringify([]));
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/');
    setProfileOpen(false);
    setOpen(false);
  };

  return (
    <nav
      className="sticky top-0 z-50 transition-all duration-300"
      style={{
        background: scrolled
          ? 'rgba(11, 16, 32, 0.92)'
          : 'rgba(11, 16, 32, 0.7)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: scrolled ? '0 4px 40px rgba(0,0,0,0.4)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[68px] relative">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="relative w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
              <Train className="w-4.5 h-4.5 text-white" style={{ width: '18px', height: '18px' }} />
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: 'linear-gradient(135deg, #818cf8, #c084fc)', boxShadow: '0 0 20px rgba(139,92,246,0.6)' }} />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight" style={{
                background: 'linear-gradient(135deg, #818cf8, #c084fc, #fcd34d)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                RailConnect
              </span>
              <div className="text-[9px] text-slate-600 font-medium tracking-widest uppercase -mt-0.5">
                Smart Booking
              </div>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {navLinks.map(link => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
                  style={{
                    color: isActive ? '#a5b4fc' : '#64748b',
                    background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                  }}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-2/3 rounded-full"
                      style={{ background: 'linear-gradient(90deg, #6366f1, #f59e0b)' }} />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {user ? (
              <div className="flex items-center gap-3">
                {/* Notification Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => { setNotifOpen(o => !o); setProfileOpen(false); }}
                    className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full ring-2 ring-slate-900" />
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 top-full mt-2.5 w-80 rounded-2xl overflow-hidden shadow-2xl animate-fade-in-down z-50"
                      style={{
                        background: 'rgba(8,13,36,0.98)',
                        border: '1px solid rgba(99,102,241,0.2)',
                        backdropFilter: 'blur(24px)',
                      }}>
                      <div className="px-4 py-3 border-b border-slate-800/60 flex items-center justify-between">
                        <span className="text-white text-xs font-bold uppercase tracking-wider">Notifications</span>
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-6 text-center text-slate-500 text-xs">No active notifications</div>
                        ) : (
                          notifications.map(n => (
                            <div key={n.id} className="px-4 py-3 hover:bg-slate-800/40 border-b border-slate-800/40 transition-colors text-left">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-500 text-[9px] font-semibold tracking-wide uppercase">{n.type}</span>
                                <span className="text-[9px] text-slate-600 font-mono">{n.timestamp}</span>
                              </div>
                              <p className="text-slate-300 text-xs font-medium mt-1 leading-normal">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                      {notifications.length > 0 && (
                        <div className="p-2 bg-slate-900/40 border-t border-slate-800/60 text-center">
                          <button onClick={clearNotifications} className="text-[10px] text-slate-500 hover:text-slate-400 font-semibold transition-colors">
                            Clear all
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Profile menu */}
                <div className="relative">
                  <button
                    onClick={() => { setProfileOpen(p => !p); setNotifOpen(false); }}
                    className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl transition-all duration-200 group"
                    style={{ background: 'rgba(13,19,53,0.8)', border: '1px solid rgba(99,102,241,0.2)' }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                      {user.name[0].toUpperCase()}
                    </div>
                    <div className="text-left">
                      <div className="text-slate-200 text-xs font-semibold max-w-[90px] truncate">{user.name}</div>
                      <div className="text-slate-500 text-[10px]">{user.role === 'admin' ? 'Admin' : 'Passenger'}</div>
                    </div>
                  </button>

                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl overflow-hidden shadow-2xl animate-fade-in-down"
                    style={{
                      background: 'rgba(8,13,36,0.97)',
                      border: '1px solid rgba(99,102,241,0.2)',
                      backdropFilter: 'blur(20px)',
                    }}>
                    <div className="px-4 py-3 border-b border-slate-800/60">
                      <div className="text-white text-sm font-semibold">{user.name}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{user.email}</div>
                    </div>
                    <Link href="/dashboard" onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors">
                      <LayoutDashboard className="w-4 h-4 text-indigo-400" /> My Bookings
                    </Link>
                    {user.role === 'admin' && (
                      <Link href="/admin" onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors">
                        <Shield className="w-4 h-4 text-amber-400" /> Admin Panel
                      </Link>
                    )}
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors border-t border-slate-800/60">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
            ) : (
              <>
                <Link href="/login" className="btn-secondary text-sm py-2 px-4">Sign In</Link>
                <Link href="/register" className="btn-primary text-sm py-2 px-5">Get Started</Link>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
            onClick={() => setOpen(o => !o)}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden border-t border-slate-800/50 px-4 py-4 space-y-1 animate-fade-in-down"
          style={{ background: 'rgba(8,13,36,0.97)' }}>
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)}
              className="flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                color: pathname === link.href ? '#a5b4fc' : '#64748b',
                background: pathname === link.href ? 'rgba(99,102,241,0.12)' : 'transparent',
              }}>
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-slate-800/50 mt-2 space-y-1">
            {user ? (
              <>
                <Link href="/dashboard" onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/40 transition-all">
                  <LayoutDashboard className="w-4 h-4" /> My Bookings
                </Link>
                {user.role === 'admin' && (
                  <Link href="/admin" onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/40 transition-all">
                    <Shield className="w-4 h-4" /> Admin Panel
                  </Link>
                )}
                <button onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-400 rounded-xl hover:bg-red-500/10 transition-all">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </>
            ) : (
              <div className="flex gap-2 pt-1">
                <Link href="/login" onClick={() => setOpen(false)} className="btn-secondary text-sm py-2 flex-1 justify-center">Sign In</Link>
                <Link href="/register" onClick={() => setOpen(false)} className="btn-primary text-sm py-2 flex-1 justify-center">Get Started</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
