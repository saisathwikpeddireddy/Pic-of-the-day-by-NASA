
let NASA_API_KEY = '';

function promptForApiKey() {
  NASA_API_KEY = prompt('Please enter your NASA API Key:');
  if (!NASA_API_KEY) {
    alert('API Key is required to fetch data. Please reload the page and provide a valid key. Optionally, You can also refer to the README for the APIKey.');
    throw new Error('API Key not provided');
  }
}

promptForApiKey();
const NASA_API_BASE_URL = 'https://api.nasa.gov/planetary/apod';
const FIRST_APOD_DATE = '1995-06-16';
const CACHE_DURATION = 5 * 60 * 1000; 

const apiCache = new Map();

const currentDateEl = document.getElementById('current-date');
const datePicker = document.getElementById('date-picker');
const prevDateBtn = document.getElementById('prev-date');
const nextDateBtn = document.getElementById('next-date');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const errorMessageEl = document.getElementById('error-message');
const retryButton = document.getElementById('retry-button');
const contentEl = document.getElementById('content');

const mediaLoadingEl = document.getElementById('media-loading');
const apodImageEl = document.getElementById('apod-image');
const apodVideoEl = document.getElementById('apod-video');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const apodTitleEl = document.getElementById('apod-title');
const apodCopyrightEl = document.getElementById('apod-copyright');
const displayDateEl = document.getElementById('display-date');
const apodExplanationEl = document.getElementById('apod-explanation');
const mediaTypeEl = document.getElementById('media-type');
const serviceVersionEl = document.getElementById('service-version');
const hdLinkContainerEl = document.getElementById('hd-link-container');
const hdLinkEl = document.getElementById('hd-link');
const shareButton = document.getElementById('share-button');

const recentGridEl = document.getElementById('recent-grid');
const archiveButton = document.getElementById('archive-button');

const imageModal = document.getElementById('image-modal');
const modalImage = document.getElementById('modal-image');
const modalTitle = document.getElementById('modal-title');
const modalDate = document.getElementById('modal-date');
const modalCopyrightContainer = document.getElementById('modal-copyright-container');
const modalCopyright = document.getElementById('modal-copyright');
const modalExplanation = document.getElementById('modal-explanation');
const modalLoading = document.getElementById('modal-loading');
const closeModal = document.getElementById('close-modal');
const zoomToggle = document.getElementById('zoom-toggle');
const zoomInIcon = document.getElementById('zoom-in-icon');
const zoomOutIcon = document.getElementById('zoom-out-icon');
const zoomText = document.getElementById('zoom-text');
const downloadButton = document.getElementById('download-button');

const toast = document.getElementById('toast');
const toastTitle = document.getElementById('toast-title');
const toastMessage = document.getElementById('toast-message');
const toastSuccessIcon = document.getElementById('toast-success-icon');
const toastErrorIcon = document.getElementById('toast-error-icon');

let currentDate = new Date().toISOString().split('T')[0];
let currentApodData = null;
let isZoomed = false;
let toastTimeout = null;

function init() {
  datePicker.min = FIRST_APOD_DATE;
  datePicker.max = new Date().toISOString().split('T')[0];
  
  const urlParams = new URLSearchParams(window.location.search);
  const dateParam = urlParams.get('date');
  
  if (dateParam && isValidDate(dateParam)) {
    currentDate = dateParam;
  }
  
  datePicker.value = currentDate;
  updateDateDisplay();
  
  datePicker.addEventListener('change', handleDateChange);
  prevDateBtn.addEventListener('click', goToPreviousDay);
  nextDateBtn.addEventListener('click', goToNextDay);
  retryButton.addEventListener('click', () => fetchApodData(currentDate));
  fullscreenBtn.addEventListener('click', openModal);
  shareButton.addEventListener('click', handleShare);
  
  closeModal.addEventListener('click', closeImageModal);
  zoomToggle.addEventListener('click', toggleZoom);
  downloadButton.addEventListener('click', downloadImage);
  
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && imageModal.style.display !== 'none') {
      closeImageModal();
    }
  });
  
  archiveButton.addEventListener('click', () => {
    showToast('Coming Soon', 'Archive viewing will be available in a future update.', 'info');
  });
  
  fetchApodData(currentDate);
  fetchRecentPictures();
}

function isValidDate(dateString) {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

function formatDisplayDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function updateDateDisplay() {
  const formattedDate = formatDisplayDate(currentDate);
  currentDateEl.textContent = formattedDate;
  displayDateEl.textContent = formattedDate;
  
  const today = new Date().toISOString().split('T')[0];
  const isToday = currentDate === today;
  const isFirstDay = currentDate === FIRST_APOD_DATE;
  
  nextDateBtn.disabled = isToday;
  prevDateBtn.disabled = isFirstDay;
  
  const newUrl = currentDate === today
    ? window.location.pathname
    : `${window.location.pathname}?date=${currentDate}`;
  
  window.history.replaceState(null, '', newUrl);
}

function handleDateChange(e) {
  const newDate = e.target.value;
  
  if (isValidDate(newDate)) {
    currentDate = newDate;
    updateDateDisplay();
    fetchApodData(currentDate);
  }
}

function goToPreviousDay() {
  const date = new Date(currentDate);
  date.setDate(date.getDate() - 1);
  
  const firstApodDate = new Date(FIRST_APOD_DATE);
  if (date >= firstApodDate) {
    currentDate = date.toISOString().split('T')[0];
    datePicker.value = currentDate;
    updateDateDisplay();
    fetchApodData(currentDate);
  }
}

function goToNextDay() {
  const date = new Date(currentDate);
  date.setDate(date.getDate() + 1);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (date <= today) {
    currentDate = date.toISOString().split('T')[0];
    datePicker.value = currentDate;
    updateDateDisplay();
    fetchApodData(currentDate);
  }
}

function handleShare() {
  const shareUrl = window.location.href;
  
  if (navigator.clipboard) {
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        showToast('Link Copied', 'URL has been copied to your clipboard');
      })
      .catch(err => {
        console.error('Failed to copy link: ', err);
        showToast('Copy Failed', 'Could not copy URL to clipboard', 'error');
      });
  } else {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      textarea.style.position = 'fixed';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      
      if (successful) {
        showToast('Link Copied', 'URL has been copied to your clipboard');
      } else {
        showToast('Copy Failed', 'Could not copy URL to clipboard', 'error');
      }
    } catch (err) {
      console.error('Failed to copy link: ', err);
      showToast('Copy Failed', 'Could not copy URL to clipboard', 'error');
    }
  }
}

async function fetchApodData(date) {
  showLoading();
  
  const cacheKey = `apod-${date}`;
  const cached = apiCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
    console.log(`Using cached APOD data for ${date}`);
    processApodData(cached.data);
    return;
  }
  
  try {
    console.log(`Fetching APOD data for ${date}...`);
    const response = await fetch(`${NASA_API_BASE_URL}?api_key=${NASA_API_KEY}&date=${date}`);
    
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.status}`);
    }
    
    const data = await response.json();
    
    apiCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    processApodData(data);
  } catch (error) {
    console.error('Error fetching APOD data:', error);
    showError(error.message);
  }
}

async function fetchRecentPictures() {
  try {
    const today = new Date();
    const recentDates = [];
    const recentPictures = [];
    
    for (let i = 1; i <= 4; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      recentDates.push(date.toISOString().split('T')[0]);
    }
    
    for (const date of recentDates) {
      const cacheKey = `apod-${date}`;
      const cached = apiCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        recentPictures.push({
          date: cached.data.date,
          title: cached.data.title,
          url: cached.data.url
        });
        continue;
      }
      
      try {
        const response = await fetch(`${NASA_API_BASE_URL}?api_key=${NASA_API_KEY}&date=${date}`);
        
        if (!response.ok) continue;
        
        const data = await response.json();
        
        apiCache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
        
        recentPictures.push({
          date: data.date,
          title: data.title,
          url: data.url
        });
      } catch (error) {
        console.error(`Error fetching data for ${date}:`, error);
      }
    }
    
    renderRecentPictures(recentPictures);
  } catch (error) {
    console.error('Error fetching recent pictures:', error);
    recentGridEl.innerHTML = '<p class="text-dim">Could not load recent pictures. Please try again later.</p>';
  }
}

function showLoading() {
  loadingEl.style.display = 'flex';
  contentEl.style.display = 'none';
  errorEl.style.display = 'none';
}

function showError(message) {
  loadingEl.style.display = 'none';
  contentEl.style.display = 'none';
  errorEl.style.display = 'flex';
  errorMessageEl.textContent = message || 'An error occurred while fetching data. Please try again.';
}

function showContent() {
  loadingEl.style.display = 'none';
  contentEl.style.display = 'flex';
  errorEl.style.display = 'none';
}

function processApodData(data) {
  currentApodData = data;
  
  apodTitleEl.textContent = data.title;
  apodCopyrightEl.textContent = data.copyright ? `© ${data.copyright}` : '';
  apodExplanationEl.textContent = data.explanation;
  mediaTypeEl.textContent = capitalizeFirstLetter(data.media_type);
  serviceVersionEl.textContent = data.service_version;
  
  if (data.hdurl) {
    hdLinkContainerEl.style.display = 'block';
    hdLinkEl.href = data.hdurl;
  } else {
    hdLinkContainerEl.style.display = 'none';
  }
  
  if (data.media_type === 'image') {
    mediaLoadingEl.style.display = 'flex';
    apodImageEl.style.display = 'block';
    apodVideoEl.style.display = 'none';
    fullscreenBtn.style.display = 'flex';
    
    apodImageEl.onload = () => {
      mediaLoadingEl.style.display = 'none';
    };
    apodImageEl.onerror = () => {
      mediaLoadingEl.style.display = 'none';
      showToast('Image Error', 'Could not load the image', 'error');
    };
    apodImageEl.src = data.url;
  } else if (data.media_type === 'video') {
   
    mediaLoadingEl.style.display = 'flex';
    apodImageEl.style.display = 'none';
    apodVideoEl.style.display = 'block';
    fullscreenBtn.style.display = 'none';
    
    
    apodVideoEl.onload = () => {
      mediaLoadingEl.style.display = 'none';
    };
    apodVideoEl.src = data.url;
  }
  
  showContent();
}

function renderRecentPictures(pictures) {
  if (!pictures || pictures.length === 0) {
    recentGridEl.innerHTML = '<p class="text-dim">No recent pictures available.</p>';
    return;
  }
  
  
  recentGridEl.innerHTML = '';
  
  pictures.forEach(picture => {
    const item = document.createElement('div');
    item.className = 'recent-item';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', `View ${picture.title} from ${formatDisplayDate(picture.date)}`);
    
    item.innerHTML = `
      <div class="recent-image-container">
        <img src="${picture.url}" alt="${picture.title}" class="recent-image" loading="lazy">
        <div class="recent-overlay"></div>
      </div>
      <div class="recent-info">
        <h3 class="recent-item-title">${picture.title}</h3>
        <div class="recent-date">
          <svg xmlns="http://www.w3.org/2000/svg" class="clock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span>${formatDisplayDate(picture.date)}</span>
        </div>
      </div>
    `;
    
    item.addEventListener('click', () => {
      currentDate = picture.date;
      datePicker.value = currentDate;
      updateDateDisplay();
      fetchApodData(currentDate);
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        item.click();
      }
    });
    
    recentGridEl.appendChild(item);
  });
}

function openModal() {
  if (currentApodData && currentApodData.media_type === 'image') {
    isZoomed = false;
    zoomInIcon.style.display = 'block';
    zoomOutIcon.style.display = 'none';
    zoomText.textContent = 'HD View';
    
    modalTitle.textContent = currentApodData.title;
    modalDate.textContent = formatDisplayDate(currentApodData.date);
    
    if (currentApodData.copyright) {
      modalCopyrightContainer.style.display = 'flex';
      modalCopyright.textContent = `© ${currentApodData.copyright}`;
    } else {
      modalCopyrightContainer.style.display = 'none';
    }
    
    modalExplanation.textContent = currentApodData.explanation;
    
    modalLoading.style.display = 'flex';
    
    modalImage.onload = () => {
      modalLoading.style.display = 'none';
    };
    modalImage.onerror = () => {
      modalLoading.style.display = 'none';
      showToast('Image Error', 'Could not load the full size image', 'error');
      closeImageModal();
    };
    modalImage.src = currentApodData.url;
    
    imageModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

function closeImageModal() {
  imageModal.style.display = 'none';
  document.body.style.overflow = 'auto';
}

function toggleZoom() {
  isZoomed = !isZoomed;
  
  if (isZoomed && currentApodData.hdurl) {
    zoomInIcon.style.display = 'none';
    zoomOutIcon.style.display = 'block';
    zoomText.textContent = 'Standard';
    
    modalLoading.style.display = 'flex';
    
    modalImage.src = currentApodData.hdurl;
  } else {
    zoomInIcon.style.display = 'block';
    zoomOutIcon.style.display = 'none';
    zoomText.textContent = 'HD View';
    
    if (modalImage.src !== currentApodData.url) {
      modalLoading.style.display = 'flex';
      modalImage.src = currentApodData.url;
    }
  }
}

function downloadImage() {
  if (currentApodData) {
    const url = isZoomed && currentApodData.hdurl ? currentApodData.hdurl : currentApodData.url;
    const filename = `NASA_APOD_${currentApodData.date}.jpg`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    showToast('Download Started', 'Image download has been initiated');
  }
}

function showToast(title, message, type = 'success') {
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }
  
  toastTitle.textContent = title;
  toastMessage.textContent = message;
  
  if (type === 'success' || type === 'info') {
    toastSuccessIcon.style.display = 'block';
    toastErrorIcon.style.display = 'none';
  } else if (type === 'error') {
    toastSuccessIcon.style.display = 'none';
    toastErrorIcon.style.display = 'block';
  }
  
  toast.style.display = 'block';
  
  toastTimeout = setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

document.addEventListener('DOMContentLoaded', init);