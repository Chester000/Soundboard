import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { Image, Pressable, Text, View, StyleSheet, Platform, Alert } from 'react-native';
import Styles from '../styles/page-styles';
import { Audio } from 'expo-av';
import * as SQLite from 'expo-sqlite';

export default function Page() {
  const [db, setDb] = useState(null);
  const [dbReady, setDbReady] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState("Unloaded");
  const [sounds, setSounds] = useState({});
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [currentlyPlayingRecording, setCurrentlyPlayingRecording] = useState(null);
  const [activeRecordingButton, setActiveRecordingButton] = useState(null);

  const [loadedRecordings, setLoadedRecordings] = useState({
    1: null,
    2: null,
    3: null
  });

  useEffect(() => {
    loadSounds();
  }, []);

  useEffect(() => {
    let db = null;
    if (Platform.OS === 'web') {
      db = {
        transaction: () => {
          return {
            executeSql: () => { }
          }
        }
      }
      setDb(db);
      setDbReady(true);
    } else {
      db = SQLite.openDatabase('todo.db');
      if (!db) {
        console.log("Error: Database connection failed.");
        return;
      }
      setDb(db);
      db.transaction((tx) => {
        tx.executeSql(
          "create table if not exists Recordings (id integer primary key not null, recording blob, Button integer);",
          [],
          () => {
            console.log("Table created successfully");
            setDbReady(true);
          },
          (_, error) => {
            console.log("Error creating table:", error);
          }
        );
      });
    }

    return () => {
      if (db && typeof db.close === 'function') {
        db.close();
      }
    };
  }, []);

  useEffect(() => {
    if (dbReady && db) {
      loadRecordingsFromDatabase();
    }
  }, [dbReady]);

  const loadSounds = async () => {
    const sfx1 = require('./soundfx/01-chaching.mp3');
    const sfx2 = require('./soundfx/02-ding.mp3');
    const sfx3 = require('./soundfx/03-chime.mp3');

    const sound1 = new Audio.Sound();
    const sound2 = new Audio.Sound();
    const sound3 = new Audio.Sound();

    try {
      await sound1.loadAsync(sfx1);
      await sound2.loadAsync(sfx2);
      await sound3.loadAsync(sfx3);
      setSounds({
        sfx1: sound1,
        sfx2: sound2,
        sfx3: sound3
      });
      
      setPlaybackStatus("Loaded");
    } catch (error) {
      console.log('Error loading sounds:', error);
    }
  }

  const loadRecordingsFromDatabase = async () => {
    try {
      if (!db) {
        console.log('Database connection is not yet established.');
        return;
      }

      const loadedRecordings = {};
      for (let i = 1; i <= 3; i++) {
        const result = await loadRecordingFromDatabase(i);
        loadedRecordings[i] = result;
      }
      setLoadedRecordings(loadedRecordings);
    } catch (error) {
      console.log("Error loading recordings from database:", error);
    }
  }

  const loadRecordingFromDatabase = async (button) => {
    try {
      const result = await new Promise((resolve, reject) => {
        db.transaction((tx) => {
          tx.executeSql(
            "SELECT * FROM Recordings WHERE Button = ?;",
            [button],
            (_, { rows }) => {
              if (rows.length > 0) {
                const recordingURI = rows.item(0).recording;
                resolve({ recordingURI });
              } else {
                resolve(null);
              }
            },
            (_, error) => {
              reject(error);
            }
          );
        });
      });
      return result;
    } catch (error) {
      console.log("Error loading recording from database:", error);
      throw error;
    }
  }

  const handleBlueButtonPress = async (button) => {
    try {
      if (isRecording) {
        if (activeRecordingButton === button) {
          await stopRecording(button);
          setLoadedRecordings({ ...loadedRecordings, [button]: await loadRecordingFromDatabase(button) });
          setActiveRecordingButton(null);
        }
      } else {
        const loadedRecording = loadedRecordings[button];
        if (loadedRecording && loadedRecording.recordingURI) {
          playOrRecord('recording', 'Recorded Sound', loadedRecording.recordingURI);
          setActiveRecordingButton(button);
        } else {
          await startRecording();
          setActiveRecordingButton(button);
        }
      }
    } catch (error) {
      console.log('Error handling blue button press:', error);
    }
  }


  const handleLongPress = async (button) => {
    try {
      if (button >= 1 && button <= 3) {
        Alert.alert(
          "Confirmation",
          "Are you sure you want to delete the recording?",
          [
            {
              text: "Cancel",
              onPress: () => console.log("Cancel Pressed"),
              style: "cancel"
            },
            {
              text: "Yes",
              onPress: () => deleteRecording(button)
            }
          ],
          { cancelable: false }
        );
      }
    } catch (error) {
      console.log('Error handling long press:', error);
    }
  }
  
  const deleteRecording = async (button) => {
    try {
      db.transaction((tx) => {
        tx.executeSql(
          "DELETE FROM Recordings WHERE Button = ?;",
          [button],
          (_, { rowsAffected }) => {
            if (rowsAffected > 0) {
              console.log("Recording deleted from database");
              setLoadedRecordings({ ...loadedRecordings, [button]: null });
            } else {
              console.log("Recording not found in database");
            }
          },
          (_, error) => {
            console.log("Error deleting recording from database:", error);
          }
        );
      });
    } catch (error) {
      console.log('Error deleting recording:', error);
    }
  }

  const startRecording = async () => {
    try {
      await requestAudioPermission();

      const recordingObject = new Audio.Recording();
      await recordingObject.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await recordingObject.startAsync();
      setRecording(recordingObject);
      setIsRecording(true);
      setPlaybackStatus("Recording");
    } catch (error) {
      console.log('Error starting recording:', error);
    }
  }

  const stopRecording = async (button) => {
    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      setIsRecording(false);
      setPlaybackStatus("Stopped recording");

      const uri = recording.getURI();
      db.transaction((tx) => {
        tx.executeSql(
          "INSERT INTO Recordings (recording, Button) VALUES (?, ?);",
          [uri, button],
          (_, { rowsAffected }) => {
            if (rowsAffected > 0) {
              console.log("Recording saved to database");
            } else {
              console.log("Recording not saved to database");
            }
          },
          (_, error) => {
            console.log("Error saving recording to database:", error);
          }
        );
      });
    } catch (error) {
      console.log('Error stopping recording:', error);
    }
  }
  const playOrRecord = async (sound, soundEffect, recordingURI) => {
    try {
      if (isRecording) {
        await stopRecording();
      } else {
        if (sound === 'recording') {
          const { sound: playbackSound, status } = await Audio.Sound.createAsync(
            { uri: recordingURI },
            { shouldPlay: true }
          );
          setCurrentlyPlayingRecording(playbackSound); // Set the currently playing recording
          playbackSound.setOnPlaybackStatusUpdate(status => {
            if (status.didJustFinish) {
              setPlaybackStatus("Stopped");
              setCurrentlyPlayingRecording(null); // Clear the currently playing recording
            }
          });
          setPlaybackStatus("Playing recorded sound");
        } else {
          const selectedSound = sounds[sound];
          if (selectedSound) {
            await selectedSound.replayAsync();
            selectedSound.setOnPlaybackStatusUpdate(status => {
              if (status.didJustFinish) {
                setPlaybackStatus("Stopped");
              }
            });
            setPlaybackStatus("Playing " + soundEffect);
          } else {
            console.log("Sound object is undefined.");
          }
        }
      }
    } catch (error) {
      console.log('Error playing sound:', error);
    }
  }
  
  
  const stopSound = async () => {
    try {
      await Promise.all([
        sounds.sfx1.stopAsync(),
        sounds.sfx2.stopAsync(),
        sounds.sfx3.stopAsync(),
        currentlyPlayingRecording?.stopAsync() // Stop the currently playing recording
      ]);

      if (isRecording) {
        await stopRecording();
      }

      setPlaybackStatus("Stopped");
      setCurrentlyPlayingRecording(null); // Clear the currently playing recording
    } catch (error) {
      console.log('Error stopping sound:', error);
    }
  }
  

  const requestAudioPermission = async () => {
    try {
      if (permissionResponse.status !== 'granted') {
        console.log("Requesting permissions");
        await requestPermission();
      }
      console.log('Permission is ', permissionResponse.status);

      // set device specific values
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

    } catch (error) {
      console.log('Error requesting audio recording permission:', error);
    }
  }

  const getButtonLabel = (button) => {
    if (loadedRecordings[button]) {
      return `Recording ${button}`;
    } else {
      return "Record";
    }
  }

  return (
    <View style={Styles.page}>
      <StatusBar style="light" />
      <View style={Styles.headerView}>
        <Image
          source={require('../assets/header-bg.jpg')}
          style={{ width: '100%', height: 200, marginTop: 35 }}
        />
      </View>

      <Text style={[Styles.welcomeText, { marginTop: 20 }]}>
        Press the purple buttons to play default sound effects.{'\n'}
        Press the blue buttons to either record a new sound (press again to stop recording) or play the existing recording. Long-press to delete the existing recording.
      </Text>

      <View style={[styles.buttonContainer, { marginTop: 20 }]}>
        <Pressable style={[styles.button, { backgroundColor: 'purple' }]} onPress={() => playOrRecord('sfx1', 'Cha Ching')}>
          <Text style={styles.buttonText}>Cha Ching</Text>
        </Pressable>
        <Pressable style={[styles.button, { backgroundColor: 'purple' }]} onPress={() => playOrRecord('sfx3', 'Chime')}>
          <Text style={styles.buttonText}>Chime</Text>
        </Pressable>
        <Pressable style={[styles.button, { backgroundColor: 'purple' }]} onPress={() => playOrRecord('sfx2', 'Ding')}>
          <Text style={styles.buttonText}>Ding</Text>
        </Pressable>
      </View>

      <View style={[Styles.buttonContainer, styles.blueButtonContainer]}>
        <Pressable
          style={[styles.button, { backgroundColor: 'blue' }]}
          onPress={() => handleBlueButtonPress(1)}
          onLongPress={() => handleLongPress(1)}>
          <Text style={styles.buttonText}>
            {activeRecordingButton === 1 && isRecording ? 'Stop' : loadedRecordings[1] ? 'Recording 1' : 'Record'}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.button, { backgroundColor: 'blue' }]}
          onPress={() => handleBlueButtonPress(2)}
          onLongPress={() => handleLongPress(2)}>
          <Text style={styles.buttonText}>
            {activeRecordingButton === 2 && isRecording ? 'Stop' : loadedRecordings[2] ? 'Recording 2' : 'Record'}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.button, { backgroundColor: 'blue' }]}
          onPress={() => handleBlueButtonPress(3)}
          onLongPress={() => handleLongPress(3)}>
          <Text style={styles.buttonText}>
            {activeRecordingButton === 3 && isRecording ? 'Stop' : loadedRecordings[3] ? 'Recording 3' : 'Record'}
          </Text>
        </Pressable>
      </View>

      <View style={Styles.footerView}>
        <Text style={Styles.welcomeText}>Status: {playbackStatus}</Text>
        <Pressable style={[styles.button, { backgroundColor: 'red', width: 80, height: 80, borderRadius: 0 }]} onPress={stopSound}>
            <Text style={styles.buttonText}>Stop</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#16131c",
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerView: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'ChalkboardSE-Regular',
    color: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  blueButtonContainer: {
    flexDirection: 'row',
  },
  button: {
    aspectRatio: 1,
    width: 100,
    backgroundColor: '#2c2b37',
    padding: 15,
    margin: 5,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  purpleButtonShadow: {
    shadowColor: '#ff00ff', // Neon purple shadow color
  },
  blueButtonShadow: {
    shadowColor: '#00ffff', // Neon blue shadow color
  },
});
