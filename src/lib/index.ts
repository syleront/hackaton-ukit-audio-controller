import { io, Socket } from "socket.io-client";

import { Events } from "./event-emitter";
import { SoundBuffer } from "./sound-buffer";

import request from "./request";

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

export class AudioController {
  private readonly _sampleRate = 48000;

  private readonly _baseUrl: string = null;
  private readonly _staticUrl: string = null;
  private readonly _bufferSize: number = null;
  private readonly _maxBufferLength: number = null;
  private readonly _triggerBufferLength: number = null;

  private _socket: Socket = null;

  private _micCtx: AudioContext = null;
  private _micMediaStream: MediaStream = null;

  private _remoteCtx = new Map<string, AudioContext>();
  private _soundBuffers = new Map<string, SoundBuffer>();

  public events = new Events<EventTypes>();

  constructor(baseUrl: string, bufferSize: number = 2048, maxBufferLength: number = 16, triggerBufferLength: number = 12) {
    if (triggerBufferLength > maxBufferLength) {
      throw new Error("maxBufferLength must be greater than triggerBufferLength");
    }

    this._baseUrl = baseUrl.replace(/\/$/, "");
    this._staticUrl = `${baseUrl}/static`
    this._bufferSize = bufferSize;
    this._maxBufferLength = maxBufferLength;
    this._triggerBufferLength = triggerBufferLength;
  }

  private async _playAudioStream(src: string): Promise<void> {
    const audio = document.createElement("audio");
    audio.src = src;
    return audio.play();
  }

  private _initSocketEvents(): void {
    console.log("init sockets", this._socket);

    this._socket.on("user_join", (data: User) => {
      this.events.emit("user_join", data);
    });

    this._socket.on("user_leave", (data: User) => {
      this.events.emit("user_leave", data);
    });

    this._socket.on("user_speak", (data: User) => {
      this.events.emit("user_speak", data);
    });

    this._socket.on("audio_sticker", async (data: AudioSticker) => {
      await this._playAudioStream(`${this._staticUrl}/${data.sticker}.mp3`);
    });

    this._socket.on("voice", (data: UserSpeak) => {
      const fbu = new Float32Array(data.blob);

      console.log("input sample rate", data.sampleRate);

      if (!this._soundBuffers.has(data.id)) {
        this._remoteCtx.set(data.id, new AudioContext({ sampleRate: this._sampleRate }));
        this._soundBuffers.set(data.id, new SoundBuffer(this._remoteCtx.get(data.id), this._remoteCtx.get(data.id).sampleRate, this._maxBufferLength));
      }

      const soundBuffer = this._soundBuffers.get(data.id)
      soundBuffer.addChunk(fbu);

      if (soundBuffer.length > this._triggerBufferLength && !soundBuffer.isPlaying) {
        soundBuffer.play();
      }
    });
  }

  private async _handleMicMediaStream(): Promise<void> {
    const source = this._micCtx.createMediaStreamSource(this._micMediaStream);
    const processor = this._micCtx.createScriptProcessor(this._bufferSize, 1, 1);

    source.connect(processor);
    processor.connect(this._micCtx.destination);

    processor.addEventListener("audioprocess", (e) => {
      if (this._socket && this._micMediaStream) {
        console.log("sent sample rate", e.inputBuffer.sampleRate);

        this._socket.emit("radio", {
          sampleRate: this._sampleRate,
          blob: e.inputBuffer.getChannelData(0)
        });
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
    this._micCtx = new AudioContext({ sampleRate: this._sampleRate });
    this._micMediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    await this._handleMicMediaStream();
  }

  public sendAudioSticker(sticker: string): void {
    this._socket.emit("audio_sticker", { sticker });
  }

  public getSocketId(): string {
    return this._socket && this._socket.id;
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
      return this._destroyMicMediaStream();
    }
  }
}
