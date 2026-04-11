import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMe, getMessages, sendMessage, blockChat, sendReport, checkReported, getChats, getIncoming } from './api';
import { TopBar } from './App';
import { FooterNav } from './search';

const WHITE = '#ffffff';
const BLACK = '#000000';
const GREEN = '#00ff41';
const GRAY  = '#999999';
const RED   = '#cc0000';
const MONO  = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

const REPORT_REASONS = ['harassment', 'spam', 'inappropriate content', 'other'];

export default function ChatScreen({ route, navigation }: any) {
  const { chatId, nickname } = route.params;

  const [me, setMe]                     = useState<any>(null);
  const [messages, setMessages]         = useState<any[]>([]);
  const [text, setText]                 = useState('');
  const [sending, setSending]           = useState(false);
  const [loading, setLoading]           = useState(true);
  const [chatBlocked, setChatBlocked]   = useState(false);
  const [reported, setReported]         = useState(false);
  const [reportModal, setReportModal]   = useState(false);
  const [blockModal, setBlockModal]     = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [timezone, setTimezone]         = useState('Europe/Vienna');
  const [radarAlert, setRadarAlert]     = useState(false);
  const [myStickerId, setMyStickerId]   = useState<number | null>(null);

  const flatRef      = useRef<FlatList>(null);
  const pollRef      = useRef<any>(null);
  const alertRef     = useRef<any>(null);
  const stickerIdRef = useRef<number | null>(null);

  const init = useCallback(async () => {
    try {
      const [meD, msgD, repD] = await Promise.all([
        getMe(),
        getMessages(chatId),
        checkReported(nickname),
      ]);
      if (meD.success) {
        setMe(meD.participant);
        if (meD.participant.timezone) setTimezone(meD.participant.timezone);
        if (meD.participant.sticker_id) {
          setMyStickerId(meD.participant.sticker_id);
          stickerIdRef.current = meD.participant.sticker_id;
        }
      }
      if (msgD.success) setMessages(msgD.messages || []);
      if (repD.success && repD.reported) setReported(true);
    } catch {}
    setLoading(false);
  }, [chatId, nickname]);

  const pollMessages = useCallback(async () => {
    try {
      const msgD = await getMessages(chatId);
      if (msgD.success) {
        setMessages(msgD.messages || []);
        if (msgD.chatStatus === 'blocked') setChatBlocked(true);
      }
    } catch {}
  }, [chatId]);

  async function pollAlerts() {
    try {
      const [chatsD, incomingD] = await Promise.all([getChats(), getIncoming()]);
      const chats    = chatsD.success    ? (chatsD.chats      || []) : [];
      const incoming = incomingD.success ? (incomingD.requests || []) : [];
      const hasAlert = incoming.length > 0 ||
        chats.some((ch: any) => ch.last_sender_id && ch.last_sender_id !== stickerIdRef.current);
      setRadarAlert(hasAlert);
    } catch {}
  }

  useEffect(() => {
    init();
    pollRef.current  = setInterval(pollMessages, 5000);
    alertRef.current = setInterval(pollAlerts, 5000);
    return () => {
      clearInterval(pollRef.current);
      clearInterval(alertRef.current);
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 50);
    }
  }, [messages]);

  async function doSend() {
    const t = text.trim();
    if (!t || chatBlocked) return;
    setSending(true);
    setText('');
    try {
      await sendMessage(chatId, t);
      const msgD = await getMessages(chatId);
      if (msgD.success) setMessages(msgD.messages || []);
      pollAlerts();
    } catch {}
    setSending(false);
  }

  async function doBlock() {
    if (chatBlocked) return;
    setBlockModal(true);
  }

  async function doBlockConfirm() {
    setBlockModal(false);
    try {
      const d = await blockChat(chatId);
      if (d.success) {
        setChatBlocked(true);
        setTimeout(() => navigation.goBack(), 600);
      }
    } catch {}
  }

  async function doReport() {
    if (!reportReason || reported) return;
    try {
      const d = await sendReport(nickname, reportReason, reportDetails);
      setReported(true);
      setReportModal(false);
      setReportReason('');
      setReportDetails('');
      if (d.success) {
        Alert.alert('Reported', 'Your report has been submitted.');
      } else if (d.error === 'already reported') {
        Alert.alert('Already reported', 'You have already reported this participant.');
      } else {
        Alert.alert('Error', d.error || 'Could not submit report.');
      }
    } catch {
      setReportModal(false);
      Alert.alert('Error', 'Connection error.');
    }
  }

  function formatTime(str: string) {
    try {
      return new Date(str).toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit', timeZone: timezone
      });
    } catch {
      return new Date(str).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <TopBar navigation={navigation} />
        <View style={s.loader}><ActivityIndicator color={GREEN} /></View>
        <FooterNav navigation={navigation} active="Radar" radarAlert={radarAlert} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <TopBar navigation={navigation} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>‹ back</Text>
        </TouchableOpacity>
        <Text style={s.headerNick}>{nickname}</Text>
        <View style={s.headerActions}>
          <TouchableOpacity
            onPress={() => !reported && setReportModal(true)}
            style={[s.headerBtn, reported && s.headerBtnDone]}
          >
            <Text style={[s.headerBtnText, reported && s.headerBtnDoneText]}>
              {reported ? 'reported' : 'report'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={doBlock}
            style={[s.headerBtnDanger, chatBlocked && s.headerBtnDone]}
          >
            <Text style={[s.headerBtnDangerText, chatBlocked && s.headerBtnDoneText]}>
              {chatBlocked ? 'blocked' : 'block'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={s.messageList}
          renderItem={({ item }) => {
            const isMine = me && item.sender_nickname === me.nickname;
            return (
              <View style={[s.bubble, isMine ? s.bubbleMine : s.bubbleTheirs]}>
                <Text style={[s.bubbleText, isMine ? s.bubbleTextMine : s.bubbleTextTheirs]}>
                  {item.text}
                </Text>
                <Text style={s.bubbleTime}>{formatTime(item.sent_at)}</Text>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={s.empty}>no messages yet · say hello!</Text>}
        />

        {chatBlocked ? (
          <View style={s.blockedBar}>
            <Text style={s.blockedBarText}>this chat has been blocked</Text>
          </View>
        ) : (
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              value={text}
              onChangeText={setText}
              placeholder="type a message..."
              placeholderTextColor={GRAY}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={doSend}
            />
            <TouchableOpacity style={s.sendBtn} onPress={doSend} disabled={sending || !text.trim()}>
              {sending
                ? <ActivityIndicator color={WHITE} size="small" />
                : <Text style={s.sendBtnText}>›</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      <FooterNav navigation={navigation} active="Radar" radarAlert={radarAlert} />

      <Modal visible={reportModal} transparent animationType="slide" onRequestClose={() => setReportModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>REPORT</Text>
            {REPORT_REASONS.map(r => (
              <TouchableOpacity
                key={r}
                style={[s.reasonRow, reportReason === r && s.reasonRowActive]}
                onPress={() => setReportReason(r)}
              >
                <Text style={[s.reasonText, reportReason === r && s.reasonTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
            <TextInput
              style={s.detailsInput}
              value={reportDetails}
              onChangeText={setReportDetails}
              placeholder="details (optional)"
              placeholderTextColor={GRAY}
              multiline
              maxLength={300}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={[s.modalBtn, { flex: 1, borderColor: '#ccc' }]}
                onPress={() => { setReportModal(false); setReportReason(''); setReportDetails(''); }}
              >
                <Text style={s.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, { flex: 1, backgroundColor: BLACK, borderColor: BLACK }]}
                onPress={doReport}
                disabled={!reportReason}
              >
                <Text style={[s.modalBtnText, { color: WHITE }]}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={blockModal} transparent animationType="slide" onRequestClose={() => setBlockModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>BLOCK CHAT</Text>
            <Text style={{ fontFamily: MONO, fontSize: 12, color: GRAY, marginBottom: 20, letterSpacing: 1 }}>
              Block this chat? This cannot be undone.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[s.modalBtn, { flex: 1, borderColor: '#ccc' }]} onPress={() => setBlockModal(false)}>
                <Text style={s.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, { flex: 1, backgroundColor: RED, borderColor: RED }]} onPress={doBlockConfirm}>
                <Text style={[s.modalBtnText, { color: WHITE }]}>Block</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: WHITE },
  loader:             { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:             { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingHorizontal: 12, paddingVertical: 10 },
  backBtn:            { marginRight: 12 },
  backText:           { fontFamily: MONO, fontSize: 13, color: BLACK, letterSpacing: 1 },
  headerNick:         { flex: 1, fontFamily: MONO, fontSize: 15, fontWeight: 'bold', letterSpacing: 2, color: BLACK },
  headerActions:      { flexDirection: 'row', gap: 8 },
  headerBtn:          { paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#ccc' },
  headerBtnText:      { fontFamily: MONO, fontSize: 10, color: GRAY, letterSpacing: 1 },
  headerBtnDanger:    { paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: RED },
  headerBtnDangerText:{ fontFamily: MONO, fontSize: 10, color: RED, letterSpacing: 1 },
  headerBtnDone:      { borderColor: '#eee', backgroundColor: '#fafafa' },
  headerBtnDoneText:  { color: '#ccc', textDecorationLine: 'line-through' },
  messageList:        { padding: 16, flexGrow: 1 },
  empty:              { fontFamily: MONO, fontSize: 11, color: GRAY, textAlign: 'center', marginTop: 40, letterSpacing: 1 },
  bubble:             { maxWidth: '80%', marginVertical: 4, padding: 10 },
  bubbleMine:         { alignSelf: 'flex-end', backgroundColor: BLACK },
  bubbleTheirs:       { alignSelf: 'flex-start', backgroundColor: '#f0f0f0' },
  bubbleText:         { fontFamily: MONO, fontSize: 13, lineHeight: 19 },
  bubbleTextMine:     { color: WHITE },
  bubbleTextTheirs:   { color: BLACK },
  bubbleTime:         { fontFamily: MONO, fontSize: 9, color: GRAY, marginTop: 4, textAlign: 'right' },
  inputRow:           { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#eee', padding: 10, alignItems: 'flex-end' },
  input:              { flex: 1, fontFamily: MONO, fontSize: 13, color: BLACK, borderWidth: 1, borderColor: '#ccc', paddingHorizontal: 10, paddingVertical: 8, maxHeight: 100 },
  sendBtn:            { backgroundColor: BLACK, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  sendBtnText:        { fontFamily: MONO, fontSize: 22, color: GREEN },
  blockedBar:         { padding: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee' },
  blockedBarText:     { fontFamily: MONO, fontSize: 11, color: GRAY, letterSpacing: 1 },
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard:          { backgroundColor: WHITE, borderTopWidth: 2, borderTopColor: BLACK, padding: 24 },
  modalTitle:         { fontFamily: MONO, fontSize: 12, letterSpacing: 4, color: BLACK, marginBottom: 16 },
  reasonRow:          { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  reasonRowActive:    { borderLeftWidth: 3, borderLeftColor: GREEN, paddingLeft: 10 },
  reasonText:         { fontFamily: MONO, fontSize: 13, color: GRAY, letterSpacing: 1 },
  reasonTextActive:   { color: BLACK, fontWeight: 'bold' },
  detailsInput:       { fontFamily: MONO, fontSize: 12, color: BLACK, borderWidth: 1, borderColor: '#ccc', padding: 10, minHeight: 60, marginTop: 12 },
  modalBtn:           { paddingVertical: 12, alignItems: 'center', borderWidth: 1 },
  modalBtnText:       { fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: BLACK },
});
