// Geometry and magnetosphere models used by the diorama. Pure functions only:
// the browser receives these exact sources via Function.prototype.toString, so
// each may reference only Math and the other functions listed in MODEL_FUNCTIONS.

// Low-precision solar ephemeris (Astronomical Almanac, ~0.01° over 1950–2050).
// Returns the unit Sun vector in Earth-centred inertial (equatorial) axes and the obliquity.
export function sunEci(t){const d=t/86400000-10957.5,r=Math.PI/180,g=(357.528+.9856003*d)*r,L=280.46+.9856474*d,lam=(L+1.915*Math.sin(g)+.02*Math.sin(2*g))*r,eps=(23.439-4e-7*d)*r;return{v:[Math.cos(lam),Math.cos(eps)*Math.sin(lam),Math.sin(eps)*Math.sin(lam)],eps};}

// Greenwich mean sidereal angle in radians (IAU 1982, truncated).
export function gmst(t){const d=t/86400000-10957.5;return(((280.46061837+360.98564736629*d)%360+360)%360)*Math.PI/180;}

// Geographic latitude/longitude (degrees) to Earth-fixed unit vector times r.
export function geoVec(lat,lon,r){const a=lat*Math.PI/180,b=lon*Math.PI/180;return[r*Math.cos(a)*Math.cos(b),r*Math.cos(a)*Math.sin(b),r*Math.sin(a)];}

// Simplified lunar position (Meeus low-precision terms): unit vector (equatorial) and distance in Earth radii.
export function moonEci(t){const d=t/86400000-10957.5,r=Math.PI/180,M=(134.963+13.064993*d)*r,F=(93.272+13.22935*d)*r,lam=(218.316+13.176396*d+6.289*Math.sin(M))*r,beta=5.128*Math.sin(F)*r,eps=(23.439-4e-7*d)*r,km=385001-20905*Math.cos(M);const x=Math.cos(beta)*Math.cos(lam),y=Math.cos(beta)*Math.sin(lam),z=Math.sin(beta);return{v:[x,Math.cos(eps)*y-Math.sin(eps)*z,Math.sin(eps)*y+Math.cos(eps)*z],re:km/6371.2};}

// GSM frame at time t. X points to the Sun, Z is the projection of the geomagnetic
// north dipole axis (IGRF-14 epoch 2025: 80.85° N, 72.68° W) perpendicular to X.
// tilt is the dipole tilt angle in radians (positive: north pole leans sunward).
export function gsmFrame(t){const s=sunEci(t),th=gmst(t),p=geoVec(80.85,-72.68,1),c=Math.cos(th),n=Math.sin(th),D=[p[0]*c-p[1]*n,p[0]*n+p[1]*c,p[2]],X=s.v,dx=D[0]*X[0]+D[1]*X[1]+D[2]*X[2];let Z=[D[0]-dx*X[0],D[1]-dx*X[1],D[2]-dx*X[2]];const zl=Math.hypot(Z[0],Z[1],Z[2]);Z=[Z[0]/zl,Z[1]/zl,Z[2]/zl];const Y=[Z[1]*X[2]-Z[2]*X[1],Z[2]*X[0]-Z[0]*X[2],Z[0]*X[1]-Z[1]*X[0]];return{X,Y,Z,D,theta:th,tilt:Math.asin(Math.max(-1,Math.min(1,dx)))};}

// Earth-fixed vector -> inertial -> GSM components [X,Y,Z].
export function fixedToGsm(v,F){const c=Math.cos(F.theta),n=Math.sin(F.theta),e=[v[0]*c-v[1]*n,v[0]*n+v[1]*c,v[2]];return[e[0]*F.X[0]+e[1]*F.X[1]+e[2]*F.X[2],e[0]*F.Y[0]+e[1]*F.Y[1]+e[2]*F.Y[2],e[0]*F.Z[0]+e[1]*F.Z[1]+e[2]*F.Z[2]];}
export function inertialToGsm(e,F){return[e[0]*F.X[0]+e[1]*F.X[1]+e[2]*F.X[2],e[0]*F.Y[0]+e[1]*F.Y[1]+e[2]*F.Y[2],e[0]*F.Z[0]+e[1]*F.Z[1]+e[2]*F.Z[2]];}

// Solar-wind dynamic pressure in nPa from proton density (cm^-3) and speed (km/s).
export function dynamicPressure(n,v){return n==null||v==null||!(n>0)||!(v>0)?null:1.6726e-6*n*v*v;}

// Shue et al. (1998) magnetopause: r = r0 (2 / (1 + cos θ))^α, in Earth radii.
export function shue(p,bz){const P=p??2,B=bz??0;return{r0:(10.22+1.29*Math.tanh(.184*(B+8.14)))*Math.pow(P,-1/6.6),alpha:(.58-.007*B)*(1+.024*Math.log(P))};}
export function magnetopauseR(m,th){return m.r0*Math.pow(2/(1+Math.cos(th)),m.alpha);}

// Bow shock as a conic r = L / (1 + e cos θ) whose nose sits 1.3 × the magnetopause
// standoff, the typical high-Mach-number ratio. e = 0.9 gives flank distances near 25 Rᴇ.
export function bowShockR(m,th){const nose=1.3*m.r0,e=.9;return nose*(1+e)/(1+e*Math.cos(th));}

// Newell et al. (2007) coupling dΦ/dt ∝ v^4/3 Bt^2/3 sin^8/3(θc/2). Without By, the clock
// angle is approximated from cos θc ≈ Bz / Bt. Returned normalised so ~1 is a typical active day.
export function coupling(v,bt,bz){if(v==null||bt==null||bz==null||!(bt>0))return null;const c=Math.max(-1,Math.min(1,bz/bt)),half=Math.acos(c)/2;return Math.pow(v,4/3)*Math.pow(bt,2/3)*Math.pow(Math.sin(half),8/3)/1e4;}

// Kp-driven auroral oval in magnetic coordinates. Equatorward edge 66.5° − 2.04 Kp at
// magnetic midnight (the standard NOAA/Feldstein-style relation), about 9° poleward at noon.
// mlt in hours. Returns [equatorward, poleward] magnetic latitudes in degrees.
export function kpOval(kp,mlt){const k=Math.max(0,Math.min(9,kp)),c=Math.cos((mlt/24)*2*Math.PI),eq=66.5-2.04*k+4.5*(1-c),w=3+.6*k+(1.5+.3*k)*c;return[eq,eq+Math.max(2,w)];}

// One logarithmic radial scale for the whole scene: 1 Rᴇ stays 1, 10 Rᴇ ≈ 2.6, 100 Rᴇ ≈ 4.2.
export const LOG_K=.7;
export function logRadius(r){return r<=1?r:1+.7*Math.log(r);}
export function unlogRadius(s){return s<=1?s:Math.exp((s-1)/.7);}

export const MODEL_FUNCTIONS=[sunEci,gmst,geoVec,moonEci,gsmFrame,fixedToGsm,inertialToGsm,dynamicPressure,shue,magnetopauseR,bowShockR,coupling,kpOval,logRadius,unlogRadius];
