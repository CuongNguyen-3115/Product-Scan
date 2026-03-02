// services/ImageService.js
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export default {
  /** Xin quyền truy cập camera + thư viện ảnh */
  requestPermissions: async () => {
    if (Platform.OS !== 'web') {
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return cam.status === 'granted' && lib.status === 'granted';
    }
    return true;
  },

  /** Chọn ảnh từ thư viện */
  pickFromLibrary: async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.cancelled) {
      return result.uri;  // đường dẫn file ảnh
    }
    return null;
  },

  /** Chụp ảnh mới */
  takePhoto: async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.cancelled) {
      return result.uri;
    }
    return null;
  },

  /** Upload ảnh lên server */
  uploadImage: async (uri, uploadUrl) => {
    const form = new FormData();
    form.append('file', {
      uri,
      name: 'photo.jpg',
      type: 'image/jpeg',
    });
    const resp = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data' },
      body: form,
    });
    return resp.json();
  },
};
