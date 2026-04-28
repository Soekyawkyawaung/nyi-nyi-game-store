"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Menu, ShoppingCart, ShieldAlert, X, FileText, Phone, User, Package, Heart, LogOut, LogIn, Sun, Moon, Globe } from 'lucide-react'; 
import { supabase } from '../lib/supabase';
import { useTheme } from 'next-themes';
import { useLanguage } from './LanguageContext';
import toast from 'react-hot-toast';

const Header = ({ onSignInClick, onProfileClick, onAdminClick, onCartClick, onWishlistClick, onOrdersClick }) => { 
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false); 
  
  const [showTerms, setShowTerms] = useState(false);
  const [showHotline, setShowHotline] = useState(false);
  const [cartCount, setCartCount] = useState(0); 

  const { theme, setTheme } = useTheme();
  const { lang, changeLang, t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  const adminEmails = ['kyone94@gmail.com', 'arkar999126@gmail.com'];

  const fetchCartCount = useCallback(async (userId) => {
    if (!userId) return;
    const { data, error } = await supabase.from('cart').select('quantity').eq('user_id', userId);
    if (!error && data) {
      const count = data.reduce((sum, item) => sum + (item.quantity || 1), 0);
      setCartCount(count);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      if (session?.user) {
        setIsAdmin(adminEmails.includes(session.user.email));
        fetchCartCount(session.user.id);
      }
    };
    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        setIsAdmin(adminEmails.includes(session.user.email));
        fetchCartCount(session.user.id);
      } else {
        setIsAdmin(false);
        setCartCount(0);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchCartCount]);

  useEffect(() => {
    const handleCartUpdate = () => { if (user) fetchCartCount(user.id); };
    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, [user, fetchCartCount]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      toast.success(t('logout') + " successful.");
      setIsProfileMenuOpen(false); 
      setIsSidebarOpen(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-[100] flex items-center justify-between bg-white dark:bg-[#121212] px-4 py-3 shadow-sm border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
        
        {/* Left: Mobile Menu */}
        <div className="flex items-center">
          <Menu onClick={() => setIsSidebarOpen(true)} className="h-6 w-6 text-gray-800 dark:text-gray-200 cursor-pointer active:scale-90 transition-transform" />
        </div>
        
        {/* Center: Reverted to Logo Icon to save space */}
        <div className="flex flex-1 items-center justify-center cursor-pointer" onClick={() => window.scrollTo(0,0)}>
          <div className="h-9 w-9 overflow-hidden rounded-full border border-gray-200 dark:border-gray-700 bg-white flex items-center justify-center shadow-sm">
            <img src="/logo.jpg" alt="Logo" className="h-full w-full object-cover" />
          </div>
        </div>

        {/* Right: Theme Toggle, Cart, Sign In */}
        <div className="flex items-center gap-3">
          
          {mounted && (
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-1.5 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors active:scale-90">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          )}

          <div className="relative cursor-pointer active:scale-90 transition-transform p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full" onClick={onCartClick}>
            <ShoppingCart className="h-5 w-5 text-gray-800 dark:text-gray-200" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#e31818] text-[9px] font-bold text-white shadow-sm border border-white dark:border-[#121212]">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </div>

          {user ? (
            <div className="relative flex items-center">
              <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:opacity-80 overflow-hidden transition-all active:scale-95">
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-4 w-4 text-gray-500 dark:text-gray-300" />
                )}
              </button>

              {isProfileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsProfileMenuOpen(false)}></div>
                  <div className="absolute right-0 top-full mt-3 w-52 overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl z-20 animate-in fade-in zoom-in duration-200 origin-top-right">
                    
                    <button onClick={() => { setIsProfileMenuOpen(false); onProfileClick(); }} className="flex w-full items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-200">
                      <User className="h-5 w-5" /> <span className="text-sm font-bold">{t('profile')}</span>
                    </button>
                    
                    <button onClick={() => { setIsProfileMenuOpen(false); onOrdersClick(); }} className="flex w-full items-center gap-3 border-t border-gray-50 dark:border-gray-800 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-200">
                      <Package className="h-5 w-5" /> <span className="text-sm font-bold">{t('orders')}</span>
                    </button>

                    <button onClick={() => { setIsProfileMenuOpen(false); onWishlistClick(); }} className="flex w-full items-center gap-3 border-t border-gray-50 dark:border-gray-800 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-200">
                      <Heart className="h-5 w-5" /> <span className="text-sm font-bold">{t('wishlist')}</span>
                    </button>

                    {isAdmin && (
                      <button onClick={() => { setIsProfileMenuOpen(false); onAdminClick(); }} className="flex w-full items-center gap-3 border-t border-gray-800 bg-black dark:bg-white px-4 py-3.5 hover:opacity-90 transition-colors text-white dark:text-black">
                        <ShieldAlert className="h-5 w-5" /> <span className="text-sm font-bold">{t('admin')}</span>
                      </button>
                    )}
                    
                    <button onClick={handleLogout} className="flex w-full items-center gap-3 border-t border-gray-50 dark:border-gray-800 px-4 py-3.5 bg-red-50/30 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600 dark:text-red-500">
                      <LogOut className="h-5 w-5" /> <span className="text-sm font-bold">{t('logout')}</span>
                    </button>

                  </div>
                </>
              )}
            </div>
          ) : (
            <button onClick={onSignInClick} className="rounded-full bg-[#e31818] px-4 py-1.5 text-xs font-bold text-white shadow-md active:scale-95 transition-all hover:bg-red-700 whitespace-nowrap">
              {t('signIn')}
            </button>
          )}
        </div>
      </header>

      {/* --- MOBILE SIDEBAR --- */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[200] flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)}></div>
          
          <div className="relative w-64 max-w-sm bg-white dark:bg-[#121212] h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-[#0a0a0a]">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 overflow-hidden rounded-full border border-gray-200 dark:border-gray-700 bg-white flex items-center justify-center">
                  <img src="/logo.jpg" alt="Logo" className="h-full w-full object-cover" />
                </div>
                <h2 className="font-black text-lg tracking-tighter text-gray-900 dark:text-white">NYINYI<span className="text-[#e31818]">STORE</span></h2>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="flex flex-col flex-1 overflow-y-auto">
              
              {/* Language Selection Grid inside Sidebar */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col gap-3">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Language / ဘာသာစကား
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => { changeLang('en'); setIsSidebarOpen(false); }} className={`py-2 rounded-lg text-sm font-bold border transition-colors ${lang === 'en' ? 'bg-[#e31818] text-white border-[#e31818]' : 'bg-gray-50 dark:bg-[#0a0a0a] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}>EN</button>
                  <button onClick={() => { changeLang('mm'); setIsSidebarOpen(false); }} className={`py-2 rounded-lg text-sm font-bold border transition-colors ${lang === 'mm' ? 'bg-[#e31818] text-white border-[#e31818]' : 'bg-gray-50 dark:bg-[#0a0a0a] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}>MM</button>
                  <button onClick={() => { changeLang('zh'); setIsSidebarOpen(false); }} className={`py-2 rounded-lg text-sm font-bold border transition-colors ${lang === 'zh' ? 'bg-[#e31818] text-white border-[#e31818]' : 'bg-gray-50 dark:bg-[#0a0a0a] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}>ZH</button>
                </div>
              </div>

              <div className="p-4 flex flex-col gap-2">
                <button onClick={() => { setIsSidebarOpen(false); setShowTerms(true); }} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-left font-bold text-gray-900 dark:text-white transition-colors">
                  <FileText className="h-5 w-5 text-[#e31818]" /> {t('terms')}
                </button>
                
                <button onClick={() => { setIsSidebarOpen(false); setShowHotline(true); }} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-left font-bold text-gray-900 dark:text-white transition-colors">
                  <Phone className="h-5 w-5 text-[#e31818]" /> {t('hotline')}
                </button>

                <div className="border-t border-gray-100 dark:border-gray-800 my-2"></div>

                <button onClick={() => { setIsSidebarOpen(false); onCartClick(); }} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-left font-bold text-gray-900 dark:text-white transition-colors">
                  <div className="flex items-center gap-3">
                    <ShoppingCart className="h-5 w-5 text-gray-500 dark:text-gray-400" /> {t('cart')}
                  </div>
                  {cartCount > 0 && <span className="bg-[#e31818] text-white text-xs px-2 py-0.5 rounded-full">{cartCount}</span>}
                </button>
                
                {user && (
                  <>
                    <button onClick={() => { setIsSidebarOpen(false); onWishlistClick(); }} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-left font-bold text-gray-900 dark:text-white transition-colors">
                      <Heart className="h-5 w-5 text-gray-500 dark:text-gray-400" /> {t('wishlist')}
                    </button>
                    <button onClick={() => { setIsSidebarOpen(false); onOrdersClick(); }} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-left font-bold text-gray-900 dark:text-white transition-colors">
                      <Package className="h-5 w-5 text-gray-500 dark:text-gray-400" /> {t('orders')}
                    </button>
                    <button onClick={() => { setIsSidebarOpen(false); onProfileClick(); }} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-left font-bold text-gray-900 dark:text-white transition-colors">
                      <User className="h-5 w-5 text-gray-500 dark:text-gray-400" /> {t('profile')}
                    </button>
                  </>
                )}

                {isAdmin && (
                  <button onClick={() => { setIsSidebarOpen(false); onAdminClick(); }} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-left font-bold text-gray-900 dark:text-white transition-colors">
                    <ShieldAlert className="h-5 w-5 text-gray-900 dark:text-white" /> {t('admin')}
                  </button>
                )}

                <div className="mt-auto pt-4">
                  {user ? (
                    <button onClick={handleLogout} className="flex w-full items-center justify-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500 font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                      <LogOut className="h-5 w-5" /> {t('logout')}
                    </button>
                  ) : (
                    <button onClick={() => { setIsSidebarOpen(false); onSignInClick(); }} className="flex w-full items-center justify-center gap-2 p-3 rounded-xl bg-[#e31818] text-white font-bold hover:bg-red-700 transition-colors">
                      <LogIn className="h-5 w-5" /> {t('signIn')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {showTerms && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowTerms(false)}></div>
          <div className="relative bg-white dark:bg-[#121212] rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-[#e31818] rounded-t-2xl">
              <h3 className="font-bold text-white flex items-center gap-2"><FileText className="w-5 h-5" /> {t('terms')}</h3>
              <button onClick={() => setShowTerms(false)} className="p-1 rounded-full hover:bg-red-700"><X className="w-5 h-5 text-white" /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              <p className="text-sm font-bold text-gray-900 dark:text-white text-center border-b border-gray-100 dark:border-gray-800 pb-4 mb-4 leading-relaxed">
                Share အကောင့်ဖြစ်တာကြောင့် စည်းကမ်းချက်များကိုလိုက်နာရန်လိုအပ်ပါတယ်
              </p>
              <ul className="space-y-4 list-decimal pl-5 text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed marker:font-bold marker:text-[#e31818]">
                <li>Sign in ID နှင့် Password ကိုမပြောင်းရန် / ဂိမ်းအကောင့်ကို ပြန်လည်ရောင်းချခြင်း မပြုရန်</li>
                <li>ကစားသူအနေနဲ့ ကိုယ်ပိုင်အကောင့်မှာ ဂိမ်းကိုကစားရန်</li>
                <li>System version Update ကြောင့် GameLock ပုံပြသွားလျှင် ပေးထားသောအကောင့် ထဲဝင်ပြီး Activate ပြန်လည် ပြုလုပ်ရန်လိုအပ်ပါသည်</li>
                <li>ဝယ်ထားသောဂိမ်းများကို စက်ထဲထည့်ပြီးရောင်းချခဲ့ပါက ဂိမ်းအတွက် အာမခံနှင့်ငွေပြန်အမ်း ပေးမှာမဟုတ်ပါ</li>
              </ul>
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 rounded-b-2xl">
              <button onClick={() => setShowTerms(false)} className="w-full bg-black dark:bg-white text-white dark:text-black font-bold py-3.5 rounded-xl hover:opacity-80 active:scale-95 transition-all">
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {showHotline && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowHotline(false)}></div>
          <div className="relative bg-white dark:bg-[#121212] rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-[#e31818] rounded-t-2xl">
              <h3 className="font-bold text-white flex items-center gap-2"><Phone className="w-5 h-5" /> {t('customer_support')}</h3>
              <button onClick={() => setShowHotline(false)} className="p-1 rounded-full hover:bg-red-700"><X className="w-5 h-5 text-white" /></button>
            </div>
            <div className="p-6">
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4 text-center">If you have any issues, please call our hotline:</p>
              <a href="tel:09977677741" className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0a0a0a] rounded-xl border border-gray-200 dark:border-gray-800 hover:border-black dark:hover:border-white transition-all active:scale-95">
                <span className="font-black text-gray-900 dark:text-white tracking-widest text-lg">09 977 677 741</span>
                <span className="text-xs font-black text-white bg-green-600 px-3 py-1.5 rounded shadow-sm">CALL</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;