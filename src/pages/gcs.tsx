import { Suspense, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet'
import "leaflet/dist/leaflet.css";
import { Canvas } from "@react-three/fiber"
import { Environment, OrbitControls } from "@react-three/drei"
import reload from "../assets/reload.png";
// import { AreaChart, Area, CartesianGrid, Tooltip, XAxis, YAxis, LineChart, Line, Legend, ResponsiveContainer } from "recharts"
import SmoothieComponent, { TimeSeries } from "react-smoothie";
import { type RecvData } from "../types";
import { Model } from "../Cansat.tsx"
import { simpdata } from "../../simp.ts"
import logo from "../assets/logo.png"
import cu from "../assets/cu.png"
import { initializeApp } from "firebase/app";
import { getDatabase, set, get, ref } from "firebase/database"

const firebaseConfig = {
  apiKey: "AIzaSyAmRc9DDzMmNh_YT5PmQd3X6A_mJZG7WXA",
  authDomain: "personal-projects-69.firebaseapp.com",
  databaseURL: "https://personal-projects-69-default-rtdb.firebaseio.com",
  projectId: "personal-projects-69",
  storageBucket: "personal-projects-69.appspot.com",
  messagingSenderId: "800698599496",
  appId: "1:800698599496:web:9e0f1f4cac1c0b1584307d"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase();

const teamId = 2117;

const millisppixel = 100;

const consoleInit =
  `    > CONSOLE <

>> Incoming telemetry
<< Outgoing telemetry
## Debug Message

=====================
`

function generateLightPositions() {
  let combinations = [];
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      for (let k = -1; k <= 1; k++) {
        combinations.push([i, j, k]);
      }
    }
  }
  return combinations;
}


// function useScreenSize() {
//   const [size, setSize] = useState<{ width: number, height: number }>({ width: window.innerWidth, height: window.innerHeight });
//   useEffect(() => {
//     const handleResize = () => {
//       setSize({ width: window.innerWidth, height: window.innerHeight })
//     }
//     window.addEventListener("resize", handleResize);
//     return () => window.removeEventListener("resize", handleResize);
//   }, []);
//   return size;
// }

const timesconfig = {
  resetBounds: true,
  resetBoundsInterval: 1000,
}

function GCS() {
  // const { width, height } = useScreenSize();
  const [serialPorts, setSerialPorts] = useState<string[]>([]);
  const [selectedPort, setSelectedPort] = useState<string>("NONE");
  const [result, setResult] = useState<string>("");
  const [reading, setReading] = useState(false);
  const [intrvl, setIntrvl] = useState<NodeJS.Timeout>();
  const [primData, setPrimData] = useState<RecvData>();
  const [telemetry, setTelemetry] = useState(true);
  const [mqttConnected, setMqttConnected] = useState(false);
  const [simpInterval, setSimpInterval] = useState<NodeJS.Timeout>();
  const [simpRunning, setSimpRunning] = useState(false);
  const [consoleOut, setConsoleOut] = useState<string>(consoleInit);
  const [command, setCommand] = useState<string>("");
  const [temperatureTS, setTemperatureTS] = useState<TimeSeries>(new TimeSeries(timesconfig));
  const [pressureTS, setPressureTS] = useState<TimeSeries>(new TimeSeries(timesconfig));
  const [altitudeTS, setAltitudeTS] = useState<TimeSeries>(new TimeSeries(timesconfig));
  const [airSpeedTS, setAirSpeedTS] = useState<TimeSeries>(new TimeSeries(timesconfig));
  const [gpsAltitudeTS, setGpsAltitudeTS] = useState<TimeSeries>(new TimeSeries(timesconfig));

  // if (!window.__TAURI_IPC__) window.location.href = "/web";


  const lightPositions = generateLightPositions()

  async function writeSerial(data: string) {
    await invoke("write_serial", { writeData: data });
    setConsoleOut((p) => p + "\n<< " + data);
  }

  function clearGraphs() {
    temperatureTS.clear();
    pressureTS.clear();
    altitudeTS.clear();
    airSpeedTS.clear();
    gpsAltitudeTS.clear();
  }

  async function getPorts() {
    const a: string[] = await invoke("get_ports");
    console.log(a);
    setSerialPorts(a);
  }

  async function getMqttStatus() {
    const a: boolean = await invoke("get_mqtt_status");
    // console.log("mqtt:", a)
    setMqttConnected(a);
  }

  async function connect_mqtt() {
    if (!mqttConnected) await invoke("connect_mqtt");
    else await invoke("disconnect_mqtt");
  }

  useEffect(() => {
    if (window.__TAURI_IPC__)
      setInterval(() => getMqttStatus(), 500);
  }, []);

  useEffect(() => {
    console.log(result)
    if (!result) return
    const data = result.split(",,")
    const pd = data[0].split(",")
    console.log(pd)
    if (window.__TAURI_IPC__)
      set(ref(db, "2117"), pd.toString())
    const ed = data[1] ? data[1].split(",") : ["", ""]
    const primaryData: RecvData = {
      teamID: parseInt(pd[0]) ? parseInt(pd[0]) : -1,
      time: pd[1],
      packetCount: parseInt(pd[2]) ? parseInt(pd[2]) : -1,
      flightMode: pd[3],
      state: pd[4],
      altitude: parseFloat(pd[5]) ? parseFloat(pd[5]) : -1,
      airSpeed: parseFloat(pd[6]) ? parseFloat(pd[6]) : -1,
      hsDeployed: pd[7],
      pcDeployed: pd[8],
      temperature: parseFloat(pd[9]) ? parseFloat(pd[9]) : -1,
      voltage: parseFloat(pd[10]) ? parseFloat(pd[10]) : -1,
      pressure: parseFloat(pd[11]) ? parseFloat(pd[11]) : -1,
      gpsTime: pd[12],
      gpsAltitude: parseFloat(pd[13]) ? parseFloat(pd[13]) : -1,
      // gpsLatitude: parseFloat(pd[14]) ? parseFloat(pd[14]) : -1,
      // gpsLongitude: parseFloat(pd[15]) ? parseFloat(pd[15]) : -1,
      gpsLatitude: 30.7688,
      gpsLongitude: 76.5754,
      gpsSats: parseInt(pd[16]) ? parseInt(pd[16]) : -1,
      tiltX: parseFloat(pd[17]),
      tiltY: parseFloat(pd[18]),
      rotZ: parseFloat(pd[19]),
      cmdEcho: pd[20],
      debugMsg: ed[0]
    };
    setPrimData(primaryData);
    console.log(primaryData);
    // console.log(ed)
    if (ed[0]) {
      // toast(ed[0], { icon: "ℹ️" })
      setConsoleOut(consoleOut + "\n## " + ed[0]);
      invoke("send_command", { telem: "ACK" });
    }
    //////
    var time = new Date().getTime();
    temperatureTS.append(time, primaryData?.temperature!);
    primaryData?.pressure != 0 && pressureTS.append(time, primaryData?.pressure!);
    // airSpeedTS.append(time, primaryData?.airSpeed!);
    altitudeTS.append(time, primaryData?.altitude!);
    gpsAltitudeTS.append(time, primaryData?.gpsAltitude!);

    // temperatureTS.append(time, Math.random() * 10);
    // pressureTS.append(time, Math.random());
    airSpeedTS.append(time, Math.random());
    // altitudeTS.append(time, Math.random());
    // gpsAltitudeTS.append(time, Math.random());
  }, [result]);

  useEffect(() => {
    getPorts();
  }, []);

  useEffect(() => {
    console.log(selectedPort, reading);
    // setResult("");
    // if (!window.__TAURI_IPC__) {
    //   get(ref(db, "2117")).then((snapshot) => {
    //     if (snapshot.exists()) {
    //       console.log(snapshot.val());
    //       setResult(snapshot.val());
    //     } else {
    //       console.log("No data available");
    //     }
    //   }).catch((error) => {
    //     console.error(error);
    //   })
    //   return
    // }
    if (!selectedPort) {
      setReading(!reading);
      clearInterval(intrvl);
    } else if (!window.__TAURI_IPC__ ||reading && selectedPort) {
      clearInterval(intrvl);
      setIntrvl(
        setInterval(() => {
          if (window.__TAURI_IPC__)
            invoke("read_serial").then((e: any) => {
              // console.log(e)
              setResult(e.toString());
            }).catch((e) => {
              console.log(e)
              setReading(false);
              clearInterval(intrvl);
            });
          else
            get(ref(db, "2117")).then((snapshot) => {
              if (snapshot.exists()) {
                console.log(snapshot.val());
                setResult(snapshot.val());
              } else {
                console.log("No data available");
              }
            }).catch((error) => {
              console.error(error);
            })
        }, 200),
      );
      setReading(false);
    }
  }, [selectedPort]);

  async function sendSimpDataPerSecond() {
    if (selectedPort == "NONE") return
    const simpList = simpdata.split("\n").filter((e) => e.startsWith("CMD"));
    console.log(simpList);
    let i = 0;
    if (simpRunning) {
      clearInterval(simpInterval!);
      setSimpRunning(false);
      return
    }
    // clearGraphs();
    const si = setInterval(() => {
      if (i >= simpList.length) {
        console.log("Stopped SIMP")
        clearInterval(simpInterval);
        setSimpRunning(false);
        return;
      }
      console.log("writing simp: ", simpList[i]);
      writeSerial(simpList[i]);
      i++;
    }, 1000)
    setSimpRunning(true);
    setSimpInterval(si);
  }

  async function setPort(port_name: string) {
    // if (port_name === "NONE") return;
    // if (port_name === "SIMULATE") return sendSimpDataPerSecond();
    clearInterval(simpInterval!);
    setSimpRunning(false);
    await invoke("set_port", { newPortName: port_name })
    setSelectedPort(port_name);
    setReading(true);
    console.log("set port", port_name);

  }

  return <div className="grid grid-cols-3 w-screen h-screen justify-center">
    {/* <Toaster /> */}
    <div className="flex flex-col col-span-2">
      <div className="flex items-center justify-between  py-1">
        <img src={logo} className="h-14 opacity-90 pl-1" />
        <div className="text-4xl font-bold text-center text-black/90">GROUND CONTROL STATION</div>
        <img src={cu} className="h-14 pr-1" />
      </div>
      <div className="p-1 flex justify-start items-center gap-2">
        <div id="battery" className="bg-black/5  h-[30px] w-20 ring-1 ring-black/70 m-1 rounded relative z-0 flex items-center justify-center">
          <div className="font-bold">12.0V</div>
          <div className="bg-green-400 rounded h-[30px] w-[50%] absolute left-0 top-0 -z-10"></div>
          <div className="absolute -right-1.5 bottom-2.5 bg-black h-[13px] w-1.5 rounded-r z-0"></div>
        </div>
        <select
          className="text-black bg-green-400 h-fit py-1"
          onChange={(e) => setPort(e.target.value)}
        >
          <option value="NONE">no port selected</option>
          {/* <option value="SIMULATE">simluate</option> */}
          {serialPorts.map((port_name) => (
            <option key={port_name} value={port_name}>
              {port_name}
            </option>
          ))}
        </select>
        <button className="" onClick={() => getPorts()}>
          <img
            src={reload}
            className="active:rotate-90"
            width={16}
            height={16}
          />
        </button>
        {/* <button className={`${telemetry ? "bg-green-300" : "bg-red-100"} h-fit text-black rounded active:bg-black active:text-green-500 ring-1 px-2 ring-green-500`} */}
        {/*   onClick={() => { */}
        {/*     // invoke("send_command", { telem: `CX,${telemetry ? "OFF" : "ON"}` }); */}
        {/*     writeSerial(`CMD,${teamId},CX,${telemetry ? "OFF" : "ON"}`) */}
        {/*     setTelemetry(!telemetry); */}
        {/*   }} > */}
        {/*   {telemetry ? "DISABLE" : "ENABLE"} COMMS</button> */}
        {/* <label htmlFor="cx">CX</label> */}
        {/*}<input type="checkbox" id="cx" checked={telemetry} onChange={(e) => {
          invoke("send_command", { telem: `CX,${e.target.checked ? "ON" : "OFF"}` });
          setTelemetry(e.target.checked);
        }} />*/}
        <div className="grow"></div>
        <div>
          <div className="flex justify-between items-center gap-1">
            <label htmlFor="sim-enable" >SIMP ENABLE</label>
            <input id="sim-enable" type="checkbox" onChange={(e) => {
              e.target.checked && writeSerial(`CMD,${teamId},SIM,ENABLE`)
              !e.target.checked && writeSerial(`CMD,${teamId},SIM,DISABLE`)
            }} />
          </div>
          <div className="flex justify-between items-center gap-1">
            <label htmlFor="sim-activate" >SIMP ACTIVATE</label>
            <input id="sim-activate" type="checkbox" onChange={(e) => {
              e.target.checked && writeSerial(`CMD,${teamId},SIM,ACTIVATE`)
              !e.target.checked && writeSerial(`CMD,${teamId},SIM,DEACTIVATE`)
            }} />
          </div>
        </div>

        <button onClick={sendSimpDataPerSecond} disabled={selectedPort == "NONE"} className={`${simpRunning ? "bg-green-300" : "bg-red-200"} h-fit text-black rounded active:bg-black active:text-green-500 ring-1 px-1 ring-green-500`}>
          {simpRunning ? "STOP SIM" : "START SIM"}
        </button>
        <button onClick={connect_mqtt} disabled={selectedPort == "NONE"} className={`${mqttConnected ? "bg-green-300" : "bg-red-200"} h-fit text-black rounded active:bg-black active:text-green-500 ring-1 px-1 ring-green-500`}>
          {mqttConnected ? "STOP MQTT" : "START MQTT"}
        </button>

      </div>
      <div className="grow flex flex-col relative">
        <div className="flex justify-between px-1">
          <pre className="text-left text-black text-xs pl-2">Internal Clock : {primData?.time || "00:00:00"}<br />GPS Clock (UTC): {primData?.gpsTime || "00:00:00"}</pre>
          <button className={`${telemetry ? "bg-green-300" : "bg-red-100"} h-fit text-black rounded active:bg-black active:text-green-500 ring-1 px-2 ring-green-500`}
            onClick={() => {
              // invoke("send_command", { telem: `CX,${telemetry ? "OFF" : "ON"}` });
              writeSerial(`CMD,${teamId},CX,${telemetry ? "OFF" : "ON"}`)
              setTelemetry(!telemetry);
            }} >
            {telemetry ? "DISABLE" : "ENABLE"} COMMS</button>

        </div>
        <div className="grid grid-cols-2 gap-2 p-2 justify-evenly grow">
          <div className="border border-black/50 rounded bg-black/5 h-fit">
            <div className="text-center">Temperature [{primData?.temperature || 0}℃] 🌡</div>
            <SmoothieComponent responsive className="rounded" millisPerPixel={millisppixel} grid={
              { strokeStyle: "rgba(0,0,0,0.1)", fillStyle: "rgba(255,255,255,0.9)" }
            } labels={{ fillStyle: "rgb(0,0,0)" }}
              minValueScale={1.5} maxValueScale={1.5} minValue={0} maxValue={50}
              height={window.innerWidth * 0.15}
              series={
                [{
                  data: temperatureTS,
                  strokeStyle: { r: 255 },
                  lineWidth: 2
                }]}
              tooltip={props => {
                if (!props.display) return <></>
                const timeString = new Date(props.time as number).toLocaleTimeString();
                return <pre className="relative z-30 w-full bg-white text-black p-1 ring-1 ring-black/50 ml-3 rounded text-center">
                  {timeString}<br />
                  <span className="text-[#f00]">{parseFloat(props.data![0].value.toString()).toFixed(2)}°C</span>
                </pre>
              }}
            />
          </div>
          <div className="border border-black/50 rounded bg-black/5 h-fit">
            <div className="text-center">Air Speed [{primData?.airSpeed || 0} kmph] 🌬</div>
            <SmoothieComponent responsive className="rounded" millisPerPixel={millisppixel} grid={
              { strokeStyle: "rgba(0,0,0,0.1)", fillStyle: "rgba(255,255,255,0.9)" }
            } labels={{ fillStyle: "rgb(0,0,0)" }}
              minValueScale={1.5} maxValueScale={1.5}
              maxValue={10} minValue={-10}
              height={window.innerWidth * 0.15}
              series={
                [{
                  data: airSpeedTS,
                  strokeStyle: { g: 136, b: 136 },
                  lineWidth: 2
                }]}
              tooltip={props => {
                if (!props.display) return <></>
                const timeString = new Date(props.time as number).toLocaleTimeString();
                return <pre className="relative z-30 w-full bg-white text-black p-1 ring-1 ring-black/50 ml-3 rounded text-center">
                  {timeString}<br />
                  <span className="text-[#088]">{parseFloat(props.data![0].value.toString()).toFixed(2)} kmph</span>
                </pre>
              }}
            />
          </div>
          <div className="border border-black/50 rounded bg-black/5 h-fit">
            <div className="text-center">Pressure [{primData?.pressure || 0} P] 💨</div>
            <SmoothieComponent responsive className="rounded" millisPerPixel={millisppixel} grid={
              { strokeStyle: "rgba(0,0,0,0.1)", fillStyle: "rgba(255,255,255,0.9)" }
            } labels={{ fillStyle: "rgb(0,0,0)" }}
              maxValue={100000} minValue={80000} minValueScale={1.5} maxValueScale={1.5}
              height={window.innerWidth * 0.15}
              scaleSmoothing={0.1}
              interpolation="linear"
              nonRealtimeData={false}
              doNotSimplifyData
              streamDelay={10}
              series={
                [{
                  data: pressureTS,
                  strokeStyle: { r: 153, g: 153 },
                  lineWidth: 2
                }]}
              tooltip={props => {
                if (!props.display) return <></>
                const timeString = new Date(props.time as number).toLocaleTimeString();
                return <pre className="relative z-30 w-full bg-white text-black p-1 ring-1 ring-black/50 ml-3 rounded text-center">
                  {timeString}<br />
                  <span className="text-[#660]">{parseFloat(props.data![0].value.toString()).toFixed(2)} Pascals</span>
                </pre>
              }}
            />
          </div>
          <div className="border border-black/50 rounded bg-black/5 h-fit">
            <div className="flex min-w-full w-full">
              <div className="grow">
                <div className="text-center">Altitude [{primData?.altitude || 0}m] 🗻</div>
                <SmoothieComponent responsive className="rounded grow min-w-[100%]" millisPerPixel={millisppixel} grid={
                  { strokeStyle: "rgba(0,0,0,0.1)", fillStyle: "rgba(255,255,255,0.9)" }
                } labels={{ fillStyle: "rgb(0,0,0)" }} minValue={-100} maxValue={1000}
                  minValueScale={1.5} maxValueScale={1.5}
                  height={window.innerWidth * 0.15}
                  series={[
                    {
                      data: altitudeTS,
                      strokeStyle: { r: 255 },
                      lineWidth: 2
                    },
                    {
                      data: gpsAltitudeTS,
                      strokeStyle: { g: 153 },
                      lineWidth: 2
                    }
                  ]}
                  tooltip={props => {
                    if (!props.display) return <></>
                    const timeString = new Date(props.time as number).toLocaleTimeString();
                    return <pre className="relative z-30 w-full bg-white text-black p-1 ring-1 ring-black/50 ml-3 rounded text-center">
                      {timeString}<br />
                      <span className="text-[#f00]">Altitude: {parseFloat(props.data![0].value.toString()).toFixed(2)}m</span><br />
                      <span className="text-[#090]">GPS Alti: {parseFloat(props.data![1].value.toString()).toFixed(2)}m</span>
                    </pre>
                  }}
                />
              </div>
              {/* <div className="w-5 bg-gradient-to-t from-amber-600/50 to-blue-300 relative flex flex-col items-center rounded-r"> */}
              {/*   <img src={rocket} className="w-[50px] min-w-[50px] absolute bottom-10" /> */}
              {/* </div> */}
            </div>
          </div>
          <div className="border border-black/50 rounded bg-black/5 min-h-[200px] p-1">
            <div className="bg-black/60 text-white h-full text-center rounded">
              Live Feed
            </div>
          </div>
          <div className="border border-black/50 rounded bg-black/5 p-2 flex flex-col justify-center">
            <pre className="text-lg text-center mb-2">SYSTEM STATUS</pre>
            <div className="grid grid-cols-3 justify-center items-center gap-1 grow mx-auto">
              <pre>
                🟢 IMU
              </pre>
              <pre>
                🟢 Barometer
              </pre>
              <pre>
                🟢 GPS
              </pre>
              <pre>
                🟢 Telemetry
              </pre>
              <pre>
                🔴 Airspeed
              </pre>
              <pre>
                🔴 Camera
              </pre>
              <pre>
                🟡 SATS:5
              </pre>
              <pre>
                🟢 RSSI:-8dBm
              </pre>
            </div>
          </div>
        </div>
        <pre className="text-center text-black text-xs mb-2">{result || "."}</pre>
      </div>
    </div>
    <div className="h-screen grid grid-rows-3 max-w-[33%] border-l border-black/50">
      <div className="flex flex-col">
        <div className="relative flex h-full">
          <Canvas camera={{ position: [4, 0, 0], zoom: 1.3 }} className="">
            <OrbitControls enableZoom enablePan={false} />
            {
              lightPositions.map((position, index) => (
                <directionalLight key={index} position={position} intensity={0.25} />
              ))
            }
            <Suspense>
              <Model rotation={[-primData?.tiltX * Math.PI / 90 || 0, 0, primData?.tiltY * Math.PI / 90 || 0]} />
            </Suspense>
          </Canvas>
          <div className="absolute bottom-0 left-0 right-0">
            <pre className="text-sm p-0.5 border w-fit border-black/20">
              Tilt X : {primData?.tiltX}°<br />
              Tilt Y : {primData?.tiltY}°<br />
              Rot  Z : {primData?.rotZ}°<br />
            </pre>
            <div className="w-full text-left">LAUNCH_WAIT</div>
          </div>
        </div>
      </div>
      <div className="bg-black/10 relative overflow-clip h-full border-t border-black/20" id="map">
        <MapContainer center={primData ? [primData.gpsLatitude, primData.gpsLongitude] : [30.7687836, 76.5741186]} zoom={17} scrollWheelZoom={false} className="h-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          />
          <CircleMarker center={primData ? [primData.gpsLatitude, primData.gpsLongitude] : [30.7687836, 76.5741186]} radius={3} color="red" >
            <Popup>Vayu Cansat</Popup>
          </CircleMarker>
        </MapContainer>

      </div>
      <div className="bg-white flex flex-col-reverse text-justify font-bold text-green-700 w-full border-t border-black/30">
        <input type="text" className="bg-black/20 ring-1 ring-white/20 text-green-700 outline-none w-full px-2" value={command}
          onChange={(e) => {
            e.stopPropagation();
            setCommand(e.target.value);
          }}
          onKeyDownCapture={(e) => {
            e.stopPropagation();
            if (!command) return
            if (e.key === "Enter") {
              writeSerial(command);
              setCommand("")
            }
          }}
        />
        <pre className="grow p-1 px-2 overflow-scroll flex flex-col-reverse">
          {consoleOut}
        </pre>
      </div>
    </div>
  </div>
}

export default GCS;
