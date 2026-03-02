// app/HealthProfileEmptyScreen.js
import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

export default function HealthProfileEmptyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/HomeScreen')}>
          <MaterialIcons name="arrow-back" size={22} color="#356" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông Tin Sức Khỏe</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Empty card */}
      <View style={styles.card}>
        <MaterialIcons name="person-outline" size={46} color="#4b7566" style={{ marginBottom: 10 }} />
        <Text style={styles.title}>Chưa có hồ sơ sức khỏe</Text>
        <Text style={styles.subtitle}>Vui lòng tạo hồ sơ sức khỏe trước để xem thông tin.</Text>

        {/* ✅ Nút điều hướng tới HealthFormScreen */}
        <TouchableOpacity
          style={styles.buttonGreen}
          activeOpacity={0.85}
          onPress={() => router.push('/HealthFormScreen')}
        >
          <MaterialIcons name="edit" size={18} color="#fff" />
          <Text style={styles.buttonText}>Điền thông tin sức khỏe</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef8f2', padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#123' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 40,
    paddingHorizontal: 16,
    marginTop: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#234' },
  subtitle: { marginTop: 6, color: '#567', textAlign: 'center', marginBottom: 16 },
  buttonGreen: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#17863d',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
