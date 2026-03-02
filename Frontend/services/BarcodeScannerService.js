// services/BarcodeScannerService.js
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Platform } from 'react-native';

export default {
  /**
   * Xin quyền truy cập camera để quét mã vạch
   * @returns {Promise<boolean>} true nếu đã được cấp, false nếu không
   */
  requestPermissions: async () => {
    if (Platform.OS !== 'web') {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      return status === 'granted';
    }
    return true;
  },

  /**
   * Xử lý khi quét thành công (bạn có thể override callback này)
   * @param {{ data: string, type: string }} scanResult – object trả về từ component
   */
  handleBarCodeScanned: (scanResult) => {
    const { type, data } = scanResult;
    console.log(`Đã quét thành công!`, { type, data });
    // TODO: xử lý data – ví dụ gọi API tra thông tin sản phẩm
    return { type, data };
  },
};
