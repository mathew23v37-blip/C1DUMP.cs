// CPM PIMP director
// Wheels + engine + neon + cam + fuel + TURBO + DANCING DOORS
// dump: mathew23v37-blip/C1DUMP.cs
//
// frida -H IP:27042 -n "CarParking" -l C:\cpm-mods\cpm-director.js
// rpc.exports.pimp()
// Do NOT detachAll() in a car.

var uf = Process.findModuleByName("UnityFramework");
if (!uf) throw new Error("UnityFramework missing — enter the world first");

var on = {
  ice: false, drift: false, drag: false, rocket: false, yeet: false, god: false,
  fws: false, tank: false, crab: false, rearSteer: false, stance: false, slam: false,
  spin: false, smoke: false, bounce: false, sticky: false,
  fuel: false, ghost: false, neon: false, hood: false, drone: false, shake: false,
  turbo: false, doors: false
};

var tick = 0;
var neonFlip = 0;
var doorOpenState = false;
var doors = {};
var turbos = {};

var fnOpenDoor = new NativeFunction(uf.base.add(0x1FBC3D8), "void", ["pointer"]);
var fnCloseDoor = new NativeFunction(uf.base.add(0x1FBC1B8), "void", ["pointer"]);
var fnTurboMax = new NativeFunction(uf.base.add(0x2478140), "void", ["pointer"]);
var fnTurboShot = new NativeFunction(uf.base.add(0x2478398), "void", ["pointer"]);

function wset(w, o, v) { try { w.add(o).writeFloat(v); } catch (e) {} }
function wbit(w, o, v) { try { w.add(o).writeU8(v); } catch (e) {} }
function pset(p, o, v) { try { p.add(o).writeFloat(v); } catch (e) {} }
function pbit(p, o, v) { try { p.add(o).writeU8(v); } catch (e) {} }

function tog(name, v) {
  if (typeof v === "undefined") on[name] = !on[name];
  else on[name] = !!v;
  console.log("[+] " + name + "=" + on[name]);
  return name + "=" + on[name];
}

function anyOn() {
  for (var k in on) if (on[k]) return true;
  return false;
}

function isRear(w) {
  try { return w.add(0x34).readS32() >= 2; } catch (e) { return true; }
}

function allOff() {
  for (var k in on) on[k] = false;
  console.log("[+] ALL OFF");
  return "off";
}

function preset(name, map) {
  allOff();
  for (var k in map) on[k] = true;
  console.log("[PRESET] " + name);
  return name;
}

function remember(map, p) {
  if (!p || p.isNull()) return;
  map[p.toString()] = p;
}

// collect DoorOpen instances
Interceptor.attach(uf.base.add(0x1FBBE0C), {
  onEnter: function (args) { remember(doors, args[0]); }
});
Interceptor.attach(uf.base.add(0x1FBC3D8), {
  onEnter: function (args) { remember(doors, args[0]); }
});

// collect TurboCharger instances
Interceptor.attach(uf.base.add(0x24778A0), {
  onEnter: function (args) { remember(turbos, args[0]); }
});
Interceptor.attach(uf.base.add(0x2477B28), {
  onEnter: function (args) {
    remember(turbos, args[0]);
    if (!on.turbo) return;
    try { args[0].add(0x2C).writeFloat(1.0); } catch (e) {}
  }
});

// Wheels
Interceptor.attach(uf.base.add(0x1D0450C), {
  onEnter: function (args) {
    if (!anyOn()) return;
    var w = args[0];
    tick++;
    if (on.ice) { wset(w, 0xF8, 0.01); wset(w, 0x100, 0.01); wset(w, 0x114, 80); }
    if (on.drift) {
      if (isRear(w)) { wset(w, 0xF8, 0.10); wset(w, 0x100, 0.22); }
      else { wset(w, 0xF8, 1.25); wset(w, 0x100, 0.95); }
    }
    if (on.sticky || on.drag) { wset(w, 0xF8, 8); wset(w, 0x100, 10); }
    if (on.god) { wset(w, 0xF8, 7); wset(w, 0x100, 9); }
    if (on.fws || on.ice) wset(w, 0x114, on.tank ? 90 : 58);
    if (on.tank) { wset(w, 0x114, 90); wset(w, 0xF8, 0.18); }
    if (on.crab) wset(w, 0x114, 62);
    if (on.rearSteer && isRear(w)) wset(w, 0x114, 50);
    if (on.stance || on.slam) wset(w, 0x1C8, on.slam ? -0.78 : -0.50);
    if (on.bounce) {
      var hop = 0.25 + Math.abs(Math.sin(tick / 7)) * 0.7;
      wset(w, 0x18C, hop);
      wset(w, 0x1C4, 20000 + hop * 50000);
    }
    if (on.spin) { wset(w, 0x164, 360); wset(w, 0xF8, 0.04); }
    if (on.smoke || on.ice || on.drift || on.spin) { wset(w, 0x188, 70); wbit(w, 0x200, 1); }
    if (on.yeet || on.rocket) {
      wset(w, 0xF8, on.yeet ? 0.6 : 2.0);
      wset(w, 0x100, on.yeet ? 1.0 : 3.0);
    }
  }
});

Interceptor.attach(uf.base.add(0x1CCB114), {
  onEnter: function (args) {
    if (!(on.drag || on.rocket || on.yeet || on.god)) return;
    var p = args[0];
    var tq = 45000, pw = 30000;
    if (on.rocket) { tq = 80000; pw = 55000; }
    if (on.yeet) { tq = 160000; pw = 110000; }
    if (on.god) { tq = 250000; pw = 180000; }
    pset(p, 0xD0, tq); pset(p, 0xB8, pw); pset(p, 0x168, 1.0);
    pbit(p, 0x42, 1); pbit(p, 0x43, 1);
  }
});

Interceptor.attach(uf.base.add(0x1CC92CC), {
  onEnter: function () {
    if (!anyOn()) return;
    var st = 0.03;
    if (on.drift) st = 0.10;
    if (on.drag || on.rocket || on.yeet || on.god) st = 0.01;
    try { this.context.s0 = st; } catch (e) {}
  }
});

Interceptor.attach(uf.base.add(0x1CA2260), {
  onEnter: function (args) {
    if (!on.fuel) return;
    try { args[0].add(0x50).writeFloat(80); } catch (e) {}
  }
});

Interceptor.attach(uf.base.add(0x1D635DC), {
  onEnter: function (args) {
    if (!on.ghost) return;
    args[1] = ptr(0);
  }
});

Interceptor.attach(uf.base.add(0x1CAB62C), {
  onEnter: function (args) {
    if (!on.neon) return;
    neonFlip++;
    try {
      args[0].add(0x198).writeU8(1);
      args[0].add(0x19C).writeFloat((neonFlip & 4) ? 12 : 0.15);
    } catch (e) {}
  }
});

Interceptor.attach(uf.base.add(0x1D218A0), {
  onEnter: function (args) {
    if (!(on.hood || on.drone || on.shake)) return;
    var c = args[0];
    if (on.hood) { wset(c, 0x58, 2.2); wset(c, 0xA8, 2.2); wset(c, 0x8C, 1.5); }
    if (on.drone) { wset(c, 0x58, 28); wset(c, 0xA8, 28); wset(c, 0x90, 40); }
    if (on.shake) { wbit(c, 0x114, 1); wset(c, 0x11C, 18); wset(c, 0x120, 0.35); }
  }
});

setInterval(function () {
  if (on.doors) {
    doorOpenState = !doorOpenState;
    var keys = Object.keys(doors);
    for (var i = 0; i < keys.length; i++) {
      try {
        if (doorOpenState) fnOpenDoor(doors[keys[i]]);
        else fnCloseDoor(doors[keys[i]]);
      } catch (e) {}
    }
  }
  if (on.turbo) {
    var tkeys = Object.keys(turbos);
    for (var j = 0; j < tkeys.length; j++) {
      try { fnTurboMax(turbos[tkeys[j]]); } catch (e) {}
    }
  }
}, 280);

rpc.exports = {
  ice: function (v) { return tog("ice", v); },
  drift: function (v) { return tog("drift", v); },
  drag: function (v) { return tog("drag", v); },
  rocket: function (v) { return tog("rocket", v); },
  yeet: function (v) { return tog("yeet", v); },
  god: function (v) { return tog("god", v); },
  fws: function (v) { return tog("fws", v); },
  tank: function (v) { return tog("tank", v); },
  crab: function (v) { return tog("crab", v); },
  rear: function (v) { return tog("rearSteer", v); },
  stance: function (v) { return tog("stance", v); },
  slam: function (v) { return tog("slam", v); },
  spin: function (v) { return tog("spin", v); },
  smoke: function (v) { return tog("smoke", v); },
  bounce: function (v) { return tog("bounce", v); },
  sticky: function (v) { return tog("sticky", v); },
  fuel: function (v) { return tog("fuel", v); },
  ghost: function (v) { return tog("ghost", v); },
  neon: function (v) { return tog("neon", v); },
  hood: function (v) { return tog("hood", v); },
  drone: function (v) { return tog("drone", v); },
  shake: function (v) { return tog("shake", v); },
  turbo: function (v) { return tog("turbo", v); },
  doors: function (v) { return tog("doors", v); },
  off: function () { return allOff(); },
  now: function () { return JSON.stringify(on); },
  counts: function () {
    return "doors=" + Object.keys(doors).length + " turbos=" + Object.keys(turbos).length;
  },
  pimp: function () {
    return preset("PIMP", { ice:1, fws:1, smoke:1, slam:1, neon:1, fuel:1, turbo:1, doors:1 });
  },
  show: function () {
    return preset("SHOW", { ice:1, tank:1, smoke:1, stance:1, neon:1, doors:1 });
  },
  driftnight: function () {
    return preset("DRIFTNIGHT", { drift:1, smoke:1, rearSteer:1, slam:1, neon:1, turbo:1 });
  },
  dragstrip: function () {
    return preset("DRAG", { drag:1, sticky:1, slam:1, fuel:1, hood:1, turbo:1 });
  },
  circus: function () {
    return preset("CIRCUS", { tank:1, spin:1, smoke:1, bounce:1, neon:1, shake:1, doors:1 });
  },
  hyper: function () {
    return preset("HYPER", { god:1, fws:1, neon:1, drone:1, turbo:1 });
  }
};

console.log("[+] PIMP+ UF " + uf.base);
console.log("[+] pimp() show() driftnight() dragstrip() circus() hyper() off()");
console.log("[+] doors() turbo() neon() slam() ice() tank() rpc.exports.counts()");
