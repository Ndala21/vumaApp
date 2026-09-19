/**
 * VUMA Store — Diagnostic Log View (TEMPORARY)
 * Renders the shared diagnostic log directly on screen so events can
 * be read/screenshotted without ADB or video upload. Remove once the
 * search keyboard bug is found and fixed.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { getDiagLogs, subscribeDiagLog, clearDiagLogs } from './diagnosticLog';

export default function DiagnosticLogView() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const unsub = subscribeDiagLog(() => forceUpdate((n) => n + 1));
    return unsub;
  }, []);

  const logs = getDiagLogs();

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>🔴 DIAGNOSTIC LOG ({logs.length})</Text>
        <TouchableOpacity onPress={clearDiagLogs} style={styles.clearBtn}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.logBox} nestedScrollEnabled>
        {logs.length === 0 ? (
          <Text style={styles.empty}>No events yet - tap the input below</Text>
        ) : (
          logs.map((line, i) => (
            <Text key={i} style={styles.logLine} selectable>{line}</Text>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#1a1a1a', margin: 8, borderRadius: 8, padding: 8, borderWidth: 2, borderColor: '#ff4444' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { color: '#ff8888', fontSize: 12, fontWeight: 'bold' },
  clearBtn: { backgroundColor: '#333', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  clearText: { color: '#fff', fontSize: 11 },
  logBox: { maxHeight: 180, backgroundColor: '#000', borderRadius: 6, padding: 6 },
  empty: { color: '#888', fontSize: 11, fontStyle: 'italic' },
  logLine: { color: '#00ff00', fontSize: 10.5, fontFamily: 'monospace', marginBottom: 2 },
});