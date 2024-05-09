import inCallManager from 'react-native-incall-manager';
import JsSIP, { UA } from 'react-native-jssip';
import { OutgoingEvent, RTCSession, RTCSessionEventMap } from 'react-native-jssip/lib/RTCSession';

import { CallOptions, ConnectedEvent, RegisteredEvent, RTCSessionEvent, UAConfiguration, UAConnectingEvent, UnRegisteredEvent } from 'react-native-jssip/lib/UA';
import { DisconnectEvent } from 'react-native-jssip/lib/WebSocketInterface';

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

export interface IAradWebRtcPhone {
    WssUrl: string;
    SipUser: string;
    SipPassword: string;
    SipServer: string;
    SipPort: number;
    UserAgentStatus: (event: string) => void;
}

export enum SpeakerType {
    Ear,
    Speaker,
    Bluetooth,
}
/************************************************************* */
class AradWebRtcPhone {

    private userAgent: UA | null = null;
    private configs: IAradWebRtcPhone;
    private dialog: RTCSession | undefined = undefined;

    constructor(props: IAradWebRtcPhone) {
        this.configs = props;
    }

    public Connect = () => {
        // const socketWs = new JsSIP.WebSocketInterface('ws://172.16.2.2:3033/ws');
        // const socketWss = new JsSIP.WebSocketInterface('wss://live.farabipharma.ir:3034/ws');
        const socketWss = new JsSIP.WebSocketInterface(this.configs.WssUrl);
        const configuration: UAConfiguration = {
            sockets: [socketWss],
            uri: `sip:${this.configs.SipUser}@${this.configs.SipServer}:${this.configs.SipPort}`,
            password: '2030',
            authorization_user: this.configs.SipUser,
            display_name: this.configs.SipUser,
            register: false,
            user_agent: 'arad phone (p-line)',
            connection_recovery_max_interval: 3,
            connection_recovery_min_interval: 10,
            register_expires: 60,
            registrar_server: `${this.configs.SipServer}:${this.configs.SipPort}`,
            contact_uri: `sip:${this.configs.SipUser}@${this.configs.SipServer}:${this.configs.SipPort}`,
        };
        this.userAgent = new JsSIP.UA(configuration);
        this.configs.UserAgentStatus("Start....");

        this.userAgent.on("connected", (e: ConnectedEvent) => {
            console.log("connected");
            this.configs.UserAgentStatus(`connected: ${e.socket.sip_uri}`);

        });

        this.userAgent.on("connecting", (e: UAConnectingEvent) => {
            console.log("connecting");
            this.configs.UserAgentStatus("connecting");
        });

        this.userAgent.on("disconnected", (e: DisconnectEvent) => {
            console.log("disconnected");
            this.configs.UserAgentStatus("disconnected");
        });

        this.userAgent.on("newMessage", (e: any) => {
            console.log("newMessage");
            this.configs.UserAgentStatus("newMessage");
        });

        this.userAgent.on("newRTCSession", (e: RTCSessionEvent) => {
            console.log("newRTCSession");
            this.configs.UserAgentStatus("newRTCSession");
        });

        this.userAgent.on("registered", (e: RegisteredEvent) => {
            console.log("registered");
            this.configs.UserAgentStatus("registered");
        });

        this.userAgent.on("registrationExpiring", (e: RegisteredEvent) => {
            console.log("registrationExpiring");
            this.configs.UserAgentStatus("registrationExpiring");
        });

        this.userAgent.on("registrationFailed", (e: RegisteredEvent) => {
            console.log("registrationFailed");
            this.configs.UserAgentStatus("registrationFailed");
        });

        this.userAgent.on("sipEvent", (e: any) => {
            console.log("sipEvent");
            this.configs.UserAgentStatus("sipEvent");
        });

        this.userAgent.on("unregistered", (e: UnRegisteredEvent) => {
            console.log("unregistered");
            this.configs.UserAgentStatus("unregistered");
        });
        //------------------------------------------------------------------------------//

        this.userAgent.start();
    };

    public Disconnect = () => {
        this.userAgent?.stop();
    }

    public Register = () => {
        this.userAgent?.register();
    }

    public UnRegister = () => {
        this.userAgent?.unregister();
    }

    public createMediaStream = async () => {

        const cameraStream = await mediaDevices.getUserMedia({
            video: {
                facingMode: {
                    exact: "environment"
                },
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

        return mediaStream;
    };


    public call(number: string, stream: MediaStream, speakerType: SpeakerType) {
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
            },
            accepted: function (e: OutgoingEvent) {
                if (speakerType == SpeakerType.Ear) {
                    inCallManager.setSpeakerphoneOn(false);
                }
                else if (speakerType == SpeakerType.Bluetooth) {
                    inCallManager.setSpeakerphoneOn(true);
                }
                else {
                    inCallManager.setSpeakerphoneOn(true);
                }
            },

        };
        const options: CallOptions = {
            eventHandlers: eventHandlers,
            extraHeaders: ['X-Pline-Version: 1.2.23', 'X-Pline-Session: ' + this.makeId(64)],
            mediaConstraints: { 'audio': true, 'video': false },
            'pcConfig': {
                'iceServers': [
                    {
                        'urls': [
                            'stun:stun.l.google.com',
                            'stun:stun1.l.google.com',
                            'stun:stun2.l.google.com',
                            'stun:stun3.l.google.com',
                            'stun:stun4.l.google.com',
                        ]
                    },
                ]
            },
            mediaStream: stream,

        };
        this.dialog = this.userAgent?.call(`sip:${number}@${this.configs.SipServer}:${this.configs.SipPort}`, options);
    }

    public Hangup = () => {
        this.dialog?.terminate();
    }

    public Hold = () => {
        if (this.dialog?.isOnHold) {
            this.dialog?.unhold();
        }
        else {
            this.dialog?.hold();
        }
    }

    private makeId = (length: number, split = true) => {
        let result = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const charactersLength = characters.length;
        let counter = 0;
        while (counter < length) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
            counter += 1;
            if (split && counter % 5 === 0) {
                result += '-'
            }
        }
        return result;
    }
}





export default AradWebRtcPhone
