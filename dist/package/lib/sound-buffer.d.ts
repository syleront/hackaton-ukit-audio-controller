export declare class SoundBuffer {
    ctx: AudioContext;
    sampleRate: number;
    bufferSize: number;
    private debug;
    private _chunks;
    private _isPlaying;
    private _startTime;
    private _lastChunkOffset;
    constructor(ctx: AudioContext, sampleRate: number, bufferSize?: number, debug?: boolean);
    private createChunk;
    private log;
    get length(): number;
    get isPlaying(): boolean;
    private _playFirstChunk;
    play(): Promise<void>;
    pause(): void;
    addChunk(data: Float32Array): void;
}
