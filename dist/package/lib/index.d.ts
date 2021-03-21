import { Events } from "./event-emitter";
export interface User {
    id: string;
}
export interface UserSpeak extends User {
    blob: Array<number>;
    sampleRate: number;
}
export interface AudioSticker {
    sticker: string;
}
export interface EventTypes {
    user_join: User;
    user_leave: User;
    user_speak: User;
}
export declare class AudioController {
    private readonly _sampleRate;
    private readonly _baseUrl;
    private readonly _staticUrl;
    private readonly _bufferSize;
    private readonly _maxBufferLength;
    private readonly _triggerBufferLength;
    private _socket;
    private _micCtx;
    private _micMediaStream;
    private _remoteCtx;
    private _soundBuffers;
    events: Events<EventTypes>;
    constructor(baseUrl: string, bufferSize?: number, maxBufferLength?: number, triggerBufferLength?: number);
    private _playAudioStream;
    private _initSocketEvents;
    private _handleMicMediaStream;
    private _destroyMicMediaStream;
    private _initMicMediaStream;
    sendAudioSticker(sticker: string): void;
    getSocketId(): string;
    connect(): void;
    disconnect(): Promise<void>;
    getUsers(): Promise<string[]>;
    isConnected(): boolean;
    isSpeakEnabled(): boolean;
    speakOn(): Promise<void>;
    speakOff(): Promise<void>;
}
