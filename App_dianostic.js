/**
 * VUMA App.js — Diagnostic version
 * Shows exact crash error instead of blank crash
 */

import React, { Component } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Provider } from 'react-redux';
import { store } from './src/store';

// Error Boundary catches JS crashes and shows them on screen
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ error, info });
    console.error('APP CRASH:', error);
    console.error('COMPONENT STACK:', info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ScrollView style={styles.errorContainer} contentContainerStyle={styles.errorContent}>
          <Text style={styles.errorTitle}>🔴 App Crash Detected</Text>
          <Text style={styles.errorSubtitle}>Copy this error and send it for fixing:</Text>
          <View style={styles.errorBox}>
            <Text style={styles.errorText} selectable>
              {this.state.error?.toString()}
            </Text>
          </View>
          {this.state.info && (
            <View style={styles.errorBox}>
              <Text style={styles.errorLabel}>Component Stack:</Text>
              <Text style={styles.errorText} selectable>
                {this.state.info.componentStack?.substring(0, 800)}
              </Text>
            </View>
          )}
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

// Lazy load AppNavigator to catch import errors
let AppNavigator;
let importError = null;

try {
  AppNavigator = require('./src/navigation/AppNavigator').default;
} catch (e) {
  importError = e;
}

export default function App() {
  if (importError) {
    return (
      <ScrollView style={styles.errorContainer} contentContainerStyle={styles.errorContent}>
        <Text style={styles.errorTitle}>🔴 Import Error</Text>
        <Text style={styles.errorText} selectable>
          {importError?.toString()}
        </Text>
      </ScrollView>
    );
  }

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <AppNavigator />
      </Provider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: { flex: 1, backgroundColor: '#1a1a1a' },
  errorContent: { padding: 20, paddingTop: 60 },
  errorTitle: { fontSize: 20, fontWeight: 'bold', color: '#ff4444', marginBottom: 8 },
  errorSubtitle: { fontSize: 14, color: '#aaa', marginBottom: 16 },
  errorLabel: { fontSize: 12, color: '#aaa', marginBottom: 4 },
  errorBox: { backgroundColor: '#2a2a2a', borderRadius: 8, padding: 12, marginBottom: 12 },
  errorText: { fontSize: 11, color: '#ff8888', fontFamily: 'monospace', lineHeight: 16 },
});
