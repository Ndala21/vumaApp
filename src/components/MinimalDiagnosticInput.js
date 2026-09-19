/**
 * VUMA Store — Minimal Diagnostic TextInput (TEMPORARY)
 * Zero dependencies on purpose: no search state, no Redux, no API
 * calls, no navigation, no animations, no custom wrappers, no
 * keyboard dismissal logic. Just a bare TextInput with lifecycle
 * logging, to determine whether ANY input on Home keeps focus, or
 * whether the problem is specific to SearchBar/its integration.
 * Remove once the search keyboard bug is found and fixed.
 */
import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { diagLog } from './diagnosticLog';

export default function MinimalDiagnosticInput() {
  const [text, setText] = useState('');

  useEffect(() => {
    diagLog('MinimalInput: MOUNTED');
    return () => diagLog('MinimalInput: UNMOUNTED');
  }, []);

  return (
    <View style={styles.wrap}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={(t) => {
          diagLog(`MinimalInput: onChangeText "${t}"`);
          setText(t);
        }}
        onFocus={() => diagLog('MinimalInput: onFocus')}
        onBlur={() => diagLog('MinimalInput: onBlur')}
        placeholder="MINIMAL TEST INPUT - type here"
        placeholderTextColor="#999"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { margin: 8, marginTop: 0 },
  input: {
    backgroundColor: '#fff', borderWidth: 2, borderColor: '#ff4444',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, color: '#000',
  },
});