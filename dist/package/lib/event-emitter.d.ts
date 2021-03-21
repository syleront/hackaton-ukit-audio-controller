export declare class Events<EventTypes = Record<string, any>> {
    private _events;
    emit(name: keyof EventTypes, data: EventTypes[keyof EventTypes]): void;
    on(name: keyof EventTypes, _cb: (data: EventTypes[keyof EventTypes]) => void): void;
}
