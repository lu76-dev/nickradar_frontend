import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getChats, getIncoming, getOutgoing, getHistory, getBlockedChats, answerRequest, getMe } from './api';
import { FooterNav } from './search';
import { TopBar } from './App';

const WHITE     = '#ffffff';
const BLACK     = '#000000';
const GREEN     = '#00ff41';
const GREEN_DIM = '#2a6a2a';
const GRAY      = '#999999';
const RED       = '#cc0000';
const MONO      = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

type Tab = 'chats' | 'incoming' | 'outgoing' | 'history';

function Badge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <View style={b.badge}>
      <Text style={b.badgeText}>{count}</Text>
    </View>
  );
}

const b = StyleSheet.create({
  badge:     { backgroundColor: RED, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 4, paddingHorizontal: 4 },
  badgeText: { fontFamily: MONO, fontSize: 9, color: WHITE, fontWeight: 'bold' },
});



export default function RadarScreen({ navigation }: any) {
  const [tab, setTab]           = useState<Tab>('chats');
  const [chats, setChats]       = useState<any[]>([]);
  const [incoming, setIncoming] = useState<any[]>([]);
  const [outgoing, setOutgoing] = useState<any[]>([]);
  const [history, setHistory]         = useState<any[]>([]);
  const [blockedChats, setBlockedChats] = useState<any[]>([]);
  const [timezone, setTimezone] = useState('Europe/Vienna');
  const [loading, setLoading]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  function formatDate(str: string) {
    try {
      const d = new Date(str);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: timezone }) +
        ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: timezone });
    } catch {
      return new Date(str).toLocaleString('en-GB');
    }
  }

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [c, i, o, h, bc, meD] = await Promise.all([getChats(), getIncoming(), getOutgoing(), getHistory(), getBlockedChats(), getMe()]);
      if (meD.success && meD.participant?.timezone) setTimezone(meD.participant.timezone);
      if (c.success) setChats(c.chats || []);
      if (i.success) setIncoming(i.requests || []);
      if (o.success) setOutgoing(o.requests || []);
      if (h.success) setHistory(h.requests || []);
      if (bc.success) setBlockedChats(bc.chats || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, []);

  async function doAnswer(id: number, status: 'yes' | 'no') {
    await answerRequest(id, status);
    load(true);
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'chats',    label: 'chats',    count: chats.length    },
    { key: 'incoming', label: 'incoming', count: incoming.length },
    { key: 'outgoing', label: 'outgoing', count: outgoing.length },
    { key: 'history',  label: 'history'                          },
  ];

  function renderChats() {
    if (!chats.length) return <Text style={s.empty}>no active chats</Text>;
    return chats.map(c => (
      <TouchableOpacity key={c.id} style={s.row} onPress={() => navigation.navigate('Chat', { chatId: c.id, nickname: c.other_nickname })}>
        <View style={{ flex: 1 }}>
          <Text style={s.nick}>{c.other_nickname}</Text>
          {c.last_message ? <Text style={s.sub} numberOfLines={1}>{c.last_message}</Text> : null}
        </View>
        <View style={s.arrowWrap}><Text style={s.arrow}>›</Text></View>
      </TouchableOpacity>
    ));
  }

  function renderIncoming() {
    if (!incoming.length) return <Text style={s.empty}>no incoming requests</Text>;
    return incoming.map(r => (
      <View key={r.id} style={s.row}>
        <View style={{ flex: 1 }}>
          <Text style={s.nick}>{r.seeker_nickname}</Text>
          <Text style={s.message} numberOfLines={2}>{r.message}</Text>
        </View>
        <View style={s.answerBtns}>
          <TouchableOpacity style={s.yesBtn} onPress={() => doAnswer(r.id, 'yes')}>
            <Text style={s.yesBtnText}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.noBtn} onPress={() => doAnswer(r.id, 'no')}>
            <Text style={s.noBtnText}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>
    ));
  }

  function renderOutgoing() {
    if (!outgoing.length) return <Text style={s.empty}>no outgoing requests</Text>;
    return outgoing.map(r => (
      <View key={r.id} style={s.row}>
        <View style={{ flex: 1 }}>
          <Text style={s.nick}>{r.target_nickname}</Text>
          <Text style={s.message} numberOfLines={2}>{r.message}</Text>
        </View>
        <Text style={s.statusPending}>pending</Text>
      </View>
    ));
  }

  function renderHistory() {
    const hasHistory = history.length > 0;
    const hasBlocked = blockedChats.length > 0;
    if (!hasHistory && !hasBlocked) return <Text style={s.empty}>no history yet</Text>;
    return (
      <>
        {blockedChats.map(bc => (
          <View key={'bc-' + bc.id} style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.nick}>{bc.other_nickname}</Text>
              <Text style={s.sub}>{formatDate(bc.blocked_at)}</Text>
            </View>
            <Text style={[s.statusLabel, { color: RED }]}>{bc.blocked_label}</Text>
          </View>
        ))}
        {history.map((r, i) => {
          const statusColor = r.status === 'yes' ? GREEN : r.status === 'no' ? RED : GRAY;
          return (
            <View key={i} style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.nick}>{r.target_nickname || r.seeker_nickname}</Text>
                <Text style={s.sub}>{formatDate(r.sent_at)}</Text>
              </View>
              <Text style={[s.statusLabel, { color: statusColor }]}>{r.status}</Text>
            </View>
          );
        })}
      </>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <TopBar navigation={navigation} />
      <View style={s.tabRow}>
        {tabs.map(t => (
          <TouchableOpacity key={t.key} style={[s.tabBtn, tab === t.key && s.tabBtnActive]} onPress={() => setTab(t.key)}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[s.tabLabel, tab === t.key && s.tabLabelActive]}>{t.label}</Text>
              {t.count ? <Badge count={t.count} /> : null}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.loader}><ActivityIndicator color={GREEN} /></View>
      ) : (
        <ScrollView
          style={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={GREEN} />}
        >
          {tab === 'chats'    && renderChats()}
          {tab === 'incoming' && renderIncoming()}
          {tab === 'outgoing' && renderOutgoing()}
          {tab === 'history'  && renderHistory()}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      <FooterNav navigation={navigation} active="Radar" />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: WHITE },
  tabRow:       { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: BLACK },
  tabBtn:       { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: BLACK },
  tabLabel:     { fontFamily: MONO, fontSize: 10, letterSpacing: 1, color: GRAY },
  tabLabelActive:{ color: WHITE },
  loader:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:       { flex: 1 },
  empty:        { fontFamily: MONO, fontSize: 11, color: GRAY, textAlign: 'center', marginTop: 40, letterSpacing: 2 },
  row:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  nick:         { fontFamily: MONO, fontSize: 15, fontWeight: 'bold', letterSpacing: 2, color: BLACK, marginBottom: 2 },
  sub:          { fontFamily: MONO, fontSize: 10, color: GRAY, letterSpacing: 1 },
  message:      { fontFamily: MONO, fontSize: 11, color: '#555', marginTop: 2, lineHeight: 16 },
  arrowWrap:    { paddingLeft: 12 },
  arrow:        { fontFamily: MONO, fontSize: 22, color: GRAY },
  answerBtns:   { flexDirection: 'row', gap: 8 },
  yesBtn:       { backgroundColor: GREEN, paddingHorizontal: 14, paddingVertical: 8 },
  yesBtnText:   { fontFamily: MONO, fontSize: 12, fontWeight: 'bold', color: BLACK, letterSpacing: 1 },
  noBtn:        { backgroundColor: WHITE, borderWidth: 1, borderColor: '#ccc', paddingHorizontal: 14, paddingVertical: 8 },
  noBtnText:    { fontFamily: MONO, fontSize: 12, color: '#666', letterSpacing: 1 },
  statusPending:{ fontFamily: MONO, fontSize: 10, color: GRAY, letterSpacing: 1 },
  statusLabel:  { fontFamily: MONO, fontSize: 11, letterSpacing: 1 },
});
