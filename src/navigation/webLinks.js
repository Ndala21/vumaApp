/**
 * VUMA Store - a product link from the web opens the product inside the app.
 *
 * Google results, shared links and the product pages all use https://vumashop.online/p/<product id>/ .
 * When the app is installed, Android hands such a link to the app (Android App Links: the intent filter in app.json and the
 * file https://vumashop.online/.well-known/assetlinks.json on the website). The app does not need a second kind of screen
 * address for it: this file turns the web link into the app's own address, vuma://product/<id>, which the navigation
 * already knows (the same address the ads and push messages use).
 *
 *   appLinkFromWeb(url) -> 'vuma://product/<id>' for a real product link of VUMA's website,
 *                          otherwise the url exactly as it came (so every other link works as before).
 *
 * Only an address with a real product id is accepted; nothing else on the website can open a screen.
 */

const WEB_HOSTS = ['vumashop.online', 'www.vumashop.online'];
const PRODUCT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function appLinkFromWeb(url) {
  if (typeof url !== 'string') return url;
  const match = /^https:\/\/([^/?#:@]+)\/p\/([^/?#]+)\/?(?:[?#].*)?$/i.exec(url.trim());
  if (!match) return url;
  if (WEB_HOSTS.indexOf(match[1].toLowerCase()) === -1) return url;
  if (!PRODUCT_ID.test(match[2])) return url;
  return 'vuma://product/' + match[2].toLowerCase();
}
