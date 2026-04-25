"use client";

import React, { useState, useEffect } from 'react';
import { Gamepad2, Image as ImageIcon, PlusCircle, Save, LogOut, Loader2, Tags, Trash2, Edit, ShoppingBag, Search, Filter, CreditCard, Plus, X, Menu } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const AdminPanel = ({ onBackToStore }) => {
  const [activeTab, setActiveTab] = useState('orders'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // NEW: Mobile Sidebar Toggle
  
  const [ordersList, setOrdersList] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  const [orderSearch, setOrderSearch] = useState('');
  const [orderMonth, setOrderMonth] = useState('');
  const [orderYear, setOrderYear] = useState('');
  
  const [gamesList, setGamesList] = useState([]);
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  const [showGameForm, setShowGameForm] = useState(false);
  const [editGameId, setEditGameId] = useState(null); 
  const [gameName, setGameName] = useState('');
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [description, setDescription] = useState('');
  const [gameSize, setGameSize] = useState('');
  const [collections, setCollections] = useState(''); 
  const [uniqueCollections, setUniqueCollections] = useState([]); 
  
  const [coverFile, setCoverFile] = useState(null); 
  const [coverUrlInput, setCoverUrlInput] = useState(''); 
  const [coverPreview, setCoverPreview] = useState(null); 
  
  const [isSavingGame, setIsSavingGame] = useState(false);

  const [isPS5, setIsPS5] = useState(false);
  const [isPS4, setIsPS4] = useState(false);

  const [sliderFiles, setSliderFiles] = useState({ 1: null, 2: null, 3: null, 4: null, 5: null });
  const [isUploadingSlider, setIsUploadingSlider] = useState(false);

  // --- GIFT CARD STATES ---
  const [giftCardsList, setGiftCardsList] = useState([]);
  const [showGiftForm, setShowGiftForm] = useState(false);
  const [editGiftId, setEditGiftId] = useState(null);
  const [giftName, setGiftName] = useState('');
  const [giftDescription, setGiftDescription] = useState('');
  const [giftOptions, setGiftOptions] = useState([{ label: '', price: '' }]);
  const [giftCoverPreview, setGiftCoverPreview] = useState(null);
  const [giftCoverFile, setGiftCoverFile] = useState(null);
  const [isSavingGift, setIsSavingGift] = useState(false);

  useEffect(() => {
    fetchGames();
    fetchOrders();
    fetchGiftCards();
  }, []);

  useEffect(() => {
    if (gamesList.length > 0) {
      const allTags = gamesList.flatMap(g => g.collections || []);
      const textTags = allTags.filter(t => t !== "PS5 Games" && t !== "PS4 Games");
      const unique = [...new Set(textTags)];
      setUniqueCollections(unique);
    }
  }, [gamesList]);

  const fetchGames = async () => {
    setIsLoadingGames(true);
    const { data, error } = await supabase.from('games').select('*').order('created_at', { ascending: false });
    if (!error && data) setGamesList(data);
    setIsLoadingGames(false);
  };

  const fetchGiftCards = async () => {
    const { data, error } = await supabase.from('gift_cards').select('*').order('created_at', { ascending: false });
    if (!error && data) setGiftCardsList(data);
  };

  const fetchOrders = async () => {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (data) setOrdersList(data);
  };

  const pendingOrdersCount = ordersList.filter(order => order.status === 'pending').length;

  const filteredOrders = ordersList.filter(order => {
    const searchLower = orderSearch.toLowerCase();
    const matchesSearch = 
      order.order_no.toLowerCase().includes(searchLower) ||
      (order.customer_name && order.customer_name.toLowerCase().includes(searchLower)) ||
      order.items.some(item => item.name.toLowerCase().includes(searchLower));

    const orderDate = new Date(order.created_at);
    const matchesMonth = orderMonth ? orderDate.getMonth() + 1 === parseInt(orderMonth) : true;
    const matchesYear = orderYear ? orderDate.getFullYear() === parseInt(orderYear) : true;

    return matchesSearch && matchesMonth && matchesYear;
  });

  const handleUpdateOrder = async (e) => {
    e.preventDefault();
    try {
      const status = e.target.status.value;
      const deliveryInfo = e.target.deliveryInfo.value;
      const { error } = await supabase.from('orders').update({ status, delivery_info: deliveryInfo }).eq('id', selectedOrder.id);
      if (error) throw error;
      toast.success("Order Updated!");
      setSelectedOrder(null);
      fetchOrders(); 
    } catch (error) { toast.error(error.message); }
  };

  const handleSaveGame = async (e) => {
    e.preventDefault();
    setIsSavingGame(true);

    try {
      let finalCoverUrl = null;

      if (coverFile) {
        const fileExt = coverFile.name.split('.').pop();
        const fileName = `cover-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('game_covers').upload(fileName, coverFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('game_covers').getPublicUrl(fileName);
        finalCoverUrl = publicUrl;
      } 
      else if (coverUrlInput) {
        finalCoverUrl = coverUrlInput;
      }

      let collectionsArray = collections.split(',').map(tag => tag.trim()).filter(tag => tag !== "");
      if (isPS5) collectionsArray.push("PS5 Games");
      if (isPS4) collectionsArray.push("PS4 Games");
      collectionsArray = [...new Set(collectionsArray)]; 

      const gameData = {
        name: gameName,
        price: parseFloat(price),
        discount_price: discountPrice ? parseFloat(discountPrice) : null,
        size: gameSize,
        youtube_link: youtubeLink,
        description: description,
        collections: collectionsArray,
      };

      if (finalCoverUrl) gameData.cover_image = finalCoverUrl;

      if (editGameId) {
        const { error } = await supabase.from('games').update(gameData).eq('id', editGameId);
        if (error) throw error;
        toast.success("Game updated successfully!");
      } else {
        if (!finalCoverUrl) throw new Error("Cover image or URL is required for new games!");
        const { error } = await supabase.from('games').insert([gameData]);
        if (error) throw error;
        toast.success("Game added successfully!");
      }

      resetForm();
      fetchGames();
    } catch (error) { toast.error(error.message); } finally { setIsSavingGame(false); }
  };

  const handleDeleteGame = async (id) => {
    if (!window.confirm("Are you sure you want to delete this game?")) return;
    const { error } = await supabase.from('games').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success("Game deleted."); fetchGames(); }
  };

  const handleEditClick = (game) => {
    setEditGameId(game.id);
    setGameName(game.name);
    setPrice(game.price.toString());
    setDiscountPrice(game.discount_price ? game.discount_price.toString() : '');
    setGameSize(game.size);
    setYoutubeLink(game.youtube_link || '');
    setDescription(game.description);
    
    const textCollections = game.collections.filter(tag => tag !== "PS5 Games" && tag !== "PS4 Games").join(', ');
    setCollections(textCollections);
    setIsPS5(game.collections.includes("PS5 Games"));
    setIsPS4(game.collections.includes("PS4 Games"));

    setCoverFile(null); 
    setCoverUrlInput(''); 
    setCoverPreview(game.cover_image); 
    setShowGameForm(true);
  };

  const resetForm = () => {
    setEditGameId(null); setGameName(''); setPrice(''); setDiscountPrice(''); 
    setYoutubeLink(''); setDescription(''); setGameSize(''); setCollections(''); 
    setIsPS5(false); setIsPS4(false); 
    setCoverFile(null); setCoverUrlInput(''); setCoverPreview(null); setShowGameForm(false);
  };

  const handleQuickAddCollection = (tag) => {
    const currentTags = collections.split(',').map(t => t.trim()).filter(Boolean);
    if (!currentTags.includes(tag)) {
      setCollections(currentTags.length > 0 ? `${collections}, ${tag}` : tag);
    }
  };

  const getPlatformTags = (gameCollections) => {
    let platforms = [];
    if (gameCollections.includes("PS4 Games")) platforms.push("PS4");
    if (gameCollections.includes("PS5 Games")) platforms.push("PS5");
    if (platforms.length === 2) return "PS4 | PS5";
    return platforms.join("");
  };

  // --- GIFT CARD HANDLERS ---
  const handleAddOption = () => setGiftOptions([...giftOptions, { label: '', price: '' }]);
  const handleRemoveOption = (index) => setGiftOptions(giftOptions.filter((_, i) => i !== index));
  const handleOptionChange = (index, field, value) => {
    const newOptions = [...giftOptions];
    newOptions[index][field] = value;
    setGiftOptions(newOptions);
  };

  const handleSaveGift = async (e) => {
    e.preventDefault();
    setIsSavingGift(true);
    try {
      let finalImageUrl = giftCoverPreview;
      if (giftCoverFile) {
        const fileExt = giftCoverFile.name.split('.').pop();
        const fileName = `gift-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('game_covers').upload(fileName, giftCoverFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('game_covers').getPublicUrl(fileName);
        finalImageUrl = publicUrl;
      }
      if (!finalImageUrl) throw new Error("An image is required!");

      const giftData = {
        name: giftName,
        description: giftDescription,
        image: finalImageUrl,
        options: giftOptions.filter(opt => opt.label && opt.price)
      };

      if (editGiftId) {
        const { error } = await supabase.from('gift_cards').update(giftData).eq('id', editGiftId);
        if (error) throw error;
        toast.success("Gift Card Updated!");
      } else {
        const { error } = await supabase.from('gift_cards').insert([giftData]);
        if (error) throw error;
        toast.success("Gift Card Added!");
      }
      resetGiftForm();
      fetchGiftCards();
    } catch (error) { toast.error(error.message); }
    finally { setIsSavingGift(false); }
  };

  const resetGiftForm = () => {
    setEditGiftId(null); setGiftName(''); setGiftDescription('');
    setGiftOptions([{ label: '', price: '' }]); setGiftCoverPreview(null);
    setGiftCoverFile(null); setShowGiftForm(false);
  };

  const handleEditGift = (gift) => {
    setEditGiftId(gift.id); setGiftName(gift.name); setGiftDescription(gift.description);
    setGiftOptions(gift.options); setGiftCoverPreview(gift.image); setShowGiftForm(true);
  };

  const handleDeleteGift = async (id) => {
    if (!window.confirm("Delete this gift card?")) return;
    await supabase.from('gift_cards').delete().eq('id', id);
    fetchGiftCards();
  };

  const handleSaveSlider = async (e) => {
    e.preventDefault();
    setIsUploadingSlider(true);
    try {
      for (let i = 1; i <= 5; i++) {
        const file = sliderFiles[i];
        if (file) {
          const fileExt = file.name.split('.').pop();
          const fileName = `slider-${i}-${Date.now()}.${fileExt}`;
          const { data: existingFiles } = await supabase.storage.from('banners').list();
          const filesToDelete = existingFiles?.filter(f => f.name.startsWith(`slider-${i}-`)).map(f => f.name) || [];
          if (filesToDelete.length > 0) await supabase.storage.from('banners').remove(filesToDelete);
          const { error } = await supabase.storage.from('banners').upload(fileName, file);
          if (error) throw error;
        }
      }
      toast.success("Slider images updated!");
      setSliderFiles({ 1: null, 2: null, 3: null, 4: null, 5: null });
    } catch (error) { toast.error(error.message); } finally { setIsUploadingSlider(false); }
  };

  return (
    <div className="flex h-screen w-full bg-gray-50 font-sans relative overflow-hidden">
      
      {/* MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[150] bg-black/50 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* --- RESPONSIVE SIDEBAR --- */}
      <aside className={`fixed inset-y-0 left-0 z-[200] w-64 transform bg-gray-900 flex flex-col text-white shadow-xl transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black tracking-tight text-white">ADMIN PANEL</h1>
            <p className="text-xs text-gray-400 mt-1">kyone94@gmail.com</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white"><X className="h-6 w-6" /></button>
        </div>
        <nav className="flex-1 py-6 px-3 flex flex-col gap-2 overflow-y-auto">
          
          <button 
            onClick={() => { setActiveTab('orders'); setIsSidebarOpen(false); }} 
            className={`flex w-full items-center justify-between px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'orders' ? 'bg-[#e31818] text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-5 w-5" /> Manage Orders
            </div>
            {pendingOrdersCount > 0 && (
              <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold shadow-sm ${activeTab === 'orders' ? 'bg-white text-[#e31818]' : 'bg-[#e31818] text-white'}`}>
                {pendingOrdersCount}
              </span>
            )}
          </button>

          <button onClick={() => { setActiveTab('games'); setShowGameForm(false); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'games' ? 'bg-[#e31818] text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <Gamepad2 className="h-5 w-5" /> Manage Games
          </button>
          <button onClick={() => { setActiveTab('giftcards'); setShowGiftForm(false); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'giftcards' ? 'bg-[#e31818] text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <CreditCard className="h-5 w-5" /> Manage Gift Cards
          </button>
          <button onClick={() => { setActiveTab('slider'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'slider' ? 'bg-[#e31818] text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <ImageIcon className="h-5 w-5" /> Hero Slider
          </button>
        </nav>
        <div className="p-4 border-t border-gray-800">
          <button onClick={onBackToStore} className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/20 transition-colors">
            <LogOut className="h-4 w-4" /> Exit Admin
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT WRAPPER --- */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* MOBILE TOP HEADER */}
        <div className="md:hidden flex items-center justify-between bg-white px-4 py-3 shadow-sm border-b border-gray-100 z-40">
          <div className="flex items-center gap-3">
            <Menu onClick={() => setIsSidebarOpen(true)} className="h-6 w-6 text-gray-800 cursor-pointer" />
            <h1 className="text-lg font-black text-gray-900 tracking-tight">NYINYI<span className="text-[#e31818]">ADMIN</span></h1>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-10">
          
          {/* --- ORDERS TAB --- */}
          {activeTab === 'orders' && !selectedOrder && (
            <div className="max-w-7xl animate-in fade-in duration-300">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Recent Orders</h2>
              
              <div className="flex flex-col md:flex-row flex-wrap gap-4 mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex flex-1 items-center rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                  <Search className="h-5 w-5 text-gray-400" />
                  <input type="text" placeholder="Search order no, customer, or game..." value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} className="ml-2 w-full bg-transparent text-sm outline-none text-gray-900" />
                </div>
                <div className="flex flex-wrap md:flex-nowrap items-center gap-3 w-full md:w-auto">
                  <Filter className="h-5 w-5 text-gray-400 hidden md:block" />
                  <select value={orderMonth} onChange={(e) => setOrderMonth(e.target.value)} className="flex-1 md:flex-none rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none">
                    <option value="">All Months</option>
                    {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'short' })}</option>)}
                  </select>
                  <select value={orderYear} onChange={(e) => setOrderYear(e.target.value)} className="flex-1 md:flex-none rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none">
                    <option value="">All Years</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                    <option value="2028">2028</option>
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap md:whitespace-normal">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
                      <th className="p-4 font-semibold">Order No</th>
                      <th className="p-4 font-semibold">Customer</th>
                      <th className="p-4 font-semibold">Date & Time</th> 
                      <th className="p-4 font-semibold">Amount</th>
                      <th className="p-4 font-semibold">Status</th>
                      <th className="p-4 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr><td colSpan="6" className="p-8 text-center text-gray-500">No orders match your filters.</td></tr>
                    ) : (
                      filteredOrders.map(order => (
                        <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-4 font-bold text-gray-900">{order.order_no}</td>
                          <td className="p-4 text-sm font-semibold text-gray-800">{order.customer_name || 'N/A'}</td>
                          <td className="p-4 text-sm text-gray-600">
                            {new Date(order.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-4 text-sm font-black text-[#e31818]">{order.total_price.toLocaleString()} MMK</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${order.status === 'pending' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                              {order.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button onClick={() => setSelectedOrder(order)} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100">Review</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ORDER REVIEW MODAL */}
          {activeTab === 'orders' && selectedOrder && (
            <div className="max-w-4xl animate-in fade-in duration-300">
              <button onClick={() => setSelectedOrder(null)} className="mb-6 text-sm font-bold text-blue-600 hover:underline">← Back to Orders</button>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-8">
                <div className="mb-6">
                  <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-1">Order {selectedOrder.order_no}</h3>
                  <p className="text-sm font-bold text-gray-500">Customer: <span className="text-gray-900">{selectedOrder.customer_name || 'N/A'}</span></p>
                  <p className="text-sm font-bold text-gray-500">Time: <span className="text-gray-900">{new Date(selectedOrder.created_at).toLocaleString()}</span></p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-bold text-gray-700 mb-3">Purchased Items:</h4>
                    <ul className="list-disc pl-5 text-sm font-semibold text-gray-900 mb-6">
                      {selectedOrder.items.map((i, idx) => <li key={idx} className="mb-1">{i.name} {i.account_type && i.account_type !== 'Game' ? `(${i.account_type})` : ''} - {i.price} MMK (Qty: {i.quantity || 1})</li>)}
                    </ul>
                    <form onSubmit={handleUpdateOrder} className="flex flex-col gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Payment Status</label>
                        <select name="status" defaultValue={selectedOrder.status} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none">
                          <option value="pending">Pending (Awaiting Payment)</option>
                          <option value="paid">Paid (Money Received)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Redeem Code / Account Details to Send to User</label>
                        <textarea name="deliveryInfo" defaultValue={selectedOrder.delivery_info || ''} rows="4" className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none placeholder-gray-400" placeholder="Type the game code or account password here..."></textarea>
                      </div>
                      <button type="submit" className="mt-2 w-full md:w-auto rounded-xl bg-black px-6 py-3 font-bold text-white hover:bg-gray-800">Save & Notify User</button>
                    </form>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-700 mb-3">Customer Payment Screenshot:</h4>
                    <div className="border border-gray-200 rounded-xl p-2 bg-gray-50 h-64 md:h-80 flex items-center justify-center overflow-hidden">
                      <img src={selectedOrder.screenshot_url} alt="Receipt" className="h-full w-full object-contain" />
                    </div>
                    <a href={selectedOrder.screenshot_url} target="_blank" className="block text-center mt-3 text-sm font-bold text-blue-600 hover:underline">Open Image in New Tab</a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- GAMES TAB --- */}
          {activeTab === 'games' && !showGameForm && (
            <div className="max-w-6xl animate-in fade-in duration-300">
              <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Store Catalog</h2>
                  <p className="text-gray-500 mt-1 text-sm md:text-base">Manage your games, prices, and categories.</p>
                </div>
                <button onClick={() => setShowGameForm(true)} className="w-full md:w-auto flex justify-center items-center gap-2 bg-[#e31818] text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 active:scale-95 transition-all">
                  <PlusCircle className="h-5 w-5" /> Add New Game
                </button>
              </div>

              {isLoadingGames ? (
                <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap md:whitespace-normal">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
                        <th className="p-4 font-semibold">Game</th>
                        <th className="p-4 font-semibold">Price</th>
                        <th className="p-4 font-semibold hidden md:table-cell">Collections</th>
                        <th className="p-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gamesList.map(game => (
                        <tr key={game.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-4 flex items-center gap-3 md:gap-4">
                            <div className="h-10 w-10 md:h-12 md:w-12 rounded object-cover overflow-hidden bg-gray-100 border border-gray-100 relative group flex-shrink-0">
                              <img src={game.cover_image} alt={game.name} className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                              {getPlatformTags(game.collections) && (
                                <div className="absolute top-0.5 left-0.5 bg-gray-800/80 text-white text-[8px] font-bold px-1 py-[1px] rounded shadow hidden md:block">{getPlatformTags(game.collections)}</div>
                              )}
                            </div>
                            <span className="font-bold text-sm md:text-base text-gray-900 truncate max-w-[150px] md:max-w-xs">{game.name}</span>
                          </td>
                          <td className="p-4 text-sm font-semibold text-gray-900">
                            {game.discount_price ? (
                              <div className="flex flex-col"><span className="text-red-600 font-bold">{game.discount_price} MMK</span><span className="text-[10px] md:text-xs text-gray-400 line-through">{game.price} MMK</span></div>
                            ) : (
                              <span className="font-bold">{game.price} MMK</span>
                            )}
                          </td>
                          <td className="p-4 text-xs text-gray-600 font-medium max-w-[200px] hidden md:table-cell">
                            {game.collections.map(c => <span key={c} className="inline-block bg-gray-200 rounded px-2 py-1 mr-1 mb-1">{c}</span>)}
                          </td>
                          <td className="p-4 flex justify-end gap-2">
                            <button onClick={() => handleEditClick(game)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"><Edit className="h-4 w-4" /></button>
                            <button onClick={() => handleDeleteGame(game.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"><Trash2 className="h-4 w-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* --- ADD/EDIT GAME FORM --- */}
          {activeTab === 'games' && showGameForm && (
            <div className="max-w-4xl animate-in fade-in duration-300">
              <button onClick={resetForm} className="mb-6 text-sm font-bold text-blue-600 hover:underline">← Back to Catalog</button>
              <form onSubmit={handleSaveGame} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-8">
                <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-6 border-b border-gray-100 pb-4">
                  <PlusCircle className="h-5 w-5 text-[#e31818]" /> {editGameId ? 'Edit Game' : 'Add New Game'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <div className="col-span-1 md:col-span-2 flex flex-col gap-4 p-4 border border-gray-100 rounded-xl bg-gray-50">
                    <label className="block text-sm font-bold text-gray-700">Game Cover Image</label>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      {/* Option 1: File Upload */}
                      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Option 1: Upload File</p>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => { 
                            if(e.target.files[0]) {
                              setCoverFile(e.target.files[0]);
                              setCoverPreview(URL.createObjectURL(e.target.files[0]));
                              setCoverUrlInput(''); 
                            }
                          }} 
                          className="w-full text-xs md:text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs md:file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer" 
                        />
                      </div>

                      {/* Option 2: Paste URL */}
                      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
                        <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Option 2: Paste Image URL</p>
                        <input 
                          type="url" 
                          value={coverUrlInput}
                          onChange={(e) => {
                            setCoverUrlInput(e.target.value);
                            setCoverPreview(e.target.value); 
                            setCoverFile(null); 
                          }}
                          placeholder="https://example.com/image.jpg"
                          className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 outline-none focus:border-black transition-colors"
                        />
                      </div>
                    </div>

                    {coverPreview && (
                      <div className="w-full h-64 md:h-80 rounded-xl overflow-hidden bg-white border-2 border-dashed border-gray-200 p-2 relative mt-2">
                        <img src={coverPreview} alt="Preview" className="w-full h-full object-contain" />
                        {(isPS5 || isPS4) && (
                          <div className="absolute top-4 left-4 bg-gray-800/90 text-white text-sm md:text-xl font-extrabold px-4 py-2 rounded-xl shadow-xl border border-gray-700">
                            {isPS4 && <span>PS4</span>}
                            {isPS5 && isPS4 && <span className="px-2 text-gray-500">|</span>}
                            {isPS5 && <span>PS5</span>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Game Name</label>
                    <input type="text" required value={gameName} onChange={(e) => setGameName(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 outline-none focus:border-black transition-colors" placeholder="e.g. Spiderman 2" />
                  </div>
                  
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><Tags className="h-4 w-4" /> Platform Selection</label>
                    <div className="flex flex-col md:flex-row gap-3 md:gap-4 p-4 rounded-xl border border-gray-200 bg-white">
                      <label className="flex flex-1 items-center gap-3 p-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer border border-gray-200">
                        <input type="checkbox" checked={isPS5} onChange={(e) => setIsPS5(e.target.checked)} className="form-checkbox h-5 w-5 text-[#e31818] rounded-md border-gray-300 focus:ring-0" />
                        <span className="text-sm font-bold text-gray-800">PlayStation 5 (PS5 Tag)</span>
                      </label>
                      <label className="flex flex-1 items-center gap-3 p-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer border border-gray-200">
                        <input type="checkbox" checked={isPS4} onChange={(e) => setIsPS4(e.target.checked)} className="form-checkbox h-5 w-5 text-[#e31818] rounded-md border-gray-300 focus:ring-0" />
                        <span className="text-sm font-bold text-gray-800">PlayStation 4 (PS4 Tag)</span>
                      </label>
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Collections (Separate with commas)</label>
                    <input type="text" required value={collections} onChange={(e) => setCollections(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 outline-none focus:border-black transition-colors" placeholder="e.g. Action, Classic" />
                    
                    {uniqueCollections.length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 w-full md:w-auto">Quick add:</span>
                        {uniqueCollections.map(tag => (
                          <button type="button" key={tag} onClick={() => handleQuickAddCollection(tag)} className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 transition-colors active:scale-95 shadow-sm">
                            + {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Regular Price (MMK)</label>
                    <input type="number" required value={price} onChange={(e) => setPrice(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 outline-none focus:border-black transition-colors" placeholder="150000" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Discount Price <span className="text-gray-400">(Optional)</span></label>
                    <input type="number" value={discountPrice} onChange={(e) => setDiscountPrice(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 outline-none focus:border-black transition-colors" placeholder="120000" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Game Size (GB)</label>
                    <input type="text" required value={gameSize} onChange={(e) => setGameSize(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 outline-none focus:border-black transition-colors" placeholder="e.g. 80GB" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">YouTube Trailer URL</label>
                    <input type="url" value={youtubeLink} onChange={(e) => setYoutubeLink(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 outline-none focus:border-black transition-colors" placeholder="https://youtube.com/..." />
                  </div>
                  
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                    <textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows="4" className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 outline-none focus:border-black transition-colors" placeholder="Game description..." />
                  </div>
                  
                  <div className="col-span-1 md:col-span-2 flex justify-end mt-2">
                    <button type="submit" disabled={isSavingGame} className="w-full md:w-auto flex justify-center items-center gap-2 rounded-xl bg-[#e31818] px-8 py-3.5 font-bold text-white hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50">
                      {isSavingGame ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Save Game
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* --- GIFT CARDS TAB --- */}
          {activeTab === 'giftcards' && !showGiftForm && (
            <div className="max-w-6xl animate-in fade-in duration-300">
              <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Gift Cards</h2>
                <button onClick={() => setShowGiftForm(true)} className="w-full md:w-auto flex justify-center items-center gap-2 bg-[#e31818] text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700">
                  <PlusCircle className="h-5 w-5" /> Add Gift Card
                </button>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap md:whitespace-normal">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
                      <th className="p-4 font-semibold">Card Name</th>
                      <th className="p-4 font-semibold">Denomination Options</th>
                      <th className="p-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {giftCardsList.map(gift => (
                      <tr key={gift.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4 flex items-center gap-3">
                          <img src={gift.image} className="h-10 w-10 md:h-12 md:w-12 rounded object-cover border flex-shrink-0" alt="" />
                          <span className="font-bold text-sm md:text-base text-gray-900 truncate max-w-[150px] md:max-w-[200px]">{gift.name}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {gift.options.map((opt, idx) => (
                              <span key={idx} className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-[10px] md:text-xs font-bold border border-gray-200">{opt.label}: {Number(opt.price).toLocaleString()}</span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 flex justify-end gap-2">
                          <button onClick={() => handleEditGift(gift)} className="p-2 text-blue-600 bg-blue-50 rounded-lg"><Edit className="h-4 w-4"/></button>
                          <button onClick={() => handleDeleteGift(gift.id)} className="p-2 text-red-600 bg-red-50 rounded-lg"><Trash2 className="h-4 w-4"/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'giftcards' && showGiftForm && (
            <div className="max-w-3xl animate-in fade-in duration-300">
              <button onClick={resetGiftForm} className="mb-6 text-sm font-bold text-blue-600">← Back to List</button>
              <form onSubmit={handleSaveGift} className="bg-white rounded-2xl p-4 md:p-8 border border-gray-200 shadow-sm">
                <h3 className="text-xl font-bold mb-6 text-[#e31818]">{editGiftId ? 'Edit' : 'Add'} Gift Card</h3>
                
                <div className="grid gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Image</label>
                    <input type="file" accept="image/*" onChange={(e) => { if(e.target.files[0]) { setGiftCoverFile(e.target.files[0]); setGiftCoverPreview(URL.createObjectURL(e.target.files[0])); } }} className="w-full text-xs md:text-sm text-gray-500 mb-4" />
                    {giftCoverPreview && <img src={giftCoverPreview} className="h-32 md:h-40 rounded-xl object-contain bg-gray-50 p-2 border-2 border-dashed" alt="" />}
                  </div>

                  <input type="text" placeholder="Card Name (e.g. Razer Gold Global)" required value={giftName} onChange={(e)=>setGiftName(e.target.value)} className="w-full p-3 md:p-4 rounded-xl border border-gray-300 outline-none focus:border-black font-bold text-gray-900 text-sm md:text-base" />
                  
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm font-bold text-gray-700">Denominations & Pricing</label>
                      <button type="button" onClick={handleAddOption} className="text-xs font-bold text-blue-600 flex items-center gap-1"><Plus className="h-3 w-3"/> Add Option</button>
                    </div>
                    <div className="flex flex-col gap-3">
                      {giftOptions.map((opt, idx) => (
                        <div key={idx} className="flex gap-2 md:gap-3 items-center">
                          <input type="text" placeholder="Label ($10)" value={opt.label} onChange={(e)=>handleOptionChange(idx, 'label', e.target.value)} className="flex-1 p-2 md:p-3 rounded-xl border border-gray-300 text-xs md:text-sm font-bold text-gray-900 w-1/3" />
                          <input type="number" placeholder="Price (35000)" value={opt.price} onChange={(e)=>handleOptionChange(idx, 'price', e.target.value)} className="flex-1 p-2 md:p-3 rounded-xl border border-gray-300 text-xs md:text-sm font-bold text-gray-900 w-1/3" />
                          <button type="button" onClick={()=>handleRemoveOption(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><X className="h-4 w-4 md:h-5 md:w-5"/></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <textarea placeholder="Description" rows="3" value={giftDescription} onChange={(e)=>setGiftDescription(e.target.value)} className="w-full p-3 md:p-4 rounded-xl border border-gray-300 outline-none focus:border-black font-medium text-gray-900 text-sm md:text-base" />
                  
                  <button type="submit" disabled={isSavingGift} className="w-full bg-[#e31818] hover:bg-red-700 text-white font-bold py-3 md:py-4 rounded-xl flex items-center justify-center gap-2 transition-colors">
                    {isSavingGift ? <Loader2 className="h-5 w-5 animate-spin"/> : <Save className="h-5 w-5"/>} Save Gift Card
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* --- SLIDER TAB --- */}
          {activeTab === 'slider' && (
            <div className="max-w-4xl animate-in fade-in duration-300">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8">Hero Slider Settings</h2>
              <form onSubmit={handleSaveSlider} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-8">
                 <div className="grid grid-cols-1 gap-4 md:gap-6">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <div key={num} className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 p-4 border rounded-xl border-gray-100 bg-gray-50">
                      <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-gray-200 font-bold text-gray-500 flex-shrink-0">{num}</div>
                      <div className="flex-1 w-full">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Slider Image {num}</label>
                        <input type="file" accept="image/*" onChange={(e) => setSliderFiles(prev => ({...prev, [num]: e.target.files[0]}))} className="w-full text-xs md:text-sm text-gray-500 file:mr-2 file:py-2 file:px-3 md:file:px-4 file:rounded-full file:border-0 file:text-xs md:file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer" />
                      </div>
                    </div>
                  ))}
                 </div>
                 <div className="mt-6 md:mt-8 flex justify-end">
                  <button type="submit" disabled={isUploadingSlider} className="w-full md:w-auto flex justify-center items-center gap-2 rounded-xl bg-[#e31818] px-8 py-3.5 font-bold text-white hover:bg-red-700 disabled:opacity-50">
                    {isUploadingSlider ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Update Slider
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;