"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Menu, ShoppingCart, ShieldAlert } from 'lucide-react'; 
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const Header = ({ onSignInClick, onProfileClick, onAdminClick, onCartClick, onWishlistClick, onOrdersClick }) => { 
  const [user, setUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false); 
  const [cartCount, setCartCount] = useState(0); 

  const fetchCartCount = useCallback(async (userId) => {
    if (!userId) return;
    const { count, error } = await supabase
      .from('cart')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (!error) setCartCount(count || 0);
  }, []);

  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      if (session?.user) fetchCartCount(session.user.id);
    };
    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        fetchCartCount(session.user.id);
      } else {
        setCartCount(0);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchCartCount]);

  useEffect(() => {
    const handleCartUpdate = () => {
      if (user) fetchCartCount(user.id);
    };
    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, [user, fetchCartCount]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      toast.success("Logged out successfully.");
      setIsMenuOpen(false); 
    }
  };

  return (
    <header className="sticky top-0 z-[100] flex items-center justify-between bg-white px-4 py-3 shadow-sm border-b border-gray-100">
      
      <div className="flex items-center">
        <Menu className="h-6 w-6 text-gray-800 cursor-pointer active:scale-90 transition-transform" />
      </div>
      
      <div className="flex flex-1 items-center justify-center pl-4">
        <img src="/logo.jpg" alt="Nyi Nyi Game Store" className="h-10 w-auto object-contain" />
      </div>

      <div className="flex items-center gap-4">
        
        <div className="relative cursor-pointer active:scale-90 transition-transform" onClick={onCartClick}>
          <ShoppingCart className="h-6 w-6 text-gray-800" />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#e31818] text-[9px] font-bold text-white shadow-sm">
              {cartCount}
            </span>
          )}
        </div>

        {user ? (
          <div className="relative flex items-center">
            
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 border border-gray-200 hover:bg-gray-100 overflow-hidden transition-all active:scale-95">
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <img src="/profile.png" alt="Default Profile" className="h-5 w-5 object-contain opacity-70" />
              )}
            </button>

            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)}></div>
                
                <div className="absolute right-0 top-full mt-3 w-52 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl z-20 animate-in fade-in zoom-in duration-200 origin-top-right">
                  
                  <button onClick={() => { setIsMenuOpen(false); onProfileClick(); }} className="flex w-full items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors">
                    <img src="/profile.png" alt="Icon" className="h-5 w-5 object-contain" />
                    <span className="text-sm font-bold text-gray-700">My Profile</span>
                  </button>
                  
                  <button onClick={() => { setIsMenuOpen(false); onOrdersClick(); }} className="flex w-full items-center gap-3 border-t border-gray-50 px-4 py-3.5 hover:bg-gray-50 transition-colors">
                    <img src="/orders.png" alt="Icon" className="h-5 w-5 object-contain" />
                    <span className="text-sm font-bold text-gray-700">My Orders</span>
                  </button>

                  <button onClick={() => { setIsMenuOpen(false); onWishlistClick(); }} className="flex w-full items-center gap-3 border-t border-gray-50 px-4 py-3.5 hover:bg-gray-50 transition-colors">
                    <img src="/wishlist.png" alt="Icon" className="h-5 w-5 object-contain" />
                    <span className="text-sm font-bold text-gray-700">My Wishlist</span>
                  </button>

                  {user.email === 'kyone94@gmail.com' && (
                    <button onClick={() => { setIsMenuOpen(false); onAdminClick(); }} className="flex w-full items-center gap-3 border-t border-gray-50 bg-black px-4 py-3.5 hover:bg-gray-900 transition-colors">
                      <ShieldAlert className="h-5 w-5 text-white" />
                      <span className="text-sm font-bold text-white">Admin Panel</span>
                    </button>
                  )}
                  
                  <button onClick={handleLogout} className="flex w-full items-center gap-3 border-t border-gray-50 px-4 py-3.5 bg-red-50/30 hover:bg-red-50 transition-colors">
                    <img src="/log-out.png" alt="Icon" className="h-5 w-5 object-contain" />
                    <span className="text-sm font-bold text-red-600">Log Out</span>
                  </button>

                </div>
              </>
            )}
          </div>
        ) : (
          <button onClick={onSignInClick} className="rounded-full bg-[#e31818] px-5 py-2 text-sm font-bold text-white shadow-md active:scale-95 transition-all hover:bg-red-700">
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;