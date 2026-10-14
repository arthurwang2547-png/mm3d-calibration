/* New lesson adapter; the frozen optical model remains unchanged in model-base.js. */
window.TrainingModel=class extends OpticsModel{
 constructor(c){super(c);this.postLens=this.cylinder(.33,.09,.42,3.13,.42,this.lensMat,'y');this.postLens.visible=false;
 this.fillPatch=new THREE.Mesh(new THREE.PlaneGeometry(.34,.34),new THREE.MeshBasicMaterial({color:0xfff0c8,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));this.fillPatch.rotation.x=-Math.PI/2;this.scene.add(this.fillPatch);
 const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;const ctx=glowCanvas.getContext('2d'),g=ctx.createRadialGradient(64,64,2,64,64,63);g.addColorStop(0,'rgba(255,255,245,1)');g.addColorStop(.17,'rgba(255,233,170,.8)');g.addColorStop(.5,'rgba(255,160,55,.2)');g.addColorStop(1,'rgba(255,135,25,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);this.bloom=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(glowCanvas),transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));this.bloom.rotation.x=-Math.PI/2;this.scene.add(this.bloom);
 this.scanLine=new THREE.Mesh(new THREE.PlaneGeometry(.34,.018),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,depthWrite:false,side:THREE.DoubleSide}));this.scanLine.rotation.x=-Math.PI/2;this.scene.add(this.scanLine);
 }
 updateExtension(){super.updateExtension();const s=this.state,y=this.heightToY(-25),p=window.POINTS[s.point||0];this.markingGuide.visible=false;this.platform.position.y=y;this.currentMaterialY=y;
  this.postLens.visible=s.optics==='post';this.carriage.visible=s.optics!=='post';
  if(s.optics==='post'){this.path.visible=false;this.beamGroup.visible=false;this.spot.visible=false;this.spotGlow.visible=false;this.spotCore.visible=false;}
  if(s.showLayers){this.layers.visible=true;this.layerMeshes.forEach((g,i)=>{g.visible=true;const mm=[0,-52.5,-105,-25][i];g.position.y=this.heightToY(mm);g.userData.height=g.position.y;g.userData.mm=mm;this.styleLayer(g,i===3?0x00a699:0x5b91b8,i===3?.11:.035)});this.extraPreview.visible=false;}
  else this.layers.visible=false;
  const preview=s.laser==='preview',marking=['unfocused','adjust','focused'].includes(s.laser),active=preview||marking;
  // 1 mm square / 500 mm per second: rapid bidirectional hatch, not an outline circle.
  // Geometric size is magnified for visibility; this is not a real-time machine simulator.
  const lineNumber=Math.floor(s.elapsed*500),fraction=(s.elapsed*500)%1,row=lineNumber%13;
  const dx=(lineNumber%2?1-fraction:fraction)*.34-.17,dz=-.17+row*.34/12,x=.42+p.x*1.25,z=.42-p.y*1.25;
  for(const [o,d]of [[this.spot,.036],[this.spotGlow,.032],[this.spotCore,.040]])o.position.set(x+dx,y+d,z+dz);
  this.setBeamEnd([x+dx,y+.025,z+dz]);
  const q=s.focusProgress||0,energy=.08+.92*Math.pow(q,2.4),flicker=.91+.09*Math.sin(s.elapsed*73);
  this.fillPatch.visible=marking||s.laser==='stop';this.fillPatch.position.set(x,y+.025,z);this.fillPatch.material.color.setHex(marking?0xfff6df:0x806a52);this.fillPatch.material.opacity=marking?energy*.94:.16;
  this.bloom.visible=marking;this.bloom.position.set(x,y+.04,z);this.bloom.material.opacity=energy*.9*flicker;this.bloom.scale.setScalar(1.5-q*.5);
  this.scanLine.visible=marking;this.scanLine.position.set(x,y+.035,z+dz);this.scanLine.material.opacity=energy;
  this.spotCore.material.color.setHex(0xfffcdf);this.spotCore.material.opacity=energy*flicker;
  if(s.groupLesson){this.carriage.position.x=-2.28+.86*q;this.path.visible=false;this.beamGroup.visible=false;}

 }
 annotateExtension(svg,focus,aperture){const s=this.state;if(!s.lesson)return;super.annotateExtension(svg,focus,aperture);focus.querySelector('b').textContent=s.groupLesson?'同圈四點共用像素值':`S = ${this.number(s.focusS)} px`;if(s.showLayers)focus.style.display='none';let parts=[];const line=(a,b,c='#0ba399',w=2)=>`<path d="M${a.x},${a.y}L${b.x},${b.y}" stroke="${c}" stroke-width="${w}" fill="none"/>`,text=(p,t,c='#26778d',size=13)=>`<text x="${p.x}" y="${p.y}" fill="${c}" font-size="${size}" font-weight="650" stroke="#f7fbfd" stroke-width="4" paint-order="stroke">${t}</text>`;
  if(s.heightBracket){const a=this.project(1.98,this.heightToY(0),.42),b=this.project(1.98,this.heightToY(-25),.42),a0=this.project(.7,this.heightToY(0),.42),b0=this.project(.7,this.heightToY(-25),.42);parts.push(line(a0,a,'#93bac8',1),line(b0,b,'#93bac8',1),line(a,b),line({x:a.x-6,y:a.y},{x:a.x+6,y:a.y}),line({x:b.x-6,y:b.y},{x:b.x+6,y:b.y}),text({x:a.x+12,y:(a.y+b.y)/2+5},'25 mm','#e38428',22),text({x:a0.x-65,y:a0.y-12},'Z0 · 0 mm','#4e7fce'),text({x:b0.x-100,y:b0.y+27},'新增層 · −25 mm','#07968d',16));}
  if(s.showPoints){const count=s.ring===2?9:5;window.POINTS.slice(0,count).forEach((p,i)=>{const q=this.project(.42+p.x*1.25,this.heightToY(-25)+.04,.42-p.y*1.25),done=s.confirmed.includes(i),sel=s.point===i,c=(sel||s.groupActive&&i>=5)?'#ff1818':done?'#00a998':'#91a9b8';if(!(sel&&['preview','unfocused','adjust','focused'].includes(s.laser)))parts.push(`<circle cx="${q.x}" cy="${q.y}" r="${sel?9:6}" fill="${c}" stroke="white" stroke-width="2"/>`);if(s.groupActive&&i===7)parts.push(`<rect x="${q.x-12}" y="${q.y-12}" width="24" height="24" fill="none" stroke="#185aff" stroke-width="3"/>`);if(sel)parts.push(text({x:q.x+14,y:q.y-8},p.label,c,14));});}
  if(s.optics==='post'){focus.style.display='none';const q=this.project(.42,3.13,.42);parts.push(text({x:Math.min(this.w-180,q.x+20),y:q.y+20},'F-theta lens · 聚焦鏡','#0d919d',14));}
  svg.innerHTML=(s.heightBracket?'':svg.innerHTML)+parts.join('');
 }
};
