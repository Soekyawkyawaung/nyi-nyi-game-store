"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, Loader2, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const Cart = ({ onBack, onCheckout }) => {
  const [cartItems, setCartItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setIsLoading(false);
      return;
    }

    // Fetch cart joined with game details
    const { data, error } = await supabase
      .from('cart')
      .select('id, game_id, games(*)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCartItems(data);
      calculateTotal(data);
    }
    setIsLoading(false);
  };

  const calculateTotal = (items) => {
    const total = items.reduce((sum, item) => {
      const price = item.games.discount_price || item.games.price;
      return sum + Number(price);
    }, 0);
    setTotalPrice(total);
  };

  const handleRemove = async (cartId) => {
    const { error } = await supabase.from('cart').delete().eq('id', cartId);
    if (error) {
      toast.error("Could not remove item.");
    } else {
      toast.success("Removed from cart");
      const newCart = cartItems.filter(item => item.id !== cartId);
      setCartItems(newCart);
      calculateTotal(newCart);
      window.dispatchEvent(new Event('cartUpdated')); // Update header cart number
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 pb-28 animate-in slide-in-from-right duration-300">
      <div className="sticky top-0 z-50 flex items-center bg-white px-4 py-4 shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-all">
          <ArrowLeft className="h-6 w-6 text-gray-800" />
        </button>
        <h1 className="ml-2 text-xl font-black text-gray-900">Shopping Cart</h1>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div>
        ) : cartItems.length === 0 ? (
          <div className="text-center py-20">
            <h2 className="text-lg font-bold text-gray-900">Your cart is empty</h2>
            <p className="text-sm text-gray-500 mt-2">Looks like you haven't added any games yet.</p>
            <button onClick={onBack} className="mt-6 rounded-xl bg-[#e31818] px-6 py-3 font-bold text-white">Start Shopping</button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {cartItems.map((item) => (
              <div key={item.id} className="flex overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm p-3 gap-3">
                <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                  <img src={item.games.cover_image} alt={item.games.name} className="h-full w-full object-cover" />
                </div>
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 leading-tight">{item.games.name}</h3>
                    <p className="mt-1 text-sm font-extrabold text-[#e31818]">{item.games.discount_price || item.games.price} MMK</p>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={() => handleRemove(item.id)} className="text-xs font-bold text-gray-500 hover:text-red-600 flex items-center gap-1">
                      <Trash2 className="h-4 w-4" /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOTTOM CHECKOUT BAR */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 mx-auto max-w-md bg-white border-t border-gray-200 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50">
          <div className="flex justify-between items-end mb-4">
            <span className="text-sm font-bold text-gray-500">Total Total</span>
            <span className="text-2xl font-black text-[#e31818]">{totalPrice.toLocaleString()} MMK</span>
          </div>
          <button onClick={onCheckout} className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#e31818] py-4 font-bold text-white shadow-lg shadow-red-500/30 hover:bg-red-700 active:scale-95 transition-all">
            <CreditCard className="h-5 w-5" /> Proceed to Checkout
          </button>
        </div>
      )}
    </div>
  );
};

export default Cart;