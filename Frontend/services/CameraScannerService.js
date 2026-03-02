// services/CameraScannerService.js
import * as ImagePicker from 'expo-image-picker';

export default {
  /**
   * Yêu cầu cấp quyền camera
   * @returns {Promise<boolean>}
   */
  requestCameraPermission: async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  },

  /**
   * Mở camera hệ thống, chụp 1 ảnh và trả về URI
   * @returns {Promise<string|null>}
   */
  openCamera: async () => {
    // xin quyền lần nữa (đảm bảo)
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    // launch camera
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    });

    // nếu user hủy thì result.canceled = true
    if (result.canceled) {
      return null;
    }

    // trả về URI của ảnh đầu tiên
    return result.assets[0].uri;
  },
};
