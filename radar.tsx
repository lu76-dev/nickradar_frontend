import React, { useEffect, useRef, useState, useCallback, useContext } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getChats, getMe } from './api';
import { FooterNav } from './search';
import { TopBar, EventContext } from './App';

const WHITE = '#ffffff';
const BLACK = '#000000';
const GREEN = '#00ff41';
const GRAY  = '#999999';
const RED   = '#cc0000';
const MONO  = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

type Tab = 'chats' | 'map';

export default function RadarScreen({ navigation }: any) {
  const { setRadarAlert } = useContext(EventContext);
  const [tab, setTab]                 = useState<Tab>('chats');
  const [chats, setChats]             = useState<any[]>([]);
  const [myStickerId, setMyStickerId] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const pollRef = useRef<any>(null);

  const myIdRef = useRef<number | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (!myIdRef.current) {
        const meD = await getMe();
        if (meD.success && meD.participant?.sticker_id) {
          myIdRef.current = meD.participant.sticker_id;
          setMyStickerId(meD.participant.sticker_id);
        }
      }
      const c = await getChats();
      if (c.success) {
        const allChats = c.chats || [];
        setChats(allChats);
        const unread = allChats.filter((ch: any) =>
          ch.status === 'active' && ch.last_sender_id && ch.last_sender_id !== myIdRef.current
        ).length;
        setUnreadCount(unread);
        setRadarAlert(unread > 0);
      }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), 2000);
    return () => clearInterval(pollRef.current);
  }, []);

  function renderChats() {
    const activeChats  = chats.filter(c => c.status === 'active');
    const leftChats    = chats.filter(c => c.status === 'left');
    const blockedChats = chats.filter(c => c.status === 'blocked');
    const isEmpty = !activeChats.length && !leftChats.length && !blockedChats.length;
    if (isEmpty) return <Text style={s.empty}>no chats yet</Text>;
    return (
      <>
        {activeChats.map(c => {
          const hasAlert = c.last_sender_id && c.last_sender_id !== myStickerId;
          return (
            <TouchableOpacity
              key={c.id}
              style={s.row}
              onPress={() => navigation.navigate('Chat', { chatId: c.id, nickname: c.other_nickname, photo: c.other_photo, intro: c.other_intro })}
            >
              {c.other_photo
                ? <Image source={{ uri: c.other_photo }} style={s.avatar} />
                : <View style={s.avatarPlaceholder}><Text style={s.avatarLetter}>{c.other_nickname?.[0]?.toUpperCase()}</Text></View>
              }
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={s.nick}>{c.other_nickname}</Text>
                  {hasAlert ? <View style={s.chatDot} /> : null}
                </View>
                {c.other_intro ? <Text style={s.sub} numberOfLines={1}>{c.other_intro}</Text> : null}
              </View>
              <View style={s.arrowWrap}><Text style={s.arrow}>›</Text></View>
            </TouchableOpacity>
          );
        })}

        {leftChats.map(c => (
          <TouchableOpacity
            key={c.id}
            style={[s.row, s.rowDimmed]}
            onPress={() => navigation.navigate('Chat', { chatId: c.id, nickname: c.other_nickname, photo: null, intro: null, isLeft: true })}
          >
            <View style={[s.avatarPlaceholder, { backgroundColor: '#e8e8e8' }]}>
              <Text style={s.avatarLetter}>{c.other_nickname?.[0]?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[s.nick, { color: GRAY }]}>{c.other_nickname}</Text>
              <Text style={s.sub}>has left the event</Text>
            </View>
          </TouchableOpacity>
        ))}

        {blockedChats.map(c => (
          <View key={c.id} style={[s.row, s.rowDimmed]}>
            <View style={[s.avatarPlaceholder, { backgroundColor: '#e8e8e8' }]}>
              <Text style={s.avatarLetter}>{c.other_nickname?.[0]?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[s.nick, { color: GRAY }]}>{c.other_nickname}</Text>
            </View>
            <Text style={s.blockedLabel}>{c.blocked_label || 'blocked'}</Text>
          </View>
        ))}
      </>
    );
  }

  function renderMap() {
    return (
      <View style={s.comingSoon}>
        <Text style={s.comingSoonIcon}>◉</Text>
        <Text style={s.comingSoonTitle}>MAP</Text>
        <Text style={s.comingSoonSub}>coming soon</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <TopBar navigation={navigation} />

      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tabBtn, tab === 'chats' && s.tabBtnActive]} onPress={() => setTab('chats')}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[s.tabLabel, tab === 'chats' && s.tabLabelActive]}>chats</Text>
            {unreadCount > 0 && (
              <View style={s.badge}><Text style={s.badgeTxt}>{unreadCount}</Text></View>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabBtn, tab === 'map' && s.tabBtnActive]} onPress={() => setTab('map')}>
          <Text style={[s.tabLabel, tab === 'map' && s.tabLabelActive]}>map</Text>
        </TouchableOpacity>
      </View>

      {tab === 'chats' ? (
        loading ? (
          <View style={s.loader}><ActivityIndicator color={GREEN} /></View>
        ) : (
          <ScrollView
            style={s.scroll}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={GREEN} />}
          >
            {renderChats()}
            <View style={{ height: 20 }} />
          </ScrollView>
        )
      ) : (
        renderMap()
      )}

      <FooterNav navigation={navigation} active="Radar" />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: WHITE },
  tabRow:            { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: BLACK },
  tabBtn:            { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabBtnActive:      { backgroundColor: BLACK },
  tabLabel:          { fontFamily: MONO, fontSize: 10, letterSpacing: 1, color: GRAY, fontWeight: 'bold' },
  tabLabelActive:    { color: WHITE },
  badge:             { backgroundColor: RED, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 4, paddingHorizontal: 4 },
  badgeTxt:          { fontFamily: MONO, fontSize: 9, color: WHITE, fontWeight: 'bold' },
  loader:            { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:            { flex: 1 },
  empty:             { fontFamily: MONO, fontSize: 11, color: GRAY, textAlign: 'center', marginTop: 40, letterSpacing: 2 },
  row:               { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  rowDimmed:         { opacity: 0.45 },
  nick:              { fontFamily: MONO, fontSize: 15, fontWeight: 'bold', letterSpacing: 2, color: BLACK, marginBottom: 2 },
  sub:               { fontFamily: MONO, fontSize: 10, color: GRAY, letterSpacing: 1 },
  arrowWrap:         { paddingLeft: 12 },
  arrow:             { fontFamily: MONO, fontSize: 22, color: GRAY },
  chatDot:           { backgroundColor: RED, borderRadius: 5, width: 10, height: 10, marginLeft: 8, marginBottom: 2 },
  blockedLabel:      { fontFamily: MONO, fontSize: 10, color: GRAY, letterSpacing: 1 },
  avatar:            { width: 40, height: 40, borderRadius: 20, flexShrink: 0 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarLetter:      { fontFamily: MONO, fontSize: 16, fontWeight: 'bold', color: GRAY },
  comingSoon:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  comingSoonIcon:    { fontFamily: MONO, fontSize: 40, color: GREEN },
  comingSoonTitle:   { fontFamily: MONO, fontSize: 14, fontWeight: 'bold', letterSpacing: 4, color: BLACK },
  comingSoonSub:     { fontFamily: MONO, fontSize: 11, color: GRAY, letterSpacing: 2 },
});
