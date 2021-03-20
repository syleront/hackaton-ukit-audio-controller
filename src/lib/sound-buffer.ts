export class SoundBuffer {
  private _chunks: Array<AudioBufferSourceNode> = [];
  private _isPlaying: boolean = false;
  private _startTime: number = 0;
  private _lastChunkOffset: number = 0;

  constructor(
    public ctx: AudioContext,
    public sampleRate: number,
    public bufferSize: number = 6,
    private debug = true
  ) {

  }

  private createChunk(chunk: Float32Array) {
    const audioBuffer = this.ctx.createBuffer(1, chunk.length, this.sampleRate);
    audioBuffer.getChannelData(0).set(chunk);

    const source = this.ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.ctx.destination);
    source.addEventListener("ended", (e) => {
      this._chunks.splice(this._chunks.indexOf(source), 1);

      if (this._chunks.length == 0) {
        this._isPlaying = false;
        this._startTime = 0;
        this._lastChunkOffset = 0;
      }
    });

    return source;
  }

  private log(data: string) {
    if (this.debug) {
      console.log(new Date().toUTCString() + " : " + data);
    }
  }

  public get length(): number {
    return this._chunks.length;
  }

  public get isPlaying(): boolean {
    return this._isPlaying;
  }

  private _playFirstChunk(): Promise<void> {
    return new Promise((resolve) => {
      if (this._chunks.length > 0) {
        this._chunks[0].addEventListener("ended", () => {
          resolve();
        });

        this._chunks[0].start(this._startTime);
      } else {
        resolve();
      }
    });
  }

  public async play(): Promise<void> {
    this._isPlaying = true;
  }

  public pause(): void {
    this._isPlaying = false;
  }

  public addChunk(data: Float32Array) {
    if (this._isPlaying && (this._chunks.length > this.bufferSize)) {
      this.log("chunk discarded");
      return; // throw away
    } else if (this._isPlaying && (this._chunks.length <= this.bufferSize)) { // schedule & add right now
      this.log("chunk accepted");
      let chunk = this.createChunk(data);
      chunk.start(this._startTime + this._lastChunkOffset);
      this._lastChunkOffset += chunk.buffer.duration;
      this._chunks.push(chunk);
    } else if ((this._chunks.length < (this.bufferSize / 2)) && !this._isPlaying) {  // add & don't schedule
      this.log("chunk queued");
      let chunk = this.createChunk(data);
      this._chunks.push(chunk);
    } else { // add & schedule entire buffer
      this.log("queued chunks scheduled");
      this._isPlaying = true;

      let chunk = this.createChunk(data);
      this._chunks.push(chunk);
      this._startTime = this.ctx.currentTime;
      this._lastChunkOffset = 0;

      for (let i = 0; i < this._chunks.length; i++) {
        let chunk = this._chunks[i];
        chunk.start(this._startTime + this._lastChunkOffset);
        this._lastChunkOffset += chunk.buffer.duration;
      }
    }
  }
}
