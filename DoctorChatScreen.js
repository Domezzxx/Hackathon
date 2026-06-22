import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  ScrollView, Platform, Image, Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// ── SUT Theme ──────────────────────────────────────
const C = {
  orange:      '#F47920',
  orangeDark:  '#C85E00',
  orangeLight: '#FFF0E6',
  orangeMid:   '#FDE3CC',
  white:       '#FFFFFF',
  bg:          '#FFF8F4',
  border:      '#FAD9BF',
  text:        '#2D1A00',
  textSub:     '#A06030',
  textMuted:   '#C49070',
  green:       '#10B981',
};

/**
 * หน้าแชตกับทันตแพทย์ 1 คน (ฝั่งคนไข้) — เปิดจากรายชื่อหมอใน DoctorTab
 * ข้อความเป็น shared state ใน App.js แยกตามหมอแต่ละคน
 */
export default function DoctorChatScreen({
  doctor,
  messages = [],
  doctorTyping = false,
  onSend,
  onTyping,
  onBack,
  onSeen,
  isActive = false,
}) {
  const [input, setInput] = useState('');
  const scrollRef = useRef();
  const typingTimer = useRef(null);
  const online = !!doctor?.online;

  // เลื่อนลงล่างสุดเมื่อมีข้อความใหม่ / หมอกำลังพิมพ์
  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(id);
  }, [messages, doctorTyping]);

  // มาร์คว่าอ่านแล้วเมื่อเปิดแชตหมอคนนี้ (active) หรือมีข้อความใหม่ขณะเปิดอยู่
  useEffect(() => {
    if (isActive) onSeen?.();
  }, [isActive, messages]);

  useEffect(() => () => { if (typingTimer.current) clearTimeout(typingTimer.current); }, []);

  const handleType = (t) => {
    setInput(t);
    onTyping?.(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onTyping?.(false), 1200);
  };

  const stopTyping = () => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    onTyping?.(false);
  };

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    stopTyping();
    onSend?.({ content: text });
  };

  const handleSendPhoto = () => {
    Alert.alert('ส่งรูปให้ทันตแพทย์', 'เลือกรูปภาพจาก', [
      { text: 'ถ่ายรูป', onPress: () => pickImage('camera') },
      { text: 'คลังภาพ', onPress: () => pickImage('gallery') },
      { text: 'ยกเลิก', style: 'cancel' },
    ]);
  };

  const pickImage = async (source) => {
    let result;
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('ไม่สามารถเข้าถึงกล้องได้', 'กรุณาอนุญาตการใช้กล้องในการตั้งค่าของอุปกรณ์');
        return;
      }
      result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('ไม่สามารถเข้าถึงคลังภาพได้', 'กรุณาอนุญาตการเข้าถึงคลังภาพในการตั้งค่าของอุปกรณ์');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    }
    if (result.canceled || !result.assets?.[0]) return;
    onSend?.({ content: '', imageUri: result.assets[0].uri });
  };

  if (!doctor) return null;

  return (
    <View style={styles.wrap}>
      {/* ── Doctor header ── */}
      <View style={styles.docHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backTxt}>‹</Text>
        </TouchableOpacity>
        <View style={styles.docAvatarWrap}>
          <View style={[styles.docAvatar, !online && styles.docAvatarOff]}>
            <Text style={styles.docAvatarTxt}>{doctor.initial}</Text>
          </View>
          <View style={[styles.presence, { backgroundColor: online ? C.green : C.textMuted }]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.docName} numberOfLines={1}>{doctor.name}</Text>
          <Text style={styles.docStatus} numberOfLines={1}>
            {doctorTyping
              ? 'กำลังพิมพ์…'
              : online
                ? `ออนไลน์ · ${doctor.title}`
                : `ออฟไลน์ · ${doctor.title}`}
          </Text>
        </View>
        <View style={[styles.liveTag, { backgroundColor: online ? '#D1FAE5' : C.orangeLight }]}>
          <Text style={[styles.liveTagTxt, { color: online ? '#065F46' : C.textSub }]}>
            {online ? 'LIVE' : 'รอคิว'}
          </Text>
        </View>
      </View>

      {/* แถบแจ้งเมื่อหมอออฟไลน์ */}
      {!online && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineTxt}>
            ทันตแพทย์ออฟไลน์{doctor.awayUntil ? ` · ${doctor.awayUntil}` : ''} — ฝากข้อความไว้ได้ จะตอบกลับเมื่อกลับมา
          </Text>
        </View>
      )}

      <ScrollView ref={scrollRef} style={styles.body} contentContainerStyle={{ paddingVertical: 18 }}>
        {messages.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🦷</Text>
            <Text style={styles.emptyTitle}>เริ่มปรึกษากับ{doctor.name}</Text>
            <Text style={styles.emptySub}>พิมพ์อาการ หรือส่งรูปฟันให้คุณหมอดูได้เลย</Text>
          </View>
        ) : (
          messages.map((m) => (
            <View key={m.id} style={m.sender === 'patient' ? styles.rowUser : styles.rowDoc}>
              {m.sender === 'doctor' && (
                <View style={styles.miniAvatar}><Text style={styles.miniAvatarTxt}>{doctor.initial}</Text></View>
              )}
              <View style={styles.msgCol}>
                <View style={[styles.bubble, m.sender === 'patient' ? styles.bubbleUser : styles.bubbleDoc]}>
                  {m.imageUri ? (
                    <Image source={{ uri: m.imageUri }} style={styles.msgImage} />
                  ) : (
                    <Text style={m.sender === 'patient' ? styles.txtUser : styles.txtDoc}>{m.content}</Text>
                  )}
                </View>
              </View>
            </View>
          ))
        )}

        {doctorTyping && (
          <View style={styles.rowDoc}>
            <View style={styles.miniAvatar}><Text style={styles.miniAvatarTxt}>{doctor.initial}</Text></View>
            <View style={[styles.bubble, styles.bubbleDoc]}>
              <View style={styles.typingDots}>
                <View style={styles.dot} /><View style={styles.dot} /><View style={styles.dot} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cameraBtn} onPress={handleSendPhoto}>
          <Image source={require('./assets/c.png')} style={styles.cameraBtnIcon} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="พิมพ์ข้อความถึงทันตแพทย์..."
          placeholderTextColor={C.textMuted}
          value={input}
          onChangeText={handleType}
          onSubmitEditing={send}
          returnKeyType="send"
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
          onPress={send}
          disabled={!input.trim()}
        >
          <Text style={styles.sendArrow}>ส่ง</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },

  // Doctor header
  docHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: C.white,
    borderBottomWidth: 1, borderColor: C.border,
  },
  backBtn: {
    width: 30, height: 36, justifyContent: 'center', alignItems: 'center',
    marginRight: -2,
  },
  backTxt: { fontSize: 30, color: C.orange, fontWeight: '400', lineHeight: 32 },
  docAvatarWrap: { position: 'relative' },
  docAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.orange,
    justifyContent: 'center', alignItems: 'center',
  },
  docAvatarOff: { backgroundColor: C.textMuted },
  docAvatarTxt: { color: C.white, fontSize: 16, fontWeight: '800' },
  presence: {
    position: 'absolute', right: -1, bottom: -1,
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: C.white,
  },
  docName: { fontSize: 14, fontWeight: '800', color: C.text },
  docStatus: { fontSize: 11, color: C.textSub, marginTop: 1, fontWeight: '500' },
  liveTag: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  liveTagTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  offlineBanner: {
    backgroundColor: C.orangeLight,
    borderBottomWidth: 1, borderColor: C.border,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  offlineTxt: { fontSize: 11, color: C.textSub, lineHeight: 16 },

  body: { flex: 1, paddingHorizontal: 16, backgroundColor: C.bg },

  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 30 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: C.textSub, marginBottom: 6, textAlign: 'center' },
  emptySub: { fontSize: 12, color: C.textMuted, textAlign: 'center', lineHeight: 18 },

  rowDoc:  { flexDirection: 'row', marginBottom: 16, maxWidth: '88%', alignSelf: 'flex-start' },
  rowUser: { flexDirection: 'row-reverse', marginBottom: 16, maxWidth: '88%', alignSelf: 'flex-end' },

  miniAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.orange,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 8, marginTop: 2, flexShrink: 0,
  },
  miniAvatarTxt: { color: C.white, fontSize: 12, fontWeight: '800' },
  msgCol: { flexShrink: 1 },

  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  bubbleDoc: {
    backgroundColor: C.white,
    borderWidth: 1, borderColor: C.border,
    borderTopLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: C.orange,
    borderTopRightRadius: 4,
  },
  txtDoc:  { color: C.text, fontSize: 14, lineHeight: 22 },
  txtUser: { color: C.white, fontSize: 14, lineHeight: 22 },

  msgImage: { width: 200, height: 200, borderRadius: 12, resizeMode: 'cover' },

  typingDots: { flexDirection: 'row', gap: 5, paddingHorizontal: 2, paddingVertical: 4 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.orangeMid },

  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16, paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    marginBottom: Platform.OS === 'android' ? 8 : 0,
    backgroundColor: C.white,
    borderTopWidth: 1, borderColor: C.border,
    alignItems: 'flex-end', gap: 8,
  },
  input: {
    flex: 1, backgroundColor: C.orangeLight,
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, color: C.text, maxHeight: 100,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.orange,
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: C.orangeMid },
  sendArrow: { color: C.white, fontSize: 13, fontWeight: '700' },

  cameraBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.orangeLight,
    borderWidth: 1.5, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center',
  },
  cameraBtnIcon: { width: 22, height: 22, resizeMode: 'contain' },
});
