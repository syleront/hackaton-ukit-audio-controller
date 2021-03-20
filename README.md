### Быстрый старт

Установка
```cmd
npm i hackaton-uikit-audio-controller
```

Использование
```js
import { AudioController } from "hackaton-uikit-audio-controller";

const audioController = new AudioController("https://somebaseurl.com");

// ***

someConnectButton.addEventListener("click", async () => {
  if (audioController.isConnected()) {
    await audioController.disconnect();
  } else {
    audioController.connect();
  }
});

someMicrophoneButton.addEventListener("click", async () => {
  if (audioController.isSpeakEnabled()) {
    await audioController.speakOff();
  } else {
    await audioController.speakOn();
  }
});

```

### Методы

`AudioController(baseUrl: string, bufferSize?: number = 2048)`

Основной конструктор класса
* baseUrl - URL адрес сокет-сервера
* bufferSize - размер буфера аудио пакетов

```js
const audioController = new AudioController("https://somebaseurl.com", 2048);
```

---

`isConnected(): boolean`

Состояние подключения, true если подключение активно, false если нет.

```js
const isConnected = audioController.isConnected();
```

---

`connect(): Promise<void>`

Процедура подключения к сокет-серверу.

```js
audioController.connect();
```

---

`disconnect(): Promise<void>`

Процедура отключения от сокет-сервера.

**Важно**: после отключения от сервера, микрофон пользователя также отключается.

```js
audioController.diconnect().then(() => {
  console.log("Disconnected");
});
```

---

`isSpeakerEnabled(): boolean`

Процедура получения статуса микрофона, true если микрофон в данный момент используется и данные передаются на сервер, false если микрофон не активен.

```js
audioController.diconnect().then(() => {
  console.log("Disconnected");
});
```

---

`getUsers() => Promise<string[]>`

Функция получения подключенных пользователей, возвращает массив, состоящий из id сокетов пользователей.

```js
audioController.getUsers().then((users) => {
  for (const user of users) {
    console.log(user);
  }
});
```
