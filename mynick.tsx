import React, { useState, useEffect, useCallback } from 'react';
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
import { TopBar } from './App';

const WHITE = '#ffffff';
const BLACK = '#000000';
const GREEN = '#00ff41';
const GRAY  = '#999999';
const RED   = '#cc0000';
const MONO  = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

export default function MyNickScreen({ navigation }: any) {
  const [me, setMe]             = useState<any>(null);
  const [slogan, setSlogan]     = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState('');
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await getMe();
      if (d.success) {
        setMe(d.participant);
        setSlogan(d.participant.slogan || '');
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
      const d = await updateProfile({ photo_url: photoUrl, slogan: slogan.trim() || null });
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
          <Text style={s.label}>PROFILE PHOTO</Text>
          {photoUrl ? (
            <View style={s.photoWrap}>
              <Image source={{ uri: photoUrl }} style={s.photo} />
              <TouchableOpacity style={s.removeBtn} onPress={removePhoto}>
                <Text style={s.removeBtnText}>remove photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={s.pickBtn} onPress={pickPhoto}>
              <Text style={s.pickBtnText}>+ add photo</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.section}>
          <Text style={s.label}>SLOGAN <Text style={s.hint}>(optional · max 100 chars)</Text></Text>
          <TextInput
            style={s.sloganInput}
            value={slogan}
            onChangeText={setSlogan}
            placeholder="say something..."
            placeholderTextColor={GRAY}
            maxLength={100}
            multiline
          />
          <Text style={s.charCount}>{slogan.length}/100</Text>
        </View>

        {saved ? (
          <Text style={[s.savedMsg, saved === 'Saved.' && { color: 'green' }]}>{saved}</Text>
        ) : null}

        <TouchableOpacity style={s.saveBtn} onPress={doSave} disabled={saving}>
          {saving ? <ActivityIndicator color={BLACK} /> : <Text style={s.saveBtnText}>SAVE</Text>}
        </TouchableOpacity>

      </ScrollView>
      <View style={s.appFooter}>
        <View style={s.appFooterRow}>
          <Image source={{ uri: 'https://app.nickradar.com/nr_logo.png' }} style={s.footerLogo} resizeMode="contain" />
          <Text style={s.appFooterText}>Event powered by nickradar.com</Text>
        </View>
        <Text style={s.appVersion}>v8.15.0</Text>
      </View>
      <FooterNav navigation={navigation} active="MyNick" />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: WHITE },
  loader:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:       { padding: 24 },
  nickRow:      { marginBottom: 32, alignItems: 'center', paddingVertical: 20, borderBottomWidth: 2, borderBottomColor: BLACK },
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
  sloganInput:  { fontFamily: MONO, fontSize: 13, color: BLACK, borderWidth: 1, borderColor: '#ccc', padding: 10, minHeight: 60 },
  charCount:    { fontFamily: MONO, fontSize: 10, color: '#bbb', textAlign: 'right', marginTop: 4 },
  savedMsg:     { fontFamily: MONO, fontSize: 11, color: RED, marginBottom: 8, letterSpacing: 1 },
  saveBtn:      { backgroundColor: GREEN, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: BLACK },
  saveBtnText:  { fontFamily: MONO, fontSize: 12, fontWeight: 'bold', color: BLACK, letterSpacing: 3 },
  divider:      { height: 1, backgroundColor: '#eee', marginVertical: 32 },
  appFooter:    { borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingHorizontal: 20, paddingVertical: 8, alignItems: 'center' },
  appFooterRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  footerLogo:   { width: 14, height: 14, opacity: 0.4 },
  appFooterText:{ fontFamily: MONO, fontSize: 9, color: '#ccc', letterSpacing: 1 },
  appVersion:   { fontFamily: MONO, fontSize: 8, color: '#ddd', letterSpacing: 1 },
});
