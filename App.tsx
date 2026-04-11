import React, { useState, useEffect, createContext, useContext } from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getSessionToken, getMe, clearSession, getChats, getIncoming } from './api';
import AuthScreen from './auth';
import SearchScreen from './search';
import RadarScreen from './radar';
import MyNickScreen from './mynick';
import ChatScreen from './chat';

const Stack = createNativeStackNavigator();

const WHITE = '#ffffff';
const BLACK = '#000000';
const GREEN = '#00ff41';
const RED   = '#cc0000';
const GRAY  = '#999999';
const MONO  = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

export const EventContext = createContext<{
  event: { event_name: string; ends_at: string } | null;
  setEvent: (e: { event_name: string; ends_at: string } | null) => void;
  radarAlert: boolean;
  setRadarAlert: (v: boolean) => void;
}>({ event: null, setEvent: () => {}, radarAlert: false, setRadarAlert: () => {} });

function useCountdown(endsAt: string | undefined) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setRemaining(Math.max(0, new Date(endsAt).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return remaining;
}

export function TopBar({ navigation }: { navigation?: any }) {
  const { event, setEvent } = useContext(EventContext);
  const remaining = useCountdown(event?.ends_at);

  if (!event) return null;

  const h   = Math.floor(remaining / 3600000);
  const m   = Math.floor((remaining % 3600000) / 60000);
  const sec = Math.floor((remaining % 60000) / 1000);
  const timeStr  = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  const isUrgent = remaining < 10 * 60 * 1000 && remaining > 0;
  const isEnded  = remaining === 0;

  function doLeave() {
    clearSession();
    setEvent(null);
    if (navigation) navigation.replace('Auth');
  }

  return (
    <View style={ts.bar}>
      <Image source={{ uri: 'https://app.nickradar.com/nr_logo.png' }} style={ts.logo} resizeMode="contain" />
      <Text style={ts.nameLabel}>EVENT: </Text><Text style={ts.name} numberOfLines={1}>{event.event_name}</Text>
      <Text style={[ts.countdown, isUrgent && ts.urgent, isEnded && ts.ended]}>
        {isEnded ? 'ENDED' : timeStr}
      </Text>
      {navigation ? (
        <TouchableOpacity onPress={doLeave} style={ts.leaveBtn}>
          <Text style={ts.leaveTxt}>leave</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const ts = StyleSheet.create({
  bar:       { backgroundColor: WHITE, borderBottomWidth: 2, borderBottomColor: BLACK, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  logo:      { width: 22, height: 22, flexShrink: 0 },
  nameLabel: { fontFamily: MONO, fontSize: 12, fontWeight: 'normal', letterSpacing: 1, color: GRAY, flexShrink: 0 },
  name:      { fontFamily: MONO, fontSize: 12, fontWeight: 'bold', letterSpacing: 1, color: BLACK, flex: 1 },
  namePrefix:{ fontWeight: 'normal', color: GRAY },
  countdown: { fontFamily: MONO, fontSize: 12, fontWeight: 'bold', letterSpacing: 1, color: GREEN, flexShrink: 0 },
  urgent:    { color: RED },
  ended:     { color: RED },
  leaveBtn:  { paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#ccc', flexShrink: 0 },
  leaveTxt:  { fontFamily: MONO, fontSize: 10, color: GRAY, letterSpacing: 1 },
});

export default function App() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);
  const [event, setEvent] = useState<{ event_name: string; ends_at: string } | null>(null);
  const [radarAlert, setRadarAlert] = useState(false);
  const stickerIdRef = React.useRef<number | null>(null);

  useEffect(() => {
    if (!event) return;
    const poll = async () => {
      try {
        const meD = await getMe();
        if (meD.success && meD.participant?.sticker_id) stickerIdRef.current = meD.participant.sticker_id;
        const [chatsD, incomingD] = await Promise.all([getChats(), getIncoming()]);
        const chats = chatsD.success ? (chatsD.chats || []) : [];
        const incoming = incomingD.success ? (incomingD.requests || []) : [];
        const hasAlert = incoming.length > 0 || chats.some((ch: any) => ch.last_sender_id && ch.last_sender_id !== stickerIdRef.current);
        setRadarAlert(hasAlert);
      } catch {}
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [event]);

  useEffect(() => {
    const token = getSessionToken();
    if (!token) { setInitialRoute('Auth'); return; }
    getMe().then(d => {
      if (d.success) {
        setEvent({ event_name: d.participant.event_name, ends_at: d.participant.ends_at });
        setInitialRoute('Radar');
      } else {
        clearSession();
        setInitialRoute('Auth');
      }
    }).catch(() => setInitialRoute('Auth'));
  }, []);

  if (!initialRoute) return <View style={{ flex: 1, backgroundColor: WHITE }} />;

  return (
    <EventContext.Provider value={{ event, setEvent, radarAlert, setRadarAlert }}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: WHITE }, animation: 'none' }}
        >
          <Stack.Group>
            <Stack.Screen name="Auth"    component={AuthScreen}    />
            <Stack.Screen name="Radar"   component={RadarScreen}   />
            <Stack.Screen name="Search"  component={SearchScreen}  />
            <Stack.Screen name="MyNick"  component={MyNickScreen}  />
          </Stack.Group>
          <Stack.Group screenOptions={{ presentation: 'containedTransparentModal', animation: 'none' }}>
            <Stack.Screen name="Chat"    component={ChatScreen}    />
          </Stack.Group>
        </Stack.Navigator>
      </NavigationContainer>
    </EventContext.Provider>
  );
}
