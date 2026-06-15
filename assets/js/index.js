const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const imageInput = document.getElementById('imageInput');
const saveBtn = document.getElementById('saveBtn');
const headerSaveBtn = document.getElementById('headerSaveBtn');
const emptyState = document.getElementById('emptyState');
const templateGrid = document.getElementById('templateGrid');

// State
let userImage = null;
let overlayImage = null;

let photoState = {
  scale: 1,
  x: 0,
  y: 0
};

let overlayState = {
  scale: 1,
  x: 0,
  y: 0
};

// Canvas setup
const CANVAS_SIZE = 500;
canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;

// Load overlay templates from JSON
async function loadOverlayTemplates() {
  try {
    const response = await fetch('assets/overlays/overlays.json');
    const data = await response.json();
    const overlayTemplates = data.overlays || [];
    populateTemplateGrid(overlayTemplates);
  } catch (error) {
    console.error('Error loading overlays:', error);
    // If loading fails, continue with just the "None" option
  }
}

function populateTemplateGrid(overlayTemplates) {
  overlayTemplates.forEach((template, index) => {
    const btn = document.createElement('button');
    btn.className = 'template-btn';
    btn.dataset.template = template.source;
    btn.dataset.templateName = template.name;

    btn.innerHTML = `
            <span class="icon">
                <img src="${template.source}" alt="${template.name}" crossorigin="anonymous" />
            </span>
            <span class="template-name">${template.name}</span>
        `;

    btn.addEventListener('click', () => {
      document.querySelectorAll('.template-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadTemplate(template.source);
    });

    templateGrid.appendChild(btn);
  });
}

// Image upload
imageInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        userImage = img;
        emptyState.style.display = 'none';
        saveBtn.disabled = false;
        headerSaveBtn.disabled = false;
        render();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
});

// Template selection for "None" button
document.querySelector('[data-template="none"]').addEventListener('click', function () {
  document.querySelectorAll('.template-btn').forEach(b => b.classList.remove('active'));
  this.classList.add('active');
  loadTemplate('none');
});

// Sliders - for photo layer
const scaleSlider = document.getElementById('scaleSlider');
const xSlider = document.getElementById('xSlider');
const ySlider = document.getElementById('ySlider');
const scaleValue = document.getElementById('scaleValue');
const xValue = document.getElementById('xValue');
const yValue = document.getElementById('yValue');

// Sliders - for overlay
const overlay_scaleSlider = document.getElementById('overlay_scaleSlider');
const overlay_xSlider = document.getElementById('overlay_xSlider');
const overlay_ySlider = document.getElementById('overlay_ySlider');
const overlay_scaleValue = document.getElementById('overlay_scaleValue');
const overlay_xValue = document.getElementById('overlay_xValue');
const overlay_yValue = document.getElementById('overlay_yValue');

scaleSlider.addEventListener('input', (e) => {
  const scale = e.target.value / 100;
  photoState.scale = scale;
  scaleValue.textContent = e.target.value + '%';
  render();
});

xSlider.addEventListener('input', (e) => {
  photoState.x = parseInt(e.target.value);
  xValue.textContent = e.target.value;
  render();
});

ySlider.addEventListener('input', (e) => {
  photoState.y = parseInt(e.target.value);
  yValue.textContent = e.target.value;
  render();
});

overlay_scaleSlider.addEventListener('input', (e) => {
  const scale = e.target.value / 100;
  overlayState.scale = scale;
  overlay_scaleValue.textContent = e.target.value + '%';
  render();
});

overlay_xSlider.addEventListener('input', (e) => {
  overlayState.x = parseInt(e.target.value);
  overlay_xValue.textContent = e.target.value;
  render();
});

overlay_ySlider.addEventListener('input', (e) => {
  overlayState.y = parseInt(e.target.value);
  overlay_yValue.textContent = e.target.value;
  render();
});


function updateSliders() {
  // Round scale to nearest 5%
  const roundedScale = Math.round(photoState.scale * 20) * 5;
  scaleSlider.value = photoState.scale;
  scaleValue.textContent = photoState.scale + '%';

  const roundedOverlayScale = Math.round(overlayState.scale * 20) * 5;
  overlay_scaleSlider.value = overlayState.scale;
  overlay_scaleValue.textContent = overlayState.scale + '%';

  // Round x and y to nearest 10
  const roundedX = Math.round(photoState.x / 10) * 10;
  const roundedY = Math.round(photoState.y / 10) * 10;

  xSlider.value = roundedX;
  ySlider.value = roundedY;
  xValue.textContent = roundedX;
  yValue.textContent = roundedY;

  const roundedOverlayX = Math.round(overlayState.x / 10) * 10;
  const roundedOverlayY = Math.round(overlayState.y / 10) * 10;

  overlay_xSlider.value = roundedOverlayX;
  overlay_ySlider.value = roundedOverlayY;
  overlay_xValue.textContent = roundedOverlayX;
  overlay_yValue.textContent = roundedOverlayY;
}

// Touch/mouse dragging for photo
let isDragging = false;
let startX, startY;

// Pinch zoom variables
let isPinching = false;
let initialPinchDistance = 0;
let initialScale = 1;

canvas.addEventListener('mousedown', startDrag);
canvas.addEventListener('touchstart', handleTouchStart);
canvas.addEventListener('mousemove', drag);
canvas.addEventListener('touchmove', handleTouchMove);
canvas.addEventListener('mouseup', endDrag);
canvas.addEventListener('touchend', handleTouchEnd);
canvas.addEventListener('mouseleave', endDrag);

function handleTouchStart(e) {
  if (e.touches.length === 2) {
    // Pinch start
    isPinching = true;
    isDragging = false;
    initialPinchDistance = getPinchDistance(e.touches);
    initialScale = photoState.scale;
  } else if (e.touches.length === 1) {
    // Drag start
    startDrag(e);
  }
}

function handleTouchMove(e) {
  if (isPinching && e.touches.length === 2) {
    // Pinch zoom
    e.preventDefault();
    const currentDistance = getPinchDistance(e.touches);
    const scaleChange = currentDistance / initialPinchDistance;
    const newScale = Math.max(0.5, Math.min(2, initialScale * scaleChange));

    photoState.scale = newScale;
    updateSliders();
    render();
  } else if (isDragging && e.touches.length === 1) {
    // Drag
    drag(e);
  }
}

function handleTouchEnd(e) {
  if (e.touches.length < 2) {
    isPinching = false;
  }
  if (e.touches.length === 0) {
    endDrag();
  }
}

function getPinchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function startDrag(e) {
  if (!userImage || isPinching) return;
  isDragging = true;
  const pos = getEventPosition(e);
  startX = pos.x;
  startY = pos.y;
}

function drag(e) {
  if (!isDragging || isPinching) return;
  e.preventDefault();
  const pos = getEventPosition(e);
  const deltaX = pos.x - startX;
  const deltaY = pos.y - startY;

  photoState.x += deltaX;
  photoState.y += deltaY;

  startX = pos.x;
  startY = pos.y;

  updateSliders();
  render();
}

function endDrag() {
  isDragging = false;
}

function getEventPosition(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  let clientX, clientY;
  if (e.touches && e.touches[0]) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

// Template loading
function loadTemplate(source) {
  if (source === 'none') {
    overlayImage = null;
    render();
    return;
  }

  // Load external image
  overlayImage = new Image();
  overlayImage.crossOrigin = 'anonymous'; // Enable CORS if needed
  overlayImage.onload = () => render();
  overlayImage.onerror = () => {
    console.error('Error loading overlay image:', source);
    alert('Failed to load overlay template. Please check the image URL.');
  };
  overlayImage.src = source;
}

// Rendering
function render() {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  if (!userImage) return;

  // Draw user image
  ctx.save();
  ctx.translate(CANVAS_SIZE / 2, CANVAS_SIZE / 2);
  ctx.translate(photoState.x, photoState.y);
  ctx.scale(photoState.scale, photoState.scale);

  const imgAspect = userImage.width / userImage.height;
  const canvasAspect = 1;
  let drawWidth, drawHeight;

  if (imgAspect > canvasAspect) {
    drawHeight = CANVAS_SIZE;
    drawWidth = drawHeight * imgAspect;
  } else {
    drawWidth = CANVAS_SIZE;
    drawHeight = drawWidth / imgAspect;
  }

  ctx.drawImage(userImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  ctx.restore();

  // Draw overlay
  if (overlayImage && overlayImage.complete) {
    ctx.save();
    ctx.translate(CANVAS_SIZE / 2, CANVAS_SIZE / 2);
    ctx.translate(overlayState.x, overlayState.y);
    ctx.scale(overlayState.scale, overlayState.scale);

    // Scale overlay to fit canvas while maintaining aspect ratio
    const overlayAspect = overlayImage.width / overlayImage.height;
    let overlayWidth, overlayHeight;

    if (overlayAspect > 1) {
      overlayWidth = CANVAS_SIZE;
      overlayHeight = CANVAS_SIZE / overlayAspect;
    } else {
      overlayHeight = CANVAS_SIZE;
      overlayWidth = CANVAS_SIZE * overlayAspect;
    }

    ctx.drawImage(overlayImage, -overlayWidth / 2, -overlayHeight / 2, overlayWidth, overlayHeight);
    ctx.restore();
  }
}

// Save
saveBtn.addEventListener('click', saveImage);
headerSaveBtn.addEventListener('click', saveImage);

function saveImage() {
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'profile-picture.png';
    a.click();
    URL.revokeObjectURL(url);
  });
}

// Theme toggle functionality
const themeButtons = document.querySelectorAll('.theme-btn');
const htmlElement = document.documentElement;

// Load saved theme preference or default to system
const savedTheme = localStorage.getItem('theme') || 'system';
setTheme(savedTheme);

themeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const theme = btn.dataset.theme;
    setTheme(theme);
    localStorage.setItem('theme', theme);
  });
});

function setTheme(theme) {
  // Remove active class from all buttons
  themeButtons.forEach(btn => btn.classList.remove('active'));

  // Add active class to selected button
  const activeBtn = document.querySelector(`[data-theme="${theme}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }

  // Apply theme
  if (theme === 'system') {
    htmlElement.removeAttribute('data-theme');
  } else {
    htmlElement.setAttribute('data-theme', theme);
  }
}

// Initialize
loadOverlayTemplates();
