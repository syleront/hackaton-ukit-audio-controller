Object.defineProperty(exports, '__esModule', { value: true });

var socket_ioClient = require('socket.io-client');

class Events {
    constructor() {
        this._events = [];
    }
    emit(name, data) {
        for (const item of this._events) {
            if (item.name === name) {
                item._cb(data);
            }
        }
    }
    on(name, _cb) {
        this._events.push({ name, _cb });
    }
}

class SoundBuffer {
    constructor(ctx, sampleRate, bufferSize = 6, debug = true) {
        this.ctx = ctx;
        this.sampleRate = sampleRate;
        this.bufferSize = bufferSize;
        this.debug = debug;
        this._chunks = [];
        this._isPlaying = false;
        this._startTime = 0;
        this._lastChunkOffset = 0;
    }
    createChunk(chunk) {
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
    log(data) {
        if (this.debug) {
            console.log(new Date().toUTCString() + " : " + data);
        }
    }
    get length() {
        return this._chunks.length;
    }
    get isPlaying() {
        return this._isPlaying;
    }
    _playFirstChunk() {
        return new Promise((resolve) => {
            if (this._chunks.length > 0) {
                this._chunks[0].addEventListener("ended", () => {
                    resolve();
                });
                this._chunks[0].start(this._startTime);
            }
            else {
                resolve();
            }
        });
    }
    async play() {
        this._isPlaying = true;
    }
    pause() {
        this._isPlaying = false;
    }
    addChunk(data) {
        if (this._isPlaying && (this._chunks.length > this.bufferSize)) {
            this.log("chunk discarded");
            return; // throw away
        }
        else if (this._isPlaying && (this._chunks.length <= this.bufferSize)) { // schedule & add right now
            this.log("chunk accepted");
            let chunk = this.createChunk(data);
            chunk.start(this._startTime + this._lastChunkOffset);
            this._lastChunkOffset += chunk.buffer.duration;
            this._chunks.push(chunk);
        }
        else if ((this._chunks.length < (this.bufferSize / 2)) && !this._isPlaying) { // add & don't schedule
            this.log("chunk queued");
            let chunk = this.createChunk(data);
            this._chunks.push(chunk);
        }
        else { // add & schedule entire buffer
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

var querystring = {
    stringify(obj) {
        if (typeof obj == "object") {
            return Object.entries(obj).map((e) => {
                e[1] = encodeURIComponent(e[1].toString());
                return e.join("=");
            }).join("&");
        }
        else {
            throw new Error("parameter must be an object");
        }
    },
    parse(string) {
        const params = string.match(/[A-z%0-9\-.]+=[A-z%0-9\-.]+/g);
        if (params !== null) {
            const obj = {};
            params.forEach((e) => {
                const param = e.split("=");
                obj[param[0]] = decodeURIComponent(param[1]);
            });
            return obj;
        }
        else {
            return null;
        }
    }
};

var request = {
    _get(url, params, options) {
        const xhr = new XMLHttpRequest();
        if (params)
            url += "?" + querystring.stringify(params);
        xhr.open("GET", url, true);
        if (options) {
            Object.entries(options).forEach((option) => {
                xhr[option[0]] = option[1];
            });
        }
        xhr.send();
        return new Promise((resolve) => {
            xhr.onreadystatechange = () => {
                if (xhr.readyState !== 4)
                    return;
                const response = {
                    statusCode: xhr.status,
                    body: xhr.response,
                    xhr
                };
                resolve(response);
            };
        });
    },
    _post(type, url, params = {}, options = {}) {
        const xhr = new XMLHttpRequest();
        xhr.open(type, url, true);
        let { headers, formData, body } = params;
        if (headers) {
            Object.entries(headers).forEach((header) => {
                xhr.setRequestHeader(header[0], header[1].toString());
            });
        }
        if (formData) {
            body = formData;
        }
        else if (body instanceof Object) {
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            body = querystring.stringify(body);
        }
        if (options) {
            Object.entries(options).forEach((option) => {
                xhr[option[0]] = option[1];
            });
        }
        xhr.send(body || "");
        return new Promise((resolve) => {
            xhr.onreadystatechange = () => {
                if (xhr.readyState !== 4)
                    return;
                const response = {
                    statusCode: xhr.status,
                    body: xhr.response,
                    xhr
                };
                resolve(response);
            };
        });
    },
    async get(url, params, options) {
        return this._get(url, params, options);
    },
    async post(url, params, options) {
        return this._post("POST", url, params, options);
    },
    async patch(url, params, options) {
        return this._post("PATCH", url, params, options);
    },
    async delete(url, params, options) {
        return this._post("DELETE", url, params, options);
    },
    async put(url, params, options) {
        return this._post("PUT", url, params, options);
    }
};

class AudioController {
    constructor(baseUrl, bufferSize = 2048, maxBufferLength = 16, triggerBufferLength = 12) {
        this._sampleRate = 48000;
        this._baseUrl = null;
        this._staticUrl = null;
        this._bufferSize = null;
        this._maxBufferLength = null;
        this._triggerBufferLength = null;
        this._socket = null;
        this._micCtx = null;
        this._micMediaStream = null;
        this._remoteCtx = new Map();
        this._soundBuffers = new Map();
        this.events = new Events();
        if (triggerBufferLength > maxBufferLength) {
            throw new Error("maxBufferLength must be greater than triggerBufferLength");
        }
        this._baseUrl = baseUrl.replace(/\/$/, "");
        this._staticUrl = `${baseUrl}/static`;
        this._bufferSize = bufferSize;
        this._maxBufferLength = maxBufferLength;
        this._triggerBufferLength = triggerBufferLength;
    }
    async _playAudioStream(src) {
        const audio = document.createElement("audio");
        audio.src = src;
        return audio.play();
    }
    _initSocketEvents() {
        console.log("init sockets", this._socket);
        this._socket.on("user_join", (data) => {
            this.events.emit("user_join", data);
        });
        this._socket.on("user_leave", (data) => {
            this.events.emit("user_leave", data);
        });
        this._socket.on("user_speak", (data) => {
            this.events.emit("user_speak", data);
        });
        this._socket.on("audio_sticker", async (data) => {
            await this._playAudioStream(`${this._staticUrl}/${data.sticker}.mp3`);
        });
        this._socket.on("voice", (data) => {
            const fbu = new Float32Array(data.blob);
            console.log("input sample rate", data.sampleRate);
            if (!this._soundBuffers.has(data.id)) {
                this._remoteCtx.set(data.id, new AudioContext({ sampleRate: this._sampleRate }));
                this._soundBuffers.set(data.id, new SoundBuffer(this._remoteCtx.get(data.id), this._remoteCtx.get(data.id).sampleRate, this._maxBufferLength));
            }
            const soundBuffer = this._soundBuffers.get(data.id);
            soundBuffer.addChunk(fbu);
            if (soundBuffer.length > this._triggerBufferLength && !soundBuffer.isPlaying) {
                soundBuffer.play();
            }
        });
    }
    async _handleMicMediaStream() {
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
            }
            else {
                console.log("media processor disconnect");
                processor.disconnect();
            }
        });
        await this._micCtx.resume();
    }
    async _destroyMicMediaStream() {
        await this._micCtx.close();
        this._micCtx = null;
        this._micMediaStream.getTracks().forEach((e) => e.stop());
        this._micMediaStream = null;
    }
    async _initMicMediaStream() {
        this._micCtx = new AudioContext({ sampleRate: this._sampleRate });
        this._micMediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        await this._handleMicMediaStream();
    }
    sendAudioSticker(sticker) {
        this._socket.emit("audio_sticker", { sticker });
    }
    getSocketId() {
        return this._socket && this._socket.id;
    }
    connect() {
        if (!this._socket) {
            this._socket = socket_ioClient.io(this._baseUrl);
            this._micCtx = new AudioContext();
            this._initSocketEvents();
        }
    }
    async disconnect() {
        if (this._micMediaStream) {
            await this._destroyMicMediaStream();
        }
        if (this._socket) {
            this._socket.disconnect();
            this._socket = null;
        }
    }
    async getUsers() {
        const r = await request.get(`${this._baseUrl}/users`);
        if (r.statusCode === 200) {
            return JSON.parse(r.body);
        }
        else {
            throw new Error(`Server error, returned code: ${r.statusCode}`);
        }
    }
    isConnected() {
        return this._socket !== null;
    }
    isSpeakEnabled() {
        return this._micMediaStream !== null && this._micCtx !== null;
    }
    async speakOn() {
        if (!this.isSpeakEnabled()) {
            return this._initMicMediaStream();
        }
    }
    async speakOff() {
        if (this.isSpeakEnabled()) {
            return this._destroyMicMediaStream();
        }
    }
}

exports.AudioController = AudioController;
//# sourceMappingURL=index.js.map
