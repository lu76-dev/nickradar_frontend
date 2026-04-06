import React, { useState, useEffect, createContext, useContext } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getSessionToken, getMe, clearSession } from './api';
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
const MONO  = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

export const EventContext = createContext<{
  event: { event_name: string; ends_at: string } | null;
  setEvent: (e: { event_name: string; ends_at: string } | null) => void;
}>({ event: null, setEvent: () => {} });

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

export function TopBar() {
  const { event } = useContext(EventContext);
  const remaining  = useCountdown(event?.ends_at);

  if (!event) return null;

  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const sec = Math.floor((remaining % 60000) / 1000);
  const timeStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  const isUrgent = remaining < 10 * 60 * 1000 && remaining > 0;
  const isEnded  = remaining === 0;

  return (
    <View style={ts.bar}>
      <Text style={ts.name} numberOfLines={1}>{event.event_name}</Text>
      <Text style={[ts.countdown, isUrgent && ts.urgent, isEnded && ts.ended]}>
        {isEnded ? 'ENDED' : timeStr}
      </Text>
    </View>
  );
}

const ts = StyleSheet.create({
  bar:       { backgroundColor: WHITE, borderBottomWidth: 2, borderBottomColor: BLACK, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  name:      { fontFamily: MONO, fontSize: 13, fontWeight: 'bold', letterSpacing: 2, color: BLACK, flex: 1, marginRight: 12 },
  countdown: { fontFamily: MONO, fontSize: 13, fontWeight: 'bold', letterSpacing: 2, color: GREEN },
  urgent:    { color: RED },
  ended:     { color: RED },
});

export default function App() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);
  const [event, setEvent] = useState<{ event_name: string; ends_at: string } | null>(null);

  useEffect(() => {
    const token = getSessionToken();
    if (!token) { setInitialRoute('Auth'); return; }
    getMe().then(d => {
      if (d.success) {
        setEvent({ event_name: d.participant.event_name, ends_at: d.participant.ends_at });
        setInitialRoute('Search');
      } else {
        clearSession();
        setInitialRoute('Auth');
      }
    }).catch(() => setInitialRoute('Auth'));
  }, []);

  if (!initialRoute) return <View style={{ flex: 1, backgroundColor: WHITE }} />;

  return (
    <EventContext.Provider value={{ event, setEvent }}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: WHITE }, animation: 'none' }}
        >
          <Stack.Screen name="Auth"    component={AuthScreen}    />
          <Stack.Screen name="Search"  component={SearchScreen}  />
          <Stack.Screen name="Radar"   component={RadarScreen}   />
          <Stack.Screen name="MyNick"  component={MyNickScreen}  />
          <Stack.Screen name="Chat"    component={ChatScreen}    />
        </Stack.Navigator>
      </NavigationContainer>
    </EventContext.Provider>
  );
}
