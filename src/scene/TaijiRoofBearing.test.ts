import {createRoofBearingGeometry,calculateRoofUndersideAt,type RoofBearingOptions} from './TaijiRoofBearing';

const options:RoofBearingOptions={roofWidth:21.2,roofDepth:10.5,roofBase:6,roofRise:2,centerX:8,centerZ:4.36,width:.92,depth:.64,bottom:5.72,profile:'steady-crafted'};

it('meets the steady roof underside at every inner and outer cap corner',()=>{
  const geometry=createRoofBearingGeometry(options),position=geometry.getAttribute('position');
  for(let corner=0;corner<4;corner++) {
    const x=position.getX(corner+4),z=position.getZ(corner+4);
    expect(position.getY(corner+4)).toBeCloseTo(calculateRoofUndersideAt(options,options.centerX+x,options.centerZ+z),5);
    expect(position.getY(corner+4)).toBeGreaterThan(options.bottom);
  }
  expect(position.getY(4)).not.toBeCloseTo(position.getY(5),5);
});

it('returns finite indexed owned bearing geometry with upward top normals',()=>{
  const a=createRoofBearingGeometry(options),b=createRoofBearingGeometry(options),position=a.getAttribute('position'),normal=a.getAttribute('normal');
  for(const value of position.array)expect(Number.isFinite(value)).toBe(true);
  for(const index of a.getIndex()!.array)expect(index).toBeLessThan(position.count);
  expect(normal.getY(4)).toBeGreaterThan(0);expect(a.getAttribute('position').array).not.toBe(b.getAttribute('position').array);
});

it('uses the hip face for a west-wing cap corner beyond the front trapezoid',()=>{
  const westWing:RoofBearingOptions={roofWidth:21.2,roofDepth:10.5,roofBase:6,roofRise:1.89,centerX:9.75,centerZ:4.36,width:.92,depth:.64,bottom:5.76,profile:'steady-crafted'};
  const x=10.21,z=4.04;
  // Independent roofPoint side-face calculation: t from X, cross-coordinate u from Z.
  const ridge=(21.2-10.5)/2;
  const t=(Math.abs(x)-ridge)/(21.2/2-ridge);
  const u=(z/(10.5/2*t)+1)/2;
  const eave=Math.max(0,(t-.7)/.3);
  const expected=6+1.89*(1-t)+eave*eave*(.18+.30*Math.abs(u*2-1)**6)-.16;
  expect(expected).toBeCloseTo(6.13833,4);
  expect(calculateRoofUndersideAt(westWing,x,z)).toBeCloseTo(expected,6);
  expect(calculateRoofUndersideAt(westWing,x,z)).toBeLessThan(6.30138);
});
