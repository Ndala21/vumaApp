/**
 * VUMA Store - the words of the guest sign-up banner, in the six app languages.
 * Kept in its own small file so the banner can be added without touching the big translation file.
 * The banner names no amount, so these stay true when the reward changes in the console.
 */
export const GUEST_REWARD = {
  en: {
    title: 'Get your invite link',
    sub: 'Sign up, share with friends, earn rewards in your wallet.',
    join: 'Sign up',
    signIn: 'Sign in',
  },
  ko: {
    title: '초대 링크를 받으세요',
    sub: '가입하고 친구를 초대하면 지갑으로 보상이 들어와요.',
    join: '가입하기',
    signIn: '로그인',
  },
  zh: {
    title: '获取你的邀请链接',
    sub: '注册后邀请好友，奖励直接进入你的钱包。',
    join: '立即注册',
    signIn: '登录',
  },
  sw: {
    title: 'Pata kiungo chako cha kualika',
    sub: 'Jisajili, alika marafiki, pata zawadi kwenye pochi yako.',
    join: 'Jisajili',
    signIn: 'Ingia',
  },
  fr: {
    title: "Obtenez votre lien d'invitation",
    sub: 'Invitez vos amis et gagnez des récompenses.',
    join: "S'inscrire",
    signIn: 'Se connecter',
  },
  ar: {
    title: 'احصل على رابط الدعوة',
    sub: 'سجّل، ادعُ أصدقاءك، واحصل على مكافآت في محفظتك.',
    join: 'سجّل الآن',
    signIn: 'تسجيل الدخول',
  },
};

export const guestRewardText = (locale) => GUEST_REWARD[locale] || GUEST_REWARD.en;
