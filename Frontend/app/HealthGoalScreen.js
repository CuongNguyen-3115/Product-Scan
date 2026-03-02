// app/HealthGoalScreen.js
/**
 * HealthGoalScreen
 * - Chọn mục tiêu sức khỏe + ghi chú
 * - Khi bấm "Hoàn thành": lưu vào AsyncStorage (via setSection) dưới key:
 *   goals: { selected: string[], note: string }
 * - Tự động nạp lại mục tiêu đã lưu trước đó (nếu có)
 */
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ProgressBar from '../app/ProgressBar'; // giữ nguyên path bạn đang dùng
import { getProfile, setSection } from './lib/profileStorage';

const GOAL_OPTIONS = [
  'Giảm cân','Duy trì cân nặng','Cải thiện tim mạch','Tăng năng lượng',
  'Giảm stress','Tăng cân','Tăng cơ bắp','Kiểm soát đường huyết',
  'Cải thiện tiêu hóa','Ngủ ngon hơn',
];

export default function HealthGoalScreen() {
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [note, setNote] = useState('');
  const TOTAL_STEPS = 4;
  const CURRENT_STEP = 4;

  // Nạp lại dữ liệu đã lưu (nếu có)
  useEffect(() => {
    (async () => {
      const p = await getProfile();
      if (Array.isArray(p?.goals?.selected)) setSelectedGoals(p.goals.selected);
      if (typeof p?.goals?.note === 'string') setNote(p.goals.note);
    })();
  }, []);

  const toggleGoal = (goal) => {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const handleFinish = async () => {
    await setSection('goals', { selected: selectedGoals, note });
    router.push('HealthProfileViewScreen'); // xem ngay hồ sơ vừa lưu
    // Nếu bạn muốn quay về Home: đổi thành router.push('HomeScreen')
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.topLayer} />

      {/* Progress bar */}
      <ProgressBar step={CURRENT_STEP} total={TOTAL_STEPS} />

      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="green" />
      </TouchableOpacity>

      {/* Icon + Heading */}
      <Ionicons name="heart" size={40} color="green" style={styles.icon} />
      <Text style={styles.title}>Mục Tiêu Sức Khỏe</Text>
      <Text style={styles.subtitle}>Bạn muốn cải thiện điều gì?</Text>

      {/* Nội dung chính */}
      <ScrollView contentContainerStyle={styles.goalsContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Chọn mục tiêu (có thể chọn nhiều)</Text>
        <View style={styles.goalGrid}>
          {GOAL_OPTIONS.map((goal, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.goalButton,
                selectedGoals.includes(goal) && styles.goalButtonSelected,
              ]}
              onPress={() => toggleGoal(goal)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.goalText,
                  selectedGoals.includes(goal) && styles.goalTextSelected,
                ]}
              >
                {goal}
              </Text>
            </TouchableOpacity>
          ))}
          </View>

        <Text style={styles.sectionTitle}>Ghi chú thêm (tùy chọn)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Những thông tin khác về sức khỏe..."
          placeholderTextColor="#777"
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={4}
        />
      </ScrollView>

      {/* Hoàn thành */}
      <TouchableOpacity style={styles.finishButton} onPress={handleFinish} activeOpacity={0.9}>
        <Text style={styles.finishText}>Hoàn thành</Text>
        <Ionicons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#F2FBF5',
    paddingTop: 50,
    paddingHorizontal: 16,
    position: 'relative',
  },
  topLayer: {
    position: 'absolute',
    top: 0,
    height: '35%',
    width: '100%',
    backgroundColor: '#FFF',
    borderBottomRightRadius: 30,
    borderBottomLeftRadius: 30,
    zIndex: -1,
  },
  backButton: {
    position: 'absolute',
    top: 90,
    left: 16,
    zIndex: 1,
  },
  icon: { alignSelf: 'center', marginTop: 10, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', color: 'black' },
  subtitle: { textAlign: 'center', marginBottom: 20, color: '#666' },

  goalsContainer: { paddingBottom: 40 },
  sectionTitle: { fontWeight: 'bold', marginBottom: 10, color: '#222' },

  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  goalButton: {
    borderWidth: 1.5,
    borderColor: 'green',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
    width: '48%',
    backgroundColor: 'white',
  },
  goalButtonSelected: { backgroundColor: 'green' },
  goalText: { color: 'green', textAlign: 'center', fontWeight: '500' },
  goalTextSelected: { color: 'white' },

  textInput: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    backgroundColor: 'white',
    marginTop: 10,
    color: '#000',
  },

  finishButton: {
    position: 'absolute',
    bottom: 10,
    left: 16,
    right: 16,
    backgroundColor: 'green',
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  finishText: { color: 'white', fontWeight: 'bold' },
});
