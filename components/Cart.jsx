"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, ShoppingCart, Loader2, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from './LanguageContext';
import toast from 'react-hot-toast';

const Cart = ({ onBack, onCheckout }) => {
  const { lang } = useLanguage();
  const [cartItems, setCartItems] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // --- HAPTIC FEEDBACK HELPER ---
  const triggerHaptic = (pattern = 50) => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data, error } = await supabase
          .from('cart')
          .select('id, selected_option, quantity, games(*), gift_cards(*)')
          .eq('user_id', session.user.id)
          .order('id', { ascending: true }); 

        if (error) throw error;

        if (data) {
          setCartItems(data);
          calculateTotal(data);
        }
      }
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  const calculateTotal = (items) => {
    const total = items.reduce((sum, item) => {
      const isGift = !!item.gift_cards;
      let priceToUse = 0;
      
      if (isGift && item.selected_option) {
        priceToUse = Number(item.selected_option.price);
      } else if (item.games) {
        priceToUse = item.games.discount_price || item.games.price;
      }
      
      return sum + (Number(priceToUse) * (item.quantity || 1));
    }, 0);
    
    setTotalPrice(total);
  };

  const handleRemoveItem = async (id) => {
    try {
      const { error } = await supabase.from('cart').delete().eq('id', id);
      if (error) throw error;
      
      const updatedCart = cartItems.filter(item => item.id !== id);
      setCartItems(updatedCart);
      calculateTotal(updatedCart);
      triggerHaptic([100, 50, 100]); // Heavy double tap for delete
      toast.success(lang === 'mm' ? "ဖယ်ရှားပြီးပါပြီ" : lang === 'zh' ? "已移除" : "Item removed");
      window.dispatchEvent(new Event('cartUpdated')); 
    } catch (error) { 
      triggerHaptic(200); 
      toast.error("Error"); 
    }
  };

  const handleUpdateQuantity = async (id, currentQty, change) => {
    const newQty = currentQty + change;
    if (newQty < 1) {
      triggerHaptic(200); // Error buzz if trying to go below 1
      return; 
    }

    triggerHaptic(30); // Light tap for quantity change

    const updatedCart = cartItems.map(item => item.id === id ? { ...item, quantity: newQty } : item);
    setCartItems(updatedCart);
    calculateTotal(updatedCart);

    try {
      const { error } = await supabase.from('cart').update({ quantity: newQty }).eq('id', id);
      if (error) throw error;
      window.dispatchEvent(new Event('cartUpdated')); 
    } catch (error) { toast.error("Error"); fetchCart(); }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-[#0a0a0a] transition-colors">
        <div className="sticky top-0 z-50 flex items-center bg-white dark:bg-[#121212] px-4 py-4 shadow-sm border-b border-gray-100 dark:border-gray-800">
          <button onClick={() => { triggerHaptic(30); onBack(); }} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><ArrowLeft className="h-6 w-6 text-gray-800 dark:text-gray-200" /></button>
          <h1 className="ml-2 text-lg font-black text-gray-900 dark:text-white">
            {lang === 'mm' ? 'သင်၏ စျေးခြင်းတောင်း' : lang === 'zh' ? '您的购物车' : 'Your Cart'}
          </h1>
        </div>
        <div className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#e31818]" /></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-[#0a0a0a] animate-in slide-in-from-right duration-300 pb-28 transition-colors">
      <div className="sticky top-0 z-50 flex items-center bg-white dark:bg-[#121212] px-4 py-4 shadow-sm border-b border-gray-100 dark:border-gray-800">
        <button onClick={() => { triggerHaptic(30); onBack(); }} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all"><ArrowLeft className="h-6 w-6 text-gray-800 dark:text-gray-200" /></button>
        <h1 className="ml-2 text-lg font-black text-gray-900 dark:text-white">
          {lang === 'mm' ? 'သင်၏ စျေးခြင်းတောင်း' : lang === 'zh' ? '您的购物车' : 'Your Cart'}
        </h1>
      </div>

      {cartItems.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="rounded-full bg-gray-200 dark:bg-gray-800 p-6 mb-4"><ShoppingCart className="h-10 w-10 text-gray-400 dark:text-gray-500" /></div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">
            {lang === 'mm' ? 'စျေးခြင်းတောင်းထဲတွင် ဘာမှမရှိပါ' : lang === 'zh' ? '您的购物车是空的' : 'Your cart is empty'}
          </h2>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-8">
            Looks like you haven't added any games or gift cards yet.
          </p>
          <button onClick={() => { triggerHaptic(30); onBack(); }} className="rounded-xl bg-[#e31818] px-8 py-3.5 font-bold text-white shadow-lg active:scale-95 transition-all hover:bg-red-700">
            {lang === 'mm' ? 'စျေးဆက်ဝယ်မည်' : lang === 'zh' ? '继续购物' : 'Continue Shopping'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col p-4">
          <div className="flex flex-col gap-4">
            {cartItems.map(item => {
              const isGift = !!item.gift_cards;
              const targetItem = isGift ? item.gift_cards : item.games;
              const itemQty = item.quantity || 1;
              if (!targetItem) return null; 

              const priceToUse = isGift ? (item.selected_option?.price || 0) : (targetItem.discount_price || targetItem.price);

              return (
                <div key={item.id} className="flex overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#121212] shadow-sm p-3 gap-3">
                  <div className="w-24 h-24 bg-gray-100 dark:bg-[#0a0a0a] flex items-center justify-center rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-800">
                    <img src={targetItem.cover_image || targetItem.image} alt={targetItem.name} className={`h-full w-full ${isGift ? 'object-contain' : 'object-cover'}`} />
                  </div>
                  
                  <div className="flex flex-1 flex-col justify-between py-1">
                    <div className="flex justify-between items-start">
                      <div className="pr-2">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{targetItem.name}</h3>
                        {isGift && <p className="text-[10px] font-black text-[#e31818] uppercase tracking-widest mt-1 mb-2">{item.selected_option?.label}</p>}
                        
                        <div className={`flex items-center gap-3 bg-gray-50 dark:bg-[#0a0a0a] rounded-full px-2 py-1 border border-gray-200 dark:border-gray-800 w-fit ${!isGift ? 'mt-2' : ''}`}>
                          <button onClick={() => handleUpdateQuantity(item.id, itemQty, -1)} disabled={itemQty <= 1} className="w-6 h-6 flex items-center justify-center rounded-full bg-white dark:bg-[#121212] text-gray-600 dark:text-gray-300 shadow-sm border border-gray-200 dark:border-gray-700 font-bold disabled:opacity-30 active:scale-95 transition-all">-</button>
                          <span className="text-xs font-black w-4 text-center text-gray-900 dark:text-white">{itemQty}</span>
                          <button onClick={() => handleUpdateQuantity(item.id, itemQty, 1)} className="w-6 h-6 flex items-center justify-center rounded-full bg-[#e31818] text-white shadow-sm font-bold active:scale-95 transition-all">+</button>
                        </div>
                      </div>
                      <button onClick={() => handleRemoveItem(item.id)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"><Trash2 className="h-5 w-5" /></button>
                    </div>
                    <div className="mt-3 text-right font-black text-[#e31818]">{(Number(priceToUse) * itemQty).toLocaleString()} MMK</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white dark:bg-[#121212] border-t border-gray-100 dark:border-gray-800 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50 transition-colors">
          <div className="mb-4 flex justify-between items-end px-1">
            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Total Total</span>
            <span className="text-2xl font-black text-[#e31818]">{totalPrice.toLocaleString()} MMK</span>
          </div>
          <button onClick={() => { triggerHaptic([50, 50, 50]); onCheckout(); }} className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#e31818] py-4 font-bold text-white shadow-lg shadow-red-500/30 hover:bg-red-700 active:scale-95 transition-all">
            <CreditCard className="h-5 w-5" /> 
            {lang === 'mm' ? 'ငွေပေးချေရန်' : lang === 'zh' ? '去结账' : 'PROCEED TO CHECKOUT'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Cart;