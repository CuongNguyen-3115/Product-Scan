// app/ProductAnalysisScreen.js
import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Image, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

export default function ProductAnalysisScreen() {
  const router = useRouter();
  const { photoUri, label: labelStr } = useLocalSearchParams();

  const label = useMemo(() => {
    try { return labelStr ? JSON.parse(labelStr) : null; } catch { return null; }
  }, [labelStr]);

  if (!label) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.pageTitle}>Không có dữ liệu nhãn</Text>
        <Text style={styles.dim}>Hãy quay lại và phân tích ảnh trước.</Text>
        <TouchableOpacity style={[styles.btnGreen, { marginTop: 12 }]} onPress={() => router.push('ScanProductScreen')}>
          <MaterialIcons name="arrow-back" size={18} color="#fff" />
          <Text style={styles.btnGreenText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ingredients = Array.isArray(label?.ingredients) ? label.ingredients : [];
  const allergensCount = ingredients.filter(it => it?.is_allergen).length;
  const nutrients = Array.isArray(label?.nutrition_facts?.nutrients)
    ? label.nutrition_facts.nutrients : [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Back icon top-left */}
      <TouchableOpacity
        onPress={() => router.push('ScanProductScreen')}
        style={styles.backIcon}
        accessibilityLabel="Quay lại quét ảnh"
      >
        <MaterialIcons name="arrow-back" size={22} color="#17863d" />
      </TouchableOpacity>

      {/* Header */}
      <Text style={styles.pageTitle}>Kết Quả Phân Tích</Text>
      <Text style={styles.method}>Phương pháp: Chụp ảnh</Text>

      {/* Hero card */}
      <View style={styles.hero}>
        {photoUri ? <Image source={{ uri: photoUri }} style={styles.preview} /> : <View style={styles.previewFallback} />}
        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <Text style={styles.heroTitle}>Sản phẩm đã quét</Text>
          <View style={styles.badgeOkay}><Text style={styles.badgeOkayText}>Đã phân tích</Text></View>
        </View>
      </View>

      {/* Tổng quan thành phần */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Tổng quan thành phần</Text>

        <View style={styles.metricsRow}>
          <View style={[styles.metricBox, styles.metricLeft]}>
            <Text style={styles.metricNumber}>{ingredients.length}</Text>
            <Text style={styles.metricLabel}>Tổng thành phần</Text>
          </View>
          <View style={[styles.metricBox, styles.metricRight]}>
            <Text style={[styles.metricNumber, { color: '#d93025' }]}>{allergensCount}</Text>
            <Text style={[styles.metricLabel, { color: '#d93025' }]}>Chất gây dị ứng</Text>
          </View>
        </View>

        <Text style={[styles.subheading, { marginTop: 14 }]}>Danh sách thành phần gốc:</Text>
        <Text style={styles.rawText}>{label.ingredients_raw || '(trống)'}</Text>
      </View>

      {/* Chi tiết thành phần */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Chi tiết thành phần</Text>
        <ScrollView
          style={styles.fixedScrollArea}
          contentContainerStyle={{ paddingBottom: 8 }}
          nestedScrollEnabled
          showsVerticalScrollIndicator
        >
          {ingredients.length ? ingredients.map((it, i) => (
            <View key={i} style={styles.row}>
              <Text style={[styles.bold, { flex: 2 }]} numberOfLines={2}>{it?.name || '?'}</Text>

              <View style={[styles.cell, { flex: 1, alignItems: 'flex-end' }]}>
                <Text style={styles.chip}>
                  {it?.percentage != null ? String(it.percentage) : '-'}
                </Text>
              </View>

              <View style={[styles.cell, { flex: 1, alignItems: 'center' }]}>
                <View style={[styles.pill, it?.is_allergen ? styles.pillDanger : styles.pillOk]}>
                  <Text style={it?.is_allergen ? styles.pillDangerText : styles.pillOkText}>
                    {it?.is_allergen ? 'Có' : 'Không'}
                  </Text>
                </View>
              </View>

              <View style={[styles.cell, { flex: 2, alignItems: 'flex-end' }]}>
                <Text style={[styles.dim, { textAlign: 'right' }]} numberOfLines={2}>
                  {it?.notes ? `(${it.notes})` : '-'}
                </Text>
              </View>
            </View>
          )) : <Text style={styles.dim}>— Không có —</Text>}
        </ScrollView>
      </View>

      {/* Thông tin dinh dưỡng */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Thông tin dinh dưỡng</Text>

        <View style={styles.nutriHeader}>
          <View style={[styles.nutriTile, { backgroundColor: '#eaf6ef' }]}>
            <Text style={[styles.nutriBig, { color: '#198754' }]}>{label?.nutrition_facts?.calories || '-'}</Text>
            <Text style={styles.nutriSmall}>Calo</Text>
          </View>
          <View style={[styles.nutriTile, { backgroundColor: '#eaf6ef' }]}>
            <Text style={[styles.nutriBig, { color: '#198754' }]}>
              {label?.nutrition_facts?.serving_size || '-'}
            </Text>
            <Text style={styles.nutriSmall}>Khẩu phần</Text>
          </View>
        </View>

        <ScrollView
          style={styles.fixedScrollArea}
          contentContainerStyle={{ paddingBottom: 8 }}
          nestedScrollEnabled
          showsVerticalScrollIndicator
        >
          {nutrients.length ? nutrients.map((n, i) => (
            <View key={i} style={styles.nutriRow}>
              <Text style={[styles.bold, { flex: 1 }]}>{n?.name || '?'}</Text>
              <Text style={styles.kvRight}>
                {`${n?.amount ?? ''} ${n?.unit ?? ''}`.trim()}
                {n?.daily_value_percent ? ` (${n.daily_value_percent})` : ''}
              </Text>
            </View>
          )) : <Text style={styles.dim}>— Không có —</Text>}

          <Text style={[styles.dim, { marginTop: 8 }]}>
            Lưu ý (Số lượng khẩu phần trên bao bì): {label?.nutrition_facts?.servings_per_container || '-'}
          </Text>
        </ScrollView>
      </View>

      {/* CTA: Trang chủ & Trợ lý ảo */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.btnGreen, { flex: 1 }]}
          onPress={() => router.push('HomeScreen')}
          activeOpacity={0.9}
        >
          <MaterialIcons name="home" size={18} color="#fff" />
          <Text style={styles.btnGreenText}>Trang chủ</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnGreen, { flex: 1 }]}
          onPress={() => router.push('ChatbotScreen')}
          activeOpacity={0.9}
        >
          <MaterialIcons name="smart-toy" size={18} color="#fff" />
          <Text style={styles.btnGreenText}>Tư vấn trợ lý ảo</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f3fdf7' },
  backIcon: { alignSelf: 'flex-start', marginBottom: 6 },

  pageTitle: { fontSize: 22, fontWeight: '800', color: '#0b1020' },
  method: { color: '#548a6e', marginTop: 4, marginBottom: 12 },

  hero: {
    backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: '#e5efe9',
  },
  preview: { width: '100%', height: 200, borderRadius: 10, backgroundColor: '#eef5f0' },
  previewFallback: { width: '100%', height: 200, borderRadius: 10, backgroundColor: '#eef5f0' },
  heroTitle: { fontSize: 18, fontWeight: '700', color: '#163c2a' },
  badgeOkay: { marginTop: 6, backgroundColor: '#eaf6ef', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeOkayText: { color: '#198754', fontWeight: '700' },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: '#e5efe9',
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#163c2a', marginBottom: 10 },

  metricsRow: { flexDirection: 'row', gap: 12 },
  metricBox: {
    flex: 1, backgroundColor: '#f2fbf6', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#e1f1e7',
  },
  metricLeft: {},
  metricRight: { backgroundColor: '#fff2f1', borderColor: '#f5d0ce' },
  metricNumber: { fontSize: 28, fontWeight: '900', color: '#198754' },
  metricLabel: { marginTop: 4, color: '#6b7b6e' },
  subheading: { fontWeight: '700', color: '#2d3b31' },
  rawText: { color: '#385143', marginTop: 6, lineHeight: 20 },

  fixedScrollArea: {
    height: 320,
    borderWidth: 1, borderColor: '#eef3f0', borderRadius: 10, padding: 8, backgroundColor: '#fcfefd',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e9f0ec',
  },
  cell: { minWidth: 60 },
  chip: {
    backgroundColor: '#eef5f0', color: '#255c41', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, overflow: 'hidden',
  },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  pillOk: { backgroundColor: '#e8f5ee', borderColor: '#cde9db' },
  pillOkText: { color: '#237a57', fontWeight: '700' },
  pillDanger: { backgroundColor: '#fde8e6', borderColor: '#f5c6c3' },
  pillDangerText: { color: '#d93025', fontWeight: '700' },

  nutriHeader: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  nutriTile: {
    flex: 1, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#d9e9df',
  },
  nutriBig: { fontSize: 20, fontWeight: '900' },
  nutriSmall: { color: '#2e5b43', marginTop: 2 },
  nutriRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e9f0ec' },
  kvRight: { color: '#1b2b22', fontWeight: '700' },

  bold: { fontWeight: '700', color: '#1b2b22' },
  dim: { color: '#7c8f84' },

  actionRow: { flexDirection: 'row', gap: 12, marginTop: 6, marginBottom: 24 },
  btnGreen: {
    flexDirection: 'row', backgroundColor: '#17863d', paddingVertical: 12, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center', gap: 6,
  },
  btnGreenText: { color: '#fff', fontWeight: '700' },
});
