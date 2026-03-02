import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function ProgressBar({ step, total }) {
  const percentage = (step / total) * 100;
  return (
    <View style={styles.container}>
      <View style={[styles.bar, { width: `${percentage}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 8,
    width: '100%',
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 16,
  },
  bar: {
    height: '100%',
    backgroundColor: '#2e7d32',
  },
});
