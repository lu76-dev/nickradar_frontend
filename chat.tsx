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
import { getMe, getMessages, sendMessage, blockChat, sendReport, checkReported } from './api';
import { TopBar } from './App';

const WHITE = '#ffffff';
const BLACK = '#000000';
const GREEN = '#00ff41';
const GRAY  = '#999999';
const RED   = '#cc0000';
const MONO  = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

const REPORT_REASONS = ['harassment', 'spam', 'inappropriate content', 'other'];

export default function ChatScreen({ route, navigation }: any) {
  const { chatId, nickname } = route.params;
  const [me, setMe]             = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText]         = useState('');
  const [sending, setSending]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [reportModal, setReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reported, setReported] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const flatRef = useRef<FlatList>(null);
  const pollRef = useRef<any>(null);

  const loadMessages = useCallback(async () => {
    try {
      const [meD, msgD, repD] = await Promise.all([getMe(), getMessages(chatId), checkReported(nickname)]);
      if (meD.success) setMe(meD.participant);
      if (msgD.success) {
        setMessages(msgD.messages || []);
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
      }
      if (repD.success && repD.reported) setReported(true);
    } catch {}
    setLoading(false);
  }, [chatId, nickname]);

  useEffect(() => {
    loadMessages();
    pollRef.current = setInterval(loadMessages, 5000);
    return () => clearInterval(pollRef.current);
  }, []);

  async function doSend() {
    const t = text.trim();
    if (!t) return;
    setSending(true);
    setText('');
    try {
      await sendMessage(chatId, t);
      await loadMessages();
    } catch {}
    setSending(false);
  }

  async function doBlock() {
    if (blocked) return;
    Alert.alert('Block Chat', 'Block this chat? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block', style: 'destructive', onPress: async () => {
        try {
          const d = await blockChat(chatId);
          if (d.success) {
            setBlocked(true);
            setTimeout(() => navigation.goBack(), 800);
          } else {
            Alert.alert('Error', d.error || 'Could not block chat.');
          }
        } catch {
          Alert.alert('Error', 'Connection error.');
        }
      }},
    ]);
  }

  async function doReport() {
    if (!reportReason) return;
    const d = await sendReport(nickname, reportReason, reportDetails);
    if (d.success || d.error === 'already reported') {
      setReported(true);
    }
    setReportModal(false);
    if (d.success) {
      Alert.alert('Reported', 'Your report has been submitted.');
    } else if (d.error === 'already reported') {
      Alert.alert('Already reported', 'You have already reported this participant.');
    } else {
      Alert.alert('Error', d.error || 'Could not submit report.');
    }
  }

  function formatTime(str: string) {
    return new Date(str).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  if (loading) {
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <TopBar />
        <View style={s.loader}><ActivityIndicator color={GREEN} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <TopBar />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>‹ back</Text>
        </TouchableOpacity>
        <Text style={s.headerNick}>{nickname}</Text>
        <View style={s.headerActions}>
          <TouchableOpacity onPress={() => !reported && setReportModal(true)} style={[s.headerBtn, reported && s.headerBtnReported]}>
            <Text style={[s.headerBtnText, reported && s.headerBtnReportedText]}>{reported ? 'reported' : 'report'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={doBlock} style={[s.headerBtnDanger, blocked && s.headerBtnBlocked]}>
            <Text style={[s.headerBtnDangerText, blocked && s.headerBtnBlockedText]}>{blocked ? 'blocked' : 'block'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={s.messageList}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const isMine = me && item.sender_nickname === me.nickname;
            return (
              <View style={[s.bubble, isMine ? s.bubbleMine : s.bubbleTheirs]}>
                <Text style={[s.bubbleText, isMine ? s.bubbleTextMine : s.bubbleTextTheirs]}>{item.text}</Text>
                <Text style={s.bubbleTime}>{formatTime(item.sent_at)}</Text>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={s.empty}>no messages yet · say hello!</Text>}
        />

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
            {sending ? <ActivityIndicator color={WHITE} size="small" /> : <Text style={s.sendBtnText}>›</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={reportModal} transparent animationType="slide" onRequestClose={() => setReportModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>REPORT</Text>
            {REPORT_REASONS.map(r => (
              <TouchableOpacity key={r} style={[s.reasonRow, reportReason === r && s.reasonRowActive]} onPress={() => setReportReason(r)}>
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
              <TouchableOpacity style={[s.modalBtn, { flex: 1, borderColor: '#ccc' }]} onPress={() => setReportModal(false)}>
                <Text style={s.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, { flex: 1, backgroundColor: BLACK, borderColor: BLACK }]} onPress={doReport} disabled={!reportReason}>
                <Text style={[s.modalBtnText, { color: WHITE }]}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: WHITE },
  loader:            { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:            { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingHorizontal: 12, paddingVertical: 10 },
  backBtn:           { marginRight: 12 },
  backText:          { fontFamily: MONO, fontSize: 13, color: BLACK, letterSpacing: 1 },
  headerNick:        { flex: 1, fontFamily: MONO, fontSize: 15, fontWeight: 'bold', letterSpacing: 2, color: BLACK },
  headerActions:     { flexDirection: 'row', gap: 8 },
  headerBtn:         { paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#ccc' },
  headerBtnText:     { fontFamily: MONO, fontSize: 10, color: GRAY, letterSpacing: 1 },
  headerBtnReported: { borderColor: '#eee', backgroundColor: '#fafafa' },
  headerBtnReportedText: { color: '#bbb', textDecorationLine: 'line-through' },
  headerBtnBlocked: { borderColor: '#eee', backgroundColor: '#fafafa' },
  headerBtnBlockedText: { color: '#bbb', textDecorationLine: 'line-through' },
  headerBtnDanger:   { paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: RED },
  headerBtnDangerText:{ fontFamily: MONO, fontSize: 10, color: RED, letterSpacing: 1 },
  messageList:       { padding: 16, flexGrow: 1 },
  empty:             { fontFamily: MONO, fontSize: 11, color: GRAY, textAlign: 'center', marginTop: 40, letterSpacing: 1 },
  bubble:            { maxWidth: '80%', marginVertical: 4, padding: 10 },
  bubbleMine:        { alignSelf: 'flex-end', backgroundColor: BLACK },
  bubbleTheirs:      { alignSelf: 'flex-start', backgroundColor: '#f0f0f0' },
  bubbleText:        { fontFamily: MONO, fontSize: 13, lineHeight: 19 },
  bubbleTextMine:    { color: WHITE },
  bubbleTextTheirs:  { color: BLACK },
  bubbleTime:        { fontFamily: MONO, fontSize: 9, color: GRAY, marginTop: 4, textAlign: 'right' },
  inputRow:          { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#eee', padding: 10, alignItems: 'flex-end' },
  input:             { flex: 1, fontFamily: MONO, fontSize: 13, color: BLACK, borderWidth: 1, borderColor: '#ccc', paddingHorizontal: 10, paddingVertical: 8, maxHeight: 100 },
  sendBtn:           { backgroundColor: BLACK, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  sendBtnText:       { fontFamily: MONO, fontSize: 22, color: GREEN },
  modalOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard:         { backgroundColor: WHITE, borderTopWidth: 2, borderTopColor: BLACK, padding: 24 },
  modalTitle:        { fontFamily: MONO, fontSize: 12, letterSpacing: 4, color: BLACK, marginBottom: 16 },
  reasonRow:         { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  reasonRowActive:   { borderLeftWidth: 3, borderLeftColor: GREEN, paddingLeft: 10 },
  reasonText:        { fontFamily: MONO, fontSize: 13, color: GRAY, letterSpacing: 1 },
  reasonTextActive:  { color: BLACK, fontWeight: 'bold' },
  detailsInput:      { fontFamily: MONO, fontSize: 12, color: BLACK, borderWidth: 1, borderColor: '#ccc', padding: 10, minHeight: 60, marginTop: 12 },
  modalBtn:          { paddingVertical: 12, alignItems: 'center', borderWidth: 1 },
  modalBtnText:      { fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: BLACK },
});
