import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Button, Text, NativeModules } from 'react-native';
import inCallManager from 'react-native-incall-manager';
import JsSIP, { UA } from 'react-native-jssip';
import { OutgoingEvent, OutgoingListener, RTCSession, RTCSessionEventMap } from 'react-native-jssip/lib/RTCSession';
import { CallOptions, UAConfiguration } from 'react-native-jssip/lib/UA';
const { AudioSwitcher } = NativeModules;

import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
  RTCView,
} from 'react-native-webrtc';
import { TextDecoder, TextEncoder } from 'text-encoding';

declare global {
  var RTCPeerConnection: any;
  var RTCIceCandidate: any;
  var RTCSessionDescription: any;
  var navigator: any;

}

global.TextDecoder = TextDecoder;
global.TextEncoder = TextEncoder;
global.RTCPeerConnection = RTCPeerConnection
global.RTCIceCandidate = RTCIceCandidate;
global.RTCSessionDescription = RTCSessionDescription;
global.navigator.mediaDevices = mediaDevices;



const App: React.FC = () => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const ua = useRef<UA>();
  const cur = useRef<RTCSession>();
  const devices = useRef<any>();


  const listOfDevices = () => {
    mediaDevices.enumerateDevices().then((sourceInfos: any) => {
      devices.current = sourceInfos;
      console.log(sourceInfos);
      console.log();
      console.log();
      console.log();
      for (let i = 0; i !== sourceInfos.length; ++i) {
        console.log(sourceInfos[i]);
        console.log(sourceInfos[i].kind);
        console.log();
      }
    });

  }


  useEffect(() => {

    listOfDevices();
    //JsSIP.debug.enable('JsSIP:* JsSIP:Transport JsSIP:RTCSession*');
    JsSIP.debug.enable('JsSIP:*');
    // JsSIP.debug.enable('*');
    const socketWs = new JsSIP.WebSocketInterface('ws://172.16.2.2:3033/ws');
    const socketWss = new JsSIP.WebSocketInterface('wss://live.farabipharma.ir:3034/ws');
    const configuration: UAConfiguration = {
      sockets: [socketWs, socketWss],
      uri: 'sip:2030@172.16.2.2:5060',
      password: '2030',
      authorization_user: "2030",
      display_name: "2030",
      register: true,
      user_agent: 'p-line',
    };

    ua.current = new JsSIP.UA(configuration);

    ua.current?.addListener("registered", (e: any) => {
      // console.log('====================================');
      // console.log(e.response.data);
      // console.log('====================================');
    });

    ua.current?.addListener("newRTCSession", (e: any) => {
      // console.log('====================================');
      // console.log(e.originator);
      // console.log('====================================');
    });

    ua.current.start();


    const createMediaStream = async () => {

      const cameraStream = await mediaDevices.getUserMedia({
        video: {
          // facingMode: {
          //   exact: "environment"
          // },
          width: {
            min: 1280,
            ideal: 1920,
            max: 2560,
          },
          height: {
            min: 720,
            ideal: 1080,
            max: 1440
          },
          deviceId: {
            exact: "0",
          }
        },

        audio: {
          deviceId: {
            exact: "audio-1",
          }
        },
      });

      const audioStream = await mediaDevices.getUserMedia({ audio: true });

      const tracks = [...cameraStream.getVideoTracks(), ...audioStream.getAudioTracks()];

      const mediaStream = new MediaStream(tracks);

      setLocalStream(mediaStream);
      AudioSwitcher.switchAudioOutput(true);
    };

    createMediaStream();
  }, []);


  function makeId(length: number) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
      if (counter % 5 === 0) {
        result += '-'
      }
    }
    return result;
  }


  const call = () => {
    // Register callbacks to desired call events
    const eventHandlers: Partial<RTCSessionEventMap> = {

      progress: function (e: any) {
        console.log('call is in progress');
      },
      failed: function (e: any) {
        inCallManager.setSpeakerphoneOn(true);
        console.log('call failed');
      },
      ended: function (e: any) {
        inCallManager.setSpeakerphoneOn(true);
        console.log('call ended');
      },
      confirmed: function (e: any) {
        // console.log('************************************************call confirmed', e);
      },
      accepted: function (e: OutgoingEvent) {
        inCallManager.setSpeakerphoneOn(false);
        console.log('accepted', e.response.status_code);
      },

    };


    const options: CallOptions = {
      eventHandlers: eventHandlers,
      extraHeaders: ['X-Pline-Version: 1.2.23', 'X-Pline-Session: ' + makeId(64)],
      mediaConstraints: { 'audio': true, 'video': true },
      // 'pcConfig': {
      //   'iceServers': [
      //     { 'urls': ['stun:a.example.com', 'stun:b.example.com'] },
      //     { 'urls': 'turn:example.com', 'username': 'foo', 'credential': ' 1234' }
      //   ]
      //},
      mediaStream: localStream,

    };

    const session = ua.current?.call('sip:2003@172.16.2.2:5060', options);
    cur.current = session;

  };

  const hangup = () => {
    if (cur.current?.isEstablished)
      cur.current?.terminate();
  }


  return (
    <View style={styles.container}>
      <Text>Local</Text>
      {localStream && (
        <RTCView
          streamURL={localStream.toURL()}
          style={styles.localVideo}
        />
      )}
      <Text>Remote</Text>
      {remoteStream && (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={styles.remoteVideo}
        />
      )}
      <Text></Text>
      <Button onPress={call} title='Call' />
      <Button onPress={hangup} title='Hangup' />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  localVideo: {
    width: 200,
    height: 150,
  },
  remoteVideo: {
    flex: 1,
  },
});

export default App;