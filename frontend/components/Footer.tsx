'use client';
import Link from 'next/link';
import { Train, Mail, Phone, MapPin, ArrowUpRight } from 'lucide-react';

const platform = [
  { label: 'Search & Book', href: '/trains/search' },
  { label: 'Live Timetable', href: '/timetable' },
  { label: 'PNR Status', href: '/dashboard' },
  { label: 'Manage Bookings', href: '/dashboard' },
];

const services = [
  { label: 'In-Train Food Delivery', href: '/food' },
  { label: 'Retiring Rooms', href: '#' },
  { label: 'Mumbai Local Pass', href: '#' },
  { label: 'Corporate Travel', href: '#' },
];

export default function Footer() {
  return (
    <footer className="relative pt-20 pb-8 overflow-hidden" style={{ background: '#03061A', borderTop: '1px solid rgba(99,102,241,0.1)' }}>
      {/* Top gradient divider */}
      <div className="gradient-divider absolute top-0 left-0 right-0" />

      {/* Crossing train rail track detail */}
      <div className="absolute top-[1px] left-0 right-0 h-2 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 track-dots opacity-20" />
        <div className="absolute top-0.5 h-1.5 flex items-center animate-crossing-train">
          <div className="flex items-center gap-0.5">
            {/* Train Engine */}
            <div className="w-3.5 h-1 bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-r-sm" />
            <div className="w-0.5 h-[2px] bg-slate-500" />
            {/* Coach 1 */}
            <div className="w-3 h-1 bg-indigo-600 rounded-xs" />
            <div className="w-0.5 h-[2px] bg-slate-500" />
            {/* Coach 2 */}
            <div className="w-3 h-1 bg-indigo-600 rounded-xs" />
            <div className="w-0.5 h-[2px] bg-slate-500" />
            {/* Coach 3 */}
            <div className="w-3 h-1 bg-indigo-600 rounded-xs" />
          </div>
        </div>
      </div>

      {/* Ambient glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.05) 0%, transparent 70%)' }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-14">

          {/* Brand */}
          <div className="space-y-5 lg:col-span-1">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                <Train className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-extrabold text-xl" style={{
                  background: 'linear-gradient(135deg, #818cf8, #c084fc, #fcd34d)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  RailConnect
                </div>
                <div className="text-[9px] text-slate-600 tracking-widest uppercase font-medium">
                  Smart Booking Platform
                </div>
              </div>
            </Link>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
              India&apos;s most modern railway booking ecosystem — engineered for speed, designed for comfort, and built for millions.
            </p>
            {/* Social icons */}
            <div className="flex gap-3">
              {[
                { icon: <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />, label: 'Twitter' },
                { icon: <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" />, label: 'Facebook' },
                { icon: <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />, label: 'Instagram' },
              ].map(({ icon, label }) => (
                <a key={label} href="#" aria-label={label}
                  className="social-icon w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110"
                >
                  <svg className="w-3.5 h-3.5 fill-current text-slate-400 group-hover:text-indigo-400" viewBox="0 0 24 24">{icon}</svg>
                </a>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div>
            <h3 className="text-white font-bold mb-5 text-sm uppercase tracking-widest">Platform</h3>
            <ul className="space-y-3">
              {platform.map(({ label, href }) => (
                <li key={label}>
                  <Link href={href}
                    className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-400 text-sm transition-all duration-200 group">
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity -ml-4 group-hover:ml-0" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-white font-bold mb-5 text-sm uppercase tracking-widest">Services</h3>
            <ul className="space-y-3">
              {services.map(({ label, href }) => (
                <li key={label}>
                  <Link href={href}
                    className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-400 text-sm transition-all duration-200 group">
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity -ml-4 group-hover:ml-0" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-bold mb-5 text-sm uppercase tracking-widest">Help & Support</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-slate-500 text-sm">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <Phone className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <span>139 (24×7 Customer Care)<br />
                  <span className="text-slate-600 text-xs">1800-111-139 (Tourism)</span>
                </span>
              </li>
              <li className="flex items-center gap-3 text-slate-500 text-sm">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <Mail className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                care@railconnect.com
              </li>
              <li className="flex items-start gap-3 text-slate-500 text-sm">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                Rail Bhavan, Raisina Road<br />
                <span className="text-slate-600 text-xs">Mumbai, 400001</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-600 text-xs text-center md:text-left">
            © {new Date().getFullYear()} RailConnect Enterprises Pvt. Ltd. Not affiliated with official IRCTC.
          </p>
          <div className="flex gap-5">
            {['Privacy Policy', 'Terms of Service', 'Refund Policy'].map(label => (
              <Link key={label} href="#"
                className="text-slate-600 hover:text-slate-400 text-xs transition-colors">
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
