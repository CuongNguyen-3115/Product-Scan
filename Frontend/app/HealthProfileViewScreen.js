// app/HealthProfileViewScreen.js
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

import { getProfile, clearProfile } from './lib/profileStorage'; // đã bỏ exportToJson

export default function HealthProfileViewScreen() {
  const [profile, setProfile] = useState(null);
  const isFocused = useIsFocused();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const p = await getProfile();
      setProfile(Object.keys(p).length ? p : null);
    })();
  }, [isFocused]);

  const onClear = async () => {
    await clearProfile();
    const p = await getProfile();
    setProfile(Object.keys(p).length ? p : null);
  };

  // Helpers
  const calcBMI = () => {
    const b = profile?.basic;
    if (!b?.height || !b?.weight) return null;
    const h = Number(b.height) / 100;
    const w = Number(b.weight);
    if (!h || !w) return null;
    const bmi = w / (h * h);
    let cat = 'Bình thường';
    if (bmi < 18.5) cat = 'Thiếu cân';
    else if (bmi >= 23 && bmi < 25) cat = 'Thừa cân (châu Á)';
    else if (bmi >= 25) cat = 'Béo phì (châu Á)';
    return `${bmi.toFixed(1)} · ${cat}`;
  };

  const Chip = ({ children }) => (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{children}</Text>
    </View>
  );

  const CardHeader = ({ title, onEdit }) => (
    <View style={styles.cardHeaderRow}>
      <Text style={styles.cardTitle}>{title}</Text>
      <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <MaterialIcons name="edit" size={20} color="#17863d" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Back to Home */}
        <TouchableOpacity
          onPress={() => router.push('HomeScreen')}
          style={styles.backHomeBtn}
          accessibilityLabel="Quay lại trang chủ"
        >
          <MaterialIcons name="arrow-back" size={22} color="#17863d" />
        </TouchableOpacity>

        <View style={styles.header}>
          <FontAwesome5 name="user-md" size={22} color="#17863d" />
          <Text style={styles.headerTitle}>Hồ sơ sức khỏe của tôi</Text>
        </View>

        {!profile && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Chưa có hồ sơ</Text>
            <Text style={styles.emptySub}>
              Hãy tạo hồ sơ để cá nhân hóa phân tích sản phẩm.
            </Text>
            <TouchableOpacity
              style={[styles.btn, styles.btnGreen]}
              onPress={() => router.push('HealthFormScreen')}
              activeOpacity={0.85}
            >
              <MaterialIcons name="edit" size={18} color="white" />
              <Text style={styles.btnText}>Điền Thông Tin Sức Khỏe</Text>
            </TouchableOpacity>
          </View>
        )}

        {!!profile && (
          <>
            {/* Cơ bản */}
            <View style={styles.card}>
              <CardHeader
                title="Thông tin cơ bản"
                onEdit={() => router.push('HealthFormScreen')}
              />
              <View style={styles.row}><Text style={styles.label}>Tuổi</Text><Text style={styles.value}>{profile.basic?.age ?? '-'}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Giới tính</Text><Text style={styles.value}>{profile.basic?.gender ?? '-'}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Chiều cao</Text><Text style={styles.value}>{profile.basic?.height ? `${profile.basic.height} cm` : '-'}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Cân nặng</Text><Text style={styles.value}>{profile.basic?.weight ? `${profile.basic.weight} kg` : '-'}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Mức vận động</Text><Text style={styles.value}>{profile.basic?.activityLevel ?? '-'}</Text></View>
              <View style={styles.row}><Text style={styles.label}>BMI (ước tính)</Text><Text style={[styles.value, { fontWeight: '700' }]}>{calcBMI() ?? '-'}</Text></View>
            </View>

            {/* Tình trạng sức khỏe */}
            <View style={styles.card}>
              <CardHeader
                title="Tình trạng sức khỏe"
                onEdit={() => router.push('HealthConditionScreen')}
              />
              <View style={styles.chipWrap}>
                {[
                  ...(profile.conditions?.selected ?? []),
                  ...(profile.conditions?.other ?? []),
                ].map((c, idx) => (
                  <Chip key={`${c}-${idx}`}>{c}</Chip>
                ))}
                {(!profile.conditions ||
                  (!profile.conditions.selected?.length &&
                   !profile.conditions.other?.length)) && (
                  <Text style={styles.emptyInline}>Chưa chọn</Text>
                )}
              </View>
            </View>

            {/* Dị ứng & hạn chế */}
            <View style={styles.card}>
              <CardHeader
                title="Dị ứng & hạn chế"
                onEdit={() => router.push('AllergyScreen')}
              />
              <View style={styles.chipWrap}>
                {(profile.allergies ?? []).map((a, idx) => (
                  <Chip key={`${a}-${idx}`}>{a}</Chip>
                ))}
                {!profile.allergies?.length && (
                  <Text style={styles.emptyInline}>Không có</Text>
                )}
              </View>
            </View>

            {/* Mục tiêu */}
            <View style={styles.card}>
              <CardHeader
                title="Mục tiêu sức khỏe"
                onEdit={() => router.push('HealthGoalScreen')}
              />
              <View style={styles.chipWrap}>
                {(profile.goals?.selected ?? []).map((g, idx) => (
                  <Chip key={`${g}-${idx}`}>{g}</Chip>
                ))}
                {!profile.goals?.selected?.length && (
                  <Text style={styles.emptyInline}>Chưa chọn</Text>
                )}
              </View>
              {profile.goals?.note ? (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.label}>Ghi chú</Text>
                  <Text style={styles.note}>{profile.goals.note}</Text>
                </View>
              ) : null}
            </View>

            {/* Footer actions (đã bỏ Xuất JSON) */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => router.push('HealthFormScreen')}>
                <MaterialIcons name="edit" size={18} color="#17863d" />
                <Text style={[styles.btnText, { color: '#17863d' }]}>Chỉnh sửa</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={onClear}>
                <MaterialIcons name="delete-outline" size={18} color="white" />
                <Text style={styles.btnText}>Xóa hồ sơ</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.updatedAt}>
              Cập nhật: {profile.updatedAt ? new Date(profile.updatedAt).toLocaleString() : '—'}
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1fef4' },
  scroll: { padding: 16, paddingBottom: 28 },

  backHomeBtn: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },

  header: {
    backgroundColor: '#e4f7f3',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: 'black' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: 'black' },

  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { color: '#355' },
  value: { color: 'black' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#e4f7f3',
  },
  chipText: { color: '#17863d', fontWeight: '600' },
  emptyInline: { color: '#777' },

  note: { color: 'black' },

  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
  },
  emptyTitle: { fontWeight: '700', fontSize: 15, color: 'black' },
  emptySub: { color: 'black', marginTop: 4, marginBottom: 12 },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 6 },
  btn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnGreen: { backgroundColor: '#17863d' },
  btnDanger: { backgroundColor: '#d9534f' },
  btnOutline: { borderWidth: 1, borderColor: '#17863d', backgroundColor: 'transparent' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  updatedAt: { textAlign: 'center', color: '#666', marginTop: 4 },
});
