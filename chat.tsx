import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
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
import { getMe, getMessages, sendMessage, blockChat } from './api';
import { TopBar, EventContext } from './App';
import { FooterNav } from './search';

const WHITE = '#ffffff';
const BLACK = '#000000';
const GREEN = '#00ff41';
const GRAY  = '#999999';
const RED   = '#cc0000';
const MONO  = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

export default function ChatScreen({ route, navigation }: any) {
  const { chatId, nickname, photo, intro, isLeft } = route.params;
  const { radarAlert } = useContext(EventContext);

  const [me, setMe]                     = useState<any>(null);
  const [messages, setMessages]         = useState<any[]>([]);
  const [text, setText]                 = useState('');
  const [sending, setSending]           = useState(false);
  const [loading, setLoading]           = useState(true);
  const [chatBlocked, setChatBlocked]   = useState(false);
  const [chatLeft, setChatLeft]         = useState(isLeft || false);
  const [blockModal, setBlockModal]     = useState(false);
  const [timezone, setTimezone]         = useState('Europe/Vienna');

  const flatRef      = useRef<FlatList>(null);
  const pollRef      = useRef<any>(null);
  const stickerIdRef = useRef<number | null>(null);

  const init = useCallback(async () => {
    try {
      const [meD, msgD] = await Promise.all([
        getMe(),
        getMessages(chatId),
      ]);
      if (meD.success) {
        setMe(meD.participant);
        if (meD.participant.timezone) setTimezone(meD.participant.timezone);
        if (meD.participant.sticker_id) {
          stickerIdRef.current = meD.participant.sticker_id;
        }
      }
      if (msgD.success) setMessages(msgD.messages || []);
    } catch {}
    setLoading(false);
  }, [chatId]);

  const pollMessages = useCallback(async () => {
    try {
      const msgD = await getMessages(chatId);
      if (msgD.success) {
        setMessages(msgD.messages || []);
        if (msgD.chatStatus === 'blocked') setChatBlocked(true);
        if (msgD.chatStatus === 'left') setChatLeft(true);
      }
    } catch {}
  }, [chatId]);

  useEffect(() => {
    init();
    pollRef.current = setInterval(pollMessages, 2000);
    return () => clearInterval(pollRef.current);
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
    } catch {}
    setSending(false);
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
        {photo
          ? <Image source={{ uri: photo }} style={s.headerAvatar} />
          : <View style={s.headerAvatarPlaceholder}><Text style={s.headerAvatarLetter}>{nickname?.[0]?.toUpperCase()}</Text></View>
        }
        <View style={s.headerMid}>
          <Text style={s.headerNick}>{nickname}</Text>
          {intro ? <Text style={s.headerIntro} numberOfLines={1}>{intro}</Text> : null}
        </View>
        <View style={s.headerActions}>
          {!chatLeft && (
          <TouchableOpacity
            onPress={() => !chatBlocked && setBlockModal(true)}
            style={[s.headerBtnDanger, chatBlocked && s.headerBtnDone]}
          >
            <Text style={[s.headerBtnDangerText, chatBlocked && s.headerBtnDoneText]}>
              {chatBlocked ? 'blocked' : 'block'}
            </Text>
          </TouchableOpacity>
          )}
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

        {chatLeft ? (
          <View style={s.blockedBar}>
            <Text style={s.blockedBarText}>{nickname} has left the event. If this nickname logs in again, you can start a new chat, and this old chat window will disappear automatically.</Text>
          </View>
        ) : chatBlocked ? (
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
  header:             { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingHorizontal: 12, paddingVertical: 8 },
  backBtn:            { marginRight: 12 },
  backText:           { fontFamily: MONO, fontSize: 13, color: BLACK, letterSpacing: 1 },
  headerNick:         { fontFamily: MONO, fontSize: 13, fontWeight: 'bold', letterSpacing: 2, color: BLACK },
  headerIntro:        { fontFamily: MONO, fontSize: 10, color: GRAY, letterSpacing: 1 },
  headerMid:          { flex: 1, marginLeft: 8, justifyContent: 'center' },
  headerAvatar:       { width: 34, height: 34, borderRadius: 17, flexShrink: 0 },
  headerAvatarPlaceholder: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  headerAvatarLetter: { fontFamily: MONO, fontSize: 14, fontWeight: 'bold', color: GRAY },
  headerActions:      { flexDirection: 'row', gap: 8 },
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
  modalBtn:           { paddingVertical: 12, alignItems: 'center', borderWidth: 1 },
  modalBtnText:       { fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: BLACK },
});
