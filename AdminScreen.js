import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  ScrollView, TextInput, Modal, Image, Platform
} from 'react-native';
import { SERVICES } from './constants';

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

const STATUS_CONFIG = {
  pending:   { label: 'รอยืนยัน',   color: '#92400E', bg: '#FEF3C7', bar: '#F59E0B' },
  confirmed: { label: 'ยืนยันแล้ว', color: '#065F46', bg: '#D1FAE5', bar: '#10B981' },
  completed: { label: 'เสร็จสิ้น',  color: '#1E3A5F', bg: '#DBEAFE', bar: '#3B82F6' },
  cancelled: { label: 'ยกเลิก',     color: '#991B1B', bg: '#FEE2E2', bar: '#EF4444' },
};

const STATUS_LIST = [
  ['all',       'ทั้งหมด'   ],
  ['pending',   'รอยืนยัน'  ],
  ['confirmed', 'ยืนยันแล้ว'],
  ['completed', 'เสร็จสิ้น' ],
  ['cancelled', 'ยกเลิก'   ],
];

export default function AdminScreen({
  bookings = [], onUpdateStatus,
  doctors = [], chats = {}, doctorUnread = {}, patientTyping = {},
  onDoctorSend, onToggleDoctorOnline, onDoctorTyping, onSeenDoctor,
}) {
  const [adminTab, setAdminTab]         = useState('bookings');
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterService, setFilterService] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailOpen, setDetailOpen]     = useState(false);
  const [sortOrder, setSortOrder]       = useState('desc');

  const filtered = bookings
    .filter(b => {
      const q = search.toLowerCase();
      const matchSearch =
        b.name?.toLowerCase().includes(q) ||
        b.ref?.toLowerCase().includes(q) ||
        b.phone?.includes(q);
      const matchStatus  = filterStatus  === 'all' || b.status  === filterStatus;
      const matchService = filterService === 'all' || b.service === filterService;
      return matchSearch && matchStatus && matchService;
    })
    .sort((a, b) => {
      const da = new Date(a.createdAt || 0), db = new Date(b.createdAt || 0);
      return sortOrder === 'desc' ? db - da : da - db;
    });

  const stats = {
    total:     bookings.length,
    pending:   bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    completed: bookings.filter(b => b.status === 'completed').length,
  };

  const handleStatus = (ref, status, cancelReason) => {
    onUpdateStatus?.(ref, status, cancelReason);
    setDetailOpen(false);
  };

  const totalDoctorUnread = Object.values(doctorUnread).reduce((a, b) => a + b, 0);

  return (
    <View style={styles.container}>

      {/* Admin sub-tabs: นัดหมาย / แชตคนไข้ */}
      <View style={styles.segmentRow}>
        <TouchableOpacity
          style={[styles.segmentBtn, adminTab === 'bookings' && styles.segmentBtnActive]}
          onPress={() => setAdminTab('bookings')}
        >
          <Text style={[styles.segmentTxt, adminTab === 'bookings' && styles.segmentTxtActive]}>นัดหมาย</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, adminTab === 'chat' && styles.segmentBtnActive]}
          onPress={() => setAdminTab('chat')}
        >
          <Text style={[styles.segmentTxt, adminTab === 'chat' && styles.segmentTxtActive]}>แชตคนไข้</Text>
          {totalDoctorUnread > 0 && (
            <View style={styles.segBadge}><Text style={styles.segBadgeTxt}>{totalDoctorUnread}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      {adminTab === 'chat' ? (
        <DoctorReplyView
          doctors={doctors}
          chats={chats}
          unread={doctorUnread}
          patientTyping={patientTyping}
          onSend={onDoctorSend}
          onToggleOnline={onToggleDoctorOnline}
          onTyping={onDoctorTyping}
          onSeen={onSeenDoctor}
        />
      ) : (
      <>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'ทั้งหมด',    value: stats.total,     bar: C.orange   },
          { label: 'รอยืนยัน',  value: stats.pending,   bar: '#F59E0B'  },
          { label: 'ยืนยันแล้ว',value: stats.confirmed, bar: '#10B981'  },
          { label: 'เสร็จสิ้น', value: stats.completed, bar: '#3B82F6'  },
        ].map((s, i) => (
          <View key={i} style={styles.statCard}>
            <View style={[styles.statBar, { backgroundColor: s.bar }]} />
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Search + Sort */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="ค้นหาชื่อ, หมายเลข, เบอร์โทร"
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={C.textMuted}
        />
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
        >
          <Text style={styles.sortBtnTxt}>{sortOrder === 'desc' ? '↓ ใหม่สุด' : '↑ เก่าสุด'}</Text>
        </TouchableOpacity>
      </View>

      {/* Status chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
        {STATUS_LIST.map(([val, lbl]) => (
          <TouchableOpacity
            key={val}
            style={[styles.chip, filterStatus === val && styles.chipActive]}
            onPress={() => setFilterStatus(val)}
          >
            <Text style={[styles.chipTxt, filterStatus === val && styles.chipTxtActive]}>
              {lbl}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Service chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
        <TouchableOpacity
          style={[styles.chip, filterService === 'all' && styles.chipActive]}
          onPress={() => setFilterService('all')}
        >
          <Text style={[styles.chipTxt, filterService === 'all' && styles.chipTxtActive]}>บริการทั้งหมด</Text>
        </TouchableOpacity>
        {SERVICES.map(srv => (
          <TouchableOpacity
            key={srv.name}
            style={[styles.chip, filterService === srv.name && styles.chipActive]}
            onPress={() => setFilterService(srv.name)}
          >
            <Text style={[styles.chipTxt, filterService === srv.name && styles.chipTxtActive]}>{srv.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 32 }}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🦷</Text>
            <Text style={styles.emptyTitle}>ไม่พบรายการ</Text>
            <Text style={styles.emptySub}>ลองปรับตัวกรองหรือค้นหาใหม่</Text>
          </View>
        ) : (
          filtered.map(b => (
            <BookingCard key={b.ref} booking={b} onPress={() => {
              setSelectedBooking(b);
              setDetailOpen(true);
            }} />
          ))
        )}
      </ScrollView>

      </>
      )}

      {/* Detail bottom sheet */}
      <Modal visible={detailOpen} animationType="slide" transparent>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetDismiss} onPress={() => setDetailOpen(false)} />
          <View style={styles.sheet}>
            {selectedBooking && (
              <BookingDetail
                booking={selectedBooking}
                onClose={() => setDetailOpen(false)}
                onStatus={handleStatus}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ── BookingCard ─────────────────────────────────── */
function BookingCard({ booking, onPress }) {
  const st = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.cardAccent, { backgroundColor: st.bar }]} />
      <View style={styles.cardInner}>
        <View style={styles.cardTop}>
          <Text style={styles.cardName}>{booking.name}</Text>
          <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
            <Text style={[styles.statusPillTxt, { color: st.color }]}>{st.label}</Text>
          </View>
        </View>
        <Text style={styles.cardService}>{booking.service}</Text>
        <Text style={styles.cardDoctor}>👨‍⚕️ แพทย์: {booking.doctorName || 'ไม่ระบุแพทย์'}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardMetaTxt}>{booking.dateLabel}</Text>
          <Text style={styles.cardMetaDot}>·</Text>
          <Text style={styles.cardMetaTxt}>{booking.time} น.</Text>
          {booking.bookingFor === 'other' && (
            <View style={styles.otherBookingTag}>
              <Text style={styles.otherBookingTagTxt}>จองให้ {booking.relationship || 'คนอื่น'}</Text>
            </View>
          )}
          {booking.status === 'cancelled' && booking.cancelledBy === 'user' && (
            <View style={styles.userCancelTag}>
              <Text style={styles.userCancelTagTxt}>ลูกค้ายกเลิก</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardRef}>{booking.ref}</Text>
      </View>
    </TouchableOpacity>
  );
}

/* ── BookingDetail ───────────────────────────────── */
const CANCEL_REASONS = [
  'ทันตแพทย์ไม่ว่าง',
  'คลินิกปิดทำการ',
  'ผู้ป่วยไม่ติดต่อกลับ',
  'ข้อมูลการจองไม่ครบถ้วน',
  'อื่นๆ',
];

function BookingDetail({ booking, onClose, onStatus }) {
  const st = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const isForOther = booking.bookingFor === 'other';
  const rows = [
    ['หมายเลขนัดหมาย', booking.ref],
    ['บริการ',          booking.service],
    ['ทันตแพทย์',      booking.doctorName || 'ไม่ระบุแพทย์'],
    ['วันที่นัดหมาย',  booking.dateLabel],
    ['เวลา',            `${booking.time} น.`],
    isForOther ? ['ความสัมพันธ์', `${booking.relationship || '-'} (ของผู้จอง)`] : null,
    booking.cancelReason ? ['เหตุผลที่ยกเลิก', booking.cancelReason] : null,
    booking.cancelledBy === 'user' ? ['ยกเลิกโดย', 'ลูกค้า'] : null,
    booking.cancelledBy === 'admin' ? ['ยกเลิกโดย', 'เจ้าหน้าที่'] : null,
  ].filter(Boolean);

  const patient = { name: booking.name, phone: booking.phone, note: booking.note };

  const handleCancelConfirm = () => {
    const finalReason = cancelReason === 'อื่นๆ' ? (customReason.trim() || 'อื่นๆ') : cancelReason;
    if (!finalReason) return;
    onStatus(booking.ref, 'cancelled', finalReason);
    setCancelOpen(false);
  };

  return (
    <>
      <View style={styles.sheetHandle} />

      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>รายละเอียดนัดหมาย</Text>
        <TouchableOpacity onPress={onClose} style={styles.sheetCloseBtn}>
          <Text style={styles.sheetCloseTxt}>ปิด</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.sheetStatusBar, { backgroundColor: st.bg }]}>
        <View style={[styles.sheetStatusDot, { backgroundColor: st.bar }]} />
        <Text style={[styles.sheetStatusTxt, { color: st.color }]}>{st.label}</Text>
      </View>

      <ScrollView style={styles.sheetBody}>
        {rows.map(([label, val], i) => (
          <View key={i} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailVal}>{val}</Text>
          </View>
        ))}

        {/* ── ข้อมูลผู้ป่วย ── */}
        <View style={[styles.detailRow, { borderBottomWidth: 0, paddingBottom: 4 }]}>
          <Text style={[styles.detailLabel, { fontWeight: '700', color: C.textSub }]}>
            ข้อมูลผู้ป่วย
          </Text>
        </View>
        <View style={styles.patientDetailCard}>
          <View style={styles.patientDetailHeader}>
            <View style={[styles.patientDetailBadge, isForOther && { backgroundColor: C.orangeDark }]}>
              <Text style={styles.patientDetailBadgeTxt}>{isForOther ? '♥' : '1'}</Text>
            </View>
            <Text style={styles.patientDetailName}>{patient.name}</Text>
            <Text style={styles.patientDetailPhone}>{patient.phone}</Text>
          </View>
          {isForOther && (
            <Text style={styles.patientDetailRel}>ความสัมพันธ์กับผู้จอง: {booking.relationship || '-'}</Text>
          )}
          {!!patient.note && (
            <Text style={styles.patientDetailNote}>หมายเหตุ: {patient.note}</Text>
          )}
        </View>

        {/* ── ผู้จอง (เฉพาะกรณีจองให้คนอื่น) ── */}
        {isForOther && (
          <>
            <View style={[styles.detailRow, { borderBottomWidth: 0, paddingBottom: 4, paddingTop: 8 }]}>
              <Text style={[styles.detailLabel, { fontWeight: '700', color: C.textSub }]}>
                ผู้จอง
              </Text>
            </View>
            <View style={styles.patientDetailCard}>
              <View style={styles.patientDetailHeader}>
                <View style={[styles.patientDetailBadge, { backgroundColor: C.textSub }]}>
                  <Text style={styles.patientDetailBadgeTxt}>ผ</Text>
                </View>
                <Text style={styles.patientDetailName}>{booking.bookerName || '-'}</Text>
                <Text style={styles.patientDetailPhone}>{booking.bookerPhone || '-'}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Cancel reason dropdown */}
      {cancelOpen && (
        <View style={styles.cancelBox}>
          <Text style={styles.cancelBoxTitle}>เลือกเหตุผลที่ยกเลิก</Text>
          {CANCEL_REASONS.map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.cancelOption, cancelReason === r && styles.cancelOptionActive]}
              onPress={() => { setCancelReason(r); if (r !== 'อื่นๆ') setCustomReason(''); }}
            >
              <View style={[styles.cancelRadio, cancelReason === r && styles.cancelRadioActive]} />
              <Text style={[styles.cancelOptionTxt, cancelReason === r && styles.cancelOptionTxtActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
          {cancelReason === 'อื่นๆ' && (
            <TextInput
              style={styles.customReasonInput}
              placeholder="กรุณาระบุเหตุผล..."
              placeholderTextColor={C.textMuted}
              value={customReason}
              onChangeText={setCustomReason}
              multiline
            />
          )}
          <View style={styles.cancelFooter}>
            <TouchableOpacity style={styles.cancelDismissBtn} onPress={() => { setCancelOpen(false); setCancelReason(''); setCustomReason(''); }}>
              <Text style={styles.cancelDismissTxt}>ยกเลิก</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cancelConfirmBtn, (!cancelReason || (cancelReason === 'อื่นๆ' && !customReason.trim())) && styles.cancelConfirmDisabled]}
              onPress={handleCancelConfirm}
              disabled={!cancelReason || (cancelReason === 'อื่นๆ' && !customReason.trim())}
            >
              <Text style={styles.cancelConfirmTxt}>ยืนยันยกเลิก</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.actionRow}>
        {booking.status !== 'confirmed' && booking.status !== 'cancelled' && (
          <ActionBtn label="ยืนยันนัด" variant="confirm" onPress={() => onStatus(booking.ref, 'confirmed')} />
        )}
        {booking.status !== 'completed' && booking.status !== 'cancelled' && (
          <ActionBtn label="เสร็จสิ้น" variant="complete" onPress={() => onStatus(booking.ref, 'completed')} />
        )}
        {booking.status !== 'cancelled' && (
          <ActionBtn label="ยกเลิก" variant="cancel" onPress={() => setCancelOpen(true)} />
        )}
      </View>
    </>
  );
}

const ACTION_COLORS = {
  confirm:  { bg: C.orange,    text: '#FFF' },
  complete: { bg: '#10B981',   text: '#FFF' },
  cancel:   { bg: '#FFF',      text: '#EF4444', border: '#EF4444' },
};

function ActionBtn({ label, variant, onPress }) {
  const c = ACTION_COLORS[variant];
  return (
    <TouchableOpacity
      style={[styles.actionBtn, { backgroundColor: c.bg, borderColor: c.border || c.bg }]}
      onPress={onPress}
    >
      <Text style={[styles.actionBtnTxt, { color: c.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ── Styles ──────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Stats
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 8 },
  statCard: {
    flex: 1, backgroundColor: C.white,
    borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: C.border,
    overflow: 'hidden',
  },
  statBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  statValue: { fontSize: 22, fontWeight: '800', color: C.text, marginTop: 6 },
  statLabel: { fontSize: 10, color: C.textMuted, marginTop: 2, fontWeight: '500' },

  // Search
  searchRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  searchInput: {
    flex: 1, backgroundColor: C.white,
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9,
    fontSize: 13, color: C.text,
  },
  sortBtn: {
    backgroundColor: C.orange, borderRadius: 10,
    paddingHorizontal: 14, justifyContent: 'center',
  },
  sortBtnTxt: { color: C.white, fontSize: 11, fontWeight: '700' },

  // Chips
  chipScroll: { maxHeight: 40 },
  chipRow: { paddingHorizontal: 16, gap: 6, flexDirection: 'row', alignItems: 'center', paddingBottom: 6 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.white,
  },
  chipActive: { backgroundColor: C.orange, borderColor: C.orange },
  chipTxt: { fontSize: 12, color: C.textSub },
  chipTxtActive: { color: C.white, fontWeight: '700' },

  // List
  list: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },

  // Card
  card: {
    flexDirection: 'row', backgroundColor: C.white,
    borderRadius: 12, marginBottom: 10,
    borderWidth: 1, borderColor: C.border,
    overflow: 'hidden',
  },
  cardAccent: { width: 4 },
  cardInner: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardName: { fontSize: 14, fontWeight: '700', color: C.text, flex: 1, marginRight: 8 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusPillTxt: { fontSize: 11, fontWeight: '700' },
  cardService: { fontSize: 12, color: C.textSub, marginBottom: 4 },
  cardDoctor: { fontSize: 11, color: C.orangeDark, marginBottom: 6, fontWeight: '600' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardMetaTxt: { fontSize: 11, color: C.textMuted },
  cardMetaDot: { fontSize: 11, color: C.border },
  cardRef: { fontSize: 10, color: C.textMuted, marginTop: 6, letterSpacing: 0.5 },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 72 },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: C.textSub },
  emptySub: { fontSize: 12, color: C.textMuted, marginTop: 6 },

  // Sheet
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetDismiss: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '82%', paddingBottom: 34,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: C.border, alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderColor: C.border,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  sheetCloseBtn: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 7, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.orangeLight,
  },
  sheetCloseTxt: { fontSize: 12, color: C.orange, fontWeight: '600' },
  sheetStatusBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10,
  },
  sheetStatusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  sheetStatusTxt: { fontSize: 13, fontWeight: '700' },

  // Detail rows
  sheetBody: { paddingHorizontal: 20, paddingTop: 4 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderColor: '#FFF0E6',
  },
  detailLabel: { fontSize: 13, color: C.textMuted, flex: 1 },
  detailVal: { fontSize: 13, color: C.text, fontWeight: '600', flex: 1.5, textAlign: 'right' },

  // Actions
  actionRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 14, gap: 8, flexWrap: 'wrap' },
  actionBtn: { flex: 1, minWidth: 90, padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1.5 },
  actionBtnTxt: { fontWeight: '700', fontSize: 13 },

  // Cancel dropdown
  cancelBox: {
    marginHorizontal: 16, marginTop: 8,
    backgroundColor: '#FFF5F5', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#FCA5A5',
    padding: 14,
  },
  cancelBoxTitle: { fontSize: 13, fontWeight: '700', color: '#991B1B', marginBottom: 10 },
  cancelOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 9, paddingHorizontal: 10,
    borderRadius: 8, marginBottom: 4,
    backgroundColor: C.white,
    borderWidth: 1.5, borderColor: C.border,
  },
  cancelOptionActive: { borderColor: '#EF4444', backgroundColor: '#FEE2E2' },
  cancelRadio: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, borderColor: C.border,
    marginRight: 10,
  },
  cancelRadioActive: { borderColor: '#EF4444', backgroundColor: '#EF4444' },
  cancelOptionTxt: { fontSize: 13, color: C.text },
  cancelOptionTxtActive: { color: '#991B1B', fontWeight: '600' },
  cancelFooter: { flexDirection: 'row', gap: 8, marginTop: 10 },
  cancelDismissBtn: {
    flex: 1, padding: 10, borderRadius: 8, alignItems: 'center',
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white,
  },
  cancelDismissTxt: { color: C.textSub, fontWeight: '600', fontSize: 13 },
  cancelConfirmBtn: {
    flex: 1, padding: 10, borderRadius: 8, alignItems: 'center',
    backgroundColor: '#EF4444',
  },
  cancelConfirmDisabled: { backgroundColor: '#FCA5A5' },
  cancelConfirmTxt: { color: C.white, fontWeight: '700', fontSize: 13 },

  userCancelTag: {
    marginLeft: 6,
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    borderWidth: 1, borderColor: '#FCA5A5',
  },
  userCancelTagTxt: { fontSize: 10, color: '#991B1B', fontWeight: '700' },

  customReasonInput: {
    marginTop: 8,
    backgroundColor: C.white,
    borderWidth: 1.5, borderColor: '#FCA5A5',
    borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 13, color: C.text,
    minHeight: 60, textAlignVertical: 'top',
  },

  patientDetailCard: {
    backgroundColor: C.orangeLight,
    borderRadius: 10, borderWidth: 1, borderColor: C.border,
    marginBottom: 8, padding: 12,
  },
  patientDetailHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  patientDetailBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: C.orange,
    justifyContent: 'center', alignItems: 'center',
  },
  patientDetailBadgeTxt: { color: C.white, fontSize: 11, fontWeight: '800' },
  patientDetailName: { fontSize: 13, fontWeight: '700', color: C.text, flex: 1 },
  patientDetailPhone: { fontSize: 12, color: C.textSub },
  patientDetailNote: { fontSize: 12, color: C.textMuted, marginTop: 6, fontStyle: 'italic' },
  patientDetailRel: { fontSize: 12, color: C.orangeDark, marginTop: 6, fontWeight: '600' },

  otherBookingTag: {
    marginLeft: 6,
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: C.orangeLight,
    borderWidth: 1, borderColor: C.orange,
  },
  otherBookingTagTxt: { fontSize: 10, color: C.orangeDark, fontWeight: '700' },

  // Admin sub-tabs (segment)
  segmentRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4,
  },
  segmentBtn: {
    flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white,
  },
  segmentBtnActive: { backgroundColor: C.orange, borderColor: C.orange },
  segmentTxt: { fontSize: 13, fontWeight: '700', color: C.textSub },
  segmentTxtActive: { color: C.white },
  segBadge: {
    minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5,
    backgroundColor: '#E05252', justifyContent: 'center', alignItems: 'center',
  },
  segBadgeTxt: { color: C.white, fontSize: 10, fontWeight: '800' },
});

/* ── DoctorReplyView: ฝั่งทันตแพทย์ตอบแชตคนไข้ — เลือกหมอได้หลายคน (อยู่ในหน้า Admin) ── */
function DoctorReplyView({ doctors = [], chats = {}, unread = {}, patientTyping = {}, onSend, onToggleOnline, onTyping, onSeen }) {
  const firstWithUnread = doctors.find(d => (unread[d.id] || 0) > 0);
  const [selectedId, setSelectedId] = useState((firstWithUnread || doctors[0])?.id);
  const doctor = doctors.find(d => d.id === selectedId) || doctors[0];
  const [input, setInput] = useState('');
  const scrollRef = useRef();
  const typingTimer = useRef(null);

  const messages = chats[selectedId] || [];
  const isTyping = !!patientTyping[selectedId];

  // มาร์คว่าอ่านเมื่อเลือกหมอ / มีข้อความใหม่ขณะเปิดหมอคนนั้น
  useEffect(() => { if (selectedId) onSeen?.(selectedId); }, [selectedId, messages.length]);

  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(id);
  }, [messages, isTyping, selectedId]);

  useEffect(() => () => { if (typingTimer.current) clearTimeout(typingTimer.current); }, []);

  const handleType = (t) => {
    setInput(t);
    onTyping?.(selectedId, true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onTyping?.(selectedId, false), 1200);
  };

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    if (typingTimer.current) clearTimeout(typingTimer.current);
    onTyping?.(selectedId, false);
    onSend?.(selectedId, text);
  };

  if (!doctor) return null;

  return (
    <View style={rs.wrap}>
      {/* ตัวเลือกหมอ (เลื่อนแนวนอน) */}
      <View style={rs.selWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={rs.selRow}>
          {doctors.map(d => {
            const u = unread[d.id] || 0;
            const active = d.id === selectedId;
            return (
              <TouchableOpacity key={d.id} style={[rs.selChip, active && rs.selChipActive]} onPress={() => setSelectedId(d.id)}>
                <View style={[rs.selDot, { backgroundColor: d.online ? '#10B981' : C.textMuted }]} />
                <Text style={[rs.selTxt, active && rs.selTxtActive]} numberOfLines={1}>{d.name}</Text>
                {u > 0 && <View style={rs.selBadge}><Text style={rs.selBadgeTxt}>{u}</Text></View>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Header: หมอที่เลือก + online toggle */}
      <View style={rs.head}>
        <View style={{ flex: 1 }}>
          <Text style={rs.headTitle} numberOfLines={1}>{doctor.name}</Text>
          <Text style={rs.headSub} numberOfLines={1}>{doctor.title} · ตอบในนามหมอท่านนี้</Text>
        </View>
        <TouchableOpacity
          style={[rs.onlineToggle, { backgroundColor: doctor.online ? '#D1FAE5' : C.orangeLight, borderColor: doctor.online ? '#6EE7B7' : C.border }]}
          onPress={() => onToggleOnline?.(doctor.id)}
        >
          <View style={[rs.onlineDot, { backgroundColor: doctor.online ? '#10B981' : C.textMuted }]} />
          <Text style={[rs.onlineTxt, { color: doctor.online ? '#065F46' : C.textSub }]}>
            {doctor.online ? 'ออนไลน์' : 'ออฟไลน์'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView ref={scrollRef} style={rs.body} contentContainerStyle={{ paddingVertical: 16 }}>
        {messages.length === 0 ? (
          <View style={rs.empty}>
            <Text style={rs.emptyTitle}>ยังไม่มีข้อความจากคนไข้</Text>
            <Text style={rs.emptySub}>เมื่อคนไข้ทักหา{doctor.name} จะแสดงที่นี่</Text>
          </View>
        ) : (
          messages.map((m) => (
            <View key={m.id} style={m.sender === 'doctor' ? rs.rowDoc : rs.rowPatient}>
              {m.sender === 'patient' && (
                <View style={rs.patAvatar}><Text style={rs.patAvatarTxt}>ค</Text></View>
              )}
              <View style={[rs.bubble, m.sender === 'doctor' ? rs.bubbleDoc : rs.bubblePatient]}>
                {m.imageUri ? (
                  <Image source={{ uri: m.imageUri }} style={rs.img} />
                ) : (
                  <Text style={m.sender === 'doctor' ? rs.txtDoc : rs.txtPatient}>{m.content}</Text>
                )}
              </View>
            </View>
          ))
        )}
        {isTyping && (
          <View style={rs.rowPatient}>
            <View style={rs.patAvatar}><Text style={rs.patAvatarTxt}>ค</Text></View>
            <View style={[rs.bubble, rs.bubblePatient]}>
              <View style={rs.typing}><View style={rs.dot} /><View style={rs.dot} /><View style={rs.dot} /></View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={rs.footer}>
        <TextInput
          style={rs.input}
          placeholder={`ตอบในนาม ${doctor.name}...`}
          placeholderTextColor={C.textMuted}
          value={input}
          onChangeText={handleType}
          onSubmitEditing={send}
          returnKeyType="send"
          multiline
        />
        <TouchableOpacity style={[rs.sendBtn, !input.trim() && rs.sendDisabled]} onPress={send} disabled={!input.trim()}>
          <Text style={rs.sendTxt}>ส่ง</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const rs = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },

  // doctor selector
  selWrap: { backgroundColor: C.white, borderBottomWidth: 1, borderColor: C.border, paddingVertical: 8 },
  selRow: { paddingHorizontal: 12, gap: 8, flexDirection: 'row', alignItems: 'center' },
  selChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white,
  },
  selChipActive: { borderColor: C.orange, backgroundColor: C.orangeLight },
  selDot: { width: 8, height: 8, borderRadius: 4 },
  selTxt: { fontSize: 12, color: C.textSub, fontWeight: '600', maxWidth: 130 },
  selTxtActive: { color: C.orangeDark, fontWeight: '700' },
  selBadge: {
    minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4,
    backgroundColor: '#E05252', justifyContent: 'center', alignItems: 'center',
  },
  selBadgeTxt: { color: C.white, fontSize: 9, fontWeight: '800' },

  head: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: C.white, borderBottomWidth: 1, borderColor: C.border,
  },
  headTitle: { fontSize: 14, fontWeight: '800', color: C.text },
  headSub: { fontSize: 11, color: C.textSub, marginTop: 1 },
  onlineToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5,
  },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  onlineTxt: { fontSize: 12, fontWeight: '700' },

  body: { flex: 1, paddingHorizontal: 16 },
  empty: { alignItems: 'center', paddingTop: 70 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: C.textSub },
  emptySub: { fontSize: 12, color: C.textMuted, marginTop: 6 },

  rowDoc:     { flexDirection: 'row-reverse', marginBottom: 14, maxWidth: '86%', alignSelf: 'flex-end' },
  rowPatient: { flexDirection: 'row', marginBottom: 14, maxWidth: '86%', alignSelf: 'flex-start' },
  patAvatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: C.textSub,
    justifyContent: 'center', alignItems: 'center', marginRight: 8, marginTop: 2,
  },
  patAvatarTxt: { color: C.white, fontSize: 11, fontWeight: '800' },

  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  bubbleDoc: { backgroundColor: C.orange, borderTopRightRadius: 4 },
  bubblePatient: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderTopLeftRadius: 4 },
  txtDoc: { color: C.white, fontSize: 14, lineHeight: 22 },
  txtPatient: { color: C.text, fontSize: 14, lineHeight: 22 },
  img: { width: 180, height: 180, borderRadius: 12, resizeMode: 'cover' },

  typing: { flexDirection: 'row', gap: 5, paddingVertical: 4 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.orangeMid },

  footer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 16, paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    backgroundColor: C.white, borderTopWidth: 1, borderColor: C.border,
  },
  input: {
    flex: 1, backgroundColor: C.orangeLight, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: C.text, maxHeight: 100,
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.orange, justifyContent: 'center', alignItems: 'center' },
  sendDisabled: { backgroundColor: C.orangeMid },
  sendTxt: { color: C.white, fontSize: 13, fontWeight: '700' },
});