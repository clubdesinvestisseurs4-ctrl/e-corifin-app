/**
 * E-Coris - Module Formation
 * Gestion des chapitres, leçons et progression
 */

// État local
let chapters = [];
let currentChapter = null;
let currentLesson = null;
let progress = { completed: 0, total: 0, percentage: 0 };
let hasAccess = false;

// ==================== VÉRIFICATION D'ACCÈS ====================

/**
 * Vérifier l'accès à la formation
 */
export async function checkFormationAccess() {
    try {
        const data = await api.courses.getAccessStatus();
        hasAccess = data.hasAccess;
        
        updateFormationUI();
        return hasAccess;
    } catch (error) {
        console.error('Erreur vérification accès:', error);
        hasAccess = false;
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
        if (hasAccess) {
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
export async function activateFormation(code) {
    try {
        showLoading('activate-btn');
        
        const response = await api.auth.activateCode(code);
        
        if (response.success) {
            hasAccess = true;
            showToast('Formation activée avec succès !', 'success');
            updateFormationUI();
            closeActivationModal();
        }
    } catch (error) {
        console.error('Erreur activation:', error);
        showToast(error.message || 'Code invalide ou déjà utilisé', 'error');
    } finally {
        hideLoading('activate-btn');
    }
}

/**
 * Ouvrir le modal d'activation
 */
export function openActivationModal() {
    const modal = document.getElementById('activation-modal');
    if (modal) {
        modal.classList.add('active');
        document.getElementById('activation-code')?.focus();
    }
}

/**
 * Fermer le modal d'activation
 */
export function closeActivationModal() {
    const modal = document.getElementById('activation-modal');
    if (modal) {
        modal.classList.remove('active');
        document.getElementById('activation-form')?.reset();
    }
}

// ==================== CHAPITRES ====================

/**
 * Charger les chapitres
 */
export async function loadChapters() {
    if (!hasAccess) return;
    
    try {
        showLoading('chapters-list');
        
        const [chaptersData, progressData] = await Promise.all([
            api.courses.getChapters(),
            api.courses.getProgress()
        ]);
        
        chapters = chaptersData.chapters || [];
        progress = progressData;
        
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
                <i class="icon-book"></i>
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
                <div class="chapter-header" onclick="window.FormationModule.toggleChapter('${chapter.id}')">
                    <div class="chapter-info">
                        <span class="chapter-number">Chapitre ${chapter.order}</span>
                        <h3 class="chapter-title">${chapter.title}</h3>
                        <p class="chapter-description">${chapter.description || ''}</p>
                    </div>
                    <div class="chapter-status">
                        <div class="chapter-progress-ring" data-percentage="${percentage}">
                            <svg viewBox="0 0 36 36">
                                <path class="progress-bg"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                                <path class="progress-fill"
                                    stroke-dasharray="${percentage}, 100"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                            </svg>
                            <span class="progress-text">${percentage}%</span>
                        </div>
                        <i class="chapter-toggle icon-chevron-down"></i>
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
        progressBar.style.width = `${progress.percentage}%`;
    }
    
    if (progressText) {
        progressText.textContent = `${progress.completed}/${progress.total} leçons complétées`;
    }
}

/**
 * Ouvrir/fermer un chapitre
 */
export async function toggleChapter(chapterId) {
    const lessonsContainer = document.getElementById(`chapter-lessons-${chapterId}`);
    const chapterCard = lessonsContainer?.closest('.chapter-card');
    
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
        const data = await api.courses.getLessons(chapterId);
        const lessons = data.lessons || [];
        
        renderLessons(container, lessons);
        
    } catch (error) {
        console.error('Erreur chargement leçons:', error);
        container.innerHTML = `
            <div class="lessons-error">
                <p>Erreur lors du chargement</p>
                <button class="btn btn-sm" onclick="window.FormationModule.toggleChapter('${chapterId}')">
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
            <div class="lesson-item ${isCompleted ? 'completed' : ''}" 
                 onclick="window.FormationModule.openLesson('${lesson.id}')">
                <div class="lesson-status">
                    ${isCompleted 
                        ? '<i class="icon-check-circle"></i>' 
                        : '<span class="lesson-number">' + lesson.order + '</span>'}
                </div>
                <div class="lesson-info">
                    <span class="lesson-title">${lesson.title}</span>
                    ${duration ? `<span class="lesson-duration"><i class="icon-clock"></i> ${duration}</span>` : ''}
                </div>
                <i class="lesson-arrow icon-chevron-right"></i>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

/**
 * Ouvrir une leçon
 */
export async function openLesson(lessonId) {
    try {
        showView('lesson-view');
        showLoading('lesson-content');
        
        const data = await api.courses.getLesson(lessonId);
        currentLesson = data.lesson;
        
        renderLesson();
        
    } catch (error) {
        console.error('Erreur chargement leçon:', error);
        showToast('Erreur lors du chargement de la leçon', 'error');
        showView('chapters-view');
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
            <button class="btn-back" onclick="window.FormationModule.closeLesson()">
                <i class="icon-arrow-left"></i>
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
                <button class="btn btn-primary btn-complete" onclick="window.FormationModule.completeLesson()">
                    <i class="icon-check"></i>
                    Marquer comme terminé
                </button>
            ` : `
                <div class="lesson-completed-badge">
                    <i class="icon-check-circle"></i>
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
export async function completeLesson() {
    if (!currentLesson || currentLesson.completed) return;
    
    try {
        await api.courses.completeLesson(currentLesson.id);
        
        currentLesson.completed = true;
        showToast('Leçon marquée comme terminée !', 'success');
        
        // Mettre à jour l'UI
        renderLesson();
        
        // Recharger la progression
        const progressData = await api.courses.getProgress();
        progress = progressData;
        renderProgressBar();
        
    } catch (error) {
        console.error('Erreur completion leçon:', error);
        showToast('Erreur lors de la mise à jour', 'error');
    }
}

/**
 * Fermer la leçon et retourner aux chapitres
 */
export function closeLesson() {
    currentLesson = null;
    showView('chapters-view');
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

/**
 * Afficher une vue
 */
function showView(viewId) {
    document.querySelectorAll('.formation-view').forEach(view => {
        view.classList.remove('active');
    });
    
    const view = document.getElementById(viewId);
    if (view) {
        view.classList.add('active');
    }
}

/**
 * Afficher un indicateur de chargement
 */
function showLoading(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.dataset.originalContent = el.innerHTML;
        el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    }
}

/**
 * Masquer l'indicateur de chargement
 */
function hideLoading(elementId) {
    const el = document.getElementById(elementId);
    if (el && el.dataset.originalContent) {
        el.innerHTML = el.dataset.originalContent;
    }
}

// Exposer globalement
window.FormationModule = {
    checkFormationAccess,
    activateFormation,
    openActivationModal,
    closeActivationModal,
    loadChapters,
    toggleChapter,
    openLesson,
    closeLesson,
    completeLesson,
    hasAccess: () => hasAccess
};
