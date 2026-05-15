// Theme Initialization (runs immediately to prevent FOUC)
const initTheme = () => {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
    } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
    }
};
initTheme();

window.toggleTheme = () => {
    if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        localStorage.theme = 'light';
    } else {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        localStorage.theme = 'dark';
    }
};

// Global Modal Helper
const getModal = () => {
    let modal = document.getElementById('custom-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'custom-modal';
        modal.className = 'hidden fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4';
        modal.innerHTML = `
            <div class="bg-surface-container-lowest w-full max-w-sm rounded-xl p-lg shadow-xl animate-in fade-in zoom-in duration-200">
                <h3 class="font-headline-sm text-headline-sm text-primary mb-2" id="modal-title">Notification</h3>
                <p class="font-body-md text-body-md text-on-surface-variant mb-6" id="modal-message"></p>
                <div class="flex justify-end gap-md">
                    <button id="modal-cancel" class="px-md py-2 rounded-lg border border-outline-variant font-label-md text-label-md hover:bg-surface-container-low transition-colors">Cancel</button>
                    <button id="modal-confirm" class="px-md py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-all">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    return modal;
};

function showError(msg, title = 'Error') {
    return showConfirmModal(title, msg, true);
}

const showConfirmModal = (title, message, isAlert = false) => {
    return new Promise((resolve) => {
        const modal = getModal();
        const titleEl = modal.querySelector('#modal-title');
        const msgEl = modal.querySelector('#modal-message');
        const confirmBtn = modal.querySelector('#modal-confirm');
        const cancelBtn = modal.querySelector('#modal-cancel');

        titleEl.textContent = title;
        msgEl.textContent = message;
        confirmBtn.textContent = isAlert ? 'OK' : 'Confirm';
        
        if (isAlert) {
            cancelBtn.classList.add('hidden');
            confirmBtn.classList.replace('bg-error', 'bg-primary');
            confirmBtn.classList.add('bg-primary');
        } else {
            cancelBtn.classList.remove('hidden');
            if (title.toLowerCase().includes('delete')) {
                confirmBtn.classList.replace('bg-primary', 'bg-error');
                confirmBtn.classList.add('bg-error');
            } else {
                confirmBtn.classList.replace('bg-error', 'bg-primary');
                confirmBtn.classList.add('bg-primary');
            }
        }

        modal.classList.remove('hidden');

        const cleanup = (val) => {
            modal.classList.add('hidden');
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
            resolve(val);
        };

        confirmBtn.onclick = () => cleanup(true);
        cancelBtn.onclick = () => cleanup(false);
    });
};

window.logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login.html';
};

function setupPasswordToggles() {
    document.querySelectorAll('button').forEach(btn => {
        const span = btn.querySelector('span[data-icon="visibility"], span[data-icon="visibility_off"]');
        if (span) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                // Find previous sibling that is an input, or search parent
                let input = btn.parentElement.querySelector('input');
                if (!input && btn.previousElementSibling && btn.previousElementSibling.tagName === 'INPUT') {
                    input = btn.previousElementSibling;
                }
                if (input) {
                    if (input.type === 'password') {
                        input.type = 'text';
                        span.textContent = 'visibility_off';
                        span.setAttribute('data-icon', 'visibility_off');
                    } else {
                        input.type = 'password';
                        span.textContent = 'visibility';
                        span.setAttribute('data-icon', 'visibility');
                    }
                }
            });
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Inject Theme Toggle Button
    const headerFlex = document.querySelector('header > div');
    if (headerFlex) {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'p-2 rounded-full hover:bg-surface-container-high transition-colors text-on-surface flex items-center justify-center absolute right-4 md:right-16 top-1/2 -translate-y-1/2 z-50';
        toggleBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 20px;">dark_mode</span>`;
        toggleBtn.onclick = () => {
            window.toggleTheme();
            // Update icon visually if desired, though standard is just rotating them
        };
        // Ensure parent has position relative if needed, but header is usually fixed/relative
        document.querySelector('header').style.position = 'fixed';
        document.querySelector('header').appendChild(toggleBtn);
    }

    const path = window.location.pathname;

    document.querySelectorAll('[data-icon="search"]').forEach(el => {
        const btn = el.closest('button') || el.closest('a');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = '/index.html?focus=search';
            });
        }
    });

    // Handle logout buttons everywhere (text or icon)
    document.querySelectorAll('button, a').forEach(b => {
        const isLogout = b.textContent.includes('Logout') || 
                         (b.querySelector('span') && b.querySelector('span').textContent === 'logout');
        if (isLogout) {
            b.addEventListener('click', (e) => {
                e.preventDefault();
                window.logout();
            });
        }
    });

    // Global Nav Listeners (for mobile bottom nav or desktop links)
    document.querySelectorAll('.nav-dashboard, [data-icon="dashboard"]').forEach(el => {
        const btn = el.closest('button') || el.closest('a');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = '/index.html?tab=dashboard';
            });
        }
    });

    document.querySelectorAll('.nav-myideas, [data-icon="emoji_objects"], [data-icon="lightbulb"]').forEach(el => {
        const btn = el.closest('button') || el.closest('a');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = '/index.html?tab=myideas';
            });
        }
    });

    // ----- LOGIN PAGE -----
    if (path === '/login.html') {
        setupPasswordToggles();

        const btn = document.querySelector('button[type="submit"]');
        if (btn) {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const email = document.querySelector('input[type="email"]').value;
                const password = document.querySelector('input[type="password"], input[type="text"][placeholder="••••••••"]').value;
                
                try {
                    const res = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        window.location.href = '/index.html';
                    } else {
                        showError(data.error);
                    }
                } catch (err) {
                    showError('Login failed');
                }
            });
        }
        
        // Wire up "Sign Up" link
        const signUpLinks = Array.from(document.querySelectorAll('a')).filter(a => a.textContent.includes('Sign Up'));
        signUpLinks.forEach(a => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = '/register.html';
            });
        });
    }

    // ----- REGISTER PAGE -----
    if (path === '/register.html') {
        setupPasswordToggles();

        const btn = document.querySelector('button[type="submit"]');
        if (btn) {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const inputs = document.querySelectorAll('input');
                const email = inputs[0] ? inputs[0].value : '';
                const password = inputs[1] ? inputs[1].value : '';
                // Check confirm password if there is a 3rd input
                if (inputs[2] && inputs[1].value !== inputs[2].value) {
                    showError("Passwords do not match");
                    return;
                }
                const reviewerCodeInput = document.querySelector('#reviewer-code');
                const reviewer_code = reviewerCodeInput ? reviewerCodeInput.value : '';
                
                try {
                    const res = await fetch('/api/auth/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password, reviewer_code })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        window.location.href = '/index.html';
                    } else {
                        showError(data.error);
                    }
                } catch (err) {
                    showError('Registration failed');
                }
            });
        }
        
        // Wire up "Sign in" link
        const signInLinks = Array.from(document.querySelectorAll('a')).filter(a => a.textContent.includes('Sign in') || a.textContent.includes('Log In'));
        signInLinks.forEach(a => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = '/login.html';
            });
        });
    }

    // ----- DASHBOARD (INDEX) PAGE -----
    if (path === '/index.html' || path === '/') {
        const urlParams = new URLSearchParams(window.location.search);
        let currentTab = urlParams.get('tab') || 'dashboard'; // 'dashboard' or 'myideas'
        let currentPage = 1;
        let currentSearch = '';
        let currentCategory = '';
        let currentStatus = '';
        let currentSort = 'created_at';

        let currentUser = null;
        // Check authentication immediately
        fetch('/api/auth/me')
            .then(res => {
                if (!res.ok) throw new Error('Not auth');
                return res.json();
            })
            .then(data => {
                currentUser = data;
                loadIdeas();
            })
            .catch(() => window.location.href = '/login.html');

        // Wire up New Idea buttons
        document.querySelectorAll('button').forEach(b => {
            if (b.textContent.includes('New Idea') || (b.querySelector('span') && b.querySelector('span').textContent === 'add')) {
                b.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.location.href = '/create.html';
                });
            }
        });

        const searchInput = document.querySelector('input[placeholder="Search ideas..."]');
        if (searchInput) {
            if (urlParams.get('focus') === 'search') {
                searchInput.focus();
            }
            searchInput.addEventListener('input', (e) => {
                currentSearch = e.target.value;
                currentPage = 1;
                loadIdeas();
            });
        }

        const selects = document.querySelectorAll('select');
        if (selects[0]) {
            selects[0].addEventListener('change', (e) => {
                currentCategory = e.target.value;
                currentPage = 1;
                loadIdeas();
            });
        }
        if (selects[1]) {
            selects[1].addEventListener('change', (e) => {
                currentStatus = e.target.value;
                currentPage = 1;
                loadIdeas();
            });
        }
        if (selects[2]) {
            selects[2].addEventListener('change', (e) => {
                currentSort = e.target.value;
                currentPage = 1;
                loadIdeas();
            });
        }

        // Wire up Tabs
        const dashboardTab = Array.from(document.querySelectorAll('a')).find(a => a.textContent === 'Dashboard');
        const myIdeasTab = Array.from(document.querySelectorAll('a')).find(a => a.textContent === 'My Ideas');
        const h2 = document.querySelector('h2.font-headline-md');

        const updateTabStyles = () => {
            if (dashboardTab && myIdeasTab) {
                if (currentTab === 'dashboard') {
                    dashboardTab.classList.add('text-secondary', 'border-b-2', 'border-secondary', 'font-bold');
                    dashboardTab.classList.remove('text-on-surface-variant');
                    myIdeasTab.classList.remove('text-secondary', 'border-b-2', 'border-secondary', 'font-bold');
                    myIdeasTab.classList.add('text-on-surface-variant');
                    if (h2) h2.textContent = 'Dashboard';
                } else {
                    myIdeasTab.classList.add('text-secondary', 'border-b-2', 'border-secondary', 'font-bold');
                    myIdeasTab.classList.remove('text-on-surface-variant');
                    dashboardTab.classList.remove('text-secondary', 'border-b-2', 'border-secondary', 'font-bold');
                    dashboardTab.classList.add('text-on-surface-variant');
                    if (h2) h2.textContent = 'My Ideas';
                }
            }
        };
        // Call immediately to fix hardcoded DOM
        updateTabStyles();

        if (dashboardTab && myIdeasTab) {
            dashboardTab.addEventListener('click', (e) => {
                e.preventDefault();
                currentTab = 'dashboard';
                currentPage = 1;
                updateTabStyles();
                loadIdeas();
            });
            myIdeasTab.addEventListener('click', (e) => {
                e.preventDefault();
                currentTab = 'myideas';
                currentPage = 1;
                updateTabStyles();
                loadIdeas();
            });
        }

        // Dashboard Logic (was below modal)

        const loadIdeas = async () => {
            try {
                let url = `/api/ideas?page=${currentPage}`;
                if (currentSearch) url += `&search=${encodeURIComponent(currentSearch)}`;
                if (currentCategory && currentCategory !== 'Category') url += `&category=${encodeURIComponent(currentCategory)}`;
                if (currentStatus && currentStatus !== 'Status') url += `&status=${encodeURIComponent(currentStatus)}`;
                if (currentTab === 'myideas') url += `&mine=true`;
                if (currentSort) url += `&sortBy=${currentSort}`;

                const res = await fetch(url);
                if (!res.ok) {
                    if (res.status === 401) window.location.href = '/login.html';
                    return;
                }
                const data = await res.json();
                
                // Update dynamic counts
                const resultsText = Array.from(document.querySelectorAll('p')).find(p => p.textContent.includes('results from'));
                if (resultsText) {
                    resultsText.textContent = `Showing ${data.pagination.total} results from your collection`;
                }
                
                const listContainer = document.querySelector('.space-y-md');
                if (!listContainer) return; // fail gracefully

                // Clone the first card as a template
                if (!window._cardTemplate) {
                    window._cardTemplate = listContainer.firstElementChild.cloneNode(true);
                }
                listContainer.innerHTML = ''; // clear static data
                
                for (const idea of data.data) {
                    const card = window._cardTemplate.cloneNode(true);
                    
                    // Populate title
                    const titleEl = card.querySelector('h3');
                    if (titleEl) titleEl.textContent = idea.title;

                    // Populate category & status
                    const spanTags = card.querySelectorAll('.text-label-sm');
                    if (spanTags.length >= 2) {
                        spanTags[0].textContent = idea.status;
                        spanTags[1].textContent = idea.category;
                    }

                    // Populate rating
                    const ratingSpan = card.querySelector('.font-label-md');
                    if (ratingSpan) ratingSpan.textContent = idea.avg_rating.toFixed(1);
                    
                    const countSpan = card.querySelector('.font-body-sm.text-outline');
                    if (countSpan) countSpan.textContent = `• ${idea.rating_count} ratings`;

                    // Handle clicks to navigate to details
                    card.style.cursor = 'pointer';
                    card.addEventListener('click', (e) => {
                        // Prevent navigation if a button (like Delete or Edit) was clicked
                        if (e.target.closest('button')) return;
                        window.location.href = `/idea.html?id=${idea.id}`;
                    });

                    // Hide the edit/delete buttons for simplicity or wire them up
                    const actionBtns = card.querySelectorAll('button');
                    actionBtns.forEach(btn => {
                        btn.style.display = 'none'; // hide by default
                        if (btn.textContent.trim() === 'delete') {
                            if (currentUser?.id === idea.submitter_id || currentUser?.role === 'REVIEWER') {
                                btn.style.display = 'block';
                                btn.addEventListener('click', async (e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    const confirmed = await showConfirmModal('Delete Idea', 'Are you sure you want to delete this idea? This action cannot be undone.');
                                    if (confirmed) {
                                        try {
                                            const res = await fetch(`/api/ideas/${idea.id}`, { method: 'DELETE' });
                                            if (res.ok) {
                                                loadIdeas();
                                            } else {
                                                const err = await res.json();
                                                alert(err.error || 'Failed to delete idea');
                                            }
                                        } catch (error) {
                                            alert('Network error while deleting');
                                        }
                                    }
                                });
                            }
                        }
                    });

                    // Reset card opacity
                    card.style.opacity = '1';

                    listContainer.appendChild(card);
                }

                // Setup Pagination
                const nav = document.querySelector('nav.mt-xl');
                if (nav) {
                    const pagContainer = nav.querySelector('div.flex.items-center.gap-xs.px-md');
                    if (pagContainer) {
                        pagContainer.innerHTML = ''; // clear hardcoded
                        for (let i = 1; i <= data.pagination.totalPages; i++) {
                            const btn = document.createElement('button');
                            btn.textContent = i;
                            btn.className = i === currentPage 
                                ? "w-10 h-10 rounded-lg bg-primary text-on-primary font-bold"
                                : "w-10 h-10 rounded-lg hover:bg-surface-container text-on-surface-variant";
                            btn.addEventListener('click', () => {
                                currentPage = i;
                                loadIdeas();
                            });
                            pagContainer.appendChild(btn);
                        }
                    }

                    // Next / Prev buttons
                    const nextPrevBtns = Array.from(nav.querySelectorAll('button')).filter(b => b.querySelector('span.material-symbols-outlined'));
                    if (nextPrevBtns.length >= 2) {
                        const prevBtn = nextPrevBtns[0];
                        const nextBtn = nextPrevBtns[nextPrevBtns.length - 1];
                        
                        // Disable if needed
                        prevBtn.style.opacity = currentPage === 1 ? '0.5' : '1';
                        prevBtn.onclick = () => { if(currentPage > 1) { currentPage--; loadIdeas(); }};

                        nextBtn.style.opacity = currentPage === data.pagination.totalPages ? '0.5' : '1';
                        nextBtn.onclick = () => { if(currentPage < data.pagination.totalPages) { currentPage++; loadIdeas(); }};
                    }
                }

            } catch (err) {
                console.error(err);
            }
        };
    }

    // ----- CREATE IDEA PAGE -----
    if (path === '/create.html') {
        const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Submit'));
        if (submitBtn) {
            submitBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const title = document.getElementById('idea-title')?.value || '';
                const category = document.getElementById('idea-category')?.value || 'Tech';
                const description = document.getElementById('idea-description')?.value || '';

                if (!title || !description) {
                    showError('Please fill in both title and description');
                    return;
                }

                try {
                    const res = await fetch('/api/ideas', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title, description, category })
                    });
                    if (res.ok) {
                        window.location.href = '/index.html';
                    } else {
                        const data = await res.json();
                        showError(data.error);
                    }
                } catch (err) {
                    showError('Failed to create idea');
                }
            });
        }

        const cancelBtn = document.getElementById('cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                window.location.href = '/index.html';
            });
        }
    }

    // ----- IDEA DETAIL PAGE -----
    if (path === '/idea.html') {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        
        if (!id) {
            window.location.href = '/index.html';
            return;
        }

        const loadIdea = async () => {
            try {
                // Wire up Back to List button
                const backBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Back to List') || b.querySelector('span')?.textContent === 'arrow_back');
                if (backBtn) {
                    backBtn.addEventListener('click', () => {
                        window.location.href = '/index.html';
                    });
                }

                const res = await fetch(`/api/ideas/${id}`);
                if (!res.ok) { window.location.href='/index.html'; return; }
                const idea = await res.json();
                
                const userRes = await fetch('/api/auth/me');
                if (!userRes.ok) { window.location.href='/login.html'; return; }
                const user = await userRes.json();
                
                // Meticulously target Stitch UI
                const titleEl = document.querySelector('h2');
                if (titleEl) titleEl.textContent = idea.title;

                const tagSpans = document.querySelectorAll('section')[0]?.querySelectorAll('span');
                if (tagSpans && tagSpans.length >= 2) {
                    tagSpans[0].textContent = idea.category;
                    tagSpans[1].textContent = idea.status;
                }

                // Description
                const descEl = document.querySelector('p.font-body-lg');
                if (descEl) descEl.textContent = idea.description;

                // Submitter info
                const spans = document.querySelectorAll('span');
                for (let s of spans) {
                    if (s.textContent.includes('jane.doe')) s.textContent = idea.submitter_email;
                    if (s.textContent.includes('Oct 24')) s.textContent = new Date(idea.created_at || Date.now()).toLocaleDateString();
                }

                // Ratings
                const ratingNumEl = document.querySelector('span.text-\\[40px\\]');
                if (ratingNumEl) ratingNumEl.textContent = idea.avg_rating.toFixed(1);
                
                const reviewCountEl = Array.from(document.querySelectorAll('p')).find(p => p.textContent.includes('Based on'));
                if (reviewCountEl) reviewCountEl.textContent = `Based on ${idea.rating_count} reviews`;

                // Render current stars logically
                const displayStarsContainer = ratingNumEl ? ratingNumEl.parentElement.nextElementSibling : null;
                if (displayStarsContainer && displayStarsContainer.children.length === 5) {
                    const stars = displayStarsContainer.children;
                    const val = Math.round(idea.avg_rating);
                    for (let i=0; i<5; i++) {
                        if (i < val) {
                            stars[i].style.fontVariationSettings = "'FILL' 1";
                        } else {
                            stars[i].style.fontVariationSettings = "'FILL' 0";
                        }
                    }
                }

                // User Rating Form logic
                const yourRatingSection = document.querySelector('.flex-1.w-full.border-t');
                if (yourRatingSection) {
                    if (idea.submitter_id === user.id) {
                        yourRatingSection.style.display = 'none';
                    } else {
                        const starsContainer = yourRatingSection.querySelector('.flex.gap-2');
                        const stars = starsContainer ? starsContainer.querySelectorAll('button') : [];
                        let selectedRating = 0;
                        stars.forEach((btn, index) => {
                            btn.addEventListener('click', () => {
                                selectedRating = index + 1;
                                window.rateIdea(id, selectedRating);
                            });
                        });

                        // Show existing rating
                        if (idea.user_rating) {
                            stars.forEach((b, i) => {
                                const span = b.querySelector('span');
                                if (i < idea.user_rating) {
                                    span.style.fontVariationSettings = "'FILL' 1";
                                    b.classList.replace('text-outline-variant', 'text-secondary');
                                } else {
                                    span.style.fontVariationSettings = "'FILL' 0";
                                    b.classList.replace('text-secondary', 'text-outline-variant');
                                }
                            });
                            
                            const removeContainer = document.getElementById('remove-rating-container');
                            const removeBtn = document.getElementById('remove-rating-btn');
                            if (removeContainer && removeBtn) {
                                removeContainer.classList.remove('hidden');
                                removeBtn.onclick = async () => {
                                    if (await showConfirmModal('Remove Rating', 'Are you sure you want to remove your rating?')) {
                                        try {
                                            const res = await fetch(`/api/ideas/${id}/rate`, { method: 'DELETE' });
                                            if (res.ok) window.location.reload();
                                        } catch (err) {
                                            showError('Failed to remove rating');
                                        }
                                    }
                                };
                            }
                        }
                    }
                }

                // Reviewer Block
                const reviewerAside = document.querySelector('aside');
                if (reviewerAside) {
                    if (user.role === 'SUBMITTER') {
                        reviewerAside.style.display = 'none'; // hide for regular users
                    } else {
                        // Setup reviewer actions
                        const statusSelect = reviewerAside.querySelector('select');
                        const noteInput = reviewerAside.querySelector('textarea');
                        const updateBtn = Array.from(reviewerAside.querySelectorAll('button')).find(b => b.textContent.includes('Update Status'));
                        
                        if (updateBtn) {
                            updateBtn.addEventListener('click', (e) => {
                                e.preventDefault();
                                window.updateStatus(id, statusSelect.value, noteInput.value);
                            });
                        }
                    }
                }
                
                // If there's a reviewer note, inject it below description.
                if (idea.review_note) {
                    const descContainer = descEl.parentElement;
                    const noteDiv = document.createElement('div');
                    noteDiv.className = 'mt-md p-md bg-surface-container-low rounded-lg border-l-4 border-secondary';
                    noteDiv.innerHTML = `<h4 class="font-label-md text-primary mb-1">Reviewer Note</h4><p class="font-body-sm text-on-surface-variant">${idea.review_note}</p>`;
                    descContainer.appendChild(noteDiv);
                }

            } catch (err) {
                console.error(err);
            }
        };
        loadIdea();
    }
});

// Global helpers
window.rateIdea = async (id, rating) => {
    const res = await fetch(`/api/ideas/${id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating })
    });
    if (res.ok) {
        window.location.reload();
    } else {
        const data = await res.json();
        showError(data.error);
    }
};

window.updateStatus = async (id, status, review_note) => {
    const res = await fetch(`/api/ideas/${id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, review_note })
    });
    if (res.ok) {
        window.location.reload();
    } else {
        const data = await res.json();
        showError(data.error);
    }
};
