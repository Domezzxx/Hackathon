import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  ScrollView, Platform, Image, Alert, ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { API_KEY } from './constants';

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
};

const INITIAL_MESSAGES = [
  {
    role: 'bot',
    content: `สวัสดีครับ ผม DentBot ผู้ช่วยทันตกรรมประจำคลินิกมหาวิทยาลัยเทคโนโลยีสุรนารี\n\nผมช่วยคุณได้ตั้งแต่การปรึกษาอาการ วิเคราะห์ปัญหาฟัน แนะนำการรักษา ไปจนถึงการจองนัดหมายกับทันตแพทย์ครับ\n\nวันนี้มีเรื่องอะไรให้ช่วยไหมครับ?`,
    qrs: ['บริการของเรา', 'จองคิว', 'คุยกับหมอ']
  }
];

const ChatScreen = forwardRef(function ChatScreen({ onGoToBooking, onGoToDoctor }, ref) {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping]     = useState(false);
  const [messages, setMessages]     = useState(INITIAL_MESSAGES);
  const scrollViewRef               = useRef();

  useImperativeHandle(ref, () => ({
    appendBotMessage: (msg) => setMessages(prev => [...prev, msg]),
  }));

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, isTyping]);

  const handleSendMsg = async (textOverride) => {
    const text = typeof textOverride === 'string' ? textOverride : inputValue.trim();
    if (!text) return;

    setInputValue('');
    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);

    if (['จองคิว', 'จองคิวใหม่'].includes(text)) {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, {
          role: 'bot',
          content: 'ต้องการจองนัดหมายกับทันตแพทย์ใช่ไหมครับ?\n\nกดปุ่มด้านล่างเพื่อไปยังหน้าจองคิวได้เลยครับ',
          qrs: ['เปิดหน้าจองคิว', 'ปรึกษาอาการก่อน', 'ราคาบริการ']
        }]);
      }, 500);
      return;
    }

    if (text === 'เปิดหน้าจองคิว') {
      onGoToBooking();
      return;
    }

    if (text === 'คุยกับหมอ' || text === 'คุยกับทันตแพทย์') {
      onGoToDoctor?.();
      return;
    }

    if (text === 'บริการของเรา' || text === 'ราคาบริการ') {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, {
          role: 'bot',
          content: 'ราคาบริการของเราครับ\n\nตรวจฟันทั่วไป   300 – 500 บาท\nอุดฟัน   500 – 1,500 บาท\nขูดหินปูน   600 – 1,000 บาท\nถอนฟัน   300 – 2,000 บาท\nฟอกฟันขาว   3,500 – 8,000 บาท\nจัดฟัน   35,000 บาทขึ้นไป',
          qrs: ['เปิดหน้าจองคิว', 'ปรึกษาอาการ']
        }]);
      }, 500);
      return;
    }

    setIsTyping(true);
    try {
      const history = newMessages.map(m => ({
        role: m.role === 'bot' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: "คุณคือ DentBot ผู้ช่วยทันตกรรมคลินิก มทส.\nตอบเป็นภาษาไทย สุภาพ กระชับ ไม่ใช้มาร์กดาวน์ ไม่ใช้อีโมจิ\n\nราคาบริการของคลินิก:\n- ตรวจฟันทั่วไป: 300–500 บาท\n- อุดฟัน: 500–1,500 บาท\n- ขูดหินปูน: 600–1,000 บาท\n- ถอนฟัน: 300–2,000 บาท\n- ฟอกฟันขาว: 3,500–8,000 บาท\n- จัดฟัน: 35,000 บาทขึ้นไป\n\nกฎการตอบ:\n- ตอบสั้น ตรงประเด็น ไม่เกิน 3–4 ประโยคต่อข้อความ\n- ไม่ขึ้นต้นด้วย \"ขอบคุณ\" หรือ \"ยินดีให้บริการ\"\n- ไม่จบด้วย \"หากมีคำถามเพิ่มเติม...\"\n- ใช้คำว่า \"ครับ\" ไม่เกิน 1 ครั้งต่อข้อความ\n- ให้ข้อมูลเป็นตัวเลขและข้อเท็จจริงเฉพาะเจาะจง\n\nกฎเรื่องราคา:\n- ถ้าถามราคาทั่วไปหรือ \"ราคาบริการ\" ให้แสดงราคาทุกรายการ\n- ถ้าถามราคาเฉพาะบริการใดบริการหนึ่ง ให้ตอบแค่รายการนั้น\n- ถ้าบอกอาการแล้วถามราคา ให้ตอบเฉพาะบริการที่เกี่ยวข้องกับอาการนั้น\n\nกฎเมื่อผู้ใช้แจ้งอาการ (ปวดฟัน เสียวฟัน เหงือกบวม ฯลฯ):\n- ระบุสาเหตุที่เป็นไปได้ 2–3 ข้อ เป็นชื่อโรค/ภาวะที่เฉพาะเจาะจง\n- ถามอาการเพิ่มเติม 1 ข้อ เพื่อแยกแยะสาเหตุ\n- ห้ามด่วนแนะนำให้จองคิวทันทีโดยไม่ถามอาการก่อน" }]
            },
            contents: history,
            generationConfig: { temperature: 0.7 }
          })
        }
      );

      const data = await response.json();
      let botText = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'ขออภัยครับ ระบบขัดข้องชั่วคราว';
      botText = botText.replace(/\*\*(.*?)\*\*/g, '$1');

      const shouldSuggestBooking = ['จองคิว', 'นัดหมาย', 'พบแพทย์', 'ทันตแพทย์'].some(k => botText.includes(k));
      setMessages(prev => [...prev, {
        role: 'bot', content: botText,
        qrs: shouldSuggestBooking ? ['เปิดหน้าจองคิว', 'คุยกับหมอ'] : ['คุยกับหมอ']
      }]);
    } catch {
      setMessages(prev => [...prev, { role: 'bot', content: 'เกิดข้อผิดพลาดในการเชื่อมต่อครับ' }]);
    }
    setIsTyping(false);
  };

  const handleScanMouth = () => {
    Alert.alert(
      'วิเคราะห์ฟัน',
      'เลือกรูปภาพจาก',
      [
        { text: 'ถ่ายรูป', onPress: () => pickImage('camera') },
        { text: 'คลังภาพ', onPress: () => pickImage('gallery') },
        { text: 'ยกเลิก', style: 'cancel' },
      ]
    );
  };

  const pickImage = async (source) => {
    let result;

    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('ไม่สามารถเข้าถึงกล้องได้', 'กรุณาอนุญาตการใช้กล้องในการตั้งค่าของอุปกรณ์');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        base64: true,
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('ไม่สามารถเข้าถึงคลังภาพได้', 'กรุณาอนุญาตการเข้าถึงคลังภาพในการตั้งค่าของอุปกรณ์');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        base64: true,
      });
    }

    if (result.canceled || !result.assets?.[0]) return;

    const { base64, uri } = result.assets[0];

    // แสดงรูปที่ผู้ใช้ถ่ายในแชท
    setMessages(prev => [...prev, {
      role: 'user',
      content: '',
      imageUri: uri,
    }]);

    setIsTyping(true);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: "คุณคือ DentBot ผู้ช่วยทันตกรรมคลินิก มทส.\nตอบเป็นภาษาไทย สุภาพ กระชับ ไม่ใช้มาร์กดาวน์ ไม่ใช้อีโมจิ\n\nคุณได้รับภาพถ่ายในช่องปากหรือฟัน ให้วิเคราะห์และ:\n- บอกสิ่งที่สังเกตเห็นในภาพ (สีฟัน รอยดำ เหงือก หินปูน ฯลฯ)\n- ระบุอาการหรือภาวะที่น่าสงสัย 1–3 ข้อ\n- แนะนำแนวทางรักษาเบื้องต้น\n- ถ้าภาพไม่ชัดหรือไม่ใช่ภาพในช่องปาก ให้บอกผู้ใช้สุภาพๆ\nตอบไม่เกิน 5 บรรทัด ใช้คำว่า 'ครับ' ไม่เกิน 1 ครั้ง" }]
            },
            contents: [{
              role: 'user',
              parts: [
                { inline_data: { mime_type: 'image/jpeg', data: base64 } },
                { text: 'ช่วยวิเคราะห์ภาพช่องปากหรือฟันนี้ให้หน่อยครับ' }
              ]
            }]
          })
        }
      );

      const data = await response.json();
      let botText = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'ขออภัยครับ ไม่สามารถวิเคราะห์ภาพได้ในขณะนี้';
      botText = botText.replace(/\*\*(.*?)\*\*/g, '$1');

      setMessages(prev => [...prev, {
        role: 'bot',
        content: botText,
        qrs: ['เปิดหน้าจองคิว', 'คุยกับหมอ']
      }]);
    } catch {
      setMessages(prev => [...prev, { role: 'bot', content: 'เกิดข้อผิดพลาดในการวิเคราะห์ภาพครับ' }]);
    }
    setIsTyping(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.body} 
        ref={scrollViewRef} 
        contentContainerStyle={{ paddingVertical: 20, flexGrow: 1, justifyContent: 'flex-end' }}
      >
        {messages.map((msg, idx) => (
          <View key={idx} style={msg.role === 'user' ? styles.rowUser : styles.rowBot}>
            {msg.role === 'bot' && (
              <View style={styles.avatar}>
                <Text style={styles.avatarTxt}>D</Text>
              </View>
            )}
            <View style={styles.msgContent}>
              <View style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
                {msg.imageUri ? (
                  <Image source={{ uri: msg.imageUri }} style={styles.msgImage} />
                ) : (
                  <Text style={msg.role === 'user' ? styles.txtUser : styles.txtBot}>{msg.content}</Text>
                )}
              </View>
              {msg.qrs?.length > 0 && (
                <View style={styles.qrWrap}>
                  {msg.qrs.map((qr, i) => (
                    <TouchableOpacity key={i} style={styles.qrChip}
                      onPress={() => handleSendMsg(qr.replace(/[^\w\sก-๙]/g, '').trim())}>
                      <Text style={styles.qrChipTxt}>{qr}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        ))}

        {isTyping && (
          <View style={styles.rowBot}>
            <View style={styles.avatar}><Text style={styles.avatarTxt}>D</Text></View>
            <View style={[styles.bubble, styles.bubbleBot]}>
              <View style={styles.typingDots}>
                <View style={[styles.dot]} />
                <View style={[styles.dot]} />
                <View style={[styles.dot]} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cameraBtn} onPress={handleScanMouth}>
          <Image source={require('./assets/c.png')} style={styles.cameraBtnIcon} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="พิมพ์ข้อความ..."
          placeholderTextColor="#C49070"
          value={inputValue}
          onChangeText={setInputValue}
          onSubmitEditing={() => handleSendMsg()}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputValue.trim() && styles.sendBtnDisabled]}
          onPress={() => handleSendMsg()}
          disabled={!inputValue.trim()}
        >
          <Text style={styles.sendArrow}>ส่ง</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default ChatScreen;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: C.bg 
  },
  body: { 
    flex: 1, 
    paddingHorizontal: 16, 
    backgroundColor: C.bg 
  },

  rowBot:  { flexDirection: 'row', marginBottom: 16, maxWidth: '88%', alignSelf: 'flex-start' },
  rowUser: { flexDirection: 'row-reverse', marginBottom: 16, maxWidth: '88%', alignSelf: 'flex-end' },

  avatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.orange,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 8, marginTop: 2, flexShrink: 0,
  },
  avatarTxt: { color: C.white, fontSize: 11, fontWeight: '800' },

  msgContent: { flexShrink: 1 },

  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  bubbleBot: {
    backgroundColor: C.white,
    borderWidth: 1, borderColor: C.border,
    borderTopLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: C.orange,
    borderTopRightRadius: 4,
  },
  txtBot:  { color: C.text, fontSize: 14, lineHeight: 22 },
  txtUser: { color: C.white, fontSize: 14, lineHeight: 22 },

  qrWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 6 },
  qrChip: {
    borderWidth: 1.5, borderColor: C.orange,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: C.white,
  },
  qrChipTxt: { color: C.orange, fontSize: 12, fontWeight: '600' },

  typingDots: { flexDirection: 'row', gap: 5, paddingHorizontal: 2, paddingVertical: 4 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.orangeMid },

  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16, 
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    marginBottom: 0, 
    backgroundColor: C.white,
    borderTopWidth: 1, 
    borderColor: C.border,
    alignItems: 'center', 
    gap: 8,
  },
  input: {
    flex: 1, 
    backgroundColor: C.orangeLight,
    borderWidth: 1.5, 
    borderColor: C.border,
    borderRadius: 22, 
    paddingHorizontal: 16, 
    minHeight: 40,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8, 
    fontSize: 14, 
    color: C.text,
    maxHeight: 100,
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

  msgImage: {
    width: 200, height: 200, borderRadius: 12,
    resizeMode: 'cover',
  },
});
