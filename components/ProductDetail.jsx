"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Heart, ShoppingCart, HardDrive, Info, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const ProductDetail = ({ game, allGames, onBack, onBuyNow, onGameClick }) => {
  const [user, setUser] = useState(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isUpdatingWishlist, setIsUpdatingWishlist] = useState(false);

  useEffect(() => {
    const initData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user || null;
      setUser(currentUser);

      // If logged in, check if this game is already in their wishlist
      if (currentUser && game) {
        const { data } = await supabase
          .from('wishlist')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('game_id', game.id)
          .single();
        
        if (data) setIsWishlisted(true);
      }
    };
    initData();
  }, [game]);

  if (!game) return null;

  const getEmbedUrl = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null;
  };

  const embedUrl = getEmbedUrl(game.youtube_link);
  const recommendedGames = allGames.filter(g => g.id !== game.id).slice(0, 5);

  // --- DATABASE FUNCTIONS ---
  const handleToggleWishlist = async () => {
    if (!user) {
      toast.error("Please Sign In to add to wishlist.");
      return;
    }
    
    setIsUpdatingWishlist(true);
    try {
      if (isWishlisted) {
        // Remove from wishlist
        await supabase.from('wishlist').delete().eq('user_id', user.id).eq('game_id', game.id);
        setIsWishlisted(false);
        toast.success("Removed from Wishlist", { icon: '💔' });
      } else {
        // Add to wishlist
        await supabase.from('wishlist').insert([{ user_id: user.id, game_id: game.id }]);
        setIsWishlisted(true);
        toast.success("Added to Wishlist", { icon: '❤️' });
      }
    } catch (error) {
      toast.error("Could not update wishlist.");
    } finally {
      setIsUpdatingWishlist(false);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      toast.error("Please Sign In to add to cart.");
      return;
    }

    setIsAddingToCart(true);
    try {
      // Try to insert. If it already exists, the unique constraint will fail
      const { error } = await supabase.from('cart').insert([{ user_id: user.id, game_id: game.id }]);
      
      if (error && error.code === '23505') { 
        toast.success("Game is already in your cart!");
      } else if (error) {
        throw error;
      } else {
        toast.success("Added to Cart!");
        // Tell the Header to update its numbers
        window.dispatchEvent(new Event('cartUpdated'));
      }
    } catch (error) {
      toast.error("Could not add to cart.");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!user) {
      toast.error("Please Sign In to purchase.");
      return;
    }
    await handleAddToCart();
    onBuyNow();
  };

  return (
    <div className="flex flex-col bg-gray-50 pb-20 animate-in slide-in-from-right duration-300">
      
      <div className="sticky top-0 z-50 flex items-center justify-between bg-white px-4 py-3 shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all">
          <ArrowLeft className="h-6 w-6 text-gray-800" />
        </button>
        <span className="font-bold text-gray-900 truncate px-4">{game.name}</span>
        <button onClick={handleToggleWishlist} disabled={isUpdatingWishlist} className="p-2 -mr-2 rounded-full hover:bg-red-50 active:scale-95 transition-all">
          <Heart className={`h-6 w-6 transition-colors ${isWishlisted ? 'fill-[#e31818] text-[#e31818]' : 'text-gray-800'}`} />
        </button>
      </div>

      <div className="w-full aspect-square bg-gray-200">
        <img src={game.cover_image} alt={game.name} className="h-full w-full object-cover" />
      </div>

      <div className="p-5 bg-white shadow-sm">
        <h1 className="text-2xl font-black text-gray-900 leading-tight">{game.name}</h1>
        <div className="mt-2 flex items-end gap-3">
          {game.discount_price ? (
            <>
              <span className="text-2xl font-black text-[#e31818]">{game.discount_price} MMK</span>
              <span className="text-sm font-bold text-gray-400 line-through mb-1">{game.price} MMK</span>
            </>
          ) : (
            <span className="text-2xl font-black text-[#e31818]">{game.price} MMK</span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700">
            <HardDrive className="h-3.5 w-3.5" /> {game.size}
          </span>
          {game.collections.map(c => (
            <span key={c} className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
              {c}
            </span>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <button 
            onClick={handleAddToCart} 
            disabled={isAddingToCart}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-gray-900 bg-white py-3.5 font-bold text-gray-900 hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50"
          >
            {isAddingToCart ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingCart className="h-5 w-5" />} 
            Cart
          </button>
          <button 
            onClick={handleBuyNow} 
            className="flex flex-1 items-center justify-center rounded-xl bg-[#e31818] py-3.5 font-bold text-white shadow-lg shadow-red-500/30 hover:bg-red-700 active:scale-95 transition-all"
          >
            Buy Now
          </button>
        </div>
      </div>

      {embedUrl && (
        <div className="mt-4 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-bold text-gray-900 flex items-center gap-2">
            <Info className="h-5 w-5 text-[#e31818]" /> Game Trailer
          </h3>
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-gray-900">
            <iframe src={embedUrl} title={`${game.name} Trailer`} allowFullScreen className="h-full w-full border-0"></iframe>
          </div>
        </div>
      )}

      <div className="mt-4 bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-bold text-gray-900">Description</h3>
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{game.description}</p>
      </div>

      {recommendedGames.length > 0 && (
        <div className="mt-4 bg-white pt-5 shadow-sm">
          <div className="px-5 mb-4">
            <h3 className="font-bold text-gray-900">Recommended Games</h3>
          </div>
          <div className="flex overflow-x-auto px-5 pb-6 gap-4 snap-x hide-scrollbar">
            {recommendedGames.map(recGame => (
              <div key={recGame.id} onClick={() => onGameClick(recGame)} className="min-w-[130px] max-w-[130px] snap-start flex flex-col gap-2 cursor-pointer active:scale-95 transition-transform">
                <div className="aspect-square w-full rounded-xl overflow-hidden bg-gray-100 shadow-sm border border-gray-100">
                  <img src={recGame.cover_image} alt={recGame.name} className="h-full w-full object-cover" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 truncate">{recGame.name}</h4>
                  <p className="text-xs font-semibold text-[#e31818] mt-0.5">{recGame.discount_price || recGame.price} MMK</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;