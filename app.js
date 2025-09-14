// Photobooth app (app.js)
// Place frames in the same folder or update file paths.

const availableFrames = [
  {name:'None', file:''},
  {name:'Frame 1', file:'presmark.png'},
  {name:'Frame 2', file:'Testing.png'},
  {name:'Frame 3', file:'on.png'},
  {name:'Frame 4', file:'frame.png'}
];

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const captureBtn = document.getElementById('capture');
const restartBtn = document.getElementById('restart');
const downloadBtn = document.getElementById('download');
const framePreview = document.getElementById('framePreview');
const framesList = document.getElementById('framesList');
const gridSelect = document.getElementById('gridSelect');
const countdownSelect = document.getElementById('countdownSelect');
const countdownEl = document.getElementById('countdown');
const resultPreview = document.getElementById('resultPreview');
const resultGrid = document.getElementById('resultGrid');
const layoutSelect = document.getElementById('layoutSelect');

let selectedFrame = '';
let latestFinal = { vertical: null, horizontal: null }; // store both layouts for download

function renderFrameList(){
  framesList.innerHTML='';
  availableFrames.forEach((f, idx)=>{
    const el = document.createElement('div');
    el.className='frame-option'+(idx===0?' selected':'');
    el.dataset.file = f.file;
    el.innerHTML = `<img src="${f.file}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'240\\' height=\\'160\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'#333\\'/><text x=\\'50%\\' y=\\'50%\\' fill=\\'#fff\\' font-size=\\'14\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\'>${encodeURIComponent(f.name)}</text></svg>'"/><span>${f.name}</span>`;
    el.addEventListener('click', ()=>{
      document.querySelectorAll('.frame-option').forEach(x=>x.classList.remove('selected'));
      el.classList.add('selected');
      selectedFrame = f.file || '';
      if(selectedFrame){
        framePreview.src = selectedFrame;
        framePreview.style.display='block';
      } else {
        framePreview.src = '';
        framePreview.style.display='none';
      }
    });
    framesList.appendChild(el);
  });
}

renderFrameList();

async function startCamera(){
  try{
    const stream = await navigator.mediaDevices.getUserMedia({video:{width:1280,height:720}});
    video.srcObject = stream;
    await video.play();
  }catch(e){
    console.error('Webcam access failed:',e);
    alert('Failed to access webcam.');
  }
}
startCamera();

captureBtn.addEventListener('click', async ()=>{
  const takes = parseInt(gridSelect.value,10);
  const countdownVal = parseInt(countdownSelect.value,10);
  let photosData = []; // data URLs per take

  async function takeOne(){
    return new Promise(resolve=>{
      if(countdownVal>0){
        let t = countdownVal;
        countdownEl.textContent = t;
        const interval = setInterval(()=>{
          t--;
          countdownEl.textContent = t>0?t:'';
          if(t<=0){
            clearInterval(interval);
            countdownEl.textContent='';
            resolve(captureOnce());
          }
        },1000);
      } else {
        resolve(captureOnce());
      }
    });
  }

  async function captureOnce(){
    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(video,0,0,w,h);
    // return raw capture (without frame)
    return canvas.toDataURL('image/png');
  }

  for(let i=0;i<takes;i++){
    const photo = await takeOne();
    photosData.push(photo);
  }

  // Create vertical strip
  const w = video.videoWidth;
  const h = video.videoHeight;

  const stripV = document.createElement('canvas');
  stripV.width = w;
  stripV.height = h * photosData.length;
  const sctxV = stripV.getContext('2d');

  for(let i=0;i<photosData.length;i++){
    const img = await loadImage(photosData[i]);
    sctxV.drawImage(img,0,h*i,w,h);
    if(selectedFrame){
      try{
        const overlay = await loadImage(selectedFrame);
        sctxV.drawImage(overlay,0,h*i,w,h);
      }catch(e){console.warn('Frame per-photo failed',e);}
    }
  }

  // Create horizontal strip
  const stripH = document.createElement('canvas');
  stripH.width = w * photosData.length;
  stripH.height = h;
  const sctxH = stripH.getContext('2d');

  for(let i=0;i<photosData.length;i++){
    const img = await loadImage(photosData[i]);
    sctxH.drawImage(img,w*i,0,w,h);
    if(selectedFrame){
      try{
        const overlay = await loadImage(selectedFrame);
        sctxH.drawImage(overlay,w*i,0,w,h);
      }catch(e){console.warn('Frame per-photo failed',e);}
    }
  }

  const finalV = stripV.toDataURL('image/png');
  const finalH = stripH.toDataURL('image/png');

  latestFinal.vertical = finalV;
  latestFinal.horizontal = finalH;

  // Show preview (default vertical)
  showPreview(finalV);

  // Update download button appearance & action
  enableDownloadForCurrentLayout();
});

function showPreview(dataUrl){
  resultGrid.innerHTML = '';
  const imgEl = document.createElement('img');
  imgEl.src = dataUrl;
  imgEl.addEventListener('click',()=>{
    imgEl.classList.toggle('zoomed');
  });
  resultGrid.appendChild(imgEl);
  resultPreview.style.display = 'block';
  // make download button look like capture
  downloadBtn.disabled = false;
  downloadBtn.textContent = 'Download';
  applyCaptureStyleToDownload();
  // default layout select to vertical
  layoutSelect.value = 'vertical';
}

function applyCaptureStyleToDownload(){
  downloadBtn.style.background = getComputedStyle(captureBtn).background;
  downloadBtn.style.color = getComputedStyle(captureBtn).color;
  downloadBtn.style.border = 'none';
  downloadBtn.classList.remove('ghost');
  downloadBtn.onclick = ()=>{
    const layout = layoutSelect.value || 'vertical';
    const data = layout === 'vertical' ? latestFinal.vertical : latestFinal.horizontal;
    if(!data) return;
    const a = document.createElement('a');
    a.href = data;
    a.download = layout === 'vertical' ? 'photobooth_strip_vertical.png' : 'photobooth_strip_horizontal.png';
    document.body.appendChild(a); a.click(); a.remove();
  };
}

layoutSelect.addEventListener('change', ()=>{
  const layout = layoutSelect.value;
  const data = layout === 'vertical' ? latestFinal.vertical : latestFinal.horizontal;
  if(data){
    showPreviewWithoutChangingStyle(data);
    downloadBtn.onclick = ()=>{
      const a = document.createElement('a');
      a.href = data;
      a.download = layout === 'vertical' ? 'photobooth_strip_vertical.png' : 'photobooth_strip_horizontal.png';
      document.body.appendChild(a); a.click(); a.remove();
    };
  }
});

function showPreviewWithoutChangingStyle(dataUrl){
  resultGrid.innerHTML = '';
  const imgEl = document.createElement('img');
  imgEl.src = dataUrl;
  imgEl.addEventListener('click',()=>{
    imgEl.classList.toggle('zoomed');
  });
  resultGrid.appendChild(imgEl);
  resultPreview.style.display = 'block';
}

function loadImage(src){
  return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src;});
}

restartBtn.addEventListener('click', ()=>{
  canvas.style.display='none';
  video.style.display='block';
  framePreview.style.display = selectedFrame? 'block':'none';
  downloadBtn.disabled=true;
  downloadBtn.textContent='Download';
  downloadBtn.removeAttribute('style');
  downloadBtn.classList.add('ghost');
  resultPreview.style.display='none';
  latestFinal = { vertical: null, horizontal: null };
});

// Initialize frames UI
renderFrameList();
