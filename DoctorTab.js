import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView
} from 'react-native';
import DoctorChatScreen from './DoctorChatScreen';

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
 * แท็บ "คุยกับหมอ" (ฝั่งคนไข้)
 * - ยังไม่เลือกหมอ → แสดงรายชื่อทีมทันตแพทย์ (สถานะออนไลน์/ออฟไลน์ + unread + ข้อความล่าสุด)
 * - เลือกหมอแล้ว → เปิดหน้าแชตกับหมอคนนั้น (DoctorChatScreen)
 */
export default function DoctorTab({
  doctors = [], chats = {}, unread = {}, typing = {},
  onSend, onTyping, onSeen, isActive = false,
  onBookDoctor,
}) {
  const [selectedId, setSelectedId] = useState(null);
  const selectedDoctor = doctors.find(d => d.id === selectedId);

  // ── หน้าแชตรายคน ──
  if (selectedDoctor) {
    return (
      <DoctorChatScreen
        doctor={selectedDoctor}
        messages={chats[selectedId] || []}
        doctorTyping={!!typing[selectedId]}
        onSend={(payload) => onSend?.(selectedId, payload)}
        onTyping={(v) => onTyping?.(selectedId, v)}
        onBack={() => setSelectedId(null)}
        onSeen={() => onSeen?.(selectedId)}
        isActive={isActive}
      />
    );
  }

  // ── หน้ารายชื่อหมอ (ออนไลน์ก่อน) ──
  const sorted = [...doctors].sort((a, b) => (b.online ? 1 : 0) - (a.online ? 1 : 0));
  const onlineCount = doctors.filter(d => d.online).length;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.headTitle}>เลือกทันตแพทย์</Text>
        <Text style={styles.headSub}>ออนไลน์ {onlineCount} จาก {doctors.length} คน · แตะเพื่อเริ่มปรึกษา</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {sorted.map(d => {
          const msgs = chats[d.id] || [];
          const last = msgs[msgs.length - 1];
          const preview = last ? (last.imageUri ? '📷 รูปภาพ' : last.content) : 'เริ่มต้นการปรึกษา';
          const u = unread[d.id] || 0;
          return (
            <View key={d.id} style={styles.card}>
              <TouchableOpacity
                style={styles.cardTopRow}
                activeOpacity={0.75}
                onPress={() => setSelectedId(d.id)}
              >
                <View style={styles.avatarWrap}>
                  <View style={[styles.avatar, !d.online && styles.avatarOff]}>
                    <Text style={styles.avatarTxt}>{d.initial}</Text>
                  </View>
                  <View style={[styles.presence, { backgroundColor: d.online ? C.green : C.textMuted }]} />
                </View>

                <View style={styles.info}>
                  <View style={styles.cardTop}>
                    <Text style={styles.name} numberOfLines={1}>{d.name}</Text>
                    {u > 0 && <View style={styles.badge}><Text style={styles.badgeTxt}>{u}</Text></View>}
                  </View>
                  <Text style={styles.title} numberOfLines={1}>{d.title}</Text>
                  <Text style={[styles.preview, u > 0 && styles.previewUnread]} numberOfLines={1}>{preview}</Text>
                </View>

                <View style={styles.statusCol}>
                  <View style={[styles.statusPill, { backgroundColor: d.online ? '#D1FAE5' : C.orangeLight }]}>
                    <Text style={[styles.statusPillTxt, { color: d.online ? '#065F46' : C.textSub }]}>
                      {d.online ? 'ออนไลน์' : 'ออฟไลน์'}
                    </Text>
                  </View>
                  {!d.online && !!d.awayUntil && <Text style={styles.away} numberOfLines={1}>{d.awayUntil}</Text>}
                </View>
              </TouchableOpacity>

              <View style={styles.divider} />

              <View style={styles.cardBottomRow}>
                <View style={styles.scheduleCol}>
                  <Text style={styles.scheduleLabel}>📅 วันเข้าเวร: {d.dutyDaysLabel}</Text>
                  <View style={styles.weekRow}>
                    {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((dayName, idx) => {
                      const isOnDuty = d.dutyDays?.includes(idx);
                      return (
                        <View
                          key={dayName}
                          style={[
                            styles.dayDot,
                            isOnDuty ? styles.dayDotOn : styles.dayDotOff
                          ]}
                        >
                          <Text style={[styles.dayDotTxt, isOnDuty ? styles.dayDotTxtOn : styles.dayDotTxtOff]}>
                            {dayName}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.bookBtn}
                  activeOpacity={0.8}
                  onPress={() => onBookDoctor?.(d.id)}
                >
                  <Text style={styles.bookBtnTxt}>📅 จองคิว</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },

  head: {
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: C.white,
    borderBottomWidth: 1, borderColor: C.border,
  },
  headTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  headSub: { fontSize: 11, color: C.textSub, marginTop: 2, fontWeight: '500' },

  card: {
    backgroundColor: C.white,
    borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#FFF0E6',
    marginVertical: 12,
  },
  cardBottomRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
  },
  scheduleCol: {
    flex: 1,
  },
  scheduleLabel: {
    fontSize: 10, color: C.textSub, fontWeight: '700', marginBottom: 6,
  },
  weekRow: {
    flexDirection: 'row', gap: 4,
  },
  dayDot: {
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
  },
  dayDotOn: {
    backgroundColor: C.orange,
  },
  dayDotOff: {
    backgroundColor: '#F3F4F6',
  },
  dayDotTxt: {
    fontSize: 9, fontWeight: '700',
  },
  dayDotTxtOn: {
    color: C.white,
  },
  dayDotTxtOff: {
    color: C.textMuted,
  },
  bookBtn: {
    backgroundColor: C.orangeLight,
    borderWidth: 1, borderColor: C.orange,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  bookBtnTxt: {
    fontSize: 11, fontWeight: '700', color: C.orangeDark,
  },

  avatarWrap: { position: 'relative' },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.orange,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarOff: { backgroundColor: C.textMuted },
  avatarTxt: { color: C.white, fontSize: 18, fontWeight: '800' },
  presence: {
    position: 'absolute', right: -1, bottom: -1,
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2.5, borderColor: C.white,
  },

  info: { flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 14, fontWeight: '800', color: C.text, flexShrink: 1 },
  badge: {
    minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5,
    backgroundColor: '#E05252', justifyContent: 'center', alignItems: 'center',
  },
  badgeTxt: { color: C.white, fontSize: 10, fontWeight: '800' },
  title: { fontSize: 11, color: C.orangeDark, marginTop: 1, fontWeight: '600' },
  preview: { fontSize: 12, color: C.textMuted, marginTop: 3 },
  previewUnread: { color: C.text, fontWeight: '600' },

  statusCol: { alignItems: 'flex-end', gap: 4 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusPillTxt: { fontSize: 10, fontWeight: '800' },
  away: { fontSize: 9, color: C.textMuted, maxWidth: 90, textAlign: 'right' },
});
