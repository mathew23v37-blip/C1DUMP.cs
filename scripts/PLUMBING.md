# CPM dump plumbing

Game: CarParking / Unity 2022.3.62f2 / UnityFramework
Repo dump: dump.cs on mathew23v37-blip/C1DUMP.cs
Live process: CarParking
Attach: frida -H IP:27042 -n CarParking --runtime=v8

Do not Interceptor.detachAll() in a car.
Do not write Powertrain.throttle 0x168 every tick.
Do not write LaunchControlActive 0x43 every tick (26 mph cap).

## Object tree (player car)

```
VehicleData
├── CarMat                 Material     paint / wrap
├── Powertrain             engine
│   ├── torque 0xD0        leftover, rebuilt from curve
│   ├── maxPower 0xB8
│   ├── MaxRpm 0xE0 / _maxRpm 0xDC
│   ├── throttle 0x168     INPUT — do not force
│   ├── LaunchControlArmed 0x42    ok to arm
│   ├── LaunchControlActive 0x43   do not pulse
│   ├── _maxTurboPressure 0x310
│   ├── _curTurboPressure 0x314
│   ├── GetEngineTorqueRpm   RVA 0x1CCDF8C   scale s0  [SPEED]
│   ├── GetEngineMaxTorqueRpm RVA 0x1CCDEB4  scale s0
│   ├── set_ShiftTime        RVA 0x1CC92CC   write s0
│   └── FixedUpdate          RVA 0x1CCB114
├── Wheel[4]
│   ├── wheelPos 0x34        0,1 front  2+ rear
│   ├── sidewaysGrip 0xF8    [DRIFT]
│   ├── forwardGrip 0x100    [DRIFT]
│   ├── maxSteeringAngle 0x114   [4WS] optional
│   ├── angularVelocity 0x164
│   ├── slipSmokeAmount 0x188
│   ├── compression 0x18C    hydro attempt — DID NOT BOUNCE
│   ├── isSkidSmoke 0x200
│   ├── camber 0x1C8         [STANCE]
│   ├── Temperature 0x250    gauge + smoke, NOT rotor glow
│   ├── suspensionForce 0x1C4
│   ├── FixedUpdate          RVA 0x1D0450C
│   ├── Update               RVA 0x1D02580
│   └── ProcessTemperatureFrame RVA 0x1D06654
├── LightController
│   ├── lightState 0x198
│   ├── diodsIntesity 0x19C
│   ├── BrakeMat1 0x110
│   ├── _isBrakePressed 0x208
│   ├── intensityBrakeLight 0x25C
│   ├── Update               RVA 0x1CAB62C
│   ├── TurnOnBrakeLights    RVA 0x1CAE4A0   TAIL LAMPS only
│   └── UpdateBrakesState    RVA 0x1CAE75C
├── FuelTank
│   ├── _currentFuel 0x50
│   ├── FixedUpdate          RVA 0x1CA2260
│   └── FullFuelImmediately  RVA 0x1CA34C4
├── RotorModel
│   ├── disk MeshRenderer
│   └── brake MeshRenderer   emission = real orange rotors (bridge)
└── Axle
    └── set_camber           official stance path
```

## World / not on the car

```
CarCameras.Update     0x1D218A0    distance 0x58 currentDistance 0xA8
FreeDriveTraffic      EnableAllCars 0x1D635DC
DoorOpen              Open 0x1FBC3D8 Close 0x1FBC1B8
TurboCharger          Update 0x2477B28 CreateMaxTurboLoop 0x2478140
VinylsEditor          SCALE_COEF 0x30C
BodyKitMeshMods       mp[] mesh
LatestMovingControl   walk Speed 0x58 JumpAddForce 0x2013204
```

## Current menu layers (cpm-tunes.js STACK)

- drift d1-d10 → Wheel grip front/rear
- speed s1-s10 → GetEngineTorqueRpm s0 * mult
- slam/stance → camber 0x1C8
- smoke → 0x188
- fws → 0x114 optional
- launch → Armed 0x42 only
- hydro → 0x18C NOT WORKING

## Proven vs dead

Proven: drift grip, 4WS 0x114, shift s0, paint CarMat.set_color, torque-fn multiply (user said s-tunes work on last menu)
Dead: throttle force, LC Active pulse, Temperature as rotor glow, lamps as rotor glow, hydro 0x18C

## Next focus (user 2026-08-31)

### Branch 5 — Vinyl / mesh / wrap
- VinylsEditor SCALE_COEF 0x30C — giant sticker while editor open
- BodyKitMeshMods / BodyKitMeshModMesh.mp[] — mesh dump
- CarMat.set_mainTexture — full wrap (needs PNG bytes + Texture2D.LoadImage)
- Tool: frida-il2cpp-bridge (same as rainbow paint)
- Not a Wheel.FixedUpdate flag

### Branch 6 — HUD / controller button colors (NEW)
Settings already let buttons go transparent → black.
Dump hooks to chase:
- UIButtonColor (NGUI) defaultColor / hover / pressed  RVA set_defaultColor 0x55E6F1C
- UIWidget.color / alpha on gas / brake / steer sprites
- JoyStickControl, PedalNGUI, JoystickNGUI
- CustomCameraSettings.SetButtonColor 0x1D334DC is camera menu, not drive HUD
Live path: Il2Cpp.gc.choose(UIButtonColor) while HUD is up, set_defaultColor + alpha 0 or 1.
