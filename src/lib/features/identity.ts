// Who you are in the app, and what you may do as that person.
//
// One couple, one shared space — but two people. A signed-in account is
// exactly one of them, decided by the database when you sign in (whoever
// created the space is user_1, whoever joined with the code is user_2), and
// never by a toggle. Only demo mode, where one device has to play both
// partners, lets the view switch.
//
// Import-free so tests/identity.test.mjs can load it directly.

export type Slot = 'user_1' | 'user_2';

/** True only when there is no signed-in account behind this device. */
export function canSwitchProfile(isLiveUser: boolean, currentUserId: string | null): boolean {
  return !(isLiveUser && currentUserId);
}

/**
 * The partner this account IS, from the role the database recorded. Null
 * when there is no signed-in account, or the role is not known yet.
 */
export function accountSlot(
  isLiveUser: boolean,
  currentUserId: string | null,
  myRole: 'creator' | 'partner' | undefined | null
): Slot | null {
  if (!isLiveUser || !currentUserId || !myRole) return null;
  return myRole === 'partner' ? 'user_2' : 'user_1';
}

/** A profile may be changed by its owner — or by anyone in demo mode. */
export function mayEditProfile(canSwitch: boolean, target: Slot, me: Slot): boolean {
  return canSwitch || target === me;
}

/** A coupon is for its recipient to use, never for the person who gave it. */
export function mayRedeemCoupon(coupon: { toId: string; redeemed?: boolean }, me: Slot): boolean {
  return !coupon.redeemed && coupon.toId === me;
}
