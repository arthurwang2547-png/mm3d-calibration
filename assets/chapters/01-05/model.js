/* Optical teaching model: schematic geometry, not a product CAD. */
window.OpticsModel = class {
  constructor(canvas) {
    this.canvas=canvas; this.viewport=canvas.parentElement; this.scene=new THREE.Scene();
    this.camera=new THREE.OrthographicCamera(-5,5,3,-3,.05,100);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace; this.renderer.toneMapping=THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure=1.3;
    this.scene.add(new THREE.HemisphereLight(0xf4fbff,0x91a9b8,2.2));
    [[-5,9,7,2.8],[5,5,-4,2],[0,1,8,1.6]].forEach(([x,y,z,i])=>{let l=new THREE.DirectionalLight(0xffffff,i);l.position.set(x,y,z);this.scene.add(l)});
    this.metal=new THREE.MeshStandardMaterial({color:0xc0d0da,metalness:.48,roughness:.3});
    this.dark=new THREE.MeshStandardMaterial({color:0x2d5166,metalness:.38,roughness:.36});
    this.edge=new THREE.MeshStandardMaterial({color:0x7497aa,metalness:.55,roughness:.25});
    this.glass=new THREE.MeshPhysicalMaterial({color:0x88eaf0,transparent:true,opacity:.18,metalness:.08,roughness:.12,side:THREE.DoubleSide,depthWrite:false});
    this.lensMat=new THREE.MeshPhysicalMaterial({color:0x14c4da,transparent:true,opacity:.68,metalness:.1,roughness:.08,side:THREE.DoubleSide,depthWrite:false});
    this.rig=new THREE.Group(); this.scene.add(this.rig);this.rigMaterials=new Set();
    this.buildHead();this.buildPlatform();this.buildField();this.buildLayers();
    this.state={step:0,cue:0,elapsed:0,full:false,playing:false};this.yaw=-.62;this.pitch=.38;this.targetYaw=-.62;this.targetPitch=.38;
    this.center=new THREE.Vector3(-.55,2.35,.05);this.targetCenter=this.center.clone();this.span=6;this.targetSpan=6;this.zoom=1;this.targetZoom=1;this.view='3d';this.closeup=false;this.rigOpacity=1;this.manualView=false;
    this.w=0;this.h=0;this.lastTime=performance.now();this.bind();this.loop=this.loop.bind(this);requestAnimationFrame(this.loop);
  }
  material(color,opacity=1){return new THREE.MeshBasicMaterial({color,toneMapped:false,transparent:opacity<1,opacity,depthWrite:opacity===1,side:THREE.DoubleSide})}
  add(mesh,parent=this.rig){parent.add(mesh);return mesh}
  rounded(w,h,d,x,y,z,mat=this.metal,parent=this.rig,r=.05){let s=new THREE.Shape(),a=-w/2,b=-h/2;r=Math.min(r,w/4,h/4);s.moveTo(a+r,b);s.lineTo(a+w-r,b);s.quadraticCurveTo(a+w,b,a+w,b+r);s.lineTo(a+w,b+h-r);s.quadraticCurveTo(a+w,b+h,a+w-r,b+h);s.lineTo(a+r,b+h);s.quadraticCurveTo(a,b+h,a,b+h-r);s.lineTo(a,b+r);s.quadraticCurveTo(a,b,a+r,b);let g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.012,bevelThickness:.012,curveSegments:6});g.translate(0,0,-d/2);let m=new THREE.Mesh(g,mat);m.position.set(x,y,z);return this.add(m,parent)}
  cylinder(r,l,x,y,z,mat=this.metal,axis='x',parent=this.rig,open=false){let m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,l,64,1,open),mat);if(axis==='x')m.rotation.z=Math.PI/2;else if(axis==='z')m.rotation.x=Math.PI/2;m.position.set(x,y,z);return this.add(m,parent)}
  ring(r,t,x,y,z,mat=this.edge,axis='x',parent=this.rig){let m=new THREE.Mesh(new THREE.TorusGeometry(r,t,10,72),mat);if(axis==='x')m.rotation.y=Math.PI/2;else if(axis==='y')m.rotation.x=Math.PI/2;m.position.set(x,y,z);return this.add(m,parent)}
  tube(a,b,r,color,parent=this.rig,opacity=1){let va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),d=vb.clone().sub(va),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),8),this.material(color,opacity));m.position.copy(va.add(vb).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return this.add(m,parent)}
  panelWithHole(w,h,t,x,y,z,hx,hy,r,orientation='x'){let shape=new THREE.Shape();shape.moveTo(-w/2,-h/2);shape.lineTo(w/2,-h/2);shape.lineTo(w/2,h/2);shape.lineTo(-w/2,h/2);shape.closePath();let hole=new THREE.Path();hole.absarc(hx,hy,r,0,Math.PI*2,true);shape.holes.push(hole);let geo=new THREE.ExtrudeGeometry(shape,{depth:t,bevelEnabled:true,bevelSegments:2,bevelSize:.018,bevelThickness:.012,curveSegments:48});let m=new THREE.Mesh(geo,this.metal);if(orientation==='x')m.rotation.y=Math.PI/2;else m.rotation.x=-Math.PI/2;m.position.set(x,y,z);this.add(m);return m}
  buildHead(){
    // A real circular input aperture in the side plate, and open-bottom output port.
    this.panelWithHole(1.85,1.44,.075,-.44,4.08,.1,.42,0,.245);
    this.ring(.254,.029,-.463,4.08,-.32,this.edge);
    this.rounded(.095,1.44,1.85,1.35,4.08,.1,this.dark);
    this.rounded(1.75,1.44,.075,.48,4.08,-.825,this.dark);
    this.rounded(1.78,.11,1.88,.48,4.85,.1,this.dark);
    this.rounded(1.68,.023,1.73,.48,4.925,.1,this.metal);
    this.panelWithHole(1.8,1.85,.09,.48,3.34,.1,-.06,-.32,.31,'y');
    this.ring(.33,.055,.42,3.29,.42,this.edge,'y');
    this.cylinder(.325,.15,.42,3.27,.42,this.metal,'y',this.rig,true);
    for(let x of [-.3,1.23])for(let z of [-.69,.87]){this.cylinder(.038,.017,x,4.945,z,this.edge,'y');this.rounded(.04,.002,.007,x,4.956,z,this.dark)}
    for(let i=0;i<8;i++)this.rounded(.018,.028,.8,1.406,4.49-i*.075,.12,this.edge);
    // XY mirrors: input +X, then +Z, then down -Y. Mirrors bisect incident/outgoing rays.
    let mmat=new THREE.MeshStandardMaterial({color:0xe6f7fa,metalness:.82,roughness:.08});
    let mirror=(pos,normal)=>{let m=this.rounded(.48,.39,.038,...pos,mmat);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...normal).normalize());return m};
    mirror([.42,4.08,-.32],[1,0,-1]);mirror([.42,4.08,.42],[0,1,1]);
    this.cylinder(.185,.43,.42,4.54,-.32,this.edge,'y');
    this.cylinder(.18,.42,.91,4.08,.42,this.edge,'x');
    // Transparent focusing barrel, rails and physically moving lens carriage.
    this.cylinder(.36,2.08,-1.85,4.08,-.32,this.glass,'x',this.rig,true);
    for(let x of [-2.91,-2.75,-1.0,-.8])this.ring(.36,.032,x,4.08,-.32,this.metal);
    for(let ang of [Math.PI*.22,Math.PI*1.22]){let y=4.08+Math.cos(ang)*.31,z=-.32+Math.sin(ang)*.31;this.tube([-2.76,y,z],[-.98,y,z],.017,0x8aa8b7)}
    this.carriage=new THREE.Group();this.carriage.position.set(-1.85,4.08,-.32);this.rig.add(this.carriage);
    this.ring(.275,.028,0,0,0,this.edge,'x',this.carriage);
    let lens=new THREE.Mesh(new THREE.SphereGeometry(.268,48,32),this.lensMat);lens.scale.set(.2,1,1);this.carriage.add(lens);
    this.ring(.275,.008,.024,0,0,this.material(0x11c6d0),'x',this.carriage);
    this.ring(.27,.025,-.88,4.08,-.32,this.metal);this.cylinder(.27,.2,-.72,4.08,-.32,this.glass,'x',this.rig,true);
    // No decorative plate above the barrel: all visible parts serve the optical explanation.
    this.path=new THREE.Group();this.rig.add(this.path);
    [[[-3.5,4.08,-.32],[.42,4.08,-.32]],[[.42,4.08,-.32],[.42,4.08,.42]],[[.42,4.08,.42],[.42,3.17,.42]]].forEach(([a,b])=>{this.tube(a,b,.013,0xff9b2f,this.path);this.tube(a,b,.038,0xffaf50,this.path,.12)});
    this.beamGroup=new THREE.Group();this.scene.add(this.beamGroup);this.beam=this.tube([.42,3.17,.42],[.42,.025,.42],.01,0xffa037,this.beamGroup);this.beamHalo=this.tube([.42,3.17,.42],[.42,.025,.42],.034,0xffa037,this.beamGroup,.08);
    this.spot=new THREE.Mesh(new THREE.CircleGeometry(.08,48),this.material(0xffa132,.85));this.spot.rotation.x=-Math.PI/2;this.spot.position.set(.42,.036,.42);this.scene.add(this.spot);
    this.rig.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.userData.baseOpacity=o.material.opacity;this.rigMaterials.add(o.material)}});
  }
  buildPlatform(){this.platform=new THREE.Group();this.scene.add(this.platform);this.rounded(5.7,.075,4.3,-.25,-.075,.05,new THREE.MeshStandardMaterial({color:0xebf2f5,metalness:.05,roughness:.85}),this.platform);let lineMat=new THREE.LineBasicMaterial({color:0xd0dee6,transparent:true,opacity:.65});let points=[];for(let x=-2.85;x<=2.35;x+=.26)points.push(new THREE.Vector3(x,.001,-2.03),new THREE.Vector3(x,.001,2.13));for(let z=-2.03;z<=2.14;z+=.26)points.push(new THREE.Vector3(-2.85,.001,z),new THREE.Vector3(2.35,.001,z));this.grid=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),lineMat);this.platform.add(this.grid)}
  rectangle(w,d,color,y,parent,opacity=.08){let g=new THREE.Group();parent.add(g);let fill=new THREE.Mesh(new THREE.PlaneGeometry(w,d),this.material(color,opacity));fill.rotation.x=-Math.PI/2;fill.position.y=y;g.add(fill);let p=[[-w/2,y,-d/2],[w/2,y,-d/2],[w/2,y,d/2],[-w/2,y,d/2]];for(let i=0;i<4;i++)this.tube(p[i],p[(i+1)%4],.018,color,g);return g}
  buildField(){this.field=new THREE.Group();this.scene.add(this.field);this.target=this.rectangle(2.6,2.6,0x5281f5,.045,this.field,.14);this.actual=this.rectangle(3.12,3.12,0xf19a32,.065,this.field,.025);this.scanDot=new THREE.Mesh(new THREE.SphereGeometry(.035,12,12),this.material(0xff9a27));this.field.add(this.scanDot);this.field.visible=false;this.sweep=new THREE.Group();this.scene.add(this.sweep);this.sweepLines=[];for(let p of [[-1.56,0,-1.56],[1.56,0,-1.56],[1.56,0,1.56],[-1.56,0,1.56]])this.sweepLines.push(this.tube([.42,3.17,.42],p,.006,0x4fc1d2,this.sweep,.25));this.sweep.visible=false}
  buildLayers(){this.layers=new THREE.Group();this.scene.add(this.layers);this.layerMeshes=[];for(let i=0;i<9;i++){let g=this.rectangle(3.1,2.55,i%4===0?0x1099a4:0x90cdd1,.13+i*.285,this.layers,i%4===0?.17:.065);this.layerMeshes.push(g)}this.layers.visible=false}
  bind(){let down=false,x=0,y=0;this.canvas.addEventListener('pointerdown',e=>{down=true;x=e.clientX;y=e.clientY;this.canvas.setPointerCapture(e.pointerId);this.manualView=true});this.canvas.addEventListener('pointermove',e=>{if(!down)return;this.targetYaw-=(e.clientX-x)*.007;this.targetPitch=Math.min(1.565,Math.max(-.05,this.targetPitch+(e.clientY-y)*.007));x=e.clientX;y=e.clientY;this.view='custom'});for(let n of ['pointerup','pointercancel'])this.canvas.addEventListener(n,()=>down=false);this.canvas.addEventListener('wheel',e=>{e.preventDefault();this.setZoom(this.targetZoom*Math.exp(-e.deltaY*.001))},{passive:false});new ResizeObserver(()=>this.resize()).observe(this.viewport)}
  resize(){let r=this.viewport.getBoundingClientRect();if(!r.width||!r.height)return;this.w=r.width;this.h=r.height;this.renderer.setSize(r.width,r.height,false)}
  setZoom(v){this.targetZoom=Math.max(.65,Math.min(2.8,v));document.querySelector('#zoom-value').textContent=Math.round(this.targetZoom*100)+'%'}
  setView(view,manual=true){this.view=view;this.manualView=manual;this.targetYaw=view==='side'?0:view==='top'?0:-.62;this.targetPitch=view==='side'?.01:view==='top'?Math.PI/2-.006:.38;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view))}
  reset(){this.setZoom(1);this.manualView=false;this.setView(this.state.step===3&&this.state.cue>0?'top':this.state.step===1&&this.state.cue===0?'side':'3d',false)}
  setState(s){this.state={...this.state,...s};this.manualView=false;this.closeup=this.state.step===1&&this.state.cue===1;this.setZoom(1);this.setView(this.state.step===3&&this.state.cue>0?'top':this.state.step===1&&this.state.cue===0?'side':'3d',false)}
  setBeamEnd(p){for(let m of [this.beam,this.beamHalo]){let a=new THREE.Vector3(.42,3.17,.42),b=new THREE.Vector3(...p),d=b.clone().sub(a);m.position.copy(a.add(b).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());m.scale.y=d.length()/3.145}}
  project(x,y,z){let v=new THREE.Vector3(x,y,z).project(this.camera);return{x:(v.x*.5+.5)*this.w,y:(-.5*v.y+.5)*this.h}}
  annotate(){let {step,cue,elapsed}=this.state,svg=document.querySelector('#annotations'),parts=[];let text=(p,t,color='#617f91',size=12,anchor='middle')=>`<text x="${p.x}" y="${p.y}" text-anchor="${anchor}" fill="${color}" font-size="${size}" font-weight="650" stroke="#f7fbfd" stroke-width="4" paint-order="stroke">${t}</text>`;let ln=(a,b,c='#e59845',dash='')=>`<path d="M${a.x},${a.y}L${b.x},${b.y}" fill="none" stroke="${c}" stroke-width="2" ${dash?'stroke-dasharray="4 4"':''}/>`;
    if(step<2&&!this.closeup&&this.pitch<1.2){let a=this.project(.42,3.17,.42),b=this.project(.42,.01,.42),c=this.project(1.45,3.17,.42),d=this.project(1.45,.01,.42);parts.push(ln(a,c,'#c2ced5',true),ln(b,d,'#c2ced5',true),ln(c,d),ln({x:c.x-7,y:c.y},{x:c.x+7,y:c.y}),ln({x:d.x-7,y:d.y},{x:d.x+7,y:d.y}),text({x:(c.x+d.x)/2+15,y:(c.y+d.y)/2-3},'244','#dc872c',25,'start'),text({x:(c.x+d.x)/2+16,y:(c.y+d.y)/2+17},'mm · 焦距高度','#9a8d7a',10,'start'))}
    let focus=document.querySelector('#focus-label'),aperture=document.querySelector('#aperture-label');let showFocus=step<3&&this.pitch<1.15;focus.style.display=showFocus?'block':'none';aperture.style.display=showFocus&&this.state.full&&!this.closeup?'block':'none';
    if(showFocus){let p=this.project(this.carriage.position.x,4.08,-.32);let fx=Math.max(12,Math.min(this.w-145,p.x-67)),fy=Math.max(10,p.y-88);focus.style.transform=`translate(${fx}px,${fy}px)`;focus.querySelector('b').textContent=this.closeup||step===2?'鏡片前後移動':'透明外筒・內部鏡片';parts.push(ln({x:fx+65,y:fy+47},p,'#5dbfc8'));if(aperture.style.display==='block'){let a=this.project(-.45,4.08,-.32);let ax=Math.min(this.w-130,a.x-70),ay=a.y+46;aperture.style.transform=`translate(${ax}px,${ay}px)`;parts.push(ln(a,{x:ax+60,y:ay},'#a5bdc9'))}}
    if(step===3&&this.pitch>1){let dims=cue===1?[98,104]:cue===2?[104,104]:[120,120],w=dims[0]*.026,d=dims[1]*.026,col=cue===1?'#df7c27':'#119c85';let a=this.project(-w/2,.09,d/2+.17),b=this.project(w/2,.09,d/2+.17);parts.push(ln(a,b,col),ln({x:a.x,y:a.y-5},{x:a.x,y:a.y+5},col),ln({x:b.x,y:b.y-5},{x:b.x,y:b.y+5},col),text({x:(a.x+b.x)/2,y:(a.y+b.y)/2+23},`X ${dims[0]} mm`,col,19));a=this.project(w/2+.17,.09,-d/2);b=this.project(w/2+.17,.09,d/2);parts.push(ln(a,b,col),ln({x:a.x-5,y:a.y},{x:a.x+5,y:a.y},col),ln({x:b.x-5,y:b.y-5},{x:b.x+5,y:b.y},col),text({x:(a.x+b.x)/2+12,y:(a.y+b.y)/2},`Y ${dims[1]}`,col,20,'start'));let p=this.project(-1.25,.08,-1.12);parts.push(text({x:p.x+5,y:p.y+5},'目標 100 × 100 mm','#487be6',13,'start'));if(cue===1){let p=this.project(0,.1,-1.3);parts.push(text({x:p.x,y:p.y-24},'X 少了 2 mm','#dc7334',18))}}
    if(step===4){for(let i of [0,4,8]){let p=this.project(1.7,.13+i*.285,1.2);parts.push(text({x:p.x+8,y:p.y},i===0?'Zmin':i===4?'Z0':'Zmax','#3d929e',12,'start'))}}
    if(this.closeup){let a=this.project(-2.47,3.48,-.32),b=this.project(-1.1,3.48,-.32);parts.push(ln(a,b,'#22aeb7'),text({x:(a.x+b.x)/2,y:(a.y+b.y)/2+25},'沿光路前後移動','#138e9a',15))}
    svg.innerHTML=parts.join('');
  }
  loop(now){requestAnimationFrame(this.loop);if(!this.w)return;let dt=Math.min(.05,(now-this.lastTime)/1000);this.lastTime=now;let s=this.state,t=s.elapsed,lerp=1-Math.exp(-dt*5);if(s.step===3&&s.cue===0&&t>5&&!this.manualView&&this.view!=='top')this.setView('top',false);
    this.yaw+=(this.targetYaw-this.yaw)*lerp;this.pitch+=(this.targetPitch-this.pitch)*lerp;this.zoom+=(this.targetZoom-this.zoom)*lerp;
    this.closeup=s.step===1&&s.cue===1&&t>=3.5&&t<11.5;let top=this.pitch>1.12,field=s.step===3;let aim=(field&&top)?new THREE.Vector3(0,0,0):this.closeup?new THREE.Vector3(-1.8,4.05,-.32):new THREE.Vector3(-.6,2.4,.04);this.center.lerp(aim,lerp);this.targetSpan=field&&top?4.05:this.closeup?2.65:5.95;this.span+=(this.targetSpan-this.span)*lerp;let span=this.span/this.zoom,aspect=this.w/this.h;this.camera.left=-span*aspect/2;this.camera.right=span*aspect/2;this.camera.top=span/2;this.camera.bottom=-span/2;let shift=s.full?.1:0;this.camera.left-=span*aspect*shift;this.camera.right-=span*aspect*shift;this.camera.updateProjectionMatrix();this.camera.position.set(this.center.x+Math.sin(this.yaw)*Math.cos(this.pitch)*15,this.center.y+Math.sin(this.pitch)*15,this.center.z+Math.cos(this.yaw)*Math.cos(this.pitch)*15);this.camera.lookAt(this.center);this.camera.updateMatrixWorld();
    let targetOpacity=top?0:1;this.rigOpacity+=(targetOpacity-this.rigOpacity)*lerp;this.rig.visible=this.rigOpacity>.01;this.rigMaterials.forEach(m=>{m.opacity=m.userData.baseOpacity*this.rigOpacity;m.transparent=m.opacity<.999;m.depthWrite=m.opacity>.98});
    this.carriage.position.x=-1.85+((this.closeup||s.step===2)?Math.sin(t*1.35)*.43:0);
    this.platform.visible=!this.closeup;this.grid.material.opacity=field?.24:.65;this.beamGroup.visible=!top&&!this.closeup&&s.step!==4;this.spot.visible=!top&&!this.closeup&&s.step!==4;this.spot.scale.setScalar(s.step===2?1.8+.85*Math.cos(t*1.35):1);
    this.field.visible=field;this.sweep.visible=field&&!top;this.layers.visible=s.step===4;this.layerMeshes.forEach((g,i)=>{g.visible=s.cue>0||i%4===0||t>1.2+i*.65});
    if(field){let w=s.cue===1?98/120:s.cue===2?104/120:1,d=s.cue===1?104/120:s.cue===2?104/120:1;this.actual.scale.set(w,1,d);let col=s.cue===1?0xe78830:0x0da28c;this.actual.traverse(o=>{if(o.isMesh)o.material.color.setHex(col)});let u=(t*.15)%4;let x,z;if(u<1){x=-1.56+3.12*u;z=-1.56}else if(u<2){x=1.56;z=-1.56+(u-1)*3.12}else if(u<3){x=1.56-(u-2)*3.12;z=1.56}else{x=-1.56;z=1.56-(u-3)*3.12}this.scanDot.position.set(x*w,.095,z*d);this.spot.position.set(x*w,.04,z*d);this.setBeamEnd([x*w,.025,z*d])}else{this.spot.position.set(.42,.036,.42);this.setBeamEnd([.42,.025,.42])}
    this.annotate();this.renderer.render(this.scene,this.camera);
  }
  debug(){return{view:this.view,zoom:this.targetZoom,rigVisible:this.rig.visible,rigOpacity:this.rigOpacity,lensX:this.carriage.position.x,visibleLayers:this.layerMeshes.filter(g=>g.visible).length,span:this.span,viewport:[this.w,this.h]}}
};
