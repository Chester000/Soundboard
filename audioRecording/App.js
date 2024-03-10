/**
 * \file    App.js
 * \author  Stephen Graham
 * \date    Feb 2024
 * \brief   Demonstrate expo-av for recording and playing back sounds
 * 
 * This is relies on documentation from:
 *    https://docs.expo.dev/versions/latest/sdk/audio/
 *    https://javascript.plainenglish.io/how-to-record-audio-using-react-native-expo-74723d2358e3
 */
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Button, StyleSheet, Text, View } from 'react-native';
import { Audio } from 'expo-av';

export default App = () => {
  const [recording, setRecording] = useState(null);
  const [recordingUri, setRecordingUri] = useState(null);
  const [playback, setPlayback] = useState(null);
  const [permissionsResponse, requestPermission] = Audio.usePermissions();

  const startRecording = async () => {
    try {
      // request permission to use the mic
      if (permissionsResponse.status !== 'granted') {
        console.log('Requesting permissions.');
        await requestPermission();
      }
      console.log('Permission is ', permissionsResponse.status);

      // set some device specific values
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording...');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      console.log('...recording');
    }
    catch (errorEvent) {
      console.error('Failed to startRecording(): ', errorEvent);
    }
  }

  const stopRecording = async () => {
    try {
      // stop the actual recording
      await recording.stopAndUnloadAsync();

      // save the recorded object location
      const uri = recording.getURI();
      setRecordingUri(uri);

      // forget the recording object
      setRecording(undefined);

      // log the result
      console.log('Recording stopped and stored at ', uri);
    }
    catch (errorEvent) {
      console.error('Failed to stopRecording(): ', errorEvent);
    }
  }

  const playRecording = async () => {
    const { sound } = await Audio.Sound.createAsync({
      uri: recordingUri,
    });
    setPlayback(sound);
    await sound.replayAsync();
    console.log('Playing recorded sound from ', recordingUri);
  }

  // This effect hook will make sure the app stops recording when it ends
  useEffect(() => {
    return recording
      ? recording.stopAndUnloadAsync()
      : undefined;
  }, []);

  return (
    <View style={styles.container}>
      <Button
        title={recording ? 'Stop Recording' : 'Start Recording'}
        onPress={recording ? stopRecording : startRecording}
      />
      {recordingUri &&
        <Button
          title="Play the last sound"
          onPress={playRecording}
        />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});