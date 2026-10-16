import {duration,prepare,sample,project,parseGPX,demo} from './route.js';
import {RecordingSession} from './recording.js';
const $=id=>document.getElementById(id),canvas=$('map'),ctx=canvas.getContext('2d'),profile=$('profile'),pc=profile.getContext('2d');
let route=demo(),name='Morning in the Dolomites',start=0,end=route.total,time=0,speed=1,mode='overview',playing=false,zoomOffset=0,overlay=true,last=0,recording=false,session=null,resultURL=null,toastTimer;
const tiles=new Map();let tileFailed=false;
const mime=typeof MediaRecorder!=='undefined'?['video/webm;codecs=vp9','video/webm;codecs=vp8','video/mp4'].find(x=>MediaRecorder.isTypeSupported(x)):null;
$('format-label').textContent=mime?.includes('mp4')?'MP4':'WEBM';
function toast(s){$('toast').textContent=s;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,6500);}
function selected(){return [sample(route,start),sample(route,end)];}
function updateRoute(){const [a,b]=selected();$('route-name').textContent=name;$('route-meta').textContent=route.estimated?'Estimated timing · GPX':`${route.points.length.toLocaleString()} points · ${name==='Morning in the Dolomites'?'Demo GPX':'Timestamped GPX'}`;$('total-distance').textContent=((b.distance-a.distance)/1000).toFixed(1)+' km';$('total-duration').textContent=duration(end-start);$('total-ascent').textContent=Math.round(b.ascent-a.ascent)+' m';$('duration').textContent=duration(end-start);$('start-value').textContent=duration(start);$('end-value').textContent=duration(end);$('selection-duration').textContent=`${duration(end-start)} selected · ${((b.distance-a.distance)/1000).toFixed(2)} km`;$('export-duration').textContent=`Video length ${duration((end-start)/speed)} at ${speed}× speed`;$('axis-mid').textContent=((b.distance-a.distance)/2000).toFixed(1)+' km';$('axis-end').textContent=((b.distance-a.distance)/1000).toFixed(1)+' km';}
function updateLive(){const p=sample(route,time),a=sample(route,start);$('elapsed').textContent=duration(time-start);$('scrubber').value=(time-start)/(end-start)*1000;$('speed').textContent=p.speed.toFixed(1);$('altitude').textContent=p.ele===null?'—':Math.round(p.ele);$('distance').textContent=((p.distance-a.distance)/1000).toFixed(2);$('ascent').textContent=Math.round(p.ascent-a.ascent);$('play').textContent=playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',playing?'Pause route':'Play route');}
function tile(z,x,y){const n=2**z;if(y<0||y>=n)return null;x=((x%n)+n)%n;const key=`${z}/${x}/${y}`;if(tiles.has(key))return tiles.get(key);const img=new Image();img.crossOrigin='anonymous';const entry={img,loaded:false};tiles.set(key,entry);img.onload=()=>entry.loaded=true;img.onerror=()=>{if(!tileFailed){toast('Some map tiles could not load. Check your connection.');tileFailed=true;}};img.src=`https://tile.openstreetmap.org/${key}.png`;if(tiles.size>350)tiles.delete(tiles.keys().next().value);return entry;}
function camera(){const points=[sample(route,start),...route.points.filter(p=>p.t>start&&p.t<end),sample(route,end)];let projected=points.map(project);const reference=projected[0].x;projected=projected.map(p=>({...p,x:p.x-Math.round(p.x-reference)}));let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const p of projected){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}const fit=Math.floor(Math.log2(Math.min(1460/Math.max((maxX-minX)*256,.001),740/Math.max((maxY-minY)*256,.001))));const z=Math.max(1,Math.min(17,(mode==='follow'?Math.max(fit,14):fit)+zoomOffset));const pos=project(sample(route,time));pos.x-=Math.round(pos.x-reference);return {z,x:mode==='follow'?pos.x:(minX+maxX)/2,y:mode==='follow'?pos.y:(minY+maxY)/2,points,reference};}
function draw(){const W=1920,H=1080,cam=camera(),scale=256*2**cam.z;ctx.fillStyle='#e7ebde';ctx.fillRect(0,0,W,H);const ox=cam.x*scale-W/2,oy=cam.y*scale-H/2;for(let x=Math.floor(ox/256);x<Math.ceil((ox+W)/256);x++)for(let y=Math.floor(oy/256);y<Math.ceil((oy+H)/256);y++){const t=tile(cam.z,x,y);if(t?.loaded){ctx.save();ctx.globalAlpha=.83;ctx.drawImage(t.img,x*256-ox,y*256-oy,256,256);ctx.restore();}else{ctx.strokeStyle='#dce3d3';ctx.strokeRect(x*256-ox,y*256-oy,256,256);}}
ctx.fillStyle='#e7edcf';ctx.globalAlpha=.13;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
const xy=p=>{const q=project(p);q.x-=Math.round(q.x-cam.reference);return [q.x*scale-ox,q.y*scale-oy];};
const path=(points,color,width)=>{ctx.beginPath();points.forEach((p,i)=>{const [x,y]=xy(p);if(i===0||p.break)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();};
path(cam.points,'#ffffffe6',14);path(cam.points,'#769765',7);const progress=[sample(route,start),...route.points.filter(p=>p.t>start&&p.t<time),sample(route,time)];path(progress,'#2f7652',8);
const first=xy(sample(route,start)),pos=xy(sample(route,time));ctx.beginPath();ctx.arc(...first,10,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle='#3e7f55';ctx.lineWidth=4;ctx.stroke();ctx.beginPath();ctx.arc(...pos,27,0,Math.PI*2);ctx.fillStyle='#357e5230';ctx.fill();ctx.beginPath();ctx.arc(...pos,13,0,Math.PI*2);ctx.fillStyle='#2b7650';ctx.fill();ctx.strokeStyle='white';ctx.lineWidth=5;ctx.stroke();
if(overlay){const p=sample(route,time),a=sample(route,start);ctx.fillStyle='#ffffffee';ctx.beginPath();ctx.roundRect(55,866,880,145,18);ctx.fill();ctx.font='17px sans-serif';ctx.fillStyle='#7e8f73';const labels=['SPEED','ALTITUDE','DISTANCE','RIDE TIME'],vals=[p.speed.toFixed(1)+' km/h',p.ele===null?'—':Math.round(p.ele)+' m',((p.distance-a.distance)/1000).toFixed(2)+' km',duration(time-start)];labels.forEach((l,i)=>{ctx.fillStyle='#7e8f73';ctx.font='16px sans-serif';ctx.fillText(l,85+i*217,906);ctx.fillStyle='#31513d';ctx.font='31px sans-serif';ctx.fillText(vals[i],85+i*217,961);});}
if(recording){ctx.fillStyle='#ffffffdd';ctx.fillRect(1360,1040,560,40);ctx.fillStyle='#426044';ctx.font='19px sans-serif';ctx.fillText('© OpenStreetMap contributors',1500,1068);ctx.fillStyle='#ffffffee';ctx.beginPath();ctx.roundRect(55,50,570,90,12);ctx.fill();ctx.fillStyle='#31513d';ctx.font='26px sans-serif';ctx.fillText(name.slice(0,36),80,88);ctx.font='16px sans-serif';ctx.fillText(`RIDE REPLAY  ·  ${speed}×  ·  ${route.estimated?'ESTIMATED TIME':'GPX TIME'}`,80,117);}
drawProfile();}
function drawProfile(){const pts=[sample(route,start),...route.points.filter(p=>p.t>start&&p.t<end),sample(route,end)],els=pts.filter(p=>p.ele!==null).map(p=>p.ele);pc.clearRect(0,0,1200,130);if(!els.length){$('elevation-range').textContent='No elevation data';return;}let low=Infinity,high=-Infinity;for(const e of els){low=Math.min(low,e);high=Math.max(high,e);}const a=pts[0].distance,dist=pts.at(-1).distance-a;const x=p=>dist?(p.distance-a)/dist*1200:(p.t-start)/(end-start)*1200,y=p=>115-(p.ele-low)/Math.max(1,high-low)*100;pc.beginPath();pc.moveTo(0,130);for(const p of pts)pc.lineTo(x(p),p.ele===null?115:y(p));pc.lineTo(1200,130);pc.closePath();const g=pc.createLinearGradient(0,0,0,130);g.addColorStop(0,'#b7caa489');g.addColorStop(1,'#e7eddf55');pc.fillStyle=g;pc.fill();pc.beginPath();pts.forEach((p,i)=>{if(!i||p.break||p.ele===null)pc.moveTo(x(p),p.ele===null?115:y(p));else pc.lineTo(x(p),y(p));});pc.strokeStyle='#98b27e';pc.lineWidth=2;pc.stroke();pc.beginPath();const px=x(sample(route,time));pc.moveTo(px,0);pc.lineTo(px,130);pc.strokeStyle='#3a8055';pc.lineWidth=2;pc.stroke();$('elevation-range').textContent=`${Math.round(low)} – ${Math.round(high)} m`;}
function loop(now){const dt=last?(now-last)/1000:0;last=now;if(playing){time=Math.min(end,recording?start+session.elapsed*speed:time+dt*speed);if(time>=end){playing=false;if(recording)setTimeout(()=>stopExport(),100);}}updateLive();draw();if(recording)$('export-progress').value=(time-start)/(end-start);requestAnimationFrame(loop);}
function reset(){start=0;end=route.total;time=0;playing=false;zoomOffset=0;$('trim-start').value=0;$('trim-end').value=1000;updateRoute();}
$('play').onclick=()=>{if(recording)return;if(time>=end)time=start;playing=!playing;};$('restart').onclick=()=>{time=start;};$('scrubber').oninput=e=>{time=start+Number(e.target.value)/1000*(end-start);};
document.querySelectorAll('[data-speed]').forEach(b=>b.onclick=()=>{speed=Number(b.dataset.speed);document.querySelectorAll('[data-speed]').forEach(x=>x.classList.toggle('active',x===b));$('speed-label').textContent=speed+'× speed';updateRoute();});document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;zoomOffset=0;document.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('active',x===b));$('map-status').textContent=mode==='follow'?'◎  Follow rider':'◎  Overview';});
$('zoom-in').onclick=()=>zoomOffset=Math.min(5,zoomOffset+1);$('zoom-out').onclick=()=>zoomOffset=Math.max(-5,zoomOffset-1);$('fit').onclick=()=>{zoomOffset=0;document.querySelector('[data-mode=overview]').click();};$('overlay').onchange=e=>overlay=e.target.checked;
for(const id of ['trim-start','trim-end'])$(id).oninput=()=>{let a=Number($('trim-start').value),b=Number($('trim-end').value);if(a>=b){if(id==='trim-start')a=b-1;else b=a+1;}$('trim-start').value=a;$('trim-end').value=b;start=a/1000*route.total;end=b/1000*route.total;time=Math.max(start,Math.min(time,end));playing=false;updateRoute();};$('reset-trim').onclick=reset;$('demo').onclick=()=>{route=demo();name='Morning in the Dolomites';reset();toast('Demo route loaded. Upload your GPX to replay your own ride.');};
async function upload(file){if(!file)return;if(file.size>25*1024*1024){toast('Please choose a GPX file smaller than 25 MB.');return;}try{const parsed=parseGPX(await file.text());let next;try{next=prepare(parsed.points);}catch(e){if(e.message!=='MISSING_TIME')throw e;const minutes=prompt('This GPX has missing timestamps. Enter the total ride duration in minutes to estimate timing. Speed will be estimated from distance.','60');if(minutes===null)return;const secs=Number(minutes)*60;if(!Number.isFinite(secs)||secs<=0)throw Error('Enter a positive duration in minutes.');next=prepare(parsed.points,secs);}route=next;name=parsed.name||file.name.replace(/\.gpx$/i,'');reset();toast(route.estimated?'Route loaded with estimated timing.':'GPX loaded. Ready to replay.');}catch(e){toast(e.message);}finally{$('file').value='';}}
$('upload').onclick=$('upload-top').onclick=()=>$('file').click();$('file').onchange=e=>upload(e.target.files[0]);const drop=$('upload');drop.ondragover=e=>{e.preventDefault();drop.classList.add('drag');};drop.ondragleave=()=>drop.classList.remove('drag');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('drag');upload(e.dataTransfer.files[0]);};
function download(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
const esc=s=>s.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
$('download-gpx').onclick=()=>{const pts=[sample(route,start),...route.points.filter(p=>p.t>start&&p.t<end),sample(route,end)],base=Number.isFinite(route.points[0].time)?route.points[0].time:Date.now();const body=pts.map((p,i)=>`${p.break&&i?'</trkseg><trkseg>':''}<trkpt lat="${p.lat}" lon="${((p.lon+540)%360)-180}">${p.ele===null?'':`<ele>${p.ele.toFixed(2)}</ele>`}<time>${new Date(base+p.t*1000).toISOString()}</time></trkpt>`).join('\n');download(new Blob([`<?xml version="1.0"?><gpx version="1.1" creator="Ride Replay" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>${esc(name)}${route.estimated?' (estimated timestamps)':''}</name><trkseg>${body}</trkseg></trk></gpx>`],{type:'application/gpx+xml'}),'ride-trimmed.gpx');};
function exportDialog(){
  if(!mime||!canvas.captureStream){toast('Video export is unavailable in this browser. Try a current desktop Chrome or Edge.');return;}
  playing=false;
  $('export-heading').textContent='Export in Full HD';
  $('export-message').textContent='Recording runs in real time at your selected multiplier. Switching tabs pauses recording; return here and resume. Your finished video will appear below the map with a download button. Keep this page open until you save it.';
  $('dialog-duration').textContent=duration((end-start)/speed);
  $('export-progress').hidden=true;
  $('export-progress').value=0;
  $('start-export').hidden=false;
  $('start-export').textContent='Start recording';
  $('cancel-export').textContent='Cancel';
  $('export-dialog').showModal();
}
$('export').onclick=$('export-top').onclick=exportDialog;
function recordingState(state){
  recording=['recording','paused','finishing'].includes(state);
  playing=state==='recording';
  $('start-export').hidden=state!=='paused';
  $('cancel-export').disabled=state==='finishing';
  if(state==='recording'){
    $('export-heading').textContent='Recording your ride…';
    $('export-message').textContent='Keep this tab visible to record. If you switch away, recording pauses without losing progress. Your video will appear below the map when finished.';
    $('export-progress').hidden=false;
    $('cancel-export').textContent='Stop & keep partial video';
  }else if(state==='paused'){
    time=Math.min(end,start+session.elapsed*speed);
    $('export-heading').textContent='Recording paused — progress kept';
    $('export-message').textContent='Recording paused when you left this tab. Resume to finish the ride, or keep the video recorded so far.';
    $('start-export').textContent='Resume recording';
  }else if(state==='finishing'){
    $('export-heading').textContent='Preparing your video…';
  }else if(state==='finished'){
    $('export-dialog').close();
  }
}
function showResult({blob,partial,reason,seconds}){
  const previous=resultURL;
  resultURL=URL.createObjectURL(blob);
  $('result-video').src=resultURL;
  $('result-video').load();
  $('download-video').href=resultURL;
  $('download-video').download=`ride-replay-1080p${partial?'-partial':''}.${blob.type.includes('mp4')?'mp4':'webm'}`;
  $('result-heading').textContent=partial?'Your partial recording':'Your ride video is ready';
  $('result-description').textContent=`${duration(seconds)} · 1920 × 1080 · ${(blob.size/1024/1024).toFixed(1)} MB. ${reason||'Play it here or download your video.'} Save before refreshing or closing this page.`;
  $('export-result').hidden=false;
  if(previous)URL.revokeObjectURL(previous);
  $('export-result').scrollIntoView({behavior:'smooth',block:'center'});
}
$('start-export').onclick=()=>{
  if(session?.state==='paused'){
    if(document.hidden)return;
    draw();
    session.resume();
    return;
  }
  time=start;draw();
  const cam=camera(),scale=256*2**cam.z,ox=cam.x*scale-960,oy=cam.y*scale-540;
  for(let x=Math.floor(ox/256);x<Math.ceil((ox+1920)/256);x++)for(let y=Math.floor(oy/256);y<Math.ceil((oy+1080)/256);y++){
    const t=tile(cam.z,x,y);
    if(t&&!t.loaded){toast('Waiting for the visible map tiles. Please try recording again once the map has loaded.');return;}
  }
  session=new RecordingSession({canvas,mime,onState:recordingState,onResult:showResult,onError:message=>{
    $('export-error').textContent=message;
    $('export-error').hidden=false;
  }});
  $('export-error').hidden=true;
  recording=true;draw();
  session.start();
};
function stopExport(reason=''){session?.stop(reason);}
$('cancel-export').onclick=()=>{
  if(recording)stopExport('Stopped before the full route finished. This is a partial recording.');
  else $('export-dialog').close();
};
$('export-dialog').oncancel=e=>{
  if(recording){e.preventDefault();stopExport('Stopped before the full route finished. This is a partial recording.');}
};
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&session?.state==='recording')session.pause();
});
window.addEventListener('beforeunload',e=>{
  if(recording||resultURL){e.preventDefault();e.returnValue='';}
});
updateRoute();requestAnimationFrame(loop);
