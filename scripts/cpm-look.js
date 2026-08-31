// CPM look — wrap + HUD (il2cpp-bridge)
// Compile like rainbow:
// copy this over C:\cpm-mods\agent\index.ts
// npx --no-install frida-compile C:\cpm-mods\agent\index.ts -o C:\cpm-mods\cpm-look.js
// frida -H IP:27042 -n "CarParking" --runtime=v8 -l C:\cpm-mods\cpm-look.js
// Stay IN a spawned car. Do not mix into cpm-tunes.js.

import "frida-il2cpp-bridge";

const log = (s) => console.log("[look] " + s);

function csharp() {
  return Il2Cpp.domain.assembly("Assembly-CSharp").image;
}

function ue() {
  try { return Il2Cpp.domain.assembly("UnityEngine.CoreModule").image; }
  catch (e) { return Il2Cpp.domain.assembly("UnityEngine").image; }
}

function colorRGBA(r, g, b, a) {
  const Color = ue().class("UnityEngine.Color");
  const c = Color.alloc();
  c.field("r").value = r;
  c.field("g").value = g;
  c.field("b").value = b;
  c.field("a").value = a;
  return c;
}

function cars() {
  const VD = csharp().class("VehicleData");
  const list = Il2Cpp.gc.choose(VD);
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const mat = list[i].field("CarMat").value;
    if (mat && !mat.isNull()) out.push({ vd: list[i], mat: mat });
  }
  return out;
}

function makeStripeTex(size) {
  const T2 = ue().class("UnityEngine.Texture2D");
  const tex = T2.alloc();
  const ctor = T2.method(".ctor", 2);
  ctor.invoke(tex, size, size);
  const setPix = T2.method("SetPixel", 3);
  const apply = T2.tryMethod("Apply", 0) || T2.method("Apply");
  const pink = colorRGBA(1, 0, 1, 1);
  const blk = colorRGBA(0, 0, 0, 1);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const on = ((x >> 3) + (y >> 3)) % 2 === 0;
      setPix.invoke(tex, x, y, on ? pink : blk);
    }
  }
  try { apply.invoke(tex); } catch (e) { try { apply.invoke(tex, true); } catch (e2) {} }
  return tex;
}

function applyTex(mat, tex) {
  const Klass = mat.class;
  const setMain = Klass.tryMethod("set_mainTexture", 1);
  if (setMain) {
    setMain.invoke(mat, tex);
    return "set_mainTexture";
  }
  const setTex = Klass.tryMethod("SetTexture", 2);
  if (setTex) {
    setTex.invoke(mat, Il2Cpp.string("_MainTex"), tex);
    return "SetTexture _MainTex";
  }
  throw new Error("no set_mainTexture / SetTexture on " + Klass.name);
}

rpc.exports = {
  ping: function () { return "look-pong"; },

  cars: function () {
    return Il2Cpp.perform(() => {
      const list = cars();
      log("CarMat count " + list.length);
      return "cars=" + list.length;
    });
  },

  mag: function () {
    return Il2Cpp.perform(() => {
      const list = cars();
      if (!list.length) return "no CarMat — sit in a spawned car";
      const c = colorRGBA(1, 0, 1, 1);
      let n = 0;
      for (let i = 0; i < list.length; i++) {
        try {
          list[i].mat.method("set_color").invoke(c);
          n++;
        } catch (e) { log("set_color " + e); }
      }
      return "magenta paint on " + n;
    });
  },

  stripe: function () {
    return Il2Cpp.perform(() => {
      const list = cars();
      if (!list.length) return "no CarMat — sit in a spawned car";
      const tex = makeStripeTex(64);
      let how = "";
      let n = 0;
      for (let i = 0; i < list.length; i++) {
        try {
          how = applyTex(list[i].mat, tex);
          n++;
        } catch (e) { log("tex " + e); }
      }
      return "stripe " + how + " on " + n + " mats";
    });
  },

  wrapFile: function (path) {
    return Il2Cpp.perform(() => {
      const p = path || "/var/mobile/Documents/wrap.png";
      if (!File.exists || typeof File.exists !== "function") {
        try {
          const raw = File.readAllBytes ? null : null;
        } catch (e) {}
      }
      let bytes;
      try {
        bytes = new File(p, "rb").readBytes();
      } catch (e) {
        return "cannot read " + p + " : " + e;
      }
      const list = cars();
      if (!list.length) return "read ok but no CarMat";
      const T2 = ue().class("UnityEngine.Texture2D");
      const tex = T2.alloc();
      T2.method(".ctor", 2).invoke(tex, 4, 4);
      const ImageConversion = ue().class("UnityEngine.ImageConversion");
      let ok = false;
      try {
        ok = ImageConversion.method("LoadImage", 2).invoke(tex, bytes);
      } catch (e1) {
        try {
          ok = T2.method("LoadImage", 1).invoke(tex, bytes);
        } catch (e2) {
          return "LoadImage failed " + e1 + " / " + e2;
        }
      }
      let n = 0;
      for (let i = 0; i < list.length; i++) {
        try { applyTex(list[i].mat, tex); n++; } catch (e) {}
      }
      return "wrapFile ok=" + ok + " mats=" + n + " path=" + p;
    });
  },

  hudProbe: function () {
    return Il2Cpp.perform(() => {
      const img = csharp();
      let lines = [];
      try {
        const UBC = Il2Cpp.domain.assembly("Assembly-CSharp-firstpass").image.class("UIButtonColor");
        const btns = Il2Cpp.gc.choose(UBC);
        lines.push("UIButtonColor " + btns.length);
      } catch (e) {
        try {
          const UBC = Il2Cpp.domain.assembly("UnityEngine").image.class("UIButtonColor");
          lines.push("UBC alt " + e);
        } catch (e2) {
          lines.push("UIButtonColor missing: " + e);
        }
      }
      const assemblies = Il2Cpp.domain.assemblies;
      let found = 0;
      for (let a = 0; a < assemblies.length && found < 3; a++) {
        try {
          const cls = assemblies[a].image.tryClass("UIButtonColor");
          if (!cls) continue;
          const objs = Il2Cpp.gc.choose(cls);
          lines.push(assemblies[a].name + " UIButtonColor x" + objs.length);
          found++;
          for (let i = 0; i < Math.min(objs.length, 8); i++) {
            let name = "?";
            try { name = objs[i].method("ToString").invoke().toString(); } catch (e) {}
            lines.push(" #" + i + " " + name);
          }
        } catch (e) {}
      }
      found = 0;
      for (let a = 0; a < assemblies.length && found < 2; a++) {
        try {
          const cls = assemblies[a].image.tryClass("UIWidget");
          if (!cls) continue;
          const objs = Il2Cpp.gc.choose(cls);
          lines.push(assemblies[a].name + " UIWidget x" + objs.length);
          found++;
        } catch (e) {}
      }
      const msg = lines.join("\n");
      log(msg);
      return msg;
    });
  }
};

Il2Cpp.perform(() => {
  log("ready cars() mag() stripe() wrapFile(path) hudProbe()");
});
