/**
 * VUMA Store - a back button that always goes somewhere.
 *
 * An iPhone has no back key, and a screen that slides up from the bottom (like Sign In)
 * cannot be swiped away. goBackOrHome goes back when there is a screen to go back to.
 * If there is none (the screen was opened straight from a link), it goes to the Home tabs.
 */
export function rootNavigator(navigation) {
  let nav = navigation;
  for (let i = 0; i < 8 && nav && typeof nav.getParent === 'function' && nav.getParent(); i += 1) {
    nav = nav.getParent();
  }
  return nav;
}

export function goBackOrHome(navigation) {
  if (!navigation) return false;
  try {
    if (typeof navigation.canGoBack === 'function' && navigation.canGoBack()) {
      navigation.goBack();
      return true;
    }
  } catch (e) {
    // fall through to the Home tabs
  }
  try {
    const root = rootNavigator(navigation);
    root.reset({ index: 0, routes: [{ name: 'Main' }] });
    return true;
  } catch (e) {
    return false;
  }
}
