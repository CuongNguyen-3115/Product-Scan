// app/HealthConditionScreen.js
/**
 * HealthConditionScreen
 * - Cho phép tìm, gợi ý, chọn các tình trạng sức khỏe (toggle + "tình trạng khác")
 * - Khi bấm "Tiếp theo": lưu dữ liệu vào AsyncStorage (via setSection) theo cấu trúc:
 *   conditions: { selected: [...], other: [...] }
 * - Tự động nạp lại lựa chọn đã lưu trước đó (nếu có).
 */
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProgressBar from './ProgressBar';
import { getProfile, setSection } from './lib/profileStorage';

const BASE_CONDITIONS = [
  { title: 'Tiểu đường', description: 'Type 1/Type 2' },
  { title: 'Huyết áp cao', description: 'Tăng huyết áp' },
  { title: 'Bệnh tim mạch', description: 'Mạch vành, suy tim…' },
  { title: 'Rối loạn mỡ máu', description: 'Cholesterol, Triglycerid' },
  { title: 'Bệnh thận mạn', description: 'CKD các giai đoạn' },
  { title: 'Bệnh gan', description: 'Viêm gan, men gan cao, xơ gan' },
  { title: 'Gút', description: 'Tăng acid uric' },
  { title: 'Rối loạn tuyến giáp', description: 'Suy giáp/Cường giáp' },
  { title: 'Celiac/nhạy gluten', description: 'Không dung nạp gluten' },
  { title: 'Không dung nạp Lactose', description: 'Sữa & chế phẩm sữa' },
  { title: 'Hội chứng ruột kích thích (IBS)', description: 'Đau bụng, rối loạn tiêu hoá' },
  { title: 'GERD/Trào ngược dạ dày', description: 'Viêm/loét dạ dày' },
  { title: 'Hen phế quản', description: 'Asthma' },
  { title: 'COPD', description: 'Bệnh phổi tắc nghẽn mạn' },
  { title: 'Thiếu máu/Thiếu sắt', description: 'Ferritin thấp' },
  { title: 'Loãng xương', description: 'Giảm mật độ xương' },
  { title: 'PCOS', description: 'Buồng trứng đa nang' },
  { title: 'Mang thai/Cho con bú', description: 'Thời kỳ đặc biệt' },
  { title: 'Thừa cân/Béo phì', description: 'BMI > 25' },
  { title: 'Thiếu cân', description: 'BMI < 18.5' },
];

const normalize = (s = '') =>
  s.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export default function HealthConditionScreen() {
  const [selectedMap, setSelectedMap] = useState({});
  const [query, setQuery] = useState('');
  const [otherText, setOtherText] = useState('');
  const [isListOpen, setIsListOpen] = useState(false);
  const [showOther, setShowOther] = useState(false);

  const TOTAL_STEPS = 4;
  const CURRENT_STEP = 2;

  /** ===== Khởi tạo từ dữ liệu đã lưu (nếu có) ===== */
  useEffect(() => {
    (async () => {
      const p = await getProfile();
      const saved = [
        ...(p?.conditions?.selected ?? []),
        ...(p?.conditions?.other ?? []),
      ];
      if (saved.length) {
        const map = {};
        saved.forEach((t) => (map[t] = true));
        setSelectedMap(map);
      }
    })();
  }, []);

  /** ===== Logic chọn/bỏ chọn ===== */
  const toggleCondition = (title) => {
    setSelectedMap((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const addOther = () => {
    const t = otherText.trim();
    if (!t) return;
    setSelectedMap((prev) => ({ ...prev, [t]: true }));
    setOtherText('');
  };

  /** ===== Tìm kiếm / gợi ý ===== */
  const filtered = useMemo(() => {
    if (!query) return BASE_CONDITIONS;
    const q = normalize(query);
    return BASE_CONDITIONS.filter(
      (c) => normalize(c.title).includes(q) || normalize(c.description).includes(q)
    );
  }, [query]);

  const suggestions = useMemo(() => {
    const q = normalize(query);
    if (!q) return [];
    return BASE_CONDITIONS.filter(
      (c) => normalize(c.title).includes(q) || normalize(c.description).includes(q)
    ).slice(0, 6);
  }, [query]);

  const selectedList = Object.keys(selectedMap).filter((k) => selectedMap[k]);

  /** ===== Phân loại: base vs other (để lưu đúng schema) ===== */
  const baseTitleSet = useMemo(
    () => new Set(BASE_CONDITIONS.map((c) => c.title)),
    []
  );
  const selectedBase = selectedList.filter((t) => baseTitleSet.has(t));
  const selectedOther = selectedList.filter((t) => !baseTitleSet.has(t));

  /** ===== Lưu & Next ===== */
  const handleNext = async () => {
    await setSection('conditions', {
      selected: selectedBase,
      other: selectedOther,
    });
    router.push('AllergyScreen');
  };

  return (
    <SafeAreaView style={styles.wrapper} edges={['top', 'left', 'right']}>
      <ProgressBar step={CURRENT_STEP} total={TOTAL_STEPS} />

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={{ alignSelf: 'flex-start' }}>
          <MaterialIcons name="arrow-back" size={24} color="green" />
        </TouchableOpacity>

        {/* Heading */}
        <MaterialIcons name="favorite" size={48} color="green" style={styles.icon} />
        <Text style={styles.heading}>Tình Trạng Sức Khỏe</Text>
        <Text style={styles.subheading}>Chọn các tình trạng phù hợp với bạn</Text>

        {/* Card gộp: Search + gợi ý + mở/đóng list */}
        <View style={styles.filterCard}>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm theo tên bệnh (vd: tuyến giáp, thận, dạ dày...)"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              onSubmitEditing={() => setIsListOpen(true)}
              placeholderTextColor="#777"
            />
            {/* Kính lúp bên phải: bấm để tìm/mở danh sách */}
            <TouchableOpacity
              style={styles.iconBtnFilled}
              onPress={() => setIsListOpen(true)}
              accessibilityLabel="Tìm kiếm và mở danh sách"
            >
              <MaterialIcons name="search" size={20} color="#fff" />
            </TouchableOpacity>

            {/* Mũi tên mở/đóng danh sách */}
            <TouchableOpacity
              style={styles.iconBtnOutline}
              onPress={() => setIsListOpen((v) => !v)}
              accessibilityLabel={isListOpen ? 'Thu gọn danh sách' : 'Mở danh sách'}
            >
              <MaterialIcons
                name={isListOpen ? 'expand-less' : 'expand-more'}
                size={24}
                color="#17863d"
              />
            </TouchableOpacity>
          </View>

          {/* Dropdown gợi ý (chỉ hiện khi đang gõ & list chưa mở) */}
          {query.length > 0 && !isListOpen && suggestions.length > 0 && (
            <View style={styles.suggestBox}>
              {suggestions.map((item, idx) => (
                <TouchableOpacity
                  key={`${item.title}-${idx}`}
                  style={styles.suggestItem}
                  onPress={() => toggleCondition(item.title)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.suggestTitle}>{item.title}</Text>
                    {!!item.description && (
                      <Text style={styles.suggestDesc}>{item.description}</Text>
                    )}
                  </View>
                  <MaterialIcons
                    name={selectedMap[item.title] ? 'check-circle' : 'add-circle-outline'}
                    size={20}
                    color={selectedMap[item.title] ? '#17863d' : '#555'}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Danh sách kết quả đầy đủ (ẩn/hiện) */}
          {isListOpen && (
            <View style={styles.cardList}>
              {filtered.map(({ title, description }, index) => (
                <View key={`${title}-${index}`} style={styles.card}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{title}</Text>
                    {!!description && <Text style={styles.description}>{description}</Text>}
                  </View>
                  <Switch
                    value={!!selectedMap[title]}
                    onValueChange={() => toggleCondition(title)}
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Header nhỏ “Tình trạng khác” góc phải */}
        <View style={styles.otherHeaderRow}>
          <TouchableOpacity
            onPress={() => setShowOther((v) => !v)}
            style={styles.otherToggleBtn}
          >
            <Text style={styles.otherToggleText}>Tình trạng khác</Text>
            <MaterialIcons
              name={showOther ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={18}
              color="#17863d"
            />
          </TouchableOpacity>
        </View>

        {/* Ô nhập chỉ hiện khi bấm “Tình trạng khác” */}
        {showOther && (
          <View style={styles.otherRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Nhập tình trạng khác (vd: Migraine, Viêm tụy...)"
              value={otherText}
              onChangeText={setOtherText}
              placeholderTextColor="#777"
              autoFocus
            />
            <TouchableOpacity style={styles.addBtn} onPress={addOther}>
              <Text style={{ color: 'white', fontWeight: '600' }}>Thêm</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Selected tags */}
        {selectedList.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Đã chọn</Text>
            <View style={styles.tagContainer}>
              {selectedList.map((item) => (
                <View key={item} style={styles.selectedItem}>
                  <Text style={{ color: 'white' }}>{item}</Text>
                  <TouchableOpacity onPress={() => toggleCondition(item)}>
                    <MaterialIcons name="close" size={16} color="white" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Footer NEXT */}
      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Tiếp theo</Text>
          <MaterialIcons name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#F2FBF5', paddingTop: 50, paddingHorizontal: 16 },
  container: { paddingBottom: 32 },
  icon: { alignSelf: 'center', marginTop: 10, marginBottom: 8 },
  heading: { textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: 'black' },
  subheading: { textAlign: 'center', marginBottom: 12, color: 'black' },

  /* Card gộp */
  filterCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    elevation: 2,
    marginBottom: 10,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#000',
  },
  iconBtnFilled: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#17863d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnOutline: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cfe9db',
    backgroundColor: '#e9f9f1',
  },

  /* Dropdown gợi ý */
  suggestBox: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#fff',
    maxHeight: 220,
    overflow: 'hidden',
  },
  suggestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  suggestTitle: { fontWeight: '600', color: '#111' },
  suggestDesc: { fontSize: 12, color: '#666' },

  /* List trong card */
  cardList: { marginTop: 10 },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
  },
  title: { fontWeight: 'bold', color: 'black', marginBottom: 4 },
  description: { color: '#333', fontSize: 12 },

  sectionTitle: { fontWeight: 'bold', marginVertical: 10, color: '#222' },

  /* Toggle “Tình trạng khác” góc phải */
  otherHeaderRow: { alignItems: 'flex-end', marginTop: 8 },
  otherToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#e9f9f1',
    borderWidth: 1,
    borderColor: '#cfe9db',
    alignSelf: 'flex-end',
  },
  otherToggleText: {
    fontSize: 12,
    color: '#17863d',
    fontWeight: '700',
  },

  /* Ô nhập “Tình trạng khác” (ẩn/hiện) */
  otherRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#000',
  },
  addBtn: {
    backgroundColor: 'green',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },

  tagContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#17863d',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    margin: 4,
  },

  footer: { backgroundColor: '#F2FBF5', paddingHorizontal: 16, paddingTop: 6 },
  nextButton: {
    width: '100%',
    bottom: 10,
    flexDirection: 'row',
    backgroundColor: '#2e7d32',
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonText: { color: 'white', fontSize: 16, marginRight: 8, fontWeight: '600' },
});
