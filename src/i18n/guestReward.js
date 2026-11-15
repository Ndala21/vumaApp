/**
 * VUMA Store - the words of the guest sign-up banner, in the six app languages.
 * Kept in its own small file so the banner can be added without touching the big translation file.
 *
 * With an amount from the server (see utils/referralOffer.js) the banner says exactly what one invite pays:
 *   title = earn + amount ("Earn TZS 2,000 per invite"), sub = when it is paid (at sign-up, or after the first order).
 * Without one it falls back to the general words (title/sub), which name no amount.
 */
export const GUEST_REWARD = {
  en: {
    title: 'Get your invite link',
    sub: 'Sign up, share with friends, earn rewards in your wallet.',
    earn: 'Earn {amount} per invite',
    subSignup: 'Sign up, share your link. Paid when a friend joins.',
    subOrder: 'Sign up, share your link. Paid after their first order.',
    join: 'Sign up',
    signIn: 'Sign in',
  },
  ko: {
    title: '초대 링크를 받으세요',
    sub: '가입하고 친구를 초대하면 지갑으로 보상이 들어와요.',
    earn: '초대할 때마다 {amount} 적립',
    subSignup: '가입하고 링크를 공유하세요. 친구가 가입하면 지급돼요.',
    subOrder: '가입하고 링크를 공유하세요. 친구의 첫 주문 후 지급돼요.',
    join: '가입하기',
    signIn: '로그인',
  },
  zh: {
    title: '获取你的邀请链接',
    sub: '注册后邀请好友，奖励直接进入你的钱包。',
    earn: '每邀请一人赚 {amount}',
    subSignup: '注册并分享链接，好友加入后奖励即到账。',
    subOrder: '注册并分享链接，好友首单后奖励到账。',
    join: '立即注册',
    signIn: '登录',
  },
  sw: {
    title: 'Pata kiungo chako cha kualika',
    sub: 'Jisajili, alika marafiki, pata zawadi kwenye pochi yako.',
    earn: 'Pata {amount} kwa kila mwaliko',
    subSignup: 'Jisajili, shiriki kiungo. Unalipwa rafiki akijiunga.',
    subOrder: 'Jisajili, shiriki kiungo. Unalipwa baada ya oda yake ya kwanza.',
    join: 'Jisajili',
    signIn: 'Ingia',
  },
  fr: {
    title: "Obtenez votre lien d'invitation",
    sub: 'Invitez vos amis et gagnez des récompenses.',
    earn: 'Gagnez {amount} par invitation',
    subSignup: "Inscrivez-vous, partagez. Payé dès qu'un ami s'inscrit.",
    subOrder: 'Inscrivez-vous, partagez. Payé après sa première commande.',
    join: "S'inscrire",
    signIn: 'Se connecter',
  },
  ar: {
    title: 'احصل على رابط الدعوة',
    sub: 'سجّل، ادعُ أصدقاءك، واحصل على مكافآت في محفظتك.',
    earn: 'اربح {amount} عن كل دعوة',
    subSignup: 'سجّل وشارك رابطك. تصلك عند انضمام صديقك.',
    subOrder: 'سجّل وشارك رابطك. تصلك بعد أول طلب لصديقك.',
    join: 'سجّل الآن',
    signIn: 'تسجيل الدخول',
  },
};

// offer: { text: 'TZS 2,000', atSignup: true } or nothing. Returns { title, sub, join, signIn }.
export const guestRewardText = (locale, offer) => {
  const w = GUEST_REWARD[locale] || GUEST_REWARD.en;
  if (!offer || !offer.text) return { title: w.title, sub: w.sub, join: w.join, signIn: w.signIn };
  // a non-breaking space keeps "TZS" and the number together on one line
  return {
    title: w.earn.replace('{amount}', String(offer.text).replace(/ /g, '\u00A0')),
    sub: offer.atSignup ? w.subSignup : w.subOrder,
    join: w.join,
    signIn: w.signIn,
  };
};
