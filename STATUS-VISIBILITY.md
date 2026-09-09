# What friends can see (2026-09-09) — do not loop this

Friends-only lobby uses the same snapshot as public: GetAllCars2 OneCar + live transform.
There is no extra “friends can see my materials” channel.

## Proven in this project

| Effect | Friends see? | Why |
|--------|--------------|-----|
| Speed / drift / stance | YES | Position / wheels move. Physics is local; motion replicates. |
| Window RGB | YES | User confirmed on a live server. `WindowMainColor` + `SetWindowColor`. |
| Window x-ray (a=3) | NO so far | Color packet does not carry illegal alpha. Needs `OneCar.floats[46]=3` then save. |
| Body / wheel / light / spoiler shader poke | NO until save | Other clients build those meshes from OneCar `vectors` + `floats`, not your `CarMat`. |
| Rainbow / flash / HOLD loop | NEVER from save | Research 10: save is a still frame. No GIF / _Time field. |

## OneCar slots that actually travel

- `floats[21-23]` color, `[24-26]` spec, `[46]` glass slider (3 = xray)
- `floats[39-42]` smoothness (body shine)
- `vectors[28]` part colors (rims/lights/body slots). Exact index map still inferred.

## Save button that is supposed to write those

`FirebaseCarsService.SaveCurrentCar(true,true)` after `worldOneCarData.oneCar` @ VehicleData+0x440+0x48.

Pass only if status contains `floats=YES svcSave=YES` and a friend still sees it after they spawn you.

## Dead loops (do not rebuild for these)

- Scanning 0.3 like H5GG
- BrakeMat1 as headlights
- Painting WindowMat for body/wheels
- ES3 file edits
- Homemade SaveCarsPartially8 POST
