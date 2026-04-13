import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { getMe, updateProfile, clearSession } from './api';
import { FooterNav } from './search';
import { TopBar, EventContext } from './App';

const WHITE = '#ffffff';
const BLACK = '#000000';
const GREEN = '#00ff41';
const GRAY  = '#999999';
const RED   = '#cc0000';
const MONO  = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

export default function MyNickScreen({ navigation }: any) {
  const { event } = useContext(EventContext);
  const [me, setMe]             = useState<any>(null);
  const [intro, setSlogan]     = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState('');
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await getMe();
      if (d.success) {
        setMe(d.participant);
        setSlogan(d.participant.intro || '');
        setPhotoUrl(d.participant.photo_url || null);
      } else {
        clearSession();
        navigation.replace('Auth');
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, []);

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission required', 'Please allow photo access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true });
    if (!result.canceled && result.assets[0]) {
      const base64 = result.assets[0].base64;
      const mime   = result.assets[0].mimeType || 'image/jpeg';
      const uri    = `data:${mime};base64,${base64}`;
      setPhotoUrl(uri);
    }
  }

  async function removePhoto() {
    setPhotoUrl(null);
  }

  async function doSave() {
    setSaving(true);
    setSaved('');
    try {
      const d = await updateProfile({ photo_url: photoUrl, intro: intro.trim() || null });
      if (d.success) setSaved('Saved.');
      else setSaved(d.error || 'Error.');
    } catch { setSaved('Connection error.'); }
    setSaving(false);
    setTimeout(() => setSaved(''), 2000);
  }

  if (loading) {
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <TopBar navigation={navigation} />
        <View style={s.loader}><ActivityIndicator color={GREEN} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <TopBar navigation={navigation} />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.nickRow}>
          <Text style={s.nickLabel}>YOUR NICKNAME</Text>
          <Text style={s.nick}>{me?.nickname}</Text>
        </View>

        <View style={s.section}>
          {photoUrl ? (
            <View style={s.photoWrap}>
              <Image source={{ uri: photoUrl }} style={s.photo} />
              <TouchableOpacity style={s.removeBtn} onPress={removePhoto}>
                <Text style={s.removeBtnText}>remove photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={s.pickBtn} onPress={pickPhoto}>
              <Text style={s.pickBtnText}>+ add photo (optional)</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.section}>
          <TextInput
            style={s.introInput}
            value={intro}
            onChangeText={setSlogan}
            placeholder="intro... (optional)"
            placeholderTextColor={GRAY}
            maxLength={30}
            multiline
          />
          <Text style={s.charCount}>{intro.length}/30</Text>
        </View>

        {saved ? (
          <Text style={[s.savedMsg, saved === 'Saved.' && { color: 'green' }]}>{saved}</Text>
        ) : null}

        <TouchableOpacity style={s.saveBtn} onPress={doSave} disabled={saving}>
          {saving ? <ActivityIndicator color={BLACK} /> : <Text style={s.saveBtnText}>SAVE</Text>}
        </TouchableOpacity>

      </ScrollView>
      {me && (
        <View style={s.eventInfo}>
          <Text style={s.eventInfoLine}>you joined: <Text style={s.eventInfoVal}>{me.event_name || '—'}</Text></Text>
          <Text style={s.eventInfoLine}>by: <Text style={s.eventInfoVal}>{me.org_name || '—'}</Text></Text>
          <Text style={s.eventInfoLine}>from: <Text style={s.eventInfoVal}>{me.start_at ? new Date(me.start_at).toLocaleString('en-GB', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit', timeZone: me.timezone || 'Europe/Vienna' }) : '—'} ({me.timezone ? (({'Europe/Vienna':'CET','Europe/Berlin':'CET','Europe/London':'GMT','Europe/Lisbon':'WET','Europe/Paris':'CET','America/New_York':'ET','America/Los_Angeles':'PT','America/Sao_Paulo':'BRT','Asia/Tokyo':'JST','Asia/Dubai':'GST','Australia/Sydney':'AEST'} as any)[me.timezone] || me.timezone) : 'CET'})</Text></Text>
          <Text style={s.eventInfoLine}>until: <Text style={s.eventInfoVal}>{me.ends_at ? new Date(me.ends_at).toLocaleString('en-GB', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit', timeZone: me.timezone || 'Europe/Vienna' }) : '—'}</Text></Text>
        </View>
      )}
      <View style={s.appFooter}>
        <Text style={s.appFooterText}>Event powered by nickradar.com</Text>
        <Text style={s.appVersion}>v8.16.0</Text>
      </View>
      <FooterNav navigation={navigation} active="MyNick" />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: WHITE },
  loader:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:       { padding: 24 },
  nickRow:      { marginBottom: 32, alignItems: 'center', paddingVertical: 20 },
  nickLabel:    { fontFamily: MONO, fontSize: 10, color: GRAY, letterSpacing: 3, marginBottom: 8 },
  nick:         { fontFamily: MONO, fontSize: 28, fontWeight: 'bold', letterSpacing: 4, color: BLACK },
  section:      { marginBottom: 24 },
  label:        { fontFamily: MONO, fontSize: 10, color: GRAY, letterSpacing: 2, marginBottom: 10 },
  hint:         { fontWeight: 'normal', color: '#bbb' },
  photoWrap:    { alignItems: 'center' },
  photo:        { width: 100, height: 100, borderRadius: 50, marginBottom: 10 },
  removeBtn:    { paddingVertical: 6 },
  removeBtnText:{ fontFamily: MONO, fontSize: 11, color: RED, letterSpacing: 1, textDecorationLine: 'underline' },
  pickBtn:      { borderWidth: 1, borderColor: '#ccc', borderStyle: 'dashed', paddingVertical: 20, alignItems: 'center' },
  pickBtnText:  { fontFamily: MONO, fontSize: 12, color: GRAY, letterSpacing: 1 },
  introInput:  { fontFamily: MONO, fontSize: 13, color: BLACK, borderWidth: 1, borderColor: '#ccc', padding: 10, minHeight: 60 },
  charCount:    { fontFamily: MONO, fontSize: 10, color: '#bbb', textAlign: 'right', marginTop: 4 },
  savedMsg:     { fontFamily: MONO, fontSize: 11, color: RED, marginBottom: 8, letterSpacing: 1 },
  saveBtn:      { backgroundColor: GREEN, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: BLACK },
  saveBtnText:  { fontFamily: MONO, fontSize: 12, fontWeight: 'bold', color: BLACK, letterSpacing: 3 },
  divider:      { height: 1, backgroundColor: '#eee', marginVertical: 32 },
  eventInfo:    { paddingHorizontal: 20, paddingVertical: 12 },
  eventInfoLine:{ fontFamily: MONO, fontSize: 9, color: '#bbb', letterSpacing: 1, marginBottom: 3 },
  eventInfoVal: { color: '#999', fontWeight: 'bold' },
  appFooter:    { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20, alignItems: 'flex-start' },
  appFooterText:{ fontFamily: MONO, fontSize: 9, color: '#ccc', letterSpacing: 1 },
  appVersion:   { fontFamily: MONO, fontSize: 8, color: '#ddd', letterSpacing: 1 },
});
