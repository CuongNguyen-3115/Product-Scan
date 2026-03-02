// app/ScanProductScreen.js
// Web + Android ready: chọn/chụp ảnh → bấm "Phân tích ảnh này" → POST /label/analyze

import { Camera, CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import AsyncStorage from '@react-native-async-storage/async-storage';
import CameraScannerService from '../services/CameraScannerService';

// ---------------- API base resolver (no process.env needed) ----------------
function resolveApiBase() {
  let base = 'http://127.0.0.1:8888'; // default for iOS sim & web
  try {
    const Constants = require('expo-constants').default;
    const extra = Constants?.expoConfig?.extra ?? Constants?.manifestExtra;
    if (extra?.API_BASE) base = String(extra.API_BASE);
  } catch {}
  const fromGlobal = (globalThis && (globalThis.EXPO_PUBLIC_API_BASE || globalThis.API_BASE)) || '';
  if (fromGlobal) base = String(fromGlobal);

  // Android emulator cannot reach localhost on host machine
  if (Platform.OS === 'android') {
    if (base.includes('localhost') || base.includes('127.0.0.1')) {
      base = base.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
    }
  }
  return base.replace(/\/$/, '');
}
const API_BASE = resolveApiBase();

// ---------------- Helpers for upload ----------------
const filenameFromUri = (uri) => (uri?.split('/')?.pop() || 'upload.jpg');
const inferMimeFromName = (name) => {
  const n = (name || '').toLowerCase();
  if (n.endsWith('.png')) return 'image/png';
  if (n.endsWith('.webp')) return 'image/webp';
  if (n.endsWith('.bmp')) return 'image/bmp';
  if (n.endsWith('.tiff') || n.endsWith('.tif')) return 'image/tiff';
  return 'image/jpeg';
};

const { width } = Dimensions.get('window');
const TAB_KEYS = { CAMERA: 'camera', UPLOAD: 'upload', BARCODE: 'barcode', SEARCH: 'search' };

export default function ScanProductScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(TAB_KEYS.CAMERA);
  const [searchText, setSearchText] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [uploadUri, setUploadUri] = useState(null);

  // === NEW: state dừng/tiếp tục phân tích ảnh
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingUri, setAnalyzingUri] = useState(null);   // ảnh đang phân tích
  const analyzeAbortRef = useRef(null);                      // AbortController hiện tại

  // ---------- Pick from library ----------
  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Bạn cần cấp quyền truy cập thư viện ảnh!');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets?.length) {
      const uri = result.assets[0].uri;
      setUploadUri(uri);
    }
  };

  // ---------- Barcode ----------
  const [barcodePermission, setBarcodePermission] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastBarcode, setLastBarcode] = useState(null);

  const startScan = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Chưa có quyền quét mã vạch');
      setBarcodePermission(false);
      return;
    }
    setBarcodePermission(true);
    setIsScanning(true);
    setLastBarcode(null);
  };

  const stopScan = () => setIsScanning(false);
  const onBarCodeScanned = ({ type, data }) => {
    setIsScanning(false);
    setLastBarcode(data);
  };

  // ---------- Camera capture ----------
  const handleTakePhoto = async () => {
    const granted = await CameraScannerService.requestCameraPermission();
    if (!granted) {
      return alert('Bạn cần cấp quyền camera để chụp ảnh!');
    }
    const uri = await CameraScannerService.openCamera();
    if (!uri) return;
    setPhotoUri(uri);
  };

  // ---------- Analyze: POST to /label/analyze (có thể DỪNG) ----------
  const analyzeImage = async (uri) => {
    if (!uri || analyzing) return;
    try {
      setAnalyzing(true);
      setAnalyzingUri(uri);

      const controller = new AbortController();
      analyzeAbortRef.current = controller;

      const name = filenameFromUri(uri);
      const type = inferMimeFromName(name);

      const form = new FormData();
      if (Platform.OS === 'web') {
        const respBlob = await fetch(uri);
        const blob = await respBlob.blob();
        const file = new File([blob], name, { type: blob.type || type });
        form.append('image', file);
      } else {
        form.append('image', { uri, name, type });
      }

      const resp = await fetch(`${API_BASE}/label/analyze`, {
        method: 'POST',
        body: form,
        signal: controller.signal, // <— quan trọng để dừng
      });

      let data;
      try {
        data = await resp.json();
      } catch (e) {
        throw new Error(
          `Server trả về không phải JSON (status ${resp.status}).` +
            (Platform.OS === 'web' ? '\nGợi ý: kiểm tra CORS trên Flask (flask-cors).' : '')
        );
      }
      if (!resp.ok || data?.ok === false) {
        throw new Error(data?.error || `Lỗi server (status ${resp.status}).`);
      }

      const label = data.label || null;

      // Lưu nhãn quét gần nhất cho Chatbot
      try {
        await AsyncStorage.setItem('last_scan_label', JSON.stringify(label));
      } catch (e) {
        console.warn('[ScanProduct] Lưu last_scan_label thất bại:', e);
      }

      // Điều hướng sang màn phân tích chi tiết
      router.push({
        pathname: '/ProductAnalysisScreen',
        params: {
          photoUri: uri,
          label: JSON.stringify(label),
          saved_json: data.saved?.json || '',
          saved_txt: data.saved?.txt || '',
        },
      });
    } catch (e) {
      if (e?.name === 'AbortError') {
        // người dùng đã dừng – không báo lỗi ầm ĩ
        console.log('[ScanProduct] analyze aborted');
      } else {
        alert(`Phân tích thất bại: ${String(e?.message || e)}`);
      }
    } finally {
      setAnalyzing(false);
      setAnalyzingUri(null);
      analyzeAbortRef.current = null;
    }
  };

  // === NEW: dừng phân tích ảnh hiện tại
  const stopAnalyze = () => {
    analyzeAbortRef.current?.abort();
  };

  const renderContent = () => {
    switch (activeTab) {
      case TAB_KEYS.CAMERA:
        return (
          <>
            {photoUri && <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="cover" />}
            <Ionicons name="camera" size={60} color="#198754" style={styles.icon} />
            <Text style={styles.contentTitle}>Chụp Ảnh Sản Phẩm</Text>
            <Text style={styles.contentSubtitle}>Hướng camera vào nhãn thành phần của sản phẩm</Text>
            <TouchableOpacity style={[styles.primaryBtn, analyzing && styles.disabledBtn]} onPress={handleTakePhoto} disabled={analyzing}>
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Mở Camera</Text>
            </TouchableOpacity>

            {photoUri && (
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  { marginTop: 12 },
                  analyzing && analyzingUri === photoUri ? styles.stopBtn : null,
                  analyzing && analyzingUri !== photoUri ? styles.disabledBtn : null,
                ]}
                onPress={() =>
                  analyzing && analyzingUri === photoUri ? stopAnalyze() : analyzeImage(photoUri)
                }
                disabled={analyzing && analyzingUri !== photoUri}
              >
                {analyzing && analyzingUri === photoUri ? (
                  <>
                    <MaterialIcons name="pause" size={20} color="#fff" />
                    <Text style={styles.primaryBtnText}>Dừng phân tích</Text>
                  </>
                ) : (
                  <>
                    <MaterialIcons name="analytics" size={20} color="#fff" />
                    <Text style={styles.primaryBtnText}>Phân tích ảnh này</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </>
        );
      case TAB_KEYS.UPLOAD:
        return (
          <>
            {uploadUri ? (
              <Image source={{ uri: uploadUri }} style={styles.previewImage} resizeMode="cover" />
            ) : (
              <MaterialIcons name="file-upload" size={60} color="#198754" style={styles.icon} />
            )}
            <Text style={styles.contentTitle}>{uploadUri ? 'Xem trước ảnh đã chọn' : 'Tải Ảnh Lên'}</Text>
            <Text style={styles.contentSubtitle}>
              {uploadUri ? 'Ảnh đã chọn từ thư viện' : 'Chọn ảnh nhãn thành phần từ thư viện'}
            </Text>
            <TouchableOpacity style={[styles.primaryBtn, analyzing && styles.disabledBtn]} onPress={pickFromLibrary} disabled={analyzing}>
              <MaterialIcons name="file-upload" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>{uploadUri ? 'Chọn lại ảnh' : 'Chọn Ảnh'}</Text>
            </TouchableOpacity>

            {uploadUri && (
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  { marginTop: 12 },
                  analyzing && analyzingUri === uploadUri ? styles.stopBtn : null,
                  analyzing && analyzingUri !== uploadUri ? styles.disabledBtn : null,
                ]}
                onPress={() =>
                  analyzing && analyzingUri === uploadUri ? stopAnalyze() : analyzeImage(uploadUri)
                }
                disabled={analyzing && analyzingUri !== uploadUri}
              >
                {analyzing && analyzingUri === uploadUri ? (
                  <>
                    <MaterialIcons name="pause" size={20} color="#fff" />
                    <Text style={styles.primaryBtnText}>Dừng phân tích</Text>
                  </>
                ) : (
                  <>
                    <MaterialIcons name="analytics" size={20} color="#fff" />
                    <Text style={styles.primaryBtnText}>Phân tích ảnh này</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </>
        );
      case TAB_KEYS.BARCODE:
        return (
          <>
            {isScanning ? (
              <View style={styles.scannerWrap}>
                <CameraView
                  style={StyleSheet.absoluteFillObject}
                  facing="back"
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr','ean8','ean13','code39','code93','code128','upc_a','upc_e','pdf417','aztec','datamatrix','itf14','codabar'],
                  }}
                  onBarcodeScanned={({ data, type }) => onBarCodeScanned({ data, type })}
                />
                <View style={styles.scanFrame} />
                <TouchableOpacity style={styles.overlayBtn} onPress={stopScan}>
                  <Text style={styles.overlayBtnText}>Hủy</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <FontAwesome name="barcode" size={60} color="#198754" style={styles.icon} />
                <Text style={styles.contentTitle}>Quét Mã Vạch</Text>
                <Text style={styles.contentSubtitle}>Hướng camera vào mã vạch sản phẩm</Text>
                {lastBarcode ? (
                  <>
                    <Text style={{ color: '#0a0a0a', marginBottom: 10 }}>
                      Đã phát hiện: <Text style={{ fontWeight: '700' }}>{lastBarcode}</Text>
                    </Text>
                    <TouchableOpacity
                      style={[styles.primaryBtn, { marginBottom: 10 }, analyzing && styles.disabledBtn]}
                      onPress={() => router.push({ pathname: '/ProductAnalysisScreen', params: { barcode: lastBarcode } })}
                      disabled={analyzing}
                    >
                      <MaterialIcons name="analytics" size={20} color="#fff" />
                      <Text style={styles.primaryBtnText}>Phân tích theo mã này</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
                <TouchableOpacity style={[styles.primaryBtn, analyzing && styles.disabledBtn]} onPress={startScan} disabled={analyzing}>
                  <FontAwesome name="barcode" size={20} color="#fff" />
                  <Text style={styles.primaryBtnText}>
                    {barcodePermission === false ? 'Xin quyền & bắt đầu quét' : 'Bắt đầu quét'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </>
        );
      case TAB_KEYS.SEARCH:
        return (
          <>
            <Ionicons name="search" size={60} color="#198754" style={styles.icon} />
            <Text style={styles.contentTitle}>Tìm Kiếm Sản Phẩm</Text>
            <Text style={styles.contentSubtitle}>Nhập tên sản phẩm để tra cứu thông tin</Text>
            <TextInput style={styles.input} placeholder="Ví dụ: Coca Cola…" value={searchText} onChangeText={setSearchText} />
            <TouchableOpacity style={[styles.primaryBtn, analyzing && styles.disabledBtn]} onPress={() => alert(`Tìm: ${searchText}`)} disabled={analyzing}>
              <Ionicons name="search" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Tìm Kiếm</Text>
            </TouchableOpacity>
          </>
        );
      default:
        return null;
    }
  };

  const TabButton = ({ icon, label, tabKey }) => (
    <TouchableOpacity
      style={[styles.tab, activeTab === tabKey && styles.activeTab, { width: width / 4 - 8 }]}
      onPress={() => setActiveTab(tabKey)}
      disabled={analyzing}
    >
      {icon}
      <Text style={[styles.tabText, activeTab === tabKey && styles.activeTabText]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()} disabled={analyzing}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>
      <Text style={styles.title}>Quét Sản Phẩm</Text>
      <Text style={styles.subtitle}>Phân tích cho hồ sơ của bạn</Text>

      <View style={styles.tabContainer}>
        <TabButton icon={<Ionicons name="camera-outline" size={20} color="#198754" />} label="Camera" tabKey={TAB_KEYS.CAMERA} />
        <TabButton icon={<MaterialIcons name="file-upload" size={20} color="#198754" />} label="Tải lên" tabKey={TAB_KEYS.UPLOAD} />
        <TabButton icon={<FontAwesome name="barcode" size={20} color="#198754" />} label="Mã vạch" tabKey={TAB_KEYS.BARCODE} />
        <TabButton icon={<Ionicons name="search-outline" size={20} color="#198754" />} label="Tìm kiếm" tabKey={TAB_KEYS.SEARCH} />
      </View>

      <View style={styles.contentBox}>
        {renderContent()}

        {analyzing && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 8, color: '#111' }}>Đang phân tích…</Text>
            <TouchableOpacity style={[styles.primaryBtn, styles.stopBtn, { marginTop: 12 }]} onPress={stopAnalyze}>
              <MaterialIcons name="pause" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Dừng</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView style={styles.tipsBox} showsVerticalScrollIndicator={false}>
        <Text style={styles.tipsTitle}>💡 Mẹo để có kết quả tốt nhất:</Text>
        <Text style={styles.tip}>• Ánh sáng tốt khi chụp ảnh</Text>
        <Text style={styles.tip}>• Chụp rõ nhãn thành phần</Text>
        <Text style={styles.tip}>• Tránh bóng phản quang</Text>
        <Text style={styles.tip}>• Chụp toàn bộ danh sách</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3fdf7', paddingTop: 50, paddingHorizontal: 16 },
  backButton: { position: 'absolute', top: 50, left: 16, zIndex: 10 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', color: '#0a0a0a' },
  subtitle: { fontSize: 14, textAlign: 'center', color: '#555', marginBottom: 20 },
  tabContainer: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 10, paddingVertical: 10, elevation: 1, marginBottom: 16 },
  tab: { alignItems: 'center', paddingVertical: 6 },
  tabText: { fontSize: 12, color: '#555', marginTop: 4 },
  activeTab: { backgroundColor: '#e9f9f1', borderRadius: 8 },
  activeTabText: { color: '#198754', fontWeight: '600' },
  contentBox: { backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', padding: 24, elevation: 3, minHeight: 260, justifyContent: 'center', position: 'relative' },
  loadingOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 10, paddingHorizontal: 16 },
  icon: { marginBottom: 10 },
  contentTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
  contentSubtitle: { fontSize: 13, color: '#666', marginBottom: 20, textAlign: 'center' },
  primaryBtn: { backgroundColor: '#198754', flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center' },
  disabledBtn: { opacity: 0.5 },
  stopBtn: { backgroundColor: '#ef4444' }, // màu nút dừng
  primaryBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 6 },
  previewImage: { width: 200, height: 200, borderRadius: 8, marginBottom: 12 },
  input: { width: '100%', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 16 },
  tipsBox: { marginTop: 20, backgroundColor: '#fff', padding: 16, borderRadius: 10, elevation: 2 },
  tipsTitle: { fontWeight: '700', marginBottom: 8, color: '#444' },
  tip: { fontSize: 13, color: '#333', marginBottom: 4 },
  scannerWrap: { width: '100%', height: 320, borderRadius: 12, overflow: 'hidden', marginBottom: 12, backgroundColor: '#000' },
  scanFrame: { position: 'absolute', left: '10%', right: '10%', top: '20%', bottom: '20%', borderWidth: 2, borderColor: '#00FF88', borderRadius: 12 },
  overlayBtn: { position: 'absolute', bottom: 12, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  overlayBtnText: { color: '#fff', fontWeight: '700' },
});

// ---------------- Dev sanity checks ----------------
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  (function runUnitChecks() {
    const t = [
      { name: 'inferMime .png', got: inferMimeFromName('a.png'), exp: 'image/png' },
      { name: 'inferMime default', got: inferMimeFromName('a.jpeg'), exp: 'image/jpeg' },
      { name: 'API_BASE typeof', got: typeof API_BASE, exp: 'string' },
    ];
    const ok = t.every((x) => x.got === x.exp);
    console.log('[ScanProductScreen checks]', t, ok ? '✓' : '✗', 'API_BASE =', API_BASE);
  })();
}
