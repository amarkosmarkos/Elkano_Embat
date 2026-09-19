/** Short-lived water lens: a continuous surface with scene refraction and Fresnel reflections. */
const vertex=`attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const fragment=`precision highp float;
varying vec2 uv;
uniform sampler2D sea;
uniform vec2 size;
uniform vec4 button;
uniform vec4 videoMap;
uniform vec4 drops[12];
uniform float time;
uniform float hasVideo;
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float box(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}
float field(vec2 p){
  float gather=smoothstep(.65,2.8,time);
  float settle=smoothstep(2.35,3.25,time);
  vec2 center=vec2(0.,-1.65*(1.-gather));
  vec2 halfSize=mix(vec2(.08,.04),vec2(button.z/button.w,1.),gather);
  float rounding=mix(.48,.235,settle);
  float d=box(p-center,max(halfSize,vec2(rounding)),rounding);
  d+=(sin(p.x*3.5+time*4.7)*sin(p.y*4.8-time*3.2))*.045*(1.-settle);
  for(int i=0;i<12;i++){
    vec2 q=(p-drops[i].xy)/vec2(1.,drops[i].w);
    d=smin(d,length(q)-drops[i].z,.24);
  }
  return d;
}
float height(vec2 p){float d=field(p);return sqrt(max(0.,1.-exp(min(0.,d)*4.)))*.32;}
vec3 background(vec2 screen){
  vec2 tex=videoMap.xy+screen*videoMap.zw;
  vec3 fallback=mix(vec3(.05,.12,.18),vec3(.42,.48,.52),screen.y/size.y);
  return mix(fallback,texture2D(sea,clamp(tex,vec2(.001),vec2(.999))).rgb,hasVideo);
}
void main(){
  vec2 screen=uv*size;
  float unit=button.w*.5;
  vec2 p=(screen-button.xy)/unit;
  float d=field(p);
  float fade=1.-smoothstep(3.05,3.65,time);
  float appear=smoothstep(.02,.25,time);
  if(d>.13||fade<.002)discard;
  if(d>0.){float shadow=(1.-smoothstep(0.,.13,d))*.10*fade*appear;gl_FragColor=vec4(0.,.015,.025,shadow);return;}
  float e=.009;
  vec3 normal=normalize(vec3(-(height(p+vec2(e,0.))-height(p-vec2(e,0.)))/(2.*e),-(height(p+vec2(0.,e))-height(p-vec2(0.,e)))/(2.*e),1.));
  float fresnel=.025+.72*pow(1.-normal.z,4.);
  // Refract the actual moving ship/ocean behind this fragment, rather than fake neon.
  vec3 transmitted=background(screen-normal.xy*(9.+15.*(1.-normal.z)));
  vec3 reflected=background(vec2(screen.x+normal.x*75.,size.y*.82+normal.y*55.));
  vec3 color=mix(transmitted*vec3(.91,.97,.985),reflected,fresnel);
  vec3 key=normalize(vec3(-.45,.8,1.));
  vec3 rim=normalize(vec3(.8,-.25,.5));
  float highlight=pow(max(0.,dot(normal,normalize(key+vec3(0.,0.,1.)))),100.);
  float secondary=pow(max(0.,dot(normal,normalize(rim+vec3(0.,0.,1.)))),50.);
  color+=vec3(1.,.96,.87)*highlight*.9+vec3(.66,.84,.94)*secondary*.38;
  // Thin meniscus catches the sky at the edge; keep the body clear.
  float edge=exp(d*28.);
  color+=vec3(.65,.79,.88)*edge*.19;
  float alpha=smoothstep(0.,.045,-d)*fade*appear;
  gl_FragColor=vec4(color,alpha);
}`;

export function waterPortal(canvas:HTMLCanvasElement,host:HTMLElement,link:HTMLAnchorElement){
  const gl=canvas.getContext("webgl",{alpha:true,premultipliedAlpha:false,antialias:false,depth:false,stencil:false,powerPreference:"low-power"});
  if(!gl)return()=>{};
  const shader=(type:number,source:string)=>{const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error(message??"Water shader failed");}return s;};
  let vs:WebGLShader,fs:WebGLShader;
  try{vs=shader(gl.VERTEX_SHADER,vertex);fs=shader(gl.FRAGMENT_SHADER,fragment);}catch{return()=>{};}
  const program=gl.createProgram()!;gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);return()=>{};}
  gl.useProgram(program);
  const buffer=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,"position");gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const location=(name:string)=>gl.getUniformLocation(program,name);
  const uniforms={size:location("size"),button:location("button"),map:location("videoMap"),drops:location("drops[0]"),time:location("time"),video:location("hasVideo")};
  const texture=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([24,47,63,255]));
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  // A small background copy keeps texture uploads cheap even when the film is 4K.
  const source=document.createElement("canvas");source.width=640;source.height=360;
  const sourceContext=source.getContext("2d")!;
  const video=host.closest(".scene-stage")?.querySelector("video");
  const photo=new Image();photo.src=video?.poster??"/video/cierre-hq.jpg";
  let width=0,height=0,bw=0,bh=0,raf=0,done=false,lastFrame=-1,uploaded=-1;
  const reveal=link.getAnimations().find(a=>(a as CSSAnimation).animationName==="portal-materialize");
  const started=performance.now()-Number(reveal?.currentTime??0);
  const values=new Float32Array(48);
  const ease=(n:number)=>{const t=Math.max(0,Math.min(1,n));return t*t*(3-2*t);};
  const measure=()=>{
    const box=canvas.getBoundingClientRect(),wrapper=host.getBoundingClientRect();width=box.width;height=box.height;
    bw=link.offsetWidth;bh=link.offsetHeight;
    // Bound GPU work independently from retina pixel density.
    canvas.width=Math.round(width);canvas.height=Math.round(height);gl.viewport(0,0,canvas.width,canvas.height);
    gl.uniform2f(uniforms.size,width,height);
    gl.uniform4f(uniforms.button,wrapper.left-box.left+link.offsetLeft+bw/2,height-(wrapper.top-box.top+link.offsetTop+bh/2),bw,bh);
    if(video){
      const stage=video.getBoundingClientRect(),vw=video.videoWidth||1280,vh=video.videoHeight||720;
      const scale=Math.max(stage.width/vw,stage.height/vh),iw=vw*scale,ih=vh*scale;
      const left=stage.left+(stage.width-iw)/2,top=stage.top+(stage.height-ih)/2;
      gl.uniform4f(uniforms.map,(box.left-left)/iw,1-(box.top+height-top)/ih,1/iw,1/ih);
    }
  };
  const release=()=>{if(done)return;done=true;cancelAnimationFrame(raf);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);};
  const draw=(now:number)=>{
    if(done)return;
    const time=(now-started)/1000;
    if(time>=3.8){release();return;}
    raf=requestAnimationFrame(draw);
    if(now-lastFrame<1000/45)return;lastFrame=now;
    if(now-uploaded>1000/30){
      const frame=video&&video.readyState>=2?video:photo.complete&&photo.naturalWidth?photo:null;
      if(frame){sourceContext.drawImage(frame,0,0,640,360);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.uniform1f(uniforms.video,1);uploaded=now;}
    }
    for(let i=0;i<12;i++){
      const side=i%2?1:-1,phase=(i*.6180339)%1,t=ease((time-i*.035)/2.05);
      const target=side*(.2+phase*(bw/bh-.4));
      values[i*4]=side*(3.4+phase*4)*(1-t)+target*t+Math.sin(t*Math.PI)*side*.65;
      values[i*4+1]=(-3.7-phase*2.2)*(1-t)+Math.sin(t*Math.PI)*(.8+phase)-.1;
      values[i*4+2]=(.13+phase*.2)*(1-ease((time-2.3)/.55));
      values[i*4+3]=1.+Math.sin(t*Math.PI)*(.5+phase*.6);
    }
    gl.uniform4fv(uniforms.drops,values);gl.uniform1f(uniforms.time,time);
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,6);
  };
  measure();const observer=new ResizeObserver(()=>{if(!done)measure();});observer.observe(host);
  video?.addEventListener("loadedmetadata",measure);raf=requestAnimationFrame(draw);
  const lost=(event:Event)=>{event.preventDefault();release();};canvas.addEventListener("webglcontextlost",lost);
  return()=>{release();observer.disconnect();video?.removeEventListener("loadedmetadata",measure);canvas.removeEventListener("webglcontextlost",lost);};
}
