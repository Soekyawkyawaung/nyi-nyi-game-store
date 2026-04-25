"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShoppingCart, Heart, ChevronDown, ChevronUp, PlayCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const ProductDetail = ({ game, allGames, onBack, onBuyNow, onGameClick }) => {
  const [isAddingCart, setIsAddingCart] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  
  // --- READ MORE STATE ---
  const [isExpanded, setIsExpanded] = useState(false);
  const DESCRIPTION_LIMIT = 200; 
  const shouldTruncate = game.description && game.description.length > DESCRIPTION_LIMIT;

  // --- TRAILER STATE ---
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);

  useEffect(() => {
    checkWishlistStatus();
    // Reset states when opening a new game
    setIsExpanded(false); 
    setIsPlayingTrailer(false); 
  }, [game.id]);

  const checkWishlistStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase.from('wishlist').select('id').eq('user_id', session.user.id).eq('game_id', game.id).single();
      setIsWishlisted(!!data);
    }
  };

  const handleToggleWishlist = async () => {
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
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsWishlistLoading(false);
    }
  };

  const handleAddToCart = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please sign in to add to cart");
      return;
    }

    setIsAddingCart(true);
    try {
      const { data: existingCart } = await supabase.from('cart').select('id').eq('user_id', session.user.id).eq('game_id', game.id).single();
      
      if (existingCart) {
        toast('Game is already in your cart!', { icon: '🛒' });
      } else {
        const { error } = await supabase.from('cart').insert([{ user_id: session.user.id, game_id: game.id }]);
        if (error) throw error;
        toast.success("Added to Cart!");
        window.dispatchEvent(new Event('cartUpdated'));
      }
    } catch (error) {
      toast.error("Failed to add to cart");
    } finally {
      setIsAddingCart(false);
    }
  };

  const handleBuyNow = async () => {
    await handleAddToCart();
    onBuyNow();
  };

  // Helper to extract the YouTube video ID from the link
  const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const youtubeId = getYouTubeId(game.youtube_link);
  const isPreOrder = game.collections?.some(c => c.toLowerCase().includes('pre-order') || c.toLowerCase().includes('preorder'));
  
  // Get up to 6 recommended games (excluding the current one)
  const recommendedGames = allGames.filter(g => g.id !== game.id).slice(0, 6);

  return (
    <div className="flex flex-col min-h-screen bg-white pb-28">
      
      {/* Top Header */}
      <div className="sticky top-0 z-50 flex items-center justify-between bg-white px-4 py-4 shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-all active:scale-95">
          <ArrowLeft className="h-6 w-6 text-gray-800" />
        </button>
        <h1 className="text-lg font-black text-gray-900 truncate px-4">{game.name}</h1>
        <button onClick={handleToggleWishlist} disabled={isWishlistLoading} className="p-2 -mr-2 rounded-full hover:bg-gray-100 transition-all active:scale-95">
          <Heart className={`h-6 w-6 transition-colors ${isWishlisted ? 'fill-[#e31818] text-[#e31818]' : 'text-gray-400'}`} />
        </button>
      </div>

      {/* Cover Image */}
      <div className="w-full aspect-square bg-gray-100">
        <img src={game.cover_image} alt={game.name} className="w-full h-full object-cover" />
      </div>

      <div className="p-4">
        {/* Title and Price */}
        <h2 className="text-xl font-bold text-gray-900 mb-1">{game.name}</h2>
        <div className="flex items-center gap-3 mb-4">
          {game.discount_price ? (
            <>
              <span className="text-xl font-black text-[#e31818]">{game.discount_price.toLocaleString()} MMK</span>
              <span className="text-sm font-bold text-gray-400 line-through">{game.price.toLocaleString()} MMK</span>
            </>
          ) : (
            <span className="text-xl font-black text-[#e31818]">{game.price.toLocaleString()} MMK</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {game.size && <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">{game.size}</span>}
          {game.collections?.map(tag => (
            <span key={tag} className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">{tag}</span>
          ))}
        </div>

        {/* --- UPDATED: INLINE GAME TRAILER --- */}
        {game.youtube_link && (
          <div className="mb-6 border-t border-gray-100 pt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Game Trailer</h3>
            
            {!isPlayingTrailer && youtubeId ? (
              // Button state
              <button 
                onClick={() => setIsPlayingTrailer(true)} 
                className="w-full flex items-center justify-center gap-2 bg-red-50 text-[#e31818] py-3 rounded-xl font-bold hover:bg-red-100 active:scale-95 transition-all"
              >
                <PlayCircle className="h-5 w-5" /> Watch Trailer
              </button>
            ) : isPlayingTrailer && youtubeId ? (
              // Video Player state
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-sm">
                <iframe 
                  src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`} 
                  title="YouTube video player"
                  className="absolute top-0 left-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                ></iframe>
              </div>
            ) : (
              // Fallback just in case it's not a standard youtube link
              <a 
                href={game.youtube_link} 
                target="_blank" 
                rel="noreferrer" 
                className="w-full flex items-center justify-center gap-2 bg-red-50 text-[#e31818] py-3 rounded-xl font-bold hover:bg-red-100 active:scale-95 transition-all"
              >
                <PlayCircle className="h-5 w-5" /> Watch Trailer
              </a>
            )}
          </div>
        )}

        {/* Description with Read More */}
        <div className="mb-6 border-t border-gray-100 pt-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Description</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
            {shouldTruncate && !isExpanded 
              ? `${game.description.substring(0, DESCRIPTION_LIMIT)}...` 
              : game.description}
          </p>
          
          {shouldTruncate && (
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 flex items-center gap-1 text-sm font-bold text-blue-600 active:scale-95 transition-transform"
            >
              {isExpanded ? (
                <>Show Less <ChevronUp className="h-4 w-4" /></>
              ) : (
                <>Read More <ChevronDown className="h-4 w-4" /></>
              )}
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
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 p-4 flex gap-3 z-50">
        <button 
          onClick={handleAddToCart}
          disabled={isAddingCart}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-100 text-gray-900 font-bold py-3.5 active:scale-95 transition-transform disabled:opacity-50"
        >
          <ShoppingCart className="h-5 w-5" />
        </button>
        <button 
          onClick={handleBuyNow}
          className="flex flex-[2] items-center justify-center rounded-xl bg-[#e31818] text-white font-bold py-3.5 shadow-lg shadow-red-500/30 active:scale-95 transition-transform"
        >
          {isPreOrder ? 'Pre-Order' : 'Buy Now'}
        </button>
      </div>

    </div>
  );
};

export default ProductDetail;