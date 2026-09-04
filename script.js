const canvas = document.getElementById('doodle');
const ctx = canvas.getContext('2d');
const clearBtn = document.getElementById('clear-btn');

ctx.lineWidth = 12;
ctx.lineCap = 'round';
ctx.strokeStyle = '#1a1a1a';

let drawing = false;

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const point = e.touches ? e.touches[0] : e;
  return {
    x: point.clientX - rect.left,
    y: point.clientY - rect.top
  };
}

function start(e) {
  drawing = true;
  const { x, y } = getPos(e);
  ctx.beginPath();
  ctx.moveTo(x, y);
  e.preventDefault();
}

function move(e) {
  if (!drawing) return;
  const { x, y } = getPos(e);
  ctx.lineTo(x, y);
  ctx.stroke();
  e.preventDefault();
}

function end() {
  drawing = false;
}

canvas.addEventListener('mousedown', start);
canvas.addEventListener('mousemove', move);
canvas.addEventListener('mouseup', end);
canvas.addEventListener('mouseleave', end);

canvas.addEventListener('touchstart', start);
canvas.addEventListener('touchmove', move);
canvas.addEventListener('touchend', end);

clearBtn.addEventListener('click', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

ctx.strokeStyle = '#1a1a1a';

const pickr = Pickr.create({
  el: '#color-wheel',
  theme: 'classic',
  default: '#1a1a1a',
  useAsButton: true,
  comparison: false,
  components: {
    preview: true,
    opacity: false,
    hue: true,
    interaction: {
      hex: true,
      input: true,
      save: true
    }
  }
});

pickr.on('change', (color) => {
  ctx.strokeStyle = color.toHEXA().toString();
});

pickr.on('save', () => {
  pickr.hide();
});

// Supabase anon key is designed to be public
const SUPABASE_URL = 'https://alazsuhyopftovdjxtce.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsYXpzdWh5b3BmdG92ZGp4dGNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMzcxMDAsImV4cCI6MjEwMzYxMzEwMH0.v0ylSj_E8X2OZLCnZ6fT9_3HauH4xE3CTZ5ZVNLrGCo';
const DOODLES_BUCKET = 'doodles';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const saveBtn = document.getElementById('save-btn');
const saveStatus = document.getElementById('save-status');
const galleryEl = document.getElementById('gallery');

saveBtn.addEventListener('click', () => {
  canvas.toBlob(async (blob) => {
    if (!blob) return;
    saveStatus.textContent = 'saving...';
    const filename = `doodle-${Date.now()}-${Math.floor(Math.random() * 10000)}.png`;
    const { error } = await sb.storage.from(DOODLES_BUCKET).upload(filename, blob, {
      contentType: 'image/png'
    });
    if (error) {
      saveStatus.textContent = 'save failed: ' + error.message;
      return;
    }
    saveStatus.textContent = 'Saved!';
    loadGallery();
  }, 'image/png');
});

async function loadGallery() {
  if (!galleryEl) return;
  const { data, error } = await sb.storage.from(DOODLES_BUCKET).list('', {
    limit: 100,
    sortBy: { column: 'created_at', order: 'desc' }
  });

  if (error) {
    galleryEl.innerHTML = '<p class="gallery-empty">couldn\'t load the gallery.</p>';
    return;
  }

  if (!data || data.length === 0) {
    galleryEl.innerHTML = '<p class="gallery-empty">no doodles yet. be the first!</p>';
    return;
  }

  const doodleFiles = data.filter((file) => file.name.endsWith('.png'));

  if (doodleFiles.length === 0) {
    galleryEl.innerHTML = '<p class="gallery-empty">no doodles yet. be the first!</p>';
    return;
  }

  galleryEl.innerHTML = '';
  doodleFiles.forEach((file) => {
    const { data: urlData } = sb.storage.from(DOODLES_BUCKET).getPublicUrl(file.name);
    const img = document.createElement('img');
    img.src = urlData.publicUrl;
    img.alt = 'a visitor doodle';
    img.loading = 'lazy';
    galleryEl.appendChild(img);
  });
}

loadGallery();
