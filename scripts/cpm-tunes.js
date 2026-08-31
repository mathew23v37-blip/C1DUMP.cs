// CPM stack menu
// Drift + speed + extras can all be on at once.
// No forced throttle. No LaunchControlActive.
//
// frida -H IP:27042 -n "CarParking" -l C:\cpm-mods\cpm-tunes.js

var uf = Process.findModuleByName("UnityFramework");
if (!uf) throw new Error("UnityFramework missing — enter the 3D world first");

var drift = null;
var speed = null;
var tqMult = 1.0;
var rpmCap = 0;
var tick = 0;

var extra = {
  smoke: false,
  slam: false,
  stance: false,
  fws: false,
  launch: false,
  hydro: 0
};

function wf(w, o, v) { try { w.add(o).writeFloat(v); } catch (e) {} }
function wb(w, o, v) { try { w.add(o).writeU8(v); } catch (e) {} }

function isRear(w) {
  try {
    var pos = w.add(0x34).readS32();
    if (pos < 0 || pos > 7) return false;
    return pos >= 2;
  } catch (e) { return false; }
}

var D = {
  d1: { fs: 1.20, ff: 1.05, rs: 0.55, rf: 0.68, smoke: 12, shift: 0.11 },
  d2: { fs: 1.12, ff: 0.98, rs: 0.44, rf: 0.58, smoke: 18, shift: 0.10 },
  d3: { fs: 1.02, ff: 0.90, rs: 0.32, rf: 0.46, smoke: 26, shift: 0.10 },
  d4: { fs: 0.95, ff: 0.82, rs: 0.22, rf: 0.34, smoke: 34, shift: 0.09 },
  d5: { fs: 0.88, ff: 0.74, rs: 0.16, rf: 0.28, smoke: 42, shift: 0.09 },
  d6: { fs: 0.80, ff: 0.66, rs: 0.12, rf: 0.22, smoke: 50, shift: 0.08 },
  d7: { fs: 0.70, ff: 0.55, rs: 0.09, rf: 0.16, smoke: 58, shift: 0.08 },
  d8: { fs: 0.48, ff: 0.42, rs: 0.14, rf: 0.20, smoke: 36, shift: 0.09 },
  d9: { fs: 0.75, ff: 0.50, rs: 0.11, rf: 0.15, smoke: 80, shift: 0.08 },
  d10:{ fs: 0.24, ff: 0.28, rs: 0.06, rf: 0.10, smoke: 70, shift: 0.08 }
};

var S = {
  s1: { side: 1.3, fwd: 1.5, mult: 1.6, rpm: 8500, shift: 0.07 },
  s2: { side: 1.6, fwd: 1.9, mult: 2.4, rpm: 9500, shift: 0.05 },
  s3: { side: 2.2, fwd: 2.8, mult: 3.5, rpm: 10500, shift: 0.03 },
  s4: { side: 2.0, fwd: 2.4, mult: 5.5, rpm: 12000, shift: 0.02 },
  s5: { side: 2.5, fwd: 3.2, mult: 9.0, rpm: 14000, shift: 0.015 },
  s6: { side: 2.8, fwd: 3.6, mult: 13.0, rpm: 15500, shift: 0.010 },
  s7: { side: 3.1, fwd: 4.0, mult: 18.0, rpm: 17000, shift: 0.008 },
  s8: { side: 3.4, fwd: 4.4, mult: 25.0, rpm: 18500, shift: 0.006 },
  s9: { side: 3.6, fwd: 4.8, mult: 35.0, rpm: 19500, shift: 0.004 },
  s10:{ side: 3.8, fwd: 5.2, mult: 50.0, rpm: 20000, shift: 0.002 }
};

function applySpeed() {
  if (speed && S[speed]) {
    tqMult = S[speed].mult;
    rpmCap = S[speed].rpm;
  } else {
    tqMult = 1.0;
    rpmCap = 0;
  }
}

function setDrift(name) {
  drift = (drift === name) ? null : name;
  console.log("[STACK] drift=" + drift + " speed=" + speed);
  return status();
}

function setSpeed(name) {
  speed = (speed === name) ? null : name;
  applySpeed();
  console.log("[STACK] drift=" + drift + " speed=" + speed + " tq x" + tqMult);
  return status();
}

function tog(k, v) {
  if (typeof v === "undefined") extra[k] = !extra[k];
  else extra[k] = !!v;
  console.log("[+] " + k + "=" + extra[k]);
  return status();
}

function status() {
  return "drift=" + drift + " speed=" + speed + " x" + tqMult
    + " smoke=" + extra.smoke + " slam=" + extra.slam
    + " stance=" + extra.stance + " fws=" + extra.fws
    + " launch=" + extra.launch + " hydro=" + extra.hydro;
}

Interceptor.attach(uf.base.add(0x1D0450C), {
  onEnter: function (args) {
    var w = args[0];
    tick++;
    var rear = isRear(w);
    var d = drift ? D[drift] : null;
    var s = speed ? S[speed] : null;

    if (s && !d) {
      wf(w, 0xF8, s.side);
      wf(w, 0x100, s.fwd);
    }

    if (d) {
      if (rear) {
        wf(w, 0xF8, d.rs);
        wf(w, 0x100, d.rf);
      } else if (s) {
        wf(w, 0xF8, Math.max(d.fs, s.side * 0.5));
        wf(w, 0x100, Math.max(d.ff, s.fwd * 0.5));
      } else {
        wf(w, 0xF8, d.fs);
        wf(w, 0x100, d.ff);
      }
      var sm = extra.smoke ? Math.max(d.smoke, 70) : d.smoke;
      wf(w, 0x188, sm);
      wb(w, 0x200, 1);
    } else if (extra.smoke) {
      wf(w, 0x188, 70);
      wb(w, 0x200, 1);
    }

    if (extra.slam) wf(w, 0x1C8, -0.78);
    else if (extra.stance) wf(w, 0x1C8, -0.48);

    if (extra.fws) wf(w, 0x114, 50);

    if (extra.hydro > 0) {
      var hop = 0.12 + Math.abs(Math.sin(tick / (10 - extra.hydro))) * (extra.hydro * 0.14);
      wf(w, 0x18C, hop);
      wf(w, 0x1C4, 15000 + hop * 45000);
    }
  }
});

Interceptor.attach(uf.base.add(0x1CCB114), {
  onEnter: function (args) {
    var p = args[0];
    if (speed && rpmCap) {
      try {
        p.add(0xDC).writeFloat(rpmCap);
        p.add(0xE0).writeFloat(rpmCap);
        p.add(0x310).writeFloat(3.0);
        p.add(0x314).writeFloat(2.5);
      } catch (e) {}
    }
    if (extra.launch) {
      try { p.add(0x42).writeU8(1); } catch (e) {}
    }
  }
});

function scaleS0(ctx, mult) {
  try { ctx.s0 = ctx.s0 * mult; }
  catch (e) { try { ctx.d0 = ctx.d0 * mult; } catch (e2) {} }
}

Interceptor.attach(uf.base.add(0x1CCDF8C), {
  onLeave: function () { if (tqMult > 1.01) scaleS0(this.context, tqMult); }
});
Interceptor.attach(uf.base.add(0x1CCDEB4), {
  onLeave: function () { if (tqMult > 1.01) scaleS0(this.context, tqMult); }
});

Interceptor.attach(uf.base.add(0x1CC92CC), {
  onEnter: function () {
    var spec = (speed && S[speed]) || (drift && D[drift]);
    if (!spec) return;
    try { this.context.s0 = spec.shift; } catch (e) {}
  }
});

rpc.exports = {
  off: function () {
    drift = null; speed = null; tqMult = 1; rpmCap = 0;
    extra.smoke = extra.slam = extra.stance = extra.fws = extra.launch = false;
    extra.hydro = 0;
    console.log("[+] ALL OFF");
    return status();
  },
  now: function () { return status(); },

  d1: function () { return setDrift("d1"); },
  d2: function () { return setDrift("d2"); },
  d3: function () { return setDrift("d3"); },
  d4: function () { return setDrift("d4"); },
  d5: function () { return setDrift("d5"); },
  d6: function () { return setDrift("d6"); },
  d7: function () { return setDrift("d7"); },
  d8: function () { return setDrift("d8"); },
  d9: function () { return setDrift("d9"); },
  d10: function () { return setDrift("d10"); },
  nodrift: function () { drift = null; return status(); },

  s1: function () { return setSpeed("s1"); },
  s2: function () { return setSpeed("s2"); },
  s3: function () { return setSpeed("s3"); },
  s4: function () { return setSpeed("s4"); },
  s5: function () { return setSpeed("s5"); },
  s6: function () { return setSpeed("s6"); },
  s7: function () { return setSpeed("s7"); },
  s8: function () { return setSpeed("s8"); },
  s9: function () { return setSpeed("s9"); },
  s10: function () { return setSpeed("s10"); },
  nospeed: function () { speed = null; applySpeed(); return status(); },

  smoke: function (v) { return tog("smoke", v); },
  slam: function (v) { return tog("slam", v); },
  stance: function (v) { return tog("stance", v); },
  fws: function (v) { return tog("fws", v); },
  launch: function (v) { return tog("launch", v); },
  hydro: function (level) {
    extra.hydro = Math.max(0, Math.min(5, Number(level) || 0));
    return status();
  }
};

console.log("[+] STACK menu UF " + uf.base);
console.log("[+] pick d# AND s# + smoke slam stance fws launch hydro(n) off()");
