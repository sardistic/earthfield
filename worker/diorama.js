import {MODEL_FUNCTIONS} from './model.js';
// Browser scene. Geometry is rebuilt from the models in model.js whenever readings or the
// observation time change (build); the animation loop only projects and draws (draw).
// Scene axes: x = −X_GSM (Sun to the left), y = Z_GSM (north up), z = Y_GSM (dusk, toward the viewer).
// Every distance passes through one logarithmic radial scale (logRadius) so L1, the Moon and the
// radiation belts can share a frame with Earth; shapes come from the models, sizes are compressed.
export const dioramaSource=MODEL_FUNCTIONS.map(f=>f.toString()).join('\n')+String.raw`
const LAND=[[-168,70,-140,72,-126,60,-126,49,-119,34,-107,23,-98,18,-87,22,-81,25,-81,31,-70,44,-58,51,-63,60,-87,65,-110,73],[-81,12,-66,10,-50,2,-35,-8,-41,-22,-54,-35,-68,-55,-76,-40,-80,-15],[-18,35,6,37,28,31,43,12,51,11,43,-12,31,-34,18,-35,8,-20,-5,3,-17,17],[-11,36,-10,58,11,72,40,68,61,75,100,77,140,68,175,61,162,46,140,36,122,18,112,2,104,1,99,20,79,7,70,25,49,30,40,42,28,39,20,41,7,43],[112,-12,133,-10,151,-22,153,-36,137,-40,117,-33],[-53,60,-23,72,-30,83,-55,82,-72,72],[45,-13,51,-17,49,-27,44,-24],[167,-34,178,-39,170,-47,166,-46]];
function vadd(a,b){return[a[0]+b[0],a[1]+b[1],a[2]+b[2]];}
function vscale(a,s){return[a[0]*s,a[1]*s,a[2]*s];}
function vdot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
function vlen(a){return Math.hypot(a[0],a[1],a[2]);}
function vnorm(a){const l=vlen(a)||1;return[a[0]/l,a[1]/l,a[2]/l];}
function vcross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function gsmToScene(g){return[-g[0],g[2],g[1]];}
function logMap(p){const r=vlen(p);if(!r)return p;return vscale(p,logRadius(r)/r);}
function bezier(a,b,c,d,t){const u=1-t;return[0,1,2].map(i=>u*u*u*a[i]+3*u*u*t*b[i]+3*u*t*t*c[i]+t*t*t*d[i]);}
class EarthDiorama {
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.yaw=-.22;this.pitch=.2;this.zoom=1;this.layers={wind:true,field:true,atmosphere:true,particles:true,labels:true};this.values={};this.time=Date.now();this.aurora=null;this.geom=null;this.summary={};this.motion=0;this.drag=null;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.last=0;this.stars=Array.from({length:260},(_,i)=>({x:this.rand(i*3),y:this.rand(i*3+1),r:.25+this.rand(i*3+2)**2*1.5,p:this.rand(i+999)*6.3}));
  new ResizeObserver(()=>this.resize()).observe(canvas);canvas.addEventListener('pointerdown',e=>{this.drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!this.drag)return;this.yaw+=(e.clientX-this.drag[0])*.006;this.pitch=Math.max(-1.2,Math.min(1.2,this.pitch+(e.clientY-this.drag[1])*.005));this.drag=[e.clientX,e.clientY];});canvas.addEventListener('pointerup',()=>this.drag=null);canvas.addEventListener('pointercancel',()=>this.drag=null);canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(.6,Math.min(2.4,this.zoom-e.deltaY*.0009));},{passive:false});this.resize();this.build();this.animate=this.animate.bind(this);requestAnimationFrame(this.animate);}
 rand(n){const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);}
 resize(){const r=this.canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);this.w=r.width;this.h=r.height;this.canvas.width=Math.round(r.width*d);this.canvas.height=Math.round(r.height*d);this.ctx.setTransform(d,0,0,d,0,0);}
 update(values,time,location,aurora){this.values=values||{};this.time=time;this.location=location;this.aurora=aurora||null;this.build();return this.summary;}
 reset(){this.yaw=-.22;this.pitch=.2;this.zoom=1;}
 get cx(){return this.w*(this.w<760?.5:.56);} get cy(){return this.h*.5;}
 project(p){const cy=Math.cos(this.yaw),sy=Math.sin(this.yaw),cp=Math.cos(this.pitch),sp=Math.sin(this.pitch);const x=p[0]*cy+p[2]*sy,z=-p[0]*sy+p[2]*cy,y=p[1]*cp-z*sp,zz=p[1]*sp+z*cp,k=12/(12-zz);return{x:this.cx+x*this.scale*k,y:this.cy-y*this.scale*k,z:zz,k};}
 // ---------- model geometry ----------
 build(){const v=this.values||{},F=gsmFrame(this.time),P=dynamicPressure(v.density,v.speed),m=shue(P,v.bz),sun=[-1,0,0],anti=[1,0,0];
  const mz=vnorm(gsmToScene(inertialToGsm(F.D,F))),mx=vnorm(vadd(sun,vscale(mz,-vdot(sun,mz)))),my=vcross(mz,mx);
  const mag=(colat,phi,r,h)=>vscale(vadd(vadd(vscale(mx,Math.sin(colat)*Math.cos(phi)),vscale(my,Math.sin(colat)*Math.sin(phi))),vscale(mz,(h??1)*Math.cos(colat))),r);
  const geo=(lat,lon,r)=>gsmToScene(fixedToGsm(geoVec(lat,lon,r),F));
  const surf=(fn,max)=>{const t=[];for(let i=0;i<=90;i++){const th=i/90*max,R=logRadius(fn(th));t.push([-R*Math.cos(th),R*Math.sin(th)]);}return t;};
  const g={mx,my,mz,mp:surf(th=>magnetopauseR(m,th),Math.PI*.78),bs:surf(th=>bowShockR(m,th),Math.PI*.66),closed:[],open:[],belts:[],inner:[],aurora:[],land:[],grat:[],geoRing:[]};
  // Closed dipole field lines r = L sin²θ, compressed on the dayside to sit inside the modelled
  // magnetopause and stretched tailward on the nightside. Lines that would cross the dayside
  // magnetopause are left out: those field lines are open or reconnecting.
  const closedLine=(L,phi,h0,h1)=>{const eq=vnorm(mag(Math.PI/2,phi,1)),th_e=Math.acos(Math.max(-1,Math.min(1,vdot(eq,sun)))),rmp=magnetopauseR(m,th_e),day=Math.cos(th_e);if(L>rmp*1.04)return null;const comp=L>.86*rmp?(.86*rmp-1)/(L-1):1,st=day<0?.06*Math.pow(Math.max(0,L-4),1.4)*(-day):0,t0=Math.asin(Math.sqrt(1/L)),a=h0??t0,b=h1??Math.PI-t0,pts=[];for(let i=0;i<=56;i++){const th=a+(b-a)*i/56,r=L*Math.sin(th)**2,rr=1+(r-1)*comp;let p=mag(th,phi,rr);if(st){const along=Math.max(0,vdot(p,anti));p=vadd(p,vscale(anti,along*st*Math.pow(Math.sin(th),4)));}pts.push(logMap(p));}return pts;};
  for(const L of[2.4,4,6.6,9.5,12.5])for(let j=0;j<6;j++){const pts=closedLine(L,(j+.5)/6*Math.PI*2);if(pts)g.closed.push({pts,L});}
  // Open polar-cap field lines swept into the tail lobes; more of them when Bz points south.
  const bz=v.bz,nOpen=bz==null?4:4+(bz<0?Math.min(6,Math.round(-bz)):0),rT=magnetopauseR(m,Math.PI*.8)*Math.sin(Math.PI*.8);
  for(const h of[1,-1])for(let k=0;k<nOpen;k++){const phi=(k+.5)/nOpen*Math.PI*2,c=(3+((k*7)%5)*1.6)*Math.PI/180,p0=mag(c,phi,1,h),p1=vadd(vscale(vnorm(p0),4.2),[1.5,0,0]),p2=[16,h*rT*.78,Math.sin(phi)*rT*.35],p3=[55,h*rT*.55,Math.sin(phi)*rT*.25],pts=[];for(let i=0;i<=44;i++)pts.push(logMap(bezier(p0,p1,p2,p3,i/44)));g.open.push(pts);}
  // Radiation belts: outer electron belt (L 3.5–5.5) and inner proton belt (L 1.4–2) drawn as
  // field-line arcs within ±35° magnetic latitude.
  for(const[set,Ls]of[[g.belts,[3.8,4.6,5.4]],[g.inner,[1.5]]])for(const L of Ls)for(let j=0;j<36;j++){const phi=j/36*Math.PI*2,pts=[];for(let i=0;i<=14;i++){const th=Math.PI*.31+Math.PI*.38*i/14;pts.push(logMap(mag(th,phi,L*Math.sin(th)**2)));}set.push(pts);}
  // Aurora: NOAA OVATION cells when supplied, otherwise the Kp oval model.
  if(this.aurora&&Array.isArray(this.aurora.points)){const p=this.aurora.points;for(let i=0;i+2<p.length;i+=3){const q=geo(p[i+1],p[i],1.016);g.aurora.push([q[0],q[1],q[2],p[i+2]/100]);}g.auroraSource='ovation';}
  else if(v.kp!=null){for(let mlt=0;mlt<24;mlt+=.15){const[eq,pol]=kpOval(v.kp,mlt),phi=(mlt-12)/24*Math.PI*2,night=(1-Math.cos(phi))/2;for(let lat=eq;lat<=pol;lat+=.7){const f=Math.sin(Math.PI*(lat-eq)/(pol-eq||1)),val=f*(.2+.8*night)*Math.min(1,(v.kp+1.5)/8)*.55;for(const h of[1,-1]){const q=mag((90-lat)*Math.PI/180,phi,1.016,h);g.aurora.push([q[0],q[1],q[2],val]);}}}g.auroraSource='kp';}
  else g.auroraSource=null;
  for(const poly of LAND){const pts=[];for(let i=0;i<poly.length;i+=2){const n=(i+2)%poly.length;for(let k=0;k<5;k++){const f=k/5;pts.push(geo(poly[i+1]*(1-f)+poly[n+1]*f,poly[i]*(1-f)+poly[n]*f,1));}}g.land.push(pts);}
  for(let lat=-60;lat<=60;lat+=30){const pts=[];for(let lon=-180;lon<=180;lon+=4)pts.push(geo(lat,lon,1));g.grat.push(pts);}
  g.axis=[geo(-90,0,1.32),geo(90,0,1.32)];g.dipole=[vscale(mz,-1.38),vscale(mz,1.38)];
  for(let lon=0;lon<=360;lon+=5)g.geoRing.push(logMap(geo(0,lon,6.62)));
  g.goes=logMap(geo(0,-75.2,6.62));g.l1=logMap([-236,0,0]);const mo=moonEci(this.time);g.moon=logMap(vscale(gsmToScene(inertialToGsm(mo.v,F)),mo.re));
  // The observer's own field line, from the dipole L-shell through the chosen point.
  let L=null;if(this.location){const o=geo(this.location.lat,this.location.lon,1);g.obs=o;const cm=Math.acos(Math.max(-1,Math.min(1,vdot(o,mz)))),phi=Math.atan2(vdot(o,my),vdot(o,mx)),s=Math.sin(cm);if(s>.12){L=1/(s*s);g.yourLine=closedLine(L,phi,cm<Math.PI/2?cm:Math.PI-cm,cm<Math.PI/2?Math.PI-cm:cm);}}
  this.geom=g;this.m=m;this.F=F;
  this.summary={pressure:P,r0:m.r0,shock:1.3*m.r0,tilt:F.tilt*180/Math.PI,coupling:coupling(v.speed,v.bt,v.bz),aurora:g.auroraSource,auroraTime:this.aurora?.forecast??null,auroraHere:this.aurora?.here??null,L,modelled:P!=null};}
 shockX(rho){const t=this.geom.bs;for(let i=1;i<t.length;i++)if(t[i][1]>=rho){const a=t[i-1],b=t[i],f=(rho-a[1])/((b[1]-a[1])||1);return a[0]+(b[0]-a[0])*f;}return Infinity;}
 mpRho(x){const t=this.geom.mp;if(x<t[0][0])return 0;for(let i=1;i<t.length;i++)if(t[i][0]>=x){const a=t[i-1],b=t[i],f=(x-a[0])/((b[0]-a[0])||1);return a[1]+(b[1]-a[1])*f;}return t[t.length-1][1];}
 // ---------- drawing ----------
 path(pts,color,width,alpha,front){if(!pts)return;const c=this.ctx;c.beginPath();let on=false;for(const p of pts){const q=this.project(p),f=q.z>0;if(front==null||f===front){if(!on){c.moveTo(q.x,q.y);on=true;}else c.lineTo(q.x,q.y);}else on=false;}c.globalAlpha=alpha;c.strokeStyle=color;c.lineWidth=width;c.stroke();c.globalAlpha=1;}
 glow(pts,color,width,alpha,front){this.path(pts,color,width*4,alpha*.12,front);this.path(pts,color,width*2,alpha*.3,front);this.path(pts,color,width,alpha,front);}
 circle3(r,color,width,alpha,dash){const pts=[];for(let i=0;i<=120;i++){const t=i/120*Math.PI*2;pts.push([r*Math.cos(t),0,r*Math.sin(t)]);}const c=this.ctx;if(dash)c.setLineDash(dash);this.path(pts,color,width,alpha,null);c.setLineDash([]);}
 backdrop(){const c=this.ctx,w=this.w,h=this.h,v=this.values;const bg=c.createRadialGradient(this.cx,this.cy,10,this.cx,this.cy,Math.max(w,h)*.75);bg.addColorStop(0,'#0b1828');bg.addColorStop(.55,'#060d17');bg.addColorStop(1,'#03060b');c.fillStyle=bg;c.fillRect(0,0,w,h);
  for(const s of this.stars){const tw=.65+.35*Math.sin(this.motion*1.3+s.p);c.fillStyle='rgba(205,222,245,'+((.08+s.r*.3)*tw).toFixed(3)+')';c.beginPath();c.arc(s.x*w,s.y*h,s.r,0,Math.PI*2);c.fill();}
  // The Sun is 23,500 Rᴇ away, beyond the frame even on the log scale: drawn at the left edge.
  const act=v.f107==null?.25:Math.max(0,Math.min(1,(v.f107-60)/180)),flare=v.xray!=null&&v.xray>=1e-5,R=Math.min(h*.3,w*.16),sx=-R*.55,sy=this.cy;c.save();c.globalCompositeOperation='lighter';
  const corona=c.createRadialGradient(sx,sy,R*.6,sx,sy,R*(3+act*1.5));corona.addColorStop(0,'rgba(255,190,100,'+(.2+act*.22).toFixed(3)+')');corona.addColorStop(.35,'rgba(255,140,60,'+(.05+act*.07).toFixed(3)+')');corona.addColorStop(1,'rgba(255,120,40,0)');c.fillStyle=corona;c.fillRect(0,0,w,h);
  for(let i=0;i<14;i++){const a=(i/14)*Math.PI*2+this.motion*.03*(i%2?1:-1),len=R*(1.4+this.rand(i+50)*1.1+act);const gr=c.createLinearGradient(sx,sy,sx+Math.cos(a)*len,sy+Math.sin(a)*len);gr.addColorStop(0,'rgba(255,200,120,.09)');gr.addColorStop(1,'rgba(255,200,120,0)');c.strokeStyle=gr;c.lineWidth=R*.18;c.beginPath();c.moveTo(sx,sy);c.lineTo(sx+Math.cos(a)*len,sy+Math.sin(a)*len);c.stroke();}
  c.restore();const disc=c.createRadialGradient(sx+R*.15,sy-R*.1,R*.05,sx,sy,R);disc.addColorStop(0,'#fffaf0');disc.addColorStop(.45,'#ffe2a3');disc.addColorStop(.85,'#ffb04f');disc.addColorStop(1,'#ff8a2c');c.fillStyle=disc;c.beginPath();c.arc(sx,sy,R,0,Math.PI*2);c.fill();
  if(flare){c.save();c.globalCompositeOperation='lighter';const f=c.createRadialGradient(sx+R*.6,sy-R*.3,0,sx+R*.6,sy-R*.3,R*1.4);f.addColorStop(0,'rgba(255,255,255,'+(.5+.25*Math.sin(this.motion*4)).toFixed(3)+')');f.addColorStop(1,'rgba(255,220,180,0)');c.fillStyle=f;c.fillRect(0,0,w,h);c.restore();}}
 rings(){this.circle3(logRadius(10),'#aec6db',1,.14,[2,6]);this.circle3(logRadius(100),'#aec6db',1,.1,[2,6]);}
 surfaces(){if(!this.layers.field)return;const g=this.geom,c=this.ctx,bz=this.values.bz,mpColor=bz==null?'#8fa3b8':bz<0?'#d3a8ff':'#86f0d0',live=this.summary.modelled;
  const sheet=(tab,color,alpha)=>{for(let k=0;k<12;k++){const ph=k/12*Math.PI*2;this.path(tab.map(t=>[t[0],t[1]*Math.cos(ph),t[1]*Math.sin(ph)]),color,.8,alpha*.28,null);}for(const idx of[12,30,52]){const t=tab[idx],pts=[];for(let i=0;i<=60;i++){const ph=i/60*Math.PI*2;pts.push([t[0],t[1]*Math.cos(ph),t[1]*Math.sin(ph)]);}this.path(pts,color,.8,alpha*.22,null);}c.save();c.globalCompositeOperation='lighter';for(const s of[1,-1])this.glow(tab.map(t=>[t[0],s*t[1],0]),color,1.2,alpha,null);c.restore();};
  sheet(g.bs,'#ffcf8a',live?.55:.25);sheet(g.mp,mpColor,live?.6:.3);
  // Dayside reconnection: where southward Bz lets solar-wind energy in.
  const cp=this.summary.coupling;if(bz!=null&&bz<0&&cp){const q=this.project([g.mp[0][0],0,0]),a=Math.min(1,cp)*(.6+.4*Math.sin(this.motion*3)),R=this.scale*(.18+.25*Math.min(1,cp));c.save();c.globalCompositeOperation='lighter';const gr=c.createRadialGradient(q.x,q.y,0,q.x,q.y,R);gr.addColorStop(0,'rgba(240,215,255,'+(.55*a).toFixed(3)+')');gr.addColorStop(1,'rgba(200,150,255,0)');c.fillStyle=gr;c.beginPath();c.arc(q.x,q.y,R,0,Math.PI*2);c.fill();c.restore();}}
 lines(front){if(!this.layers.field)return;const g=this.geom,c=this.ctx,bz=this.values.bz;c.save();if(front)c.globalCompositeOperation='lighter';
  for(const l of g.closed)this.path(l.pts,'#86e6d0',l.L<4?1.1:.85,(front?.42:.16)*(l.L>8?.7:1),front);
  for(const pts of g.open)this.path(pts,bz!=null&&bz<0?'#c9a2ff':'#7f95b0',.85,front?.4:.16,front);
  const e=this.values.electrons,ea=e==null?.03:Math.min(.14,Math.max(.02,Math.log10(Math.max(1,e))/28));for(const pts of g.belts)this.path(pts,'#ffb37a',1.6,ea*(front?1:.45),front);for(const pts of g.inner)this.path(pts,'#ff9a8f',1.2,.05*(front?1:.45),front);
  if(g.yourLine){c.globalCompositeOperation='lighter';this.glow(g.yourLine,'#ffd27a',1.1,front?.85:.3,front);}
  c.restore();}
 wind(){if(!this.layers.wind)return;const v=this.values,speed=v.speed;if(speed==null||!this.geom)return;const c=this.ctx,count=Math.round(80+Math.min(v.density??3,25)*6),rate=speed/400*.045;c.save();c.globalCompositeOperation='lighter';c.lineCap='round';
  const at=(x,rho0,phi)=>{const xs=this.shockX(rho0);let rho=rho0,hot=0;if(x>xs){const target=Math.max(rho0,this.mpRho(x)+.07),b=Math.min(1,(x-xs)/.35);rho=rho0+(target-rho0)*b;hot=b;}return[[x,rho*Math.cos(phi),rho*Math.sin(phi)],hot];};
  for(let i=0;i<count;i++){const rho0=Math.sqrt(this.rand(i*2+1))*3.7,phi=this.rand(i+150)*Math.PI*2,x=-5.6+((this.rand(i*2)+this.motion*rate)%1)*10.4,len=.08+speed/5000;const[a,hot]=at(x,rho0,phi),[b]=at(x-len,rho0,phi);if(vlen(a)<1.12)continue;const qa=this.project(a),qb=this.project(b),al=(.22+this.rand(i+56)*.45)*(hot?.85:1),col=hot?'255,150,95':'255,205,135';const gr=c.createLinearGradient(qb.x,qb.y,qa.x,qa.y);gr.addColorStop(0,'rgba('+col+',0)');gr.addColorStop(1,'rgba('+col+','+al.toFixed(2)+')');c.strokeStyle=gr;c.lineWidth=1+this.rand(i+77)*.7;c.beginPath();c.moveTo(qb.x,qb.y);c.lineTo(qa.x,qa.y);c.stroke();}c.restore();}
 planet(){const c=this.ctx,g=this.geom,p=this.project([0,0,0]),r=this.scale*p.k,sp=this.project([-1,0,0]);let dx=sp.x-p.x,dy=sp.y-p.y;const dl=Math.hypot(dx,dy)||1;dx/=dl;dy/=dl;
  const halo=c.createRadialGradient(p.x,p.y,r*.95,p.x,p.y,r*1.45);halo.addColorStop(0,'#4fc3ff38');halo.addColorStop(.3,'#3a9cff12');halo.addColorStop(1,'#277ed300');c.fillStyle=halo;c.beginPath();c.arc(p.x,p.y,r*1.45,0,Math.PI*2);c.fill();
  const ocean=c.createRadialGradient(p.x+dx*r*.45,p.y+dy*r*.45-r*.2,r*.05,p.x,p.y,r*1.1);ocean.addColorStop(0,'#3b9fc4');ocean.addColorStop(.5,'#16507a');ocean.addColorStop(1,'#061524');c.fillStyle=ocean;c.beginPath();c.arc(p.x,p.y,r,0,Math.PI*2);c.fill();c.save();c.beginPath();c.arc(p.x,p.y,r-.5,0,Math.PI*2);c.clip();
  const lg=c.createLinearGradient(p.x-r,p.y-r,p.x+r,p.y+r);lg.addColorStop(0,'#6fbf95');lg.addColorStop(1,'#2c6d5a');c.fillStyle=lg;c.strokeStyle='#a8f0d540';c.lineWidth=.7;
  for(const pts of g.land){let active=false;c.beginPath();for(const v of pts){const q=this.project(v);if(q.z>0){if(!active)c.moveTo(q.x,q.y);else c.lineTo(q.x,q.y);active=true;}else if(active){c.closePath();c.fill();c.stroke();c.beginPath();active=false;}}c.closePath();c.fill();c.stroke();}
  for(const pts of g.grat)this.path(pts,'#c8ecf7',.5,.13,true);
  // Day/night from the real Sun direction: the terminator falls where it does on Earth now.
  const sh=c.createLinearGradient(p.x+dx*r,p.y+dy*r,p.x-dx*r,p.y-dy*r);sh.addColorStop(0,'#01050a00');sh.addColorStop(.46,'#01050a18');sh.addColorStop(.56,'#01050aa8');sh.addColorStop(1,'#01050af4');c.fillStyle=sh;c.fillRect(p.x-r,p.y-r,2*r,2*r);
  const spec=c.createRadialGradient(p.x+dx*r*.5,p.y+dy*r*.5-r*.15,0,p.x+dx*r*.5,p.y+dy*r*.5-r*.15,r*.7);spec.addColorStop(0,'#ffffff20');spec.addColorStop(1,'#ffffff00');c.fillStyle=spec;c.fillRect(p.x-r,p.y-r,2*r,2*r);c.restore();
  const rim=c.createLinearGradient(p.x+dx*r,p.y+dy*r,p.x-dx*r,p.y-dy*r);rim.addColorStop(0,'#9be6ffcc');rim.addColorStop(.6,'#5fb8e044');rim.addColorStop(1,'#5fb8e010');c.strokeStyle=rim;c.lineWidth=1.4;c.beginPath();c.arc(p.x,p.y,r,0,Math.PI*2);c.stroke();
  c.save();c.globalCompositeOperation='lighter';
  if(this.layers.atmosphere){const tec=this.values.tec,a=tec==null?.1:Math.min(.6,.16+tec/45),io=c.createLinearGradient(p.x+dx*r*1.2,p.y+dy*r*1.2,p.x-dx*r*1.2,p.y-dy*r*1.2);io.addColorStop(0,'rgba(185,161,255,'+a.toFixed(3)+')');io.addColorStop(1,'rgba(185,161,255,'+(a*.18).toFixed(3)+')');c.strokeStyle=io;c.lineWidth=r*.045;c.beginPath();c.arc(p.x,p.y,r*1.06,0,Math.PI*2);c.stroke();}
  if(this.layers.field&&g.aurora.length){// Brightness follows the model value (OVATION probability, 0–100%) so a 10% oval stays faint.
const s=Math.max(1.2,r*.018);for(const a of g.aurora){if(a[3]<=0)continue;const q=this.project(a);if(q.z<-.02)continue;const al=Math.min(1,a[3]*2.2)*(.25+.75*Math.min(1,Math.max(0,q.z)));c.fillStyle='rgba(80,255,165,'+(al*.05).toFixed(3)+')';c.fillRect(q.x-s*1.4,q.y-s*1.4,s*2.8,s*2.8);c.fillStyle='rgba(140,255,195,'+(al*.3).toFixed(3)+')';c.fillRect(q.x-s/2,q.y-s/2,s,s);if(a[3]>.35){c.fillStyle='rgba(255,110,200,'+((a[3]-.35)*.3).toFixed(3)+')';c.fillRect(q.x-s,q.y-s*2,s*2,s*1.2);}}}
  c.restore();
  this.ctx.setLineDash([3,4]);this.path(g.dipole,'#86f0d0',1,.5,null);this.ctx.setLineDash([]);this.path(g.axis,'#e6eef7',.8,.35,null);
  if(g.obs){const q=this.project(g.obs),pulse=this.reduced?0:(this.motion*.8)%1;c.globalAlpha=q.z<0?.3:1;c.fillStyle='#fff6dc';c.beginPath();c.arc(q.x,q.y,3.2,0,Math.PI*2);c.fill();c.strokeStyle='#ffd27a';c.lineWidth=1.2;c.beginPath();c.arc(q.x,q.y,7,0,Math.PI*2);c.stroke();if(q.z>0){c.globalAlpha=1-pulse;c.beginPath();c.arc(q.x,q.y,7+pulse*14,0,Math.PI*2);c.stroke();}c.globalAlpha=1;}}
 markers(){const c=this.ctx,g=this.geom;this.path(g.geoRing,'#9eb7dd',.7,.2,null);
  const q=this.project(g.goes);c.fillStyle='#d6e4f7';c.fillRect(q.x-2.5,q.y-2,5,4);c.fillStyle='#5f7fb8';c.fillRect(q.x-9,q.y-2.5,5,5);c.fillRect(q.x+4,q.y-2.5,5,5);
  const l=this.project(g.l1);c.save();c.translate(l.x,l.y);c.rotate(Math.PI/4);c.fillStyle='#ffe2a3';c.fillRect(-3.5,-3.5,7,7);c.restore();c.strokeStyle='#ffe2a355';c.beginPath();c.arc(l.x,l.y,9,0,Math.PI*2);c.stroke();
  const mo=this.project(g.moon),mr=Math.max(3,this.scale*.12*mo.k),sp=this.project(vadd(g.moon,[-1,0,0]));let dx=sp.x-mo.x,dy=sp.y-mo.y;const dl=Math.hypot(dx,dy)||1;dx/=dl;dy/=dl;const mg=c.createLinearGradient(mo.x+dx*mr,mo.y+dy*mr,mo.x-dx*mr,mo.y-dy*mr);mg.addColorStop(0,'#e9e4d8');mg.addColorStop(.5,'#9a968c');mg.addColorStop(.52,'#1d2128');mg.addColorStop(1,'#14181e');c.fillStyle=mg;c.beginPath();c.arc(mo.x,mo.y,mr,0,Math.PI*2);c.fill();}
 particles(){if(!this.layers.particles)return;const intensity=this.values.oulu!=null?this.values.oulu/6500:this.values.cosmic!=null?this.values.cosmic/95:null;if(intensity==null)return;const count=Math.max(10,Math.min(46,Math.round(intensity*34))),c=this.ctx;c.save();c.globalCompositeOperation='lighter';
  for(let i=0;i<count;i++){const z=this.rand(i+400)*2-1,a=this.rand(i+500)*Math.PI*2,s=Math.sqrt(1-z*z),u=[s*Math.cos(a),z,s*Math.sin(a)],tg=[(this.rand(i+600)-.5)*1.6,(this.rand(i+700)-.5)*1.6,(this.rand(i+800)-.5)*1.6],pr=(this.motion*.11+this.rand(i+900))%1,pos=t=>vadd(vscale(u,6*(1-t)),vscale(tg,t)),A=pos(pr),B=pos(Math.max(0,pr-.035));if(vlen(A)<1.1)continue;const qa=this.project(A),qb=this.project(B),al=.25+this.rand(i+950)*.45;const gr=c.createLinearGradient(qb.x,qb.y,qa.x,qa.y);gr.addColorStop(0,'rgba(143,195,255,0)');gr.addColorStop(1,'rgba(205,228,255,'+al.toFixed(2)+')');c.strokeStyle=gr;c.lineWidth=1.1;c.beginPath();c.moveTo(qb.x,qb.y);c.lineTo(qa.x,qa.y);c.stroke();}c.restore();}
 label(p,text,color,dx,dy,align){const q=this.project(p);if(q.x<-20||q.x>this.w+20||q.y<-10||q.y>this.h+10)return;const c=this.ctx,o=this.project([0,0,0]);if(q.z<0&&Math.hypot(q.x-o.x,q.y-o.y)<this.scale*o.k)return;c.font='11px "DM Mono", ui-monospace, monospace';c.textAlign=align||'left';c.textBaseline='middle';c.fillStyle=color;c.globalAlpha=.9;c.shadowColor='#000';c.shadowBlur=5;c.fillText(text,q.x+(dx||0),q.y+(dy||0));c.shadowBlur=0;c.globalAlpha=1;}
 labels(){if(!this.layers.labels)return;const g=this.geom,s=this.summary;
  if(this.layers.field){const b=g.bs[22];this.label([b[0],b[1],0],'Bow shock','#ffcf8a',6,-4);const m=g.mp[16];this.label([m[0],-m[1],0],'Magnetopause '+s.r0.toFixed(1)+' Rᴇ','#cfe0f0',6,10);this.label([logRadius(30),0,0],'Magnetotail','#9fb3c8',0,-12,'center');this.label(logMap(vscale(g.my,4.6)),'Radiation belt','#ffb37a',8,0);if(g.yourLine&&s.L){let top=g.yourLine[0];for(const p of g.yourLine)if(vlen(p)>vlen(top))top=p;this.label(top,'Your field line · L '+s.L.toFixed(1),'#ffd27a',8,-8);}}
  if(this.project(g.l1).x>this.w*.16)this.label(g.l1,'L1 monitor · 236 Rᴇ','#ffe2a3',12,0);this.label(g.goes,'GOES-19','#c7d6ea',12,0);this.label(g.moon,'Moon','#d8d4c8',10,-8);this.label([0,0,logRadius(10)],'10 Rᴇ','#8ea1b5',4,9);this.label([0,0,logRadius(100)],'100 Rᴇ','#8ea1b5',4,9);}
 draw(){const c=this.ctx,w=this.w,h=this.h;if(!w||!h||!this.geom)return;this.scale=Math.min(w/(w<760?8.4:12),h/(w<760?7.6:7.4))*this.zoom;c.clearRect(0,0,w,h);this.backdrop();this.rings();this.surfaces();this.lines(false);this.wind();this.planet();this.lines(true);this.markers();this.particles();this.labels();}
 animate(now){const dt=Math.min((now-this.last)/1000,.1);this.last=now;if(!document.hidden){if(!this.reduced)this.motion+=dt;this.draw();}requestAnimationFrame(this.animate);}
}
`;
