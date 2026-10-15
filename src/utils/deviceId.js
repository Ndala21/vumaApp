/**
 * VUMA Store — a random id for this phone, kept on the phone.
 *
 * The server uses it to make sure one welcome gift or coupon is not
 * claimed again and again from the same phone. It holds nothing about
 * the person, it is only random letters and numbers. Deleting the app
 * creates a new one.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@vuma_device_id';
let cached = null;

const makeId = () => {
  const part = () => Math.random().toString(36).slice(2, 10);
  return `dev-${Date.now().toString(36)}-${part()}${part()}`;
};

export async function getDeviceId() {
  if (cached) return cached;
  try {
    let id = await AsyncStorage.getItem(KEY);
    if (!id) {
      id = makeId();
      await AsyncStorage.setItem(KEY, id);
    }
    cached = id;
    return id;
  } catch {
    // Storage not available: send nothing rather than a new id every time.
    return '';
  }
}
