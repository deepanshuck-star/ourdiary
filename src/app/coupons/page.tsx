'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import {
  Sparkles,
  CheckCircle2,
  Gift,
  X,
} from 'lucide-react';
import { formatDate } from '@/lib/date-utils';

export default function CouponsPage() {
  const { data, partnerProfile, addLoveCoupon, redeemLoveCoupon } = useDiary();

  const [filter, setFilter] = useState<'all' | 'active' | 'redeemed'>('all');
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [couponTitle, setCouponTitle] = useState('');
  const [couponDesc, setCouponDesc] = useState('');
  const [couponCat, setCouponCat] = useState('Pampering');

  const coupons = data.loveCoupons || [];

  const filteredCoupons = coupons.filter((c) => {
    if (filter === 'active') return !c.redeemed;
    if (filter === 'redeemed') return c.redeemed;
    return true;
  });

  const handleGiftCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponTitle.trim()) return;
    addLoveCoupon(couponTitle.trim(), couponDesc.trim(), couponCat);
    setCouponTitle('');
    setCouponDesc('');
    setShowGiftModal(false);
  };

  const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    Pampering: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
    Chores: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    Entertainment: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    Food: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    Treats: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    Love: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
        {/* Header Banner */}
        <div className="rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-hero">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-3xl shadow-xs">
              🎟️
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">Love Coupons & Scratch Vouchers</h1>
              <p className="text-xs sm:text-sm text-slate-700 font-medium">
                Sweet digital coupons gifted between {data.couple.name}. Redeem anytime on demand!
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowGiftModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-ink text-white font-bold text-xs sm:text-sm shadow-md hover:opacity-95 transition-all flex items-center gap-2 active:scale-95"
          >
            <Gift className="w-4 h-4 text-amber-300" />
            <span>Gift New Coupon</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex rounded-2xl bg-slate-100 p-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              All Vouchers ({coupons.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === 'active' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-500'
              }`}
            >
              Active ({coupons.filter((c) => !c.redeemed).length})
            </button>
            <button
              onClick={() => setFilter('redeemed')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === 'redeemed' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500'
              }`}
            >
              Redeemed ({coupons.filter((c) => c.redeemed).length})
            </button>
          </div>
        </div>

        {/* Coupons Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCoupons.map((coupon) => {
            const colors = CATEGORY_COLORS[coupon.category] || CATEGORY_COLORS.Love;
            const isRedeemed = coupon.redeemed;

            return (
              <div
                key={coupon.id}
                className={`rounded-3xl p-6 border transition-all flex flex-col justify-between relative overflow-hidden group ${
                  isRedeemed
                    ? 'bg-slate-50/70 border-slate-200 opacity-75'
                    : 'bg-white border-line shadow-sm hover:shadow-md'
                }`}
              >
                {/* Perforated Ticket Edges */}
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-canvas border-r border-line" />
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-canvas border-l border-line" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}
                    >
                      {coupon.category}
                    </span>

                    {isRedeemed ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Redeemed
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Ready to Claim
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-snug">
                      {coupon.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {coupon.description}
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-dashed border-slate-200 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    {isRedeemed && coupon.redeemedAt
                      ? `Used on ${formatDate(coupon.redeemedAt)}`
                      : 'Valid forever 💕'}
                  </span>

                  {!isRedeemed ? (
                    <button
                      onClick={() => redeemLoveCoupon(coupon.id)}
                      className="px-3.5 py-1.5 font-bold text-xs transition-opacity active:scale-95 bg-primary hover:bg-primary-hover text-on-primary shadow-cta rounded-full"
                    >
                      Redeem Now! ✨
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 font-semibold italic">Fulfilled with love</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Gift Coupon Modal */}
        {showGiftModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-purple-600" />
                  Gift a Love Coupon to {partnerProfile.name}
                </h3>
                <button
                  onClick={() => setShowGiftModal(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleGiftCoupon} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Coupon Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1 Free 30-Min Foot Rub 💆‍♂️"
                    value={couponTitle}
                    onChange={(e) => setCouponTitle(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-focus focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Description / Perks</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Can be redeemed anytime with no questions asked!"
                    value={couponDesc}
                    onChange={(e) => setCouponDesc(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-focus focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={couponCat}
                    onChange={(e) => setCouponCat(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-focus focus:outline-hidden bg-white"
                  >
                    <option value="Pampering">Pampering 💆‍♀️</option>
                    <option value="Chores">Chores & Pass 🍽️</option>
                    <option value="Entertainment">Entertainment 🎬</option>
                    <option value="Food">Food & Treats 🥞</option>
                    <option value="Love">Pure Romance 💖</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowGiftModal(false)}
                    className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 text-xs font-bold bg-primary hover:bg-primary-hover text-on-primary shadow-cta rounded-full"
                  >
                    Gift Voucher 🎟️
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
