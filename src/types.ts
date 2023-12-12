export type RecvData = {
    teamID: number,
    time: string,
    packetCount: number,
    flightMode: "S" | "F",
    state: string,
    altitude: number,
    airSpeed: number,
    hsDeployed: "P" | "N",
    pcDeployed: "C" | "N",
    temperature: number,
    pressure: number,
    voltage: number,
    gpsTime: string,
    gpsAltitude: number,
    gpsLatitude: number,
    gpsLongitude: number,
    gpsSats: number,
    tiltX: number,
    tiltY: number,
    rotZ: number,
    cmdEcho: string,
    debugMsg: string,
}