// Photobooth app (app.js)
// Fixed for deployment on GitHub Pages and Netlify

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
let latestFinal = { vertical: null, horizontal: null };
let mediaStream = null;

// Create error display element
function createErrorDisplay(message) {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(220, 38, 127, 0.9);
    color: white;
    padding: 20px;
    border-radius: 10px;
    text-align: center;
    max-width: 300px;
    font-size: 14px;
    line-height: 1.4;
    z-index: 1000;
  `;
  errorDiv.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 10px;">Camera Access Error</div>
    <div style="margin-bottom: 15px;">${message}</div>
    <button onclick="this.parentElement.remove(); startCamera();" 
            style="background: white; color: #dc267f; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer; font-weight: bold;">
      Try Again
    </button>
  `;
  return errorDiv;
}

function renderFrameList(){
  const framesList = document.getElementById('framesList');
  const framesListDesktop = document.getElementById('framesList-desktop');
  
  // Clear both lists
  if (framesList) framesList.innerHTML = '';
  if (framesListDesktop) framesListDesktop.innerHTML = '';
  
  availableFrames.forEach((f, idx)=>{
    // Create elements for both mobile and desktop
    const createFrameOption = () => {
      const el = document.createElement('div');
      el.className = 'frame-option' + (idx === 0 ? ' selected' : '');
      el.dataset.file = f.file;
      el.innerHTML = `<img src="${f.file}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'240\\' height=\\'160\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'%23333\\'/><text x=\\'50%\\' y=\\'50%\\' fill=\\'%23fff\\' font-size=\\'14\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\'>${encodeURIComponent(f.name)}</text></svg>'"/><span>${f.name}</span>`;
      
      el.addEventListener('click', ()=>{
        // Update both desktop and mobile selections
        document.querySelectorAll('.frame-option').forEach(x=>x.classList.remove('selected'));
        document.querySelectorAll(`[data-file="${f.file}"]`).forEach(x=>x.classList.add('selected'));
        
        selectedFrame = f.file || '';
        if(selectedFrame){
          framePreview.src = selectedFrame;
          framePreview.style.display='block';
        } else {
          framePreview.src = '';
          framePreview.style.display='none';
        }
      });
      
      return el;
    };
    
    // Add to mobile list
    if (framesList) {
      framesList.appendChild(createFrameOption());
    }
    
    // Add to desktop list  
    if (framesListDesktop) {
      framesListDesktop.appendChild(createFrameOption());
    }
  });
}

async function startCamera(){
  // Clear any existing error messages
  document.querySelectorAll('.preview > div[style*="position: absolute"][style*="z-index: 1000"]').forEach(el => el.remove());
  
  // Check if we're on a secure context (HTTPS or localhost)
  if (!window.isSecureContext && location.protocol !== 'https:' && !location.hostname.includes('localhost') && location.hostname !== '127.0.0.1') {
    const errorMsg = 'Camera access requires HTTPS. Please ensure your site is served over HTTPS.';
    document.getElementById('preview').appendChild(createErrorDisplay(errorMsg));
    console.error('Insecure context - camera access blocked');
    return;
  }

  // Check if getUserMedia is supported
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    const errorMsg = 'Your browser doesn\'t support camera access. Please use a modern browser like Chrome, Firefox, or Safari.';
    document.getElementById('preview').appendChild(createErrorDisplay(errorMsg));
    console.error('getUserMedia not supported');
    return;
  }

  try {
    // Stop any existing stream first
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }

    // Enhanced camera constraints for better mobile experience
    const isMobile = window.innerWidth <= 768;
    const constraints = [
      // Mobile-optimized constraints
      ...(isMobile ? [
        { video: { width: { ideal: 720, max: 1280 }, height: { ideal: 720, max: 1280 }, facingMode: 'user' } },
        { video: { width: { ideal: 640, max: 1024 }, height: { ideal: 480, max: 768 }, facingMode: 'user' } },
      ] : []),
      // Desktop constraints
      { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } },
      { video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } },
      // Basic fallbacks
      { video: { facingMode: 'user' } },
      { video: true }
    ];

    let stream = null;
    let lastError = null;

    for (const constraint of constraints) {
      try {
        console.log('Trying camera constraint:', constraint);
        stream = await navigator.mediaDevices.getUserMedia(constraint);
        break;
      } catch (err) {
        console.warn('Camera constraint failed:', constraint, err);
        lastError = err;
        continue;
      }
    }

    if (!stream) {
      throw lastError || new Error('All camera constraints failed');
    }

    mediaStream = stream;
    video.srcObject = stream;
    
    // Wait for video to be ready
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = () => {
        // Adjust video display for mobile to match result better
        if (isMobile) {
          const videoAspectRatio = video.videoWidth / video.videoHeight;
          const containerAspectRatio = video.clientWidth / video.clientHeight;
          
          if (Math.abs(videoAspectRatio - containerAspectRatio) > 0.1) {
            video.style.objectFit = 'cover';
          }
        }
        resolve();
      };
      video.onerror = reject;
      
      // Timeout after 10 seconds
      setTimeout(() => reject(new Error('Video load timeout')), 10000);
    });

    await video.play();
    
    // Enable capture button
    captureBtn.disabled = false;
    captureBtn.textContent = 'Capture';
    
    console.log('Camera started successfully');

  } catch (error) {
    console.error('Camera access failed:', error);
    
    let errorMessage = 'Failed to access camera. ';
    
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      errorMessage += 'Please allow camera access and refresh the page.';
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      errorMessage += 'No camera found. Please connect a camera and try again.';
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      errorMessage += 'Camera is busy or unavailable. Please close other apps using the camera and try again.';
    } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
      errorMessage += 'Camera doesn\'t meet requirements. Trying with basic settings...';
      
      // Try one more time with minimal constraints
      try {
        if (mediaStream) {
          mediaStream.getTracks().forEach(track => track.stop());
        }
        
        const basicStream = await navigator.mediaDevices.getUserMedia({ video: true });
        mediaStream = basicStream;
        video.srcObject = basicStream;
        await video.play();
        captureBtn.disabled = false;
        return;
      } catch (basicError) {
        errorMessage = 'Camera access failed completely. Please check your camera settings and permissions.';
      }
    } else {
      errorMessage += `Error: ${error.message || 'Unknown error'}`;
    }
    
    document.getElementById('preview').appendChild(createErrorDisplay(errorMessage));
    captureBtn.disabled = true;
    captureBtn.textContent = 'Camera Error';
  }
}

captureBtn.addEventListener('click', async ()=>{
  if (!mediaStream || !video.videoWidth) {
    alert('Camera not ready. Please wait for camera to load or try refreshing the page.');
    return;
  }
  
  const takes = parseInt(gridSelect.value,10);
  const countdownVal = parseInt(countdownSelect.value,10);
  let photosData = [];

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
    return canvas.toDataURL('image/png');
  }

  try {
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

    showPreview(finalV);
    enableDownloadForCurrentLayout();
    
  } catch (error) {
    console.error('Photo capture failed:', error);
    alert('Failed to capture photos. Please try again.');
  }
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
  downloadBtn.disabled = false;
  downloadBtn.textContent = 'Download';
  applyCaptureStyleToDownload();
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
    
    // Auto return to initial state after download
    setTimeout(() => {
      resetToInitialState();
    }, 500); // Small delay to ensure download starts
  };
}

function enableDownloadForCurrentLayout() {
  applyCaptureStyleToDownload();
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
      
      // Auto return to initial state after download
      setTimeout(() => {
        resetToInitialState();
      }, 500);
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

// Function to reset to initial state (replaces restart button functionality)
function resetToInitialState() {
  // Hide result preview
  resultPreview.style.display = 'none';
  
  // Reset canvas and video display
  canvas.style.display = 'none';
  video.style.display = 'block';
  
  // Reset frame preview
  framePreview.style.display = selectedFrame ? 'block' : 'none';
  
  // Reset download button to disabled state
  downloadBtn.disabled = true;
  downloadBtn.textContent = 'Download';
  downloadBtn.removeAttribute('style');
  downloadBtn.classList.add('ghost');
  
  // Clear latest final images
  latestFinal = { vertical: null, horizontal: null };
  
  // Clear any error messages
  document.querySelectorAll('.preview > div[style*="position: absolute"][style*="z-index: 1000"]').forEach(el => el.remove());
  
  // Reset layout selector to default
  layoutSelect.value = 'vertical';
  
  // Reset countdown if any
  countdownEl.textContent = '';
}

// Handle page visibility changes to restart camera if needed
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && (!mediaStream || !mediaStream.active)) {
    console.log('Page became visible, checking camera...');
    startCamera();
  }
});

// Handle beforeunload to clean up camera stream
window.addEventListener('beforeunload', () => {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
  }
});

// Initialize
renderFrameList();
startCamera();