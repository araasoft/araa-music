// components/StorageStatus.jsx
import React from 'react';
import { View, Text, ProgressBar, StyleSheet } from 'react-native';

export const StorageStatus = ({ storageInfo }) => {
  const getStorageColor = (percentUsed) => {
    if (percentUsed > 90) return '#FF6B6B'; // Red
    if (percentUsed > 75) return '#FFA500'; // Orange
    return '#4CAF50'; // Green
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const storageColor = getStorageColor(storageInfo.percentUsed);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Device Storage</Text>
        <Text style={[styles.percent, { color: storageColor }]}>
          {Math.round(storageInfo.percentUsed)}% Used
        </Text>
      </View>

      <ProgressBar
        progress={storageInfo.percentUsed / 100}
        color={storageColor}
        style={styles.progressBar}
      />

      <View style={styles.details}>
        <View style={styles.row}>
          <Text style={styles.label}>Total:</Text>
          <Text style={styles.value}>
            {formatBytes(storageInfo.totalSpace)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Used:</Text>
          <Text style={styles.value}>
            {formatBytes(storageInfo.usedSpace)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Available:</Text>
          <Text style={[styles.value, { color: storageInfo.canDownload ? '#4CAF50' : '#FF6B6B' }]}>
            {formatBytes(storageInfo.freeSpace)}
          </Text>
        </View>
      </View>

      {!storageInfo.canDownload && (
        <Text style={styles.warning}>
          ⚠️ Low storage - Downloads may fail
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, marginVertical: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '600' },
  percent: { fontSize: 14, fontWeight: '600' },
  progressBar: { height: 8, borderRadius: 4, marginBottom: 12 },
  details: { marginTop: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  label: { fontSize: 12, color: '#666' },
  value: { fontSize: 12, fontWeight: '500' },
  warning: { marginTop: 10, padding: 8, backgroundColor: '#FFE0B2', color: '#E65100', borderRadius: 4 },
});