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

export default function RadarScreen({ navigation }: any) {
  const { setRadarAlert } = useContext(EventContext);
  const [chats, setChats]           = useState<any[]>([]);
  const [myStickerId, setMyStickerId] = useState<number | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef<any>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [c, meD] = await Promise.all([getChats(), getMe()]);
      if (meD.success && meD.participant?.sticker_id) setMyStickerId(meD.participant.sticker_id);
      if (c.success) {
        setChats(c.chats || []);
        const hasAlert = (c.chats || []).some((ch: any) => ch.status === 'active' && ch.last_sender_id && ch.last_sender_id !== meD.participant?.sticker_id);
        setRadarAlert(hasAlert);
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

  function renderList() {
    if (!chats.length) return <Text style={s.empty}>no chats yet</Text>;
    return (
      <>
        {chats.map(c => {
          const isActive   = c.status === 'active';
          const isLeft     = c.status === 'left';
          const isBlocked  = c.status === 'blocked';
          const hasAlert   = isActive && c.last_sender_id && c.last_sender_id !== myStickerId;

          if (isBlocked) {
            return (
              <View key={c.id} style={[s.row, s.rowBlocked]}>
                <View style={[s.avatarPlaceholder, { backgroundColor: '#e8e8e8' }]}>
                  <Text style={s.avatarLetter}>{c.other_nickname?.[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[s.nick, { color: GRAY }]}>{c.other_nickname}</Text>
                </View>
                <Text style={s.blockedLabel}>{c.blocked_label || 'blocked'}</Text>
              </View>
            );
          }

          if (isLeft) {
            return (
              <TouchableOpacity key={c.id} style={[s.row, s.rowLeft]} onPress={() => navigation.navigate('Chat', { chatId: c.id, nickname: c.other_nickname, photo: null, intro: null, isLeft: true })}>
                <View style={[s.avatarPlaceholder, { backgroundColor: '#e8e8e8' }]}>
                  <Text style={s.avatarLetter}>{c.other_nickname?.[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[s.nick, { color: GRAY }]}>{c.other_nickname}</Text>
                  <Text style={s.sub}>has left the event</Text>
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity key={c.id} style={s.row} onPress={() => navigation.navigate('Chat', { chatId: c.id, nickname: c.other_nickname, photo: c.other_photo, intro: c.other_intro })}>
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
      </>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <TopBar navigation={navigation} />
      {loading ? (
        <View style={s.loader}><ActivityIndicator color={GREEN} /></View>
      ) : (
        <ScrollView
          style={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={GREEN} />}
        >
          {renderList()}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
      <FooterNav navigation={navigation} active="Radar" />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: WHITE },
  loader:            { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:            { flex: 1 },
  empty:             { fontFamily: MONO, fontSize: 11, color: GRAY, textAlign: 'center', marginTop: 40, letterSpacing: 2 },
  row:               { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  rowLeft:           { opacity: 0.5 },
  rowBlocked:        { opacity: 0.4 },
  nick:              { fontFamily: MONO, fontSize: 15, fontWeight: 'bold', letterSpacing: 2, color: BLACK, marginBottom: 2 },
  sub:               { fontFamily: MONO, fontSize: 10, color: GRAY, letterSpacing: 1 },
  arrowWrap:         { paddingLeft: 12 },
  arrow:             { fontFamily: MONO, fontSize: 22, color: GRAY },
  chatDot:           { backgroundColor: RED, borderRadius: 5, width: 10, height: 10, marginLeft: 8, marginBottom: 2 },
  blockedLabel:      { fontFamily: MONO, fontSize: 10, color: GRAY, letterSpacing: 1 },
  avatar:            { width: 40, height: 40, borderRadius: 20, flexShrink: 0 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarLetter:      { fontFamily: MONO, fontSize: 16, fontWeight: 'bold', color: GRAY },
});
