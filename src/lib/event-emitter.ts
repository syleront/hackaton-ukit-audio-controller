export class Events<EventTypes = Record<string, any>> {
  private _events: Array<{ name: keyof EventTypes, _cb: (data: EventTypes[keyof EventTypes]) => void }> = [];

  public emit(name: keyof EventTypes, data: EventTypes[keyof EventTypes]): void {
    for (const item of this._events) {
      if (item.name === name) {
        item._cb(data);
      }
    }
  }

  public on(name: keyof EventTypes, _cb: (data: EventTypes[keyof EventTypes]) => void): void {
    this._events.push({ name, _cb });
  }
}
