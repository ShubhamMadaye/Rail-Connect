import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AIAssistant from "@/components/AIAssistant";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "RailConnect — India's Smart Railway Booking",
  description: "Book train tickets, track delays in real-time, order food on board, and manage your travel with RailConnect.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${plusJakarta.variable} font-sans bg-[#03061A] text-white antialiased`} suppressHydrationWarning>
        <AuthProvider>
          <Navbar />
          <main className="min-h-screen relative z-10">{children}</main>
          <Footer />
          <AIAssistant />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#080D24',
                color: '#F1F5FF',
                border: '1px solid rgba(99,102,241,0.25)',
                fontFamily: 'var(--font-sans)',
                borderRadius: '0.75rem',
                fontSize: '0.875rem',
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#080D24' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: '#080D24' } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
