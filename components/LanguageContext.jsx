"use client";
import React, { createContext, useState, useEffect, useContext } from 'react';

const LanguageContext = createContext();

export const translations = {
  en: {
    store: "Store",
    cart: "Cart",
    wishlist: "Wishlist",
    orders: "My Orders",
    profile: "Profile",
    admin: "Admin Panel",
    logout: "Log Out",
    signIn: "Sign In",
    search: "Search games & gift cards...",
    terms: "Terms & Conditions",
    hotline: "Hotline",
    customer_support: "Customer Support",
  },
  mm: {
    store: "စတိုး",
    cart: "စျေးဝယ်ခြင်း",
    wishlist: "သိမ်းဆည်းထားသောဂိမ်းများ",
    orders: "အော်ဒါများ",
    profile: "ပရိုဖိုင်",
    admin: "စီမံခန့်ခွဲသူ",
    logout: "အကောင့်ထွက်ရန်",
    signIn: "အကောင့်ဝင်ရန်",
    search: "ဂိမ်းများရှာရန်...",
    terms: "စည်းကမ်းချက်များ",
    hotline: "ဆက်သွယ်ရန်",
    customer_support: "ဝယ်ယူသူဝန်ဆောင်မှု",
  },
  zh: {
    store: "商店",
    cart: "购物车",
    wishlist: "心愿单",
    orders: "我的订单",
    profile: "个人资料",
    admin: "管理员面板",
    logout: "登出",
    signIn: "登录",
    search: "搜索游戏...",
    terms: "条款和条件",
    hotline: "热线电话",
    customer_support: "客户支持",
  }
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem('nyinyi_lang');
    if (savedLang) setLang(savedLang);
    setMounted(true);
  }, []);

  const changeLang = (newLang) => {
    setLang(newLang);
    localStorage.setItem('nyinyi_lang', newLang);
  };

  const t = (key) => translations[lang][key] || translations['en'][key] || key;

  if (!mounted) return null;

  return (
    <LanguageContext.Provider value={{ lang, changeLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);