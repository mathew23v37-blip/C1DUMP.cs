# Prep: vinyl/wrap + HUD colors (no build yet)

Date: 2026-08-31
Dump: dump.cs Unity 2022.3.62f2 / process CarParking
Tool for this branch: frida-il2cpp-bridge (same as working rainbow), NOT Wheel.FixedUpdate.

## Do not confuse

| Want | Not this |
|------|----------|
| Full car wrap | VinylsEditor stickers only |
| HUD gas/brake pads | CustomCameraSettings.SetButtonColor (camera sliders) |
| Orange rotors | Wheel.Temperature / TurnOnBrakeLights |

## A. Full wrap (first milestone)

Chain:
VehicleData.CarMat (Material @ 0xB0)
  -> UnityEngine.Texture2D.LoadImage(tex, byte[]) RVA 0x62C5348
  -> Material.set_mainTexture RVA 0x62341F4
  -> or Material.SetTexture(string, Texture) RVA 0x623434C / 0x6227DF8

Need on device:
- PNG readable by the game process (sandbox). Last try /var/mobile/Documents/wrap.png = file missing.
- Confirm Filza path AND that CarParking can open it (often app container, not /var/mobile/Documents).
- Fallback: push bytes through Frida send() so we never touch the filesystem.

Prep tests (bridge, read-only first):
1. gc.choose(VehicleData) count + CarMat name
2. list Material methods containing Texture
3. File.Exists on 3 candidate paths
4. Only then LoadImage + set_mainTexture

Risks: wrong _MainTex name on CPM shader; wrap only body not glass; game resets CarMat on garage exit.

## B. Vinyl editor (second)

VinylsEditor @ dump 173460
- _currentVinyl 0x1E0 / _currentVinylRenderer 0x1E8
- SCALE_COEF 0x30C
- CreateVinyl 0x2688F00
- ScaleX/Y UIInput + sliders
Only live when vinyl menu is open. Good for giant sticker, not full wrap.

## C. Mesh (third, later)

BodyKitMeshModMesh.mp[] — sculpt. Separate tool. Do not block wrap.

## D. HUD button colors

NGUI, not UnityEngine.UI.
- UIButtonColor.set_defaultColor RVA 0x55E6F1C
  fields: hover 0x28 pressed 0x38 mDefaultColor 0x6C mWidget 0x80
  UpdateColor 0x55E7748
- UIWidget.set_color 0x564232C  set_alpha 0x56423DC  mColor 0xB0
- Drive HUD likely JoystickNGUI / PedalNGUI widgets, not every UIButtonColor in menus.

Prep tests (HUD visible, in car):
1. gc.choose(UIButtonColor) count + sample defaultColor
2. gc.choose(UIWidget) with alpha between 0 and 1 (settings transparency)
3. Set one widget alpha 0 — if gas/brake vanish, we have the right objects
4. set_defaultColor black (0,0,0,1) + UpdateColor(true)

No dump string for ButtonsOpacity. Settings slider almost certainly writes UIWidget.alpha or UIButtonColor.mDefaultColor.a.

## E. Attach plan

Two processes of work:
- cpm-tunes.js stays native drift/speed (do not mix il2cpp-bridge into it)
- New bridge script: wrap + hud only
Rainbow already proved Il2Cpp.perform + CarMat.set_color.

## F. Still needed from you before code

1. Filza: copy a small PNG, send the exact full path
2. Confirm settings control-color slider name as shown in UI (screenshot text)
3. Stay in a spawned car when we test wrap (CarMat count was 0 in menus)
