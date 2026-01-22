/**
 * E-Coris - Module Formation
 * Gestion des chapitres, leçons et progression
 */

// État local
let chapters = [];
let currentChapter = null;
let currentLesson = null;
let formationProgress = { completed: 0, total: 0, percentage: 0 };
let hasFormationAccess = false;

// ==================== VÉRIFICATION D'ACCÈS ====================

/**
 * Vérifier l'accès à la formation
 */
async function checkFormationAccess() {
    try {
        const data = await API.getFormationAccessStatus();
        hasFormationAccess = data.hasAccess;
        
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
 * Mettre à jour l'UI selon l'accès
 */
function updateFormationUI() {
    const lockedView = document.getElementById('formation-locked');
    const contentView = document.getElementById('formation-content');
    
    if (lockedView && contentView) {
        if (hasFormationAccess) {
            lockedView.style.display = 'none';
            contentView.style.display = 'block';
            loadChapters();
        } else {
            lockedView.style.display = 'flex';
            contentView.style.display = 'none';
        }
    }
}

/**
 * Activer l'accès avec un code
 */
async function activateFormation() {
    const codeInput = document.getElementById('activate-code');
    const code = codeInput ? codeInput.value.trim() : '';
    
    if (!code) {
        showToast('Veuillez entrer un code d\'activation', 'error');
        return;
    }
    
    try {
        // Appeler l'API d'activation
        const response = await API.post('/auth/activate', { code }, true);
        
        if (response.success) {
            hasFormationAccess = true;
            showToast('Formation activée avec succès !', 'success');
            closeModal();
            updateFormationUI();
        }
    } catch (error) {
        console.error('Erreur activation:', error);
        showToast(error.message || 'Code invalide ou déjà utilisé', 'error');
    }
}

// ==================== CHAPITRES ====================

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
        formationProgress = progressData || { completed: 0, total: 0, percentage: 0 };
        
        renderChapters();
        renderProgressBar();
        
    } catch (error) {
        console.error('Erreur chargement chapitres:', error);
        showToast('Erreur lors du chargement des chapitres', 'error');
    }
}

/**
 * Afficher les chapitres
 */
function renderChapters() {
    const container = document.getElementById('chapters-list');
    if (!container) return;
    
    if (chapters.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
                <p>Aucun contenu disponible pour le moment</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    for (const chapter of chapters) {
        const chapterProgress = chapter.progress || { completed: 0, total: 0 };
        const percentage = chapterProgress.total > 0 
            ? Math.round((chapterProgress.completed / chapterProgress.total) * 100) 
            : 0;
        const isCompleted = percentage === 100;
        
        html += `
            <div class="chapter-card ${isCompleted ? 'completed' : ''}" data-id="${chapter.id}">
                <div class="chapter-header" onclick="toggleChapter('${chapter.id}')">
                    <div class="chapter-info">
                        <span class="chapter-number">Chapitre ${chapter.order || ''}</span>
                        <h3 class="chapter-title">${chapter.title}</h3>
                        <p class="chapter-description">${chapter.description || ''}</p>
                    </div>
                    <div class="chapter-status">
                        <div class="chapter-progress-ring" data-percentage="${percentage}">
                            <svg viewBox="0 0 36 36">
                                <path class="progress-bg"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none" stroke="#333" stroke-width="3"/>
                                <path class="progress-fill"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none" stroke="#00D9FF" stroke-width="3"
                                    stroke-dasharray="${percentage}, 100"/>
                            </svg>
                            <span class="progress-text">${percentage}%</span>
                        </div>
                        <svg class="chapter-toggle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                            <polyline points="6 9 12 15 18 9"/>
                        </svg>
                    </div>
                </div>
                <div class="chapter-lessons" id="chapter-lessons-${chapter.id}">
                    <div class="lessons-loading">
                        <div class="spinner"></div>
                    </div>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

/**
 * Afficher la barre de progression globale
 */
function renderProgressBar() {
    const progressBar = document.getElementById('formation-progress-bar');
    const progressText = document.getElementById('formation-progress-text');
    
    if (progressBar) {
        progressBar.style.width = `${formationProgress.percentage || 0}%`;
    }
    
    if (progressText) {
        progressText.textContent = `${formationProgress.completed || 0}/${formationProgress.total || 0} leçons complétées`;
    }
}

/**
 * Ouvrir/fermer un chapitre
 */
async function toggleChapter(chapterId) {
    const lessonsContainer = document.getElementById(`chapter-lessons-${chapterId}`);
    const chapterCard = lessonsContainer ? lessonsContainer.closest('.chapter-card') : null;
    
    if (!lessonsContainer || !chapterCard) return;
    
    const isOpen = chapterCard.classList.contains('expanded');
    
    // Fermer tous les autres chapitres
    document.querySelectorAll('.chapter-card.expanded').forEach(card => {
        if (card !== chapterCard) {
            card.classList.remove('expanded');
        }
    });
    
    if (isOpen) {
        chapterCard.classList.remove('expanded');
    } else {
        chapterCard.classList.add('expanded');
        await loadLessons(chapterId);
    }
}

// ==================== LEÇONS ====================

/**
 * Charger les leçons d'un chapitre
 */
async function loadLessons(chapterId) {
    const container = document.getElementById(`chapter-lessons-${chapterId}`);
    if (!container) return;
    
    try {
        const data = await API.getLessons(chapterId);
        const lessons = data.lessons || [];
        
        renderLessons(container, lessons);
        
    } catch (error) {
        console.error('Erreur chargement leçons:', error);
        container.innerHTML = `
            <div class="lessons-error">
                <p>Erreur lors du chargement</p>
                <button class="btn btn-sm" onclick="toggleChapter('${chapterId}')">
                    Réessayer
                </button>
            </div>
        `;
    }
}

/**
 * Afficher les leçons
 */
function renderLessons(container, lessons) {
    if (lessons.length === 0) {
        container.innerHTML = `
            <div class="lessons-empty">
                <p>Aucune leçon dans ce chapitre</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="lessons-list">';
    
    for (const lesson of lessons) {
        const isCompleted = lesson.completed;
        const duration = lesson.duration ? formatDuration(lesson.duration) : '';
        
        html += `
            <div class="lesson-item ${isCompleted ? 'completed' : ''}" onclick="openLesson('${lesson.id}')">
                <div class="lesson-status">
                    ${isCompleted 
                        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' 
                        : '<span class="lesson-number">' + (lesson.order || '') + '</span>'}
                </div>
                <div class="lesson-info">
                    <span class="lesson-title">${lesson.title}</span>
                    ${duration ? `<span class="lesson-duration"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${duration}</span>` : ''}
                </div>
                <svg class="lesson-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                    <polyline points="9 18 15 12 9 6"/>
                </svg>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

/**
 * Ouvrir une leçon
 */
async function openLesson(lessonId) {
    try {
        // Afficher la vue leçon
        document.getElementById('chapters-view').style.display = 'none';
        document.getElementById('lesson-view').style.display = 'block';
        
        const data = await API.getLesson(lessonId);
        currentLesson = data.lesson;
        
        renderLesson();
        
    } catch (error) {
        console.error('Erreur chargement leçon:', error);
        showToast('Erreur lors du chargement de la leçon', 'error');
        closeLesson();
    }
}

/**
 * Afficher le contenu d'une leçon
 */
function renderLesson() {
    const container = document.getElementById('lesson-content');
    if (!container || !currentLesson) return;
    
    const videoHtml = currentLesson.videoUrl 
        ? renderVideoPlayer(currentLesson.videoUrl)
        : '';
    
    container.innerHTML = `
        <div class="lesson-header">
            <button class="btn-back" onclick="closeLesson()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                    <line x1="19" y1="12" x2="5" y2="12"/>
                    <polyline points="12 19 5 12 12 5"/>
                </svg>
                Retour aux chapitres
            </button>
            <h2 class="lesson-title">${currentLesson.title}</h2>
        </div>
        
        ${videoHtml}
        
        <div class="lesson-text">
            ${currentLesson.content || ''}
        </div>
        
        <div class="lesson-actions">
            ${!currentLesson.completed ? `
                <button class="btn btn-primary btn-complete" onclick="completeLesson()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Marquer comme terminé
                </button>
            ` : `
                <div class="lesson-completed-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    Leçon terminée
                </div>
            `}
        </div>
    `;
}

/**
 * Rendre le lecteur vidéo
 */
function renderVideoPlayer(url) {
    // Déterminer le type de lien
    if (url.includes('drive.google.com')) {
        // Google Drive - convertir en lien d'embed
        const fileId = extractGoogleDriveId(url);
        if (fileId) {
            return `
                <div class="video-container">
                    <iframe src="https://drive.google.com/file/d/${fileId}/preview" 
                            allowfullscreen 
                            allow="autoplay; encrypted-media">
                    </iframe>
                </div>
            `;
        }
    } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
        // YouTube
        const videoId = extractYoutubeId(url);
        if (videoId) {
            return `
                <div class="video-container">
                    <iframe src="https://www.youtube.com/embed/${videoId}" 
                            allowfullscreen 
                            allow="autoplay; encrypted-media">
                    </iframe>
                </div>
            `;
        }
    } else if (url.includes('vimeo.com')) {
        // Vimeo
        const videoId = extractVimeoId(url);
        if (videoId) {
            return `
                <div class="video-container">
                    <iframe src="https://player.vimeo.com/video/${videoId}" 
                            allowfullscreen 
                            allow="autoplay; encrypted-media">
                    </iframe>
                </div>
            `;
        }
    }
    
    // Lien direct ou autre
    return `
        <div class="video-container">
            <video controls>
                <source src="${url}" type="video/mp4">
                Votre navigateur ne supporte pas la lecture vidéo.
            </video>
        </div>
    `;
}

/**
 * Extraire l'ID d'un fichier Google Drive
 */
function extractGoogleDriveId(url) {
    const patterns = [
        /\/file\/d\/([a-zA-Z0-9_-]+)/,
        /id=([a-zA-Z0-9_-]+)/,
        /\/open\?id=([a-zA-Z0-9_-]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

/**
 * Extraire l'ID d'une vidéo YouTube
 */
function extractYoutubeId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

/**
 * Extraire l'ID d'une vidéo Vimeo
 */
function extractVimeoId(url) {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? match[1] : null;
}

/**
 * Marquer une leçon comme terminée
 */
async function completeLesson() {
    if (!currentLesson || currentLesson.completed) return;
    
    try {
        await API.markLessonComplete(currentLesson.id);
        
        currentLesson.completed = true;
        showToast('Leçon marquée comme terminée !', 'success');
        
        // Mettre à jour l'UI
        renderLesson();
        
        // Recharger la progression
        const progressData = await API.getFormationProgress();
        formationProgress = progressData;
        renderProgressBar();
        
    } catch (error) {
        console.error('Erreur completion leçon:', error);
        showToast('Erreur lors de la mise à jour', 'error');
    }
}

/**
 * Fermer la leçon et retourner aux chapitres
 */
function closeLesson() {
    currentLesson = null;
    document.getElementById('lesson-view').style.display = 'none';
    document.getElementById('chapters-view').style.display = 'block';
    loadChapters(); // Recharger pour mettre à jour la progression
}

// ==================== UTILITAIRES ====================

/**
 * Formater une durée en minutes
 */
function formatDuration(minutes) {
    if (minutes < 60) {
        return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}
