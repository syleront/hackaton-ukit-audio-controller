import { io, Socket } from "socket.io-client";

import { Events } from "./event-emitter";
import { SoundBuffer } from "./sound-buffer";

import request from "./request";

interface User {
  id: string;
}

interface UserSpeak extends User {
  blob: Array<number>;
}

interface EventTypes {
  user_join: User;
  user_leave: User;
  user_speak: User;
}

export class AudioController {
  private readonly _baseUrl: string = null;
  private readonly _bufferSize: number = null;

  private _socket: Socket = null;

  private _micCtx: AudioContext = null;
  private _micMediaStream: MediaStream = null;

  private _remoteCtx = new Map<string, AudioContext>();
  private _soundBuffers = new Map<string, SoundBuffer>();

  public events = new Events<EventTypes>();

  constructor(baseUrl: string, bufferSize: number = 2048) {
    this._baseUrl = baseUrl;
    this._bufferSize = bufferSize;
  }

  private _initSocketEvents(): void {
    console.log("init sockets", this._socket);

    this._socket.on("user_join", (data: User) => {
      this.events.emit("user_join", { id: data.id });
    });

    this._socket.on("user_leave", (data: User) => {
      this.events.emit("user_leave", { id: data.id });
    });

    this._socket.on("voice", (data: UserSpeak) => {
      const fbu = new Float32Array(data.blob);

      if (!this._soundBuffers.has(data.id)) {
        this._remoteCtx.set(data.id, new AudioContext());
        this._soundBuffers.set(data.id, new SoundBuffer(this._remoteCtx.get(data.id), this._remoteCtx.get(data.id).sampleRate));
      }

      const soundBuffer = this._soundBuffers.get(data.id)
      soundBuffer.addChunk(fbu);

      if (soundBuffer.length > 3 && !soundBuffer.isPlaying) {
        soundBuffer.play();
      }

      this.events.emit("user_speak", { id: data.id });
    });
  }

  private async _handleMicMediaStream(): Promise<void> {
    const source = this._micCtx.createMediaStreamSource(this._micMediaStream);
    const processor = this._micCtx.createScriptProcessor(this._bufferSize, 1, 1);

    source.connect(processor);
    processor.connect(this._micCtx.destination);

    processor.addEventListener("audioprocess", (e) => {
      if (this._socket && this._micMediaStream) {
        this._socket.emit("radio", e.inputBuffer.getChannelData(0));
      } else {
        console.log("media processor disconnect");
        processor.disconnect();
      }
    });

    await this._micCtx.resume();
  }

  private async _destroyMicMediaStream(): Promise<void> {
    await this._micCtx.close();
    this._micCtx = null;
    this._micMediaStream.getTracks().forEach((e) => e.stop());
    this._micMediaStream = null;
  }

  private async _initMicMediaStream(): Promise<void> {
    this._micCtx = new AudioContext();
    this._micMediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    await this._handleMicMediaStream();
  }

  public connect(): void {
    if (!this._socket) {
      this._socket = io(this._baseUrl);
      this._micCtx = new AudioContext();
      this._initSocketEvents();
    }
  }

  public async disconnect(): Promise<void> {
    if (this._micMediaStream) {
      await this._destroyMicMediaStream();
    }

    if (this._socket) {
      this._socket.disconnect();
      this._socket = null;
    }
  }

  public async getUsers(): Promise<string[]> {
    const r = await request.get(`${this._baseUrl}/users`);

    if (r.statusCode === 200) {
      return <string[]>JSON.parse(r.body);
    } else {
      throw new Error(`Server error, returned code: ${r.statusCode}`);
    }
  }

  public isConnected(): boolean {
    return this._socket !== null;
  }

  public isSpeakEnabled(): boolean {
    return this._micMediaStream !== null && this._micCtx !== null;
  }

  public async speakOn(): Promise<void> {
    if (!this.isSpeakEnabled()) {
      return this._initMicMediaStream();
    }
  }

  public async speakOff(): Promise<void> {
    if (this.isSpeakEnabled()) {
      return this._initMicMediaStream();
    }
  }
}
