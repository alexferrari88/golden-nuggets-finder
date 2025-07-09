var d=globalThis.process?.argv||[];var y=()=>globalThis.process?.env||{};var H=new Set(d),_=e=>H.has(e),G=d.filter(e=>e.startsWith("--")&&e.includes("=")).map(e=>e.split("=")).reduce((e,[t,o])=>(e[t]=o,e),{});var Z=_("--dry-run"),p=()=>_("--verbose")||y().VERBOSE==="true",q=p();var u=(e="",...t)=>console.log(e.padEnd(9),"|",...t);var x=(...e)=>console.error("\u{1F534} ERROR".padEnd(9),"|",...e),v=(...e)=>u("\u{1F535} INFO",...e),m=(...e)=>u("\u{1F7E0} WARN",...e),S=0,c=(...e)=>p()&&u(`\u{1F7E1} ${S++}`,...e);var n=__plasmo_runtime_data__;module.bundle.HMR_BUNDLE_ID=n.bundleId;globalThis.process={argv:[],env:{VERBOSE:n.verbose}};var D=module.bundle.Module;function I(e){D.call(this,e),this.hot={data:module.bundle.hotData[e],_acceptCallbacks:[],_disposeCallbacks:[],accept:function(t){this._acceptCallbacks.push(t||function(){})},dispose:function(t){this._disposeCallbacks.push(t)}},module.bundle.hotData[e]=void 0}module.bundle.Module=I;module.bundle.hotData={};var l=globalThis.browser||globalThis.chrome||null;function b(){return!n.host||n.host==="0.0.0.0"?"localhost":n.host}function C(){return n.port||location.port}var E="__plasmo_runtime_script_";function L(e,t){let{modules:o}=e;return o?!!o[t]:!1}function O(e=C()){let t=b();return`${n.secure||location.protocol==="https:"&&!/localhost|127.0.0.1|0.0.0.0/.test(t)?"wss":"ws"}://${t}:${e}/`}function B(e){typeof e.message=="string"&&x("[plasmo/parcel-runtime]: "+e.message)}function P(e){if(typeof globalThis.WebSocket>"u")return;let t=new WebSocket(O());return t.addEventListener("message",async function(o){let r=JSON.parse(o.data);if(r.type==="update"&&await e(r.assets),r.type==="error")for(let a of r.diagnostics.ansi){let w=a.codeframe||a.stack;m("[plasmo/parcel-runtime]: "+a.message+`
`+w+`

`+a.hints.join(`
`))}}),t.addEventListener("error",B),t.addEventListener("open",()=>{v(`[plasmo/parcel-runtime]: Connected to HMR server for ${n.entryFilePath}`)}),t.addEventListener("close",()=>{m(`[plasmo/parcel-runtime]: Connection to the HMR server is closed for ${n.entryFilePath}`)}),t}var s="__plasmo-loading__";function $(){let e=globalThis.window?.trustedTypes;if(typeof e>"u")return;let t=document.querySelector('meta[name="trusted-types"]')?.content?.split(" "),o=t?t[t?.length-1].replace(/;/g,""):void 0;return typeof e<"u"?e.createPolicy(o||`trusted-html-${s}`,{createHTML:a=>a}):void 0}var T=$();function g(){return document.getElementById(s)}function f(){return!g()}function F(){let e=document.createElement("div");e.id=s;let t=`
  <style>
    #${s} {
      background: #f3f3f3;
      color: #333;
      border: 1px solid #333;
      box-shadow: #333 4.7px 4.7px;
    }

    #${s}:hover {
      background: #e3e3e3;
      color: #444;
    }

    @keyframes plasmo-loading-animate-svg-fill {
      0% {
        fill: transparent;
      }
    
      100% {
        fill: #333;
      }
    }

    #${s} .svg-elem-1 {
      animation: plasmo-loading-animate-svg-fill 1.47s cubic-bezier(0.47, 0, 0.745, 0.715) 0.8s both infinite;
    }

    #${s} .svg-elem-2 {
      animation: plasmo-loading-animate-svg-fill 1.47s cubic-bezier(0.47, 0, 0.745, 0.715) 0.9s both infinite;
    }
    
    #${s} .svg-elem-3 {
      animation: plasmo-loading-animate-svg-fill 1.47s cubic-bezier(0.47, 0, 0.745, 0.715) 1s both infinite;
    }

    #${s} .hidden {
      display: none;
    }

  </style>
  
  <svg height="32" width="32" viewBox="0 0 264 354" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M139.221 282.243C154.252 282.243 166.903 294.849 161.338 308.812C159.489 313.454 157.15 317.913 154.347 322.109C146.464 333.909 135.26 343.107 122.151 348.538C109.043 353.969 94.6182 355.39 80.7022 352.621C66.7861 349.852 54.0034 343.018 43.9705 332.983C33.9375 322.947 27.105 310.162 24.3369 296.242C21.5689 282.323 22.9895 267.895 28.4193 254.783C33.8491 241.671 43.0441 230.464 54.8416 222.579C59.0353 219.777 63.4908 217.438 68.1295 215.588C82.0915 210.021 94.6978 222.671 94.6978 237.703L94.6978 255.027C94.6978 270.058 106.883 282.243 121.914 282.243H139.221Z" fill="#333" class="svg-elem-1" ></path>
    <path d="M192.261 142.028C192.261 126.996 204.867 114.346 218.829 119.913C223.468 121.763 227.923 124.102 232.117 126.904C243.915 134.789 253.11 145.996 258.539 159.108C263.969 172.22 265.39 186.648 262.622 200.567C259.854 214.487 253.021 227.272 242.988 237.308C232.955 247.343 220.173 254.177 206.256 256.946C192.34 259.715 177.916 258.294 164.807 252.863C151.699 247.432 140.495 238.234 132.612 226.434C129.808 222.238 127.47 217.779 125.62 213.137C120.056 199.174 132.707 186.568 147.738 186.568L165.044 186.568C180.076 186.568 192.261 174.383 192.261 159.352L192.261 142.028Z" fill="#333" class="svg-elem-2" ></path>
    <path d="M95.6522 164.135C95.6522 179.167 83.2279 191.725 68.8013 187.505C59.5145 184.788 50.6432 180.663 42.5106 175.227C26.7806 164.714 14.5206 149.772 7.28089 132.289C0.041183 114.807 -1.85305 95.5697 1.83772 77.0104C5.52849 58.4511 14.6385 41.4033 28.0157 28.0228C41.393 14.6423 58.4366 5.53006 76.9914 1.83839C95.5461 -1.85329 114.779 0.0414162 132.257 7.2829C149.735 14.5244 164.674 26.7874 175.184 42.5212C180.62 50.6576 184.744 59.5332 187.46 68.8245C191.678 83.2519 179.119 95.6759 164.088 95.6759L122.869 95.6759C107.837 95.6759 95.6522 107.861 95.6522 122.892L95.6522 164.135Z" fill="#333" class="svg-elem-3"></path>
  </svg>
  <span class="hidden">Context Invalidated, Press to Reload</span>
  `;return e.innerHTML=T?T.createHTML(t):t,e.style.pointerEvents="none",e.style.position="fixed",e.style.bottom="14.7px",e.style.right="14.7px",e.style.fontFamily="sans-serif",e.style.display="flex",e.style.justifyContent="center",e.style.alignItems="center",e.style.padding="14.7px",e.style.gap="14.7px",e.style.borderRadius="4.7px",e.style.zIndex="2147483647",e.style.opacity="0",e.style.transition="all 0.47s ease-in-out",e}function N(e){return new Promise(t=>{document.documentElement?(f()&&(document.documentElement.appendChild(e),t()),t()):globalThis.addEventListener("DOMContentLoaded",()=>{f()&&document.documentElement.appendChild(e),t()})})}var k=()=>{let e;if(f()){let t=F();e=N(t)}return{show:async({reloadButton:t=!1}={})=>{await e;let o=g();o.style.opacity="1",t&&(o.onclick=r=>{r.stopPropagation(),globalThis.location.reload()},o.querySelector("span").classList.remove("hidden"),o.style.cursor="pointer",o.style.pointerEvents="all")},hide:async()=>{await e;let t=g();t.style.opacity="0"}}};var W=`${E}${module.id}__`,i,A=!1,M=k();async function h(){c("Script Runtime - reloading"),A?globalThis.location?.reload?.():M.show({reloadButton:!0})}function R(){i?.disconnect(),i=l?.runtime.connect({name:W}),i.onDisconnect.addListener(()=>{h()}),i.onMessage.addListener(e=>{e.__plasmo_cs_reload__&&h(),e.__plasmo_cs_active_tab__&&(A=!0)})}function j(){if(l?.runtime)try{R(),setInterval(R,24e3)}catch{return}}j();P(async e=>{c("Script runtime - on updated assets"),e.filter(o=>o.envHash===n.envHash).some(o=>L(module.bundle,o.id))&&(M.show(),l?.runtime?i.postMessage({__plasmo_cs_changed__:!0}):setTimeout(()=>{h()},4700))});
