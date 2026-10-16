import test from 'node:test';
import assert from 'node:assert/strict';
import {RecordingSession} from '../recording.js';
function fixture(Recorder){
  let clock=0,stopped=0,result,session;
  const states=[],errors=[];
  class FakeRecorder {
    constructor(){this.state='inactive';this.mimeType='video/webm';}
    start(){this.state='recording';}
    pause(){this.state='paused';}
    resume(){this.state='recording';}
    stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable({data:new Blob(['last frame'])});this.onstop();});}
  }
  session=new RecordingSession({canvas:{captureStream:()=>({getTracks:()=>[{stop:()=>stopped++}]})},mime:'video/webm',Recorder:Recorder||FakeRecorder,now:()=>clock,onResult:r=>result=r,onState:s=>states.push(s),onError:e=>errors.push(e)});
  return {session,advance:ms=>clock+=ms,states,errors,get result(){return result;},get stopped(){return stopped;}};
}
test('background pause excludes hidden time and resumes at the same ride position',async()=>{
  const f=fixture();f.session.start();f.advance(2500);f.session.pause();
  assert.equal(f.session.elapsed,2.5);f.advance(60000);assert.equal(f.session.elapsed,2.5);
  f.session.resume();f.advance(1500);f.session.stop();await Promise.resolve();
  assert.equal(f.result.seconds,4);assert.equal(f.result.partial,false);
  assert.deepEqual(f.states,['recording','paused','recording','finishing','finished']);assert.equal(f.stopped,1);
});
test('final data event is retained in the downloadable result',async()=>{
  const f=fixture();f.session.start();f.session.recorder.ondataavailable({data:new Blob(['first frame '])});f.session.stop();await Promise.resolve();
  assert.equal(await f.result.blob.text(),'first frame last frame');assert.equal(f.result.blob.type,'video/webm');
});
test('stopping a paused recording preserves a labelled partial video',async()=>{
  const f=fixture();f.session.start();f.advance(1000);f.session.pause();f.advance(50000);f.session.stop('Stopped early');await Promise.resolve();
  assert.equal(f.result.partial,true);assert.equal(f.result.reason,'Stopped early');assert.equal(f.result.seconds,1);assert.ok(f.result.blob.size>0);
});
test('repeated stop calls do not duplicate results or cleanup',async()=>{
  const f=fixture();f.session.start();f.session.stop();f.session.stop();await Promise.resolve();f.session.stop();assert.equal(f.stopped,1);assert.equal(f.states.filter(s=>s==='finished').length,1);
});
test('encoder initialization failure releases the capture stream',()=>{
  const f=fixture(class{constructor(){throw Error('encoder unavailable');}});f.session.start();assert.equal(f.stopped,1);assert.equal(f.session.state,'finished');assert.match(f.errors[0],/encoder unavailable/);
});
test('encoder errors preserve available partial data and report failure',async()=>{
  const f=fixture();f.session.start();f.session.recorder.onerror();await Promise.resolve();assert.equal(f.result.partial,true);assert.match(f.result.reason,/interrupted/);assert.equal(f.errors.length,1);
});
