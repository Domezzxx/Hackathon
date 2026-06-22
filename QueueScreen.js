import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  ScrollView, Modal, Image, Alert, Animated
} from 'react-native';
import { TH_MONTHS, TH_DAYS, TIME_SLOTS, SERVICES } from './constants';

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

// ── Mock "localStorage" — in-memory member store ──────────────
// เก็บข้อมูลสมาชิกในหน่วยความจำ (สมมุติเป็น localStorage สำหรับ demo)
let _memberStore = null; // { name, phone }

const MemberStorage = {
  get: () => _memberStore,
  set: (data) => { _memberStore = data; },
  clear: () => { _memberStore = null; },
};

// ── ความสัมพันธ์ของผู้ป่วยกับผู้จอง (กรณีจองให้คนอื่น) ──
const RELATIONSHIPS = ['คู่สมรส', 'บุตร', 'บิดา/มารดา', 'พี่/น้อง', 'ญาติ', 'เพื่อน', 'อื่นๆ'];

export default function QueueScreen({
  doctors = [],
  preSelectedDoctorId = null,
  onBookingSuccess,
  onUserCancel,
  notifications = [],
  onClearNotification
}) {
  const today = new Date();

  // ── Member (saved profile) state ──
  const [savedMember, setSavedMember] = useState(() => MemberStorage.get());
  const [editingMember, setEditingMember] = useState(false);
  const memberBannerAnim = useRef(new Animated.Value(0)).current;

  const [booking, setBooking] = useState(() => {
    const m = MemberStorage.get();
    return { name: m?.name ?? '', phone: m?.phone ?? '', note: '' };
  });
  const [selectedServices, setSelectedServices] = useState([]);

  // ── Doctor Selection state ──
  const [selectedDoctorId, setSelectedDoctorId] = useState(preSelectedDoctorId || '');

  useEffect(() => {
    if (preSelectedDoctorId) {
      setSelectedDoctorId(preSelectedDoctorId);
    }
  }, [preSelectedDoctorId]);

  const getRecommendedDoctorId = () => {
    if (selectedServices.includes('จัดฟัน')) return 'orth';
    if (selectedServices.includes('ถอนฟัน')) return 'surg';
    if (selectedServices.includes('ตรวจฟันทั่วไป') || selectedServices.includes('อุดฟัน') || selectedServices.includes('ขูดหินปูน')) {
      return 'gen';
    }
    return null;
  };

  const recommendedDoctorId = getRecommendedDoctorId();

  // ── จองให้ใคร: ตัวเอง / คนอื่น (จองได้ครั้งละ 1 คน) ──
  const [bookingFor, setBookingFor] = useState('self'); // 'self' | 'other'
  const [patient, setPatient] = useState({ name: '', phone: '', phoneError: '', relationship: '', note: '' });
  const [customRelationship, setCustomRelationship] = useState('');

  const updatePatient = (field, value) => {
    setPatient(prev => {
      if (field === 'phone') {
        let d = value.replace(/[^0-9]/g, '');
        if (d.length > 0 && d[0] !== '0') d = '0' + d.slice(1);
        let err = '';
        if (d.length > 0 && d.length < 10) err = `${d.length}/10 หลัก`;
        return { ...prev, phone: d, phoneError: err };
      }
      return { ...prev, [field]: value };
    });
  };

  const toggleService = (name) => {
    setSelectedServices(prev =>
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    );
  };

  const [phoneError, setPhoneError]     = useState('');
  const [bookingSuccess, setBookingSuccess]     = useState(false);
  const [bookingCancelled, setBookingCancelled] = useState(false);
  const CANCEL_AUTO_SECONDS = 6;
  const [cancelRemaining, setCancelRemaining] = useState(CANCEL_AUTO_SECONDS);
  const [bookingRef, setBookingRef]             = useState('');
  const [selectedDateObj, setSelectedDateObj] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');

  const [calOpen, setCalOpen]           = useState(false);
  const [calViewYear, setCalViewYear]   = useState(today.getFullYear());
  const [calViewMonth, setCalViewMonth] = useState(today.getMonth());
  const [tempCalDate, setTempCalDate]   = useState(null);
  const [tempCalTime, setTempCalTime]   = useState(null);

  // แสดง animation เมื่อมีข้อมูลสมาชิก
  useEffect(() => {
    if (savedMember) {
      Animated.spring(memberBannerAnim, {
        toValue: 1, useNativeDriver: true,
        friction: 7, tension: 60,
      }).start();
    } else {
      memberBannerAnim.setValue(0);
    }
  }, [savedMember]);

  // บันทึกข้อมูลสมาชิกหลังจองสำเร็จ
  const saveMember = (name, phone) => {
    const data = { name, phone };
    MemberStorage.set(data);
    setSavedMember(data);
  };

  const handleClearMember = () => {
    Alert.alert(
      'ล้างข้อมูลสมาชิก',
      'ต้องการลบชื่อและเบอร์โทรที่บันทึกไว้ใช่ไหม?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบข้อมูล',
          style: 'destructive',
          onPress: () => {
            MemberStorage.clear();
            setSavedMember(null);
            setBooking(prev => ({ ...prev, name: '', phone: '' }));
          }
        }
      ]
    );
  };

  const handleReset = () => {
    if (bookingRef) onClearNotification?.(bookingRef);
    const m = MemberStorage.get();
    setBooking({ name: m?.name ?? '', phone: m?.phone ?? '', note: '' });
    setSelectedServices([]);
    setBookingFor('self');
    setPatient({ name: '', phone: '', phoneError: '', relationship: '', note: '' });
    setCustomRelationship('');
    setSelectedDateObj(null); setSelectedTime('');
    setSelectedDoctorId('');
    setBookingSuccess(false);
    setBookingCancelled(false);
    setBookingRef('');
    setTempCalDate(null); setTempCalTime(null);
  };

  // ตรวจจับเมื่อแอดมินยกเลิกนัดหมายปัจจุบัน → แสดงหน้า "ยกเลิกนัดหมายแล้ว" เต็มจอ
  // เหมือนตอนลูกค้ายกเลิกเอง (เก็บ bookingRef ไว้ให้หน้าจอหา detail ได้ แล้วนับถอยหลังกลับเอง)
  useEffect(() => {
    if (!bookingRef || !bookingSuccess) return;
    const adminCancelled = notifications.some(
      n => n.ref === bookingRef && n.cancelledBy === 'admin'
    );
    if (adminCancelled) {
      setBooking(prev => ({ ...prev, note: '' }));
      setSelectedServices([]);
      setSelectedDateObj(null); setSelectedTime('');
      setTempCalDate(null); setTempCalTime(null);
      setBookingSuccess(false);
      setBookingCancelled(true);
    }
  }, [notifications, bookingRef, bookingSuccess]);

  // นับถอยหลังหน้า "ยกเลิกแล้ว" แล้วกลับสู่หน้าจองอัตโนมัติ (ทั้งลูกค้าและเจ้าหน้าที่ยกเลิก)
  useEffect(() => {
    if (!bookingCancelled) {
      setCancelRemaining(CANCEL_AUTO_SECONDS);
      return;
    }
    if (cancelRemaining <= 0) {
      handleReset();
      return;
    }
    const id = setTimeout(() => setCancelRemaining(r => r - 1), 1000);
    return () => clearTimeout(id);
  }, [bookingCancelled, cancelRemaining]);

  const generateCalendarDays = () => {
    const firstDay = new Date(calViewYear, calViewMonth, 1).getDay();
    const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  };

  const handleConfirmBooking = () => {
    if (selectedServices.length === 0) return alert('กรุณาเลือกบริการอย่างน้อย 1 รายการ');
    if (!selectedDateObj || !selectedTime) return alert('กรุณาเลือกวันที่และเวลา');
    if (!booking.name)             return alert('กรุณากรอกชื่อ-นามสกุลผู้จอง');
    if (!booking.phone)            return alert('กรุณากรอกเบอร์โทรศัพท์ผู้จอง');
    if (booking.phone.length < 10) return alert('เบอร์โทรศัพท์ผู้จองต้องมี 10 หลัก');

    const finalRelationship = patient.relationship === 'อื่นๆ'
      ? (customRelationship.trim() || 'อื่นๆ')
      : patient.relationship;

    if (bookingFor === 'other') {
      if (!patient.name.trim())   return alert('กรุณากรอกชื่อ-นามสกุลผู้ป่วย');
      if (!finalRelationship)     return alert('กรุณาระบุความสัมพันธ์ของผู้ป่วยกับผู้จอง');
      if (patient.phone && patient.phone.length < 10) return alert('เบอร์โทรผู้ป่วยต้องมี 10 หลัก');
    }

    const ref = 'SUT-' + today.getFullYear().toString().slice(2)
      + (today.getMonth() + 1).toString().padStart(2, '0')
      + today.getDate().toString().padStart(2, '0')
      + '-' + Math.floor(Math.random() * 9000 + 1000);
    setBookingRef(ref);
    setBookingSuccess(true);
    saveMember(booking.name, booking.phone);

    const dateLabel = `วัน${TH_DAYS[selectedDateObj.getDay()]}ที่ ${selectedDateObj.getDate()} ${TH_MONTHS[selectedDateObj.getMonth()]} ${selectedDateObj.getFullYear() + 543}`;
    const serviceLabel = selectedServices.join(', ');

    // ผู้ป่วย = ตัวผู้จองเอง หรือ คนอื่น (จองได้ครั้งละ 1 คน)
    const patientName  = bookingFor === 'self' ? booking.name  : patient.name.trim();
    const patientPhone = bookingFor === 'self' ? booking.phone : (patient.phone || booking.phone);
    const patientNote  = bookingFor === 'self' ? booking.note  : patient.note;

    const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);
    const doctorName = selectedDoctor ? selectedDoctor.name : 'ไม่ระบุแพทย์';
    const doctorId = selectedDoctor ? selectedDoctor.id : null;

    setTimeout(() => {
      onBookingSuccess({
        ref,
        name: patientName,
        phone: patientPhone,
        service: serviceLabel,
        dateLabel,
        time: selectedTime,
        note: patientNote,
        bookingFor,
        relationship: bookingFor === 'other' ? finalRelationship : '',
        bookerName: booking.name,
        bookerPhone: booking.phone,
        doctorName,
        doctorId,
      });
    }, 1500);
  };

  const dateLabelShort = selectedDateObj
    ? `วัน${TH_DAYS[selectedDateObj.getDay()]}ที่ ${selectedDateObj.getDate()} ${TH_MONTHS[selectedDateObj.getMonth()]}  ·  ${selectedTime} น.`
    : '';

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Cancellation Notifications (banner ข้างบน) ── */}
        {/* คิวที่กำลังโชว์หน้า "ยกเลิกแล้ว" เต็มจอ จะไม่ขึ้น banner ซ้ำ
            ส่วนคิวอื่นที่ถูกยกเลิก (เช่น เจ้าหน้าที่ยกเลิกคิวที่ไม่ได้เปิดอยู่) จะขึ้นเป็น banner นับถอยหลัง */}
        {notifications
          .filter(n => !(bookingCancelled && n.ref === bookingRef))
          .map(n => (
            <NotifBanner key={n.ref} notif={n} onClose={onClearNotification} />
          ))}

        {bookingCancelled ? (
          /* ── Cancelled (ลูกค้า/เจ้าหน้าที่ยกเลิก) ── */
          <View style={styles.successBox}>
            <View style={[styles.successCheckmark, { backgroundColor: '#EF4444' }]}>
              <Text style={styles.successCheckTxt}>✕</Text>
            </View>
            <Text style={styles.successTitle}>ยกเลิกนัดหมายแล้ว</Text>
            <Text style={styles.successRef}>{bookingRef}</Text>
            {(() => {
              const n = notifications.find(n => n.ref === bookingRef);
              return n ? (
                <View style={styles.cancelledDetailBox}>
                  <Text style={styles.cancelledDetailRow}>บริการ: {n.service}</Text>
                  <Text style={styles.cancelledDetailRow}>วันที่: {n.dateLabel}</Text>
                  <Text style={styles.cancelledDetailRow}>เวลา: {n.time} น.</Text>
                  <Text style={styles.cancelledDetailReason}>เหตุผล: {n.cancelReason}</Text>
                  {n.cancelledBy === 'admin' && (
                    <Text style={styles.cancelledBy}>ยกเลิกโดยเจ้าหน้าที่คลินิก</Text>
                  )}
                </View>
              ) : (
                <Text style={styles.successSub}>ยกเลิกนัดหมายเรียบร้อยแล้วครับ</Text>
              );
            })()}
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Text style={styles.resetBtnTxt}>จองนัดหมายใหม่</Text>
            </TouchableOpacity>
            <View style={styles.cancelAutoTrack}>
              <View style={[styles.cancelAutoBar, { width: `${Math.max(0, (cancelRemaining / CANCEL_AUTO_SECONDS) * 100)}%` }]} />
            </View>
            <Text style={styles.cancelAutoTxt}>กลับสู่หน้าจองอัตโนมัติใน {cancelRemaining} วินาที</Text>
          </View>
        ) : bookingSuccess ? (
          /* ── Success ── */
          <View style={styles.successBox}>
            <View style={styles.successCheckmark}>
              <Text style={styles.successCheckTxt}>✓</Text>
            </View>
            <Text style={styles.successTitle}>นัดหมายสำเร็จ</Text>
            <Text style={styles.successRef}>{bookingRef}</Text>
            <Text style={styles.successSub}>กรุณาเก็บหมายเลขนัดหมายไว้เป็นหลักฐาน{'\n'}และมาถึงก่อนเวลานัด 10 นาทีครับ</Text>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Text style={styles.resetBtnTxt}>นัดหมายใหม่</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.userCancelBtn}
              onPress={() => Alert.alert(
                'ยกเลิกนัดหมาย',
                'ต้องการยกเลิกนัดหมายนี้ใช่ไหม?',
                [
                  { text: 'ไม่ใช่', style: 'cancel' },
                  {
                    text: 'ยืนยันยกเลิก',
                    style: 'destructive',
                    onPress: () => {
                      const dateLabel = selectedDateObj
                        ? `วัน${TH_DAYS[selectedDateObj.getDay()]}ที่ ${selectedDateObj.getDate()} ${TH_MONTHS[selectedDateObj.getMonth()]} ${selectedDateObj.getFullYear() + 543}`
                        : '';
                      onUserCancel?.({
                        ref: bookingRef,
                        name: booking.name,
                        phone: booking.phone,
                        service: selectedServices.join(', '),
                        dateLabel,
                        time: selectedTime,
                      });
                      setBooking(prev => ({ ...prev, note: '' }));
                      setSelectedServices([]);
                      setSelectedDateObj(null); setSelectedTime('');
                      setTempCalDate(null); setTempCalTime(null);
                      setBookingSuccess(false);
                      setBookingCancelled(true);
                    }
                  },
                ]
              )}
            >
              <Text style={styles.userCancelTxt}>ยกเลิกนัดหมายนี้</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ── Form ── */
          <>
            {/* ── Service ── */}
            <Text style={styles.sectionLabel}>เลือกบริการ</Text>
            <View style={styles.serviceGrid}>
              {SERVICES.map(srv => {
                const active = selectedServices.includes(srv.name);
                return (
                  <TouchableOpacity
                    key={srv.name}
                    style={[styles.serviceCard, active && styles.serviceCardActive]}
                    onPress={() => toggleService(srv.name)}
                    activeOpacity={0.75}
                  >
                    {active && (
                      <View style={styles.serviceCheckBadge}>
                        <Text style={styles.serviceCheckBadgeTxt}>✓</Text>
                      </View>
                    )}
                    <Image source={srv.image} style={styles.serviceIcon} />
                    <Text style={[styles.serviceName, active && styles.serviceNameActive]}>{srv.name}</Text>
                    <Text style={[styles.servicePrice, active && styles.servicePriceActive]}>{srv.price}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Selected services summary ── */}
            {selectedServices.length > 0 && (
              <View style={styles.selectedSummary}>
                <Text style={styles.selectedSummaryLabel}>
                  เลือกแล้ว {selectedServices.length} บริการ
                </Text>
                <View style={styles.selectedTags}>
                  {selectedServices.map(name => (
                    <TouchableOpacity
                      key={name}
                      style={styles.selectedTag}
                      onPress={() => toggleService(name)}
                    >
                      <Text style={styles.selectedTagTxt}>{name}</Text>
                      <Text style={styles.selectedTagX}>✕</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* ── Doctor Selection ── */}
            <Text style={styles.sectionLabel}>เลือกทันตแพทย์</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.doctorScroll}
              contentContainerStyle={styles.doctorRow}
            >
              <TouchableOpacity
                style={[
                  styles.doctorChip,
                  selectedDoctorId === '' && styles.doctorChipActive
                ]}
                onPress={() => setSelectedDoctorId('')}
                activeOpacity={0.75}
              >
                <View style={styles.doctorAvatarWrap}>
                  <View style={[styles.doctorAvatar, { backgroundColor: C.orangeLight }]}>
                    <Text style={[styles.doctorAvatarTxt, { color: C.textSub }]}>🦷</Text>
                  </View>
                </View>
                <View style={styles.doctorChipInfo}>
                  <Text style={styles.doctorChipName}>ไม่ระบุแพทย์</Text>
                  <Text style={styles.doctorChipSub}>เลือกใครก็ได้เพื่อคิวที่เร็วที่สุด</Text>
                </View>
              </TouchableOpacity>

              {doctors.map(d => {
                const isSelected = selectedDoctorId === d.id;
                const isRecommended = recommendedDoctorId === d.id;
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[
                      styles.doctorChip,
                      isSelected && styles.doctorChipActive
                    ]}
                    onPress={() => {
                      setSelectedDoctorId(d.id);
                      if (selectedDateObj && !d.dutyDays?.includes(selectedDateObj.getDay())) {
                        setSelectedDateObj(null);
                        setSelectedTime('');
                        setTempCalDate(null);
                        setTempCalTime(null);
                      }
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.doctorAvatarWrap}>
                      <View style={[styles.doctorAvatar, !d.online && styles.doctorAvatarOff]}>
                        <Text style={styles.doctorAvatarTxt}>{d.initial}</Text>
                      </View>
                      {isRecommended && (
                        <View style={styles.recommendBadge}>
                          <Text style={styles.recommendBadgeTxt}>แนะนำ</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.doctorChipInfo}>
                      <Text style={styles.doctorChipName}>{d.name}</Text>
                      <Text style={styles.doctorChipSpecialty}>{d.title}</Text>
                      <Text style={styles.doctorChipDays}>📅 เข้าเวร: {d.dutyDaysLabel}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* ── Date/Time picker ── */}
            <Text style={styles.sectionLabel}>วันและเวลานัดหมาย</Text>
            <TouchableOpacity
              style={[styles.datePickerBtn, selectedDateObj && styles.datePickerBtnFilled]}
              onPress={() => setCalOpen(true)}
            >
              {selectedDateObj ? (
                <Text style={styles.datePickerFilled}>📅  {dateLabelShort}</Text>
              ) : (
                <Text style={styles.datePickerPlaceholder}>กดเพื่อเลือกวันที่และเวลา</Text>
              )}
            </TouchableOpacity>

            {/* ── Patient info ── */}
            <Text style={styles.sectionLabel}>ข้อมูลผู้จอง</Text>

            {/* ── ผู้จอง (เจ้าของบัญชี) ── */}
            <View style={styles.patientCard}>
              <View style={styles.patientCardHeader}>
                <View style={styles.patientNumBadge}>
                  <Text style={styles.patientNumTxt}>1</Text>
                </View>
                <Text style={styles.patientCardTitle}>ผู้จอง</Text>
              </View>

              {/* Saved Member Banner */}
              {savedMember && !editingMember ? (
                <Animated.View style={[
                  styles.memberBanner,
                  { opacity: memberBannerAnim, transform: [{ scale: memberBannerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }
                ]}>
                  <View style={styles.memberBannerLeft}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarTxt}>
                        {savedMember.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.memberGreet}>ยินดีต้อนรับคืนครับ</Text>
                      <Text style={styles.memberName}>{savedMember.name}</Text>
                      <Text style={styles.memberPhone}>{savedMember.phone}</Text>
                    </View>
                  </View>
                  <View style={styles.memberBannerActions}>
                    <TouchableOpacity style={styles.memberEditBtn} onPress={() => setEditingMember(true)}>
                      <Text style={styles.memberEditTxt}>แก้ไข</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.memberClearBtn} onPress={handleClearMember}>
                      <Text style={styles.memberClearTxt}>ลบ</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              ) : (
                <>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>ชื่อ-นามสกุล</Text>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="กรอกชื่อ-นามสกุล"
                      placeholderTextColor={C.textMuted}
                      value={booking.name}
                      onChangeText={t => setBooking({ ...booking, name: t })}
                    />
                  </View>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>เบอร์โทรศัพท์</Text>
                    <TextInput
                      style={[styles.fieldInput, phoneError && styles.fieldInputError]}
                      placeholder="0XX-XXX-XXXX"
                      placeholderTextColor={C.textMuted}
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={booking.phone}
                      onChangeText={t => {
                        let d = t.replace(/[^0-9]/g, '');
                        if (d.length > 0 && d[0] !== '0') d = '0' + d.slice(1);
                        setBooking({ ...booking, phone: d });
                        if (d.length === 0) setPhoneError('');
                        else if (d[0] !== '0') setPhoneError('เบอร์โทรต้องขึ้นต้นด้วย 0');
                        else if (d.length < 10) setPhoneError(`${d.length}/10 หลัก`);
                        else setPhoneError('');
                      }}
                    />
                    {phoneError ? <Text style={styles.fieldError}>{phoneError}</Text> : null}
                  </View>
                  {editingMember && (
                    <TouchableOpacity
                      style={styles.memberSaveBtn}
                      onPress={() => {
                        if (!booking.name) return alert('กรุณากรอกชื่อ-นามสกุล');
                        if (!booking.phone || booking.phone.length < 10) return alert('กรุณากรอกเบอร์โทรให้ครบ 10 หลัก');
                        saveMember(booking.name, booking.phone);
                        setEditingMember(false);
                      }}
                    >
                      <Text style={styles.memberSaveTxt}>✓  บันทึกข้อมูล</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

            </View>

            {/* ── จองคิวให้ใคร (จองได้ครั้งละ 1 คน) ── */}
            <Text style={styles.sectionLabel}>จองคิวให้ใคร</Text>
            <View style={styles.forWhomRow}>
              <TouchableOpacity
                style={[styles.forWhomBtn, bookingFor === 'self' && styles.forWhomBtnActive]}
                onPress={() => setBookingFor('self')}
                activeOpacity={0.8}
              >
                <Text style={[styles.forWhomTxt, bookingFor === 'self' && styles.forWhomTxtActive]}>จองให้ตัวเอง</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.forWhomBtn, bookingFor === 'other' && styles.forWhomBtnActive]}
                onPress={() => setBookingFor('other')}
                activeOpacity={0.8}
              >
                <Text style={[styles.forWhomTxt, bookingFor === 'other' && styles.forWhomTxtActive]}>จองให้คนอื่น</Text>
              </TouchableOpacity>
            </View>

            {bookingFor === 'self' ? (
              /* ── อาการ/หมายเหตุ ของผู้จอง ── */
              <View style={[styles.patientCard, { paddingBottom: 4 }]}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>อาการ / หมายเหตุ (ถ้ามี)</Text>
                  <TextInput
                    style={[styles.fieldInput, { height: 68, textAlignVertical: 'top', paddingTop: 10 }]}
                    placeholder="เช่น ปวดฟันกรามขวา เสียวเวลากินของเย็น"
                    placeholderTextColor={C.textMuted}
                    value={booking.note}
                    onChangeText={t => setBooking({ ...booking, note: t })}
                    multiline
                  />
                </View>
              </View>
            ) : (
              /* ── ข้อมูลผู้ป่วย (คนอื่น) ── */
              <View style={styles.patientCard}>
                <View style={styles.patientCardHeader}>
                  <View style={[styles.patientNumBadge, { backgroundColor: C.orangeDark }]}>
                    <Text style={styles.patientNumTxt}>♥</Text>
                  </View>
                  <Text style={styles.patientCardTitle}>ข้อมูลผู้ป่วย</Text>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>ชื่อ-นามสกุลผู้ป่วย <Text style={{ color: '#EF4444' }}>*</Text></Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="กรอกชื่อ-นามสกุลผู้ป่วย"
                    placeholderTextColor={C.textMuted}
                    value={patient.name}
                    onChangeText={t => updatePatient('name', t)}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>ความสัมพันธ์กับผู้จอง <Text style={{ color: '#EF4444' }}>*</Text></Text>
                  <View style={styles.relRow}>
                    {RELATIONSHIPS.map(r => (
                      <TouchableOpacity
                        key={r}
                        style={[styles.relChip, patient.relationship === r && styles.relChipActive]}
                        onPress={() => { updatePatient('relationship', r); if (r !== 'อื่นๆ') setCustomRelationship(''); }}
                      >
                        <Text style={[styles.relChipTxt, patient.relationship === r && styles.relChipTxtActive]}>{r}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {patient.relationship === 'อื่นๆ' && (
                    <TextInput
                      style={[styles.fieldInput, { marginTop: 8 }]}
                      placeholder="ระบุความสัมพันธ์ เช่น หลาน, ปู่/ย่า"
                      placeholderTextColor={C.textMuted}
                      value={customRelationship}
                      onChangeText={setCustomRelationship}
                    />
                  )}
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>เบอร์โทรผู้ป่วย (ถ้ามี)</Text>
                  <TextInput
                    style={[styles.fieldInput, patient.phoneError && styles.fieldInputError]}
                    placeholder="0XX-XXX-XXXX (ไม่บังคับ)"
                    placeholderTextColor={C.textMuted}
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={patient.phone}
                    onChangeText={t => updatePatient('phone', t)}
                  />
                  {patient.phoneError ? <Text style={styles.fieldError}>{patient.phoneError}</Text> : null}
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>อาการ / หมายเหตุ (ถ้ามี)</Text>
                  <TextInput
                    style={[styles.fieldInput, { height: 68, textAlignVertical: 'top', paddingTop: 10 }]}
                    placeholder="เช่น ตรวจฟันประจำปี"
                    placeholderTextColor={C.textMuted}
                    value={patient.note}
                    onChangeText={t => updatePatient('note', t)}
                    multiline
                  />
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmBooking}>
              <Text style={styles.confirmBtnTxt}>ยืนยันการนัดหมาย</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* ── Calendar Modal ── */}
      <Modal visible={calOpen} animationType="slide" transparent>
        <View style={styles.calOverlay}>
          <TouchableOpacity style={styles.calDismiss} onPress={() => setCalOpen(false)} />
          <View style={styles.calSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.calHeaderRow}>
              <Text style={styles.calTitle}>เลือกวันนัดหมาย</Text>
              <TouchableOpacity onPress={() => setCalOpen(false)} style={styles.calCloseBtn}>
                <Text style={styles.calCloseTxt}>ปิด</Text>
              </TouchableOpacity>
            </View>

            {(() => {
              const selectedDoctorObj = doctors.find(d => d.id === selectedDoctorId);
              return selectedDoctorObj ? (
                <View style={styles.calNoticeBanner}>
                  <Text style={styles.calNoticeTxt}>
                    แสดงเฉพาะวันเข้าเวรของ <Text style={{ fontWeight: '700' }}>{selectedDoctorObj.name}</Text> ({selectedDoctorObj.dutyDaysLabel})
                  </Text>
                </View>
              ) : (
                <View style={[styles.calNoticeBanner, { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }]}>
                  <Text style={[styles.calNoticeTxt, { color: C.textSub }]}>
                    💡 คุณสามารถเลือกวันนัดหมายได้ทุกวันทำการของคลินิก
                  </Text>
                </View>
              );
            })()}

            {/* Month nav */}
            <View style={styles.calNav}>
              <TouchableOpacity style={styles.calNavBtn}
                onPress={() => {
                  if (calViewMonth === 0) { setCalViewMonth(11); setCalViewYear(y => y - 1); }
                  else setCalViewMonth(m => m - 1);
                }}>
                <Text style={styles.calNavTxt}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.calMonthTxt}>
                {TH_MONTHS[calViewMonth]} {calViewYear + 543}
              </Text>
              <TouchableOpacity style={styles.calNavBtn}
                onPress={() => {
                  if (calViewMonth === 11) { setCalViewMonth(0); setCalViewYear(y => y + 1); }
                  else setCalViewMonth(m => m + 1);
                }}>
                <Text style={styles.calNavTxt}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Day-of-week header */}
            <View style={styles.calWeekRow}>
              {TH_DAYS.map(d => <Text key={d} style={styles.calWd}>{d.slice(0,2)}</Text>)}
            </View>

            {/* Days grid */}
            <View style={styles.calDaysGrid}>
              {generateCalendarDays().map((day, idx) => {
                if (!day) return <View key={`e${idx}`} style={styles.calDayEmpty} />;
                const cellDate = new Date(calViewYear, calViewMonth, day);
                const isPast   = cellDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                
                const selectedDoctorObj = doctors.find(d => d.id === selectedDoctorId);
                const isOffDuty = selectedDoctorObj && !selectedDoctorObj.dutyDays?.includes(cellDate.getDay());
                const isDisabled = isPast || isOffDuty;
                
                const isSel    = tempCalDate?.toDateString() === cellDate.toDateString();
                return (
                  <TouchableOpacity
                    key={day} disabled={isDisabled}
                    style={[
                      styles.calDay,
                      isPast && styles.calDayPast,
                      isOffDuty && styles.calDayOffDuty,
                      isSel && styles.calDaySelected
                    ]}
                    onPress={() => setTempCalDate(cellDate)}
                  >
                    <Text style={[
                      styles.calDayTxt,
                      isSel && { color: C.white, fontWeight: '700' },
                      isOffDuty && { color: C.textMuted, textDecorationLine: 'line-through' }
                    ]}>{day}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Time slots */}
            {tempCalDate && (
              <View style={styles.timeSec}>
                <Text style={styles.timeTitle}>เลือกเวลา</Text>
                <View style={styles.timeGrid}>
                  {TIME_SLOTS.map(slot => (
                    <TouchableOpacity
                      key={slot.t} disabled={slot.full}
                      style={[
                        styles.timeChip,
                        slot.full && styles.timeChipFull,
                        tempCalTime === slot.t && styles.timeChipSelected,
                      ]}
                      onPress={() => setTempCalTime(slot.t)}
                    >
                      <Text style={[
                        styles.timeChipTxt,
                        slot.full && styles.timeChipTxtFull,
                        tempCalTime === slot.t && { color: C.white, fontWeight: '700' },
                      ]}>
                        {slot.full ? `${slot.t} เต็ม` : slot.t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Footer */}
            <View style={styles.calFooter}>
              <TouchableOpacity style={styles.calCancelBtn} onPress={() => setCalOpen(false)}>
                <Text style={styles.calCancelTxt}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.calConfirmBtn, (!tempCalDate || !tempCalTime) && styles.calConfirmDisabled]}
                disabled={!tempCalDate || !tempCalTime}
                onPress={() => {
                  setSelectedDateObj(tempCalDate);
                  setSelectedTime(tempCalTime);
                  setCalOpen(false);
                }}
              >
                <Text style={styles.calConfirmTxt}>ยืนยัน</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

/* ── NotifBanner: แจ้งเตือนยกเลิก + นับถอยหลังแล้วหายเอง ── */
function NotifBanner({ notif, onClose, seconds = 5 }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) {
      onClose?.(notif.ref);
      return;
    }
    const id = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining]);

  const pct = `${Math.max(0, (remaining / seconds) * 100)}%`;
  const byAdmin = notif.cancelledBy === 'admin';

  return (
    <View style={styles.notifBanner}>
      <View style={styles.notifContent}>
        <Text style={styles.notifTitle}>{byAdmin ? 'นัดหมายถูกยกเลิกโดยเจ้าหน้าที่' : 'ยกเลิกนัดหมายแล้ว'}</Text>
        <Text style={styles.notifBody}>{notif.service} · {notif.dateLabel} · {notif.time} น.</Text>
        <Text style={styles.notifRef}>{notif.ref}</Text>
        {byAdmin && <Text style={styles.notifReason}>เหตุผล: {notif.cancelReason}</Text>}
        <View style={styles.notifProgressTrack}>
          <View style={[styles.notifProgressBar, { width: pct }]} />
        </View>
        <Text style={styles.notifCountdown}>ปิดอัตโนมัติใน {remaining} วินาที</Text>
      </View>
      <TouchableOpacity onPress={() => onClose?.(notif.ref)} style={styles.notifClose}>
        <Text style={styles.notifCloseTxt}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: C.bg },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: C.orange,
    letterSpacing: 0.8, textTransform: 'uppercase',
    paddingHorizontal: 20, marginTop: 24, marginBottom: 10,
  },

  // Services
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8 },
  serviceCard: {
    width: '47%', backgroundColor: C.white,
    borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: C.border,
    position: 'relative', overflow: 'hidden',
  },
  serviceCardActive: { borderColor: C.orange, backgroundColor: C.orangeLight },
  serviceCheckBadge: {
    position: 'absolute', top: 8, right: 8,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: C.orange,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 1,
  },
  serviceCheckBadgeTxt: { color: C.white, fontSize: 11, fontWeight: '800' },
  serviceIcon: { width: 100, height: 100, marginBottom: 8, resizeMode: 'contain', borderRadius: 40 },
  serviceName: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 4 },
  serviceNameActive: { color: C.orangeDark },
  servicePrice: { fontSize: 11, color: C.textMuted },
  servicePriceActive: { color: C.textSub },

  // Selected summary
  selectedSummary: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: C.orangeLight,
    borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: C.border,
  },
  selectedSummaryLabel: {
    fontSize: 11, fontWeight: '700', color: C.orange,
    letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8,
  },
  selectedTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  selectedTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.orange,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20,
  },
  selectedTagTxt: { color: C.white, fontSize: 12, fontWeight: '600' },
  selectedTagX: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700' },

  // Date picker
  datePickerBtn: {
    marginHorizontal: 20, padding: 14, borderRadius: 12,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.border,
    backgroundColor: C.white,
  },
  datePickerBtnFilled: { borderStyle: 'solid', borderColor: C.orange, backgroundColor: C.orangeLight },
  datePickerPlaceholder: { color: C.textMuted, fontSize: 13 },
  datePickerFilled: { color: C.orangeDark, fontSize: 13, fontWeight: '600' },

  // Form fields
  fieldGroup: { paddingHorizontal: 14, marginBottom: 12, marginTop: 12 },
  fieldLabel: { fontSize: 12, color: C.textSub, marginBottom: 5, fontWeight: '600' },
  fieldInput: {
    backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: C.text,
  },
  fieldInputError: { borderColor: '#EF4444' },
  fieldError: { color: '#EF4444', fontSize: 11, marginTop: 4 },

  // Confirm button
  confirmBtn: {
    marginHorizontal: 20, marginTop: 20,
    backgroundColor: C.orange, padding: 15, borderRadius: 12, alignItems: 'center',
    shadowColor: C.orange, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6,
    elevation: 4,
  },
  confirmBtnTxt: { color: C.white, fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },

  // Success
  successBox: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  successCheckmark: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.orange, justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
    shadowColor: C.orange, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    elevation: 5,
  },
  successCheckTxt: { color: C.white, fontSize: 30, fontWeight: '300' },
  successTitle: { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 12 },
  successRef: {
    fontSize: 15, fontWeight: '700', color: C.orangeDark,
    letterSpacing: 1.5, backgroundColor: C.orangeLight,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginBottom: 16,
    borderWidth: 1, borderColor: C.border,
  },
  successSub: { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20 },
  resetBtn: {
    marginTop: 24, paddingHorizontal: 24, paddingVertical: 11,
    borderRadius: 10, borderWidth: 1.5, borderColor: C.orange,
    backgroundColor: C.orangeLight,
  },
  resetBtnTxt: { color: C.orange, fontSize: 13, fontWeight: '700' },

  cancelAutoTrack: {
    width: 180, height: 3, borderRadius: 2,
    backgroundColor: C.border, overflow: 'hidden',
    marginTop: 18,
  },
  cancelAutoBar: { height: 3, borderRadius: 2, backgroundColor: '#EF4444' },
  cancelAutoTxt: { fontSize: 11, color: C.textMuted, marginTop: 6 },

  userCancelBtn: {
    marginTop: 12, paddingHorizontal: 24, paddingVertical: 11,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#EF4444',
    backgroundColor: '#FFF5F5',
  },
  userCancelTxt: { color: '#EF4444', fontSize: 13, fontWeight: '600' },

  // Notification banner
  notifBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: '#FEE2E2', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#FCA5A5',
    padding: 14,
  },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 13, fontWeight: '700', color: '#991B1B', marginBottom: 3 },
  notifBody: { fontSize: 12, color: '#7F1D1D', marginBottom: 2 },
  notifRef: { fontSize: 11, color: '#B91C1C', fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
  notifReason: { fontSize: 12, color: '#B91C1C', fontStyle: 'italic' },
  notifProgressTrack: {
    height: 3, borderRadius: 2, backgroundColor: '#FCA5A5',
    marginTop: 8, overflow: 'hidden',
  },
  notifProgressBar: { height: 3, borderRadius: 2, backgroundColor: '#EF4444' },
  notifCountdown: { fontSize: 10, color: '#B91C1C', marginTop: 4 },
  notifClose: { padding: 4, marginLeft: 8 },
  notifCloseTxt: { fontSize: 14, color: '#EF4444', fontWeight: '700' },

  // Calendar
  calOverlay: { flex: 1, justifyContent: 'flex-end' },
  calDismiss: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  calSheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 34,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: C.border, alignSelf: 'center',
    marginTop: 12, marginBottom: 4,
  },
  calHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderColor: C.border,
  },
  calTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  calCloseBtn: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 7, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.orangeLight,
  },
  calCloseTxt: { fontSize: 12, color: C.orange, fontWeight: '600' },

  calNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  calNavBtn: {
    width: 32, height: 32, borderRadius: 8,
    borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.orangeLight,
    justifyContent: 'center', alignItems: 'center',
  },
  calNavTxt: { fontSize: 18, color: C.orange, fontWeight: '600' },
  calMonthTxt: { fontSize: 14, fontWeight: '700', color: C.text },

  calWeekRow: { flexDirection: 'row', paddingHorizontal: 14, marginBottom: 4 },
  calWd: { flex: 1, textAlign: 'center', fontSize: 11, color: C.textSub, fontWeight: '700' },

  calDaysGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14 },
  calDayEmpty: { width: '14.28%', aspectRatio: 1 },
  calDay: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8, marginVertical: 1 },
  calDayPast: { opacity: 0.2 },
  calDaySelected: { backgroundColor: C.orange },
  calDayTxt: { fontSize: 13, color: C.text },

  timeSec: { paddingHorizontal: 14, paddingTop: 12, borderTopWidth: 1, borderColor: C.border, marginTop: 10 },
  timeTitle: { fontSize: 11, fontWeight: '700', color: C.orange, letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  timeChip: {
    width: '22%', paddingVertical: 7, borderRadius: 8,
    borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', backgroundColor: C.white,
  },
  timeChipSelected: { backgroundColor: C.orange, borderColor: C.orange },
  timeChipFull: { backgroundColor: '#F5F5F5', borderColor: '#EFEFEF' },
  timeChipTxt: { fontSize: 12, color: C.text },
  timeChipTxtFull: { color: '#CCC', textDecorationLine: 'line-through' },

  calFooter: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 14, gap: 8 },
  calCancelBtn: {
    flex: 1, padding: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.orangeLight, alignItems: 'center',
  },
  calCancelTxt: { color: C.textSub, fontWeight: '600', fontSize: 13 },
  calConfirmBtn: { flex: 1, padding: 12, backgroundColor: C.orange, borderRadius: 10, alignItems: 'center' },
  calConfirmDisabled: { backgroundColor: C.orangeMid },
  calConfirmTxt: { color: C.white, fontWeight: '800', fontSize: 13 },

  cancelledDetailBox: {
    width: '100%',
    backgroundColor: '#FEE2E2',
    borderRadius: 12, borderWidth: 1.5, borderColor: '#FCA5A5',
    padding: 16, marginBottom: 20, marginTop: 4,
  },
  cancelledDetailRow: { fontSize: 13, color: '#7F1D1D', marginBottom: 4 },
  cancelledDetailReason: { fontSize: 13, color: '#991B1B', fontWeight: '700', marginTop: 4 },
  cancelledBy: {
    fontSize: 11, color: '#B91C1C', fontStyle: 'italic',
    marginTop: 6, textAlign: 'center',
  },

  // Patient cards
  patientCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: C.white,
    borderRadius: 14, borderWidth: 1.5, borderColor: C.border,
    overflow: 'hidden',
  },
  patientCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: C.orangeLight,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  patientNumBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: C.orange,
    justifyContent: 'center', alignItems: 'center',
  },
  patientNumTxt: { color: C.white, fontSize: 12, fontWeight: '800' },
  patientCardTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: C.orangeDark },
  patientRemoveBtn: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 7, borderWidth: 1.5, borderColor: '#FCA5A5',
    backgroundColor: '#FFF5F5',
  },
  patientRemoveTxt: { fontSize: 11, color: '#EF4444', fontWeight: '600' },

  addPatientBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 4, marginTop: 2,
    padding: 14, borderRadius: 12,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.orange,
    backgroundColor: C.orangeLight,
  },
  addPatientPlus: { fontSize: 18, color: C.orange, fontWeight: '300', lineHeight: 22 },
  addPatientTxt: { fontSize: 13, color: C.orange, fontWeight: '700', flex: 1 },
  patientCountBadge: {
    backgroundColor: C.orange,
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20,
  },
  patientCountTxt: { color: C.white, fontSize: 11, fontWeight: '700' },

  // Member banner
  memberBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 0, marginBottom: 0,
    backgroundColor: C.white,
    borderRadius: 0, padding: 14,
    borderWidth: 0,
  },
  memberBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  memberAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: C.orange,
    justifyContent: 'center', alignItems: 'center',
  },
  memberAvatarTxt: { color: C.white, fontSize: 18, fontWeight: '800' },
  memberGreet: { fontSize: 10, color: C.textMuted, fontWeight: '500', marginBottom: 1 },
  memberName: { fontSize: 14, fontWeight: '700', color: C.text },
  memberPhone: { fontSize: 12, color: C.textSub, marginTop: 1 },
  memberBannerActions: { flexDirection: 'row', gap: 6 },
  memberEditBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 7, borderWidth: 1.5, borderColor: C.orange,
    backgroundColor: C.orangeLight,
  },
  memberEditTxt: { fontSize: 11, color: C.orange, fontWeight: '700' },
  memberClearBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 7, borderWidth: 1.5, borderColor: '#FCA5A5',
    backgroundColor: '#FFF5F5',
  },
  memberClearTxt: { fontSize: 11, color: '#EF4444', fontWeight: '600' },
  memberSaveBtn: {
    marginHorizontal: 20, marginBottom: 14,
    padding: 11, borderRadius: 10,
    backgroundColor: C.orange, alignItems: 'center',
  },
  memberSaveTxt: { color: C.white, fontSize: 13, fontWeight: '700' },

  // จองให้ใคร
  forWhomRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
  forWhomBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.white, alignItems: 'center',
  },
  forWhomBtnActive: { borderColor: C.orange, backgroundColor: C.orangeLight },
  forWhomTxt: { fontSize: 13, color: C.textSub, fontWeight: '600' },
  forWhomTxtActive: { color: C.orangeDark, fontWeight: '700' },

  // ความสัมพันธ์
  relRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  relChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.white,
  },
  relChipActive: { borderColor: C.orange, backgroundColor: C.orange },
  relChipTxt: { fontSize: 12, color: C.textSub },
  relChipTxtActive: { color: C.white, fontWeight: '700' },

  // Doctor selection styles
  doctorScroll: {
    marginHorizontal: 16,
    maxHeight: 110,
    marginBottom: 10,
  },
  doctorRow: {
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
  },
  doctorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    width: 250,
    gap: 12,
  },
  doctorChipActive: {
    borderColor: C.orange,
    backgroundColor: C.orangeLight,
  },
  doctorAvatarWrap: {
    position: 'relative',
  },
  doctorAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: C.orange,
    justifyContent: 'center', alignItems: 'center',
  },
  doctorAvatarOff: {
    backgroundColor: C.textMuted,
  },
  doctorAvatarTxt: {
    color: C.white,
    fontSize: 15,
    fontWeight: '800',
  },
  recommendBadge: {
    position: 'absolute',
    bottom: -4,
    alignSelf: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  recommendBadgeTxt: {
    color: C.white,
    fontSize: 8,
    fontWeight: '800',
  },
  doctorChipInfo: {
    flex: 1,
  },
  doctorChipName: {
    fontSize: 13,
    fontWeight: '700',
    color: C.text,
  },
  doctorChipSpecialty: {
    fontSize: 10,
    color: C.orangeDark,
    fontWeight: '600',
    marginTop: 1,
  },
  doctorChipSub: {
    fontSize: 10,
    color: C.textMuted,
    marginTop: 2,
  },
  doctorChipDays: {
    fontSize: 9,
    color: C.textSub,
    marginTop: 3,
    fontWeight: '600',
  },

  // Calendar additions
  calNoticeBanner: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: C.orangeLight,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  calNoticeTxt: {
    fontSize: 11,
    color: C.orangeDark,
    textAlign: 'center',
  },
  calDayOffDuty: {
    opacity: 0.35,
  },
});