import { registerRootComponent } from 'expo';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { store } from './src/store';
import { i18n } from './src/i18n';
import { useEffect, useState, Component } from 'react';

// ── Error Boundary ────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, stack: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    this.setState({ stack: info?.componentStack });
    console.error('VUMA CRASH:', error?.toString());
    console.error('STACK:', info?.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <ScrollView style={{ flex: 1, backgroundColor: '#111', padding: 20, paddingTop: 60 }}>
          <Text style={{ color: '#ff4444', fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
            🔴 App Crash — Send this to developer:
          </Text>
          <Text selectable style={{ color: '#ff8888', fontSize: 11, backgroundColor: '#222', padding: 12, borderRadius: 8, marginBottom: 12 }}>
            {this.state.error?.toString()}
          </Text>
          {this.state.stack ? (
            <Text selectable style={{ color: '#ffaa44', fontSize: 10, backgroundColor: '#222', padding: 12, borderRadius: 8 }}>
              {this.state.stack?.substring(0, 1000)}
            </Text>
          ) : null}
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

// ── Lazy import AppNavigator ──────────────────────────
let AppNavigator = null;
let importErr = null;
try {
  AppNavigator = require('./src/navigation/AppNavigator').default;
} catch (e) {
  importErr = e;
  console.error('IMPORT ERROR:', e?.toString());
}

function App() {
  const [i18nReady, setI18nReady] = useState(false);
  const [langKey, setLangKey] = useState('en');

  useEffect(() => {
    i18n.init().then(() => {
      setLangKey(i18n.getLocale());
      setI18nReady(true);
    }).catch(e => {
      console.error('i18n init error:', e);
      setI18nReady(true); // continue even if i18n fails
    });
    const unsubscribe = i18n.onChange((locale) => {
      setLangKey(locale + '_' + Date.now());
    });
    return unsubscribe;
  }, []);

  if (importErr) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#111', padding: 20, paddingTop: 60 }}>
        <Text style={{ color: '#ff4444', fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>
          🔴 Import Error — Send this to developer:
        </Text>
        <Text selectable style={{ color: '#ff8888', fontSize: 11, backgroundColor: '#222', padding: 12, borderRadius: 8 }}>
          {importErr?.toString()}
        </Text>
      </ScrollView>
    );
  }

  if (!i18nReady) return <View style={{ flex: 1, backgroundColor: '#fff' }} />;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <Provider store={store} key={langKey}>
            <AppNavigator />
          </Provider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

registerRootComponent(App);
export default App;
