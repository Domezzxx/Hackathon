import React, { useState, useRef } from 'react';
import {
  StyleSheet, Text, View, Platform, SafeAreaView, StatusBar,
  KeyboardAvoidingView, Modal, TouchableOpacity
} from 'react-native';
import ChatScreen from './ChatScreen';
import DoctorTab from './DoctorTab';
import QueueScreen from './QueueScreen';
import AdminScreen from './AdminScreen';
import { DOCTORS, doctorWelcome } from './constants';

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

// helper: สร้าง state map { [doctorId]: value } จากทีมหมอ
const byDoctor = (fn) => DOCTORS.reduce((acc, d) => { acc[d.id] = fn(d); return acc; }, {});
const sumMap   = (m) => Object.values(m).reduce((a, b) => a + b, 0);

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [adminOpen, setAdminOpen] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [preSelectedDoctorId, setPreSelectedDoctorId] = useState(null);
  const chatRef = useRef();

  // ── ระบบ "คุยกับหมอ" — ทีมทันตแพทย์หลายคน แต่ละคนมี thread + สถานะออนไลน์แยกกัน ──
  // (shared state ใน App.js: คนไข้เลือกหมอ → ส่งข้อความ → หมอตอบจากหน้า Admin → เด้งกลับเข้าแชต)
  const [doctors, setDoctors] = useState(() => DOCTORS.map(d => ({ ...d })));
  const [chats, setChats] = useState(() => byDoctor(d =>
    d.online
      ? [{ id: d.id + '-w', sender: 'doctor', content: doctorWelcome(d), createdAt: new Date().toISOString() }]
      : []
  ));
  const [patientUnread, setPatientUnread] = useState(() => byDoctor(d => d.online ? 1 : 0)); // หมอออนไลน์ทักทายไว้ 1 ข้อความ
  const [doctorUnread, setDoctorUnread]   = useState(() => byDoctor(() => 0));
  const [doctorTyping, setDoctorTyping]   = useState(() => byDoctor(() => false)); // หมอกำลังพิมพ์ (คนไข้เห็น)
  const [patientTyping, setPatientTyping] = useState(() => byDoctor(() => false)); // คนไข้กำลังพิมพ์ (หมอเห็น)

  const pendingCount       = bookings.filter(b => b.status === 'pending').length;
  const totalPatientUnread = sumMap(patientUnread); // badge บนแท็บ "คุยกับหมอ"
  const totalDoctorUnread  = sumMap(doctorUnread);
  const adminAttention     = pendingCount + totalDoctorUnread; // badge รวมบนปุ่ม Admin

  // helper อัปเดต map state
  const setMapVal = (setter, id, val)   => setter(m => ({ ...m, [id]: val }));
  const bumpMap   = (setter, id, delta) => setter(m => ({ ...m, [id]: Math.max(0, (m[id] || 0) + delta) }));

  const handleBookDoctor = (doctorId) => {
    setPreSelectedDoctorId(doctorId);
    setActiveTab('booking');
  };

  const handleBookingSuccess = ({ ref, name, phone, service, dateLabel, time, note, bookingFor, relationship, bookerName, bookerPhone, doctorName, doctorId }) => {
    setBookings(prev => [{
      ref, name, phone, service, dateLabel, time,
      note: note || '',
      bookingFor: bookingFor || 'self',
      relationship: relationship || '',
      bookerName: bookerName || name,
      bookerPhone: bookerPhone || phone,
      doctorName: doctorName || 'ไม่ระบุแพทย์',
      doctorId: doctorId || null,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }, ...prev]);

    setPreSelectedDoctorId(null); // ล้างค่าหลังจองสำเร็จ
    setActiveTab('chat');

    const patientLine = bookingFor === 'other'
      ? `ผู้ป่วย: ${name} (${relationship})\nจองโดย: ${bookerName}\nโทร: ${phone}`
      : `ชื่อ: ${name}\nโทร: ${phone}`;

    setTimeout(() => {
      chatRef.current?.appendBotMessage({
        role: 'bot',
        content: `จองคิวสำเร็จแล้วครับ\n\nหมายเลขนัดหมาย: ${ref}\n${patientLine}\nบริการ: ${service}\nทันตแพทย์: ${doctorName || 'ไม่ระบุแพทย์'}\nวันที่: ${dateLabel}\nเวลา: ${time} น.\n\nกรุณามาก่อนเวลานัด 10 นาทีครับ`,
        qrs: ['จองคิวใหม่', 'ปรึกษาอาการ', 'ราคาบริการ']
      });
    }, 1200);
  };

  const handleUpdateStatus = (ref, status, cancelReason) => {
    setBookings(prev => {
      const booking = prev.find(b => b.ref === ref);
      const updated = prev.map(b =>
        b.ref === ref ? { ...b, status, ...(cancelReason ? { cancelReason, cancelledBy: 'admin' } : {}) } : b
      );

      if (status === 'cancelled' && cancelReason && booking) {
        setNotifications(n => [{
          ref,
          name: booking.name,
          service: booking.service,
          dateLabel: booking.dateLabel,
          time: booking.time,
          cancelReason,
          cancelledBy: 'admin',
          createdAt: new Date().toISOString(),
          read: false,
        }, ...n]);

        setTimeout(() => {
          chatRef.current?.appendBotMessage({
            role: 'bot',
            content: `แจ้งเตือน: นัดหมายของคุณถูกยกเลิกโดยเจ้าหน้าที่ครับ\n\nหมายเลขนัดหมาย: ${ref}\nชื่อ: ${booking.name}\nบริการ: ${booking.service}\nวันที่: ${booking.dateLabel}\nเวลา: ${booking.time} น.\nเหตุผล: ${cancelReason}\n\nขออภัยในความไม่สะดวกครับ หากต้องการนัดหมายใหม่สามารถจองได้เลย`,
            qrs: ['จองคิวใหม่', 'ปรึกษาอาการ']
          });
        }, 600);
      }

      return updated;
    });
  };

  const handleUserCancel = ({ ref, name, phone, service, dateLabel, time }) => {
    const cancelReason = 'ลูกค้ายกเลิกเอง';
    setBookings(prev => prev.map(b =>
      b.ref === ref ? { ...b, status: 'cancelled', cancelReason, cancelledBy: 'user' } : b
    ));
    setNotifications(prev => [{
      ref,
      name,
      service,
      dateLabel,
      time,
      cancelReason,
      cancelledBy: 'user',
      createdAt: new Date().toISOString(),
      read: false,
    }, ...prev]);
    setTimeout(() => {
      chatRef.current?.appendBotMessage({
        role: 'bot',
        content: `ยกเลิกนัดหมายเรียบร้อยแล้วครับ\n\nหมายเลขนัดหมาย: ${ref}\nบริการ: ${service}\nวันที่: ${dateLabel}\nเวลา: ${time} น.\n\nหากต้องการนัดหมายใหม่ สามารถจองได้ที่หน้าจองคิวครับ`,
        qrs: ['จองคิวใหม่', 'ปรึกษาอาการ']
      });
    }, 800);
  };

  // คนไข้ส่งข้อความ/รูปถึงหมอคนที่เลือก → เพิ่มเข้า thread ของหมอคนนั้น + หมอเห็น badge
  const handlePatientSendToDoctor = (doctorId, { content, imageUri }) => {
    setChats(prev => ({
      ...prev,
      [doctorId]: [...(prev[doctorId] || []), {
        id: 'p' + Date.now(), sender: 'patient', content: content || '', imageUri,
        createdAt: new Date().toISOString(),
      }],
    }));
    bumpMap(setDoctorUnread, doctorId, 1);
  };

  // หมอ (หน้า Admin) ตอบกลับในนามหมอคนนั้น → คนไข้เห็น badge บนแท็บ + ข้อความเด้งเข้าแชต
  const handleDoctorReply = (doctorId, content) => {
    const text = (content || '').trim();
    if (!text) return;
    setChats(prev => ({
      ...prev,
      [doctorId]: [...(prev[doctorId] || []), {
        id: 'd' + Date.now(), sender: 'doctor', content: text,
        createdAt: new Date().toISOString(),
      }],
    }));
    bumpMap(setPatientUnread, doctorId, 1);
  };

  const toggleDoctorOnline = (doctorId) =>
    setDoctors(prev => prev.map(d => d.id === doctorId ? { ...d, online: !d.online } : d));

  const TABS = [
    { key: 'chat',    label: 'สนทนา AI' },
    { key: 'doctor',  label: 'คุยกับหมอ', badge: totalPatientUnread },
    { key: 'booking', label: 'จองคิว' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topbar}>
        <View style={styles.topbarLeft}>
          {/* SUT Logo mark */}
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkTxt}>SUT</Text>
          </View>
          <View>
            <Text style={styles.topbarTitle}>DentBot</Text>
            <Text style={styles.topbarSub}>คลินิกทันตกรรม มทส.</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.adminBtn} onPress={() => setAdminOpen(true)}>
          <View style={styles.adminBtnInner}>
            <Text style={styles.adminBtnLabel}>Admin</Text>
          </View>
          {adminAttention > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeTxt}>{adminAttention}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <View style={styles.tabLabelRow}>
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {tab.badge > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeTxt}>{tab.badge}</Text>
                </View>
              )}
            </View>
            {activeTab === tab.key && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0}
      >
        <View style={[styles.tabContent, activeTab === 'chat' && styles.tabContentVisible]}>
          <ChatScreen
            ref={chatRef}
            onGoToBooking={() => setActiveTab('booking')}
            onGoToDoctor={() => setActiveTab('doctor')}
          />
        </View>
        <View style={[styles.tabContent, activeTab === 'doctor' && styles.tabContentVisible]}>
          <DoctorTab
            doctors={doctors}
            chats={chats}
            unread={patientUnread}
            typing={doctorTyping}
            onSend={handlePatientSendToDoctor}
            onTyping={(id, v) => setMapVal(setPatientTyping, id, v)}
            onSeen={(id) => setMapVal(setPatientUnread, id, 0)}
            isActive={activeTab === 'doctor'}
            onBookDoctor={handleBookDoctor}
          />
        </View>
        <View style={[styles.tabContent, activeTab === 'booking' && styles.tabContentVisible]}>
          <QueueScreen
            doctors={doctors}
            preSelectedDoctorId={preSelectedDoctorId}
            onBookingSuccess={handleBookingSuccess}
            onUserCancel={handleUserCancel}
            notifications={notifications}
            onClearNotification={(ref) => setNotifications(prev => prev.filter(n => n.ref !== ref))}
          />
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={adminOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setAdminOpen(false)}
      >
        <SafeAreaView style={styles.adminModal}>
          <View style={styles.adminHeader}>
            <View>
              <Text style={styles.adminHeaderTitle}>จัดการนัดหมาย</Text>
              <Text style={styles.adminHeaderSub}>Admin Dashboard · คลินิกทันตกรรม มทส.</Text>
            </View>
            <TouchableOpacity style={styles.adminCloseBtn} onPress={() => setAdminOpen(false)}>
              <Text style={styles.adminCloseTxt}>ปิด</Text>
            </TouchableOpacity>
          </View>
          <AdminScreen
            bookings={bookings}
            onUpdateStatus={handleUpdateStatus}
            doctors={doctors}
            chats={chats}
            doctorUnread={doctorUnread}
            patientTyping={patientTyping}
            onDoctorSend={handleDoctorReply}
            onToggleDoctorOnline={toggleDoctorOnline}
            onDoctorTyping={(id, v) => setMapVal(setDoctorTyping, id, v)}
            onSeenDoctor={(id) => setMapVal(setDoctorUnread, id, 0)}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F4',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  topbar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: C.white,
    borderBottomWidth: 1, borderColor: C.border,
  },
  topbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: C.orange,
    justifyContent: 'center', alignItems: 'center',
  },
  logoMarkTxt: { color: C.white, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  topbarTitle: { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  topbarSub: { fontSize: 11, color: C.textSub, marginTop: 1, fontWeight: '500' },

  adminBtn: { position: 'relative' },
  adminBtnInner: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5, borderColor: C.orange,
    backgroundColor: C.orangeLight,
  },
  adminBtnLabel: { fontSize: 12, fontWeight: '700', color: C.orange, letterSpacing: 0.3 },
  badge: {
    position: 'absolute', top: -5, right: -5,
    backgroundColor: '#E05252',
    borderRadius: 9, minWidth: 18, height: 18,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2, borderColor: C.white,
  },
  badgeTxt: { color: C.white, fontSize: 9, fontWeight: '700' },

  tabBar: {
    flexDirection: 'row', backgroundColor: C.white,
    borderBottomWidth: 1, borderColor: C.border,
  },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center', position: 'relative' },
  tabText: { fontSize: 13, color: C.textMuted, fontWeight: '500' },
  tabTextActive: { color: C.orange, fontWeight: '700' },
  tabIndicator: {
    position: 'absolute', bottom: 0, left: '25%', right: '25%',
    height: 2.5, backgroundColor: C.orange, borderRadius: 2,
  },
  tabLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tabBadge: {
    minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4,
    backgroundColor: '#E05252',
    justifyContent: 'center', alignItems: 'center',
  },
  tabBadgeTxt: { color: C.white, fontSize: 9, fontWeight: '800' },

  content: { flex: 1 },

  adminModal: {
    flex: 1, backgroundColor: '#FFF8F4',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  adminHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: C.orange,
  },
  adminHeaderTitle: { fontSize: 18, fontWeight: '700', color: C.white, letterSpacing: -0.3 },
  adminHeaderSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2, letterSpacing: 0.3 },
  adminCloseBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  adminCloseTxt: { color: C.white, fontSize: 12, fontWeight: '600' },

  tabContent:        { flex: 1, display: 'none' },
  tabContentVisible: { display: 'flex' },
});
