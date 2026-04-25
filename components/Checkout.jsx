"use client";

import React, { useState, useEffect } from 'react';
import { UploadCloud, Loader2, CheckCircle, Receipt } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const Checkout = () => {
  const [cartItems, setCartItems] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [screenshotFile, setScreenshotFile] = useState(null); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generatedOrderNo, setGeneratedOrderNo] = useState('');

  useEffect(() => {
    fetchCartData();
  }, []);

  const fetchCartData = async () => {
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data, error } = await supabase.from('cart').select('id, games(*)').eq('user_id', session.user.id);
      if (!error && data) {
        setCartItems(data);
        setTotalPrice(data.reduce((sum, item) => sum + Number(item.games.discount_price || item.games.price), 0));
      }
    }
    setIsLoading(false);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshotFile(e.target.files[0]);
      setScreenshotPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleConfirmPayment = async () => {
    if (!screenshotFile) {
      toast.error("Please upload your payment screenshot first!");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const orderNo = 'NN' + Math.floor(100000 + Math.random() * 900000);
      setGeneratedOrderNo(orderNo);

      const fileExt = screenshotFile.name.split('.').pop();
      const fileName = `receipt-${orderNo}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, screenshotFile);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('orders').insert([{
        order_no: orderNo,
        user_id: session.user.id,
        customer_name: session.user.user_metadata?.full_name || session.user.email,
        total_price: totalPrice,
        screenshot_url: publicUrl,
        items: cartItems.map(item => ({ 
          id: item.games.id,
          name: item.games.name, 
          price: item.games.discount_price || item.games.price, 
          cover_image: item.games.cover_image 
        })),
        status: 'pending'
      }]);
      if (dbError) throw dbError;

      await supabase.from('cart').delete().eq('user_id', session.user.id);
      window.dispatchEvent(new Event('cartUpdated'));

      setIsSuccess(true);
    } catch (error) {
      toast.error(error.message || "Failed to submit payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if any item in the cart is a pre-order
  const hasPreOrder = cartItems.some(item => 
    item.games.collections && item.games.collections.some(c => c.toLowerCase().includes('pre-order') || c.toLowerCase().includes('preorder'))
  );

  if (isSuccess) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center animate-in zoom-in duration-500">
        <div className="rounded-full bg-green-100 p-4 mb-6"><CheckCircle className="h-16 w-16 text-green-600" /></div>
        <h2 className="text-2xl font-black text-gray-900">Order Placed!</h2>
        <p className="mt-2 text-lg font-bold text-blue-600">Order No: {generatedOrderNo}</p>
        <p className="mt-3 text-sm text-gray-500 leading-relaxed">
          We are checking your payment. You can track your status in the "My Orders" menu.
        </p>
      </div>
    );
  }

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div>;

  return (
    <div className="flex flex-col px-4 pb-20 pt-2">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 border-b border-gray-100 pb-3"><Receipt className="h-5 w-5 text-gray-500" /> Order Summary</h2>
        <div className="flex flex-col gap-3">
          {cartItems.map((item) => (
            <div key={item.id} className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700 truncate pr-4">1x {item.games.name}</span>
              <span className="text-sm font-bold text-gray-900 whitespace-nowrap">{item.games.discount_price || item.games.price} MMK</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-between border-t border-dashed border-gray-200 pt-4">
          <span className="font-bold text-gray-900">Total</span>
          <span className="text-lg font-black text-[#e31818]">{totalPrice.toLocaleString()} MMK</span>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl shadow-sm border border-gray-100 bg-white">
        <div className="bg-[#005fb8] p-4 text-center text-white"><p className="text-sm font-medium leading-relaxed">မိမိထံ ငွေပေးချေရန် KBZPay QR Scanner ကို အသုံးပြုပါ။</p></div>
        <div className="flex flex-col items-center bg-[#005fb8] pb-8 pt-2">
          <div className="w-72 overflow-hidden rounded-xl bg-white p-2 shadow-2xl sm:w-80">
            <img src="/kbzpay.jpg" alt="KBZPay QR Code" className="w-full h-auto object-contain" onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/300?text=Missing+QR+Image"; }} />
          </div>
          <h3 className="mt-5 text-lg font-bold text-white tracking-wide">Nyi Nyi Min Thant</h3>
        </div>
        <div className="p-6 text-center bg-white">
          <p className="mb-4 text-sm font-semibold text-gray-500 leading-relaxed px-4">After transferring the exact amount, please upload a screenshot of your successful transaction.</p>
          <label className="relative flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 hover:bg-gray-100 transition-colors">
            {screenshotPreview ? <img src={screenshotPreview} alt="Receipt Preview" className="h-32 object-contain" /> : <div className="flex flex-col items-center"><UploadCloud className="mb-2 h-8 w-8 text-gray-400" /><span className="text-sm font-bold text-gray-500">Tap to Select Screenshot</span></div>}
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
        </div>
      </div>

      {/* --- UPDATED BUTTON TEXT --- */}
      <button onClick={handleConfirmPayment} disabled={isSubmitting || cartItems.length === 0} className="mt-6 w-full rounded-xl bg-[#e31818] py-4 font-bold text-white shadow-lg shadow-red-500/30 hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50 flex justify-center items-center gap-2">
        {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
        {isSubmitting ? 'Processing Payment...' : (hasPreOrder ? 'Proceed to Pre-Order' : 'Confirm Payment')}
      </button>
    </div>
  );
};

export default Checkout;