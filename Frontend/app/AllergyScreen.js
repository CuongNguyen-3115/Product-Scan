// app/AllergyScreen.js
/**
 * AllergyScreen (JS version)
 * - Chọn dị ứng phổ biến hoặc tự thêm
 * - Bấm "Tiếp theo" => setSection('allergies', string[])
 * - Tự nạp lại dị ứng đã lưu nếu có
 */
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ProgressBar from './ProgressBar';
import { getProfile, setSection } from './lib/profileStorage';

const BRAND = '#17863d';
const commonAllergies = [
  'Gluten',
  'Lactose',
  'Đậu phộng',
  'Tôm cua',
  'Trứng',
  'Đậu nành',
  'Hạt phỉ',
  'Cá',
  'Dâu tây',
  'Chocolate',
];

export default function AllergyScreen() {
  const [input, setInput] = useState('');
  const [selected, setSelected] = useState([]); // <-- bỏ annotation TS
  const TOTAL_STEPS = 4;
  const CURRENT_STEP = 3;

  // Nạp lại dị ứng đã lưu (nếu có)
  useEffect(() => {
    (async () => {
      const p = await getProfile();
      if (Array.isArray(p?.allergies)) {
        setSelected(p.allergies);
      }
    })();
  }, []);

  const toggleAllergy = (item) => {
    setSelected((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const addAllergy = () => {
    const v = (input || '').trim();
    if (!v) return;
    setSelected((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setInput('');
    Keyboard.dismiss();
  };

  const handleNext = async () => {
    await setSection('allergies', selected);
    router.push('HealthGoalScreen');
  };

  return (
    <View style={styles.container}>
      <ProgressBar step={CURRENT_STEP} total={TOTAL_STEPS} />

      {/* Back */}
      <TouchableOpacity onPress={() => router.back()}>
        <MaterialIcons name="arrow-back" size={24} color={BRAND} />
      </TouchableOpacity>

      {/* Warning icon + Title */}
      <MaterialIcons
        name="warning"
        size={48}
        color="#FFCC00"
        style={{ alignSelf: 'center', marginTop: 10 }}
      />
      <Text style={styles.title}>Dị Ứng & Hạn Chế</Text>
      <Text style={styles.subtitle}>Những thành phần cần tránh</Text>

      {/* Add allergy */}
      <View style={styles.inputRow}>
        <TextInput
          placeholder="Nhập tên chất gây dị ứng..."
          placeholderTextColor="#777"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={addAllergy}
          style={styles.input}
          returnKeyType="done"
        />
        <TouchableOpacity onPress={addAllergy} style={styles.addBtn} activeOpacity={0.85}>
          <Text style={{ color: 'white', fontWeight: '600' }}>Thêm</Text>
        </TouchableOpacity>
      </View>

      {/* Common tags */}
      <Text style={styles.sectionTitle}>Dị ứng phổ biến</Text>
      <View style={styles.tagContainer}>
        {commonAllergies.map((item) => {
          const picked = selected.includes(item);
          return (
            <TouchableOpacity
              key={item}
              onPress={() => toggleAllergy(item)}
              style={[styles.tag, picked && styles.selectedTag]}
              activeOpacity={0.8}
            >
              <Text style={[styles.tagText, picked && styles.selectedTagText]}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected list */}
      {selected.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Dị ứng của bạn</Text>
          <View style={styles.tagContainer}>
            {selected.map((item) => (
              <View key={item} style={styles.selectedItem}>
                <Text style={{ color: 'white' }}>{item}</Text>
                <TouchableOpacity onPress={() => toggleAllergy(item)}>
                  <MaterialIcons name="close" size={16} color="white" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Next */}
      <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.9}>
        <Text style={styles.nextText}>Tiếp theo</Text>
        <MaterialIcons name="arrow-forward" color="white" size={20} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2FBF5', padding: 16, paddingTop: 50 },
  title: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginTop: 8, color: 'black' },
  subtitle: { textAlign: 'center', marginBottom: 20, color: 'black' },

  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  input: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#000',
  },
  addBtn: {
    backgroundColor: BRAND,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },

  sectionTitle: { fontWeight: 'bold', marginVertical: 10, color: 'black' },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap' },

  tag: {
    backgroundColor: '#eee',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    margin: 4,
  },
  tagText: { color: '#333' },
  selectedTag: { backgroundColor: BRAND },
  selectedTagText: { color: 'white', fontWeight: '600' },

  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d9534f',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    margin: 4,
  },

  nextBtn: {
    flexDirection: 'row',
    backgroundColor: BRAND,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 6,
    marginHorizontal: 30,
    marginTop: 40,
    marginBottom: 40,
  },
  nextText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginRight: 8 },
});
