// app/lib/profileStorage.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

const KEY = 'healthProfile';

export async function getProfile() {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : {};
}

export async function setSection(sectionName, data) {
  const current = await getProfile();
  const next = { ...current, [sectionName]: data, updatedAt: new Date().toISOString() };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function clearProfile() {
  await AsyncStorage.removeItem(KEY);
}

export async function exportToJson() {
  const profile = await getProfile();
  const json = JSON.stringify(profile, null, 2);
  const fileName = `health_profile_${Date.now()}.json`;

  if (Platform.OS === 'web') {
    // Web: tạo file tải xuống
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return { fileUri: fileName, json };
  } else {
    // Android/iOS (Expo)
    const uri = FileSystem.documentDirectory + fileName;
    await FileSystem.writeAsStringAsync(uri, json);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    }
    return { fileUri: uri, json };
  }
}
