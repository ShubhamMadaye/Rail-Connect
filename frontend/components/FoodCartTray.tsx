'use client';

import { useState } from 'react';
import { Utensils, Star, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FoodCartTray() {
  const [activeTab, setActiveTab] = useState<'meals' | 'drinks'>('meals');
  const [quantities, setQuantities] = useState<Record<string, number>>({
    m1: 0,
    m2: 0,
    m3: 0,
    d1: 0,
    d2: 0,
  });

  const foodItems = {
    meals: [
      { id: 'm1', name: 'Veg Premium Thali', price: 120, rating: 4.8, isVeg: true, desc: 'Dal, Paneer Sabzi, Roti, Rice' },
      { id: 'm2', name: 'Chicken Biryani Special', price: 150, rating: 4.9, isVeg: false, desc: 'Fragrant basmati rice & chicken' },
      { id: 'm3', name: 'Cheese Club Sandwich', price: 60, rating: 4.5, isVeg: true, desc: 'Fresh vegetables with cheese' },
    ],
    drinks: [
      { id: 'd1', name: 'Ginger Masala Tea', price: 20, rating: 4.7, isVeg: true, desc: 'Fresh ginger cardamom blend' },
      { id: 'd2', name: 'Filter Coffee Special', price: 25, rating: 4.6, isVeg: true, desc: 'Rich South Indian roast' },
    ]
  };

  const updateQty = (id: string, delta: number) => {
    setQuantities(prev => {
      const currentQty = prev[id] || 0;
      const nextQty = Math.max(0, currentQty + delta);
      if (delta > 0) {
        const item = [...foodItems.meals, ...foodItems.drinks].find(i => i.id === id);
        if (item) {
          toast.success(`${item.name} added!`, { id: 'food-tray' });
        }
      }
      return { ...prev, [id]: nextQty };
    });
  };

  const totalItems = Object.values(quantities).reduce((a, b) => a + b, 0);
  const totalPrice = Object.entries(quantities).reduce((acc, [id, qty]) => {
    const item = [...foodItems.meals, ...foodItems.drinks].find(i => i.id === id);
    return acc + (item ? item.price * qty : 0);
  }, 0);

  const clearCart = () => {
    setQuantities({ m1: 0, m2: 0, m3: 0, d1: 0, d2: 0 });
    toast.success('Cart cleared', { id: 'food-tray' });
  };

  return (
    <div className="glass rounded-3xl p-5 flex flex-col justify-between border border-white/10 h-full">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Utensils className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">On-Board Meal Tray</span>
          </div>
          {totalItems > 0 && (
            <button onClick={clearCart} className="text-slate-550 hover:text-red-400 transition-colors p-1" title="Clear selection">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <p className="text-[10px] text-slate-500 mb-3 leading-tight">Pre-add meals for direct seat-berth dispatching.</p>

        {/* Categories tabs */}
        <div className="flex border-b border-white/5 mb-3">
          {[
            { id: 'meals', label: 'Main Meals' },
            { id: 'drinks', label: 'Beverages' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-1.5 px-3 text-[10px] font-bold transition-all relative ${
                activeTab === tab.id ? 'text-indigo-400 font-black' : 'text-slate-500'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-500" />
              )}
            </button>
          ))}
        </div>

        {/* Items List */}
        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 no-scrollbar">
          {foodItems[activeTab].map(item => {
            const qty = quantities[item.id] || 0;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 rounded-xl border border-white/5 transition-all text-left bg-slate-950/20 hover:border-slate-800"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {/* Veg indicator dot */}
                    <span className={`w-2.5 h-2.5 rounded border flex items-center justify-center flex-shrink-0 ${
                      item.isVeg ? 'border-emerald-500' : 'border-red-500'
                    }`}>
                      <span className={`w-1 h-1 rounded-full ${item.isVeg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    </span>
                    <span className="text-[11px] font-bold text-white truncate leading-tight">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] text-slate-500 leading-tight truncate">{item.desc}</span>
                    <span className="flex items-center gap-0.5 text-amber-500 text-[8px] shrink-0 font-bold">
                      <Star className="w-2 h-2 fill-current" /> {item.rating}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono font-bold text-slate-400">₹{item.price}</span>
                  
                  {qty === 0 ? (
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      className="bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 hover:border-transparent rounded-lg px-2.5 py-1 text-[9px] font-bold transition-all"
                    >
                      Add
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/25 px-1.5 py-0.5">
                      <button onClick={() => updateQty(item.id, -1)} className="text-indigo-300 hover:text-white p-0.5">
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span className="text-white font-bold text-[10px] w-3 text-center font-mono leading-none">{qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="text-indigo-300 hover:text-white p-0.5">
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-900 pt-3 mt-4 flex items-center justify-between">
        <div>
          <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider block">Total summary</span>
          <div className="text-base font-extrabold text-white font-mono flex items-center gap-1.5 leading-none">
            ₹{totalPrice}
            {totalItems > 0 && (
              <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest font-sans">
                ({totalItems} items)
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            if (totalPrice === 0) {
              toast.error('Select meal items first!');
              return;
            }
            toast.success(`Tray confirmed! Proceed to checkout.`);
            window.location.href = '/food';
          }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-2 text-[10px] font-bold transition-all shadow-[0_4px_12px_rgba(79,70,229,0.25)] flex items-center gap-1"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          Checkout
        </button>
      </div>
    </div>
  );
}
