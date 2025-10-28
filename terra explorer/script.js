/* ===========================
   STARFIELD BACKGROUND
=========================== */
const canvas = document.getElementById('starfield');
const ctx = canvas.getContext('2d');
let w, h, stars = [], shootingStars = [];

function resizeCanvas() {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
  initStars();
}
window.addEventListener('resize', resizeCanvas);

function initStars() {
  stars = [];
  const count = Math.max(200, Math.floor((w*h)/5000));
  for(let i=0; i<count; i++){
    stars.push({
      x: Math.random()*w,
      y: Math.random()*h,
      r: Math.random()*1.2,
      alpha: 0.1 + Math.random()*0.9,
      twinkle: Math.random()*0.02 + 0.005
    });
  }
}

function spawnShootingStar() {
  shootingStars.push({
    x: Math.random()*w*0.8,
    y: Math.random()*h*0.6,
    len: 80 + Math.random()*220,
    speed: 6 + Math.random()*12,
    life: 0
  });
  setTimeout(spawnShootingStar, 1200 + Math.random()*5000);
}

function drawStars() {
  ctx.clearRect(0,0,w,h);

  // subtle nebula gradient
  const g = ctx.createRadialGradient(w*0.6,h*0.25,0,w*0.6,h*0.25,Math.max(w,h));
  g.addColorStop(0,'rgba(20,30,50,0.12)');
  g.addColorStop(0.4,'rgba(10,12,18,0.3)');
  g.addColorStop(1,'rgba(0,0,0,1)');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,w,h);

  // draw stars
  stars.forEach(s => {
    s.alpha += (Math.random()>0.996 ? (Math.random()*0.6-0.3) : 0);
    s.alpha = Math.max(0.05, Math.min(1, s.alpha));
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
    ctx.fill();
  });

  // draw shooting stars
  for(let i=shootingStars.length-1; i>=0; i--){
    const st = shootingStars[i];
    st.life += st.speed;
    ctx.globalAlpha = Math.max(0,1 - st.life/(st.len*1.2));
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(st.x, st.y);
    ctx.lineTo(st.x + st.len * Math.cos(-0.4), st.y + st.len * Math.sin(-0.4));
    ctx.stroke();
    st.x += st.speed*2;
    st.y += st.speed*1.1;
    if(st.x > w+200 || st.y > h+200 || st.life > st.len*1.5) shootingStars.splice(i,1);
  }

  requestAnimationFrame(drawStars);
}

resizeCanvas();
spawnShootingStar();
drawStars();

/* ===========================
   GLOBE INTERACTIF
=========================== */
(async function(){
  const container = document.getElementById('globeViz');

  const GlobeInstance = Globe()(container)
    .width(window.innerWidth)
    .height(window.innerHeight)
    .globeImageUrl('https://threejsfundamentals.org/threejs/resources/images/earth-day.jpg')
    .bumpImageUrl('https://threejsfundamentals.org/threejs/resources/images/earth-bump.jpg')
    .showAtmosphere(true)
    .atmosphereColor('#8fbfff')
    .atmosphereAltitude(0.12)
    .backgroundColor('rgba(0,0,0,0)')
    .autoRotate(true)
    .autoRotateSpeed(0.25)
    .polygonsTransitionDuration(300);

  window.addEventListener('resize', () => {
    GlobeInstance.width(window.innerWidth);
    GlobeInstance.height(window.innerHeight);
  });

  // Charger GeoJSON de tous les pays
  const countriesGeoJsonUrl = 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';
  let geoData;
  try {
    const res = await fetch(countriesGeoJsonUrl);
    geoData = await res.json();
  } catch(e){
    console.error('Erreur chargement GeoJSON:', e);
    alert('Erreur chargement GeoJSON');
    return;
  }

  GlobeInstance.polygonsData(geoData.features)
    .polygonCapColor(() => 'rgba(60,140,255,0.08)')
    .polygonSideColor(() => 'rgba(0,0,0,0)')
    .polygonStrokeColor(() => 'rgba(80,110,140,0.15)')
    .polygonAltitude(() => 0.002)
    .polygonLabel(({properties}) => `<div style="font-family:Inter,Arial,sans-serif;padding:6px 8px;color:#eaf7ff;">
      <strong>${properties.ADMIN || properties.NAME}</strong>
    </div>`);

  let hovered = null;
  GlobeInstance.onPolygonHover(f => {
    if(hovered && hovered !== f){
      hovered.__alt = undefined;
    }
    hovered = f;
    if(hovered) hovered.__alt = 0.01;
  });

  GlobeInstance.onPolygonClick(f => {
    if(!f || !f.properties) return;
    const props = f.properties;
    const name = props.ADMIN || props.NAME || 'Inconnu';
    const isoCode = props.ISO_A2 || props.iso_a2 || props.ISO_A3 || '';
    showCountryInfo({
      name,
      code: isoCode,
      capital: props.capital || '—',
      timezone: props.timezone || null
    });
  });

  GlobeInstance.onGlobeReady(() => {
    try {
      const scene = GlobeInstance.scene();
      const D = new THREE.DirectionalLight(0xffffff,0.7);
      D.position.set(5,2,5);
      scene.add(D);
      const amb = new THREE.AmbientLight(0x404050,0.6);
      scene.add(amb);
    } catch(e){}
  });
})();

/* ===========================
   PANEL D'INFORMATIONS
=========================== */
(function setupInfoPanel(){
  const panel = document.getElementById('infoPanel');
  const titleEl = document.getElementById('infoTitle');
  const capEl = document.getElementById('infoCapital');
  const timeEl = document.getElementById('infoTime');
  const weatherEl = document.getElementById('infoWeather');
  const codeEl = document.getElementById('infoCode');
  const closeBtn = document.getElementById('closeInfo');

  closeBtn.addEventListener('click', ()=>panel.classList.add('hidden'));

  window.showCountryInfo = async function({name, code, capital='—', timezone=null}={}){
    titleEl.textContent = name;
    capEl.textContent = capital;
    codeEl.textContent = code || '—';
    timeEl.textContent = timezone ? localTimeForTimezone(timezone) : 'Timezone non dispo';
    weatherEl.textContent = 'API météo à intégrer';
    panel.classList.remove('hidden');
    panel.style.transform = 'translateX(0)';
  };

  function localTimeForTimezone(tz){
    try{
      const now = new Date();
      return now.toLocaleString('fr-FR',{timeZone:tz, hour:'2-digit', minute:'2-digit', second:'2-digit', day:'2-digit', month:'2-digit', year:'numeric'});
    } catch(e){
      return 'TZ invalide';
    }
  }

})();
