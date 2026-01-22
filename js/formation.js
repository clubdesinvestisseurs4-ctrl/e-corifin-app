/**
 * E-Coris - Module Formation
 */

// État local
let chapters = [];
let currentChapter = null;
let currentLessons = [];
let currentLesson = null;
let currentLessonIndex = 0;
let hasFormationAccess = false;

/**
 * Vérifier l'accès à la formation
 */
async function checkFormationAccess() {
    try {
        const data = await API.getFormationStatus();
        hasFormationAccess = data.hasAccess || false;
        updateFormationUI();
        return hasFormationAccess;
    } catch (error) {
        console.error('Erreur vérification accès:', error);
        hasFormationAccess = false;
        updateFormationUI();
        return false;
    }
}

/**
 * Mettre à jour l'interface selon l'accès
 */
function updateFormationUI() {
    const lockedEl = document.getElementById('formation-locked');
    const unlockedEl = document.getElementById('formation-unlocked');
    const lockIcon = document.getElementById('formation-lock');
    
    if (hasFormationAccess) {
        if (lockedEl) lockedEl.classList.add('hidden');
        if (unlockedEl) unlockedEl.classList.remove('hidden');
        if (lockIcon) lockIcon.style.display = 'none';
        loadChapters();
    } else {
        if (lockedEl) lockedEl.classList.remove('hidden');
        if (unlockedEl) unlockedEl.classList.add('hidden');
        if (lockIcon) lockIcon.style.display = 'inline';
    }
}

/**
 * Afficher le modal d'activation
 */
function showActivateCode() {
    document.getElementById('activate-code').value = '';
    openModal('activate-modal');
}

/**
 * Activer la formation avec un code
 */
async function activateFormation(event) {
    event.preventDefault();
    
    const code = document.getElementById('activate-code').value.trim();
    
    if (!code) {
        showToast('Veuillez entrer un code', 'error');
        return false;
    }
    
    try {
        await API.activateCode(code);
        hasFormationAccess = true;
        showToast('Formation activée !', 'success');
        closeModal();
        updateFormationUI();
    } catch (error) {
        showToast(error.message || 'Code invalide', 'error');
    }
    
    return false;
}

/**
 * Ouvrir la page d'achat
 */
function openPurchasePage() {
    showToast('Page d\'achat bientôt disponible', 'info');
}

/**
 * Charger les chapitres
 */
async function loadChapters() {
    if (!hasFormationAccess) return;
    
    try {
        const [chaptersData, progressData] = await Promise.all([
            API.getChapters(),
            API.getFormationProgress()
        ]);
        
        chapters = chaptersData.chapters || [];
        renderChapters(progressData);
        updateProgressRing(progressData);
        
    } catch (error) {
        console.error('Erreur chargement chapitres:', error);
    }
}

/**
 * Afficher les chapitres
 */
function renderChapters(progress) {
    const container = document.getElementById('chapters-list');
    if (!container) return;
    
    if (chapters.length === 0) {
        container.innerHTML = '<p class="empty-list">Aucun chapitre disponible</p>';
        return;
    }
    
    container.innerHTML = chapters.map((chapter, index) => {
        const chapterProgress = chapter.progress || { completed: 0, total: 0 };
        const percentage = chapterProgress.total > 0 
            ? Math.round((chapterProgress.completed / chapterProgress.total) * 100) 
            : 0;
        
        return `
            <div class="chapter-card" onclick="openChapter('${chapter.id}')">
                <div class="chapter-number">${index + 1}</div>
                <div class="chapter-info">
                    <h3 class="chapter-title">${chapter.title}</h3>
                    <p class="chapter-desc">${chapter.description || ''}</p>
                    <div class="chapter-meta">
                        <span class="lessons-count">${chapterProgress.total || 0} leçons</span>
                        <span class="chapter-progress">${percentage}% complété</span>
                    </div>
                </div>
                <div class="chapter-status">
                    ${percentage === 100 ? '✅' : percentage > 0 ? '🔄' : '⭕'}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Mettre à jour l'anneau de progression
 */
function updateProgressRing(progress) {
    const circle = document.getElementById('progress-circle');
    const text = document.getElementById('progress-text');
    const completed = document.getElementById('completed-lessons');
    const total = document.getElementById('total-lessons');
    
    const percentage = progress.percentage || 0;
    
    if (circle) {
        const offset = 283 - (283 * percentage / 100);
        circle.style.strokeDashoffset = offset;
    }
    
    if (text) text.textContent = Math.round(percentage) + '%';
    if (completed) completed.textContent = progress.completed || 0;
    if (total) total.textContent = progress.total || 0;
}

/**
 * Ouvrir un chapitre
 */
async function openChapter(chapterId) {
    currentChapter = chapters.find(c => c.id === chapterId);
    if (!currentChapter) return;
    
    try {
        const data = await API.getLessons(chapterId);
        currentLessons = data.lessons || [];
        
        // Mettre à jour l'UI
        document.getElementById('chapter-title').textContent = currentChapter.title;
        document.getElementById('chapter-description').textContent = currentChapter.description || '';
        
        renderLessons();
        
        // Changer de vue
        document.getElementById('chapters-view').classList.remove('active');
        document.getElementById('lessons-view').classList.add('active');
        
    } catch (error) {
        console.error('Erreur chargement leçons:', error);
        showToast('Erreur lors du chargement', 'error');
    }
}

/**
 * Afficher les leçons
 */
function renderLessons() {
    const container = document.getElementById('lessons-list');
    if (!container) return;
    
    if (currentLessons.length === 0) {
        container.innerHTML = '<p class="empty-list">Aucune leçon dans ce chapitre</p>';
        return;
    }
    
    container.innerHTML = currentLessons.map((lesson, index) => {
        const isCompleted = lesson.completed;
        return `
            <div class="lesson-card ${isCompleted ? 'completed' : ''}" onclick="openLesson(${index})">
                <div class="lesson-number">${isCompleted ? '✅' : index + 1}</div>
                <div class="lesson-info">
                    <h4 class="lesson-title">${lesson.title}</h4>
                    <span class="lesson-duration">${lesson.duration || '5'} min</span>
                </div>
                <div class="lesson-arrow">→</div>
            </div>
        `;
    }).join('');
}

/**
 * Ouvrir une leçon
 */
async function openLesson(index) {
    currentLessonIndex = index;
    currentLesson = currentLessons[index];
    
    if (!currentLesson) return;
    
    try {
        const data = await API.getLesson(currentLesson.id);
        currentLesson = { ...currentLesson, ...data.lesson };
        
        renderLessonContent();
        
        // Changer de vue
        document.getElementById('lessons-view').classList.remove('active');
        document.getElementById('lesson-view').classList.add('active');
        
    } catch (error) {
        console.error('Erreur chargement leçon:', error);
        showToast('Erreur lors du chargement', 'error');
    }
}

/**
 * Afficher le contenu d'une leçon
 */
function renderLessonContent() {
    document.getElementById('lesson-title').textContent = currentLesson.title;
    
    // Vidéo
    const videoContainer = document.getElementById('video-container');
    if (currentLesson.videoUrl) {
        videoContainer.innerHTML = renderVideo(currentLesson.videoUrl);
    } else {
        videoContainer.innerHTML = '';
    }
    
    // Texte
    const textContainer = document.getElementById('lesson-text');
    textContainer.innerHTML = currentLesson.content || '<p>Aucun contenu textuel</p>';
    
    // Navigation
    document.getElementById('prev-lesson').style.display = currentLessonIndex > 0 ? 'flex' : 'none';
    document.getElementById('next-lesson').style.display = currentLessonIndex < currentLessons.length - 1 ? 'flex' : 'none';
    
    // Bouton terminer
    const completeBtn = document.getElementById('complete-lesson');
    if (currentLesson.completed) {
        completeBtn.innerHTML = '✅ <span>Terminé</span>';
        completeBtn.disabled = true;
    } else {
        completeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg><span>Terminer</span>';
        completeBtn.disabled = false;
    }
}

/**
 * Rendre la vidéo
 */
function renderVideo(url) {
    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = url.includes('youtu.be') 
            ? url.split('/').pop().split('?')[0]
            : url.split('v=')[1]?.split('&')[0];
        if (videoId) {
            return `<iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe>`;
        }
    }
    
    // Google Drive
    if (url.includes('drive.google.com')) {
        const fileId = url.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] || url.match(/id=([a-zA-Z0-9_-]+)/)?.[1];
        if (fileId) {
            return `<iframe src="https://drive.google.com/file/d/${fileId}/preview" allowfullscreen></iframe>`;
        }
    }
    
    // Vimeo
    if (url.includes('vimeo.com')) {
        const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
        if (videoId) {
            return `<iframe src="https://player.vimeo.com/video/${videoId}" allowfullscreen></iframe>`;
        }
    }
    
    // Lien direct
    return `<video controls><source src="${url}" type="video/mp4"></video>`;
}

/**
 * Marquer la leçon comme terminée
 */
async function markLessonComplete() {
    if (!currentLesson || currentLesson.completed) return;
    
    try {
        await API.markLessonComplete(currentLesson.id);
        currentLesson.completed = true;
        currentLessons[currentLessonIndex].completed = true;
        
        showToast('Leçon terminée !', 'success');
        renderLessonContent();
        
        // Recharger la progression
        const progress = await API.getFormationProgress();
        updateProgressRing(progress);
        
    } catch (error) {
        showToast('Erreur', 'error');
    }
}

/**
 * Leçon précédente
 */
function goToPrevLesson() {
    if (currentLessonIndex > 0) {
        openLesson(currentLessonIndex - 1);
    }
}

/**
 * Leçon suivante
 */
function goToNextLesson() {
    if (currentLessonIndex < currentLessons.length - 1) {
        openLesson(currentLessonIndex + 1);
    }
}

/**
 * Retour à la liste des leçons
 */
function backToLessons() {
    document.getElementById('lesson-view').classList.remove('active');
    document.getElementById('lessons-view').classList.add('active');
    renderLessons();
}

/**
 * Retour à la liste des chapitres
 */
function showChapters() {
    document.getElementById('lessons-view').classList.remove('active');
    document.getElementById('chapters-view').classList.add('active');
    loadChapters();
}

// Exposer globalement
window.checkFormationAccess = checkFormationAccess;
window.showActivateCode = showActivateCode;
window.activateFormation = activateFormation;
window.openPurchasePage = openPurchasePage;
window.loadChapters = loadChapters;
window.openChapter = openChapter;
window.openLesson = openLesson;
window.markLessonComplete = markLessonComplete;
window.goToPrevLesson = goToPrevLesson;
window.goToNextLesson = goToNextLesson;
window.backToLessons = backToLessons;
window.showChapters = showChapters;

console.log('✅ Formation module chargé');
