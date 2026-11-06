/**
 * VUMA Store - the words on the Invite & Earn screen, in one place so they can be tested.
 * Everything comes from the server (/referrals/code/ and /referrals/dashboard/); nothing is worked out here.
 */
import { tzs } from './rewards';

// How a friend is shown to the person who invited them.
export const FRIEND_STATUS = {
  waiting: { label: '⏳ Waiting for first order' },
  processing: { label: '🔄 Reward on its way' },
  rewarded: { label: '✅ Reward paid' },
  not_eligible: { label: 'Not eligible' },
};

/** The title and the sentence under it, from the running campaign. */
export function heroLines(data) {
  const campaign = data && data.campaign;
  const reward = campaign ? Number(campaign.referrer_reward) || 0 : 0;
  if (!campaign || reward <= 0 || campaign.referrer_reward_type !== 'cash') {
    return {
      title: 'Invite friends and earn rewards',
      sub: 'Share VUMA with your friends. When they join and pay for their first order, you get your reward.',
    };
  }
  const gift = Number(campaign.friend_gift) || 0;
  const min = Number(campaign.min_order_amount) || 0;
  return {
    title: `Earn ${tzs(reward)} for every friend`,
    sub: `Your friend gets a welcome gift${gift > 0 ? ` of ${tzs(gift)}` : ''}. `
      + `When they pay for their first order${min > 0 ? ` (${tzs(min)} or more)` : ''}, `
      + `${tzs(reward)} goes into your VUMA wallet.`,
  };
}

const OLD_STATUS = { rewarded: 'rewarded', completed: 'processing', registered: 'waiting' };

/** The list of friends: [{ name, initial, joined, status }]. An older server only sends recent_referrals. */
export function friendRows(data) {
  if (!data) return [];
  if (Array.isArray(data.friends)) {
    return data.friends.map((f) => {
      const name = String(f.name || 'A friend');
      return { name, initial: name[0].toUpperCase(), joined: f.joined_on || '', status: f.status || 'waiting' };
    });
  }
  const old = Array.isArray(data.recent_referrals) ? data.recent_referrals : [];
  return old
    .filter((r) => r && r.status !== 'clicked')
    .map((r) => {
      const name = String(r.referee__username || 'A friend');
      return { name, initial: name[0].toUpperCase(), joined: '', status: OLD_STATUS[r.status] || 'waiting' };
    });
}
