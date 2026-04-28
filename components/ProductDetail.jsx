"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShoppingCart, Heart, ChevronDown, ChevronUp, PlayCircle, Image as ImageIcon, X, Tag, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from './LanguageContext'; 
import toast from 'react-hot-toast';

const ProductDetail = ({ game, prefilledOption = null, allGames, onBack, onBuyNow, onGameClick }) => {
  const { lang } = useLanguage(); 
  const [isAddingCart, setIsAddingCart] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  
  const isGiftCard = !!game.options;

  const [selectedOption, setSelectedOption] = useState(null);
  const [quantity, setQuantity] = useState(1); 

  const [isExpanded, setIsExpanded] = useState(false);
  const DESCRIPTION_LIMIT = 200; 
  const shouldTruncate = game.description && game.description.length > DESCRIPTION_LIMIT;
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);

  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);

  const productImages = React.useMemo(() => {
    const images = [];
    if (game.cover_image || game.image) images.push(game.cover_image || game.image);
    if (game.screenshots && Array.isArray(game.screenshots)) {
      images.push(...game.screenshots.filter(url => url)); 
    }
    return images;
  }, [game]);

  useEffect(() => {
    checkWishlistStatus();
    setIsExpanded(false); 
    setIsPlayingTrailer(false);
    setQuantity(1); 
    setIsGalleryOpen(false);
    setActiveGalleryIndex(0); 

    if (isGiftCard && game.options && game.options.length > 0) {
      setSelectedOption(prefilledOption || game.options[0]);
    } else {
      setSelectedOption(null);
    }
  }, [game.id, prefilledOption]);

  const checkWishlistStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user && !isGiftCard) {
      const { data } = await supabase.from('wishlist').select('id').eq('user_id', session.user.id).eq('game_id', game.id).maybeSingle();
      setIsWishlisted(!!data);
    }
  };

  const handleToggleWishlist = async () => {
    if (isGiftCard) return; 
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return toast.error(lang === 'mm' ? "ကျေးဇူးပြု၍ အကောင့်ဝင်ပါ" : lang === 'zh' ? "请先登录" : "Please sign in");

    setIsWishlistLoading(true);
    try {
      if (isWishlisted) {
        await supabase.from('wishlist').delete().eq('user_id', session.user.id).eq('game_id', game.id);
        setIsWishlisted(false);
        toast.success(lang === 'mm' ? "ဖယ်ရှားပြီးပါပြီ" : lang === 'zh' ? "已移除" : "Removed");
      } else {
        await supabase.from('wishlist').insert([{ user_id: session.user.id, game_id: game.id }]);
        setIsWishlisted(true);
        toast.success(lang === 'mm' ? "သိမ်းဆည်းပြီးပါပြီ" : lang === 'zh' ? "已保存" : "Saved!");
      }
    } catch (error) { toast.error("Error"); } finally { setIsWishlistLoading(false); }
  };

  const handleAddToCart = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return toast.error(lang === 'mm' ? "ကျေးဇူးပြု၍ အကောင့်ဝင်ပါ" : lang === 'zh' ? "请先登录" : "Please sign in");

    setIsAddingCart(true);
    try {
      const cartData = {
        user_id: session.user.id,
        game_id: !isGiftCard ? game.id : null,
        gift_card_id: isGiftCard ? game.id : null,
        selected_option: isGiftCard ? selectedOption : null,
        quantity: isGiftCard ? quantity : 1 
      };

      let existingQuery = supabase.from('cart').select('id, quantity').eq('user_id', session.user.id);
      if (!isGiftCard) existingQuery = existingQuery.eq('game_id', game.id);
      else existingQuery = existingQuery.eq('gift_card_id', game.id).eq('selected_option->>label', selectedOption.label);
      
      const { data: existingCart } = await existingQuery.maybeSingle();
      
      if (existingCart) {
        await supabase.from('cart').update({ quantity: existingCart.quantity + (isGiftCard ? quantity : 1) }).eq('id', existingCart.id);
        toast.success("Updated!");
      } else {
        const { error } = await supabase.from('cart').insert([cartData]);
        if (error) throw error;
        toast.success("Added!");
      }
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) { toast.error("Error"); } finally { setIsAddingCart(false); }
  };

  const handleBuyNow = async () => {
    await handleAddToCart();
    onBuyNow();
  };

  const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const youtubeId = getYouTubeId(game.youtube_link);
  const isPreOrder = game.collections?.some(c => c.toLowerCase().includes('pre-order') || c.toLowerCase().includes('preorder'));
  const recommendedGames = allGames.filter(g => g.id !== game.id && !g.options).slice(0, 6);

  const currentBasePrice = isGiftCard 
    ? (selectedOption ? Number(selectedOption.price) : 0)
    : (game.discount_price || game.price);
  
  const totalPrice = currentBasePrice * (isGiftCard ? quantity : 1);

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#121212] pb-32 animate-in fade-in duration-300 transition-colors">
      
      <div className="sticky top-0 z-40 flex items-center justify-between bg-white dark:bg-[#121212] px-4 py-4 shadow-sm border-b border-gray-100 dark:border-gray-800 transition-colors">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95"><ArrowLeft className="h-6 w-6 text-gray-800 dark:text-gray-200" /></button>
        <h1 className="text-sm font-black text-gray-900 dark:text-white truncate px-4 uppercase">{game.name}</h1>
        {!isGiftCard ? (
          <button onClick={handleToggleWishlist} disabled={isWishlistLoading} className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95">
            <Heart className={`h-6 w-6 transition-colors ${isWishlisted ? 'fill-[#e31818] text-[#e31818]' : 'text-gray-400 dark:text-gray-500'}`} />
          </button>
        ) : <div className="w-10"></div>}
      </div>

      <div 
        className={`w-full aspect-square bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden cursor-pointer ${isGiftCard ? 'p-12' : ''}`}
        onClick={() => {
           if (productImages.length > 0) {
             setActiveGalleryIndex(0);
             setIsGalleryOpen(true);
           }
        }}
      >
        <img 
            src={game.cover_image || game.image} 
            alt={game.name} 
            className={isGiftCard ? "w-full h-full object-contain drop-shadow-xl" : "w-full h-full object-cover"} 
        />
      </div>

      <div className="p-5">
        
        {isPreOrder && (
          <div className="mb-3 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-3 py-1.5 rounded-lg text-xs font-black inline-flex items-center gap-2 border border-orange-200 dark:border-orange-900/50">
            <Tag className="w-3 h-3" /> {lang === 'mm' ? 'ကြိုတင်မှာယူရန်' : lang === 'zh' ? '预购' : 'PRE-ORDER'}
          </div>
        )}

        <h2 className="text-xl font-black text-gray-900 dark:text-white mb-1">{game.name}</h2>
        
        {/* --- NEW RELEASE DATE SECTION --- */}
        {!isGiftCard && game.release_date ? (
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 mb-6">
            <Calendar className="w-4 h-4" />
            <span>
              {lang === 'mm' ? 'ထွက်ရှိမည့်ရက်: ' : lang === 'zh' ? '发布日期: ' : 'Release Date: '}
              <span className="text-gray-700 dark:text-gray-300">
                {new Date(game.release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </span>
          </div>
        ) : (
          <div className="mb-6"></div>
        )}
        
        {isGiftCard ? (
          <div className="flex flex-col mb-8 border-b border-gray-100 dark:border-gray-800 pb-8">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
              {lang === 'mm' ? 'အမျိုးအစားရွေးချယ်ပါ' : lang === 'zh' ? '选择面额' : 'Select Denomination'}
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {game.options?.map((opt, idx) => (
                <button 
                  key={idx}
                  onClick={() => setSelectedOption(opt)}
                  className={`py-4 px-3 rounded-2xl border-2 text-center transition-all ${selectedOption?.label === opt.label ? 'border-[#e31818] bg-[#e31818] text-white shadow-lg' : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-[#121212] text-gray-600 dark:text-gray-400'}`}
                >
                  <p className="text-[10px] font-bold opacity-70 mb-1">{opt.label}</p>
                  <p className="text-sm font-black">{Number(opt.price).toLocaleString()} MMK</p>
                </button>
              ))}
            </div>

            <div className="flex justify-center">
              <div className="flex items-center gap-6 bg-gray-50 dark:bg-[#0a0a0a] rounded-full px-5 py-2.5 border border-gray-200 dark:border-gray-800 shadow-inner">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-[#121212] text-gray-600 dark:text-gray-300 hover:text-[#e31818] hover:bg-red-50 dark:hover:bg-red-900/20 shadow border border-gray-200 dark:border-gray-700 font-bold text-2xl transition-colors active:scale-95">-</button>
                <span className="font-black text-xl w-6 text-center text-gray-900 dark:text-white">{quantity}</span>
                <button onClick={() => setQuantity(q => q + 1)} className="w-9 h-9 flex items-center justify-center rounded-full bg-[#e31818] text-white shadow-md font-bold text-2xl transition-transform active:scale-95">+</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 mb-6">
            {game.discount_price ? (
              <>
                <span className="text-xl font-black text-[#e31818]">{game.discount_price.toLocaleString()} MMK</span>
                <span className="text-sm font-bold text-gray-400 dark:text-gray-500 line-through">{game.price.toLocaleString()} MMK</span>
              </>
            ) : (
              <span className="text-xl font-black text-[#e31818]">{game.price.toLocaleString()} MMK</span>
            )}
          </div>
        )}

        {!isGiftCard && (
          <div className="flex flex-wrap gap-2 mb-6">
            {game.size && <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold px-2 py-1 rounded">{game.size}</span>}
            {game.collections?.map(tag => (
              <span key={tag} className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold px-2 py-1 rounded">{tag}</span>
            ))}
          </div>
        )}

        {!isGiftCard && productImages.length > 1 && (
            <div className="mb-8 border-t border-gray-100 dark:border-gray-800 pt-6 animate-in fade-in duration-500">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">Product Gallery</h3>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                    {productImages.map((imgUrl, index) => (
                        <button 
                            key={index} 
                            onClick={() => {
                                setActiveGalleryIndex(index);
                                setIsGalleryOpen(true);
                            }}
                            className={`aspect-[4/3] rounded-lg overflow-hidden border-2 bg-gray-50 dark:bg-gray-900 flex items-center justify-center relative transition-all ${activeGalleryIndex === index ? 'border-[#e31818] shadow-md ring-2 ring-red-100 dark:ring-red-900/30' : 'border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'}`}
                        >
                            <img src={imgUrl} alt={`Screenshot ${index + 1}`} className="max-h-full max-w-full object-contain" />
                            {index === 0 && <span className="absolute top-1 left-1 bg-gray-900/80 dark:bg-black/80 text-white text-[7px] font-bold px-1.5 py-0.5 rounded">Cover</span>}
                        </button>
                    ))}
                </div>
            </div>
        )}

        {!isGiftCard && game.youtube_link && (
          <div className="mb-6 border-t border-gray-100 dark:border-gray-800 pt-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
              {lang === 'mm' ? 'တရားဝင် နမူနာ' : lang === 'zh' ? '官方预告片' : 'Official Trailer'}
            </h3>
            {!isPlayingTrailer && youtubeId ? (
              <button onClick={() => setIsPlayingTrailer(true)} className="w-full flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/20 text-[#e31818] py-3 rounded-xl font-bold hover:bg-red-100 dark:hover:bg-red-900/40 active:scale-95 transition-all">
                <PlayCircle className="h-5 w-5" /> Watch Trailer
              </button>
            ) : isPlayingTrailer && youtubeId ? (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-sm border border-gray-100 dark:border-gray-800">
                <iframe src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`} className="absolute top-0 left-0 w-full h-full border-0" allow="autoplay; encrypted-media" allowFullScreen></iframe>
              </div>
            ) : null}
          </div>
        )}

        <div className="mb-6 pt-4 border-t border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-black text-gray-900 dark:text-white mb-2">
            {lang === 'mm' ? 'အချက်အလက်' : lang === 'zh' ? '产品信息' : 'Product Info'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
            {shouldTruncate && !isExpanded ? `${game.description.substring(0, DESCRIPTION_LIMIT)}...` : game.description}
          </p>
          {shouldTruncate && (
            <button onClick={() => setIsExpanded(!isExpanded)} className="mt-2 flex items-center gap-1 text-xs font-black text-blue-600 dark:text-blue-400 active:scale-95 transition-transform">
              {isExpanded ? <>SHOW LESS <ChevronUp className="h-4 w-4" /></> : <>READ MORE <ChevronDown className="h-4 w-4" /></>}
            </button>
          )}
        </div>

      </div>

      {recommendedGames.length > 0 && (
        <div className="mb-8 border-t border-gray-100 dark:border-gray-800 pt-6">
          <div className="px-4 mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {lang === 'mm' ? 'အကြံပြုထားသော ဂိမ်းများ' : lang === 'zh' ? '推荐游戏' : 'Recommended Games'}
            </h3>
          </div>
          <div className="flex overflow-x-auto px-4 pb-4 gap-4 snap-x hide-scrollbar">
            {recommendedGames.map(rGame => (
              <div key={rGame.id} onClick={() => onGameClick(rGame)} className="min-w-[130px] max-w-[130px] snap-start flex flex-col gap-2 cursor-pointer active:scale-95 transition-transform">
                <div className="aspect-square w-full rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-800">
                  <img src={rGame.cover_image} alt={rGame.name} className="h-full w-full object-cover" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate">{rGame.name}</h3>
                  <p className="text-xs font-semibold text-[#e31818] mt-0.5">{rGame.discount_price || rGame.price} MMK</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white dark:bg-[#121212] border-t border-gray-100 dark:border-gray-800 p-4 flex flex-col gap-3 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.5)] transition-colors">
        <div className="flex justify-between items-center mb-1 px-1">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {lang === 'mm' ? 'စုစုပေါင်း' : lang === 'zh' ? '总计' : 'Total'} {isGiftCard && `(x${quantity})`}
          </span>
          <span className="text-lg font-black text-[#e31818]">{totalPrice.toLocaleString()} MMK</span>
        </div>
        
        <div className="flex gap-3">
          <button onClick={handleAddToCart} disabled={isAddingCart || (isGiftCard && !selectedOption)} className="flex items-center justify-center w-14 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-bold active:scale-95 transition-transform disabled:opacity-50 hover:bg-gray-200 dark:hover:bg-gray-700">
            <ShoppingCart className="h-5 w-5" />
          </button>
          <button onClick={handleBuyNow} disabled={isGiftCard && !selectedOption} className="flex-1 items-center justify-center rounded-xl bg-[#e31818] text-white font-black py-3.5 shadow-lg shadow-red-500/30 active:scale-95 transition-transform hover:bg-red-700 disabled:opacity-50">
            {isPreOrder 
              ? (lang === 'mm' ? 'ကြိုတင်မှာယူမည်' : lang === 'zh' ? '预购' : 'PRE-ORDER') 
              : (lang === 'mm' ? 'ယခုဝယ်မည်' : lang === 'zh' ? '立即购买' : 'BUY NOW')}
          </button>
        </div>
      </div>

      {isGalleryOpen && (
        <div className="fixed inset-0 z-[999] bg-[#121212] flex flex-col animate-in fade-in duration-200">
          <div className="flex items-center justify-between p-4 absolute top-0 w-full z-10 pointer-events-none">
            <div className="text-sm font-bold text-white tracking-widest px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg pointer-events-auto shadow-sm">
              {activeGalleryIndex + 1} <span className="text-gray-400 mx-1">/</span> {productImages.length}
            </div>
            <button onClick={() => setIsGalleryOpen(false)} className="p-2 bg-black/60 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors pointer-events-auto shadow-sm">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center justify-start pt-20 pb-4">
            <img src={productImages[activeGalleryIndex]} alt={`Screenshot ${activeGalleryIndex + 1}`} className="w-full h-auto object-contain max-w-2xl" />
          </div>
          <div className="bg-[#0a0a0a] border-t border-gray-800 pb-8 pt-4">
            <p className="text-center text-white/70 text-[10px] font-bold mb-3 uppercase tracking-widest">Screenshot</p>
            <div className="flex overflow-x-auto px-4 gap-3 snap-x hide-scrollbar justify-start md:justify-center">
              {productImages.map((imgUrl, idx) => (
                <button key={idx} onClick={() => setActiveGalleryIndex(idx)} className={`snap-center flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden transition-all duration-300 ${activeGalleryIndex === idx ? 'border-2 border-white opacity-100 scale-105 shadow-lg' : 'border-2 border-transparent opacity-40 hover:opacity-100'}`}>
                  <img src={imgUrl} className="w-full h-full object-cover" alt={`Thumb ${idx}`} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductDetail;