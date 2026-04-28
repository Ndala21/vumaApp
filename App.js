import { registerRootComponent } from 'expo';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { StyleSheet } from 'react-native';
import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { i18n } from './src/i18n';
import { useEffect, useState } from 'react';

function App() {
  const [i18nReady, setI18nReady] = useState(false);
  const [langKey, setLangKey] = useState('en');

  useEffect(() => {
    i18n.init().then(() => {
      setLangKey(i18n.getLocale());
      setI18nReady(true);
    });
    const unsubscribe = i18n.onChange((locale) => {
      console.log('Language changed to:', locale);
      setLangKey(locale + '_' + Date.now()); // force unique key
    });
    return unsubscribe;
  }, []);

  if (!i18nReady) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <Provider store={store} key={langKey}>
          <AppNavigator />
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

registerRootComponent(App);
export default App;
