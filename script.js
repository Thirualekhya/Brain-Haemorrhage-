const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const browseBtn = document.getElementById('browse-btn');
const viewerContainer = document.getElementById('viewer-container');
const canvas = document.getElementById('scan-canvas');
const ctx = canvas.getContext('2d');
const analyzeBtn = document.getElementById('analyze-btn');
const resetBtn = document.getElementById('reset-btn');
const laser = document.getElementById('laser');

const resultsPanel = document.getElementById('results-panel');
const resultStatus = document.getElementById('result-status');
const statusText = document.getElementById('status-text');
const metrics = document.getElementById('metrics');
const xaiPanel = document.getElementById('xai-panel');

let currentFile = null;
let currentImage = null;

// File Upload Handlers
browseBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => handleFile(e.target.files[0]));
dropZone.addEventListener('click', (e) => {
    if(e.target !== browseBtn) fileInput.click();
});

dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});

function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return alert('Please upload an image file.');
    currentFile = file;
    
    const reader = new FileReader();
    reader.onload = e => {
        currentImage = new Image();
        currentImage.onload = () => {
            dropZone.classList.add('hidden');
            viewerContainer.classList.remove('hidden');
            resultsPanel.classList.remove('hidden');
            
            // reset results state
            resultStatus.innerHTML = '<div class="icon-circle" style="background: rgba(255,255,255,0.05)"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>';
            statusText.innerText = 'Scan loaded. Systems ready for analysis.';
            metrics.classList.add('hidden');
            xaiPanel.classList.add('hidden');
            
            drawOriginalImage();
        };
        currentImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function drawOriginalImage() {
    // Keep canvas size relative to image but cap at a reasonable size to fit screen
    const maxDim = 800;
    let w = currentImage.width;
    let h = currentImage.height;
    if (w > maxDim || h > maxDim) {
        if (w > h) { h *= maxDim / w; w = maxDim; } 
        else { w *= maxDim / h; h = maxDim; }
    }
    
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw and convert to grayscale for clinical feel 
    ctx.drawImage(currentImage, 0, 0, w, h);
    try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        for(let i = 0; i < data.length; i += 4) {
            let avg = (data[i] + data[i+1] + data[i+2]) / 3;
            // slight boost to contrast
            avg = avg < 128 ? avg * 0.9 : avg * 1.1; 
            if(avg > 255) avg = 255;
            data[i] = data[i+1] = data[i+2] = avg;
        }
        ctx.putImageData(imgData, 0, 0);
    } catch(e) {
        // Can fail due to tainted canvas (CORS) if using external images, but local files are fine
        console.warn("Could not apply grayscale filter", e);
    }
}

resetBtn.addEventListener('click', () => {
    dropZone.classList.remove('hidden');
    viewerContainer.classList.add('hidden');
    resultsPanel.classList.add('hidden');
    currentFile = null;
    currentImage = null;
    fileInput.value = '';
});

// AI Analysis Simulation
analyzeBtn.addEventListener('click', async () => {
    if (!currentFile) return;
    
    // UI Loading state
    analyzeBtn.disabled = true;
    resetBtn.disabled = true;
    laser.classList.remove('hidden');
    
    resultStatus.innerHTML = '<div class="icon-circle loading"><span class="spinner"></span></div>';
    statusText.innerText = 'Extracting spatial features via 3D Convolutional Neural Network...';
    metrics.classList.add('hidden');
    xaiPanel.classList.add('hidden');
    
    // API Call
    const formData = new FormData();
    formData.append('file', currentFile);
    
    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        // Update UI with results
        laser.classList.add('hidden');
        analyzeBtn.disabled = false;
        resetBtn.disabled = false;
        
        resultStatus.innerHTML = data.detected 
            ? '<div class="icon-circle" style="background: rgba(239, 68, 68, 0.1); color: #ef4444;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>'
            : '<div class="icon-circle" style="background: rgba(16, 185, 129, 0.1); color: #10b981;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>';
            
        statusText.innerHTML = `<strong>Analysis Complete:</strong> ${data.message}`;
        
        document.getElementById('val-detection').innerText = data.detected ? 'Hemorrhage Present' : 'Normal';
        document.getElementById('val-volume').innerText = data.volume_ml.toFixed(2);
        document.getElementById('val-confidence').innerText = data.confidence.toFixed(1);
        
        const box = document.getElementById('detection-box');
        if (data.detected) {
            box.classList.add('alert-red');
            box.classList.remove('alert-green');
        } else {
            box.classList.remove('alert-red');
            box.classList.add('alert-green');
        }
        
        metrics.classList.remove('hidden');
        
        if (data.detected && data.heatmap) {
            drawHeatmap(data.heatmap);
            xaiPanel.classList.remove('hidden');
        }
        
    } catch (err) {
        console.error(err);
        statusText.innerText = 'Connection error processing image.';
        laser.classList.add('hidden');
        analyzeBtn.disabled = false;
        resetBtn.disabled = false;
        resultStatus.innerHTML = '<div class="icon-circle" style="background: rgba(239, 68, 68, 0.1); color: #ef4444;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>';
    }
});

function drawHeatmap(bbox) {
    drawOriginalImage(); // reset to grayscale
    
    const cw = canvas.width;
    const ch = canvas.height;
    
    const cx = bbox.x * cw;
    const cy = bbox.y * ch;
    // ensure relative width/height applies to canvas logic properly
    const rw = bbox.w * cw;
    const rh = bbox.h * ch;
    
    // Need a radius that covers the box
    const radius = Math.max(rw, rh) * 0.8; 
    
    // Draw semi-transparent gradient radial highlight (Grad-CAM effect)
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, 'rgba(239, 68, 68, 0.8)'); // Red hot core
    gradient.addColorStop(0.4, 'rgba(234, 179, 8, 0.6)'); // Yellow ring
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.globalCompositeOperation = 'screen'; // Lighter blend mode 
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over'; // Reset
}
