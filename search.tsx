import React, { useState, useRef, useCallback, useContext } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';
import { searchParticipants, getParticipantProfile, startChat } from './api';
import { TopBar, EventContext } from './App';

const WHITE    = '#ffffff';
const BLACK    = '#000000';
const GREEN    = '#00ff41';
const GRAY     = '#999999';
const GRAY_BG  = '#f0f0f0';
const MONO     = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

export function FooterNav({ navigation, active, radarAlert: radarAlertProp = false }: { navigation: any; active: string; radarAlert?: boolean }) {
  const { radarAlert: radarAlertCtx } = useContext(EventContext);
  const radarAlert = radarAlertCtx || radarAlertProp;
  const items = [
    { label: 'radar',  screen: 'Radar'  },
    { label: 'search', screen: 'Search' },
    { label: 'mynick', screen: 'MyNick' },
  ];
  return (
    <View style={fn.container}>
      {items.map(item => (
        <TouchableOpacity
          key={item.label}
          style={[fn.tab, active === item.screen && fn.tabActive]}
          onPress={() => {
            if (item.screen === active && item.screen !== 'Radar') return;
            navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: item.screen }] }));
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[fn.label, active === item.screen && fn.labelActive]}>{item.label}</Text>
            {item.screen === 'Radar' && radarAlert ? <View style={fn.dot} /> : null}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const fn = StyleSheet.create({
  container:  { flexDirection: 'row', borderTopWidth: 2, borderTopColor: BLACK, backgroundColor: WHITE },
  tab:        { flex: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  tabActive:  { backgroundColor: BLACK },
  label:      { fontFamily: MONO, fontSize: 13, letterSpacing: 2, color: GRAY, fontWeight: 'bold' },
  labelActive:{ color: WHITE },
  dot:       { backgroundColor: '#cc0000', borderRadius: 5, width: 10, height: 10, marginLeft: 4 },
});

export default function SearchScreen({ navigation }: any) {
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [profile, setProfile]     = useState<any>(null);
  const [message, setMessage]     = useState('');
  const [sending, setSending]     = useState(false);
  const [sendResult, setSendResult] = useState('');
  const searchTimer = useRef<any>(null);

  const doSearch = useCallback((q: string) => {
    if (q.length < 3) { setResults([]); return; }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const d = await searchParticipants(q);
        if (d.success) setResults(d.participants || []);
      } catch {}
      setLoading(false);
    }, 300);
  }, []);

  async function openProfile(nickname: string) {
    try {
      const d = await getParticipantProfile(nickname);
      if (d.success) { setProfile(d.participant); setSendResult(''); setMessage(''); }
    } catch {}
  }

  async function doSend() {
    if (!message.trim() || message.length < 2) { setSendResult('Min. 2 characters.'); return; }
    setSending(true);
    try {
      const d = await startChat(profile.nickname, message.trim());
      if (d.success) {
        setProfile(null);
        setMessage('');
        navigation.navigate('Chat', { chatId: d.chat_id, nickname: profile.nickname, photo: profile.photo_url || null, intro: profile.intro || null });
      } else {
        setSendResult(d.error || 'Error.');
      }
    } catch { setSendResult('Connection error.'); }
    setSending(false);
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <TopBar navigation={navigation} />
      <View style={s.searchBar}>
        <TextInput
          style={s.searchInput}
          value={query}
          onChangeText={v => { setQuery(v); doSearch(v); }}
          placeholder="search nickname..."
          placeholderTextColor={GRAY}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {loading && <ActivityIndicator color={GREEN} style={{ marginLeft: 8 }} />}
      </View>

      <ScrollView style={s.results} keyboardShouldPersistTaps="handled">
        {query.length >= 3 && results.length === 0 && !loading && (
          <Text style={s.empty}>no results</Text>
        )}
        {results.map(r => (
          <TouchableOpacity key={r.nickname} style={s.resultRow} onPress={() => openProfile(r.nickname)}>
            {r.photo_url
              ? <Image source={{ uri: r.photo_url }} style={s.avatar} />
              : <View style={s.avatarPlaceholder}><Text style={s.avatarLetter}>{r.nickname?.[0]?.toUpperCase()}</Text></View>
            }
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.resultNick}>{r.nickname}</Text>
              {r.intro ? <Text style={s.resultIntro} numberOfLines={1}>{r.intro}</Text> : null}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FooterNav navigation={navigation} active="Search" />

      <Modal visible={!!profile} transparent animationType="slide" onRequestClose={() => setProfile(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <TouchableOpacity style={s.modalClose} onPress={() => setProfile(null)}>
              <Text style={s.modalCloseText}>✕</Text>
            </TouchableOpacity>
            {profile && (
              <>
                <View style={s.profileHeader}>
                  {profile.photo_url
                    ? <Image source={{ uri: profile.photo_url }} style={s.photo} />
                    : <View style={s.photoPlaceholder}><Text style={s.photoPlaceholderText}>{profile.nickname?.[0]?.toUpperCase()}</Text></View>
                  }
                  <View style={s.profileHeaderText}>
                    <Text style={s.profileNick}>{profile.nickname}</Text>
                    {profile.intro ? <Text style={s.profileIntro}>{profile.intro}</Text> : null}
                  </View>
                </View>
                <View style={s.divider} />
                <TextInput
                  style={s.requestInput}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="write a message..."
                  placeholderTextColor={GRAY}
                  multiline
                  maxLength={200}
                />
                {sendResult ? (
                  <Text style={[s.sendResult, sendResult === 'Request sent!' && { color: 'green' }]}>
                    {sendResult}
                  </Text>
                ) : null}
                <TouchableOpacity style={s.sendBtn} onPress={doSend} disabled={sending}>
                  {sending ? <ActivityIndicator color={BLACK} /> : <Text style={s.sendBtnText}>CHAT</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:                { flex: 1, backgroundColor: WHITE },
  searchBar:           { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingHorizontal: 16, paddingVertical: 14 },
  searchInput:         { flex: 1, fontFamily: MONO, fontSize: 14, color: BLACK, letterSpacing: 1, borderWidth: 0, outlineWidth: 0 },
  results:             { flex: 1 },
  empty:               { fontFamily: MONO, fontSize: 11, color: GRAY, textAlign: 'center', marginTop: 40, letterSpacing: 2 },
  resultRow:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  resultNick:          { fontFamily: MONO, fontSize: 16, fontWeight: 'bold', letterSpacing: 2, color: BLACK, marginRight: 12 },
  resultIntro:        { fontFamily: MONO, fontSize: 11, color: GRAY, flex: 1 },
  modalOverlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard:           { backgroundColor: WHITE, borderTopWidth: 2, borderTopColor: BLACK, padding: 24, minHeight: 400 },
  modalClose:          { position: 'absolute', top: 16, right: 16, zIndex: 1 },
  modalCloseText:      { fontFamily: MONO, fontSize: 16, color: BLACK },
  photo:               { width: 80, height: 80, borderRadius: 40, alignSelf: 'center', marginBottom: 12 },
  photoPlaceholder:    { width: 80, height: 80, borderRadius: 40, backgroundColor: GRAY_BG, alignSelf: 'center', marginBottom: 12, alignItems: 'center', justifyContent: 'center' },
  photoPlaceholderText:{ fontFamily: MONO, fontSize: 28, fontWeight: 'bold', color: BLACK },
  profileNick:         { fontFamily: MONO, fontSize: 18, fontWeight: 'bold', letterSpacing: 2, color: BLACK, marginBottom: 4 },
  profileIntro:       { fontFamily: MONO, fontSize: 11, color: GRAY, letterSpacing: 1 },
  divider:             { height: 1, backgroundColor: '#eee', marginVertical: 16 },
  requestInput:        { fontFamily: MONO, fontSize: 13, color: BLACK, borderWidth: 1, borderColor: '#ccc', padding: 10, minHeight: 80, marginBottom: 8 },
  sendResult:          { fontFamily: MONO, fontSize: 11, color: '#cc0000', marginBottom: 8, letterSpacing: 1 },
  sendBtn:             { backgroundColor: BLACK, paddingVertical: 12, alignItems: 'center' },
  sendBtnText:         { fontFamily: MONO, fontSize: 12, color: WHITE, letterSpacing: 3 },
  avatar:              { width: 40, height: 40, borderRadius: 20, flexShrink: 0 },
  avatarPlaceholder:   { width: 40, height: 40, borderRadius: 20, backgroundColor: GRAY_BG, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarLetter:        { fontFamily: MONO, fontSize: 16, fontWeight: 'bold', color: BLACK },
  profileHeader:       { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  profileHeaderText:   { flex: 1, marginLeft: 14 },
});
