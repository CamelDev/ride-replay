// Keep capture timing separate from tab visibility and route playback.
export class RecordingSession {
  constructor({canvas, mime, onResult, onState, onError, Recorder=globalThis.MediaRecorder, now=()=>performance.now()}) {
    Object.assign(this,{canvas,mime,onResult,onState,onError,Recorder,now});
    this.state='idle';
    this.elapsedMs=0;
    this.chunks=[];
  }
  get elapsed() {
    return (this.elapsedMs+(this.state==='recording'?this.now()-this.startedAt:0))/1000;
  }
  start() {
    try {
      this.stream=this.canvas.captureStream(30);
      this.recorder=new this.Recorder(this.stream,{mimeType:this.mime,videoBitsPerSecond:10000000});
      this.recorder.ondataavailable=e=>{if(e.data.size)this.chunks.push(e.data);};
      this.recorder.onerror=()=>{
        this.stop('Encoding was interrupted. This is a partial recording.');
        this.onError('The browser could not finish encoding. Any recorded video will appear below.');
      };
      this.recorder.onstop=()=>{
        this.stream.getTracks().forEach(t=>t.stop());
        const blob=new Blob(this.chunks,{type:this.recorder.mimeType||this.mime});
        this.chunks=[];
        this.state='finished';
        this.onState(this.state);
        if(blob.size)this.onResult({blob,partial:!!this.reason,reason:this.reason,seconds:this.elapsedMs/1000});
        else this.onError('No video frames were recorded. Please try again.');
      };
      this.recorder.start(1000);
      this.startedAt=this.now();
      this.state='recording';
      this.onState(this.state);
    } catch(e) {
      this.stream?.getTracks().forEach(t=>t.stop());
      this.state='finished';
      this.onState(this.state);
      this.onError('Video export failed: '+e.message);
    }
  }
  pause() {
    if(this.state!=='recording')return;
    this.elapsedMs+=this.now()-this.startedAt;
    this.recorder.pause();
    this.state='paused';
    this.onState(this.state);
  }
  resume() {
    if(this.state!=='paused')return;
    this.recorder.resume();
    this.startedAt=this.now();
    this.state='recording';
    this.onState(this.state);
  }
  stop(reason='') {
    if(!['recording','paused'].includes(this.state))return;
    if(this.state==='recording')this.elapsedMs+=this.now()-this.startedAt;
    this.reason=reason;
    this.state='finishing';
    this.onState(this.state);
    if(this.recorder.state!=='inactive')this.recorder.stop();
  }
}
