"use client";

import React, { useState, useEffect } from 'react';
import { UploadCloud, Loader2, CheckCircle, Receipt, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from './LanguageContext';
import toast from 'react-hot-toast';

const Checkout = () => {
  const { lang } = useLanguage();
  const [cartItems, setCartItems] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const [paymentMethod, setPaymentMethod] = useState('kbzpay'); 
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [screenshotFile, setScreenshotFile] = useState(null); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generatedOrderNo, setGeneratedOrderNo] = useState('');

  // --- HAPTIC FEEDBACK HELPER ---
  const triggerHaptic = (pattern = 50) => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  };

  useEffect(() => {
    fetchCartData();
  }, []);

  const fetchCartData = async () => {
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data, error } = await supabase
        .from('cart')
        .select('id, selected_option, quantity, games(*), gift_cards(*)')
        .eq('user_id', session.user.id);
        
      if (!error && data) {
        setCartItems(data);
        
        const total = data.reduce((sum, item) => {
          const isGift = !!item.gift_cards;
          let priceToUse = 0;
          
          if (isGift && item.selected_option) {
            priceToUse = Number(item.selected_option.price);
          } else if (item.games) {
            priceToUse = (item.games.discount_price || item.games.price);
          }
          
          return sum + (Number(priceToUse) * (item.quantity || 1));
        }, 0);
        
        setTotalPrice(total);
      }
    }
    setIsLoading(false);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      triggerHaptic(30); // Light tap on file select
      setScreenshotFile(e.target.files[0]);
      setScreenshotPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleConfirmPayment = async () => {
    if (!screenshotFile) {
      triggerHaptic(200); // Error buzz
      toast.error(lang === 'mm' ? "ငွေလွှဲပြေစာ ထည့်ပါ" : lang === 'zh' ? "请上传付款截图" : "Please upload your payment screenshot first!");
      return;
    }

    triggerHaptic(50); // Tap to indicate processing started
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const orderNo = 'NN' + Math.floor(100000 + Math.random() * 900000); 
      setGeneratedOrderNo(orderNo);

      const fileExt = screenshotFile.name.split('.').pop();
      const fileName = `receipt-${orderNo}-${Date.now()}.${fileExt}`;
      await supabase.storage.from('receipts').upload(fileName, screenshotFile);
      const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('orders').insert([{
        order_no: orderNo,
        user_id: session.user.id,
        customer_name: session.user.user_metadata?.full_name || session.user.email,
        total_price: totalPrice,
        screenshot_url: publicUrl,
        items: cartItems.map(item => {
          const isGift = !!item.gift_cards;
          const targetItem = isGift ? item.gift_cards : item.games;
          
          let priceToUse = 0;
          if (isGift) priceToUse = item.selected_option.price;
          else priceToUse = (targetItem.discount_price || targetItem.price);

          return { 
            id: targetItem.id,
            name: targetItem.name, 
            account_type: isGift ? item.selected_option.label : 'Game',
            price: priceToUse,
            quantity: item.quantity || 1,
            cover_image: targetItem.cover_image || targetItem.image 
          };
        }),
        status: 'pending',
        delivery_info: `Payment Method Used: KBZPAY`
      }]);
      if (dbError) throw dbError;

      await supabase.from('cart').delete().eq('user_id', session.user.id);
      window.dispatchEvent(new Event('cartUpdated'));

      triggerHaptic([100, 50, 100, 50, 100]); // Long celebratory vibration sequence
      setIsSuccess(true);
    } catch (error) {
      triggerHaptic(200); 
      toast.error(error.message || "Failed to submit payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasPreOrder = cartItems.some(item => 
    item.games?.collections && item.games.collections.some(c => c.toLowerCase().includes('pre-order') || c.toLowerCase().includes('preorder'))
  );

  if (isSuccess) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center animate-in zoom-in duration-500 bg-white dark:bg-[#121212] transition-colors">
        <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4 mb-6"><CheckCircle className="h-16 w-16 text-green-600 dark:text-green-500" /></div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white">Order Placed!</h2>
        <p className="mt-2 text-lg font-bold text-blue-600 dark:text-blue-400">Order No: {generatedOrderNo}</p>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          We are checking your payment. You can track your status in the "My Orders" menu.
        </p>
      </div>
    );
  }

  if (isLoading) return <div className="flex justify-center py-20 bg-white dark:bg-[#121212]"><Loader2 className="h-8 w-8 animate-spin text-[#e31818]" /></div>;

  return (
    <div className="flex flex-col px-4 pb-20 pt-2 animate-in fade-in duration-300 bg-white dark:bg-[#121212] min-h-screen transition-colors">
      
      {/* Order Summary */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#121212] p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-3 text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3">
          <img src="/order-summary.png" alt="Order Summary" className="h-6 w-6 object-contain" />
          {lang === 'mm' ? 'အော်ဒါ အကျဉ်းချုပ်' : lang === 'zh' ? '订单摘要' : 'Order Summary'}
        </h2>
        <div className="flex flex-col gap-4">
          {cartItems.map((item) => {
            const isGift = !!item.gift_cards;
            const targetItem = isGift ? item.gift_cards : item.games;
            const itemQty = item.quantity || 1;
            
            if (!targetItem) return null; 

            let itemPrice = 0;
            if (isGift) itemPrice = item.selected_option.price;
            else itemPrice = (targetItem.discount_price || targetItem.price);

            const totalItemPrice = Number(itemPrice) * itemQty;

            return (
              <div key={item.id} className="flex justify-between items-center bg-gray-50 dark:bg-[#0a0a0a] p-3 rounded-lg border border-gray-100 dark:border-gray-800 gap-2">
                <div className="flex flex-col truncate flex-1 pr-1">
                  <span className="text-sm font-bold text-gray-900 dark:text-white truncate leading-tight">{itemQty}x {targetItem?.name}</span>
                  {isGift && <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">{item.selected_option?.label}</span>}
                </div>
                <span className="text-sm font-black text-black dark:text-white whitespace-nowrap">{totalItemPrice.toLocaleString()} MMK</span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex justify-between border-t border-dashed border-gray-200 dark:border-gray-800 pt-4">
          <span className="font-bold text-gray-900 dark:text-white">Total</span>
          <span className="text-lg font-black text-[#e31818]">{totalPrice.toLocaleString()} MMK</span>
        </div>
      </div>

      {/* Payment Method Selection */}
      <div className="mt-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#121212] overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-[#0a0a0a]">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {lang === 'mm' ? 'ငွေပေးချေမည့် နည်းလမ်း' : lang === 'zh' ? '付款方式' : 'Payment Method'}
          </h2>
        </div>
        
        <div className="p-4">
          <label 
            onClick={() => { triggerHaptic(30); setPaymentMethod('kbzpay'); }}
            className="flex items-center justify-between p-4 rounded-xl border-2 border-green-500 bg-green-50/30 dark:bg-green-900/20 shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-100 p-1.5"><img src="/kbz_logo.png" alt="KBZPay Logo" className="max-h-full max-w-full object-contain" /></div>
              <div><p className="font-bold text-gray-900 dark:text-white text-base">KBZPay</p><p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5">0% commission rate</p></div>
            </div>
            <div className="w-6 h-6 rounded-full flex items-center justify-center border bg-green-500 border-green-500">
              <Check className="w-4 h-4 text-white" />
            </div>
          </label>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#121212]">
        <div className="bg-[#005fb8] p-4 text-center text-white border-b border-[#005fb8]">
          <p className="text-sm font-medium leading-relaxed">မိမိထံ ငွေပေးချေရန် KBZPay QR Scanner ကို အသုံးပြုပါ။</p>
        </div>
        <div className="flex flex-col items-center bg-[#005fb8] pb-8 pt-2">
          <div className="w-72 overflow-hidden rounded-xl bg-white p-2 shadow-2xl sm:w-80 border-2 border-[#005fb8]">
            <img src="/kbzpay.jpg" alt="KBZPay QR Code" className="w-full h-auto object-contain" onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/300?text=Missing+QR+Image"; }} />
          </div>
          <h3 className="mt-5 text-lg font-bold text-white tracking-wide">Nyi Nyi Min Thant</h3>
        </div>
        
        <div className="p-6 text-center bg-white dark:bg-[#121212]">
          <p className="mb-4 text-sm font-semibold text-gray-500 dark:text-gray-400 leading-relaxed px-4">
            After transferring the exact amount via <span className="font-bold text-black dark:text-white">KBZPay</span>, please upload a screenshot of your successful transaction.
          </p>
          <label className="relative flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#0a0a0a] px-4 py-8 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
            {screenshotPreview ? (
              <img src={screenshotPreview} alt="Receipt Preview" className="h-32 object-contain shadow-sm rounded-md" />
            ) : (
              <div className="flex flex-col items-center">
                <UploadCloud className="mb-2 h-8 w-8 text-gray-400 dark:text-gray-500" />
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Tap to Select Screenshot</span>
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
        </div>
      </div>

      <button onClick={handleConfirmPayment} disabled={isSubmitting || cartItems.length === 0} className="mt-6 w-full rounded-xl bg-[#e31818] py-4 font-bold text-white shadow-lg shadow-red-500/30 hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50 flex justify-center items-center gap-2">
        {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
        {isSubmitting 
          ? 'Processing...' 
          : (hasPreOrder 
              ? (lang === 'mm' ? 'ကြိုတင်မှာယူမည်' : lang === 'zh' ? '预购' : 'Proceed to Pre-Order') 
              : (lang === 'mm' ? 'ငွေပေးချေမှု အတည်ပြုမည်' : lang === 'zh' ? '确认付款' : 'Confirm Payment')
            )
        }
      </button>
    </div>
  );
};

export default Checkout;