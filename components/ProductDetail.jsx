"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShoppingCart, Heart, ChevronDown, ChevronUp, PlayCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const ProductDetail = ({ game, prefilledOption = null, allGames, onBack, onBuyNow, onGameClick }) => {
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

  useEffect(() => {
    checkWishlistStatus();
    setIsExpanded(false); 
    setIsPlayingTrailer(false);
    setQuantity(1); 

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
    if (!session) {
      toast.error("Please sign in to add to wishlist");
      return;
    }

    setIsWishlistLoading(true);
    try {
      if (isWishlisted) {
        await supabase.from('wishlist').delete().eq('user_id', session.user.id).eq('game_id', game.id);
        setIsWishlisted(false);
        toast.success("Removed from Wishlist");
      } else {
        await supabase.from('wishlist').insert([{ user_id: session.user.id, game_id: game.id }]);
        setIsWishlisted(true);
        toast.success("Added to Wishlist!");
      }
    } catch (error) { toast.error("An error occurred"); } finally { setIsWishlistLoading(false); }
  };

  // --- BULLETPROOF ADD TO CART LOGIC ---
  const handleAddToCart = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return toast.error("Please sign in first");

    setIsAddingCart(true);
    try {
      const cartData = {
        user_id: session.user.id,
        game_id: !isGiftCard ? game.id : null,
        gift_card_id: isGiftCard ? game.id : null,
        selected_option: isGiftCard ? selectedOption : null,
        quantity: isGiftCard ? quantity : 1 
      };

      // Fetch the entire cart for this user to check manually (Prevents 406 Error)
      const { data: userCart, error: fetchError } = await supabase
        .from('cart')
        .select('id, quantity, game_id, gift_card_id, selected_option')
        .eq('user_id', session.user.id);
        
      if (fetchError) throw fetchError;

      let existingCart = null;
      if (userCart && userCart.length > 0) {
        if (!isGiftCard) {
          existingCart = userCart.find(c => c.game_id === game.id);
        } else {
          existingCart = userCart.find(c => c.gift_card_id === game.id && c.selected_option?.label === selectedOption.label);
        }
      }
      
      if (existingCart) {
        // If it exists, update the quantity
        const newQuantity = (existingCart.quantity || 1) + (isGiftCard ? quantity : 1);
        const { error } = await supabase.from('cart').update({ quantity: newQuantity }).eq('id', existingCart.id);
        if (error) throw error;
        toast.success("Cart updated!");
      } else {
        // If it doesn't exist, insert the new row
        const { error } = await supabase.from('cart').insert([cartData]);
        if (error) throw error;
        toast.success("Added to Cart!");
      }
      
      // Trigger Header Update
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) { 
      console.error("Cart Error:", error);
      toast.error("Failed to add to cart"); 
    } finally { 
      setIsAddingCart(false); 
    }
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
    <div className="flex flex-col min-h-screen bg-white pb-32 animate-in fade-in duration-300">
      
      {/* Top Header */}
      <div className="sticky top-0 z-50 flex items-center justify-between bg-white px-4 py-4 shadow-sm border-b border-gray-100">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95"><ArrowLeft className="h-6 w-6 text-gray-800" /></button>
        <h1 className="text-sm font-black text-gray-900 truncate px-4 uppercase">{game.name}</h1>
        {!isGiftCard ? (
          <button onClick={handleToggleWishlist} disabled={isWishlistLoading} className="p-2 -mr-2 rounded-full hover:bg-gray-100 active:scale-95">
            <Heart className={`h-6 w-6 transition-colors ${isWishlisted ? 'fill-[#e31818] text-[#e31818]' : 'text-gray-400'}`} />
          </button>
        ) : <div className="w-10"></div>}
      </div>

      {/* Image Display */}
      <div className={`w-full aspect-square bg-gray-50 flex items-center justify-center ${isGiftCard ? 'p-12' : ''}`}>
        <img src={game.cover_image || game.image} alt={game.name} className={isGiftCard ? "w-full h-full object-contain drop-shadow-lg" : "w-full h-full object-cover"} />
      </div>

      <div className="p-5">
        <h2 className="text-xl font-black text-gray-900 mb-6">{game.name}</h2>
        
        {isGiftCard ? (
          <div className="flex flex-col mb-8 border-b border-gray-100 pb-8">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Select Denomination</h3>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {game.options?.map((opt, idx) => (
                <button 
                  key={idx}
                  onClick={() => setSelectedOption(opt)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${selectedOption?.label === opt.label ? 'border-[#e31818] bg-[#e31818] text-white shadow-lg' : 'border-gray-100 bg-white text-gray-600'}`}
                >
                  <p className="text-[10px] font-bold opacity-70 mb-1">{opt.label}</p>
                  <p className="text-sm font-black">{Number(opt.price).toLocaleString()} MMK</p>
                </button>
              ))}
            </div>

            {/* QUANTITY SELECTOR */}
            <div className="flex justify-center">
              <div className="flex items-center gap-6 bg-gray-50 rounded-full px-5 py-2.5 border border-gray-200 shadow-inner">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-9 h-9 flex items-center justify-center rounded-full bg-white text-gray-600 hover:text-[#e31818] hover:bg-red-50 shadow border border-gray-200 font-bold text-2xl transition-colors active:scale-95">-</button>
                <span className="font-black text-xl w-6 text-center text-gray-900">{quantity}</span>
                <button onClick={() => setQuantity(q => q + 1)} className="w-9 h-9 flex items-center justify-center rounded-full bg-[#e31818] text-white shadow-md font-bold text-2xl transition-transform active:scale-95">+</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 mb-6">
            {game.discount_price ? (
              <>
                <span className="text-xl font-black text-[#e31818]">{game.discount_price.toLocaleString()} MMK</span>
                <span className="text-sm font-bold text-gray-400 line-through">{game.price.toLocaleString()} MMK</span>
              </>
            ) : (
              <span className="text-xl font-black text-[#e31818]">{game.price.toLocaleString()} MMK</span>
            )}
          </div>
        )}

        {/* Tags */}
        {!isGiftCard && (
          <div className="flex flex-wrap gap-2 mb-6">
            {game.size && <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">{game.size}</span>}
            {game.collections?.map(tag => (
              <span key={tag} className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">{tag}</span>
            ))}
          </div>
        )}

        {/* INLINE GAME TRAILER */}
        {!isGiftCard && game.youtube_link && (
          <div className="mb-6 border-t border-gray-100 pt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Official Trailer</h3>
            {!isPlayingTrailer && youtubeId ? (
              <button onClick={() => setIsPlayingTrailer(true)} className="w-full flex items-center justify-center gap-2 bg-red-50 text-[#e31818] py-3 rounded-xl font-bold hover:bg-red-100 active:scale-95 transition-all">
                <PlayCircle className="h-5 w-5" /> Watch Trailer
              </button>
            ) : isPlayingTrailer && youtubeId ? (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-sm">
                <iframe src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`} className="absolute top-0 left-0 w-full h-full border-0" allow="autoplay; encrypted-media" allowFullScreen></iframe>
              </div>
            ) : null}
          </div>
        )}

        {/* Description */}
        <div className="mb-6 pt-4 border-t border-gray-100">
          <h3 className="text-sm font-black text-gray-900 mb-2">Product Info</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
            {shouldTruncate && !isExpanded ? `${game.description.substring(0, DESCRIPTION_LIMIT)}...` : game.description}
          </p>
          {shouldTruncate && (
            <button onClick={() => setIsExpanded(!isExpanded)} className="mt-2 flex items-center gap-1 text-xs font-black text-blue-600 active:scale-95 transition-transform">
              {isExpanded ? <>SHOW LESS <ChevronUp className="h-4 w-4" /></> : <>READ MORE <ChevronDown className="h-4 w-4" /></>}
            </button>
          )}
        </div>

      </div>

      {/* Recommended Games */}
      {recommendedGames.length > 0 && (
        <div className="mb-8 border-t border-gray-100 pt-6">
          <div className="px-4 mb-4">
            <h3 className="text-lg font-bold text-gray-900">Recommended Games</h3>
          </div>
          <div className="flex overflow-x-auto px-4 pb-4 gap-4 snap-x hide-scrollbar">
            {recommendedGames.map(rGame => (
              <div key={rGame.id} onClick={() => onGameClick(rGame)} className="min-w-[130px] max-w-[130px] snap-start flex flex-col gap-2 cursor-pointer active:scale-95 transition-transform">
                <div className="aspect-square w-full rounded-xl overflow-hidden bg-gray-100 shadow-sm border border-gray-100">
                  <img src={rGame.cover_image} alt={rGame.name} className="h-full w-full object-cover" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-900 truncate">{rGame.name}</h3>
                  <p className="text-xs font-semibold text-[#e31818] mt-0.5">{rGame.discount_price || rGame.price} MMK</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 p-4 flex flex-col gap-3 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <div className="flex justify-between items-center mb-1 px-1">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total {isGiftCard && `(x${quantity})`}</span>
          <span className="text-lg font-black text-[#e31818]">{totalPrice.toLocaleString()} MMK</span>
        </div>
        
        <div className="flex gap-3">
          <button onClick={handleAddToCart} disabled={isAddingCart || (isGiftCard && !selectedOption)} className="flex items-center justify-center w-14 rounded-xl bg-gray-100 text-gray-900 font-bold active:scale-95 transition-transform disabled:opacity-50">
            <ShoppingCart className="h-5 w-5" />
          </button>
          <button onClick={handleBuyNow} disabled={isGiftCard && !selectedOption} className="flex-1 items-center justify-center rounded-xl bg-[#e31818] text-white font-black py-3.5 shadow-lg shadow-red-500/30 active:scale-95 transition-transform hover:bg-red-700 disabled:opacity-50">
            {isPreOrder ? 'PRE-ORDER' : 'BUY NOW'}
          </button>
        </div>
      </div>

    </div>
  );
};

export default ProductDetail;