import os

SCREENS_DIR = os.path.join('src', 'screens')

# Single quotes - used in JS variables/props
SINGLE = [
    ("'My Orders'", "t('orders.myOrders')"),
    ("'Cart'", "t('cart.myCart')"),
    ("'Returns & Refunds'", "t('profile.returns')"),
    ("'VUMA Wallet'", "t('profile.wallet')"),
    ("'Help Center'", "t('profile.helpCenter')"),
    ("'Notifications'", "t('profile.notifications')"),
    ("'Settings'", "t('profile.settings')"),
    ("'Logout'", "t('auth.logout')"),
    ("'Profile'", "t('profile.profile')"),
    ("'Chat Support'", "t('profile.chatSupport')"),
    ("'Add to Cart'", "t('products.addToCart')"),
    ("'Buy Now'", "t('products.buyNow')"),
    ("'Out of Stock'", "t('products.outOfStock')"),
    ("'Checkout'", "t('cart.checkout')"),
    ("'Subtotal'", "t('cart.subtotal')"),
    ("'Shipping'", "t('cart.shipping')"),
    ("'Total'", "t('cart.total')"),
    ("'Pending'", "t('orders.pending')"),
    ("'Processing'", "t('orders.processing')"),
    ("'Shipped'", "t('orders.shipped')"),
    ("'Delivered'", "t('orders.delivered')"),
    ("'Cancelled'", "t('orders.cancelled')"),
    ("'Dashboard'", "t('vendor.dashboard')"),
    ("'My Products'", "t('vendor.myProducts')"),
]

# Double quotes in JSX attributes - need curly braces
DOUBLE = [
    ('"My Orders"', "{t('orders.myOrders')}"),
    ('"Cart"', "{t('cart.myCart')}"),
    ('"Returns & Refunds"', "{t('profile.returns')}"),
    ('"VUMA Wallet"', "{t('profile.wallet')}"),
    ('"Help Center"', "{t('profile.helpCenter')}"),
    ('"Notifications"', "{t('profile.notifications')}"),
    ('"Settings"', "{t('profile.settings')}"),
    ('"Logout"', "{t('auth.logout')}"),
    ('"Profile"', "{t('profile.profile')}"),
    ('"Chat Support"', "{t('profile.chatSupport')}"),
    ('"Add to Cart"', "{t('products.addToCart')}"),
    ('"Buy Now"', "{t('products.buyNow')}"),
    ('"Out of Stock"', "{t('products.outOfStock')}"),
    ('"Checkout"', "{t('cart.checkout')}"),
    ('"Subtotal"', "{t('cart.subtotal')}"),
    ('"Shipping"', "{t('cart.shipping')}"),
    ('"Total"', "{t('cart.total')}"),
    ('"Pending"', "{t('orders.pending')}"),
    ('"Processing"', "{t('orders.processing')}"),
    ('"Shipped"', "{t('orders.shipped')}"),
    ('"Delivered"', "{t('orders.delivered')}"),
    ('"Cancelled"', "{t('orders.cancelled')}"),
    ('"Dashboard"', "{t('vendor.dashboard')}"),
    ('"My Products"', "{t('vendor.myProducts')}"),
]

fixed = 0
for root, dirs, files in os.walk(SCREENS_DIR):
    for file in files:
        if file.endswith('.js'):
            fp = os.path.join(root, file)
            with open(fp, 'r', encoding='utf-8') as f:
                content = f.read()
            original = content
            for old, new in SINGLE + DOUBLE:
                content = content.replace(old, new)
            if content != original:
                with open(fp, 'w', encoding='utf-8') as f:
                    f.write(content)
                print('Fixed: ' + file)
                fixed += 1

print('Done! Fixed ' + str(fixed) + ' files.')