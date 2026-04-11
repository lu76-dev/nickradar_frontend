import React, { useState, useRef, useContext } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { participantLogin, setSessionToken } from './api';
import { EventContext } from './App';

const WHITE  = '#ffffff';
const BLACK  = '#000000';
const GREEN  = '#00ff41';
const RED    = '#cc0000';
const GRAY   = '#cccccc';
const MONO   = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

const LOGO_URI = 'https://app.nickradar.com/nr_logo.png';

export default function AuthScreen({ navigation }: any) {
  const [code, setCode]       = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed]   = useState(false);
  const inputRef = useRef<TextInput>(null);
  const { setEvent } = useContext(EventContext);

  async function doLogin() {
    const c = code.trim();
    if (c.length !== 4) { setError('Please enter a 4-digit code.'); return; }
    if (!agreed) { setError('Please accept the terms to continue.'); return; }
    setLoading(true);
    setError('');
    try {
      const d = await participantLogin(c);
      if (!d.success) { setError(d.error || 'Invalid code.'); setLoading(false); return; }
      setSessionToken(d.token);
      setEvent({ event_name: d.participant.event_name, ends_at: d.participant.ends_at });
      navigation.replace('Radar');
    } catch {
      setError('Connection error.');
    }
    setLoading(false);
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.container}>
        <View style={s.logoRow}>
          <Image source={{ uri: LOGO_URI }} style={s.logoImg} resizeMode="contain" />
          <Text style={s.logoText}>nickradar</Text>
        </View>

        <Text style={s.label}>ENTER YOUR CODE</Text>

        <TextInput
          ref={inputRef}
          style={s.input}
          value={code}
          onChangeText={v => { setCode(v.replace(/\D/g, '').slice(0, 4)); setError(''); }}
          keyboardType="number-pad"
          maxLength={4}
          placeholder="_ _ _ _"
          placeholderTextColor={GRAY}
          returnKeyType="done"
          onSubmitEditing={doLogin}
          autoFocus
        />

        {error ? <Text style={s.error}>{error}</Text> : null}

        <TouchableOpacity style={s.checkRow} onPress={() => setAgreed(!agreed)} activeOpacity={0.7}>
          <View style={[s.checkbox, agreed && s.checkboxChecked]}>
            {agreed && <Text style={s.checkmark}>✓</Text>}
          </View>
          <Text style={s.checkLabel}>
            I have read and accept the{' '}
            <Text
              style={s.checkLink}
              onPress={() => Linking.openURL('https://nickradar.com/participant-terms.html')}
            >
              Participant Terms
            </Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.btn, !agreed && s.btnDisabled]} onPress={doLogin} disabled={loading || !agreed}>
          {loading
            ? <ActivityIndicator color={WHITE} />
            : <Text style={s.btnText}>ENTER</Text>
          }
        </TouchableOpacity>

        <Text style={s.hint}>
          Enter the 4-digit code from your sticker to join the event.
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: WHITE },
  container:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  logoRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: 48 },
  logoImg:        { width: 40, height: 40, marginRight: 10 },
  logoText:       { fontFamily: MONO, fontSize: 22, fontWeight: 'bold', letterSpacing: 4, color: BLACK },
  label:          { fontFamily: MONO, fontSize: 11, letterSpacing: 3, color: '#666', marginBottom: 16 },
  input:          {
    fontFamily: MONO,
    fontSize: 36,
    letterSpacing: 12,
    color: BLACK,
    borderBottomWidth: 2,
    borderBottomColor: BLACK,
    width: '100%',
    textAlign: 'center',
    paddingVertical: 10,
    marginBottom: 8,
  },
  error:          { fontFamily: MONO, fontSize: 11, color: RED, marginBottom: 8, letterSpacing: 1 },
  checkRow:       { flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: 16, marginBottom: 4 },
  checkbox:       { width: 18, height: 18, borderWidth: 1.5, borderColor: BLACK, alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0 },
  checkboxChecked:{ backgroundColor: BLACK },
  checkmark:      { color: GREEN, fontSize: 12, fontWeight: 'bold', lineHeight: 14 },
  checkLabel:     { fontFamily: MONO, fontSize: 11, color: '#444', letterSpacing: 0.5, flex: 1, lineHeight: 16 },
  checkLink:      { color: BLACK, textDecorationLine: 'underline' },
  btn:            {
    backgroundColor: BLACK,
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  btnDisabled:    { backgroundColor: GRAY },
  btnText:        { fontFamily: MONO, fontSize: 13, color: WHITE, letterSpacing: 3 },
  hint:           { fontFamily: MONO, fontSize: 10, color: GRAY, textAlign: 'center', letterSpacing: 1, lineHeight: 16 },
});
