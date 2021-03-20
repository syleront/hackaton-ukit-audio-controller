import { Events } from "./event-emitter";
interface User {
    id: string;
}
interface EventTypes {
    user_join: User;
    user_leave: User;
    user_speak: User;
}
export declare class AudioController {
    private readonly _baseUrl;
    private readonly _bufferSize;
    private _socket;
    private _micCtx;
    private _micMediaStream;
    private _remoteCtx;
    private _soundBuffers;
    events: Events<EventTypes>;
    constructor(baseUrl: string, bufferSize?: number);
    private _initSocketEvents;
    private _handleMicMediaStream;
    private _destroyMicMediaStream;
    private _initMicMediaStream;
    connect(): void;
    disconnect(): Promise<void>;
    getUsers(): Promise<string[]>;
    isConnected(): boolean;
    isSpeakEnabled(): boolean;
    speakOn(): Promise<void>;
    speakOff(): Promise<void>;
}
export {};
