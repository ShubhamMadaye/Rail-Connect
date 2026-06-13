'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { bookingsAPI, foodAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Utensils, ChefHat, ShoppingCart, Plus, Minus, Trash2, Loader2, Check, Clock, ArrowRight, Star, CreditCard, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface CartItem { foodItemId: string; name: string; price: number; quantity: number; category: string; isVeg: boolean; }

export default function FoodPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [booking, setBooking] = useState<any>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState<'vendors' | 'menu' | 'orders' | 'payment'>('vendors');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentStatus, setPaymentStatus] = useState<'' | 'processing' | 'success'>('');

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    const init = async () => {
      try {
        const [bRes, vRes, oRes] = await Promise.all([
          bookingsAPI.getById(bookingId),
          foodAPI.getAllVendors(),
          foodAPI.getOrdersForBooking(bookingId),
        ]);
        setBooking(bRes.data.booking);
        setVendors(vRes.data.vendors);
        setOrders(oRes.data.orders);
        if (oRes.data.orders.length > 0) setView('orders');
      } catch { toast.error('Failed to load food data'); }
      finally { setLoading(false); }
    };
    init();
  }, [bookingId, user]);

  const addToCart = (item: any) => {
    setCart(c => {
      const existing = c.find(ci => ci.foodItemId === item.id);
      if (existing) return c.map(ci => ci.foodItemId === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci);
      return [...c, { foodItemId: item.id, name: item.name, price: item.price, quantity: 1, category: item.category, isVeg: item.isVeg }];
    });
  };

  const removeFromCart = (foodItemId: string) => {
    setCart(c => {
      const existing = c.find(ci => ci.foodItemId === foodItemId);
      if (existing && existing.quantity > 1) return c.map(ci => ci.foodItemId === foodItemId ? { ...ci, quantity: ci.quantity - 1 } : ci);
      return c.filter(ci => ci.foodItemId !== foodItemId);
    });
  };

  const cartCount = (id: string) => cart.find(c => c.foodItemId === id)?.quantity || 0;
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const initiatePayment = () => {
    if (!cart.length) return toast.error('Cart is empty');
    setView('payment');
  };

  const processPaymentAndOrder = async () => {
    setPaymentStatus('processing');
    
    // Simulate payment delay
    await new Promise(res => setTimeout(res, 2000));
    setPaymentStatus('success');
    await new Promise(res => setTimeout(res, 800));

    try {
      const r = await foodAPI.placeOrder({
        bookingId,
        vendorId: selectedVendor.id,
        items: cart,
        coachSeat: booking?.coachNumber,
      });
      toast.success('Order placed! Food will be delivered to your seat');
      setOrders(o => [r.data.order, ...o]);
      setCart([]);
      setView('orders');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to place order');
    } finally { 
      setPaymentStatus(''); 
    }
  };

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      Placed: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
      Preparing: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
      OutForDelivery: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
      Delivered: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
      Cancelled: 'text-red-400 bg-red-400/10 border-red-400/20',
    };
    return map[status] || 'text-slate-400 bg-slate-400/10 border-slate-400/20';
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
    </div>
  );

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Utensils className="w-8 h-8 text-emerald-400" />
          In-Train Food Order
        </h1>
        {booking && (
          <p className="text-slate-400 mt-1">
            {booking.train?.name} · {booking.fromStation} → {booking.toStation} · Coach {booking.coachNumber}
          </p>
        )}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'vendors', label: 'Restaurants', icon: <ChefHat className="w-4 h-4" /> },
          { key: 'orders', label: `My Orders${orders.length ? ` (${orders.length})` : ''}`, icon: <Check className="w-4 h-4" /> },
        ].map(tab => (
          <button key={tab.key} onClick={() => setView(tab.key as any)}
            className={`btn-secondary text-sm py-2 gap-2 ${view === tab.key ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50' : ''}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Vendors view */}
      {view === 'vendors' && !selectedVendor && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vendors.map(vendor => (
            <button key={vendor.id} onClick={() => { setSelectedVendor(vendor); setView('menu' as any); }}
              className="glass rounded-2xl p-5 text-left card-hover border border-slate-700/50 hover:border-indigo-500/30 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-white">{vendor.name}</h3>
                  <p className="text-slate-400 text-sm">{vendor.cuisine}</p>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <Star className="w-3 h-3 text-emerald-400 fill-current" />
                  <span className="text-emerald-400 text-xs font-bold">{vendor.rating}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  {vendor.station?.name} · {vendor.menuItems?.length} items
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${vendor.isOpen ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-red-400 bg-red-400/10 border-red-400/20'}`}>
                  {vendor.isOpen ? 'Open' : 'Closed'}
                </span>
              </div>
            </button>
          ))}
          {vendors.length === 0 && (
            <div className="col-span-2 text-center py-12 text-slate-500">
              <Utensils className="w-12 h-12 mx-auto mb-3 text-slate-700" />
              No food vendors available right now
            </div>
          )}
        </div>
      )}

      {/* Menu view */}
      {(view === 'menu' || (view === 'vendors' && selectedVendor)) && selectedVendor && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => { setSelectedVendor(null); setView('vendors'); }}
              className="text-indigo-400 hover:text-indigo-300 text-sm">← Back</button>
            <h2 className="text-xl font-bold text-white">{selectedVendor.name}</h2>
            <span className="text-slate-400 text-sm">{selectedVendor.cuisine}</span>
          </div>

          {/* Group by category */}
          {['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Beverages', 'Desserts'].map(cat => {
            const items = selectedVendor.menuItems?.filter((item: any) => item.category === cat && item.isAvailable) || [];
            if (!items.length) return null;
            return (
              <div key={cat} className="mb-6">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">{cat}</h3>
                <div className="space-y-2">
                  {items.map((item: any) => (
                    <div key={item.id} className="glass rounded-xl p-4 flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 ${item.isVeg ? 'border-emerald-500' : 'border-red-500'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          </span>
                          <span className="text-white font-medium text-sm">{item.name}</span>
                        </div>
                        {item.description && <p className="text-slate-500 text-xs mt-0.5 ml-5">{item.description}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-white font-bold text-sm">₹{item.price}</span>
                        {cartCount(item.id) === 0 ? (
                          <button onClick={() => addToCart(item)}
                            className="btn-primary text-xs py-1.5 px-3">Add</button>
                        ) : (
                          <div className="flex items-center gap-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30 px-2 py-1">
                            <button onClick={() => removeFromCart(item.id)} className="text-indigo-300 hover:text-white">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-white font-bold text-sm w-4 text-center">{cartCount(item.id)}</span>
                            <button onClick={() => addToCart(item)} className="text-indigo-300 hover:text-white">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Cart */}
          {cart.length > 0 && (
            <div className="sticky bottom-6 mt-6">
              <div className="glass rounded-2xl p-4 border border-indigo-500/30 shadow-2xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-indigo-400" />
                    <span className="text-white font-semibold">{cart.reduce((s, i) => s + i.quantity, 0)} items</span>
                  </div>
                  <span className="text-white font-bold">₹{cartTotal}</span>
                </div>
                <button onClick={initiatePayment} className="btn-primary w-full justify-center py-3">
                  Proceed to Pay · ₹{cartTotal}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Simulated Payment View */}
      {view === 'payment' && (
        <div className="max-w-md mx-auto mt-4">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setView('menu')} disabled={paymentStatus !== ''}
              className="text-indigo-400 hover:text-indigo-300 text-sm disabled:opacity-50">← Back</button>
            <h2 className="text-xl font-bold text-white">Complete Payment</h2>
          </div>

          <div className="glass rounded-2xl p-6 mb-6 text-center border border-indigo-500/30">
            <p className="text-slate-400 text-sm mb-1">Total Amount Payable</p>
            <div className="text-4xl font-bold text-white">₹{cartTotal}</div>
            <p className="text-indigo-300 text-xs mt-2">Paying to {selectedVendor?.name}</p>
          </div>

          <div className="space-y-3 mb-8">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Pay using</h3>
            
            {[
              { id: 'UPI', name: 'UPI (GPay, PhonePe, Paytm)', icon: <Smartphone className="w-5 h-5" /> },
              { id: 'Card', name: 'Credit / Debit Card', icon: <CreditCard className="w-5 h-5" /> },
              { id: 'NetBanking', name: 'Net Banking', icon: <img src="https://upload.wikimedia.org/wikipedia/commons/c/cc/SBI-logo.svg" alt="bank" className="w-5 h-5 opacity-50 sepia brightness-50" /> },
            ].map(method => (
              <div key={method.id} 
                onClick={() => paymentStatus === '' && setPaymentMethod(method.id)}
                className={`glass rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all border ${
                  paymentMethod === method.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700/50 hover:border-slate-600'
                } ${paymentStatus !== '' ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${paymentMethod === method.id ? 'text-indigo-400 bg-indigo-500/20' : 'text-slate-400 bg-slate-800/50'}`}>
                    {method.icon}
                  </div>
                  <span className="text-white font-medium">{method.name}</span>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === method.id ? 'border-indigo-500' : 'border-slate-600'}`}>
                  {paymentMethod === method.id && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
                </div>
              </div>
            ))}
          </div>

          {paymentStatus === '' && (
            <button onClick={processPaymentAndOrder} className="btn-primary w-full justify-center py-4 text-lg">
              Pay ₹{cartTotal} Securely
            </button>
          )}

          {paymentStatus === 'processing' && (
            <div className="flex flex-col items-center justify-center p-8 glass rounded-2xl border border-indigo-500/30">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-1">Processing Payment...</h3>
              <p className="text-slate-400 text-smtext-center">Please do not close this window</p>
            </div>
          )}

          {paymentStatus === 'success' && (
            <div className="flex flex-col items-center justify-center p-8 glass rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
              <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center mb-4">
                <Check className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-emerald-400 mb-1">Payment Successful!</h3>
              <p className="text-emerald-500/70 text-sm text-center">Confirming your order...</p>
            </div>
          )}
        </div>
      )}

      {/* Orders view */}
      {view === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingCart className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400">No food orders yet</p>
              <button onClick={() => setView('vendors')} className="btn-primary mt-4">Browse Restaurants</button>
            </div>
          ) : orders.map(order => {
            const items = JSON.parse(order.items || '[]');
            return (
              <div key={order.id} className="glass rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-white font-bold">{order.vendor?.name}</h3>
                    <p className="text-slate-400 text-sm">{new Date(order.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${statusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                <div className="space-y-1 mb-4">
                  {items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-slate-300">{item.name} × {item.quantity}</span>
                      <span className="text-slate-400">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                  <span className="text-slate-400 text-sm">Total</span>
                  <span className="text-white font-bold">₹{order.totalAmount}</span>
                </div>
                {order.status !== 'Delivered' && (
                  <div className="mt-3 flex gap-2 items-center text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    {order.status === 'Placed' && 'Order received, preparing soon...'}
                    {order.status === 'Preparing' && 'Your food is being prepared...'}
                    {order.status === 'OutForDelivery' && 'On the way to your seat!'}
                  </div>
                )}
              </div>
            );
          })}
          <button onClick={() => setView('vendors')} className="btn-secondary w-full justify-center py-3">
            <Plus className="w-4 h-4" /> Order More
          </button>
        </div>
      )}
    </div>
  );
}
