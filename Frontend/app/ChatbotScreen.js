// app/ChatbotScreen.js
import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile } from './lib/profileStorage';
import Markdown from 'react-native-markdown-display';

/* ====== NEW: Audio recording & file system ====== */
import { Audio } from 'expo-av';

/* ====== API base ====== */
function resolveApiBase() {
  let base = 'http://127.0.0.1:8888';
  try {
    const Constants = require('expo-constants').default;
    const extra = Constants?.expoConfig?.extra ?? Constants?.manifestExtra;
    if (extra?.API_BASE) base = String(extra.API_BASE);
  } catch {}
  const fromGlobal =
    (globalThis && (globalThis.EXPO_PUBLIC_API_BASE || globalThis.API_BASE)) ||
    '';
  if (fromGlobal) base = String(fromGlobal);
  if (Platform.OS === 'android') {
    if (base.includes('localhost') || base.includes('127.0.0.1')) {
      base = base
        .replace('localhost', '10.0.2.2')
        .replace('127.0.0.1', '10.0.2.2');
    }
  }
  return base.replace(/\/$/, '');
}
const BACKEND = resolveApiBase();

/* ====== NEW: ASR endpoint (ngrok) ====== */
const ASR_ENDPOINT = `${BACKEND}/asr`;

/* ====== THEME ====== */
const COLOR = {
  bg: '#f4f6f8',
  header: '#e8f6e8',
  white: '#ffffff',
  grayCard: '#f2f4f5',
  border: '#e3e8ee',
  green: '#17863d',
  text: '#0f172a',
  textMuted: '#587164',
  tagGreen: '#0a8a3a',
};

const QUICK_CARD_WIDTH = 170;
const QUICK_CARD_PH = 12;
const QUICK_CARD_PV = 10;
const QUICK_CARD_TAG_FS = 11;
const QUICK_CARD_BODY_FS = 12;

/* ===== Helpers ===== */
const looksLikeTable = (txt = '') =>
  /\|.+\|\s*\n\|\-+/.test(txt) || /\|.+\|.+\|/.test(txt);

/** Parse ts về Date an toàn */
function toValidDate(input) {
  if (input instanceof Date) return input;
  if (!input) return null;
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}
function reviveMsgDates(msgs = []) {
  return msgs.map(m => ({ ...m, ts: toValidDate(m.ts) || new Date() }));
}

/** Sessions */
const SESSIONS_KEY = 'chat_sessions_v1';
async function loadSessions() {
  try {
    const raw = await AsyncStorage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
async function saveSessions(sessions) {
  try {
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch {}
}
function titleFromMessages(msgs) {
  const first = msgs.find(m => m.role === 'user');
  if (!first) return 'Cuộc trò chuyện';
  const t = first.text.trim().replace(/\s+/g, ' ');
  return t.length > 50 ? t.slice(0, 50) + '…' : t;
}

/* ====== FAQ builder ====== */
function buildPersonalFAQ(profile) {
  const goals = profile?.goals?.selected || [];
  const hasWeight = goals.some(g => /giảm cân/i.test(g));
  const hasMuscle = goals.some(g => /tăng cơ/i.test(g));
  return [
    {
      tag: 'PHÙ HỢP SỨC KHỎE',
      q: 'Sản phẩm này có phù hợp với tình trạng sức khỏe của tôi không?',
    },
    { tag: 'DỊ ỨNG', q: 'Sản phẩm này có an toàn với dị ứng của tôi không?' },
    {
      tag: 'MỤC TIÊU',
      q: hasWeight
        ? 'Sản phẩm này có hỗ trợ giảm cân không?'
        : hasMuscle
        ? 'Sản phẩm này có hỗ trợ tăng cơ không?'
        : 'Sản phẩm này có phù hợp với mục tiêu sức khỏe của tôi không?',
    },
    { tag: 'KHẨU PHẦN', q: 'Tôi nên dùng khẩu phần và tần suất thế nào?' },
    {
      tag: 'ĐÁNH GIÁ',
      q: 'Đánh giá tổng quan sản phẩm dựa trên hồ sơ sức khỏe của tôi.',
    },
    {
      tag: 'THAY THẾ',
      q: 'Gợi ý lựa chọn lành mạnh hơn cùng nhóm sản phẩm.',
    },
  ];
}

/* ====== Lỗi dạng 3 dòng cho Gemini 429 ====== */
function formatBackendError(s) {
  const msg = String(s || '');
  if (/Gemini.*429/i.test(msg) && /RuntimeError/i.test(msg)) {
    return [
      'Xin lỗi, có lỗi khi xử lý:',
      'Gemini error: RuntimeError',
      'Gemini 429: Hết quota Free Tier/đang quá tải. Hãy bật billing hoặc giảm tần suất gọi.',
    ].join('\n');
  }
  return `Xin lỗi, có lỗi khi xử lý:\n${msg}`;
}

/* ====== Markdown giải thích ====== */
const HEALTH_INFO_MD = `
**Điểm sức khỏe (cá nhân hoá) là gì?**

- Thang **0–8** (8 là tốt nhất). Cá nhân hoá theo **hồ sơ** của bạn (tình trạng, mục tiêu).
- Dùng để **so sánh nhanh** trong cùng nhóm khi mua sắm.

**Cách tính (rút gọn / 100 g):**
- Đường: ≤ **5 g** → **+2**; 5–8 g → **+1**; >8 g → **−1**
- Natri: ≤ **120 mg** → **+2**; >400 mg → **−1**
- Bão hoà: ≤ **3 g** → **+1**; >5 g → **−1**
- Nếu mục tiêu **tăng cơ**: **Protein ≥10 g** → **+2**
- Nếu mục tiêu **tiêu hoá/giảm cân**: **Chất xơ ≥5 g** → **+1**
- Với **snack**: năng lượng > **480 kcal/100 g** → **−1**

**Đọc điểm:**
- **≥ 6.5**  → *Phù hợp*
- **4.0–6.4** → *Cần cân nhắc*
- **1.0–3.9** → *Hạn chế*
- **< 1.0**   → *Tránh* (đặc biệt nếu có **trans fat** hoặc **dị ứng**)
`;

const NUTRI_INFO_MD = `
**Nutri-Score (tham khảo) là gì?**

- Nhãn 5 mức **A → E** theo **100 g / 100 ml**, giúp so sánh **nhanh** trong *cùng nhóm*.
- **Điểm tổng =** (năng lượng + đường + bão hoà + natri) **−** (chất xơ + protein + % trái cây/rau/hạt + dầu tốt).
- **Quy đổi (đồ ăn):**
  - Tổng điểm **≤ −1** → **A**
  - **≤ 2** → **B**
  - **≤ 10** → **C**
  - **≤ 18** → **D**
  - **> 18** → **E**
  - *(Đồ uống có quy tắc riêng.)*
`;

/* ====== Parse “Sản phẩm thay thế” (server trả Markdown có ảnh) ====== */
const IMG_RE = /!\[[^\]]*\]\(([^)]+)\)/i;
const IMG_LINE_RE = /^\s*!\[[^\]]*\]\(([^)]+)\)\s*$/i; // cả dòng là ảnh
const ITEM_START_RE = /^\s*(\d+)\.\s*\*\*(.+?)\*\*\s*—\s*([^\n]+?)\s*$/i;

function stripImageLines(md = '') {
  return md
    .split('\n')
    .filter(line => !IMG_LINE_RE.test(line) && !/\<img[\s\S]*src=/i.test(line))
    .join('\n');
}

function parseRecoMarkdown(md = '') {
  const lines = md.split('\n');
  const items = [];
  let cur = null;

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const m = ln.match(ITEM_START_RE);
    if (m) {
      if (cur) items.push(cur);
      cur = {
        idx: parseInt(m[1], 10),
        title: m[2].trim(),
        brand: m[3].replace(/\(.*?\)/g, '').trim(),
        details: [],
        image: null,
        health_score: null,
        health_level: null,
        nutri_grade: null,
        nutri_points: null,
        sugars_g: null,
        sodium_mg: null,
        satfat_g: null,
        protein_g: null,
        kcal: null,
      };
      continue;
    }
    if (!cur) continue;

    const img = ln.match(IMG_RE);
    if (img && !cur.image) {
      cur.image = img[1];
      continue;
    }
    cur.details.push(ln);
  }
  if (cur) items.push(cur);

  // Rút thông tin từ details
  items.forEach(it => {
    const block = it.details.join('\n');

    const hs = block.match(
      /Điểm sức khỏe.*?\*\*([\d.]+)\s*\/\s*[\d.]+\*\*\s*—\s*([^\n]+)/i
    );
    if (hs) {
      it.health_score = parseFloat(hs[1]);
      it.health_level = hs[2].trim();
    }

    const ns = block.match(/Nutri-Score.*?:\s*([A-E])\s*\(điểm\s*([-\d]+)\)/i);
    if (ns) {
      it.nutri_grade = ns[1];
      it.nutri_points = parseInt(ns[2], 10);
    }

    const n = block.match(/Dinh dưỡng\/100g:([^\n]+)/i);
    if (n) {
      const s = n[1];
      const mSug = s.match(/đường\s+([0-9.,-]+)/i);
      if (mSug) it.sugars_g = parseFloat(String(mSug[1]).replace(',', '.'));
      const mNa = s.match(/natri\s+([0-9.,-]+)/i);
      if (mNa)
        it.sodium_mg = parseInt(String(mNa[1]).replace(/[^\d-]/g, ''), 10);
      const mSat = s.match(/bão hoà\s+([0-9.,-]+)/i);
      if (mSat) it.satfat_g = parseFloat(String(mSat[1]).replace(',', '.'));
      const mPro = s.match(/protein\s+([0-9.,-]+)/i);
      if (mPro) it.protein_g = parseFloat(String(mPro[1]).replace(',', '.'));
      const mKcal = s.match(/([0-9]+)\s*kcal/i);
      if (mKcal) it.kcal = parseInt(mKcal[1], 10);
    }
  });

  return items;
}

function isRecoMessage(md = '') {
  return /sản phẩm thay thế/i.test(md) && /\d+\.\s+\*\*/.test(md);
}

/* ====== Markdown rules (ảnh full-width cho các case khác) ====== */
const mdRules = {
  image: node => {
    const src = node.attributes?.src || '';
    if (!src) return null;
    return (
      <Image
        key={node.key}
        source={{ uri: src }}
        style={{
          width: '100%',
          height: 180,
          marginTop: 8,
          borderRadius: 12,
          resizeMode: 'contain',
          backgroundColor: '#f5f5f5',
        }}
        accessible
        accessibilityLabel={node.attributes?.alt || 'image'}
      />
    );
  },
};

/* ====== Audio helpers ====== */
const msToClock = ms => {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};

/* ====== Component ====== */
export default function ChatbotScreen() {
  const router = useRouter();

  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: 'Xin chào! Tôi là HealthScan AI — trợ lý sức khỏe thông minh của bạn. Hãy chụp ảnh thành phần hoặc đặt câu hỏi nhé! 🥬',
      ts: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  // FAQ show/hide
  const [showFAQ, setShowFAQ] = useState(true);
  const [pulseFAQ, setPulseFAQ] = useState(false);

  // Hồ sơ & nhãn
  const [profile, setProfile] = useState(null);
  const [lastLabel, setLastLabel] = useState(null);

  // Sessions
  const [sessions, setSessions] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const chatRef = useRef(null);
  const chatIdRef = useRef(`chat-${Date.now()}`);

  // trạng thái đang gửi & AbortController
  const [isPending, setIsPending] = useState(false);
  const abortRef = useRef(null);

  // Modals
  const [showHealthInfo, setShowHealthInfo] = useState(false);
  const [showNutriInfo, setShowNutriInfo] = useState(false);

  // Gallery modal
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryProducts, setGalleryProducts] = useState([]);

  // Recording state
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordMs, setRecordMs] = useState(0);
  const recordStartRef = useRef(0);
  const recTimerRef = useRef(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Load profile, last label, sessions
  useEffect(() => {
    (async () => {
      try {
        const p = await getProfile();
        setProfile(Object.keys(p || {}).length ? p : null);
      } catch {}
      try {
        const raw = await AsyncStorage.getItem('last_scan_label');
        setLastLabel(raw ? JSON.parse(raw) : null);
      } catch {}
      const ss = await loadSessions();
      setSessions(ss);
    })();
  }, []);

  useEffect(() => {
    if (!pulseFAQ) return;
    const t = setTimeout(() => setPulseFAQ(false), 1600);
    return () => clearTimeout(t);
  }, [pulseFAQ]);

  // Persist session
  const persistSession = async msgs => {
    const id = chatIdRef.current;
    const updatedAt = new Date().toISOString();
    const existing = sessions.find(s => s.id === id);
    let nextSessions;
    if (existing) {
      existing.messages = msgs;
      existing.updatedAt = updatedAt;
      existing.title = titleFromMessages(msgs);
      nextSessions = [...sessions];
    } else {
      nextSessions = [
        { id, messages: msgs, updatedAt, title: titleFromMessages(msgs) },
        ...sessions,
      ];
    }
    setSessions(nextSessions);
    await saveSessions(nextSessions);
  };

  // New chat
  const newChat = async () => {
    chatIdRef.current = `chat-${Date.now()}`;
    setMessages([
      {
        role: 'bot',
        text: 'Bắt đầu cuộc trò chuyện mới. Bạn muốn hỏi gì về sản phẩm hoặc sức khỏe? 😊',
        ts: new Date(),
      },
    ]);
  };

  const onSend = async textOverride => {
    if (isPending) return;
    const t = (textOverride ?? input).trim();
    if (!t) return;

    const now = new Date();
    const nextUserMsgs = [...messages, { role: 'user', text: t, ts: now }];
    setMessages(nextUserMsgs);
    setInput('');
    chatRef.current?.scrollToEnd({ animated: true });

    const typing = {
      role: 'bot',
      text: 'Đang phân tích...',
      ts: new Date(),
      _typing: true,
    };
    setMessages(prev => [...prev, typing]);

    setIsPending(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch(`${BACKEND}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          chat_id: chatIdRef.current,
          message: t,
          profile: profile || {},
          label: lastLabel || {},
        }),
      });

      const data = await resp.json();
      setMessages(prev => prev.filter(m => !m._typing));

      if (!data.ok) {
        const errMsgs = [
          ...nextUserMsgs,
          { role: 'bot', text: formatBackendError(data.error), ts: new Date() },
        ];
        setMessages(errMsgs);
        await persistSession(errMsgs);
        return;
      }

      // --- Tối ưu hiển thị đề xuất: tách ảnh sang gallery & gắn nút từng sản phẩm ---
      const raw = data.reply_markdown || '...';
      const isReco = isRecoMessage(raw);
      const products = isReco ? parseRecoMarkdown(raw) : [];
      const cleaned = isReco ? stripImageLines(raw) : raw;

      const botMsgs = [
        ...nextUserMsgs,
        {
          role: 'bot',
          text: cleaned,
          ts: new Date(),
          isReco,
          products, // [{title, brand, image, health_score, ...}]
        },
      ];

      setMessages(botMsgs);
      await persistSession(botMsgs);
    } catch (e) {
      setMessages(prev => prev.filter(m => !m._typing));
      if (e?.name === 'AbortError') {
        const stopMsgs = [
          ...nextUserMsgs,
          { role: 'bot', text: '⏹️ Đã dừng phân tích theo yêu cầu.', ts: new Date() },
        ];
        setMessages(stopMsgs);
        await persistSession(stopMsgs);
      } else {
        const errMsgs = [
          ...nextUserMsgs,
          { role: 'bot', text: `Mạng lỗi: ${String(e)}`, ts: new Date() },
        ];
        setMessages(errMsgs);
        await persistSession(errMsgs);
      }
    } finally {
      setIsPending(false);
      abortRef.current = null;
      chatRef.current?.scrollToEnd({ animated: true });
    }
  };

  /* ===== Đề xuất: 5 mục/lần qua /chat để đồng nhất format ===== */
  const requestRecommend = () => {
    if (!isPending) onSend('Sản phẩm thay thế');
  };
  const requestMoreRecommend = () => {
    if (!isPending) onSend('Bổ sung sản phẩm thay thế');
  };

  const addQuick = q => {
    if (!isPending) onSend(q);
  };
  const FAQ = useMemo(() => buildPersonalFAQ(profile || {}), [profile]);
  const toggleFAQ = () => {
    setShowFAQ(v => !v);
    if (!showFAQ) setPulseFAQ(true);
  };
  const onStop = () => {
    abortRef.current?.abort();
  };

  const openGallery = (prods = []) => {
    setGalleryProducts(prods.filter(p => !!p.image));
    setGalleryOpen(true);
  };
  const openGallerySingle = p => {
    if (p?.image) openGallery([p]);
  };

  const renderInlinePhotoRows = msg => {
    if (!msg?.isReco || !(msg?.products?.length)) return null;
    return (
      <View style={styles.inlineRecoWrap}>
        {/* Nút xem tất cả ảnh (nếu có từ 1 ảnh trở lên) */}
        {msg.products.some(p => !!p.image) && (
          <TouchableOpacity
            style={styles.inlineAllBtn}
            onPress={() => openGallery(msg.products)}
          >
            <MaterialIcons name="photo-library" size={16} color={COLOR.green} />
            <Text style={styles.inlineAllBtnText}>
              Xem ảnh minh họa ({msg.products.filter(p => !!p.image).length})
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderBotTools = (msg, isLast) => {
    return (
      <View style={styles.toolChipsRow}>
        {isLast && (
          <>
            <TouchableOpacity
              style={[styles.toolChip, isPending && { opacity: 0.5 }]}
              onPress={() => addQuick('Xem hồ sơ')}
              disabled={isPending}
            >
              <MaterialIcons name="badge" size={14} color={COLOR.green} />
              <Text style={styles.toolChipText}>Xem hồ sơ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toolChip, isPending && { opacity: 0.5 }]}
              onPress={() => addQuick('Xem thành phần')}
              disabled={isPending}
            >
              <MaterialIcons name="inventory" size={14} color={COLOR.green} />
              <Text style={styles.toolChipText}>Xem thành phần</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toolChip, isPending && { opacity: 0.5 }]}
              onPress={requestRecommend}
              disabled={isPending}
            >
              <MaterialIcons name="recommend" size={14} color={COLOR.green} />
              <Text style={styles.toolChipText}>Sản phẩm thay thế</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toolChip, isPending && { opacity: 0.5 }]}
              onPress={requestMoreRecommend}
              disabled={isPending}
            >
              <MaterialIcons name="playlist-add" size={14} color={COLOR.green} />
              <Text style={styles.toolChipText}>Bổ sung 5 sản phẩm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toolChip, isPending && { opacity: 0.5 }]}
              onPress={() => setShowHealthInfo(true)}
              disabled={isPending}
            >
              <MaterialIcons
                name="monitor-heart"
                size={14}
                color={COLOR.green}
              />
              <Text style={styles.toolChipText}>Điểm sức khỏe?</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toolChip, isPending && { opacity: 0.5 }]}
              onPress={() => setShowNutriInfo(true)}
              disabled={isPending}
            >
              <MaterialIcons name="science" size={14} color={COLOR.green} />
              <Text style={styles.toolChipText}>Nutri-Score?</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  /* ===== Recording controls ===== */
  const startRecording = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Không hỗ trợ',
        'Ghi âm bằng Expo AV chưa được bật cho bản web. Bạn hãy dùng ứng dụng trên Android/iOS.'
      );
      return;
    }

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Cần quyền micro', 'Hãy cấp quyền để sử dụng nói chuyện.');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await rec.startAsync();

      recordStartRef.current = Date.now();
      setRecordMs(0);
      recTimerRef.current && clearInterval(recTimerRef.current);
      recTimerRef.current = setInterval(() => {
        setRecordMs(Date.now() - recordStartRef.current);
      }, 200);

      setRecording(rec);
      setIsRecording(true);
    } catch (e) {
      Alert.alert('Lỗi ghi âm', String(e?.message || e));
    }
  };

  const stopRecording = async (autoSend = true) => {
    try {
      if (!recording) return null;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recTimerRef.current && clearInterval(recTimerRef.current);
      setIsRecording(false);
      setRecording(null);

      if (autoSend && uri) {
        await transcribeAndSend(uri);
      }
      return uri;
    } catch (e) {
      Alert.alert('Lỗi dừng ghi', String(e?.message || e));
      return null;
    }
  };

  const handleMicPress = async () => {
    if (isTranscribing) return;
    if (!isRecording) {
      await startRecording();
    } else {
      await stopRecording(true);
    }
  };

  const transcribeAndSend = async audioUri => {
    setIsTranscribing(true);
    try {
      const form = new FormData();
      // Đuôi mặc định của HIGH_QUALITY là m4a (iOS) hoặc m4a/aac (Android)
      form.append('file', {
        uri: audioUri,
        name: `audio-${Date.now()}.m4a`,
        type: 'audio/m4a',
      });

      // KHÔNG set 'Content-Type' để RN tự thêm boundary
      const resp = await fetch(ASR_ENDPOINT, {
        method: 'POST',
        body: form,
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`ASR HTTP ${resp.status}: ${txt}`);
      }

      let text = '';
      // thử parse json; nếu fail thì lấy text thuần
      try {
        const js = await resp.json();
        text = js.text || js.transcript || js.result || '';
      } catch {
        text = (await resp.text()) || '';
      }

      text = String(text || '').trim();
      if (!text) {
        Alert.alert(
          'Không nhận được nội dung',
          'Hãy thử nói rõ hơn hoặc kiểm tra micro.'
        );
        return;
      }
      // Gửi nội dung transcribe như một tin nhắn
      await onSend(text);
    } catch (e) {
      Alert.alert('ASR lỗi', String(e?.message || e));
    } finally {
      setIsTranscribing(false);
    }
  };

  /* ====== UI ====== */
  const renderRecordingBar = () => {
    if (!isRecording) return null;
    return (
      <View style={styles.recBar}>
        <MaterialIcons name="fiber-manual-record" size={14} color="#ef4444" />
        <Text style={styles.recBarText}>Đang ghi • {msToClock(recordMs)}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginLeft: 'auto' }}>
          <TouchableOpacity style={styles.recBtn} onPress={() => stopRecording(true)}>
            <Text style={styles.recBtnText}>Dừng & gửi</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const openSession = s => {
    chatIdRef.current = s.id;
    setMessages(reviveMsgDates(s.messages || []));
    setShowHistory(false);
    setShowFAQ(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* MENU */}
      <Modal visible={menuOpen} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalBg}
          activeOpacity={1}
          onPress={() => setMenuOpen(false)}
        >
          <View style={styles.menu}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={async () => {
                setMenuOpen(false);
                await newChat();
              }}
            >
              <MaterialIcons name="chat" size={18} color="#111827" />
              <Text style={styles.menuText}>Cuộc chat mới</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                setShowHistory(true);
              }}
            >
              <MaterialIcons name="history" size={18} color="#111827" />
              <Text style={styles.menuText}>Lịch sử chat</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={async () => {
                setMenuOpen(false);
                try {
                  const p = await getProfile();
                  setProfile(Object.keys(p || {}).length ? p : null);
                } catch {}
                try {
                  const raw = await AsyncStorage.getItem('last_scan_label');
                  setLastLabel(raw ? JSON.parse(raw) : null);
                } catch {}
              }}
            >
              <MaterialIcons name="refresh" size={18} color="#111827" />
              <Text style={styles.menuText}>Tải lại hồ sơ & nhãn</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* WELCOME */}
      <View style={styles.welcomeCard}>
        <View style={styles.toolbarRow}>
          <View style={styles.toolbarSide}>
            <TouchableOpacity
              style={styles.toolbarBtn}
              onPress={() => router.push('HomeScreen')}
              accessibilityLabel="Quay lại"
            >
              <MaterialIcons name="arrow-back" size={20} color={COLOR.green} />
            </TouchableOpacity>
          </View>

          <View style={styles.toolbarCenter}>
            <MaterialIcons
              name="health-and-safety"
              size={30}
              color={COLOR.green}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.toolbarTitle}>
              Chào mừng đến với HealthScan
            </Text>
          </View>

          <View style={[styles.toolbarSide, { alignItems: 'flex-end' }]}>
            <TouchableOpacity
              style={styles.toolbarBtn}
              onPress={() => setMenuOpen(true)}
              accessibilityLabel="Mở menu"
            >
              <MaterialIcons name="add" size={22} color={COLOR.green} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.welcomeSub}>
          AI phân tích thành phần & tư vấn sức khỏe cá nhân hóa
        </Text>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <MaterialIcons name="psychology" size={16} color={COLOR.green} />
            <Text style={styles.badgeText}>AI Analysis</Text>
          </View>
          <View style={styles.badge}>
            <MaterialIcons name="verified" size={16} color={COLOR.green} />
            <Text style={styles.badgeText}>Tư vấn an toàn</Text>
          </View>
        </View>
      </View>

      {/* FAQ */}
      {showFAQ && (
        <View style={styles.faqWrapCard}>
          <View style={styles.faqHeaderRow}>
            <MaterialIcons name="help-outline" size={18} color="#1e293b" />
            <Text style={styles.faqHeader}>Câu hỏi gợi ý cho bạn</Text>
            <TouchableOpacity
              style={styles.faqHideBtn}
              onPress={() => {
                setShowFAQ(false);
                setPulseFAQ(false);
              }}
            >
              <MaterialIcons name="close" size={18} color="#1e293b" />
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.faqRow, pulseFAQ && styles.faqPulse]}
          >
            {FAQ.map((f, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.faqCard,
                  {
                    width: QUICK_CARD_WIDTH,
                    paddingHorizontal: QUICK_CARD_PH,
                    paddingVertical: QUICK_CARD_PV,
                  },
                  isPending && { opacity: 0.6 },
                ]}
                activeOpacity={0.85}
                onPress={() => onSend(f.q)}
                disabled={isPending}
              >
                <Text style={[styles.faqTag, { fontSize: QUICK_CARD_TAG_FS }]}>
                  {f.tag}
                </Text>
                <Text
                  style={[styles.faqQuestion, { fontSize: QUICK_CARD_BODY_FS }]}
                  numberOfLines={3}
                >
                  {f.q}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* CHAT */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          ref={chatRef}
          style={styles.chat}
          contentContainerStyle={{ paddingVertical: 10 }}
          onContentSizeChange={() =>
            chatRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.map((m, i) => {
            const isLastBot = m.role === 'bot' && i === messages.length - 1;
            return (
              <View
                key={i}
                style={[
                  styles.msgRow,
                  m.role === 'user' && styles.msgRowRight,
                ]}
              >
                {m.role === 'bot' && (
                  <View style={styles.avatar}>
                    <FontAwesome5 name="robot" size={16} color="#0a4127" />
                  </View>
                )}
                <View
                  style={[
                    styles.bubble,
                    m.role === 'user' ? styles.bubbleUser : styles.bubbleBot,
                  ]}
                >
                  {m.role === 'user' ? (
                    <Text style={styles.textUser}>{m.text}</Text>
                  ) : looksLikeTable(m.text) ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <Markdown style={mdStyles} rules={mdRules}>
                        {m.text}
                      </Markdown>
                    </ScrollView>
                  ) : (
                    <Markdown style={mdStyles} rules={mdRules}>
                      {m.text}
                    </Markdown>
                  )}

                  {/* Hàng nút "Ảnh" cho từng sản phẩm thay thế */}
                  {renderInlinePhotoRows(m)}

                  {/* Tool chips */}
                  {renderBotTools(m, isLastBot)}
                </View>
              </View>
            );
          })}

          {/* render time an toàn */}
          {(() => {
            if (!messages.length) return null;
            const rawTs = messages[messages.length - 1]?.ts;
            const d = toValidDate(rawTs);
            if (!d) return null;
            return (
              <Text style={styles.tsText}>
                {new Intl.DateTimeFormat('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                }).format(d)}
              </Text>
            );
          })()}
        </ScrollView>

        {/* Recording bar */}
        {renderRecordingBar()}

        {/* Composer */}
        <View style={styles.composer}>
          <TouchableOpacity
            onPress={() => setShowFAQ(v => !v)}
            style={[styles.compIconBtn, isPending && { opacity: 0.5 }]}
            accessibilityLabel="Ẩn/hiện câu hỏi nhanh"
            disabled={isPending}
          >
            <MaterialIcons name="help-outline" size={20} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleMicPress}
            style={[
              styles.compIconBtn,
              (isPending || isTranscribing) && { opacity: 0.5 },
              isRecording && { borderColor: '#ef4444' },
            ]}
            disabled={isPending || isTranscribing}
          >
            {isTranscribing ? (
              <ActivityIndicator size="small" />
            ) : (
              <MaterialIcons
                name={isRecording ? 'stop' : 'keyboard-voice'}
                size={20}
                color={isRecording ? '#ef4444' : '#64748b'}
              />
            )}
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder={
              isPending
                ? 'Đang phân tích… nhấn ⏸ để dừng'
                : 'Đặt câu hỏi về sức khỏe hoặc sản phẩm...'
            }
            placeholderTextColor="#8aa0a6"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => !isPending && onSend()}
            editable={!isPending}
            returnKeyType="send"
          />
          {isPending ? (
            <TouchableOpacity
              onPress={() => abortRef.current?.abort()}
              style={[styles.sendBtn, styles.stopBtn]}
              activeOpacity={0.9}
            >
              <MaterialIcons name="pause" size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => onSend()}
              style={styles.sendBtn}
              activeOpacity={0.9}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* INFO: Health Score */}
      <Modal visible={showHealthInfo} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalBg}
          activeOpacity={1}
          onPress={() => setShowHealthInfo(false)}
        >
          <View style={styles.centerWrap}>
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <MaterialIcons
                  name="monitor-heart"
                  size={18}
                  color={COLOR.green}
                />
                <Text style={styles.infoTitle}>Điểm sức khỏe (cá nhân hoá)</Text>
                <TouchableOpacity onPress={() => setShowHealthInfo(false)}>
                  <MaterialIcons name="close" size={18} color="#111827" />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>
                <Markdown style={mdStyles} rules={mdRules}>
                  {HEALTH_INFO_MD}
                </Markdown>
              </ScrollView>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* INFO: Nutri-Score */}
      <Modal visible={showNutriInfo} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalBg}
          activeOpacity={1}
          onPress={() => setShowNutriInfo(false)}
        >
          <View style={styles.centerWrap}>
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <MaterialIcons name="science" size={18} color={COLOR.green} />
                <Text style={styles.infoTitle}>Nutri-Score (tham khảo)</Text>
                <TouchableOpacity onPress={() => setShowNutriInfo(false)}>
                  <MaterialIcons name="close" size={18} color="#111827" />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>
                <Markdown style={mdStyles} rules={mdRules}>
                  {NUTRI_INFO_MD}
                </Markdown>
              </ScrollView>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* GALLERY: ảnh minh hoạ sản phẩm thay thế */}
      <Modal visible={galleryOpen} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalBg}
          activeOpacity={1}
          onPress={() => setGalleryOpen(false)}
        >
          <View style={styles.centerWrap}>
            <View style={styles.galleryCard}>
              <View style={styles.galleryHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialIcons name="photo-library" size={18} color={COLOR.green} />
                  <Text style={styles.galleryTitle}>Ảnh minh họa sản phẩm thay thế</Text>
                </View>
                <TouchableOpacity onPress={() => setGalleryOpen(false)}>
                  <MaterialIcons name="close" size={18} color="#111827" />
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 6 }}
              >
                {galleryProducts.map((p, idx) => (
                  <View key={idx} style={styles.prodCard}>
                    <View style={styles.prodImageWrap}>
                      {p.image ? (
                        <Image source={{ uri: p.image }} style={styles.prodImage} />
                      ) : (
                        <View
                          style={[
                            styles.prodImage,
                            { justifyContent: 'center', alignItems: 'center' },
                          ]}
                        >
                          <MaterialIcons
                            name="image-not-supported"
                            size={36}
                            color="#94a3b8"
                          />
                        </View>
                      )}
                      <View style={styles.prodBadge}>
                        <Text style={styles.prodBadgeText}>
                          {idx + 1}/{galleryProducts.length}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.prodTitle} numberOfLines={2}>
                      {p.title || 'Sản phẩm'}
                    </Text>
                    <Text style={styles.prodBrand} numberOfLines={1}>
                      {p.brand || '—'}
                    </Text>

                    <View style={styles.chipsRow}>
                      {p.health_score != null && (
                        <View style={styles.chip}>
                          <MaterialIcons
                            name="monitor-heart"
                            size={14}
                            color={COLOR.green}
                          />
                          <Text style={styles.chipText}>
                            {p.health_score}/8 • {p.health_level || ''}
                          </Text>
                        </View>
                      )}
                      {p.nutri_grade && (
                        <View style={styles.chip}>
                          <MaterialIcons name="science" size={14} color={COLOR.green} />
                          <Text style={styles.chipText}>
                            Nutri-Score {p.nutri_grade}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.kvRow}>
                      {p.sugars_g != null && (
                        <Text style={styles.kvItem}>Đường {p.sugars_g} g</Text>
                      )}
                      {p.sodium_mg != null && (
                        <Text style={styles.kvItem}>Natri {p.sodium_mg} mg</Text>
                      )}
                      {p.protein_g != null && (
                        <Text style={styles.kvItem}>Protein {p.protein_g} g</Text>
                      )}
                      {p.kcal != null && (
                        <Text style={styles.kvItem}>{p.kcal} kcal</Text>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* HISTORY */}
      <Modal visible={showHistory} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalBg}
          activeOpacity={1}
          onPress={() => setShowHistory(false)}
        >
          <View style={styles.centerWrap}>
            <View style={styles.infoCard}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>Lịch sử chat</Text>
                <TouchableOpacity onPress={() => setShowHistory(false)}>
                  <MaterialIcons name="close" size={18} color="#111827" />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 420 }}>
                {sessions.length === 0 && (
                  <Text style={{ color: '#475569' }}>
                    Chưa có cuộc trò chuyện nào.
                  </Text>
                )}
                {sessions.map(s => (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.sessionRow}
                    onPress={() => openSession(s)}
                  >
                    <MaterialIcons
                      name="chat-bubble-outline"
                      size={18}
                      color={COLOR.green}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', color: '#0f172a' }}>
                        {s.title || 'Cuộc trò chuyện'}
                      </Text>
                      <Text style={{ color: '#64748b', fontSize: 12 }}>
                        {new Date(s.updatedAt).toLocaleString('vi-VN')}
                      </Text>
                    </View>
                    <MaterialIcons
                      name="chevron-right"
                      size={20}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
        </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

/* ===== Styles ===== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR.bg },

  /* modal common */
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.16)' },
  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 12 },

  infoCard: {
    width: '92%',
    maxWidth: 760,
    maxHeight: '80%',
    backgroundColor: COLOR.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLOR.border,
    elevation: 20,
  },
  infoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  infoTitle: { color: '#0f172a', fontWeight: '800' },

  /* menu */
  menu: {
    position: 'absolute',
    top: 70,
    right: 12,
    backgroundColor: COLOR.white,
    width: 240,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOR.border,
    paddingVertical: 8,
    elevation: 24,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  menuText: { color: '#111827', fontWeight: '600' },

  /* welcome & faq */
  welcomeCard: { backgroundColor: COLOR.header, borderRadius: 10, marginHorizontal: 12, marginTop: 10, padding: 14, borderWidth: 1, borderColor: COLOR.border },
  welcomeSub: { marginTop: 6, color: COLOR.textMuted, textAlign: 'center' },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 10, justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLOR.white, borderWidth: 1, borderColor: COLOR.border, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeText: { color: COLOR.green, fontWeight: '700' },

  faqWrapCard: { backgroundColor: COLOR.white, borderRadius: 10, margin: 12, borderWidth: 1, borderColor: COLOR.border },
  faqHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 },
  faqHideBtn: { marginLeft: 'auto', padding: 4 },
  faqHeader: { fontWeight: '800', color: '#1e293b' },
  faqRow: { paddingHorizontal: 10, paddingVertical: 12, gap: 10 },
  faqPulse: { borderBottomWidth: 2, borderBottomColor: COLOR.green },
  faqCard: { backgroundColor: COLOR.grayCard, borderRadius: 12, borderWidth: 1, borderColor: COLOR.border, justifyContent: 'space-between', marginRight: 10 },
  faqTag: { color: COLOR.tagGreen, fontWeight: '900', marginBottom: 6 },
  faqQuestion: { color: '#1f2937', fontWeight: '600' },

  /* chat */
  chat: { flex: 1, paddingHorizontal: 12 },
  msgRow: { flexDirection: 'row', gap: 8, marginVertical: 6, alignItems: 'flex-end', width: '100%' },
  msgRowRight: { flexDirection: 'row-reverse', alignItems: 'flex-end', justifyContent: 'flex-start' },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#c6f0d9', justifyContent: 'center', alignItems: 'center' },
  bubble: { maxWidth: '84%', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
  bubbleBot: { backgroundColor: COLOR.white, borderColor: COLOR.border },
  bubbleUser: { backgroundColor: '#eaf6ef', borderColor: COLOR.border, alignSelf: 'flex-end' },
  textUser: { color: '#0f172a', fontWeight: '600', textAlign: 'right' },
  tsText: { color: '#7c8f84', fontSize: 12, marginLeft: 50, marginTop: 4 },

  /* inline photo row for reco items */
  inlineRecoWrap: { marginTop: 8, gap: 6 },
  inlineAllBtn: { alignSelf: 'flex-start', marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eef9f0', borderWidth: 1, borderColor: '#cdeed6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  inlineAllBtnText: { color: COLOR.green, fontWeight: '800', fontSize: 12 },

  /* tools & composer */
  toolChipsRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  toolChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0faf4', borderWidth: 1, borderColor: '#d3ecd9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  toolChipText: { color: COLOR.green, fontWeight: '700' },

  composer: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8, borderTopWidth: 1, borderColor: COLOR.border, backgroundColor: COLOR.white },
  compIconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLOR.white, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLOR.border },
  input: { flex: 1, borderWidth: 1, borderColor: COLOR.border, borderRadius: 22, paddingHorizontal: 14, color: '#000', backgroundColor: COLOR.white, height: 40 },
  sendBtn: { paddingHorizontal: 14, height: 40, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: COLOR.green },
  stopBtn: { backgroundColor: '#ef4444' },

  /* recording bar */
  recBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: COLOR.border,
    backgroundColor: '#fff1f2',
  },
  recBarText: { color: '#0f172a', fontWeight: '700' },
  recBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#ef4444', borderRadius: 8 },
  recBtnText: { color: '#fff', fontWeight: '700' },

  /* history */
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  historyTitle: { color: '#0f172a', fontWeight: '800' },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: COLOR.border, padding: 10, borderRadius: 10, marginBottom: 8 },

  /* toolbar */
  toolbarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  toolbarSide: { width: 42, alignItems: 'flex-start' },
  toolbarCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  toolbarBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLOR.white, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLOR.border },
  toolbarTitle: { fontSize: 25, fontWeight: '800', color: COLOR.green, textAlign: 'center' },

  /* gallery modal */
  galleryCard: {
    width: '96%',
    maxWidth: 820,
    maxHeight: '82%',
    backgroundColor: COLOR.white,
    borderRadius: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLOR.border,
    elevation: 20,
  },
  galleryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 4 },
  galleryTitle: { color: '#0f172a', fontWeight: '800' },

  prodCard: { width: 280, marginHorizontal: 6, borderWidth: 1, borderColor: COLOR.border, borderRadius: 12, backgroundColor: '#fbfdfc', padding: 10 },
  prodImageWrap: { position: 'relative', width: '100%', height: 170, borderRadius: 10, overflow: 'hidden', backgroundColor: '#f5f5f5' },
  prodImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  prodBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  prodBadgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  prodTitle: { marginTop: 8, color: '#0f172a', fontWeight: '800' },
  prodBrand: { color: '#475569', fontWeight: '600', marginTop: 2 },

  chipsRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eef9f0', borderWidth: 1, borderColor: '#cdeed6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  chipText: { color: COLOR.green, fontWeight: '700', fontSize: 12 },

  kvRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  kvItem: {
    color: '#0f172a',
    fontSize: 12,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
});

const mdStyles = {
  body: { color: '#111827', lineHeight: 20 },
  strong: { fontWeight: '800', color: '#0f172a' },
  em: { fontStyle: 'italic' },
  bullet_list: { marginVertical: 4 },
  list_item: { marginVertical: 2 },
  blockquote: { borderLeftWidth: 3, borderLeftColor: '#c8ebd3', paddingLeft: 10, color: '#0f172a', backgroundColor: '#f7fbf8' },
  code_block: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  code_inline: { backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  table: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, overflow: 'hidden', marginVertical: 6, minWidth: 280 },
  thead: { backgroundColor: '#eef7f2' },
  th: { backgroundColor: '#eef7f2', padding: 8, borderRightWidth: 1, borderColor: '#e5e7eb', fontWeight: '800' },
  tr: { borderBottomWidth: 1, borderColor: '#e5e7eb' },
  td: { padding: 8, borderRightWidth: 1, borderColor: '#e5e7eb' },
};

         
